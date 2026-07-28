from django.urls import path, include
from rest_framework.routers import DefaultRouter
from payments.views import PaymentViewSet

router = DefaultRouter()
router.register(r'', PaymentViewSet, basename='payment')

urlpatterns = [
    path('create-order/cart', PaymentViewSet.as_view({'post': 'create_cart_order'})),
    path('create-order/ledger', PaymentViewSet.as_view({'post': 'create_ledger_order'})),
    path('verify', PaymentViewSet.as_view({'post': 'verify'})),
    path('webhook', PaymentViewSet.as_view({'post': 'webhook'})),
    path('', include(router.urls)),
]
