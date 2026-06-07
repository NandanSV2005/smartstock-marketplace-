import os
import django
from decimal import Decimal
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartstock_backend.settings')
django.setup()

from accounts.models import User, Retailer
from orders.models import Cart, CartItem, Order
from catalog.models import WholesalerProduct
from payments.models import Payment
from orders.services import process_cart_checkout

def verify_flows():
    # Get a retailer
    user = User.objects.filter(role='retailer').first()
    retailer = user.retailer_profile
    
    # Get a product
    wp = WholesalerProduct.objects.filter(status='active').first()
    
    def setup_cart():
        Cart.objects.filter(retailer=retailer, status='active').delete()
        cart = Cart.objects.create(retailer=retailer, status='active')
        CartItem.objects.create(
            cart=cart,
            wholesaler_product=wp,
            quantity=10,
            unit_price_snapshot=wp.wholesale_price
        )
        return cart

    # 1. Test Pay Now
    print("\n--- Testing PAY NOW ---")
    cart = setup_cart()
    from payments.views import PaymentViewSet
    from rest_framework.test import APIRequestFactory, force_authenticate
    
    factory = APIRequestFactory()
    view = PaymentViewSet.as_view({'post': 'initiate'})
    
    request = factory.post('/api/v1/payments/initiate/', {
        'payment_method': 'pay_now',
        'delivery_address': 'Test Address 1'
    })
    force_authenticate(request, user=user)
    response = view(request)
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        p_id = response.data['payments'][0]['id']
        p = Payment.objects.get(id=p_id)
        print(f"Payment Status: {p.status}, Amount Paid: {p.amount_paid}, Order Status: {p.order.payment_status}")
    else:
        print(f"Error Data: {response.data}")

    # 2. Test Partial
    print("\n--- Testing PARTIAL ---")
    cart = setup_cart()
    request = factory.post('/api/v1/payments/initiate/', {
        'payment_method': 'partial',
        'upfront_amount': 2000,
        'delivery_address': 'Test Address 2'
    })
    force_authenticate(request, user=user)
    response = view(request)
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        p_id = response.data['payments'][0]['id']
        p = Payment.objects.get(id=p_id)
        print(f"Payment Status: {p.status}, Amount Paid: {p.amount_paid}, Amount Due: {p.amount_due}")
    else:
        print(f"Error Data: {response.data}")

    # 3. Test Credit & Early Payment
    print("\n--- Testing CREDIT & PAY ---")
    cart = setup_cart()
    request = factory.post('/api/v1/payments/initiate/', {
        'payment_method': 'credit',
        'delivery_address': 'Test Address 3'
    })
    force_authenticate(request, user=user)
    response = view(request)
    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        p_id = response.data['payments'][0]['id']
        p = Payment.objects.get(id=p_id)
        print(f"Initial: Status={p.status}, Due={p.amount_due}, Due Date={p.due_date}")
        
        # Now pay it
        pay_view = PaymentViewSet.as_view({'post': 'pay'})
        pay_request = factory.post(f'/api/v1/payments/{p_id}/pay/')
        force_authenticate(pay_request, user=user)
        pay_response = pay_view(pay_request, pk=p_id)
        print(f"Pay Status: {pay_response.status_code}")
        if pay_response.status_code == 200:
            print(f"Discount: {pay_response.data['discount_applied']}, Final Paid: {pay_response.data['amount_paid']}")
        else:
            print(f"Pay Error Data: {pay_response.data}")
    else:
        print(f"Error Data: {response.data}")

if __name__ == "__main__":
    import traceback
    try:
        verify_flows()
    except Exception:
        traceback.print_exc()
