import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from payments.models import Payment
from payments.serializers import PaymentSerializer, PaymentInitiateSerializer
from orders.models import Cart, Order
from orders.services import process_cart_checkout

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, "retailer_profile"):
            return Payment.objects.filter(order__retailer=user.retailer_profile).order_by('-created_at')
        elif hasattr(user, "wholesaler_profile"):
            return Payment.objects.filter(order__wholesaler=user.wholesaler_profile).order_by('-created_at')
        return Payment.objects.none()

    @action(detail=False, methods=["post"])
    def initiate(self, request):
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Only retailers can initiate payments"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = PaymentInitiateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        payment_method = data['payment_method']
        upfront_amount = data.get('upfront_amount', 0)
        delivery_address = data['delivery_address']

        retailer_profile = user.retailer_profile
        cart = Cart.objects.filter(retailer=retailer_profile, status=Cart.Status.ACTIVE).prefetch_related("items__wholesaler_product").first()

        if not cart or not cart.items.exists():
            return Response({"error": "Cart is empty"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # 1. Process Cart into Orders
                orders = process_cart_checkout(cart, retailer_profile, delivery_address)
                
                payment_records = []
                for order in orders:
                    # 2. Setup Payment according to method
                    status_val = Payment.Status.PENDING
                    amount_paid = 0
                    amount_due = order.total_amount
                    due_date = None
                    discount_applied = 0

                    if payment_method == Payment.Method.PAY_NOW:
                        # Simulate success
                        status_val = Payment.Status.PAID
                        amount_paid = order.total_amount
                        amount_due = 0
                        order.payment_status = Order.PaymentStatus.PAID
                    elif payment_method == Payment.Method.PARTIAL:
                        # Validate upfront amount against total cart value
                        total_cart_value = sum(item.quantity * item.wholesaler_product.wholesale_price for item in cart.items.all())
                        if Decimal(str(upfront_amount)) > total_cart_value:
                            raise ValueError(f"Upfront amount ({upfront_amount}) cannot exceed total cart value ({total_cart_value})")

                        # In this simple simulation, we split the upfront amount proportionally if there are multiple orders
                        fraction = order.total_amount / total_cart_value
                        order_upfront = Decimal(str(upfront_amount)) * fraction
                        
                        status_val = Payment.Status.PARTIAL
                        # Capping upfront amount to avoid negative amount_due due to floating point precision or rounding
                        order_upfront = min(order_upfront, order.total_amount)
                        
                        amount_paid = order_upfront
                        amount_due = order.total_amount - order_upfront
                        order.payment_status = Order.PaymentStatus.PARTIAL
                        due_date = timezone.now().date() + timezone.timedelta(days=90) # Default 90 days
                    elif payment_method == Payment.Method.CREDIT:
                        status_val = Payment.Status.CREDIT
                        amount_paid = 0
                        amount_due = order.total_amount
                        order.payment_status = Order.PaymentStatus.CREDIT
                        due_date = timezone.now().date() + timezone.timedelta(days=90)

                    order.payment_method = payment_method
                    order.amount_paid = amount_paid
                    order.amount_due = amount_due
                    order.due_date = due_date
                    order.save()

                    import random
                    payment = Payment.objects.create(
                        order=order,
                        payment_method=payment_method,
                        total_amount=order.total_amount,
                        amount_paid=amount_paid,
                        amount_due=amount_due,
                        status=status_val,
                        due_date=due_date,
                        transaction_id=f"TXN{random.randint(1000000, 9999999)}"
                    )
                    payment_records.append(payment)

                return Response({
                    "message": "Payment initiated and orders created successfully",
                    "orders": [o.id for o in orders],
                    "payments": PaymentSerializer(payment_records, many=True).data
                }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"], url_path="order/(?P<order_id>[^/.]+)")
    def order_history(self, request, order_id=None):
        order = get_object_or_404(Order, id=order_id)
        # Check permissions
        if hasattr(request.user, "retailer_profile") and order.retailer != request.user.retailer_profile:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
        if hasattr(request.user, "wholesaler_profile") and order.wholesaler != request.user.wholesaler_profile:
            return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

        payments = Payment.objects.filter(order=order).order_by('-created_at')
        return Response(PaymentSerializer(payments, many=True).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        payment_record = self.get_object()
        if payment_record.status == Payment.Status.PAID:
            return Response({"error": "Already paid"}, status=status.HTTP_400_BAD_REQUEST)

        # Early payment discount calculation
        # 0–15 days → 3% discount
        # 16–30 days → 2% discount
        # 31–60 days → 1% discount
        days_diff = (timezone.now().date() - payment_record.order.created_at.date()).days
        discount_rate = Decimal('0.00')
        if days_diff <= 15:
            discount_rate = Decimal('0.03')
        elif days_diff <= 30:
            discount_rate = Decimal('0.02')
        elif days_diff <= 60:
            discount_rate = Decimal('0.01')

        discount_amount = payment_record.amount_due * discount_rate
        final_payable = payment_record.amount_due - discount_amount

        # Simulate payment
        payment_record.amount_paid += final_payable
        payment_record.amount_due = 0
        payment_record.discount_applied = discount_amount
        payment_record.status = Payment.Status.PAID
        payment_record.save()

        # Update order status
        order = payment_record.order
        order.amount_paid += final_payable
        order.amount_due = 0
        order.payment_status = Order.PaymentStatus.PAID
        order.save()

        return Response({
            "message": "Payment successful",
            "discount_applied": discount_amount,
            "amount_paid": final_payable,
            "payment": PaymentSerializer(payment_record).data
        })
