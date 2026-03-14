from rest_framework import serializers

from ai_engine.models import AIInsight
from catalog.serializers import ProductSerializer


class AIInsightSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = AIInsight
        fields = [
            "id",
            "product",
            "type",
            "title",
            "description",
            "recommendation_json",
            "status",
            "generated_at",
        ]

