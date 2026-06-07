import uuid
from decimal import Decimal
from django.db import transaction
from orders.models import Cart, Order, OrderItem

def process_cart_checkout(cart, retailer_profile, delivery_address):
    """
    Groups cart items by wholesaler, creates orders, decrements stock.
    Returns a list of created orders.
    """
    wholesaler_items = {}
    for item in cart.items.all():
        w_id = item.wholesaler_product.wholesaler.id
        if w_id not in wholesaler_items:
            wholesaler_items[w_id] = []
        wholesaler_items[w_id].append(item)

    created_orders = []
    
    with transaction.atomic():
        for w_id, items in wholesaler_items.items():
            wholesaler = items[0].wholesaler_product.wholesaler
            
            # Calculate total
            total_amount = sum(item.quantity * item.wholesaler_product.wholesale_price for item in items)
            
            if total_amount < wholesaler.min_order_value:
                raise ValueError(f"Minimum order value for {wholesaler.business_name} is {wholesaler.min_order_value}")

            # Create order
            order_num = f"ORD-{uuid.uuid4().hex[:8].upper()}"
            order = Order.objects.create(
                order_number=order_num,
                retailer=retailer_profile,
                wholesaler=wholesaler,
                total_amount=total_amount,
                delivery_address=delivery_address
            )
            
            # Create order items and decrement stock
            for item in items:
                w_product = item.wholesaler_product
                OrderItem.objects.create(
                    order=order,
                    wholesaler_product=w_product,
                    product=w_product.product,
                    quantity=item.quantity,
                    unit_price=w_product.wholesale_price,
                    line_total=item.quantity * w_product.wholesale_price
                )
                
                # Decrement available stock
                w_product.available_stock -= item.quantity
                w_product.save()
            
            created_orders.append(order)
        
        # Convert cart
        cart.status = Cart.Status.CONVERTED
        cart.save()
        
    return created_orders
