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

from django.db.models import Sum, F
from django.db.models.functions import TruncDate
from payments.models import Payment
from inventory.models import Inventory
from sales.models import Sale

class RetailerKPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "retailer_profile"):
            return Response({"error": "Only retailers can access these KPIs"}, status=403)
        retailer = request.user.retailer_profile

        today = date.today()
        first_of_month = today.replace(day=1)

        # 1. Total Sales (Monthly)
        monthly_sales = Sale.objects.filter(retailer=retailer, sale_date__date__gte=first_of_month)
        total_sales_revenue = monthly_sales.aggregate(total=Sum('total_amount'))['total'] or 0

        # 2. Orders This Month
        orders_this_month = Order.objects.filter(retailer=retailer, created_at__date__gte=first_of_month).count()

        # 3. Outstanding Credit
        outstanding = Payment.objects.filter(order__retailer=retailer, amount_due__gt=0).aggregate(total=Sum('amount_due'))['total'] or 0

        # 4. Low Stock Items
        low_stock_count = Inventory.objects.filter(retailer=retailer, current_stock__lte=F('reorder_level'), reorder_level__gt=0).count()

        return Response({
            "total_sales_revenue": total_sales_revenue,
            "orders_this_month": orders_this_month,
            "outstanding_credit": outstanding,
            "low_stock_count": low_stock_count
        })

class RetailerSalesTrendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "retailer_profile"):
            return Response({"error": "Only retailers"}, status=403)
        retailer = request.user.retailer_profile

        thirty_days_ago = date.today() - timedelta(days=30)
        
        # Group sales by date
        sales_trend = (
            Sale.objects.filter(retailer=retailer, sale_date__date__gte=thirty_days_ago)
            .annotate(date=TruncDate('sale_date'))
            .values('date')
            .annotate(
                total_quantity=Sum('total_items'),
                total_revenue=Sum('total_amount')
            )
            .order_by('date')
        )
        
        # Create a dictionary of results to ensure missing days can be correctly formatted if needed,
        # but returning current array is fine for Recharts which handles missing dates if XAxis is category,
        # or we just pass the sparse array.
        return Response(list(sales_trend))

class RetailerInventoryLevelsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "retailer_profile"):
            return Response({"error": "Only retailers"}, status=403)
        retailer = request.user.retailer_profile

        # Return all active inventory items with stock and reorder levels
        inventory = Inventory.objects.filter(retailer=retailer).select_related('product')
        data = []
        for inv in inventory:
            data.append({
                "name": inv.product.name,
                "current_stock": inv.current_stock,
                "reorder_level": inv.reorder_level,
                "max_stock": max(inv.current_stock, inv.reorder_level) * 2  # helps with chart scaling optionally
            })
            
        # Sort by those closest to stockout
        data.sort(key=lambda x: x["current_stock"] - x["reorder_level"])
        return Response(data[:10])  # Return top 10 most critical or just first 10
