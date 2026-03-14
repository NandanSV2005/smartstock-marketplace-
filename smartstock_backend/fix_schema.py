import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartstock_backend.settings')
django.setup()

def fix_schema():
    with connection.cursor() as cursor:
        try:
            cursor.execute("ALTER TABLE payments_payment ADD COLUMN total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0")
            print("Added total_amount")
        except Exception as e:
            print(f"total_amount: {e}")
            
        try:
            cursor.execute("ALTER TABLE payments_payment ADD COLUMN payment_date DATETIME(6) NOT NULL")
            print("Added payment_date")
        except Exception as e:
            print(f"payment_date: {e}")

if __name__ == "__main__":
    fix_schema()
