from rest_framework import serializers

from inventory.models import Inventory
from catalog.serializers import ProductSerializer


class InventorySerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = Inventory
        fields = [
            "id",
            "product",
            "current_stock",
            "reorder_level",
            "reorder_quantity_suggestion",
            "avg_daily_sales",
        ]


class InventoryCreateSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField()

    class Meta:
        model = Inventory
        fields = ["product_id", "current_stock", "reorder_level"]

