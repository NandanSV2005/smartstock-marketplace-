from django.db import models

from accounts.models import Retailer
from catalog.models import Product
from common.models import TimeStampedModel


class SalesHistory(TimeStampedModel):
    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="sales_history")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="sales_history")
    date = models.DateField()
    units_sold = models.DecimalField(max_digits=10, decimal_places=2)
    revenue = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        unique_together = ("retailer", "product", "date")
        indexes = [
            models.Index(fields=["retailer", "product", "date"]),
        ]


class AIInsight(TimeStampedModel):
    class InsightType(models.TextChoices):
        LOW_STOCK = "low_stock", "Low Stock"
        SLOW_MOVING = "slow_moving", "Slow Moving"
        DEMAND_INCREASE = "demand_increase", "Demand Increase"
        DEMAND_DECREASE = "demand_decrease", "Demand Decrease"
        SEASONAL = "seasonal", "Seasonal"
        REORDER_RECOMMENDATION = "reorder_recommendation", "Reorder Recommendation"
        EXPIRY_ALERT = "expiry_alert", "Expiry Alert"
        PROFIT_OPTIMIZATION = "profit_optimization", "Profit Optimization"

    class Status(models.TextChoices):
        NEW = "new", "New"
        SEEN = "seen", "Seen"
        APPLIED = "applied", "Applied"
        DISMISSED = "dismissed", "Dismissed"

    retailer = models.ForeignKey(Retailer, on_delete=models.CASCADE, related_name="ai_insights")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="ai_insights", null=True, blank=True)
    type = models.CharField(max_length=40, choices=InsightType.choices)
    title = models.CharField(max_length=255)
    description = models.TextField()
    recommendation_json = models.JSONField(blank=True, null=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    generated_at = models.DateTimeField()

    def __str__(self) -> str:
        return f"{self.get_type_display()} for {self.retailer}"
