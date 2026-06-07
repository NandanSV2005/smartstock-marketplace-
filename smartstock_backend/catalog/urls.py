from rest_framework.routers import DefaultRouter

from catalog.views import CategoryViewSet, ProductViewSet, WholesalerProductViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"wholesaler-products", WholesalerProductViewSet, basename="wholesaler-product")

urlpatterns = router.urls

