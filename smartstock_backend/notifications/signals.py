from django.db.models.signals import post_save
from django.dispatch import receiver
from inventory.models import Inventory
from payments.models import Payment
from notifications.models import Notification

@receiver(post_save, sender=Inventory)
def notify_low_stock(sender, instance, **kwargs):
    # Only notify if stock is critically low and reorder level is set
    if instance.reorder_level > 0 and instance.current_stock <= instance.reorder_level:
        retailer = instance.retailer
        product_name = instance.product.name
        
        # Prevent spam: Check if an unread notification already exists for this inventory item
        exists = Notification.objects.filter(
            user=retailer.user,
            type=Notification.Type.LOW_STOCK,
            read_at__isnull=True,
            metadata_json__inventory_id=instance.id
        ).exists()
        
        if not exists:
            Notification.objects.create(
                user=retailer.user,
                type=Notification.Type.LOW_STOCK,
                title="Low Stock Alert",
                body=f"Your stock for {product_name} is running low ({instance.current_stock} remaining). Please reorder soon.",
                metadata_json={'inventory_id': instance.id, 'product_id': instance.product.id}
            )

@receiver(post_save, sender=Payment)
def notify_payment_success(sender, instance, **kwargs):
    if instance.status == 'completed':
        # Payment is attached to an order
        order = instance.order
        retailer = order.retailer
        
        exists = Notification.objects.filter(
            user=retailer.user,
            type=Notification.Type.PAYMENT_UPDATE,
            metadata_json__payment_id=instance.id
        ).exists()
        
        if not exists:
            Notification.objects.create(
                user=retailer.user,
                type=Notification.Type.PAYMENT_UPDATE,
                title="Payment Successful",
                body=f"Your payment of ₹{instance.amount_paid} for Order #{order.order_number} was successful.",
                metadata_json={'payment_id': instance.id, 'order_id': order.id}
            )
