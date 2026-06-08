import os
import django
from decimal import Decimal
from django.utils import timezone
import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartstock_backend.settings')
django.setup()

from accounts.models import Retailer, User, Wholesaler
from catalog.models import Category, Product, WholesalerProduct
from inventory.models import Inventory
from ai_engine.models import AIInsight, SalesHistory
from sales.models import Sale, SaleItem
from payments.models import RetailerCreditProfile, Payment
from notifications.models import Notification
from orders.models import Order, OrderItem

def seed():
    print("Clearing database...")
    # Delete existing data in reverse order of foreign keys
    Notification.objects.all().delete()
    OrderItem.objects.all().delete()
    Order.objects.all().delete()
    Payment.objects.all().delete()
    RetailerCreditProfile.objects.all().delete()
    SaleItem.objects.all().delete()
    Sale.objects.all().delete()
    AIInsight.objects.all().delete()
    SalesHistory.objects.all().delete()
    Inventory.objects.all().delete()
    WholesalerProduct.objects.all().delete()
    Product.objects.all().delete()
    Category.objects.all().delete()

    # Clean seed users
    User.objects.filter(username__in=['nandansv512@gmail.com', 'wholesaler@smartstock.com']).delete()

    print("Seeding categories...")
    beverages = Category.objects.create(name="Beverages", slug="beverages")
    snacks = Category.objects.create(name="Snacks & Packaged Foods", slug="snacks-packaged-foods")
    personal_care = Category.objects.create(name="Personal Care", slug="personal-care")
    household = Category.objects.create(name="Household & Cleaning", slug="household-cleaning")
    dairy = Category.objects.create(name="Dairy & Eggs", slug="dairy-eggs")
    staples = Category.objects.create(name="Staples & Groceries", slug="staples-groceries")

    print("Seeding products...")
    p1 = Product.objects.create(name="Coca-Cola 330ml Can", brand="Coca-Cola", category=beverages, unit="Can", pack_size="1 Can")
    p2 = Product.objects.create(name="Pepsi 330ml Can", brand="Pepsi", category=beverages, unit="Can", pack_size="1 Can")
    p3 = Product.objects.create(name="Lays Potato Chips Classic 50g", brand="Lays", category=snacks, unit="Pack", pack_size="1 Pack")
    p4 = Product.objects.create(name="Oreo Biscuits 120g", brand="Oreo", category=snacks, unit="Pack", pack_size="1 Pack")
    p5 = Product.objects.create(name="Colgate Toothpaste 100g", brand="Colgate", category=personal_care, unit="Tube", pack_size="1 Tube")
    p6 = Product.objects.create(name="Dettol Liquid Handwash 200ml", brand="Dettol", category=personal_care, unit="Bottle", pack_size="1 Bottle")
    p7 = Product.objects.create(name="Surf Excel Detergent Powder 1kg", brand="Surf Excel", category=household, unit="Pack", pack_size="1 Pack")
    p8 = Product.objects.create(name="Vim Dishwash Liquid 500ml", brand="Vim", category=household, unit="Bottle", pack_size="1 Bottle")
    p9 = Product.objects.create(name="Amul Butter 100g", brand="Amul", category=dairy, unit="Block", pack_size="1 Block")
    p10 = Product.objects.create(name="Britannia Cheese Slices 200g", brand="Britannia", category=dairy, unit="Pack", pack_size="1 Pack")

    print("Creating Retailer User: nandansv512@gmail.com")
    retailer_user = User.objects.create(
        username="nandansv512@gmail.com",
        email="nandansv512@gmail.com",
        first_name="Nandan",
        last_name="SV",
        role=User.Role.RETAILER
    )
    retailer_user.set_password("password123")
    retailer_user.save()

    retailer_profile = Retailer.objects.create(
        user=retailer_user,
        business_name="Nandan Kirana Store",
        business_type=Retailer.BusinessType.KIRANA,
        address_line1="123 Main Road, Jayanagar",
        city="Bangalore",
        state="Karnataka",
        pincode="560041"
    )

    # Initialize Retailer Credit Profile
    RetailerCreditProfile.objects.create(
        retailer=retailer_profile,
        credit_score=85,
        total_credit_used=Decimal("12500.00"),
        overdue_count=0
    )

    print("Creating Wholesaler User: wholesaler@smartstock.com")
    wholesaler_user = User.objects.create(
        username="wholesaler@smartstock.com",
        email="wholesaler@smartstock.com",
        first_name="Main",
        last_name="Distributor",
        role=User.Role.WHOLESALER
    )
    wholesaler_user.set_password("password123")
    wholesaler_user.save()

    wholesaler_profile = Wholesaler.objects.create(
        user=wholesaler_user,
        business_name="Metro Cash & Carry B2B",
        business_type=Wholesaler.BusinessType.GROCERY,
        address_line1="456 Outer Ring Road, Yeshwanthpur",
        city="Bangalore",
        state="Karnataka",
        pincode="560022",
        is_approved=True
    )

    print("Mapping Products to Wholesaler (WholesalerProduct Offerings)...")
    wp1 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p1, wholesale_price=Decimal("25.00"), mrp=Decimal("40.00"), available_stock=1000, min_order_qty=24)
    wp2 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p2, wholesale_price=Decimal("24.00"), mrp=Decimal("40.00"), available_stock=1200, min_order_qty=24)
    wp3 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p3, wholesale_price=Decimal("15.00"), mrp=Decimal("20.00"), available_stock=800, min_order_qty=10)
    wp4 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p4, wholesale_price=Decimal("28.00"), mrp=Decimal("35.00"), available_stock=600, min_order_qty=12)
    wp5 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p5, wholesale_price=Decimal("45.00"), mrp=Decimal("60.00"), available_stock=500, min_order_qty=5)
    wp6 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p6, wholesale_price=Decimal("80.00"), mrp=Decimal("105.00"), available_stock=400, min_order_qty=5)
    wp7 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p7, wholesale_price=Decimal("120.00"), mrp=Decimal("150.00"), available_stock=300, min_order_qty=2)
    wp8 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p8, wholesale_price=Decimal("40.00"), mrp=Decimal("55.00"), available_stock=600, min_order_qty=5)
    wp9 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p9, wholesale_price=Decimal("46.00"), mrp=Decimal("58.00"), available_stock=200, min_order_qty=10)
    wp10 = WholesalerProduct.objects.create(wholesaler=wholesaler_profile, product=p10, wholesale_price=Decimal("110.00"), mrp=Decimal("140.00"), available_stock=150, min_order_qty=5)

    print("Mapping Products to Retailer's Inventory...")
    inv1 = Inventory.objects.create(retailer=retailer_profile, product=p1, current_stock=Decimal("12.00"), reorder_level=Decimal("24.00"), avg_daily_sales=Decimal("2.50"))
    inv2 = Inventory.objects.create(retailer=retailer_profile, product=p3, current_stock=Decimal("5.00"), reorder_level=Decimal("15.00"), avg_daily_sales=Decimal("1.80"))
    inv3 = Inventory.objects.create(retailer=retailer_profile, product=p4, current_stock=Decimal("40.00"), reorder_level=Decimal("20.00"), avg_daily_sales=Decimal("1.20"))
    inv4 = Inventory.objects.create(retailer=retailer_profile, product=p5, current_stock=Decimal("2.00"), reorder_level=Decimal("10.00"), avg_daily_sales=Decimal("0.80"))
    inv5 = Inventory.objects.create(retailer=retailer_profile, product=p9, current_stock=Decimal("18.00"), reorder_level=Decimal("10.00"), avg_daily_sales=Decimal("1.50"))

    print("Creating Sales History & Sales Trends...")
    today = timezone.now()
    for i in range(30):
        sale_date = today - datetime.timedelta(days=i)
        sale = Sale.objects.create(
            retailer=retailer_profile,
            invoice_number=f"INV-{20260000 + i}",
            total_items=Decimal("5.00"),
            total_amount=Decimal("150.00")
        )
        # sale_date is auto_now_add so we use update() to backdate it
        Sale.objects.filter(id=sale.id).update(sale_date=sale_date)

        SaleItem.objects.create(sale=sale, product=p1, quantity_sold=Decimal("2.00"), unit_price=Decimal("40.00"), line_total=Decimal("80.00"))
        SaleItem.objects.create(sale=sale, product=p3, quantity_sold=Decimal("3.00"), unit_price=Decimal("20.00"), line_total=Decimal("60.00"))

        # Seed SalesHistory records (used by AI engine)
        SalesHistory.objects.get_or_create(
            retailer=retailer_profile,
            product=p1,
            date=sale_date.date(),
            defaults={"units_sold": Decimal("2.00"), "revenue": Decimal("80.00")}
        )
        SalesHistory.objects.get_or_create(
            retailer=retailer_profile,
            product=p3,
            date=sale_date.date(),
            defaults={"units_sold": Decimal("3.00"), "revenue": Decimal("60.00")}
        )

    print("Creating Orders & Payments...")
    order1 = Order.objects.create(
        order_number="ORD-10001",
        retailer=retailer_profile,
        wholesaler=wholesaler_profile,
        status=Order.Status.DELIVERED,
        total_amount=Decimal("2500.00"),
        payment_status=Order.PaymentStatus.PAID,
        payment_method=Order.PaymentMethod.PAY_NOW,
        amount_paid=Decimal("2500.00"),
        amount_due=Decimal("0.00"),
        delivery_address="123 Main Road, Jayanagar",
        expected_delivery_date=today.date() - datetime.timedelta(days=5),
        delivered_at=today - datetime.timedelta(days=5)
    )
    OrderItem.objects.create(order=order1, wholesaler_product=wp1, product=p1, quantity=100, unit_price=Decimal("25.00"), line_total=Decimal("2500.00"))
    Payment.objects.create(
        order=order1,
        payment_method=Payment.Method.PAY_NOW,
        total_amount=Decimal("2500.00"),
        amount_paid=Decimal("2500.00"),
        amount_due=Decimal("0.00"),
        status=Payment.Status.PAID,
        transaction_id="TXN-982347"
    )

    order2 = Order.objects.create(
        order_number="ORD-10002",
        retailer=retailer_profile,
        wholesaler=wholesaler_profile,
        status=Order.Status.DELIVERED,
        total_amount=Decimal("12480.00"),
        payment_status=Order.PaymentStatus.CREDIT,
        payment_method=Order.PaymentMethod.CREDIT,
        amount_paid=Decimal("0.00"),
        amount_due=Decimal("12480.00"),
        delivery_address="123 Main Road, Jayanagar",
        expected_delivery_date=today.date() - datetime.timedelta(days=2),
        due_date=today.date() + datetime.timedelta(days=15),
        delivered_at=today - datetime.timedelta(days=2)
    )
    OrderItem.objects.create(order=order2, wholesaler_product=wp7, product=p7, quantity=50, unit_price=Decimal("120.00"), line_total=Decimal("6000.00"))
    OrderItem.objects.create(order=order2, wholesaler_product=wp10, product=p10, quantity=50, unit_price=Decimal("110.00"), line_total=Decimal("5500.00"))
    OrderItem.objects.create(order=order2, wholesaler_product=wp4, product=p4, quantity=35, unit_price=Decimal("28.00"), line_total=Decimal("980.00"))
    
    Payment.objects.create(
        order=order2,
        payment_method=Payment.Method.CREDIT,
        total_amount=Decimal("12480.00"),
        amount_paid=Decimal("0.00"),
        amount_due=Decimal("12480.00"),
        status=Payment.Status.CREDIT,
        due_date=today.date() + datetime.timedelta(days=15)
    )

    order3 = Order.objects.create(
        order_number="ORD-10003",
        retailer=retailer_profile,
        wholesaler=wholesaler_profile,
        status=Order.Status.PENDING,
        total_amount=Decimal("1200.00"),
        payment_status=Order.PaymentStatus.PENDING,
        delivery_address="123 Main Road, Jayanagar",
        expected_delivery_date=today.date() + datetime.timedelta(days=2)
    )
    OrderItem.objects.create(order=order3, wholesaler_product=wp3, product=p3, quantity=80, unit_price=Decimal("15.00"), line_total=Decimal("1200.00"))

    print("Creating AI Insights...")
    AIInsight.objects.create(
        retailer=retailer_profile,
        product=p1,
        type=AIInsight.InsightType.LOW_STOCK,
        title="Low Stock Alert: Coca-Cola 330ml Can",
        description="Coca-Cola 330ml Can is running low (12 Cans remaining). Current sales velocity suggests stockout in 4.8 days. Recommended reorder quantity: 24 Cans.",
        recommendation_json={
            "suggested_reorder_qty": 24,
            "wholesaler_product_id": wp1.id,
            "wholesaler_name": "Metro Cash & Carry B2B",
            "price": 25.00
        },
        status=AIInsight.Status.NEW,
        generated_at=today
    )

    AIInsight.objects.create(
        retailer=retailer_profile,
        product=p9,
        type=AIInsight.InsightType.SLOW_MOVING,
        title="Slow-Moving Inventory: Amul Butter 100g",
        description="Amul Butter 100g has 18 Blocks remaining with low sales velocity (average 0.05 per day). We recommend running a bundle promotion to free up working capital.",
        recommendation_json={
            "promotion_suggestion": "Bundle with Britannia Cheese Slices"
        },
        status=AIInsight.Status.NEW,
        generated_at=today
    )

    print("Creating Notifications...")
    Notification.objects.create(
        user=retailer_user,
        type=Notification.Type.LOW_STOCK,
        title="Low Stock Warning",
        body="Coca-Cola 330ml Can has dropped below reorder level.",
        metadata_json={"product_id": p1.id}
    )
    Notification.objects.create(
        user=retailer_user,
        type=Notification.Type.ORDER_UPDATE,
        title="Order Dispatched",
        body="Your order ORD-10002 has been dispatched by Metro Cash & Carry B2B.",
        metadata_json={"order_id": order2.id}
    )

    print("Database seeding completed successfully!")

if __name__ == '__main__':
    seed()
