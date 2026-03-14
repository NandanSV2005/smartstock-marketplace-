import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from orders.models import Cart, CartItem, Order, OrderItem
from orders.serializers import CartSerializer, OrderSerializer
from catalog.models import WholesalerProduct
from inventory.models import Inventory, InventoryMovement


class CartViewSet(viewsets.ModelViewSet):
    """
    Retailer Cart APIs
    """
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, "retailer_profile"):
            return Cart.objects.none()
        return Cart.objects.filter(retailer=user.retailer_profile).prefetch_related("items__wholesaler_product__product")

    @action(detail=False, methods=["get"])
    def active(self, request):
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Only retailers have carts"}, status=status.HTTP_403_FORBIDDEN)
            
        cart, created = Cart.objects.get_or_create(
            retailer=user.retailer_profile, 
            status=Cart.Status.ACTIVE
        )
        serializer = self.get_serializer(cart)
        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def add_item(self, request):
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Only retailers can add items to cart"}, status=status.HTTP_403_FORBIDDEN)
            
        wholesaler_product_id = request.data.get("wholesaler_product_id")
        quantity = int(request.data.get("quantity", 1))

        try:
            w_product = WholesalerProduct.objects.select_related("product").get(id=wholesaler_product_id)
        except WholesalerProduct.DoesNotExist:
            return Response({"error": "Product not found"}, status=status.HTTP_404_NOT_FOUND)

        if not w_product.is_available or w_product.available_stock < quantity:
            return Response({"error": "Not enough stock"}, status=status.HTTP_400_BAD_REQUEST)
            
        if quantity < w_product.min_order_qty:
            return Response({"error": f"Minimum order quantity is {w_product.min_order_qty}"}, status=status.HTTP_400_BAD_REQUEST)

        cart, _ = Cart.objects.get_or_create(retailer=user.retailer_profile, status=Cart.Status.ACTIVE)
        
        # Check if item exists in cart
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            wholesaler_product=w_product,
            defaults={
                "quantity": quantity,
                "unit_price_snapshot": w_product.wholesale_price
            }
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.unit_price_snapshot = w_product.wholesale_price
            cart_item.save()

        serializer = self.get_serializer(cart)
        return Response(serializer.data)
        
    @action(detail=False, methods=["post"])
    def update_item_quantity(self, request):
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        cart_item_id = request.data.get("cart_item_id")
        quantity = int(request.data.get("quantity", 0))
        
        try:
            cart_item = CartItem.objects.get(id=cart_item_id, cart__retailer=user.retailer_profile, cart__status=Cart.Status.ACTIVE)
            if quantity <= 0:
                cart_item.delete()
            else:
                cart_item.quantity = quantity
                cart_item.save()
            
            cart = Cart.objects.get(id=cart_item.cart_id)
            return Response(self.get_serializer(cart).data)
        except CartItem.DoesNotExist:
            return Response({"error": "Cart item not found"}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=["post"])
    def checkout(self, request):
        from orders.services import process_cart_checkout
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
            
        cart = Cart.objects.filter(retailer=user.retailer_profile, status=Cart.Status.ACTIVE).prefetch_related("items__wholesaler_product").first()
        
        if not cart or not cart.items.exists():
            return Response({"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)
            
        delivery_address = request.data.get("delivery_address", "Default Store Address")

        try:
            created_orders = process_cart_checkout(cart, user.retailer_profile, delivery_address)
            return Response({"message": "Orders created successfully", "order_ids": [o.id for o in created_orders]}, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OrderViewSet(viewsets.ModelViewSet):
    """
    Order APIs for both Retailers and Wholesalers
    """
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Order.objects.prefetch_related("items__product").all().order_by("-created_at")
        
        if hasattr(user, "retailer_profile"):
            return qs.filter(retailer=user.retailer_profile)
        elif hasattr(user, "wholesaler_profile"):
            return qs.filter(wholesaler=user.wholesaler_profile)
        return qs.none()

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        with transaction.atomic():
            order = self.get_object()
            new_status = request.data.get("status")
            
            user = request.user
            
            valid_transitions = {
                Order.Status.PENDING: [Order.Status.ACCEPTED, Order.Status.CANCELLED],
                Order.Status.ACCEPTED: [Order.Status.PACKED, Order.Status.CANCELLED],
                Order.Status.PACKED: [Order.Status.DISPATCHED],
                Order.Status.DISPATCHED: [Order.Status.DELIVERED],
                Order.Status.DELIVERED: [],
                Order.Status.CANCELLED: []
            }
            
            if new_status not in valid_transitions.get(order.status, []):
                return Response({"error": f"Invalid transition from {order.status} to {new_status}"}, status=status.HTTP_400_BAD_REQUEST)
                
            # Permission logic
            if hasattr(user, "retailer_profile") and order.retailer == user.retailer_profile:
                 # Retailer can only cancel pending orders or mark as delivered if dispatched
                 if new_status not in [Order.Status.CANCELLED, Order.Status.DELIVERED]:
                     return Response({"error": "Unauthorized status update"}, status=status.HTTP_403_FORBIDDEN)
            elif hasattr(user, "wholesaler_profile") and order.wholesaler == user.wholesaler_profile:
                 # Wholesaler handles fulfillment flow
                 if new_status == Order.Status.DELIVERED:
                      return Response({"error": "Retailer must confirm delivery"}, status=status.HTTP_403_FORBIDDEN)
            else:
                 return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
                 
            # Restore stock if cancelled
            if new_status == Order.Status.CANCELLED and order.status != Order.Status.CANCELLED:
                 for item in order.items.all():
                     w_product = item.wholesaler_product
                     if w_product:
                         w_product.available_stock += item.quantity
                         w_product.save()

            # Handle Retailer Inventory Sync on Delivery
            if new_status == Order.Status.DELIVERED:
                for item in order.items.all():
                    # Idempotency check: don't sync if movement already exists
                    if InventoryMovement.objects.filter(reference_order_item_id=item.id).exists():
                        continue

                    # Update or create retailer inventory record
                    inv_item, _ = Inventory.objects.get_or_create(
                        retailer=order.retailer,
                        product=item.product,
                        defaults={'current_stock': 0}
                    )
                    inv_item.current_stock += Decimal(str(item.quantity))
                    inv_item.save()

                    # Record the movement
                    InventoryMovement.objects.create(
                        inventory=inv_item,
                        movement_type=InventoryMovement.MovementType.PURCHASE,
                        quantity_change=item.quantity,
                        reference_order_item_id=item.id,
                        occurred_at=timezone.now(),
                        note=f"Stock received from Order {order.order_number}"
                    )
                          
            order.status = new_status
            order.save()
            
            return Response(self.get_serializer(order).data)
