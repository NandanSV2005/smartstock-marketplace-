import { useState } from 'react';
import { useAuth } from '../AuthContext';
import type { RazorpayOptions } from '../types/razorpay';
import {
  createCartPaymentOrder,
  createLedgerPaymentOrder,
  verifyPayment,
} from '../api';



interface UseRazorpayOptions {
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function useRazorpay({ onSuccess, onFailure }: UseRazorpayOptions = {}) {
  const { accessToken, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openCheckout = (orderData: {
    razorpay_order_id: string;
    amount: number;
    currency: string;
    key_id: string;
    payment_type: 'cart' | 'ledger';
    reference_id: number;
    description?: string;
  }) => {
    if (typeof window.Razorpay === 'undefined') {
      const errMsg = 'Razorpay SDK is not loaded. Please verify script tag inclusion.';
      setError(errMsg);
      setLoading(false);
      onFailure?.(errMsg);
      return;
    }

    const options: RazorpayOptions = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'SmartStock',
      description: orderData.description || 'B2B Marketplace Payment',
      order_id: orderData.razorpay_order_id,
      prefill: {
        name: user?.username || '',
        email: user?.email || '',
      },
      theme: {
        color: '#6366f1',   // Primary brand color
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          onFailure?.('Payment cancelled by user');
        },
      },
      handler: async (response) => {
        try {
          const result = await verifyPayment(accessToken!, {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            payment_type: orderData.payment_type,
            reference_id: orderData.reference_id,
          });

          if (result.success) {
            onSuccess?.(result.payment_id);
          } else {
            throw new Error('Verification returned failure');
          }
        } catch (err: any) {
          const errMsg = err.message || 'Payment verification failed';
          setError(errMsg);
          onFailure?.(errMsg);
        } finally {
          setLoading(false);
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const payCart = async (cartId: number) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const orderData = await createCartPaymentOrder(accessToken, cartId);
      openCheckout({
        ...orderData,
        payment_type: 'cart',
        reference_id: cartId,
        description: `Cart #${cartId} Checkout`,
      });
    } catch (err: any) {
      const errMsg = err.message || 'Failed to create cart payment order';
      setError(errMsg);
      setLoading(false);
      onFailure?.(errMsg);
    }
  };

  const payLedger = async (amount: number, ledgerEntryId: number) => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const orderData = await createLedgerPaymentOrder(accessToken, amount);
      openCheckout({
        ...orderData,
        payment_type: 'ledger',
        reference_id: ledgerEntryId,
        description: `Outstanding Payment — ₹${amount.toLocaleString('en-IN')}`,
      });
    } catch (err: any) {
      const errMsg = err.message || 'Failed to create ledger payment order';
      setError(errMsg);
      setLoading(false);
      onFailure?.(errMsg);
    }
  };

  return { payCart, payLedger, loading, error };
}
