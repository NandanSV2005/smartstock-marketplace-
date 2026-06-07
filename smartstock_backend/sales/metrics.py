"""
Sales Metrics Utility
Calculates avg_daily_sales for each inventory item from real SaleItem data.
Called automatically after every Sale creation and via management command.
"""
from decimal import Decimal
from django.utils import timezone
from django.db.models import Sum


def recalculate_avg_daily_sales(retailer, product_id=None):
    """
    Recalculates avg_daily_sales for all (or a specific) inventory item
    belonging to a retailer, based on the last 30 days of SaleItem data.

    Args:
        retailer: Retailer profile instance
        product_id: Optional int; if given, recalculate only for that product
    """
    from sales.models import SaleItem
    from inventory.models import Inventory

    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

    # Get inventory queryset to update
    inv_qs = Inventory.objects.filter(retailer=retailer)
    if product_id:
        inv_qs = inv_qs.filter(product_id=product_id)

    for inv in inv_qs.select_related('product'):
        # Sum all quantity sold for this retailer+product in last 30 days
        result = SaleItem.objects.filter(
            sale__retailer=retailer,
            product=inv.product,
            sale__sale_date__gte=thirty_days_ago
        ).aggregate(total=Sum('quantity_sold'))

        total_qty = result['total'] or Decimal('0')
        avg = total_qty / Decimal('30')

        # Only update if different (avoid unnecessary DB writes)
        if inv.avg_daily_sales != avg:
            inv.avg_daily_sales = avg
            inv.save(update_fields=['avg_daily_sales'])


def get_days_to_stockout(current_stock, avg_daily_sales):
    """
    Returns days before stockout, or None if no sales velocity data.
    """
    avg = Decimal(str(avg_daily_sales))
    stock = Decimal(str(current_stock))
    if avg <= 0:
        return None
    return float(stock / avg)


def get_suggested_reorder_quantity(avg_daily_sales, days_to_stockout, threshold_days=5):
    """
    If stockout is within threshold_days, suggest 10 days worth of stock.
    Returns 0 if no reorder needed.
    """
    if days_to_stockout is None:
        return 0
    if days_to_stockout <= threshold_days:
        return float(Decimal(str(avg_daily_sales)) * 10)
    return 0
