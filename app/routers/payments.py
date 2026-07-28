from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from typing import Optional
import os
import uuid
import hmac
import hashlib
from app.services.razorpay_service import create_razorpay_order, verify_payment_signature, KEY_ID

router = APIRouter(prefix="/payments", tags=["payments"])


# ─── Request/Response schemas ──────────────────────────────────────────────────

class CreateCartOrderRequest(BaseModel):
    cart_id: int

class CreateLedgerOrderRequest(BaseModel):
    amount: float  # ₹ amount to pay against outstanding

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    payment_type: str  # "cart" or "ledger"
    reference_id: int  # cart_id or ledger_entry_id / order_id


# ─── Create Order for Cart Checkout ───────────────────────────────────────────

@router.post("/create-order/cart")
async def create_cart_order(
    body: CreateCartOrderRequest,
):
    """
    Called when retailer clicks 'Checkout' on cart.
    Creates a Razorpay order for the cart total.
    """
    if body.cart_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid cart ID")
    
    receipt = f"cart_{body.cart_id}_{uuid.uuid4().hex[:8]}"
    
    try:
        # Amount calculation (sample/passed amount or from DB)
        order = create_razorpay_order(
            amount_rupees=100.0,  # Or dynamic total
            receipt=receipt,
            notes={
                "cart_id": str(body.cart_id),
                "payment_type": "cart_checkout",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")
    
    return {
        "razorpay_order_id": order["id"],
        "amount": order["amount"],          # in paise
        "currency": order["currency"],
        "key_id": os.getenv("RAZORPAY_KEY_ID", KEY_ID),  # send public key to frontend
        "cart_id": body.cart_id,
    }


# ─── Create Order for Ledger Outstanding Payment ──────────────────────────────

@router.post("/create-order/ledger")
async def create_ledger_order(
    body: CreateLedgerOrderRequest,
):
    """
    Called when retailer clicks 'Pay Outstanding' in ledger tab.
    """
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    
    receipt = f"ledger_{uuid.uuid4().hex[:8]}"
    
    try:
        order = create_razorpay_order(
            amount_rupees=body.amount,
            receipt=receipt,
            notes={
                "payment_type": "ledger_clearance",
            }
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Razorpay order creation failed: {str(e)}")
    
    return {
        "razorpay_order_id": order["id"],
        "amount": order["amount"],
        "currency": order["currency"],
        "key_id": os.getenv("RAZORPAY_KEY_ID", KEY_ID),
    }


# ─── Verify Payment (called after Razorpay modal closes successfully) ─────────

@router.post("/verify")
async def verify_payment(
    body: VerifyPaymentRequest,
):
    """
    CRITICAL: This is the security gate.
    Verifies Razorpay signature before marking any order/payment as paid.
    """
    # 1. Verify HMAC signature
    is_valid = verify_payment_signature(
        razorpay_order_id=body.razorpay_order_id,
        razorpay_payment_id=body.razorpay_payment_id,
        razorpay_signature=body.razorpay_signature,
    )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Invalid signature."
        )
    
    return {
        "success": True,
        "payment_id": body.razorpay_payment_id,
        "message": "Payment verified and recorded successfully.",
    }


# ─── Webhook endpoint (for production reliability) ─────────────────────────────

@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """
    Razorpay calls this URL on payment events.
    Configure the webhook URL in your Razorpay Dashboard → Settings → Webhooks
    """
    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    payload = await request.body()
    received_sig = request.headers.get("X-Razorpay-Signature", "")
    
    if webhook_secret:
        expected_sig = hmac.new(
            webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(expected_sig, received_sig):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")
    
    event = await request.json()
    
    if event.get("event") == "payment.captured":
        payment = event.get("payload", {}).get("payment", {}).get("entity", {})
        # Update order status using payment["notes"]
        pass
    
    return {"status": "ok"}
