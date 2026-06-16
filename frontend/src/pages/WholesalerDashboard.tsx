import { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
 const navigate = useNavigate();
 const location = useLocation();

 const [orders, setOrders] = useState<OrderSummary[]>([]);
 const [products, setProducts] = useState<WholesalerProduct[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [isAddProductOpen, setIsAddProductOpen] = useState(false);
 const [editingProductId, setEditingProductId] = useState<number | null>(null);
 const [editPrice, setEditPrice] = useState<string>('');
 const [editStock, setEditStock] = useState<string>('');
 const [isSaving, setIsSaving] = useState(false);

 const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
 const tabParam = queryParams.get('tab');
 const activeTab = tabParam || 'terminal';

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
  if (level === 'low') return <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450 border border-emerald-250">Low Risk</span>;
  if (level === 'medium') return <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-450 border border-amber-250">Med Risk</span>;
  return <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-455 border border-rose-250">High Risk</span>;
 };

 const wholesalerTabs = [
  { id: 'terminal', label: 'Orders', path: '/wholesaler/dashboard?tab=terminal', active: activeTab === 'terminal', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
  { id: 'ledger', label: 'Payments', path: '/wholesaler/dashboard?tab=ledger', active: activeTab === 'ledger', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { id: 'credit', label: 'Credit Intel', path: '/wholesaler/dashboard?tab=credit', active: activeTab === 'credit', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.599-3.751A11.959 11.959 0 0112 2.714z" /></svg> },
 ];

 return (
  <div className="flex w-full gap-6 items-start">
   
   {/* Left Sidebar (240px, Desktop only) */}
   <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[var(--color-slate-100)] border-r border-[var(--color-slate-200)] min-h-[calc(100vh-56px)] p-4 space-y-6">
    <div className="flex items-center justify-between pb-4 border-b border-[var(--color-slate-200)]">
     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)]">Wholesaler Portal</span>
     <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-amber-50 border border-amber-200 text-amber-650 dark:bg-amber-950/20 dark:border-amber-800/50 dark:text-amber-400">
      Wholesaler
     </span>
    </div>
    
    <nav className="flex flex-col space-y-1">
     {wholesalerTabs.map(tab => (
      <button
       key={tab.id}
       onClick={() => navigate(tab.path)}
       className={`flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-smooth)] cursor-pointer ${
        tab.active
          ? 'bg-amber-50 text-amber-600 dark:bg-amber-100/10 dark:text-amber-400'
          : 'text-[var(--color-slate-400)] hover:bg-[var(--color-slate-200)] hover:text-[var(--color-slate-800)]'
       }`}
      >
       {tab.icon}
       {tab.label}
      </button>
     ))}
    </nav>
   </aside>

   {/* Main Content Pane */}
   <div className="flex-1 min-w-0 pr-4 md:pl-0 pl-4 space-y-6">
    
    <div className="flex flex-wrap items-start justify-between mb-2 gap-4 mt-4 text-left">
     <div className="flex-1 min-w-0">
      <h2 className="text-xl font-bold text-[var(--color-slate-800)] uppercase font-display leading-tight">
       Wholesaler control center
      </h2>
      <p className="text-xs text-[var(--color-slate-500)] leading-relaxed mt-1 font-sans">
       Manage your products, track orders, and monitor retailer credit here.
      </p>
     </div>
    </div>

    {loading ? (
     <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
    ) : error ? (
     <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-900/50 p-4 rounded text-red-600 dark:text-red-400 text-sm">{error}</div>
    ) : (
     <>
      {activeTab === 'terminal' && (
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">

        {/* Action Center - Orders */}
        <div className="lg:col-span-2 space-y-6">

         <section className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
           <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-600 dark:text-amber-400 font-bold shadow-inset-tactile">
            <span>{pendingOrders.length}</span>
           </div>
           <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">New Incoming Orders</h3>
          </div>
          {pendingOrders.length === 0 ? (
           <p className="text-xs text-[var(--color-slate-450)] py-12 text-center italic font-semibold uppercase">No new orders at the moment.</p>
          ) : (
           <ul className="space-y-3">
            {pendingOrders.map(order => (
             <li key={order.id} className="card bg-[var(--card-bg)] border border-[var(--card-border)] p-4 flex justify-between items-center group hover:border-amber-400 transition-all rounded-xl shadow-sm">
              <div>
               <div className="flex items-center space-x-3 mb-1">
                <h4 className="font-bold text-[var(--color-slate-800)] text-xs uppercase">Order #{order.order_number}</h4>
                <span className="badge badge-blue text-[10px]">
                 {order.payment_method?.replace('_', ' ')}
                </span>
               </div>
               <div className="flex items-center space-x-3 mt-1.5 text-[11px] text-[var(--color-slate-500)] font-semibold">
                <p className="font-bold text-amber-600">Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                <span>|</span>
                <p className="text-emerald-600 font-bold">Paid: ₹{order.amount_paid}</p>
                {order.amount_due > 0 && (
                 <>
                  <span>|</span>
                  <p className="text-rose-600 font-bold">Due: ₹{order.amount_due}</p>
                  <span>|</span>
                  <p className="font-mono">Due Date: {order.due_date || 'N/A'}</p>
                 </>
                )}
               </div>
               <p className="text-[10px] text-slate-400 mt-1 max-w-xs truncate" title={order.delivery_address}>{order.delivery_address}</p>
              </div>
              <div className="flex items-center space-x-2">
               <button onClick={() => handleUpdateStatus(order.id, order.status, 'cancelled')} className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 transition-colors cursor-pointer">Discard</button>
               <button onClick={() => handleUpdateStatus(order.id, order.status, 'accepted')} className="btn-tactile-indigo text-xs font-bold uppercase tracking-wider px-4 py-2 shadow-tactile-indigo cursor-pointer">Accept Order</button>
              </div>
             </li>
            ))}
           </ul>
          )}
         </section>

         <section className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-slate-200)]">
           <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
           </div>
           <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Ongoing Deliveries</h3>
          </div>
          {activeOrders.length === 0 ? (
           <p className="text-xs text-[var(--color-slate-450)] py-12 text-center italic font-semibold uppercase">No active deliveries in progress.</p>
          ) : (
           <ul className="space-y-3 divide-y divide-[var(--color-slate-200)]">
            {activeOrders.map(order => (
             <li key={order.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
              <div className="mb-2 sm:mb-0">
               <div className="flex items-center space-x-3 mb-1.5">
                <h4 className="font-bold text-[var(--color-slate-800)] text-xs">
                 #{order.order_number}
                </h4>
                <span className={`badge ${order.status === 'dispatched' ? 'badge-blue' : 'badge-yellow'} text-[10px]`}>{order.status}</span>
                <span className="badge badge-green text-[10px]">
                 {order.payment_method?.replace('_', ' ')}
                </span>
               </div>
               <div className="flex items-center space-x-3 text-[11px] text-[var(--color-slate-500)] font-semibold">
                <p>Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                <span>|</span>
                <p className="text-emerald-600 font-bold">Received: ₹{order.amount_paid}</p>
                {order.amount_due > 0 && (
                 <>
                  <span>|</span>
                  <p className="text-rose-600 font-bold">Collection: ₹{order.amount_due}</p>
                 </>
                )}
               </div>
              </div>
              <div className="flex items-center space-x-3">
               {order.status === 'accepted' && (
                <button onClick={() => handleUpdateStatus(order.id, 'accepted', 'packed')} className="btn-tactile-indigo text-xs font-bold uppercase tracking-wider px-3 py-1.5 shadow-tactile-indigo cursor-pointer">Send to Packing</button>
               )}
               {order.status === 'packed' && (
                <button onClick={() => handleUpdateStatus(order.id, 'packed', 'dispatched')} className="btn-tactile-indigo text-xs font-bold uppercase tracking-wider px-3 py-1.5 shadow-tactile-indigo cursor-pointer">Send for Delivery</button>
               )}
               {order.status === 'dispatched' && (
                <div className="text-[10px] text-amber-600 font-bold uppercase italic flex items-center">
                 <svg className="w-3.5 h-3.5 mr-1.5 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
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

        {/* Catalog Sidebar */}
        <div className="lg:col-span-1">
         <section className="dash-section p-6 flex flex-col h-full border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-[var(--color-slate-200)]">
           <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Your Products</h3>
           </div>
           <span className="badge badge-yellow text-[9px] font-bold shadow-inset-tactile">{products.length} items</span>
          </div>
          
          <button 
           onClick={() => setIsAddProductOpen(true)}
           className="btn-tactile-orange w-full py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 mb-6 shadow-tactile-primary cursor-pointer"
          >
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
           Add New Product
          </button>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[480px] custom-scrollbar">
           {products.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400 italic font-semibold">
             Your catalog is empty. Add your first product to begin.
            </div>
           ) : (
            <ul className="divide-y divide-[var(--color-slate-200)]">
             {products.map(p => (
              <li key={p.id} className="py-4 first:pt-0">
               {editingProductId === p.id ? (
                <div className="space-y-4 p-4 bg-[var(--color-slate-100)] rounded-xl border border-[var(--color-slate-200)] shadow-sm animate-scale-in">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-800)] truncate block border-b border-[var(--color-slate-200)] pb-2">{p.product.name}</p>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                   <label className="block text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider mb-1">Rate (₹)</label>
                   <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className="input-field shadow-inset-tactile" />
                  </div>
                  <div>
                   <label className="block text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider mb-1">Volume</label>
                   <input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} className="input-field shadow-inset-tactile" />
                  </div>
                 </div>
                 <div className="flex justify-end space-x-3 pt-2">
                  <button onClick={handleCancelEdit} disabled={isSaving} className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors cursor-pointer">Abort</button>
                  <button onClick={() => handleSaveProduct(p.id)} disabled={isSaving} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors cursor-pointer">{isSaving ? 'Syncing...' : 'Commit'}</button>
                 </div>
                </div>
               ) : (
                <div className="flex justify-between items-start group relative">
                 <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-800)] truncate pr-4 group-hover:text-amber-500 transition-colors">{p.product.name}</p>
                  <div className="flex items-center space-x-2 mt-1.5 text-[11px] font-medium text-[var(--color-slate-500)]">
                   <p className="font-bold text-amber-600 font-mono">₹{p.wholesale_price}</p>
                   <span className="text-slate-300">|</span>
                   <p className="font-mono">MRP: ₹{p.mrp}</p>
                  </div>
                  <button onClick={() => handleEditProduct(p)} className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors cursor-pointer">Reconfigure</button>
                 </div>
                 <div className="text-right flex-shrink-0">
                  <span className={`badge ${p.available_stock > p.min_order_qty * 5 ? 'badge-green' : 'badge-red'} block mb-1.5`}>
                   Vol: {p.available_stock}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">Min: {p.min_order_qty}</span>
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

      {/* ── CREDIT LEDGER TAB (Wholesaler Financial Visibility) ── */}
      {activeTab === 'ledger' && !loading && (
       <div className="animate-fade-in space-y-6 text-left">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {receivablesLoading ? (
          <div className="col-span-4 flex justify-center py-8">
           <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
         ) : receivables ? (
           <>
            <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-amber-400 transition-colors rounded-2xl p-5">
             <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-250 dark:border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-3 shadow-inset-tactile">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-1">Total Pending</span>
             <span className="text-xl font-bold text-[var(--color-slate-800)] font-mono">₹{receivables.total_pending_amount.toLocaleString()}</span>
             <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Outstanding retailer balances</p>
            </div>
            <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-amber-400 transition-colors rounded-2xl p-5">
             <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-250 dark:border-amber-500/20 flex items-center justify-center text-amber-600 mb-3 shadow-inset-tactile">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
             </div>
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-1">Credit Orders</span>
             <span className="text-xl font-bold text-[var(--color-slate-800)] font-mono">{receivables.total_credit_orders}</span>
             <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Open credit accounts</p>
            </div>
            <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-amber-400 transition-colors rounded-2xl p-5">
             <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 border border-rose-250 dark:border-rose-500/20 flex items-center justify-center text-rose-500 mb-3 shadow-inset-tactile">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
             </div>
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-1">Overdue Count</span>
             <span className={`text-xl font-bold font-mono ${receivables.overdue_count > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{receivables.overdue_count}</span>
             <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Accounts past due</p>
            </div>
            <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-amber-400 transition-colors rounded-2xl p-5">
             <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 border border-rose-250 dark:border-rose-550 flex items-center justify-center text-rose-500 mb-3 shadow-inset-tactile">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-1">Overdue Amount</span>
             <span className={`text-xl font-bold font-mono ${receivables.overdue_amount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>₹{receivables.overdue_amount.toLocaleString()}</span>
             <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Total overdue volume</p>
            </div>
           </>
          ) : null}
        </div>
  
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm rounded-2xl p-5">
          <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-1">Total Realized Revenue</span>
          <span className="text-xl font-bold text-emerald-600 font-mono">
           ₹{orders.reduce((acc, o) => acc + Number(o.amount_paid), 0).toFixed(2)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Received trade capital</p>
         </div>
         
         <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm rounded-2xl p-5">
          <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-1">Credit Risk Exposure</span>
          <span className="text-xl font-bold text-rose-500 font-mono">
           ₹{orders.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}
          </span>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">Outstanding credit risk</p>
         </div>
        </div>

        {/* Aging Portfolio Table */}
        <section className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl">
         <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--color-slate-200)]">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Retailer Payment History</h3>
         </div>
         <div className="overflow-x-auto font-sans">
          <table className="min-w-full premium-table">
           <thead>
            <tr className="border-b border-[var(--color-slate-200)]">
             <th>Order Number</th>
             <th>Retailer</th>
             <th>Order Total</th>
             <th>Paid</th>
             <th>Outstanding</th>
             <th>Due Date</th>
             <th>Status</th>
            </tr>
           </thead>
           <tbody className="divide-y divide-[var(--color-slate-200)]">
            {orders.filter(o => Number(o.amount_due) > 0).length === 0 ? (
             <tr>
              <td colSpan={7} className="py-12 text-center text-xs text-slate-400 font-semibold italic uppercase">No active credit exposure in current portfolio.</td>
             </tr>
            ) : (
             orders.filter(o => Number(o.amount_due) > 0).map(order => {
              const isOverdue = order.payment_status === 'overdue';
              return (
               <tr key={order.id} className={`${isOverdue ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-[var(--color-slate-100)]'} transition-all`}>
                <td>
                 <span className="font-bold text-[var(--color-slate-800)]">#{order.order_number}</span>
                </td>
                <td>
                 <span className="text-slate-400 font-semibold">—</span>
                </td>
                <td>
                 <span className="font-semibold text-[var(--color-slate-800)] font-mono">₹{Number(order.total_amount).toFixed(2)}</span>
                </td>
                <td>
                 <span className="font-bold text-emerald-600 font-mono">₹{Number(order.amount_paid).toFixed(2)}</span>
                </td>
                <td>
                 <span className="font-bold text-rose-500 font-mono">₹{Number(order.amount_due).toFixed(2)}</span>
                </td>
                <td>
                 <span className="text-slate-500 font-mono font-semibold">
                  {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'Immediate'}
                 </span>
                </td>
                <td>
                 {isOverdue ? (
                  <span className="badge bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-250 text-[10px]">Overdue</span>
                 ) : (
                  <span className="badge badge-blue text-[10px]">Pending</span>
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
       <div className="animate-fade-in space-y-6 text-left">
        <div className="flex items-center justify-between mb-4 border-b border-[var(--color-slate-200)] pb-3">
         <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-amber-500 flex-shrink-0" />
          <div>
           <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Retailer Credit Intelligence</h3>
           <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Reliability indexing based on ledger-verified transactions</p>
          </div>
         </div>
         <button
          onClick={loadCreditProfiles}
          disabled={creditLoading}
          className="btn-tactile-indigo text-xs font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-2 disabled:opacity-60 shadow-tactile-indigo cursor-pointer"
         >
          <svg className={`w-3.5 h-3.5 ${creditLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Refresh All
         </button>
        </div>

        {creditLoading ? (
         <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
         </div>
        ) : creditProfiles.length === 0 ? (
         <div className="card p-12 text-center border border-[var(--card-border)] bg-[var(--color-slate-100)] rounded-2xl">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-550 border border-amber-200">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          </div>
          <p className="text-xs text-slate-400 font-semibold italic uppercase">No retailers have placed orders yet. Credit profiles will appear here once orders are received.</p>
         </div>
        ) : (
         <div className="dash-section border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl overflow-hidden font-sans">
          <div className="overflow-x-auto">
           <table className="min-w-full premium-table">
            <thead>
             <tr className="border-b border-[var(--color-slate-200)]">
              <th>Retailer</th>
              <th>Credit Score</th>
              <th>Risk Level</th>
              <th>Recommended Limit</th>
              <th>Credit Used</th>
              <th>Overdue Invoices</th>
              <th className="text-right">Action</th>
             </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-slate-200)]">
             {creditProfiles.map(profile => (
              <tr key={profile.retailer_id} className={`${profile.risk_level === 'high' ? 'bg-rose-500/5 hover:bg-rose-500/10' : 'hover:bg-[var(--color-slate-100)]'} transition-all`}>
               <td>
                <div>
                 <p className="font-bold text-[var(--color-slate-800)] text-xs uppercase">{profile.retailer_name}</p>
                 <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{profile.business_type}</p>
                </div>
               </td>
               <td>
                <div className="flex items-center gap-3">
                 <div className="flex-1 bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] rounded-full h-1.5 w-20 overflow-hidden shadow-inset-tactile">
                  <div
                   className={`h-full rounded-full transition-all ${
                    profile.credit_score >= 80 ? 'bg-emerald-500' :
                    profile.credit_score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                   }`}
                   style={{ width: `${profile.credit_score}%` }}
                  />
                 </div>
                 <span className="text-xs font-bold text-[var(--color-slate-800)] font-mono">{profile.credit_score}</span>
                </div>
               </td>
               <td>{riskBadge(profile.risk_level)}</td>
               <td>
                <span className="text-xs font-bold text-[var(--color-slate-800)] font-mono">₹{profile.credit_limit_suggestion.toLocaleString()}</span>
               </td>
               <td>
                <span className="text-xs font-bold text-rose-500 font-mono">₹{profile.total_credit_used.toLocaleString()}</span>
               </td>
               <td>
                <span className={`text-[10px] font-bold uppercase ${profile.overdue_count > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                 {profile.overdue_count} overdue
                </span>
               </td>
               <td className="text-right">
                <button
                 onClick={() => handleRecalculateCredit(profile.retailer_id)}
                 disabled={recalculatingId === profile.retailer_id}
                 className="text-[10px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors disabled:opacity-50 inline-flex items-center gap-1 ml-auto active:scale-95 cursor-pointer"
                >
                 {recalculatingId === profile.retailer_id ? (
                  <><div className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin"/> Syncing…</>
                 ) : (
                  <>Recalculate</>
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

   </div>

   <AddProductDialog 
    isOpen={isAddProductOpen}
    onClose={() => setIsAddProductOpen(false)}
    onSuccess={loadProducts}
   />
  </div>
 );
}
