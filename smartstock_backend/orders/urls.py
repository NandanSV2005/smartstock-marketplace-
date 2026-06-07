from rest_framework.routers import DefaultRouter

from orders.views import CartViewSet, OrderViewSet

router = DefaultRouter()
router.register(r"cart", CartViewSet, basename="cart")
router.register(r"", OrderViewSet, basename="orders")

urlpatterns = router.urls
