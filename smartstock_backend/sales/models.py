from django.db import models
from catalog.models import Product
from accounts.models import Retailer
from common.models import TimeStampedModel

class Sale(TimeStampedModel):
    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="sales")
    sale_date = models.DateTimeField(auto_now_add=True)
    invoice_number = models.CharField(max_length=50, blank=True, null=True, unique=True)
    total_items = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        ordering = ['-sale_date']

    def __str__(self):
        return f"Sale #{self.invoice_number or self.id} - {self.retailer.business_name}"

class SaleItem(TimeStampedModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity_sold = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product.name} x {self.quantity_sold} @ {self.unit_price}"

