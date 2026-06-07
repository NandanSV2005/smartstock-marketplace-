"""
Management Command: update_sales_metrics
Usage: python manage.py update_sales_metrics
Recalculates avg_daily_sales for ALL retailers and ALL products.
Safe to run repeatedly; idempotent.
"""
from django.core.management.base import BaseCommand
from accounts.models import Retailer
from sales.metrics import recalculate_avg_daily_sales


class Command(BaseCommand):
    help = 'Recalculates avg_daily_sales for all inventory items from real sales data (last 30 days).'

    def handle(self, *args, **options):
        retailers = Retailer.objects.all()
        total_retailers = retailers.count()
        self.stdout.write(f"Processing {total_retailers} retailer(s)...")

        for retailer in retailers:
            recalculate_avg_daily_sales(retailer)
            self.stdout.write(f"  ✓ Updated metrics for: {retailer.business_name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone. avg_daily_sales updated for all {total_retailers} retailer(s)."
        ))
