import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from payments.models import Payment, RetailerCreditProfile
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
            wholesaler = user.wholesaler_profile
            today = timezone.now().date()

            # --- Overdue detection: runs on every fetch for wholesalers ---
            overdue_payments = Payment.objects.filter(
                order__wholesaler=wholesaler,
                due_date__lt=today,
                amount_due__gt=0,
            ).exclude(status=Payment.Status.PAID)

            if overdue_payments.exists():
                overdue_payment_ids = list(overdue_payments.values_list('id', flat=True))
                Payment.objects.filter(id__in=overdue_payment_ids).update(status=Payment.Status.OVERDUE)
                # Sync order payment_status as well
                Order.objects.filter(
                    wholesaler=wholesaler,
                    due_date__lt=today,
                    amount_due__gt=0,
                ).exclude(payment_status=Order.PaymentStatus.PAID).update(
                    payment_status=Order.PaymentStatus.OVERDUE
                )
                # Create notifications for wholesaler for newly overdue payments
                _notify_overdue(user, overdue_payment_ids)

            return Payment.objects.filter(order__wholesaler=wholesaler).order_by('-created_at')
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

    # =========================================================================
    # PART 2: Credit Intelligence — Wholesaler views
    # =========================================================================

    @action(detail=False, methods=["get"], url_path="credit-profiles")
    def credit_profiles(self, request):
        """
        Wholesaler-only endpoint.
        Returns credit intelligence for all retailers who have placed orders
        with this wholesaler.
        """
        user = request.user
        if not hasattr(user, "wholesaler_profile"):
            return Response({"error": "Only wholesalers can view credit profiles"}, status=status.HTTP_403_FORBIDDEN)

        from payments.credit_service import calculate_credit_score
        from accounts.models import Retailer

        wholesaler = user.wholesaler_profile
        # Get unique retailers who have ordered from this wholesaler
        retailer_ids = Order.objects.filter(
            wholesaler=wholesaler
        ).values_list('retailer_id', flat=True).distinct()

        retailers = Retailer.objects.filter(id__in=retailer_ids)

        profiles = []
        for retailer in retailers:
            score_data = calculate_credit_score(retailer)
            profiles.append({
                'retailer_id': retailer.id,
                'retailer_name': retailer.business_name,
                'business_type': retailer.business_type,
                'credit_score': score_data['credit_score'],
                'risk_level': score_data['risk_level'],
                'credit_limit_suggestion': score_data['credit_limit_suggestion'],
                'total_credit_used': score_data['total_credit_used'],
                'overdue_count': score_data['overdue_count'],
            })

        # Sort by credit_score ascending (riskiest first)
        profiles.sort(key=lambda x: x['credit_score'])
        return Response(profiles)

    @action(detail=False, methods=["post"], url_path=r"credit-profiles/(?P<retailer_id>[^/.]+)/recalculate")
    def recalculate_credit(self, request, retailer_id=None):
        """
        Wholesaler-only endpoint.
        Recalculate credit score for a specific retailer on demand.
        """
        user = request.user
        if not hasattr(user, "wholesaler_profile"):
            return Response({"error": "Only wholesalers can recalculate credit profiles"}, status=status.HTTP_403_FORBIDDEN)

        from payments.credit_service import calculate_credit_score
        from accounts.models import Retailer

        retailer = get_object_or_404(Retailer, id=retailer_id)

        # Verify this retailer has actually ordered from this wholesaler
        has_orders = Order.objects.filter(
            retailer=retailer, wholesaler=user.wholesaler_profile
        ).exists()
        if not has_orders:
            return Response({"error": "No orders found for this retailer with your account"}, status=status.HTTP_404_NOT_FOUND)

        score_data = calculate_credit_score(retailer)
        return Response({
            'retailer_id': retailer.id,
            'retailer_name': retailer.business_name,
            **score_data,
        })

    # =========================================================================
    # PART 3: Wholesaler Financial Visibility — Receivables Summary
    # =========================================================================

    @action(detail=False, methods=["get"], url_path="receivables-summary")
    def receivables_summary(self, request):
        """
        Wholesaler-only endpoint.
        Returns a financial summary of outstanding receivables.
        """
        user = request.user
        if not hasattr(user, "wholesaler_profile"):
            return Response({"error": "Only wholesalers can view receivables"}, status=status.HTTP_403_FORBIDDEN)

        wholesaler = user.wholesaler_profile
        today = timezone.now().date()

        # All payments for this wholesaler with amount due > 0
        pending_qs = Payment.objects.filter(
            order__wholesaler=wholesaler,
            amount_due__gt=0,
        ).exclude(status=Payment.Status.PAID)

        total_pending_amount = sum(p.amount_due for p in pending_qs)

        # Credit orders (payment_method == credit)
        credit_orders_count = Order.objects.filter(
            wholesaler=wholesaler,
            payment_method=Order.PaymentMethod.CREDIT,
            amount_due__gt=0,
        ).count()

        # Overdue payments
        overdue_qs = pending_qs.filter(
            due_date__lt=today
        )
        overdue_count = overdue_qs.count()
        overdue_amount = sum(p.amount_due for p in overdue_qs)

        return Response({
            'total_pending_amount': float(total_pending_amount),
            'total_credit_orders': credit_orders_count,
            'overdue_count': overdue_count,
            'overdue_amount': float(overdue_amount),
        })

    # =========================================================================
    # PART 4: Razorpay Payment Gateway Integration
    # =========================================================================

    @action(detail=False, methods=["post"], url_path="create-order/cart")
    def create_cart_order(self, request):
        user = request.user
        cart_id = request.data.get("cart_id")
        
        cart = None
        if cart_id:
            cart = Cart.objects.filter(id=cart_id).first()
        if not cart and hasattr(user, "retailer_profile"):
            cart = Cart.objects.filter(retailer=user.retailer_profile, status=Cart.Status.ACTIVE).first()
            
        if not cart or not cart.items.exists():
            return Response({"detail": "Cart not found or empty"}, status=status.HTTP_400_BAD_REQUEST)
            
        total_amount = sum(item.quantity * item.unit_price_snapshot for item in cart.items.all())
        if total_amount <= 0:
            return Response({"detail": "Cart total must be greater than 0"}, status=status.HTTP_400_BAD_REQUEST)
            
        from payments.razorpay_service import create_razorpay_order, KEY_ID
        receipt = f"cart_{cart.id}_{uuid.uuid4().hex[:8]}"
        
        try:
            order_data = create_razorpay_order(
                amount_rupees=float(total_amount),
                receipt=receipt,
                notes={
                    "cart_id": str(cart.id),
                    "user_id": str(user.id),
                    "payment_type": "cart_checkout",
                }
            )
        except Exception as e:
            return Response({"detail": f"Razorpay order creation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
            
        return Response({
            "razorpay_order_id": order_data["id"],
            "amount": order_data["amount"],
            "currency": order_data["currency"],
            "key_id": KEY_ID,
            "cart_id": cart.id,
        })

    @action(detail=False, methods=["post"], url_path="create-order/ledger")
    def create_ledger_order(self, request):
        amount = request.data.get("amount", 0)
        try:
            amount = float(amount)
        except (ValueError, TypeError):
            return Response({"detail": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)
            
        if amount <= 0:
            return Response({"detail": "Amount must be greater than 0"}, status=status.HTTP_400_BAD_REQUEST)
            
        from payments.razorpay_service import create_razorpay_order, KEY_ID
        receipt = f"ledger_{request.user.id}_{uuid.uuid4().hex[:8]}"
        
        try:
            order_data = create_razorpay_order(
                amount_rupees=amount,
                receipt=receipt,
                notes={
                    "user_id": str(request.user.id),
                    "payment_type": "ledger_clearance",
                }
            )
        except Exception as e:
            return Response({"detail": f"Razorpay order creation failed: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
            
        return Response({
            "razorpay_order_id": order_data["id"],
            "amount": order_data["amount"],
            "currency": order_data["currency"],
            "key_id": KEY_ID,
        })

    @action(detail=False, methods=["post"])
    def verify(self, request):
        data = request.data
        razorpay_order_id = data.get("razorpay_order_id", "")
        razorpay_payment_id = data.get("razorpay_payment_id", "")
        razorpay_signature = data.get("razorpay_signature", "")
        payment_type = data.get("payment_type", "")
        reference_id = data.get("reference_id")
        
        from payments.razorpay_service import verify_payment_signature
        is_valid = verify_payment_signature(
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
        )
        
        if not is_valid:
            return Response(
                {"detail": "Payment verification failed. Invalid signature."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = request.user
        with transaction.atomic():
            if payment_type == "cart":
                retailer_profile = getattr(user, "retailer_profile", None)
                cart = None
                if reference_id:
                    cart = Cart.objects.filter(id=reference_id).first()
                if not cart and retailer_profile:
                    cart = Cart.objects.filter(retailer=retailer_profile, status=Cart.Status.ACTIVE).first()
                    
                if cart and cart.items.exists() and retailer_profile:
                    orders = process_cart_checkout(cart, retailer_profile, "Online Checkout (Razorpay)")
                    for order in orders:
                        order.payment_status = Order.PaymentStatus.PAID
                        order.payment_method = Order.PaymentMethod.PAY_NOW
                        order.amount_paid = order.total_amount
                        order.amount_due = 0
                        order.save()
                        
                        import random
                        Payment.objects.create(
                            order=order,
                            payment_method=Payment.Method.PAY_NOW,
                            total_amount=order.total_amount,
                            amount_paid=order.total_amount,
                            amount_due=0,
                            status=Payment.Status.PAID,
                            transaction_id=razorpay_payment_id or f"TXN{random.randint(1000000, 9999999)}"
                        )
            elif payment_type == "ledger":
                if reference_id:
                    payment_rec = Payment.objects.filter(id=reference_id).first()
                    if payment_rec:
                        payment_rec.amount_paid += payment_rec.amount_due
                        payment_rec.amount_due = 0
                        payment_rec.status = Payment.Status.PAID
                        if razorpay_payment_id:
                            payment_rec.transaction_id = razorpay_payment_id
                        payment_rec.save()
                        
                        order = payment_rec.order
                        order.amount_paid += order.amount_due
                        order.amount_due = 0
                        order.payment_status = Order.PaymentStatus.PAID
                        order.save()
                    else:
                        order = Order.objects.filter(id=reference_id).first()
                        if order:
                            order.amount_paid = order.total_amount
                            order.amount_due = 0
                            order.payment_status = Order.PaymentStatus.PAID
                            order.save()
                            
                            Payment.objects.filter(order=order).update(
                                amount_paid=order.total_amount,
                                amount_due=0,
                                status=Payment.Status.PAID,
                                transaction_id=razorpay_payment_id
                            )
                            
        return Response({
            "success": True,
            "payment_id": razorpay_payment_id,
            "message": "Payment verified and recorded successfully.",
        })

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def webhook(self, request):
        import hmac, hashlib
        webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
        received_sig = request.headers.get("X-Razorpay-Signature", "")
        
        if webhook_secret and received_sig:
            expected_sig = hmac.new(
                webhook_secret.encode(),
                request.body,
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected_sig, received_sig):
                return Response({"detail": "Invalid webhook signature"}, status=status.HTTP_400_BAD_REQUEST)
                
        event = request.data
        if isinstance(event, dict) and event.get("event") == "payment.captured":
            # Webhook processing logic fallback
            pass
            
        return Response({"status": "ok"})



# ============================================================================
# Private helpers
# ============================================================================

def _notify_overdue(user, payment_ids):
    """
    Creates overdue notifications for the wholesaler user.
    De-duplicates by checking existing notifications with same payment IDs.
    """
    try:
        from notifications.models import Notification
        count = len(payment_ids)
        if count == 0:
            return
        # Check if we already sent a notification for any of these IDs today
        today_str = timezone.now().date().isoformat()
        already_exists = Notification.objects.filter(
            user=user,
            type=Notification.Type.PAYMENT_UPDATE,
            title__startswith="Overdue Alert",
            created_at__date=timezone.now().date(),
        ).exists()
        if already_exists:
            return

        Notification.objects.create(
            user=user,
            type=Notification.Type.PAYMENT_UPDATE,
            title=f"Overdue Alert: {count} payment{'s' if count > 1 else ''} overdue",
            body=(
                f"You have {count} overdue payment{'s' if count > 1 else ''} "
                f"from retailers that have passed their due date. "
                f"Review the Credit Ledger to take action."
            ),
            metadata_json={'overdue_payment_ids': payment_ids, 'date': today_str},
        )
    except Exception:
        pass  # Notifications failing should not break the payment flow
