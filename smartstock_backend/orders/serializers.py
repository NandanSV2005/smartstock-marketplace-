from rest_framework import serializers

from orders.models import Cart, CartItem, Order, OrderItem
from catalog.serializers import WholesalerProductSerializer, ProductSerializer


class CartItemSerializer(serializers.ModelSerializer):
    wholesaler_product = WholesalerProductSerializer(read_only=True)

    class Meta:
        model = CartItem
        fields = ["id", "wholesaler_product", "quantity", "unit_price_snapshot"]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)

    class Meta:
        model = Cart
        fields = ["id", "status", "items"]


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ["id", "product", "quantity", "unit_price", "line_total"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "total_amount",
            "payment_status",
            "payment_method",
            "amount_paid",
            "amount_due",
            "due_date",
            "delivery_address",
            "expected_delivery_date",
            "delivered_at",
            "items",
        ]

