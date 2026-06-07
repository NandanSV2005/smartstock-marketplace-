from django.db import models

from accounts.models import User
from common.models import TimeStampedModel


class Notification(TimeStampedModel):
    class Type(models.TextChoices):
        ORDER_UPDATE = "order_update", "Order Update"
        DELIVERY_UPDATE = "delivery_update", "Delivery Update"
        LOW_STOCK = "low_stock", "Low Stock"
        REORDER_SUGGESTION = "reorder_suggestion", "Reorder Suggestion"
        PAYMENT_UPDATE = "payment_update", "Payment Update"
        SYSTEM = "system", "System"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    type = models.CharField(max_length=40, choices=Type.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    metadata_json = models.JSONField(blank=True, null=True)
    read_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.user.email} - {self.title}"
