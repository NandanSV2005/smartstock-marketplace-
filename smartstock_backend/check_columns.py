import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smartstock_backend.settings')
django.setup()

def check_columns():
    with connection.cursor() as cursor:
        cursor.execute("DESCRIBE payments_payment")
        columns = cursor.fetchall()
        for col in columns:
            print(col[0])

if __name__ == "__main__":
    check_columns()
