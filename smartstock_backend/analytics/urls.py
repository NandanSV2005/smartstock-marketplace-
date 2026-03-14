from django.urls import path

from analytics.views import DashboardMetricsView

urlpatterns = [
    path("dashboard/", DashboardMetricsView.as_view(), name="dashboard-metrics"),
]
