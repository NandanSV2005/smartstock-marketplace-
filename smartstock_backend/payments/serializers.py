from rest_framework import serializers
from payments.models import Payment
from orders.models import Order, OrderItem
from orders.serializers import OrderSerializer

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "order",
            "payment_method",
            "total_amount",
            "amount_paid",
            "amount_due",
            "status",
            "payment_date",
            "due_date",
            "discount_applied",
            "transaction_id"
        ]

class PaymentInitiateSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=Payment.Method.choices)
    upfront_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    delivery_address = serializers.CharField(max_length=512)
