import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartstock_backend.settings')
django.setup()

from orders.models import Cart
from accounts.models import User

user = User.objects.filter(role='retailer').first()
cart = Cart.objects.filter(retailer=user.retailer_profile, status='active').prefetch_related("items__wholesaler_product").first()

if cart:
    print(f"Cart found: {cart.id}")
    for item in cart.items.all():
        print(f"Item: {item.id}")
        wp = item.wholesaler_product
        print(f"Wholesaler: {wp.wholesaler}")
        print(f"Wholesaler ID: {wp.wholesaler.id}")
        print(f"Wholesaler FK: {wp.wholesaler_id}")
else:
    print("No active cart found")
