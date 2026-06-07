from rest_framework import permissions, viewsets, status
from rest_framework.response import Response

from inventory.models import Inventory
from inventory.serializers import InventorySerializer, InventoryCreateSerializer


class InventoryViewSet(viewsets.ModelViewSet):
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, "retailer_profile"):
            return Inventory.objects.none()
        return (
            Inventory.objects.filter(retailer=user.retailer_profile)
            .select_related("product", "product__category")
            .order_by("product__name")
        )

    def get_serializer_class(self):
        if self.action == 'create':
            return InventoryCreateSerializer
        return InventorySerializer

    def perform_create(self, serializer):
        user = self.request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Only retailers have inventory"}, status=status.HTTP_403_FORBIDDEN)
        serializer.save(retailer=user.retailer_profile)
