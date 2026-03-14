from rest_framework import permissions, viewsets
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from catalog.models import Category, Product, WholesalerProduct
from catalog.serializers import (
    CategorySerializer, 
    ProductSerializer, 
    WholesalerProductSerializer,
    WholesalerProductCreateSerializer
)

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True).select_related("category").order_by("name")
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("q")
        category_id = self.request.query_params.get("category_id")
        if q:
            qs = qs.filter(name__icontains=q)
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class WholesalerProductViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "create":
            return WholesalerProductCreateSerializer
        return WholesalerProductSerializer

    def get_queryset(self):
        qs = WholesalerProduct.objects.select_related("product", "wholesaler").filter(status="active")
        product_id = self.request.query_params.get("product_id")
        
        # If user is wholesaler, return all their products (including inactive optionally, but kept active for now per original logic)
        user = self.request.user
        if hasattr(user, "wholesaler_profile"):
             qs = WholesalerProduct.objects.filter(wholesaler=user.wholesaler_profile).select_related("product")
        
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, "wholesaler_profile"):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Only wholesalers can create products.")
            
        serializer.save(wholesaler=user.wholesaler_profile)

    def perform_update(self, serializer):
        user = self.request.user
        if not hasattr(user, "wholesaler_profile") or serializer.instance.wholesaler != user.wholesaler_profile:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You do not have permission to update this product.")
        serializer.save()
