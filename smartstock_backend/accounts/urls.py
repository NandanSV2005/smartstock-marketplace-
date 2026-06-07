from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    CustomTokenObtainPairView,
    MeView,
    RetailerRegisterView,
    WholesalerRegisterView,
)

urlpatterns = [
    path("register/retailer/", RetailerRegisterView.as_view(), name="register-retailer"),
    path("register/wholesaler/", WholesalerRegisterView.as_view(), name="register-wholesaler"),
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
]


