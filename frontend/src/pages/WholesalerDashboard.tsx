import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import {
  getWholesalerOrders,
  getWholesalerOwnProducts,
  updateOrderStatus,
  updateWholesalerProduct,
  getCreditProfiles,
  recalculateCreditScore,
  getReceivablesSummary,
} from '../api';
import type {
  OrderSummary,
  WholesalerProduct,
  RetailerCreditProfile,
  ReceivablesSummary,
} from '../api';
import AddProductDialog from '../components/AddProductDialog';

export function WholesalerDashboard() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [products, setProducts] = useState<WholesalerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'ledger' | 'credit'>('terminal');

  // Part 2: Credit Intelligence state
  const [creditProfiles, setCreditProfiles] = useState<RetailerCreditProfile[]>([]);
  const [creditLoading, setCreditLoading] = useState(false);
  const [recalculatingId, setRecalculatingId] = useState<number | null>(null);

  // Part 3: Receivables Summary state
  const [receivables, setReceivables] = useState<ReceivablesSummary | null>(null);
  const [receivablesLoading, setReceivablesLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const productsData = await getWholesalerOwnProducts(accessToken);
      setProducts(productsData);
    } catch (err: any) {
      console.error("Failed to refresh products", err);
    }
  }, [accessToken]);

  // Load credit profiles when Credit Intel tab is active
  const loadCreditProfiles = useCallback(async () => {
    if (!accessToken) return;
    setCreditLoading(true);
    try {
      const data = await getCreditProfiles(accessToken);
      setCreditProfiles(data);
    } catch (err: any) {
      console.error("Failed to load credit profiles", err);
    } finally {
      setCreditLoading(false);
    }
  }, [accessToken]);

  // Load receivables summary when Credit Ledger tab is active
  const loadReceivables = useCallback(async () => {
    if (!accessToken) return;
    setReceivablesLoading(true);
    try {
      const data = await getReceivablesSummary(accessToken);
      setReceivables(data);
    } catch (err: any) {
      console.error("Failed to load receivables", err);
    } finally {
      setReceivablesLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    Promise.all([
      getWholesalerOrders(accessToken),
      getWholesalerOwnProducts(accessToken)
    ])
      .then(([ordersData, productsData]) => {
        setOrders(ordersData);
        setProducts(productsData);
      })
      .catch((err) => {
        setError(err.message || "Failed to load dashboard data");
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    if (activeTab === 'credit') loadCreditProfiles();
    if (activeTab === 'ledger') loadReceivables();
  }, [activeTab, loadCreditProfiles, loadReceivables]);

  const handleUpdateStatus = async (orderId: number, _: string, newStatus: string) => {
    if (!accessToken) return;
    try {
       const updatedOrder = await updateOrderStatus(accessToken, orderId, newStatus);
       setOrders(orders.map(o => o.id === orderId ? updatedOrder : o));
    } catch (err: any) {
       alert("Error: " + err.message);
    }
  };
  
  const handleEditProduct = (product: WholesalerProduct) => {
    setEditingProductId(product.id);
    setEditPrice(product.wholesale_price.toString());
    setEditStock(product.available_stock.toString());
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
  };

  const handleSaveProduct = async (productId: number) => {
    if (!accessToken) return;
    setIsSaving(true);
    try {
      const updated = await updateWholesalerProduct(accessToken, productId, {
        wholesale_price: parseFloat(editPrice),
        available_stock: parseInt(editStock, 10)
      });
      setProducts(products.map(p => p.id === productId ? updated : p));
      setEditingProductId(null);
    } catch (err: any) {
      alert("Failed to update product: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculateCredit = async (retailerId: number) => {
    if (!accessToken) return;
    setRecalculatingId(retailerId);
    try {
      const updated = await recalculateCreditScore(accessToken, retailerId);
      setCreditProfiles(prev =>
        prev.map(p => p.retailer_id === retailerId ? { ...p, ...updated } : p)
      );
    } catch (err: any) {
      alert("Failed to recalculate: " + err.message);
    } finally {
      setRecalculatingId(null);
    }
  };

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const activeOrders = useMemo(() => orders.filter(o => ['accepted', 'packed', 'dispatched'].includes(o.status)), [orders]);

  const riskBadge = (level: string) => {
    if (level === 'low') return <span className="inline-flex items-center gap-1 text-[9px] font-black px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">🟢 Low Risk</span>;
    if (level === 'medium') return <span className="inline-flex items-center gap-1 text-[9px] font-black px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-500 border border-yellow-500/20 uppercase tracking-widest">🟡 Med Risk</span>;
    return <span className="inline-flex items-center gap-1 text-[9px] font-black px-3 py-1 rounded-full bg-red-500/15 text-red-500 border border-red-500/20 uppercase tracking-widest animate-pulse">🔴 High Risk</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-10 pb-6 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-1.5 h-9 rounded-full bg-gradient-to-b from-orange-400 to-orange-700 shadow-md shadow-orange-500/40 flex-shrink-0" />
            <h2 className="text-3xl font-black text-slate-800 sm:text-4xl uppercase tracking-tighter">
              Wholesale Control Center
            </h2>
          </div>
          <p className="text-sm text-slate-400 font-medium ml-5">
            Manage your products, track orders, and monitor retailer credit here.
          </p>
        </div>
        
        <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={`tab-pill${activeTab === 'terminal' ? ' active' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`tab-pill${activeTab === 'ledger' ? ' active' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
            Payments
          </button>
          <button
            onClick={() => setActiveTab('credit')}
            className={`tab-pill${activeTab === 'credit' ? ' active' : ''}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
            Credit Intel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
      ) : error ? (
        <div className="bg-error-50 p-4 rounded-md text-error-700">{error}</div>
      ) : (
        <>
          {activeTab === 'terminal' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

          {/* Action Center - Orders */}
          <div className="lg:col-span-2 space-y-6">

            <section className="dash-section p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/4 rounded-full blur-3xl -mr-24 -mt-24 pointer-events-none" />
                <div className="flex items-center gap-3 mb-6 relative z-10">
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/25 shadow-inner">
                    <span className="text-sm font-black text-orange-400">{pendingOrders.length}</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">New Orders</h3>
                </div>
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center glass rounded-2xl border-none font-medium italic">No new orders at the moment.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingOrders.map(order => (
                    <li key={order.id} className="glass p-6 rounded-2xl border-none flex justify-between items-center group hover:bg-white/5 transition-all">
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Order #{order.order_number}</h4>
                          <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                            order.payment_method === 'pay_now' ? 'bg-emerald-500/10 text-emerald-500' :
                            order.payment_method === 'partial' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {order.payment_method?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Order Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                          <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Paid: ₹{order.amount_paid}</p>
                          {order.amount_due > 0 && (
                            <>
                              <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Due: ₹{order.amount_due}</p>
                              <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Due Date: {order.due_date || 'N/A'}</p>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-xs truncate font-medium italic" title={order.delivery_address}>{order.delivery_address}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={() => handleUpdateStatus(order.id, order.status, 'cancelled')} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-4 py-2 transition-colors">Discard</button>
                        <button onClick={() => handleUpdateStatus(order.id, order.status, 'accepted')} className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest py-3 px-8 rounded-xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all">Accept Order</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="dash-section p-8">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/6">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Ongoing Deliveries</h3>
              </div>
              {activeOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center font-medium italic">No active deliveries in progress.</p>
              ) : (
                <ul className="space-y-4 divide-y divide-slate-100">
                  {activeOrders.map(order => (
                    <li key={order.id} className="pt-8 first:pt-0 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
                      <div className="mb-3 sm:mb-0">
                        <div className="flex items-center space-x-4 mb-2">
                          <h4 className="font-black text-slate-800 flex items-center uppercase tracking-tighter">
                            #{order.order_number}
                          </h4>
                          <span className={`badge shadow-lg ${order.status === 'dispatched' ? 'badge-blue' : 'badge-yellow'}`}>{order.status}</span>
                          <span className={`text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm ${
                            order.payment_method === 'pay_now' ? 'bg-emerald-500 text-white' :
                            order.payment_method === 'partial' ? 'bg-yellow-500 text-white' :
                            'bg-blue-500 text-white'
                          }`}>
                            {order.payment_method?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Order Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                          <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Received: ₹{order.amount_paid}</p>
                          {order.amount_due > 0 && (
                            <>
                              <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Collection: ₹{order.amount_due}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {order.status === 'accepted' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'accepted', 'packed')} className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest py-3 px-6 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Send to Packing</button>
                        )}
                        {order.status === 'packed' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'packed', 'dispatched')} className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest py-3 px-6 rounded-xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all">Send for Delivery</button>
                        )}
                        {order.status === 'dispatched' && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic flex items-center">
                            <svg className="w-3 h-3 mr-2 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Wait for Confirmation
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

          </div>

          <div className="lg:col-span-1">
            <section className="dash-section p-8 flex flex-col h-full relative overflow-hidden">
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="flex justify-between items-center mb-8 pb-5 border-b border-white/6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  </div>
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Your Products</h3>
                </div>
                <span className="text-[9px] font-black bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-orange-400 uppercase tracking-widest">{products.length} items</span>
              </div>
              
              <button 
                onClick={() => setIsAddProductOpen(true)}
                className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all mb-10 relative z-10 flex items-center justify-center gap-3 group"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Add New Product
              </button>

              <div className="flex-1 overflow-y-auto relative z-10 space-y-2">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-40">
                    Your catalog is empty. Add your first product to begin.
                  </div>
                ) : (
                  <ul className="divide-y divide-white/5 pr-2">
                    {products.map(p => (
                      <li key={p.id} className="py-6 first:pt-0">
                        {editingProductId === p.id ? (
                          <div className="space-y-5 glass p-6 rounded-[1.5rem] border-none shadow-2xl animate-scale-in">
                            <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest border-b border-white/5 pb-3 truncate">{p.product.name}</p>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[8px] uppercase font-black text-slate-500 mb-2 tracking-widest">Rate (₹)</label>
                                <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="w-full bg-slate-50 text-sm font-black p-3 rounded-xl border-none focus:ring-1 focus:ring-primary-500 outline-none text-slate-800 shadow-inner" />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-black text-slate-500 mb-2 tracking-widest">Volume</label>
                                <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="w-full bg-slate-50 text-sm font-black p-3 rounded-xl border-none focus:ring-1 focus:ring-primary-500 outline-none text-slate-800 shadow-inner" />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                              <button onClick={handleCancelEdit} disabled={isSaving} className="text-[10px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-colors">Abort</button>
                              <button onClick={() => handleSaveProduct(p.id)} disabled={isSaving} className="text-[10px] font-black text-primary-500 hover:text-primary-400 uppercase tracking-widest transition-colors">{isSaving ? 'Syncing...' : 'Commit'}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-start group relative">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-slate-800 leading-tight uppercase tracking-tight group-hover:text-primary-400 transition-colors truncate pr-4">{p.product.name}</p>
                              <div className="flex items-center space-x-2 mt-2">
                                <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">₹{p.wholesale_price}</p>
                                <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">MRP: ₹{p.mrp}</p>
                              </div>
                              <button onClick={() => handleEditProduct(p)} className="mt-4 text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:text-primary-500">Reconfigure</button>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className={`badge px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg ${p.available_stock > p.min_order_qty * 5 ? 'badge-green bg-secondary-500/10 text-secondary-500 border-none' : 'badge-red bg-red-500/10 text-red-500 border-none animate-pulse'} block mb-2`}>
                                VOL: {p.available_stock}
                              </span>
                              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest opacity-60">MIN: {p.min_order_qty}</span>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>

        </div>
      )}

      {/* ── CREDIT LEDGER TAB (Part 3: Financial Visibility) ── */}
      {activeTab === 'ledger' && !loading && (
        <div className="animate-fade-in space-y-8">
          {/* Receivables Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {receivablesLoading ? (
              <div className="col-span-4 flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" /></div>
            ) : receivables ? (
              <>
                <div className="kpi-card" style={{'--kpi-accent': 'linear-gradient(90deg,#3b82f6,#2563eb)'} as React.CSSProperties}>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Pending</span>
                  <span className="stat-value text-blue-400">₹{receivables.total_pending_amount.toLocaleString()}</span>
                  <p className="text-[9px] text-slate-500 mt-2 font-medium">Outstanding across all retailers</p>
                </div>
                <div className="kpi-card" style={{'--kpi-accent': 'linear-gradient(90deg,#f97316,#ea580c)'} as React.CSSProperties}>
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
                  <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Credit Orders</span>
                  <span className="stat-value text-orange-400">{receivables.total_credit_orders}</span>
                  <p className="text-[9px] text-slate-500 mt-2 font-medium">Open credit obligations</p>
                </div>
                <div className="kpi-card" style={{'--kpi-accent': 'linear-gradient(90deg,#ef4444,#dc2626)'} as React.CSSProperties}>
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
                  <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Overdue Count</span>
                  <span className={`stat-value ${receivables.overdue_count > 0 ? 'text-red-400' : 'text-slate-400'}`}>{receivables.overdue_count}</span>
                  <p className="text-[9px] text-slate-500 mt-2 font-medium">Payments past due date</p>
                </div>
                <div className="kpi-card" style={{'--kpi-accent': 'linear-gradient(90deg,#f59e0b,#d97706)'} as React.CSSProperties}>
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mb-3">
                    <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Overdue Amount</span>
                  <span className={`stat-value ${receivables.overdue_amount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>₹{receivables.overdue_amount.toLocaleString()}</span>
                  <p className="text-[9px] text-slate-500 mt-2 font-medium">Total value of overdue payments</p>
                </div>
              </>
            ) : null}
          </div>

          {/* Realized vs Exposure Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="kpi-card" style={{'--kpi-accent': 'linear-gradient(90deg,#10b981,#059669)'} as React.CSSProperties}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Received</span>
              <span className="stat-value text-emerald-400">
                ₹{orders.reduce((acc, o) => acc + Number(o.amount_paid), 0).toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-500 mt-3 font-medium">Total money received from retailers.</p>
            </div>
            
            <div className="kpi-card" style={{'--kpi-accent': 'linear-gradient(90deg,#ef4444,#dc2626)'} as React.CSSProperties}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total Due</span>
              <span className="stat-value text-red-400">
                ₹{orders.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-500 mt-3 font-medium">Money retailers still need to pay you.</p>
            </div>
          </div>

          {/* Aging Portfolio Table */}
          <section className="dash-section p-8">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/6">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
              </div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Retailer Payment History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="text-left">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Number</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Retailer</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Total</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Paid</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.filter(o => Number(o.amount_due) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-500 font-medium italic">No active credit exposure in current portfolio.</td>
                    </tr>
                  ) : (
                    orders.filter(o => Number(o.amount_due) > 0).map(order => {
                      const isOverdue = order.payment_status === 'overdue';
                      return (
                        <tr key={order.id} className={`group transition-colors ${isOverdue ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-slate-50/50'}`}>
                          <td className="py-5 pr-6">
                            <span className="font-black text-slate-800 uppercase tracking-tighter">#{order.order_number}</span>
                          </td>
                          <td className="py-5 pr-6">
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">—</span>
                          </td>
                          <td className="py-5 pr-6">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">₹{Number(order.total_amount).toFixed(2)}</span>
                          </td>
                          <td className="py-5 pr-6">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">₹{Number(order.amount_paid).toFixed(2)}</span>
                          </td>
                          <td className="py-5 pr-6">
                            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">₹{Number(order.amount_due).toFixed(2)}</span>
                          </td>
                          <td className="py-5 pr-6">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'IMMEDIATE'}
                            </span>
                          </td>
                          <td className="py-5">
                            {isOverdue ? (
                              <span className="text-[9px] font-black px-3 py-1 rounded-full bg-red-500/15 text-red-600 border border-red-500/20 uppercase tracking-widest animate-pulse">⚠ Overdue</span>
                            ) : (
                              <span className="text-[9px] font-black px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 uppercase tracking-widest">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── CREDIT INTEL TAB (Part 2: Credit Intelligence) ── */}
      {activeTab === 'credit' && !loading && (
        <div className="animate-fade-in space-y-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-9 rounded-full bg-gradient-to-b from-orange-400 to-orange-700 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Retailer Credit Overview</h3>
                <p className="text-sm text-slate-400 font-medium mt-0.5">Scores based on how quickly retailers pay their bills.</p>
              </div>
            </div>
            <button
              onClick={loadCreditProfiles}
              disabled={creditLoading}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-primary-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary-500/20 hover:bg-primary-500 transition-all disabled:opacity-60"
            >
              <svg className={`w-3 h-3 ${creditLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              Refresh All
            </button>
          </div>

          {creditLoading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
          ) : creditProfiles.length === 0 ? (
            <div className="card p-16 text-center shadow-xl">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">No retailers have placed orders yet. Credit profiles will appear here once orders are received.</p>
            </div>
          ) : (
            <div className="card shadow-2xl overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Retailer</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Score</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk Level</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Recommended Credit</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Credit Used</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Overdue</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {creditProfiles.map(profile => (
                    <tr key={profile.retailer_id} className={`group hover:bg-slate-50/50 transition-colors ${profile.risk_level === 'high' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-8 py-6">
                        <div>
                          <p className="font-black text-slate-800 text-sm uppercase tracking-tighter">{profile.retailer_name}</p>
                          <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{profile.business_type}</p>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2 w-24 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                profile.credit_score >= 80 ? 'bg-emerald-500' :
                                profile.credit_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${profile.credit_score}%` }}
                            />
                          </div>
                          <span className="font-black text-slate-800 text-sm tabular-nums">{profile.credit_score}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">{riskBadge(profile.risk_level)}</td>
                      <td className="px-8 py-6">
                        <span className="font-black text-slate-800 text-sm">₹{profile.credit_limit_suggestion.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">₹{profile.total_credit_used.toLocaleString()}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${profile.overdue_count > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {profile.overdue_count} {profile.overdue_count === 1 ? 'payment' : 'payments'}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleRecalculateCredit(profile.retailer_id)}
                          disabled={recalculatingId === profile.retailer_id}
                          className="text-[9px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-500 transition-colors disabled:opacity-50 flex items-center gap-1"
                        >
                          {recalculatingId === profile.retailer_id ? (
                            <><div className="w-3 h-3 border border-primary-500 border-t-transparent rounded-full animate-spin"/> Recalculating…</>
                          ) : (
                            <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Recalculate</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      </>
    )}
      
      <AddProductDialog 
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onSuccess={loadProducts}
      />
    </div>
  );
}
