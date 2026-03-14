from django.db import models

from accounts.models import Retailer
from catalog.models import Product
from common.models import TimeStampedModel


class Inventory(TimeStampedModel):
    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="inventory_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="inventory_records")
    current_stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    reorder_quantity_suggestion = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    avg_daily_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ("retailer", "product")

    def __str__(self) -> str:
        return f"{self.retailer.business_name} - {self.product.name}"


class InventoryBatch(TimeStampedModel):
    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name="batches")
    batch_number = models.CharField(max_length=64, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    expiry_date = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.inventory.product.name} batch {self.batch_number or ''}".strip()


class InventoryMovement(TimeStampedModel):
    class MovementType(models.TextChoices):
        PURCHASE = "purchase", "Purchase"
        SALE = "sale", "Sale"
        ADJUSTMENT = "adjustment", "Adjustment"
        RETURN = "return", "Return"
        WASTAGE = "wastage", "Wastage"

    inventory = models.ForeignKey(Inventory, on_delete=models.CASCADE, related_name="movements")
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity_change = models.DecimalField(max_digits=10, decimal_places=2)
    reference_order_item_id = models.PositiveBigIntegerField(null=True, blank=True)
    note = models.CharField(max_length=255, blank=True)
    occurred_at = models.DateTimeField()

    def __str__(self) -> str:
        return f"{self.movement_type} {self.quantity_change} for {self.inventory}"
