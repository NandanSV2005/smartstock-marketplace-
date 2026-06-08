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
  if (level === 'low') return <span className="badge bg-emerald-105 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-250">Low Risk</span>;
  if (level === 'medium') return <span className="badge bg-amber-105 text-amber-700 dark:bg-amber-950/40 dark:text-amber-450 border border-amber-250">Med Risk</span>;
  return <span className="badge bg-rose-105 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455 border border-rose-250">High Risk</span>;
 };

 return (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
   <div className="mb-8 pb-4 border-b border-indigo-200 dark:border-indigo-950/40 flex flex-col md:flex-row md:items-end justify-between gap-6">
    <div>
     <div className="flex items-center gap-3 mb-1.5">
      <div className="w-1 h-6 bg-indigo-650 flex-shrink-0" />
      <h2 className="text-2xl font-bold text-indigo-950 dark:text-indigo-50">
       Wholesale Control Center
      </h2>
     </div>
     <p className="text-sm text-indigo-750/80 dark:text-indigo-300/80 ml-4 font-medium">
      Manage your products, track orders, and monitor retailer credit here.
     </p>
    </div>
    
    <div className="tab-bar">
     <button 
      onClick={() => setActiveTab('terminal')}
      className={`tab-pill ${activeTab === 'terminal' ? 'bg-indigo-500 text-white shadow-tactile-indigo font-semibold' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-350'}`}
     >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      Orders
     </button>
     <button 
      onClick={() => setActiveTab('ledger')}
      className={`tab-pill ${activeTab === 'ledger' ? 'bg-emerald-500 text-white shadow-tactile-emerald font-semibold' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-350'}`}
     >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
      Payments
     </button>
     <button
      onClick={() => setActiveTab('credit')}
      className={`tab-pill ${activeTab === 'credit' ? 'bg-fuchsia-500 text-white shadow-tactile-fuchsia font-semibold' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-350'}`}
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

        <section className="dash-section p-6 border-indigo-200 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/5 shadow-sm shadow-tactile-indigo">
         <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-500/20 text-xs text-indigo-600 dark:text-indigo-400 font-semibold shadow-inset-tactile">
           <span>{pendingOrders.length}</span>
          </div>
          <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-50">New Orders</h3>
         </div>
         {pendingOrders.length === 0 ? (
          <p className="text-sm text-indigo-700/60 dark:text-indigo-400/60 py-12 text-center italic font-medium">No new orders at the moment.</p>
         ) : (
          <ul className="space-y-3">
           {pendingOrders.map(order => (
            <li key={order.id} className="card bg-white dark:bg-[#0a0a0c] border border-indigo-205 dark:border-indigo-500/20 p-4 flex justify-between items-center group hover:border-indigo-400 dark:hover:border-indigo-550 hover:shadow-tactile-indigo transition-all animate-scale-in">
             <div>
              <div className="flex items-center space-x-3 mb-1">
               <h4 className="font-bold text-indigo-950 dark:text-indigo-50 text-sm">Order #{order.order_number}</h4>
               <span className="badge badge-blue text-xs">
                {order.payment_method?.replace('_', ' ')}
               </span>
              </div>
              <div className="flex items-center space-x-3 mt-1.5 text-xs text-indigo-700/80 dark:text-indigo-300/80">
               <p className="font-bold text-indigo-600 dark:text-indigo-400">Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
               <span>|</span>
               <p className="text-emerald-600 dark:text-emerald-400 font-semibold">Paid: ₹{order.amount_paid}</p>
               {order.amount_due > 0 && (
                <>
                 <span>|</span>
                 <p className="text-rose-600 dark:text-rose-455 font-semibold">Due: ₹{order.amount_due}</p>
                 <span>|</span>
                 <p className="font-semibold">Due Date: {order.due_date || 'N/A'}</p>
                </>
               )}
              </div>
              <p className="text-xs text-indigo-700/60 dark:text-indigo-400/60 mt-1 max-w-xs truncate" title={order.delivery_address}>{order.delivery_address}</p>
             </div>
             <div className="flex items-center space-x-2">
              <button onClick={() => handleUpdateStatus(order.id, order.status, 'cancelled')} className="text-xs font-bold text-rose-500 hover:text-rose-700 px-3 py-1.5 transition-colors active:scale-95">Discard</button>
              <button onClick={() => handleUpdateStatus(order.id, order.status, 'accepted')} className="btn-tactile-indigo text-xs font-semibold px-4 py-2 shadow-tactile-indigo">Accept Order</button>
             </div>
            </li>
           ))}
          </ul>
         )}
        </section>

        <section className="dash-section p-6 border-indigo-200 dark:border-indigo-950/40 bg-indigo-50/20 dark:bg-indigo-950/5 shadow-sm shadow-tactile-indigo">
         <div className="flex items-center gap-3 mb-4 pb-3 border-b border-indigo-200 dark:border-indigo-900/30">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-500">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <h3 className="text-base font-bold text-indigo-950 dark:text-indigo-100">Ongoing Deliveries</h3>
         </div>
         {activeOrders.length === 0 ? (
          <p className="text-sm text-indigo-750/60 dark:text-indigo-400/60 py-12 text-center italic font-medium">No active deliveries in progress.</p>
         ) : (
          <ul className="space-y-3 divide-y divide-indigo-100 dark:divide-indigo-900/30">
           {activeOrders.map(order => (
            <li key={order.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
             <div className="mb-2 sm:mb-0">
              <div className="flex items-center space-x-3 mb-1.5">
               <h4 className="font-bold text-indigo-950 dark:text-indigo-50 text-sm">
                #{order.order_number}
               </h4>
               <span className={`badge ${order.status === 'dispatched' ? 'badge-blue' : 'badge-yellow'} text-xs`}>{order.status}</span>
               <span className="badge badge-green text-xs">
                {order.payment_method?.replace('_', ' ')}
               </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-indigo-750/80 dark:text-indigo-400/80 font-semibold">
               <p>Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
               <span>|</span>
               <p className="text-emerald-600 dark:text-emerald-400 font-bold">Received: ₹{order.amount_paid}</p>
               {order.amount_due > 0 && (
                <>
                 <span>|</span>
                 <p className="text-rose-600 dark:text-rose-455 font-bold">Collection: ₹{order.amount_due}</p>
                </>
               )}
              </div>
             </div>
             <div className="flex items-center space-x-3">
              {order.status === 'accepted' && (
               <button onClick={() => handleUpdateStatus(order.id, 'accepted', 'packed')} className="btn-tactile-indigo text-xs font-semibold px-3 py-1.5 shadow-tactile-indigo">Send to Packing</button>
              )}
              {order.status === 'packed' && (
               <button onClick={() => handleUpdateStatus(order.id, 'packed', 'dispatched')} className="btn-tactile-indigo text-xs font-semibold px-3 py-1.5 shadow-tactile-indigo">Send for Delivery</button>
              )}
              {order.status === 'dispatched' && (
               <div className="text-xs text-indigo-600/70 dark:text-indigo-455/70 font-semibold italic flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5 text-indigo-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
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
        <section className="dash-section p-6 flex flex-col h-full border-orange-200 dark:border-orange-500/20 bg-orange-50/20 dark:bg-orange-950/5 shadow-sm shadow-tactile-primary">
         <div className="flex justify-between items-center mb-6 pb-3 border-b border-orange-100 dark:border-orange-500/10">
          <div className="flex items-center gap-3">
           <div className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/20 flex items-center justify-center text-orange-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
           </div>
           <h3 className="text-sm font-bold text-orange-950 dark:text-orange-100">Your Products</h3>
          </div>
          <span className="text-xs bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-500/20 px-2 py-0.5 rounded text-orange-700 dark:text-orange-300 font-semibold shadow-inset-tactile">{products.length} items</span>
         </div>
         
         <button 
          onClick={() => setIsAddProductOpen(true)}
          className="btn-tactile-orange w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2 mb-6 shadow-tactile-primary"
         >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Add New Product
         </button>

         <div className="flex-1 overflow-y-auto space-y-2">
          {products.length === 0 ? (
           <div className="text-center py-12 text-xs text-orange-600/70 dark:text-orange-400/70 italic font-semibold">
            Your catalog is empty. Add your first product to begin.
           </div>
          ) : (
           <ul className="divide-y divide-orange-100 dark:divide-orange-900/30">
            {products.map(p => (
             <li key={p.id} className="py-4 first:pt-0">
              {editingProductId === p.id ? (
               <div className="space-y-4 p-4 bg-white dark:bg-[#0c0c0e] rounded-xl border border-orange-200 dark:border-orange-500/20 shadow-sm shadow-tactile-primary animate-scale-in">
                <p className="text-xs font-bold text-orange-950 dark:text-orange-100 truncate block border-b border-orange-100 dark:border-orange-500/10 pb-2">{p.product.name}</p>
                <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-xs font-semibold text-orange-705 mb-1">Rate (₹)</label>
                  <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                 </div>
                 <div>
                  <label className="block text-xs font-semibold text-orange-705 mb-1">Volume</label>
                  <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" />
                 </div>
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                 <button onClick={handleCancelEdit} disabled={isSaving} className="text-xs font-bold text-rose-500 hover:text-rose-700 transition-colors active:scale-95">Abort</button>
                 <button onClick={() => handleSaveProduct(p.id)} disabled={isSaving} className="text-xs font-bold text-orange-605 hover:text-orange-500 transition-colors active:scale-95">{isSaving ? 'Syncing...' : 'Commit'}</button>
                </div>
               </div>
              ) : (
               <div className="flex justify-between items-start group relative">
                <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-orange-950 dark:text-orange-50 truncate pr-4 group-hover:text-orange-600 transition-colors">{p.product.name}</p>
                 <div className="flex items-center space-x-2 mt-1.5">
                  <p className="text-xs font-bold text-orange-605">₹{p.wholesale_price}</p>
                  <span className="text-orange-300">|</span>
                  <p className="text-xs text-orange-705">MRP: ₹{p.mrp}</p>
                 </div>
                 <button onClick={() => handleEditProduct(p)} className="mt-2 text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors active:scale-95">Reconfigure</button>
                </div>
                <div className="text-right flex-shrink-0">
                 <span className={`badge ${p.available_stock > p.min_order_qty * 5 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-250' : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-250'} block mb-1.5`}>
                  Vol: {p.available_stock}
                 </span>
                 <span className="text-xs text-orange-705 font-medium">Min: {p.min_order_qty}</span>
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
           <div className="kpi-card bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-500/20 shadow-sm shadow-tactile-emerald">
            <div className="w-8 h-8 rounded-lg bg-emerald-105 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-3 shadow-inset-tactile">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <span className="text-xs text-emerald-800/85 dark:text-emerald-300/85 font-semibold block mb-1">Total Pending</span>
            <span className="stat-value text-emerald-950 dark:text-emerald-50 font-bold">₹{receivables.total_pending_amount.toLocaleString()}</span>
            <p className="text-xs text-emerald-700/60 dark:text-emerald-400/60 mt-1">Outstanding across all retailers</p>
           </div>
           <div className="kpi-card bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-250 dark:border-indigo-500/20 shadow-sm shadow-tactile-indigo">
            <div className="w-8 h-8 rounded-lg bg-indigo-105 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-650 mb-3 shadow-inset-tactile">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
            </div>
            <span className="text-xs text-indigo-850/85 dark:text-indigo-300/85 font-semibold block mb-1">Credit Orders</span>
            <span className="stat-value text-indigo-950 dark:text-indigo-50 font-bold">{receivables.total_credit_orders}</span>
            <p className="text-xs text-indigo-700/60 dark:text-indigo-400/60 mt-1">Open credit obligations</p>
           </div>
           <div className="kpi-card bg-rose-50/50 dark:bg-rose-950/10 border-rose-250 dark:border-rose-500/20 shadow-sm shadow-tactile-rose">
            <div className="w-8 h-8 rounded-lg bg-rose-105 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-550 flex items-center justify-center text-rose-500 mb-3 shadow-inset-tactile">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <span className="text-xs text-rose-800/85 dark:text-rose-300/85 font-semibold block mb-1">Overdue Count</span>
            <span className={`stat-value font-bold ${receivables.overdue_count > 0 ? 'text-rose-600 dark:text-rose-455' : 'text-emerald-600'}`}>{receivables.overdue_count}</span>
            <p className="text-xs text-rose-700/60 dark:text-rose-400/60 mt-1">Payments past due date</p>
           </div>
           <div className="kpi-card bg-rose-50/50 dark:bg-rose-950/10 border-rose-250 dark:border-rose-500/20 shadow-sm shadow-tactile-rose">
            <div className="w-8 h-8 rounded-lg bg-rose-105 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-555 flex items-center justify-center text-rose-500 mb-3 shadow-inset-tactile">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <span className="text-xs text-rose-800/85 dark:text-rose-300/85 font-semibold block mb-1">Overdue Amount</span>
            <span className={`stat-value font-bold ${receivables.overdue_amount > 0 ? 'text-rose-600 dark:text-rose-455' : 'text-emerald-600'}`}>₹{receivables.overdue_amount.toLocaleString()}</span>
            <p className="text-xs text-rose-700/60 dark:text-rose-400/60 mt-1">Total value of overdue payments</p>
           </div>
          </>
         ) : null}
        </div>
 
        {/* Realized vs Exposure Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="kpi-card bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-250 dark:border-emerald-500/20 shadow-sm shadow-tactile-emerald">
          <div className="w-8 h-8 rounded-lg bg-emerald-105 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-3 shadow-inset-tactile">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <span className="text-xs text-emerald-800/85 dark:text-emerald-300/85 font-semibold block mb-1">Total Received</span>
          <span className="stat-value text-emerald-600 dark:text-emerald-500 font-bold">
           ₹{orders.reduce((acc, o) => acc + Number(o.amount_paid), 0).toFixed(2)}
          </span>
          <p className="text-xs text-emerald-700/60 dark:text-emerald-400/60 mt-1">Total money received from retailers.</p>
         </div>
         
         <div className="kpi-card bg-rose-50/50 dark:bg-rose-950/10 border-rose-250 dark:border-rose-500/20 shadow-sm shadow-tactile-rose">
          <div className="w-8 h-8 rounded-lg bg-rose-105 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-550 flex items-center justify-center text-rose-500 mb-3 shadow-inset-tactile">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <span className="text-xs text-rose-800/85 dark:text-rose-300/85 font-semibold block mb-1">Total Due</span>
          <span className="stat-value text-rose-600 dark:text-rose-455 font-bold">
           ₹{orders.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}
          </span>
          <p className="text-xs text-rose-700/60 dark:text-rose-400/60 mt-1">Money retailers still need to pay you.</p>
         </div>
        </div>

       {/* Aging Portfolio Table */}
       <section className="dash-section p-6 border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/25 dark:bg-emerald-950/5 shadow-sm shadow-tactile-emerald">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-emerald-100 dark:border-emerald-900/30">
         <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center text-emerald-500 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
         </div>
         <h3 className="text-base font-bold text-emerald-950 dark:text-emerald-100">Retailer Payment History</h3>
        </div>
        <div className="overflow-x-auto">
         <table className="min-w-full premium-table">
          <thead>
           <tr className="text-left border-b border-emerald-200 dark:border-emerald-900/30">
            <th className="text-emerald-950 dark:text-emerald-300">Order Number</th>
            <th className="text-emerald-950 dark:text-emerald-300">Retailer</th>
            <th className="text-emerald-950 dark:text-emerald-300">Order Total</th>
            <th className="text-emerald-950 dark:text-emerald-300">Paid</th>
            <th className="text-emerald-950 dark:text-emerald-300">Outstanding</th>
            <th className="text-emerald-950 dark:text-emerald-300">Due Date</th>
            <th className="text-emerald-950 dark:text-emerald-300">Status</th>
           </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/30">
           {orders.filter(o => Number(o.amount_due) > 0).length === 0 ? (
            <tr>
             <td colSpan={7} className="py-12 text-center text-sm text-emerald-700/60 dark:text-emerald-400/60 font-semibold italic">No active credit exposure in current portfolio.</td>
            </tr>
           ) : (
            orders.filter(o => Number(o.amount_due) > 0).map(order => {
             const isOverdue = order.payment_status === 'overdue';
             return (
              <tr key={order.id} className={`${isOverdue ? 'bg-rose-50/30 dark:bg-rose-950/15 hover:bg-rose-105/40 dark:hover:bg-rose-900/25' : 'hover:bg-emerald-100/30 dark:hover:bg-emerald-950/20'} transition-all`}>
               <td>
                <span className="font-bold text-emerald-950 dark:text-emerald-50">#{order.order_number}</span>
               </td>
               <td>
                <span className="text-emerald-600/70 dark:text-emerald-400/70 font-semibold">—</span>
               </td>
               <td>
                <span className="font-semibold text-emerald-900 dark:text-emerald-100">₹{Number(order.total_amount).toFixed(2)}</span>
               </td>
               <td>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{Number(order.amount_paid).toFixed(2)}</span>
               </td>
               <td>
                <span className="font-bold text-rose-600 dark:text-rose-455">₹{Number(order.amount_due).toFixed(2)}</span>
               </td>
               <td>
                <span className="text-emerald-800/80 dark:text-emerald-300/80 font-semibold">
                 {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'Immediate'}
                </span>
               </td>
               <td>
                {isOverdue ? (
                 <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-250 text-xs">Overdue</span>
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
          <div className="w-1 h-6 bg-fuchsia-600 flex-shrink-0" />
          <div>
           <h3 className="text-lg font-bold text-fuchsia-950 dark:text-fuchsia-100">Retailer Credit Overview</h3>
           <p className="text-xs text-fuchsia-750 dark:text-fuchsia-300 mt-0.5 font-medium">Scores based on how quickly retailers pay their bills.</p>
          </div>
         </div>
         <button
          onClick={loadCreditProfiles}
          disabled={creditLoading}
          className="btn-tactile-fuchsia text-xs font-semibold px-4 py-2 flex items-center gap-2 disabled:opacity-60 shadow-tactile-fuchsia"
         >
          <svg className={`w-3.5 h-3.5 ${creditLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh All
         </button>
        </div>

        {creditLoading ? (
         <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-fuchsia-600"></div>
         </div>
        ) : creditProfiles.length === 0 ? (
         <div className="card p-12 text-center border border-fuchsia-200 dark:border-fuchsia-500/20 bg-fuchsia-50/20 dark:bg-fuchsia-950/5 shadow-sm shadow-tactile-fuchsia">
          <div className="w-12 h-12 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-fuchsia-550 border border-fuchsia-200 dark:border-fuchsia-500/20">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <p className="text-xs text-fuchsia-700/60 dark:text-fuchsia-400/60 font-semibold italic">No retailers have placed orders yet. Credit profiles will appear here once orders are received.</p>
         </div>
        ) : (
         <div className="dash-section border-fuchsia-200 dark:border-fuchsia-500/20 bg-fuchsia-50/20 dark:bg-fuchsia-950/5 shadow-sm shadow-tactile-fuchsia overflow-hidden">
          <div className="overflow-x-auto">
           <table className="min-w-full premium-table">
            <thead>
             <tr className="border-b border-fuchsia-200 dark:border-fuchsia-900/30">
              <th className="text-left text-fuchsia-950 dark:text-fuchsia-300">Retailer</th>
              <th className="text-left text-fuchsia-950 dark:text-fuchsia-300">Credit Score</th>
              <th className="text-left text-fuchsia-950 dark:text-fuchsia-300">Risk Level</th>
              <th className="text-left text-fuchsia-950 dark:text-fuchsia-300">Recommended Credit</th>
              <th className="text-left text-fuchsia-950 dark:text-fuchsia-300">Credit Used</th>
              <th className="text-left text-fuchsia-950 dark:text-fuchsia-300">Overdue</th>
              <th className="text-right text-fuchsia-950 dark:text-fuchsia-300">Action</th>
             </tr>
            </thead>
            <tbody className="divide-y divide-fuchsia-100 dark:divide-fuchsia-900/20">
             {creditProfiles.map(profile => (
              <tr key={profile.retailer_id} className={`${profile.risk_level === 'high' ? 'bg-rose-50/30 dark:bg-rose-950/15 hover:bg-rose-105/40 dark:hover:bg-rose-900/25' : 'hover:bg-fuchsia-100/30 dark:hover:bg-fuchsia-950/20'} transition-all`}>
               <td className="px-4 py-3">
                <div>
                 <p className="font-bold text-fuchsia-950 dark:text-fuchsia-50 text-sm">{profile.retailer_name}</p>
                 <p className="text-xs text-fuchsia-700/60 dark:text-fuchsia-400/60 font-semibold">{profile.business_type}</p>
                </div>
               </td>
               <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                 <div className="flex-1 bg-fuchsia-100 dark:bg-fuchsia-950/80 rounded-full h-1.5 w-20 overflow-hidden shadow-inset-tactile">
                  <div
                   className={`h-full rounded-full transition-all ${
                    profile.credit_score >= 80 ? 'bg-emerald-500' :
                    profile.credit_score >= 50 ? 'bg-yellow-500' : 'bg-rose-500'
                   }`}
                   style={{ width: `${profile.credit_score}%` }}
                  />
                 </div>
                 <span className="text-sm font-bold text-fuchsia-950 dark:text-fuchsia-50 tabular-nums">{profile.credit_score}</span>
                </div>
               </td>
               <td className="px-4 py-3">{riskBadge(profile.risk_level)}</td>
               <td className="px-4 py-3">
                <span className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-100">₹{profile.credit_limit_suggestion.toLocaleString()}</span>
               </td>
               <td className="px-4 py-3">
                <span className="text-sm font-bold text-rose-600 dark:text-rose-455">₹{profile.total_credit_used.toLocaleString()}</span>
               </td>
               <td className="px-4 py-3">
                <span className={`text-xs font-semibold ${profile.overdue_count > 0 ? 'text-rose-600 dark:text-rose-455' : 'text-fuchsia-700/60 dark:text-fuchsia-400/60'}`}>
                 {profile.overdue_count} {profile.overdue_count === 1 ? 'payment' : 'payments'}
                </span>
               </td>
               <td className="px-4 py-3 text-right">
                <button
                 onClick={() => handleRecalculateCredit(profile.retailer_id)}
                 disabled={recalculatingId === profile.retailer_id}
                 className="text-xs font-bold text-fuchsia-600 hover:text-fuchsia-500 transition-colors disabled:opacity-50 inline-flex items-center gap-1 ml-auto active:scale-95"
                >
                 {recalculatingId === profile.retailer_id ? (
                  <><div className="w-3.5 h-3.5 border border-fuchsia-500 border-t-transparent rounded-full animate-spin"/> Syncing…</>
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
