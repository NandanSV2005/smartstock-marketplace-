from datetime import date, timedelta
from django.db.models import Sum, Count
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from analytics.models import RetailerAnalytics, WholesalerAnalytics
from orders.models import Order


class DashboardMetricsView(APIView):
    """
    Returns dashboard metrics based on the user's role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)

        if hasattr(user, "retailer_profile"):
            retailer = user.retailer_profile
            
            # Simple aggregations
            recent_orders = Order.objects.filter(retailer=retailer, created_at__date__gte=thirty_days_ago)
            total_spent = recent_orders.aggregate(Sum("total_amount"))["total_amount__sum"] or 0
            order_count = recent_orders.count()
            
            pending_orders = Order.objects.filter(retailer=retailer, status=Order.Status.PENDING).count()

            return Response({
                "role": "retailer",
                "metrics": {
                    "total_spent_30d": total_spent,
                    "orders_30d": order_count,
                    "pending_orders": pending_orders
                }
            })

        elif hasattr(user, "wholesaler_profile"):
            wholesaler = user.wholesaler_profile
            
            recent_orders = Order.objects.filter(wholesaler=wholesaler, created_at__date__gte=thirty_days_ago)
            total_revenue = recent_orders.filter(status=Order.Status.DELIVERED).aggregate(Sum("total_amount"))["total_amount__sum"] or 0
            order_count = recent_orders.count()
            
            pending_orders = Order.objects.filter(wholesaler=wholesaler, status=Order.Status.PENDING).count()

            return Response({
                "role": "wholesaler",
                "metrics": {
                    "revenue_30d": total_revenue,
                    "orders_30d": order_count,
                    "pending_orders": pending_orders
                }
            })
            
        return Response({"error": "Admin dashboard not implemented here"}, status=status.HTTP_400_BAD_REQUEST)
