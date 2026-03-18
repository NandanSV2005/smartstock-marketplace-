from datetime import datetime
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from .models import Sale, SaleItem
from .serializers import SaleSerializer, SaleItemSerializer
from inventory.models import Inventory, InventoryMovement

class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, "retailer_profile"):
            return Sale.objects.none()
        return Sale.objects.filter(retailer=user.retailer_profile)

    def perform_create(self, serializer):
        # We handle this manually in the 'create' method to deal with items and inventory
        pass

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Only retailers can record sales"}, status=status.HTTP_403_FORBIDDEN)
        
        retailer = user.retailer_profile
        items_data = request.data.get('items', [])
        
        if not items_data:
            return Response({"error": "No items provided in sale"}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Validate Stock and Calculate Totals
        sale_items_to_create = []
        inventory_updates = []
        total_items_count = Decimal('0')
        
        for item in items_data:
            product_id = item.get('product')
            qty = Decimal(str(item.get('quantity_sold', 0)))
            
            if qty <= 0:
                return Response({"error": f"Invalid quantity for product ID {product_id}"}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                inv_item = Inventory.objects.select_for_update().get(retailer=retailer, product_id=product_id)
            except Inventory.DoesNotExist:
                return Response({"error": f"Product ID {product_id} not found in your inventory"}, status=status.HTTP_404_NOT_FOUND)
            
            if inv_item.current_stock < qty:
                return Response({
                    "error": f"Insufficient stock for {inv_item.product.name}. Available: {inv_item.current_stock}, Requested: {qty}"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            sale_items_to_create.append({
                'product_id': product_id,
                'quantity_sold': qty,
                'inv_item': inv_item
            })
            total_items_count += qty

        # 2. Create the Sale record
        sale = Sale.objects.create(
            retailer=retailer,
            total_items=total_items_count
        )
        sale.invoice_number = f"INV-{timezone.now().strftime('%y%m%d')}-{sale.id:04d}"
        sale.save()

        # 3. Create SaleItems and update Inventory
        for sc in sale_items_to_create:
            SaleItem.objects.create(
                sale=sale,
                product_id=sc['product_id'],
                quantity_sold=sc['quantity_sold']
            )
            
            # Update Inventory
            sc['inv_item'].current_stock -= sc['quantity_sold']
            sc['inv_item'].save()
            
            # Record Inventory Movement
            InventoryMovement.objects.create(
                inventory=sc['inv_item'],
                movement_type=InventoryMovement.MovementType.SALE,
                quantity_change=-sc['quantity_sold'],
                occurred_at=timezone.now(),
                note=f"Sale #{sale.invoice_number}"
            )

        serializer = self.get_serializer(sale)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
