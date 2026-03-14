from datetime import timedelta
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ai_engine.models import AIInsight
from ai_engine.serializers import AIInsightSerializer
from inventory.models import Inventory


class AIInsightViewSet(viewsets.ModelViewSet):
    serializer_class = AIInsightSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not hasattr(user, "retailer_profile"):
            return AIInsight.objects.none()
        qs = AIInsight.objects.filter(retailer=user.retailer_profile).select_related("product", "product__category")
        insight_type = self.request.query_params.get("type")
        insight_status = self.request.query_params.get("status")
        if insight_type:
            qs = qs.filter(type=insight_type)
        if insight_status:
            qs = qs.filter(status=insight_status)
        return qs.order_by("-generated_at")

    @action(detail=False, methods=["post"])
    def generate_mock_insights(self, request):
        """
        Mock endpoint to generate AI insights based on advanced heuristics.
        Includes Low Stock, velocity detection, and seasonal trends.
        """
        user = request.user
        if not hasattr(user, "retailer_profile"):
            return Response({"error": "Only retailers can generate insights"}, status=status.HTTP_403_FORBIDDEN)

        retailer = user.retailer_profile
        inventories = Inventory.objects.filter(retailer=retailer).select_related("product", "product__category")
        
        insights_created = 0
        now = timezone.now()
        current_month = now.month

        # Seasonal mapping (Category Name -> Months)
        seasonal_trends = {
            "Beverages": [3, 4, 5, 6, 10, 11, 12],
            "Snacks": [1, 2, 10, 11, 12],
            "Ice Creams": [3, 4, 5, 6],
            "Personal Care": [1, 5, 12],
        }

        for inv in inventories:
            # 1. Low Stock Alert
            if 0 < inv.current_stock <= inv.reorder_level:
                exists = AIInsight.objects.filter(
                    retailer=retailer, 
                    product=inv.product,
                    type=AIInsight.InsightType.LOW_STOCK,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN]
                ).exists()

                if not exists:
                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.LOW_STOCK,
                        title=f"Restock Alert: {inv.product.name}",
                        description=f"Your stock for {inv.product.name} is low ({inv.current_stock} units). Based on current sales velocity, you will run out in {int(inv.current_stock / (inv.avg_daily_sales or 1))} days.",
                        generated_at=now,
                        recommendation_json={"suggested_quantity": float(inv.reorder_quantity_suggestion or 50)}
                    )
                    insights_created += 1

            # 2. Velocity Detection (Fast Selling)
            if inv.avg_daily_sales > 10:
                exists = AIInsight.objects.filter(
                    retailer=retailer,
                    product=inv.product,
                    type=AIInsight.InsightType.DEMAND_INCREASE,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN]
                ).exists()
                
                if not exists:
                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.DEMAND_INCREASE,
                        title=f"Fast Seller: {inv.product.name}",
                        description=f"{inv.product.name} is selling significantly faster than average ({inv.avg_daily_sales} units/day). Consider increasing your baseline stock.",
                        generated_at=now,
                    )
                    insights_created += 1

            # 3. Seasonal Trend
            category_name = inv.product.category.name
            if current_month in seasonal_trends.get(category_name, []):
                exists = AIInsight.objects.filter(
                    retailer=retailer,
                    product=inv.product,
                    type=AIInsight.InsightType.SEASONAL,
                    status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN]
                ).exists()

                if not exists:
                    AIInsight.objects.create(
                        retailer=retailer,
                        product=inv.product,
                        type=AIInsight.InsightType.SEASONAL,
                        title=f"Seasonal Peak: {inv.product.name}",
                        description=f"Demand for {category_name} typically spikes this season. We recommend stocking an additional 30% for {inv.product.name}.",
                        generated_at=now,
                    )
                    insights_created += 1

        # 4. Trending in Marketplace (Suggest products not in inventory)
        from catalog.models import Product
        existing_product_ids = inventories.values_list("product_id", flat=True)
        trending_products = Product.objects.exclude(id__in=existing_product_ids)[:2] # Suggest up to 2 new ones
        
        for tp in trending_products:
            exists = AIInsight.objects.filter(
                retailer=retailer,
                product=tp,
                type=AIInsight.InsightType.PROFIT_OPTIMIZATION,
                status__in=[AIInsight.Status.NEW, AIInsight.Status.SEEN]
            ).exists()

            if not exists:
                AIInsight.objects.create(
                    retailer=retailer,
                    product=tp,
                    type=AIInsight.InsightType.PROFIT_OPTIMIZATION,
                    title=f"Trending: {tp.name}",
                    description=f"{tp.name} is trending in the marketplace for your area. Retailers who stock this see a 15% revenue lift.",
                    generated_at=now,
                )
                insights_created += 1

        return Response({"message": f"Generated {insights_created} new insights for {retailer.business_name}."})
