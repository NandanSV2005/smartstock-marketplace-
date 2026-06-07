"""
Credit Intelligence Service
Calculates credit score for a retailer based on their payment history.
"""
from decimal import Decimal
from django.utils import timezone


BASE_CREDIT_LIMIT = Decimal('50000.00')


def calculate_credit_score(retailer):
    """
    Computes a credit score (0-100) for a retailer based on their payment history.

    Scoring logic:
    - Start at 100
    - -10 for each payment that is OVERDUE or was paid after due_date
    - +2 for each payment that was paid before due_date (early payment)
    - Clamped to [0, 100]

    Returns a dict with: credit_score, risk_level, credit_limit_suggestion, overdue_count, total_credit_used
    """
    from payments.models import Payment, RetailerCreditProfile

    payments = Payment.objects.filter(order__retailer=retailer).select_related('order')

    score = 100
    overdue_count = 0
    total_credit_used = Decimal('0')
    today = timezone.now().date()

    for payment in payments:
        # Accumulate credit exposure
        if payment.amount_due > 0:
            total_credit_used += payment.amount_due

        # Penalize overdue payments
        if payment.status == Payment.Status.OVERDUE:
            score -= 10
            overdue_count += 1
        elif (
            payment.due_date
            and payment.status == Payment.Status.PAID
            and payment.payment_date.date() > payment.due_date
        ):
            # Paid late
            score -= 10
            overdue_count += 1
        elif (
            payment.due_date
            and payment.status == Payment.Status.PAID
            and payment.payment_date.date() <= payment.due_date
        ):
            # Paid on time or early
            score += 2

    # Clamp to 0-100
    score = max(0, min(100, score))

    # Determine risk level
    if score >= 80:
        risk_level = 'low'
    elif score >= 50:
        risk_level = 'medium'
    else:
        risk_level = 'high'

    # Suggest credit limit
    credit_limit_suggestion = BASE_CREDIT_LIMIT * (Decimal(str(score)) / Decimal('100'))

    # Persist/update credit profile
    profile, _ = RetailerCreditProfile.objects.update_or_create(
        retailer=retailer,
        defaults={
            'credit_score': score,
            'total_credit_used': total_credit_used,
            'overdue_count': overdue_count,
        }
    )

    return {
        'credit_score': score,
        'risk_level': risk_level,
        'credit_limit_suggestion': float(credit_limit_suggestion),
        'overdue_count': overdue_count,
        'total_credit_used': float(total_credit_used),
    }
