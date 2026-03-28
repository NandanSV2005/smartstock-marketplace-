"""
Django signals for the sales app.
Triggers avg_daily_sales recalculation after every Sale is created.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='sales.Sale')
def update_avg_daily_sales_on_sale(sender, instance, created, **kwargs):
    """
    After a Sale is saved, recalculate avg_daily_sales for all products
    involved in that sale.
    """
    if not created:
        return  # Only trigger on new sales, not updates

    from sales.metrics import recalculate_avg_daily_sales

    # Get distinct product IDs from this sale's items
    product_ids = instance.items.values_list('product_id', flat=True).distinct()

    for pid in product_ids:
        recalculate_avg_daily_sales(retailer=instance.retailer, product_id=pid)
