from rest_framework.routers import DefaultRouter

from ai_engine.views import AIInsightViewSet

router = DefaultRouter()
router.register(r"insights", AIInsightViewSet, basename="ai-insights")

urlpatterns = router.urls

