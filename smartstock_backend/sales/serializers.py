from rest_framework import serializers
from .models import Sale, SaleItem
from catalog.models import Product

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    
    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_name', 'quantity_sold']

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    retailer_name = serializers.ReadOnlyField(source='retailer.business_name')

    class Meta:
        model = Sale
        fields = ['id', 'retailer', 'retailer_name', 'sale_date', 'invoice_number', 'total_items', 'items']
        read_only_fields = ['retailer', 'sale_date', 'invoice_number', 'total_items']

    def create(self, validated_data):
        # We will handle the actual creation and inventory logic in the view 
        # to ensure Transaction safety and better error handling for stock checks.
        pass
