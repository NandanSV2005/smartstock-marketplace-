from django.db import models

from accounts.models import Wholesaler
from common.models import TimeStampedModel


class Category(TimeStampedModel):
    name = models.CharField(max_length=120)
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="children",
        null=True,
        blank=True,
    )
    slug = models.SlugField(max_length=150, unique=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self) -> str:
        return self.name


class Product(TimeStampedModel):
    name = models.CharField(max_length=255)
    brand = models.CharField(max_length=120, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    sku = models.CharField(max_length=64, blank=True, null=True)
    unit = models.CharField(max_length=32)  # e.g. kg, litre, pack
    pack_size = models.CharField(max_length=64, blank=True)
    hsn_code = models.CharField(max_length=32, blank=True, null=True)
    image = models.ImageField(upload_to='product_images/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"{self.name} ({self.brand})" if self.brand else self.name


class WholesalerProduct(TimeStampedModel):
    wholesaler = models.ForeignKey(Wholesaler, on_delete=models.CASCADE, related_name="products")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="wholesaler_offers")
    wholesale_price = models.DecimalField(max_digits=10, decimal_places=2)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    available_stock = models.PositiveIntegerField(default=0)
    min_order_qty = models.PositiveIntegerField(default=1)
    lead_time_days = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=16,
        choices=(
            ("active", "Active"),
            ("inactive", "Inactive"),
        ),
        default="active",
    )

    @property
    def is_available(self) -> bool:
        return self.status == "active" and self.product.is_active

    class Meta:
        unique_together = ("wholesaler", "product")

    def __str__(self) -> str:
        return f"{self.product} - {self.wholesaler.business_name}"
