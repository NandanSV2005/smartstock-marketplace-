from django.db import models

from accounts.models import Retailer, Wholesaler
from catalog.models import Product, WholesalerProduct
from common.models import TimeStampedModel


class Cart(TimeStampedModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CONVERTED = "converted", "Converted"
        ABANDONED = "abandoned", "Abandoned"

    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="carts")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self) -> str:
        return f"Cart {self.id} - {self.retailer.business_name}"


class CartItem(TimeStampedModel):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    wholesaler_product = models.ForeignKey(WholesalerProduct, on_delete=models.CASCADE, related_name="cart_items")
    quantity = models.PositiveIntegerField()
    unit_price_snapshot = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.quantity} x {self.wholesaler_product}"


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        PACKED = "packed", "Packed"
        DISPATCHED = "dispatched", "Dispatched"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        PARTIAL = "partial", "Partial"
        CREDIT = "credit", "Credit"
        OVERDUE = "overdue", "Overdue"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class PaymentMethod(models.TextChoices):
        PAY_NOW = "pay_now", "Pay Now"
        PARTIAL = "partial", "Partial Payment"
        CREDIT = "credit", "Credit (Pay Later)"

    order_number = models.CharField(max_length=32, unique=True)
    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="orders")
    wholesaler = models.ForeignKey(Wholesaler, on_delete=models.CASCADE, related_name="orders")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(
        max_length=16,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    payment_method = models.CharField(
        max_length=16,
        choices=PaymentMethod.choices,
        null=True,
        blank=True
    )
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_address = models.CharField(max_length=512)
    expected_delivery_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return self.order_number


class OrderItem(TimeStampedModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    wholesaler_product = models.ForeignKey(WholesalerProduct, on_delete=models.PROTECT, related_name="order_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self) -> str:
        return f"{self.order.order_number} - {self.product.name}"


class Delivery(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ASSIGNED = "assigned", "Assigned"
        IN_TRANSIT = "in_transit", "In Transit"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name="delivery")
    assigned_by_wholesaler = models.BooleanField(default=True)
    delivery_partner = models.CharField(max_length=120, blank=True, null=True)
    vehicle_details = models.CharField(max_length=120, blank=True, null=True)
    tracking_code = models.CharField(max_length=64, blank=True, null=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    pickup_time = models.DateTimeField(null=True, blank=True)
    delivered_time = models.DateTimeField(null=True, blank=True)
    current_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    current_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    def __str__(self) -> str:
        return f"Delivery for {self.order.order_number}"
