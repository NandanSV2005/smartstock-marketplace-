"""
AI Engine Views — Data-Driven Insights
Upgraded to use real sales data from SaleItem rather than static avg_daily_sales.
Phase 2: realtime_insights now includes supplier recommendation + action block.
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ai_engine.models import AIInsight
from ai_engine.serializers import AIInsightSerializer
from inventory.models import Inventory
from sales.metrics import (
    recalculate_avg_daily_sales,
    get_days_to_stockout,
    get_suggested_reorder_quantity,
)


# === Helpers ================================================================

def _compute_metrics_for_inventory(inv, retailer):
    """
    Dynamically computes avg_daily_sales, days_to_stockout, and reorder qty
    directly from SaleItem records for a single Inventory row.
    Returns a dict of computed metrics.
    """
    from sales.models import SaleItem

    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
    result = SaleItem.objects.filter(
        sale__retailer=retailer,
        product=inv.product,
        sale__sale_date__gte=thirty_days_ago,
    ).aggregate(total=Sum('quantity_sold'))

    total_qty = result['total'] or Decimal('0')
    avg = total_qty / Decimal('30')

    days_to_stockout = get_days_to_stockout(inv.current_stock, avg)
    suggested_qty = get_suggested_reorder_quantity(avg, days_to_stockout)

    return {
        'avg_daily_sales': avg,
        'days_to_stockout': days_to_stockout,
        'suggested_reorder_quantity': suggested_qty,
    }


def _find_best_supplier(product):
    """
    Finds the best available wholesaler for a given product.
    Strategy: lowest wholesale_price among active WholesalerProduct listings
    that have available stock > 0.
    Returns a dict or None.
    """
    from catalog.models import WholesalerProduct

    best = (
        WholesalerProduct.objects
        .filter(product=product, status='active', available_stock__gt=0)
        .select_related('wholesaler')
        .order_by('wholesale_price')
        .first()
    )
    if not best:
        return None

    return {
        'wholesaler_product_id': best.id,
        'supplier_id': best.wholesaler.id,
        'supplier_name': best.wholesaler.business_name,
        'price': float(best.wholesale_price),
    }


# === ViewSet ================================================================

class AIInsightViewSet(viewsets.ModelViewSet):
    serializer_class = AIInsightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, 'retailer_profile'):
            return AIInsight.objects.none()
        qs = AIInsight.objects.filter(
            retailer=user.retailer_profile
        ).select_related('product', 'product__category')
        insight_type = self.request.query_params.get('type')
        insight_status = self.request.query_params.get('status')
        if insight_type:
            qs = qs.filter(type=insight_type)
        if insight_status:
            qs = qs.filter(status=insight_status)
        return qs.order_by('-generated_at')

    # --- New endpoint: data-driven real-time insights -----------------------

    @action(detail=False, methods=['get'], url_path='realtime')
    def realtime_insights(self, request):
        """
        Returns a live, data-driven stockout and reorder analysis for every
        inventory item — no stale DB records, always fresh.
        Phase 2: Includes supplier recommendation + action block for
        one-click reordering from the frontend.
        """
        user = request.user
        if not hasattr(user, 'retailer_profile'):
            return Response({'error': 'Only retailers can access insights'}, status=status.HTTP_403_FORBIDDEN)

        retailer = user.retailer_profile
        inventories = Inventory.objects.filter(retailer=retailer).select_related(
            'product', 'product__category'
        )

        insights = []
        for inv in inventories:
            metrics = _compute_metrics_for_inventory(inv, retailer)
            days = metrics['days_to_stockout']
            avg = metrics['avg_daily_sales']
            suggest = metrics['suggested_reorder_quantity']

            # Determine urgency
            if days is None:
                alert_level = 'no_data'
                message = f"No sales recorded in the last 30 days for {inv.product.name}."
            elif days <= 3:
                alert_level = 'critical'
                message = (
                    f"Stock will run out in {days:.1f} days. "
                    f"Recommended reorder: {suggest:.0f} units."
                )
            elif days <= 7:
                alert_level = 'warning'
                message = (
                    f"Stock will last approximately {days:.1f} days. "
                    f"Consider reordering {suggest:.0f} units soon."
                )
            elif float(inv.current_stock) <= float(inv.reorder_level) and inv.reorder_level > 0:
                alert_level = 'low_stock'
                message = (
                    f"Stock is below reorder level ({inv.reorder_level} units). "
                    f"Current: {inv.current_stock} units."
                )
            else:
                alert_level = 'ok'
                message = (
                    f"Stock is healthy ({inv.current_stock} units, "
                    f"{days:.1f} days remaining at current sales rate)."
                )

            reorder_qty = int(round(suggest, 0)) if suggest else 0

            insight_data = {
                'product': inv.product.name,
                'product_id': inv.product.id,
                'current_stock': float(inv.current_stock),
                'reorder_level': float(inv.reorder_level),
                'avg_daily_sales': round(float(avg), 2),
                'days_to_stockout': round(days, 1) if days is not None else None,
                'suggested_reorder_quantity': reorder_qty,
                'alert_level': alert_level,
                'message': message,
                'action': None,
            }

            # Supplier recommendation — only for actionable alerts with reorder qty
            if reorder_qty > 0 and alert_level in ('critical', 'warning', 'low_stock'):
                best_supplier = _find_best_supplier(inv.product)
                if best_supplier:
                    insight_data['action'] = {
                        'type': 'add_to_cart',
                        'wholesaler_product_id': best_supplier['wholesaler_product_id'],
                        'supplier_id': best_supplier['supplier_id'],
                        'supplier_name': best_supplier['supplier_name'],
                        'price': best_supplier['price'],
                        'quantity': reorder_qty,
                    }

            insights.append(insight_data)

        # Sort: critical first, then by days_to_stockout ascending
        insights.sort(key=lambda x: (
            {'critical': 0, 'warning': 1, 'low_stock': 2, 'ok': 3, 'no_data': 4}.get(x['alert_level'], 5),
            x['days_to_stockout'] if x['days_to_stockout'] is not None else 9999
        ))

        return Response(insights)

    # --- Upgraded generate_mock_insights (now data-driven) -----------------

    @action(detail=False, methods=['post'])
    def generate_mock_insights(self, request):
        """
        Generates persistent AIInsight records using REAL sales data.
        Replaces the old purely-heuristic version.
        """
        user = request.user
        if not hasattr(user, 'retailer_profile'):
            return Response({'error': 'Only retailers can generate insights'}, status=status.HTTP_403_FORBIDDEN)

        retailer = user.retailer_profile

        # First, refresh avg_daily_sales for all products
        recalculate_avg_daily_sales(retailer)

        inventories = Inventory.objects.filter(retailer=retailer).select_related(
            'product', 'product__category'
        )

        insights_created = 0
        now = timezone.now()
        current_month = now.month

        # Seasonal mapping (Category Name → peak months)
        seasonal_trends = {
            'Beverages': [3, 4, 5, 6, 10, 11, 12],
            'Snacks': [1, 2, 10, 11, 12],
            'Ice Creams': [3, 4, 5, 6],
            'Personal Care': [1, 5, 12],
        }

        for inv in inventories:
            metrics = _compute_metrics_for_inventory(inv, retailer)
            avg = metrics['avg_daily_sales']
            days = metrics['days_to_stockout']
            suggest = metrics['suggested_reorder_quantity']

            # 1. Critical Reorder / Low Stock (data-driven)
            is_low_stock = float(inv.current_stock) <= float(inv.reorder_level) and inv.reorder_level > 0
            is_imminent_stockout = days is not None and days <= 7

            if is_low_stock or is_imminent_stockout:
                exists = AIInsight.objects.filter(
                    retailer=retailer,
                    product=inv.product,
                    type=AIInsight.InsightType.LOW_STOCK,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN],
                ).exists()

                if not exists:
                    if days is not None:
                        desc = (
                            f"Your stock for {inv.product.name} is at {inv.current_stock} units. "
                            f"At your current sales rate of {float(avg):.1f} units/day, "
                            f"you will run out in {days:.1f} days."
                        )
                    else:
                        desc = (
                            f"Your stock for {inv.product.name} ({inv.current_stock} units) "
                            f"is below the reorder level of {inv.reorder_level} units."
                        )

                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.LOW_STOCK,
                        title=f"Restock Alert: {inv.product.name}",
                        description=desc,
                        generated_at=now,
                        recommendation_json={
                            'current_stock': float(inv.current_stock),
                            'avg_daily_sales': round(float(avg), 2),
                            'days_to_stockout': round(days, 1) if days is not None else None,
                            'suggested_reorder_quantity': suggest,
                        },
                    )
                    insights_created += 1

            # 2. Fast Seller — now uses real avg_daily_sales
            if avg > Decimal('5'):
                exists = AIInsight.objects.filter(
                    retailer=retailer,
                    product=inv.product,
                    type=AIInsight.InsightType.DEMAND_INCREASE,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN],
                ).exists()

                if not exists:
                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.DEMAND_INCREASE,
                        title=f"Fast Seller: {inv.product.name}",
                        description=(
                            f"{inv.product.name} is selling at {float(avg):.1f} units/day "
                            f"(based on last 30 days). Consider maintaining higher baseline stock."
                        ),
                        generated_at=now,
                        recommendation_json={
                            'avg_daily_sales': round(float(avg), 2),
                            'days_to_stockout': round(days, 1) if days is not None else None,
                        },
                    )
                    insights_created += 1

            # 3. Reorder Recommendation (explicit if days <= 5)
            if days is not None and days <= 5 and suggest > 0:
                exists = AIInsight.objects.filter(
                    retailer=retailer,
                    product=inv.product,
                    type=AIInsight.InsightType.REORDER_RECOMMENDATION,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN],
                ).exists()

                if not exists:
                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.REORDER_RECOMMENDATION,
                        title=f"Reorder Now: {inv.product.name}",
                        description=(
                            f"Stock will run out in {days:.1f} days. "
                            f"Recommended reorder quantity: {suggest:.0f} units."
                        ),
                        generated_at=now,
                        recommendation_json={
                            'type': 'reorder',
                            'product': inv.product.name,
                            'current_stock': float(inv.current_stock),
                            'avg_daily_sales': round(float(avg), 2),
                            'days_to_stockout': round(days, 1),
                            'suggested_reorder_quantity': suggest,
                            'message': (
                                f"Stock will run out in {days:.1f} days. "
                                f"Recommended reorder: {suggest:.0f} units."
                            ),
                        },
                    )
                    insights_created += 1

            # 4. Seasonal Trend (unchanged)
            category_name = inv.product.category.name if inv.product.category else ''
            if current_month in seasonal_trends.get(category_name, []):
                exists = AIInsight.objects.filter(
                    retailer=retailer,
                    product=inv.product,
                    type=AIInsight.InsightType.SEASONAL,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN],
                ).exists()

                if not exists:
                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.SEASONAL,
                        title=f"Seasonal Peak: {inv.product.name}",
                        description=(
                            f"Demand for {category_name} typically spikes this season. "
                            f"We recommend stocking an additional 30% for {inv.product.name}."
                        ),
                        generated_at=now,
                    )
                    insights_created += 1

        # 5. Trending Products (products not yet stocked)
        from catalog.models import Product
        existing_product_ids = inventories.values_list('product_id', flat=True)
        trending_products = Product.objects.exclude(id__in=existing_product_ids)[:2]

        for tp in trending_products:
            exists = AIInsight.objects.filter(
                retailer=retailer,
                product=tp,
                type=AIInsight.InsightType.PROFIT_OPTIMIZATION,
                status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN],
            ).exists()

            if not exists:
                AIInsight.objects.create(
                    retailer=retailer,
                    product=tp,
                    type=AIInsight.InsightType.PROFIT_OPTIMIZATION,
                    title=f"Trending: {tp.name}",
                    description=(
                        f"{tp.name} is trending in the marketplace. "
                        f"Retailers who stock this see a 15%+ revenue lift."
                    ),
                    generated_at=now,
                )
                insights_created += 1

        return Response({
            'message': f"Generated {insights_created} new insights for {retailer.business_name}.",
            'insights_created': insights_created,
        })
