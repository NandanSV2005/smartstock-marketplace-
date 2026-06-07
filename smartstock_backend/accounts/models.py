from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        RETAILER = "retailer", "Retailer"
        WHOLESALER = "wholesaler", "Wholesaler"
        ADMIN = "admin", "Admin"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.RETAILER,
    )


class Retailer(models.Model):
    class BusinessType(models.TextChoices):
        KIRANA = "kirana", "Kirana Store"
        SUPERMARKET = "supermarket", "Small Supermarket"
        RESTAURANT = "restaurant", "Restaurant"
        CAFE = "cafe", "Cafe"
        BAKERY = "bakery", "Bakery"
        HOTEL = "hotel", "Small Hotel"
        OTHER = "other", "Other"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="retailer_profile")
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=30, choices=BusinessType.choices, default=BusinessType.KIRANA)
    gst_number = models.CharField(max_length=32, blank=True, null=True)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    lat = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    preferred_delivery_window_start = models.TimeField(blank=True, null=True)
    preferred_delivery_window_end = models.TimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.business_name


class Wholesaler(models.Model):
    class BusinessType(models.TextChoices):
        FMCG = "fmcg", "FMCG Distributor"
        GROCERY = "grocery", "Grocery Wholesaler"
        BEVERAGE = "beverage", "Beverage Distributor"
        FOOD_SUPPLIER = "food_supplier", "Food Supplier"
        OTHER = "other", "Other"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="wholesaler_profile")
    business_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=30, choices=BusinessType.choices, default=BusinessType.FMCG)
    gst_number = models.CharField(max_length=32, blank=True, null=True)
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    lat = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    delivery_radius_km = models.PositiveIntegerField(default=10)
    min_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    is_approved = models.BooleanField(default=False)

    def __str__(self) -> str:
        return self.business_name
