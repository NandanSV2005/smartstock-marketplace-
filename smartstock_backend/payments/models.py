from django.db import models

from accounts.models import Retailer
from orders.models import Order
from common.models import TimeStampedModel


class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESS = "success", "Success"
        PAID = "paid", "Paid"
        PARTIAL = "partial", "Partial"
        CREDIT = "credit", "Credit"
        OVERDUE = "overdue", "Overdue"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    class Method(models.TextChoices):
        PAY_NOW = "pay_now", "Pay Now"
        PARTIAL = "partial", "Partial Payment"
        CREDIT = "credit", "Credit (Pay Later)"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="payments")
    payment_method = models.CharField(max_length=32, choices=Method.choices)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    payment_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    discount_applied = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transaction_id = models.CharField(max_length=128, blank=True, null=True)

    def __str__(self) -> str:
        return f"Payment {self.id} for Order {self.order.order_number}"


class RetailerCreditProfile(TimeStampedModel):
    """
    Stores the computed credit intelligence for each retailer.
    Recalculated on demand via the credit intelligence API.
    """
    retailer = models.OneToOneField(Retailer, on_delete=models.CASCADE, related_name="credit_profile")
    credit_score = models.IntegerField(default=100)
    total_credit_used = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    overdue_count = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Retailer Credit Profile"
        verbose_name_plural = "Retailer Credit Profiles"

    def __str__(self) -> str:
        return f"Credit Profile — {self.retailer.business_name} (Score: {self.credit_score})"

    @property
    def risk_level(self) -> str:
        if self.credit_score >= 80:
            return 'low'
        elif self.credit_score >= 50:
            return 'medium'
        return 'high'

    @property
    def credit_limit_suggestion(self) -> float:
        from decimal import Decimal
        return float(Decimal('50000') * (Decimal(str(self.credit_score)) / Decimal('100')))

