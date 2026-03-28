from rest_framework import serializers

from ai_engine.models import AIInsight
from catalog.serializers import ProductSerializer


class AIInsightSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = AIInsight
        fields = [
            "id",
            "type",
            "title",
            "description",
            "status",
            "generated_at",
            "product_name",
        ]

    def to_representation(self, instance):
        # Base representation from ModelSerializer
        ret = super().to_representation(instance)
        
        # Format "product" as just the name to match the requested JSON format
        ret['product'] = ret.pop('product_name', None)
        
        # Flatten recommendation_json fields into the main dictionary
        if instance.recommendation_json and isinstance(instance.recommendation_json, dict):
            for key, value in instance.recommendation_json.items():
                if key not in ret:  # don't overwrite primary fields if they exist
                    ret[key] = value
                    
        return ret
