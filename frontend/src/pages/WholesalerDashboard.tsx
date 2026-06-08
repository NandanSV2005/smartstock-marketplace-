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
    if (level === 'low') return <span className="badge badge-green">Low Risk</span>;
    if (level === 'medium') return <span className="badge badge-yellow">Med Risk</span>;
    return <span className="badge badge-red">High Risk</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-8 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-1 h-6 bg-primary-600 flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Wholesale Control Center
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-4">
            Manage your products, track orders, and monitor retailer credit here.
          </p>
        </div>
        
        <div className="tab-bar">
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

                <section className="dash-section p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <span>{pendingOrders.length}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">New Orders</h3>
                  </div>
                  {pendingOrders.length === 0 ? (
                    <p className="text-sm text-slate-500 py-12 text-center italic">No new orders at the moment.</p>
                  ) : (
                    <ul className="space-y-3">
                      {pendingOrders.map(order => (
                        <li key={order.id} className="card p-4 flex justify-between items-center group hover:border-slate-300 dark:hover:border-slate-700 transition-all animate-scale-in">
                          <div>
                            <div className="flex items-center space-x-3 mb-1">
                              <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Order #{order.order_number}</h4>
                              <span className="badge badge-blue text-xs">
                                {order.payment_method?.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                              <p className="font-semibold text-primary-600 dark:text-primary-500">Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                              <span>|</span>
                              <p className="text-emerald-600 dark:text-emerald-500 font-medium">Paid: ₹{order.amount_paid}</p>
                              {order.amount_due > 0 && (
                                <>
                                  <span>|</span>
                                  <p className="text-red-500 font-medium">Due: ₹{order.amount_due}</p>
                                  <span>|</span>
                                  <p>Due Date: {order.due_date || 'N/A'}</p>
                                </>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs truncate" title={order.delivery_address}>{order.delivery_address}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleUpdateStatus(order.id, order.status, 'cancelled')} className="text-xs font-semibold text-slate-500 hover:text-red-500 px-3 py-1.5 transition-colors">Discard</button>
                            <button onClick={() => handleUpdateStatus(order.id, order.status, 'accepted')} className="btn-primary text-xs font-semibold px-4 py-2">Accept Order</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="dash-section p-6">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-7 h-7 rounded bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Ongoing Deliveries</h3>
                  </div>
                  {activeOrders.length === 0 ? (
                    <p className="text-sm text-slate-500 py-12 text-center italic">No active deliveries in progress.</p>
                  ) : (
                    <ul className="space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
                      {activeOrders.map(order => (
                        <li key={order.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
                          <div className="mb-2 sm:mb-0">
                            <div className="flex items-center space-x-3 mb-1.5">
                              <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                                #{order.order_number}
                              </h4>
                              <span className={`badge ${order.status === 'dispatched' ? 'badge-blue' : 'badge-yellow'} text-xs`}>{order.status}</span>
                              <span className="badge badge-green text-xs">
                                {order.payment_method?.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                              <p>Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                              <span>|</span>
                              <p className="text-emerald-600 dark:text-emerald-500 font-medium">Received: ₹{order.amount_paid}</p>
                              {order.amount_due > 0 && (
                                <>
                                  <span>|</span>
                                  <p className="text-red-500 font-medium">Collection: ₹{order.amount_due}</p>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {order.status === 'accepted' && (
                              <button onClick={() => handleUpdateStatus(order.id, 'accepted', 'packed')} className="btn-secondary text-xs font-semibold px-3 py-1.5">Send to Packing</button>
                            )}
                            {order.status === 'packed' && (
                              <button onClick={() => handleUpdateStatus(order.id, 'packed', 'dispatched')} className="btn-primary text-xs font-semibold px-3 py-1.5">Send for Delivery</button>
                            )}
                            {order.status === 'dispatched' && (
                              <div className="text-xs text-slate-400 italic flex items-center">
                                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
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
                <section className="dash-section p-6 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Your Products</h3>
                    </div>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-650 dark:text-slate-400 font-medium">{products.length} items</span>
                  </div>
                  
                  <button 
                    onClick={() => setIsAddProductOpen(true)}
                    className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mb-6"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Add New Product
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {products.length === 0 ? (
                      <div className="text-center py-12 text-xs text-slate-400 italic">
                        Your catalog is empty. Add your first product to begin.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {products.map(p => (
                          <li key={p.id} className="py-4 first:pt-0">
                            {editingProductId === p.id ? (
                              <div className="space-y-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 animate-scale-in">
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block border-b border-slate-100 dark:border-white/5 pb-2">{p.product.name}</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Rate (₹)</label>
                                    <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="input-field" />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Volume</label>
                                    <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="input-field" />
                                  </div>
                                </div>
                                <div className="flex justify-end space-x-3 pt-2">
                                  <button onClick={handleCancelEdit} disabled={isSaving} className="text-xs font-semibold text-slate-500 hover:text-red-500 transition-colors">Abort</button>
                                  <button onClick={() => handleSaveProduct(p.id)} disabled={isSaving} className="text-xs font-semibold text-primary-600 hover:text-primary-500 transition-colors">{isSaving ? 'Syncing...' : 'Commit'}</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start group relative">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-4 group-hover:text-primary-650 transition-colors">{p.product.name}</p>
                                  <div className="flex items-center space-x-2 mt-1.5">
                                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-500">₹{p.wholesale_price}</p>
                                    <span className="text-slate-300 dark:text-slate-700">|</span>
                                    <p className="text-xs text-slate-500">MRP: ₹{p.mrp}</p>
                                  </div>
                                  <button onClick={() => handleEditProduct(p)} className="mt-2 text-xs font-semibold text-slate-400 hover:text-primary-600 transition-colors">Reconfigure</button>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className={`badge ${p.available_stock > p.min_order_qty * 5 ? 'badge-green' : 'badge-red'} block mb-1.5`}>
                                    Vol: {p.available_stock}
                                  </span>
                                  <span className="text-xs text-slate-500">Min: {p.min_order_qty}</span>
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
            <div className="animate-fade-in space-y-6">
              {/* Receivables Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {receivablesLoading ? (
                  <div className="col-span-4 flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                  </div>
                ) : receivables ? (
                  <>
                    <div className="kpi-card">
                      <div className="w-8 h-8 rounded bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Total Pending</span>
                      <span className="stat-value text-slate-800 dark:text-slate-100">₹{receivables.total_pending_amount.toLocaleString()}</span>
                      <p className="text-xs text-slate-500 mt-1">Outstanding across all retailers</p>
                    </div>
                    <div className="kpi-card">
                      <div className="w-8 h-8 rounded bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Credit Orders</span>
                      <span className="stat-value text-slate-800 dark:text-slate-100">{receivables.total_credit_orders}</span>
                      <p className="text-xs text-slate-500 mt-1">Open credit obligations</p>
                    </div>
                    <div className="kpi-card">
                      <div className="w-8 h-8 rounded bg-red-50 dark:bg-red-950/20 flex items-center justify-center text-red-500 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Overdue Count</span>
                      <span className={`stat-value ${receivables.overdue_count > 0 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>{receivables.overdue_count}</span>
                      <p className="text-xs text-slate-500 mt-1">Payments past due date</p>
                    </div>
                    <div className="kpi-card">
                      <div className="w-8 h-8 rounded bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mb-1">Overdue Amount</span>
                      <span className={`stat-value ${receivables.overdue_amount > 0 ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>₹{receivables.overdue_amount.toLocaleString()}</span>
                      <p className="text-xs text-slate-500 mt-1">Total value of overdue payments</p>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Realized vs Exposure Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="kpi-card">
                  <div className="w-8 h-8 rounded bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <span className="text-xs text-slate-500 font-medium block mb-1">Total Received</span>
                  <span className="stat-value text-emerald-600 dark:text-emerald-500">
                    ₹{orders.reduce((acc, o) => acc + Number(o.amount_paid), 0).toFixed(2)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Total money received from retailers.</p>
                </div>
                
                <div className="kpi-card">
                  <div className="w-8 h-8 rounded bg-red-50/10 dark:bg-red-950/20 flex items-center justify-center text-red-500 mb-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  </div>
                  <span className="text-xs text-slate-500 font-medium block mb-1">Total Due</span>
                  <span className="stat-value text-red-500">
                    ₹{orders.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">Money retailers still need to pay you.</p>
                </div>
              </div>

              {/* Aging Portfolio Table */}
              <section className="dash-section p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-7 h-7 rounded bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Retailer Payment History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full premium-table">
                    <thead>
                      <tr className="text-left">
                        <th>Order Number</th>
                        <th>Retailer</th>
                        <th>Order Total</th>
                        <th>Paid</th>
                        <th>Outstanding</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {orders.filter(o => Number(o.amount_due) > 0).length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-sm text-slate-500 font-medium italic">No active credit exposure in current portfolio.</td>
                        </tr>
                      ) : (
                        orders.filter(o => Number(o.amount_due) > 0).map(order => {
                          const isOverdue = order.payment_status === 'overdue';
                          return (
                            <tr key={order.id} className={isOverdue ? 'bg-red-50/20 dark:bg-red-950/10' : ''}>
                              <td>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">#{order.order_number}</span>
                              </td>
                              <td>
                                <span className="text-slate-500 dark:text-slate-400">—</span>
                              </td>
                              <td>
                                <span className="font-medium text-slate-700 dark:text-slate-300">₹{Number(order.total_amount).toFixed(2)}</span>
                              </td>
                              <td>
                                <span className="font-medium text-emerald-600 dark:text-emerald-500">₹{Number(order.amount_paid).toFixed(2)}</span>
                              </td>
                              <td>
                                <span className="font-medium text-red-500">₹{Number(order.amount_due).toFixed(2)}</span>
                              </td>
                              <td>
                                <span className="text-slate-500 dark:text-slate-400">
                                  {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'Immediate'}
                                </span>
                              </td>
                              <td>
                                {isOverdue ? (
                                  <span className="badge badge-red text-xs">Overdue</span>
                                ) : (
                                  <span className="badge badge-blue text-xs">Pending</span>
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
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Retailer Credit Overview</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Scores based on how quickly retailers pay their bills.</p>
                  </div>
                </div>
                <button
                  onClick={loadCreditProfiles}
                  disabled={creditLoading}
                  className="btn-primary text-xs font-semibold px-4 py-2 flex items-center gap-2 disabled:opacity-60"
                >
                  <svg className={`w-3.5 h-3.5 ${creditLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  Refresh All
                </button>
              </div>

              {creditLoading ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                </div>
              ) : creditProfiles.length === 0 ? (
                <div className="card p-12 text-center">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  </div>
                  <p className="text-xs text-slate-500 italic">No retailers have placed orders yet. Credit profiles will appear here once orders are received.</p>
                </div>
              ) : (
                <div className="dash-section overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full premium-table">
                      <thead>
                        <tr>
                          <th className="text-left">Retailer</th>
                          <th className="text-left">Credit Score</th>
                          <th className="text-left">Risk Level</th>
                          <th className="text-left">Recommended Credit</th>
                          <th className="text-left">Credit Used</th>
                          <th className="text-left">Overdue</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {creditProfiles.map(profile => (
                          <tr key={profile.retailer_id} className={profile.risk_level === 'high' ? 'bg-red-50/10 dark:bg-red-950/10' : ''}>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{profile.retailer_name}</p>
                                <p className="text-xs text-slate-500">{profile.business_type}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 w-20 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      profile.credit_score >= 80 ? 'bg-emerald-500' :
                                      profile.credit_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${profile.credit_score}%` }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{profile.credit_score}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{riskBadge(profile.risk_level)}</td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">₹{profile.credit_limit_suggestion.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-semibold text-red-500">₹{profile.total_credit_used.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs ${profile.overdue_count > 0 ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                                {profile.overdue_count} {profile.overdue_count === 1 ? 'payment' : 'payments'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleRecalculateCredit(profile.retailer_id)}
                                disabled={recalculatingId === profile.retailer_id}
                                className="text-xs font-semibold text-primary-600 hover:text-primary-500 transition-colors disabled:opacity-50 inline-flex items-center gap-1 ml-auto"
                              >
                                {recalculatingId === profile.retailer_id ? (
                                  <><div className="w-3.5 h-3.5 border border-primary-500 border-t-transparent rounded-full animate-spin"/> Syncing…</>
                                ) : (
                                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg> Recalculate</>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
