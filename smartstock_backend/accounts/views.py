from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Retailer, Wholesaler
from accounts.serializers import (
    RetailerRegistrationSerializer,
    UserSerializer,
    WholesalerRegistrationSerializer,
)

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        if username and "@" in username:
            user = User.objects.filter(email__iexact=username.strip()).only("username").first()
            if user:
                attrs[self.username_field] = user.get_username()

        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RetailerRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = RetailerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class WholesalerRegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = WholesalerRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        data = UserSerializer(user).data

        retailer_profile = getattr(user, "retailer_profile", None)
        wholesaler_profile = getattr(user, "wholesaler_profile", None)

        if retailer_profile:
            data["retailer"] = {
                "id": retailer_profile.id,
                "business_name": retailer_profile.business_name,
                "business_type": retailer_profile.business_type,
                "city": retailer_profile.city,
                "state": retailer_profile.state,
            }
        if wholesaler_profile:
            data["wholesaler"] = {
                "id": wholesaler_profile.id,
                "business_name": wholesaler_profile.business_name,
                "business_type": wholesaler_profile.business_type,
                "city": wholesaler_profile.city,
                "state": wholesaler_profile.state,
                "is_approved": wholesaler_profile.is_approved,
            }

        return Response(data)
