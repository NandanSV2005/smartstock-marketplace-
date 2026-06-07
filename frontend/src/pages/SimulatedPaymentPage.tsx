import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import type { Cart } from '../api';
import { getActiveCart, initiatePayment } from '../api';

export function SimulatedPaymentPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'pay_now' | 'partial' | 'credit' | null>(null);
  const [subMethod, setSubMethod] = useState<'upi' | 'card' | 'net_banking'>('upi');
  const [upfrontAmount, setUpfrontAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    if (accessToken) {
      getActiveCart(accessToken)
        .then(setCart)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [accessToken]);

  const cartTotal = useMemo(() => {
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + (item.quantity * item.unit_price_snapshot), 0);
  }, [cart]);

  const remainingBalance = useMemo(() => {
    const upfront = parseFloat(upfrontAmount) || 0;
    return Math.max(0, cartTotal - upfront);
  }, [cartTotal, upfrontAmount]);

  const handleProcessPayment = async () => {
    if (!accessToken || !paymentMethod) return;

    if (paymentMethod === 'partial') {
      const upfront = parseFloat(upfrontAmount);
      if (isNaN(upfront) || upfront <= 0 || upfront > cartTotal) {
        alert("Please enter a valid upfront amount.");
        return;
      }
    }

    setIsProcessing(true);

    // Simulate loading for Pay Now and Partial
    if (paymentMethod !== 'credit') {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    try {
      const payload = {
        payment_method: paymentMethod,
        delivery_address: "Default Retailer Address",
        upfront_amount: paymentMethod === 'partial' ? parseFloat(upfrontAmount) : undefined
      };

      const res = await initiatePayment(accessToken, payload);
      
      const newTxnId = res.payments[0]?.transaction_id || `TXN${Math.floor(1000000 + Math.random() * 9000000)}`;
      setTxnId(newTxnId);
      setShowSuccess(true);

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (e: any) {
      alert("Payment failed: " + e.message);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="mt-8 btn-primary px-8 py-3 rounded-xl">Back to Marketplace</button>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[2.5rem] shadow-2xl text-center animate-scale-in border border-emerald-100">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Payment Successful</h2>
        <p className="text-slate-500 font-medium italic mb-6">Your order has been deployed successfully.</p>
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transaction ID</p>
          <p className="text-xl font-black text-primary-600 tracking-tighter">{txnId}</p>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Redirecting to Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-8">Secure Checkout</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 bg-slate-100 border-none shadow-xl sticky top-24">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-6 border-b border-white/10 pb-4">Order Summary</h3>
            <div className="space-y-4 mb-8">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="pr-4">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight line-clamp-1">{item.wholesaler_product.product.name}</p>
                    <p className="text-[10px] font-bold text-slate-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-black text-slate-800">₹{(item.quantity * item.unit_price_snapshot).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="pt-6 border-t border-white/20 flex justify-between items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Payable</span>
              <span className="text-2xl font-black text-primary-600 tracking-tighter">₹{cartTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Methods */}
        <div className="lg:col-span-2">
          <div className="card p-8 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8">Select Payment Method</h3>
            
            <div className="space-y-4">
              {/* Pay Now Option */}
              <div 
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'pay_now' ? 'border-primary-600 bg-primary-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                onClick={() => setPaymentMethod('pay_now')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${paymentMethod === 'pay_now' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">Pay Now</p>
                      <p className="text-[10px] font-medium text-slate-400 italic">Immediate settlement via UPI, Card, or Net Banking</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'pay_now' ? 'border-primary-600 bg-primary-600' : 'border-slate-200'}`}>
                    {paymentMethod === 'pay_now' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>

                {paymentMethod === 'pay_now' && (
                  <div className="mt-8 pt-8 border-t border-slate-100 animate-fade-in-up">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Choose Method</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {['upi', 'card', 'net_banking'].map((m) => (
                        <div 
                          key={m}
                          onClick={(e) => { e.stopPropagation(); setSubMethod(m as any); }}
                          className={`p-4 rounded-xl border text-center transition-all ${subMethod === m ? 'border-primary-600 bg-primary-500/5 text-primary-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'}`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-widest">{m.replace('_', ' ')}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                      className="w-full mt-8 bg-primary-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                          Processing Payment...
                        </>
                      ) : `Pay ₹${cartTotal.toLocaleString()}`}
                    </button>
                  </div>
                )}
              </div>

              {/* Partial Payment Option */}
              <div 
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'partial' ? 'border-primary-600 bg-primary-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                onClick={() => setPaymentMethod('partial')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${paymentMethod === 'partial' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">Partial Payment</p>
                      <p className="text-[10px] font-medium text-slate-400 italic">Pay some now, balance within 60 days</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'partial' ? 'border-primary-600 bg-primary-600' : 'border-slate-200'}`}>
                    {paymentMethod === 'partial' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>

                {paymentMethod === 'partial' && (
                  <div className="mt-8 pt-8 border-t border-slate-100 animate-fade-in-up">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Upfront Amount</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₹</span>
                          <input 
                            type="number" 
                            value={upfrontAmount}
                            onChange={(e) => setUpfrontAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="w-full bg-slate-50 border-none rounded-2xl pl-10 pr-6 py-4 text-base font-black text-slate-800 focus:ring-2 focus:ring-primary-500 shadow-inner"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Remaining Due</label>
                        <div className="bg-slate-100 rounded-2xl px-6 py-4">
                          <p className="text-xl font-black text-slate-800 tracking-tighter">₹{remainingBalance.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Due in 60 days</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                      className="w-full bg-primary-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all flex items-center justify-center"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                          Processing Upfront...
                        </>
                      ) : `Pay ₹${(parseFloat(upfrontAmount) || 0).toLocaleString()} & Confirm`}
                    </button>
                  </div>
                )}
              </div>

              {/* Credit Option */}
              <div 
                className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${paymentMethod === 'credit' ? 'border-primary-600 bg-primary-50/10' : 'border-slate-100 hover:border-slate-200'}`}
                onClick={() => setPaymentMethod('credit')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl ${paymentMethod === 'credit' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <div>
                      <p className="font-black text-slate-800 uppercase tracking-tight">Credit (Pay Later)</p>
                      <p className="text-[10px] font-medium text-slate-400 italic">90 days credit period with early payment discounts</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'credit' ? 'border-primary-600 bg-primary-600' : 'border-slate-200'}`}>
                    {paymentMethod === 'credit' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                </div>

                {paymentMethod === 'credit' && (
                  <div className="mt-8 pt-8 border-t border-slate-100 animate-fade-in-up text-center">
                    <div className="bg-slate-50 rounded-[2rem] p-8 mb-8 border border-white/5 shadow-inner">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Early Payment Discount Structure</h4>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { range: '0-15 Days', pct: '3%' },
                            { range: '16-30 Days', pct: '2%' },
                            { range: '31-60 Days', pct: '1%' },
                            { range: '61-90 Days', pct: '0%' }
                          ].map((item) => (
                            <div key={item.range} className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">
                               <p className="text-[10px] font-bold text-slate-500 mb-1">{item.range}</p>
                               <p className="text-lg font-black text-primary-600 tracking-tighter">{item.pct}</p>
                            </div>
                          ))}
                       </div>
                    </div>
                    <button 
                      onClick={handleProcessPayment}
                      disabled={isProcessing}
                      className="w-full bg-slate-900 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl shadow-xl hover:bg-black transition-all flex items-center justify-center"
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-3"></div>
                          Processing...
                        </>
                      ) : `Confirm Credit Order (₹${cartTotal.toLocaleString()})`}
                    </button>
                    <p className="text-[10px] text-slate-400 font-medium italic mt-4">Full payment due within 90 days from deployment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
