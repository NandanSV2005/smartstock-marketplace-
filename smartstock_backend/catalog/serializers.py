from rest_framework import serializers

from catalog.models import Category, Product, WholesalerProduct
from common.image_utils import fetch_image_for_product


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "parent", "slug"]


class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "brand",
            "category",
            "sku",
            "unit",
            "pack_size",
            "hsn_code",
            "image",
        ]


class WholesalerProductSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = WholesalerProduct
        fields = [
            "id",
            "product",
            "wholesale_price",
            "mrp",
            "available_stock",
            "min_order_qty",
            "lead_time_days",
            "status",
        ]


class WholesalerProductCreateSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(max_length=255, required=False)
    product_brand = serializers.CharField(max_length=120, required=False, allow_blank=True)
    product_category_id = serializers.IntegerField(required=False)
    product_unit = serializers.CharField(max_length=32, required=False)
    product_image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = WholesalerProduct
        fields = [
            "id",
            "product_id",
            "product_name",
            "product_brand",
            "product_category_id",
            "product_unit",
            "product_image",
            "wholesale_price",
            "mrp",
            "available_stock",
            "min_order_qty",
            "lead_time_days",
            "status",
        ]

    def create(self, validated_data):
        product_id = validated_data.pop("product_id", None)
        product_name = validated_data.pop("product_name", None)
        product_brand = validated_data.pop("product_brand", "")
        product_category_id = validated_data.pop("product_category_id", None)
        product_unit = validated_data.pop("product_unit", "unit")
        product_image = validated_data.pop("product_image", None)

        if product_id:
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                raise serializers.ValidationError({"product_id": "Invalid product ID"})
        else:
            if not product_name or not product_category_id:
                raise serializers.ValidationError("product_name and product_category_id are required if creating a new product")
            try:
                category = Category.objects.get(id=product_category_id)
            except Category.DoesNotExist:
                raise serializers.ValidationError({"product_category_id": "Invalid category ID"})
            
            # Auto-fetch image if not provided
            if not product_image:
                product_image = fetch_image_for_product(product_name, product_brand)
                
            product = Product.objects.create(
                name=product_name,
                brand=product_brand,
                category=category,
                unit=product_unit,
                image=product_image
            )

        validated_data["product"] = product
        return super().create(validated_data)
