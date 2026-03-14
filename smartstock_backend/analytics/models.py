from django.db import models

from common.models import TimeStampedModel
from accounts.models import Retailer, Wholesaler


class DailyPlatformMetrics(TimeStampedModel):
    """
    Stores pre-aggregated analytics data for the admin dashboard.
    """
    date = models.DateField(unique=True)
    total_gmv = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField(default=0)
    new_retailers = models.PositiveIntegerField(default=0)
    new_wholesalers = models.PositiveIntegerField(default=0)
    active_users = models.PositiveIntegerField(default=0)

    def __str__(self) -> str:
        return f"Metrics for {self.date}"


class WholesalerAnalytics(TimeStampedModel):
    """
    Stores pre-aggregated analytics data for the wholesaler dashboard.
    """
    wholesaler = models.ForeignKey(Wholesaler, on_delete=models.CASCADE, related_name="analytics")
    date = models.DateField()
    total_revenue = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField(default=0)
    top_selling_products_json = models.JSONField(default=dict)

    class Meta:
        unique_together = ("wholesaler", "date")

    def __str__(self) -> str:
        return f"Analytics for {self.wholesaler.business_name} on {self.date}"


class RetailerAnalytics(TimeStampedModel):
    """
    Stores pre-aggregated analytics data for the retailer dashboard.
    """
    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="analytics")
    date = models.DateField()
    total_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_orders = models.PositiveIntegerField(default=0)
    top_purchased_categories_json = models.JSONField(default=dict)

    class Meta:
        unique_together = ("retailer", "date")

    def __str__(self) -> str:
        return f"Analytics for {self.retailer.business_name} on {self.date}"
