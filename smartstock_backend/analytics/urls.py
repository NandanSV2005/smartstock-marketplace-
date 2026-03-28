from django.urls import path

from analytics.views import (
    DashboardMetricsView,
    RetailerKPIView,
    RetailerSalesTrendView,
    RetailerInventoryLevelsView,
)

urlpatterns = [
    path("dashboard/", DashboardMetricsView.as_view(), name="dashboard-metrics"),
    path("retailer-kpis/", RetailerKPIView.as_view(), name="retailer-kpis"),
    path("sales-trend/", RetailerSalesTrendView.as_view(), name="retailer-sales-trend"),
    path("inventory-levels/", RetailerInventoryLevelsView.as_view(), name="retailer-inventory-levels"),
]

