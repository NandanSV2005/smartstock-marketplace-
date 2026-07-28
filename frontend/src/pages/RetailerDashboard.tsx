import { 
 getRetailerInsights, 
 getRetailerInventory, 
 getRetailerOrders, 
 getMarketplaceProducts, 
 addToCart, 
 getFullImageUrl,
 getActiveCart,
 updateCartItemQuantity,
 generateMockInsights,
 updateOrderStatus,
 getProducts,
 addInventoryItem,
 updateInventoryItem,
 createSale,
 getSalesHistory,
 getRetailerKPIs,
 getRetailerSalesTrend,
 getRetailerInventoryLevels,
 getRealtimeInsights,
} from '../api';
import type { 
 AIInsight, 
 InventoryItem, 
 OrderSummary, 
 WholesalerProduct, 
 Cart,
 Sale,
 CreateSaleItemPayload,
 RetailerKPIs,
 SalesTrendData,
 InventoryLevelData,
 RealtimeInsight,
} from '../api';
import {
 AreaChart, Area, BarChart, Bar,
 XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useRazorpay } from '../hooks/useRazorpay';

interface DashboardState<T> {
 data: T;
 loading: boolean;
 error: string | null;
}

function useDashboardData<T>(initial: T, loader: () => Promise<T>): DashboardState<T> & { mutate: () => void } {
 const [data, setData] = useState<T>(initial);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [stamp, setStamp] = useState(Date.now());

 useEffect(() => {
  let active = true;
  setLoading(true);
  setError(null);
  loader()
   .then((res) => {
    if (active) setData(res);
   })
   .catch((e) => {
    if (active) setError(e.message || 'Could not load data from server.');
   })
   .finally(() => {
    if (active) setLoading(false);
   });
  return () => {
   active = false;
  };
 }, [loader, stamp]);

 return { data, loading, error, mutate: () => setStamp(Date.now()) };
}

export function RetailerDashboard() {
 const { accessToken } = useAuth();
 const navigate = useNavigate();
 const location = useLocation();

 const { payCart, payLedger, loading: paymentLoading } = useRazorpay({
  onSuccess: (paymentId) => {
   alert(`Payment successful! Payment ID: ${paymentId}`);
   cart.mutate();
   orders.mutate();
  },
  onFailure: (err) => {
   if (err !== 'Payment cancelled by user') {
    alert(`Payment failed: ${err}`);
   }
  },
 });

 const [salesSubTab, setSalesSubTab] = useState<'record' | 'history'>('record');
 const [showAddInventory, setShowAddInventory] = useState(false);
 const [addingItem, setAddingItem] = useState(false);
 const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
 const [editingThresholdValue, setEditingThresholdValue] = useState<string>('');
 const [updatingThreshold, setUpdatingThreshold] = useState(false);
 const [reorderingId, setReorderingId] = useState<number | null>(null);
 const [reorderSuccessId, setReorderSuccessId] = useState<number | null>(null);

 const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
 const tabParam = queryParams.get('tab');

 const activeTab = useMemo(() => {
  if (location.pathname === '/sales/record') return 'sales';
  if (location.pathname === '/sales/history') return 'sales';
  return tabParam || 'dashboard';
 }, [location.pathname, tabParam]);

 useEffect(() => {
  if (location.pathname === '/sales/record') {
   setSalesSubTab('record');
  } else if (location.pathname === '/sales/history') {
   setSalesSubTab('history');
  }
 }, [location.pathname]);

 const inventoryLoader = useMemo(
  () => () => (accessToken ? getRetailerInventory(accessToken) : Promise.resolve<InventoryItem[]>([])),
  [accessToken],
 );
 const productsLoader = useMemo(
  () => () => (accessToken ? getProducts(accessToken) : Promise.resolve<any[]>([])),
  [accessToken],
 );
 const insightsLoader = useMemo(
  () => () => (accessToken ? getRetailerInsights(accessToken) : Promise.resolve<AIInsight[]>([])),
  [accessToken],
 );
 const products = useDashboardData<any[]>([], productsLoader);

 const handleAddInventoryItem = async (productId: number, currentStock: number, reorderLevel: number) => {
  if (!accessToken) return;
  setAddingItem(true);
  try {
   await addInventoryItem(accessToken, productId, currentStock, reorderLevel);
   inventory.mutate();
   setShowAddInventory(false);
   alert("Item added to inventory!");
  } catch (e: any) {
   alert("Failed to add inventory item: " + e.message);
  } finally {
   setAddingItem(false);
  }
 }

 const handleUpdateThreshold = async (inventoryId: number, newLevel: number) => {
  if (!accessToken) return;
  setUpdatingThreshold(true);
  try {
   await updateInventoryItem(accessToken, inventoryId, { reorder_level: newLevel });
   inventory.mutate();
   setEditingInventoryId(null);
  } catch (e: any) {
   alert("Failed to update threshold: " + e.message);
  } finally {
   setUpdatingThreshold(false);
  }
 }

 const handleRecordSale = async () => {
  if (!accessToken || saleItems.length === 0) return;
  setIsRecordingSale(true);
  try {
   const res = await createSale(accessToken, { items: saleItems });
   setShowInvoice(res);
   setSaleItems([]);
   sales.mutate();
   inventory.mutate();
  } catch (e: any) {
   alert("Failed to record sale: " + e.message);
  } finally {
   setIsRecordingSale(false);
  }
 }
 const ordersLoader = useMemo(
  () => () => (accessToken ? getRetailerOrders(accessToken) : Promise.resolve<OrderSummary[]>([])),
  [accessToken],
 );
 const marketplaceLoader = useMemo(
  () => () => (accessToken ? getMarketplaceProducts(accessToken) : Promise.resolve<WholesalerProduct[]>([])),
  [accessToken],
 );
 const cartLoader = useMemo(
  () => () => (accessToken ? getActiveCart(accessToken) : Promise.resolve<Cart>({ id: 0, status: 'active', items: [] })),
  [accessToken],
 );

 const inventory = useDashboardData<InventoryItem[]>([], inventoryLoader);
 const insights = useDashboardData<AIInsight[]>([], insightsLoader);
 const orders = useDashboardData<OrderSummary[]>([], ordersLoader);
 const marketplace = useDashboardData<WholesalerProduct[]>([], marketplaceLoader);
 const cart = useDashboardData<Cart>({ id: 0, status: 'active', items: [] }, cartLoader);

 const salesLoader = useMemo(
  () => () => (accessToken ? getSalesHistory(accessToken) : Promise.resolve<Sale[]>([])),
  [accessToken],
 );
 const sales = useDashboardData<Sale[]>([], salesLoader);

 const kpiLoader = useMemo(
  () => () => (accessToken ? getRetailerKPIs(accessToken) : Promise.resolve<RetailerKPIs>({
   total_sales_revenue: 0, orders_this_month: 0, outstanding_credit: 0, low_stock_count: 0
  })),
  [accessToken],
 );
 const salesTrendLoader = useMemo(
  () => () => (accessToken ? getRetailerSalesTrend(accessToken) : Promise.resolve<SalesTrendData[]>([])),
  [accessToken],
 );
 const inventoryLevelsLoader = useMemo(
  () => () => (accessToken ? getRetailerInventoryLevels(accessToken) : Promise.resolve<InventoryLevelData[]>([])),
  [accessToken],
 );
 const realtimeInsightsLoader = useMemo(
  () => () => (accessToken ? getRealtimeInsights(accessToken) : Promise.resolve<RealtimeInsight[]>([])),
  [accessToken],
 );

 const kpis = useDashboardData<RetailerKPIs>({
  total_sales_revenue: 0, orders_this_month: 0, outstanding_credit: 0, low_stock_count: 0
 }, kpiLoader);
 const salesTrend = useDashboardData<SalesTrendData[]>([], salesTrendLoader);
 const inventoryLevels = useDashboardData<InventoryLevelData[]>([], inventoryLevelsLoader);
 const realtimeInsights = useDashboardData<RealtimeInsight[]>([], realtimeInsightsLoader);

 const [saleItems, setSaleItems] = useState<CreateSaleItemPayload[]>([]);
 const [isRecordingSale, setIsRecordingSale] = useState(false);
 const [showInvoice, setShowInvoice] = useState<Sale | null>(null);

 const [quantities, setQuantities] = useState<{ [key: number]: number }>({});
 const [newInventoryItem, setNewInventoryItem] = useState({
  productId: 0,
  currentStock: 10,
  reorderLevel: 5
 });
 
 useEffect(() => {
  if (marketplace.data.length > 0) {
   const initialQtys: { [key: number]: number } = {};
   marketplace.data.forEach(wp => {
    initialQtys[wp.id] = wp.min_order_qty;
   });
   setQuantities(curr => ({ ...initialQtys, ...curr }));
  }
 }, [marketplace.data]);

 const lowStockItems = useMemo(
  () =>
   inventory.data.filter((item) => parseFloat(item.reorder_level.toString()) > 0 && parseFloat(item.current_stock.toString()) <= parseFloat(item.reorder_level.toString())).slice(0, 5),
  [inventory.data],
 );

 const recentOrders = useMemo(() => orders.data.slice(0, 5), [orders.data]);
 const [addingToCart, setAddingToCart] = useState<number | null>(null);

 const handleAddToCart = async (wpId: number) => {
  if (!accessToken) return;
  const qty = quantities[wpId] || 1;
  setAddingToCart(wpId);
  try {
   await addToCart(accessToken, wpId, qty);
   cart.mutate();
   alert("Item added to cart!");
  } catch (e: any) {
   alert("Failed to add to cart: " + e.message);
  } finally {
   setAddingToCart(null);
  }
 }

 const handleUpdateCartQty = async (itemId: number, newQty: number) => {
  if (!accessToken) return;
  try {
   await updateCartItemQuantity(accessToken, itemId, newQty);
   cart.mutate();
  } catch (e: any) {
   alert(e.message);
  }
 }

 const handleGenerateInsights = async () => {
  if (!accessToken) return;
  try {
   await generateMockInsights(accessToken);
   insights.mutate();
   realtimeInsights.mutate();
  } catch (e: any) {
   alert("Failed to generate insights: " + e.message);
  }
 };

 const handleReorderNow = async (insight: RealtimeInsight) => {
  if (!accessToken || !insight.action) return;
  const { wholesaler_product_id, quantity } = insight.action;
  setReorderingId(insight.product_id);
  try {
   await addToCart(accessToken, wholesaler_product_id, quantity);
   cart.mutate();
   setReorderSuccessId(insight.product_id);
   setTimeout(() => {
    setReorderSuccessId(null);
    navigate('/retailer/dashboard?tab=cart');
   }, 1200);
  } catch (e: any) {
   alert('Failed to add to cart: ' + e.message);
  } finally {
   setReorderingId(null);
  }
 }

 const handleMarkAsReceived = async (orderId: number) => {
  if (!accessToken) return;
  if (!window.confirm("Confirm that you have received this order?")) return;
  try {
   await updateOrderStatus(accessToken, orderId, 'delivered');
   orders.mutate();
   inventory.mutate();
   alert("Order marked as received!");
  } catch (e: any) {
   alert("Failed to update status: " + e.message);
  }
 }

 const cartTotal = useMemo(() => {
  return cart.data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price_snapshot), 0);
 }, [cart.data.items]);

 const renderError = (err: any) => {
  if (!err) return null;
  const msg = typeof err === 'string' ? err : (err.detail || err.message || "Protocol transmission interrupted. Please sync again.");
  return (
   <div className="flex items-center space-x-3 text-red-500 font-bold uppercase tracking-widest text-[10px] animate-pulse bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
    <span>{msg}</span>
   </div>
  );
 };

 const retailerTabs = [
  { id: 'dashboard', label: 'Dashboard', path: '/retailer/dashboard?tab=dashboard', active: activeTab === 'dashboard', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg> },
  { id: 'marketplace', label: 'Marketplace', path: '/retailer/dashboard?tab=marketplace', active: activeTab === 'marketplace', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 00-.75-.75h-1.5a.75.75 0 00-.75.75V21m-9 0h18M12 9v3m0 0v3m0-3h3m-3 0H9m-3 9h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
  { id: 'cart', label: 'Cart', path: '/retailer/dashboard?tab=cart', active: activeTab === 'cart', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.7 3.03-7.1H5.4M7.5 14.25L5.15 6M7.5 14.25a3 3 0 003 3m0 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3m9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3" /></svg> },
  { id: 'inventory', label: 'Inventory', path: '/retailer/dashboard?tab=inventory', active: activeTab === 'inventory', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg> },
  { id: 'ledger', label: 'Ledger', path: '/retailer/dashboard?tab=ledger', active: activeTab === 'ledger', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg> },
  { id: 'sales', label: 'Sales', path: '/sales/record', active: activeTab === 'sales', icon: <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
 ];

 return (
  <div className="flex w-full gap-6 items-start">
   
   {/* Left Sidebar (240px, Desktop only) */}
   <aside className="hidden md:flex flex-col w-60 shrink-0 bg-[var(--color-slate-100)] border-r border-[var(--color-slate-200)] min-h-[calc(100vh-56px)] p-4 space-y-6">
    <div className="flex items-center justify-between pb-4 border-b border-[var(--color-slate-200)]">
     <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)]">Retailer Portal</span>
     <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-indigo-50 border border-indigo-200 text-indigo-650 dark:bg-indigo-950/20 dark:border-indigo-800/50 dark:text-indigo-400">
      Retailer
     </span>
    </div>
    
    <nav className="flex flex-col space-y-1">
     {retailerTabs.map(tab => (
      <button
       key={tab.id}
       onClick={() => navigate(tab.path)}
       className={`flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-smooth)] cursor-pointer ${
        tab.active
          ? 'bg-primary-50 text-[var(--color-primary-500)] dark:bg-primary-100/10 dark:text-[var(--color-primary-500)]'
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
    
    <div className="flex flex-wrap items-start justify-between mb-2 gap-4 mt-4">
     <div className="flex-1 min-w-0">
      <h2 className="text-xl font-bold text-[var(--color-slate-800)] uppercase font-display leading-tight">
       {retailerTabs.find(t => t.active)?.label || 'Portal'} Center
      </h2>
      <p className="text-xs text-[var(--color-slate-500)] leading-relaxed mt-1 font-sans">
       Manage inventory, optimize ordering, and receive SmartStock AI insights.
      </p>
     </div>
    </div>

    {activeTab === 'dashboard' && (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Financial Overview KPIs */}
      <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
       
       {/* Monthly Sales */}
       <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-[var(--color-primary-500)] rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-spring)] stagger-1 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
         <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center border border-emerald-250 dark:border-emerald-500/25 text-emerald-600">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
         </div>
         <span className="badge badge-green text-[9px] font-bold">Revenue</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)] mb-1">Monthly Sales</p>
        <div className="flex justify-between items-baseline mt-2">
         <p className="text-xl font-bold text-[var(--color-slate-800)] font-mono">₹{kpis.data?.total_sales_revenue?.toLocaleString() || 0}</p>
         <span className="text-xs font-bold text-emerald-500">↑ 12.4%</span>
        </div>
       </div>

       {/* Orders This Month */}
       <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-[var(--color-primary-500)] rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-spring)] stagger-2 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
         <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center border border-indigo-250 dark:border-indigo-500/25 text-indigo-650">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
         </div>
         <span className="badge badge-blue text-[9px] font-bold">Orders</span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)] mb-1">Orders This Month</p>
        <div className="flex justify-between items-baseline mt-2">
         <p className="text-xl font-bold text-[var(--color-slate-800)] font-mono">{kpis.data?.orders_this_month || 0}</p>
         <span className="text-xs font-bold text-emerald-500">↑ 8.2%</span>
        </div>
       </div>

       {/* Outstanding Credit */}
       <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-[var(--color-primary-500)] rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-spring)] stagger-3 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
         <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center border border-rose-250 dark:border-rose-500/25 text-rose-500">
          <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
         </div>
         {(kpis.data?.outstanding_credit ?? 0) > 0 && <span className="badge badge-red text-[9px] font-bold">Due</span>}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)] mb-1">Outstanding Credit</p>
        <div className="flex justify-between items-baseline mt-2">
         <p className="text-xl font-bold text-rose-500 font-mono">₹{kpis.data?.outstanding_credit?.toLocaleString() || 0}</p>
         <span className="text-xs font-bold text-rose-500">↓ 3.1%</span>
        </div>
       </div>

       {/* Low Stock Items */}
       <div className="kpi-card bg-[var(--card-bg)] border border-[var(--card-border)] shadow-sm hover:border-[var(--color-primary-500)] rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-spring)] stagger-4 animate-scale-in">
        <div className="flex items-start justify-between mb-4">
         <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center border border-amber-250 dark:border-amber-500/25 text-amber-500">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
         </div>
         {(kpis.data?.low_stock_count ?? 0) > 0 && <span className="badge badge-yellow text-[9px] font-bold">Alert</span>}
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)] mb-1">Low Stock Items</p>
        <div className="flex justify-between items-baseline mt-2">
         <p className={`text-xl font-bold font-mono ${(kpis.data?.low_stock_count ?? 0) > 0 ? 'text-amber-500' : 'text-[var(--color-slate-800)]'}`}>{kpis.data?.low_stock_count || 0}</p>
         <span className="text-xs font-bold text-rose-500">+1 check</span>
        </div>
       </div>

      </div>

      {/* Charts Section */}
      <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
       
       {/* Sales Trend Chart */}
       <div className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
         <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-500">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
         </div>
         <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Sales Trend (30 Days)</h4>
        </div>
        <div className="h-64">
         <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={salesTrend.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
           <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
             <stop offset="5%" stopColor="var(--color-primary-500)" stopOpacity={0.2}/>
             <stop offset="95%" stopColor="var(--color-primary-500)" stopOpacity={0}/>
            </linearGradient>
           </defs>
           <CartesianGrid stroke="var(--color-slate-200)" vertical={false} strokeDasharray="3 3" />
           <XAxis dataKey="date" stroke="var(--color-slate-400)" fontSize={11} tickFormatter={(tick) => {try {return new Date(tick).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} catch(e) {return tick}}} />
           <YAxis stroke="var(--color-slate-400)" fontSize={11} axisLine={false} tickLine={false} />
           <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', fontSize: '11px', color: 'var(--color-slate-800)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)' }}
            labelFormatter={(label) => {try {return new Date(label).toLocaleDateString()} catch(e) {return label}}}
           />
           <Area type="monotone" dataKey="total_revenue" name="Revenue" stroke="var(--color-primary-500)" strokeWidth={2} fill="url(#colorRevenue)" />
          </AreaChart>
         </ResponsiveContainer>
        </div>
       </div>

       {/* Inventory Levels Chart */}
       <div className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
         <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 text-indigo-500">
          <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
         </div>
         <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Critical Inventory Levels</h4>
        </div>
        <div className="h-64">
         <ResponsiveContainer width="100%" height="100%">
          <BarChart data={inventoryLevels.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
           <CartesianGrid stroke="var(--color-slate-200)" vertical={false} strokeDasharray="3 3" />
           <XAxis dataKey="name" stroke="var(--color-slate-400)" fontSize={11} angle={-45} textAnchor="end" height={60} />
           <YAxis stroke="var(--color-slate-400)" fontSize={11} axisLine={false} tickLine={false} />
           <Tooltip 
            contentStyle={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'blur(12px)', border: '1px solid var(--card-border)', borderRadius: '0.75rem', fontSize: '11px', color: 'var(--color-slate-800)', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)' }}
            cursor={{fill: 'rgba(255, 255, 255, 0.03)'}}
           />
           <Bar dataKey="current_stock" name="Current Stock" fill="var(--color-primary-500)" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
           <Bar dataKey="reorder_level" name="Reorder Level" fill="var(--color-secondary-500)" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
         </ResponsiveContainer>
        </div>
       </div>

      </div>

      {/* SmartStock AI Block — Dedicated AI Advisor Panel */}
      <section className="lg:col-span-3 relative overflow-hidden rounded-2xl p-6 bg-[var(--color-slate-100)] border border-[var(--card-border)] shadow-sm animate-fade-in relative"
               style={{ background: 'linear-gradient(135deg, var(--color-slate-100) 0%, rgba(99, 102, 241, 0.04) 100%)' }}>
       <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
         <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/30 border border-indigo-250 dark:border-indigo-500/20 flex items-center justify-center text-primary-500">
          <span className="text-lg font-bold">✦</span>
         </div>
         <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-slate-800)]">AI Advisor</h3>
        </div>
        <button
         onClick={handleGenerateInsights}
         className="text-[10px] uppercase tracking-widest btn-tactile-indigo px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
        >
         <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
         Refresh Insights
        </button>
       </div>
       {realtimeInsights.loading ? (
        <p className="text-xs text-[var(--color-slate-500)] animate-pulse font-medium">Checking your stock levels...</p>
       ) : realtimeInsights.error ? (
        renderError(realtimeInsights.error)
       ) : realtimeInsights.data.filter(i => i.alert_level !== 'ok' && i.alert_level !== 'no_data').length === 0 ? (
        <p className="text-xs text-[var(--color-slate-500)] font-medium">Everything is in stock. Your store is ready to sell!</p>
       ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
         {realtimeInsights.data
          .filter(i => i.alert_level !== 'ok' && i.alert_level !== 'no_data')
          .slice(0, 6)
          .map((insight) => (
           <div key={insight.product_id} 
                className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 flex flex-col justify-between transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-spring)] hover:-translate-y-0.5 hover:shadow-lg ${
                  insight.alert_level === 'critical' ? 'border-l-4 border-l-rose-500' :
                  insight.alert_level === 'warning' ? 'border-l-4 border-l-amber-500' :
                  'border-l-4 border-l-emerald-500'
                }`}>
            <div>
             <div className="flex justify-between items-start mb-3">
              <span className={`badge ${
               insight.alert_level === 'critical' ? 'badge-red' :
               insight.alert_level === 'warning' ? 'badge-yellow' :
               'badge-blue'
              }`}>
               {insight.alert_level.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">
               {insight.days_to_stockout !== null ? `${insight.days_to_stockout}d left` : 'below min'}
              </span>
             </div>
             <div className="font-bold text-[var(--color-slate-800)] text-xs uppercase tracking-wider mb-2">
              {insight.product}
             </div>
             <div className="text-xs text-[var(--color-slate-500)] leading-relaxed flex-1">
              {insight.message}
             </div>
            </div>
            {insight.action && (
             <div className="mt-4 pt-3 border-t border-[var(--color-slate-200)]">
              <div className="flex items-center justify-between mb-2">
               <span className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">
                via {insight.action.supplier_name}
               </span>
               <span className="text-xs font-bold text-emerald-500">
                ₹{insight.action.price}/unit
               </span>
              </div>
              <button
               id={`reorder-btn-${insight.product_id}`}
               onClick={() => handleReorderNow(insight)}
               disabled={reorderingId === insight.product_id}
               className={`w-full py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                reorderSuccessId === insight.product_id
                 ? 'bg-emerald-600 text-white'
                 : 'btn-tactile-orange'
               }`}
              >
               {reorderSuccessId === insight.product_id ? (
                <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> Added</>
               ) : reorderingId === insight.product_id ? (
                <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin"/> Adding...</>
               ) : (
                <>Reorder ({insight.action.quantity} units)</>
               )}
              </button>
             </div>
            )}
           </div>
          ))}
        </div>
       )}
      </section>

      <section className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
       <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-slate-200)]">
        <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500">
         <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Low Stock Warnings</h3>
       </div>
       {inventory.loading ? (
        <p className="text-xs text-slate-500 animate-pulse font-medium">Checking Stock...</p>
       ) : inventory.error ? (
        renderError(inventory.error)
       ) : lowStockItems.length === 0 ? (
        <div className="text-center py-12">
         <svg className="mx-auto h-12 w-12 text-slate-400 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
         </svg>
         <p className="mt-4 text-xs font-medium text-slate-500">No low stock items found</p>
        </div>
       ) : (
        <ul className="divide-y divide-[var(--color-slate-200)]">
         {lowStockItems.map((item) => (
          <li key={item.id} className="py-3 flex justify-between items-center group">
           <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-slate-800)]">{item.product.name}</p>
            <p className="text-[10px] text-[var(--color-slate-400)] font-semibold">Reorder Level: {item.reorder_level}</p>
           </div>
           <span className="badge badge-red">
            {item.current_stock} {item.product.unit}
           </span>
          </li>
         ))}
        </ul>
       )}
      </section>

      <section className="dash-section p-6 lg:col-span-2 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm">
       <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[var(--color-slate-200)]">
        <div className="w-8 h-8 rounded bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-500">
         <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Recent Orders</h3>
       </div>
       {orders.loading ? (
        <p className="text-xs text-slate-500 animate-pulse font-medium">Loading Orders...</p>
       ) : orders.error ? (
        renderError(orders.error)
       ) : recentOrders.length === 0 ? (
        <div className="text-center py-12">
         <p className="text-xs font-medium text-slate-500">No orders to show</p>
        </div>
       ) : (
        <ul className="divide-y divide-[var(--color-slate-200)]">
         {recentOrders.map((order) => (
          <li key={order.id} className="py-4 flex justify-between items-center hover:bg-[var(--color-slate-100)] transition-colors px-3 rounded-xl border border-transparent">
           <div className="flex flex-col">
            <span className="text-xs font-bold text-[var(--color-slate-800)]">#{order.order_number}</span>
            <span className="text-[10px] text-[var(--color-slate-500)] font-semibold mt-1">Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</span>
           </div>
           <div className="flex items-center space-x-3">
            {order.status === 'dispatched' && (
             <button
              onClick={() => handleMarkAsReceived(order.id)}
              className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider btn-tactile-emerald shadow-tactile-emerald flex items-center cursor-pointer"
             >
              Order Received
             </button>
            )}
            <span className={`badge ${order.status === 'delivered' ? 'badge-green' : order.status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>
             {order.status === 'delivered' ? 'DONE' : order.status.toUpperCase()}
            </span>
           </div>
          </li>
         ))}
        </ul>
       )}
      </section>
     </div>
    )}

    {activeTab === 'marketplace' && (
     <div className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-slate-100)] flex items-center justify-center border border-[var(--color-slate-200)] text-primary-500">
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
        </div>
        <div>
         <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Supplier Exchange</h3>
         <span className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase mt-0.5 block">{marketplace.data.length} Products Available</span>
        </div>
       </div>
       <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-650 dark:text-emerald-400">Exchange Active</span>
       </div>
      </div>

      {marketplace.loading ? (
       <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div></div>
      ) : marketplace.error ? (
       <div className="border border-red-200 dark:border-red-800 p-6 rounded-lg text-red-600 dark:text-red-400 text-sm">{marketplace.error}</div>
      ) : (
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {marketplace.data.map(wp => (
         <div key={wp.id} className="group bg-[var(--card-bg)] rounded-2xl border border-[var(--card-border)] p-4 transition-all duration-[var(--nb-duration-fast)] ease-[var(--nb-ease-spring)] flex flex-col justify-between relative overflow-hidden shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:border-[var(--color-primary-500)]/30">
          <div className="absolute top-3 right-3 z-10">
            {wp.available_stock < wp.min_order_qty ? (
             <span className="badge badge-red">Stock Out</span>
            ) : (
             <span className="badge badge-blue">In Stock</span>
            )}
          </div>
          
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] flex items-center justify-center mb-4 min-h-[140px]">
           {wp.product.image ? (
            <img src={getFullImageUrl(wp.product.image)!} alt={wp.product.name} className="object-cover w-full h-full" />
           ) : (
            <div className="flex flex-col items-center">
             <svg className="w-8 h-8 text-[var(--color-slate-300)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
             <span className="text-[10px] text-[var(--color-slate-400)] mt-1.5 font-bold uppercase tracking-widest">No Image</span>
            </div>
           )}
          </div>

          <div className="flex-1 flex flex-col justify-between">
           <div>
            <h4 className="font-bold text-[var(--color-slate-800)] text-xs uppercase tracking-wider line-clamp-2 leading-snug mb-1">{wp.product.name}</h4>
            <p className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase tracking-wider mb-3">{wp.product.brand} &bull; {wp.product.unit}</p>
           </div>
           <div className="pt-3 flex flex-col border-t border-[var(--color-slate-200)]">
            <p className="text-[10px] text-[var(--color-slate-400)] font-semibold line-through">MRP: ₹{wp.mrp}</p>
            <p className="text-base font-bold text-[var(--color-slate-900)] font-mono">₹{wp.wholesale_price} <span className="text-[10px] font-normal text-slate-500 font-sans">/ {wp.product.unit}</span></p>
           </div>
          </div>

          <div className="mt-4 space-y-3">
           <div className="flex items-center justify-between bg-[var(--color-slate-100)] p-1 rounded-lg border border-[var(--color-slate-200)] shadow-inset-tactile">
            <button 
             onClick={() => setQuantities(q => ({ ...q, [wp.id]: Math.max(wp.min_order_qty, (q[wp.id] || wp.min_order_qty) - 1) }))}
             className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[var(--color-slate-200)] transition-all text-slate-500 cursor-pointer"
             disabled={wp.available_stock < wp.min_order_qty}
            >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
            </button>
            <span className="text-xs font-bold text-[var(--color-slate-800)] font-mono">{quantities[wp.id] || wp.min_order_qty}</span>
            <button 
             onClick={() => setQuantities(q => ({ ...q, [wp.id]: Math.min(wp.available_stock, (q[wp.id] || wp.min_order_qty) + 1) }))}
             className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[var(--color-slate-200)] transition-all text-slate-500 cursor-pointer"
             disabled={wp.available_stock < wp.min_order_qty}
            >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
            </button>
           </div>

           <button
            disabled={addingToCart === wp.id || wp.available_stock < wp.min_order_qty}
            onClick={() => handleAddToCart(wp.id)}
            className="w-full btn-tactile-orange py-2 text-xs font-bold uppercase tracking-wider shadow-tactile-primary cursor-pointer"
           >
            {addingToCart === wp.id ? 'Adding...' : 'Add to Cargo'}
           </button>
           <div className="flex justify-between items-center text-[10px] text-[var(--color-slate-400)] font-semibold uppercase mt-2 px-1">
             <span>Min: {wp.min_order_qty}</span>
             <span className={wp.available_stock < wp.min_order_qty * 2 ? 'text-red-500 font-bold' : ''}>Stock: {wp.available_stock}</span>
           </div>
          </div>
         </div>
        ))}
       </div>
      )}
     </div>
    )}

    {activeTab === 'cart' && (
     <div className="card bg-[var(--card-bg)] border border-[var(--card-border)] overflow-hidden animate-fade-in shadow-sm rounded-2xl">
      <div className="bg-[var(--color-slate-100)] px-6 py-6 border-b border-[var(--color-slate-200)]">
       <h3 className="text-base font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Cargo Hold</h3>
       <p className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase mt-1">Verify bulk requisitions before checkout.</p>
      </div>

      <div className="p-6">
       {cart.loading ? (
        <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>
       ) : cart.error ? (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-4 rounded text-red-600 dark:text-red-400 text-sm">{cart.error}</div>
       ) : cart.data.items.length === 0 ? (
        <div className="text-center py-24">
         <div className="w-16 h-16 bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[var(--color-slate-400)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
         </div>
         <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Cargo Hold Empty</h4>
         <p className="text-xs text-[var(--color-slate-400)] font-semibold uppercase mt-1">Add items from the marketplace to check out.</p>
         <button 
          onClick={() => navigate('/retailer/dashboard?tab=marketplace')}
          className="mt-6 btn-tactile-orange text-xs font-semibold px-6 py-2.5 rounded-lg shadow-tactile-primary cursor-pointer"
         >
          Browse Marketplace
         </button>
        </div>
       ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-4">
          {cart.data.items.map((item) => (
           <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-[var(--card-bg)] rounded-xl border border-[var(--card-border)] shadow-sm">
            <div className="flex items-center space-x-4">
             <div className="w-14 h-14 bg-[var(--color-slate-100)] rounded-lg flex-shrink-0 border border-[var(--color-slate-200)] overflow-hidden flex items-center justify-center p-1">
              {item.wholesaler_product.product.image ? (
               <img src={getFullImageUrl(item.wholesaler_product.product.image)!} className="object-contain w-full h-full" alt="" />
              ) : (
               <svg className="w-6 h-6 text-slate-350" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
              )}
             </div>
             <div className="min-w-0">
              <h4 className="font-bold text-[var(--color-slate-800)] text-xs uppercase tracking-wide truncate">{item.wholesaler_product.product.name}</h4>
              <p className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase tracking-wider">{item.wholesaler_product.product.brand}</p>
              <p className="text-xs font-bold text-[var(--color-primary-500)] mt-1 font-mono">₹{item.unit_price_snapshot} / {item.wholesaler_product.product.unit}</p>
             </div>
            </div>
            <div className="flex items-center space-x-6 w-full sm:w-auto justify-between sm:justify-end">
             <div className="flex items-center bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] rounded-lg p-1 shadow-sm shadow-inset-tactile">
              <button 
               onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
               className="w-7 h-7 flex items-center justify-center hover:bg-[var(--color-slate-200)] rounded-md text-slate-500 active:scale-95 cursor-pointer"
              >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
              </button>
              <span className="w-8 text-center text-xs font-bold text-[var(--color-slate-800)] font-mono">{item.quantity}</span>
              <button 
               onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
               className="w-7 h-7 flex items-center justify-center hover:bg-[var(--color-slate-200)] rounded-md text-slate-500 active:scale-95 cursor-pointer"
              >
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              </button>
             </div>
             <div className="text-right min-w-[100px]">
              <p className="text-sm font-bold text-[var(--color-slate-900)] font-mono">₹{(item.quantity * item.unit_price_snapshot).toFixed(2)}</p>
              <button 
               onClick={() => handleUpdateCartQty(item.id, 0)}
               className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors mt-1 uppercase tracking-wider cursor-pointer"
              >
               Remove
              </button>
             </div>
            </div>
           </div>
          ))}
         </div>

         <div className="bg-[var(--color-slate-100)] p-6 rounded-2xl border border-[var(--color-slate-200)] h-fit shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)] mb-4 pb-2 border-b border-[var(--color-slate-200)]">
           Order Summary
          </h4>
          <div className="space-y-4 mb-6">
           <div className="flex justify-between text-xs font-semibold text-[var(--color-slate-500)]">
            <span>Subtotal</span>
            <span className="text-[var(--color-slate-800)] font-bold font-mono">₹{cartTotal.toFixed(2)}</span>
           </div>
           <div className="flex justify-between text-xs font-semibold text-[var(--color-slate-500)]">
            <span>Shipping</span>
            <span className="text-emerald-500 font-bold uppercase tracking-wider">Free / Optimized</span>
           </div>
           <div className="pt-4 border-t border-[var(--color-slate-200)] flex justify-between items-end">
            <span className="text-xs font-bold text-[var(--color-slate-400)]">Total</span>
            <span className="text-base font-bold text-[var(--color-primary-500)] font-mono">₹{cartTotal.toFixed(2)}</span>
           </div>
          </div>
          <button 
           onClick={() => payCart(cart.data.id)}
           disabled={paymentLoading || !cart.data.items?.length}
           className="w-full btn-tactile-orange py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-tactile-primary cursor-pointer disabled:opacity-50"
          >
           {paymentLoading ? (
            <>
             <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
             Processing...
            </>
           ) : (
            <>
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
             </svg>
             Pay ₹{cartTotal.toLocaleString('en-IN')}
            </>
           )}
          </button>

          <p className="text-[10px] text-slate-400 mt-4 text-center">Fulfillment terms are governed by Wholesaler agreements.</p>
         </div>
        </div>
       )}
      </div>
     </div>
    )}

    {activeTab === 'inventory' && (
     <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap justify-between items-center mb-2 gap-4">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] flex items-center justify-center text-primary-500">
         <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
        </div>
        <div>
         <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Current Shelf Inventory</h3>
         <span className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase mt-0.5 block">{inventory.data.length} Items Listed</span>
        </div>
       </div>
       <button
        onClick={() => setShowAddInventory(true)}
        className="btn-tactile-indigo text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-lg flex items-center gap-2 shadow-tactile-indigo cursor-pointer"
       >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        Add Item
       </button>
      </div>

      <div className="dash-section border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm overflow-hidden rounded-2xl">
       <div className="overflow-x-auto">
        <table className="min-w-full premium-table">
         <thead>
          <tr className="border-b border-[var(--color-slate-200)]">
           <th className="text-left">Product</th>
           <th className="text-left">Category</th>
           <th className="text-left">Stock</th>
           <th className="text-left">Reorder Level</th>
           <th className="text-left">Status</th>
          </tr>
         </thead>
         <tbody className="divide-y divide-[var(--color-slate-200)]">
          {inventory.data.filter(item => Number(item.current_stock) > 0).length === 0 ? (
           <tr>
            <td colSpan={5} className="px-6 py-12 text-center">
             <div className="w-12 h-12 bg-[var(--color-slate-100)] rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
             </div>
             <p className="text-xs font-bold uppercase text-[var(--color-slate-800)]">No Active Inventory</p>
             <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">Initiate a purchase or manually add items to stock your shelf.</p>
            </td>
           </tr>
          ) : inventory.data.filter(item => Number(item.current_stock) > 0).map((item) => (
           <tr key={item.id} className="hover:bg-[var(--color-slate-100)] transition-all group">
            <td className="px-6 py-4 whitespace-nowrap">
             <div className="flex items-center">
              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-[var(--color-slate-100)] p-1 border border-[var(--color-slate-200)] flex items-center justify-center">
               <img 
                src={getFullImageUrl(item.product.image || null) || `https://ui-avatars.com/api/?name=${item.product.name}&background=random`} 
                className="h-full w-full object-contain rounded" 
                alt={item.product.name} 
               />
              </div>
              <div className="ml-3 text-left">
               <div className="text-xs font-bold uppercase tracking-wider text-[var(--color-slate-800)]">{item.product.name}</div>
               <div className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase mt-0.5">{item.product.brand}</div>
              </div>
             </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-left">
             <span className="badge badge-blue">{item.product.category?.name || 'GENERIC'}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-left">
             <div className="text-xs font-bold text-[var(--color-slate-800)] font-mono">{item.current_stock} <span className="text-[10px] text-[var(--color-slate-400)] font-normal font-sans lowercase">{item.product.unit}</span></div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 text-left">
             {editingInventoryId === item.id ? (
              <div className="flex items-center space-x-2">
               <input 
                type="number"
                className="w-16 bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] rounded-md px-2 py-1 text-xs font-bold text-[var(--color-slate-800)] focus:border-primary-500 focus:outline-none font-mono"
                value={editingThresholdValue}
                onChange={(e) => setEditingThresholdValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                 if (e.key === 'Enter') handleUpdateThreshold(item.id, parseInt(editingThresholdValue));
                 if (e.key === 'Escape') setEditingInventoryId(null);
                }}
               />
               <button 
                onClick={() => handleUpdateThreshold(item.id, parseInt(editingThresholdValue))}
                disabled={updatingThreshold}
                className="p-1 text-emerald-500 hover:text-emerald-600 transition-colors"
               >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
               </button>
               <button 
                onClick={() => setEditingInventoryId(null)}
                className="p-1 text-red-500 hover:text-red-600 transition-colors"
               >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
              </div>
             ) : (
              <div 
               className="flex items-center space-x-1.5 cursor-pointer group/threshold"
               onClick={() => {
                setEditingInventoryId(item.id);
                setEditingThresholdValue(item.reorder_level.toString());
               }}
              >
               <span className="font-bold text-[var(--color-slate-700)] group-hover:text-[var(--color-primary-500)] transition-colors">{item.reorder_level} {item.product.unit}</span>
               <svg className="w-3.5 h-3.5 opacity-0 group-hover/threshold:opacity-100 transition-opacity text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </div>
             )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-left">
             {parseFloat(item.current_stock.toString()) <= parseFloat(item.reorder_level.toString()) ? (
              <span className="badge badge-red">CRITICAL</span>
             ) : (
              <span className="badge badge-green">OPTIMAL</span>
             )}
            </td>
           </tr>
          ))}
         </tbody>
        </table>
       </div>
      </div>
     </div>
    )}

    {activeTab === 'ledger' && (
     <div className="animate-fade-in space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--color-slate-100)] border border-[var(--color-slate-200)] flex items-center justify-center text-primary-500">
         <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
        </div>
        <div>
         <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Outstanding Balances</h3>
         <p className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase mt-0.5">Financial reconciliation and credit lines</p>
        </div>
       </div>
       <div className="flex items-center space-x-4">
        <div className="card bg-[var(--card-bg)] border border-[var(--card-border)] p-4 min-w-[200px] shadow-sm text-left rounded-2xl">
         <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-slate-400)] block mb-1">Total Outstanding</span>
         <span className="text-xl font-bold text-rose-500 font-mono">₹{orders.data.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}</span>
        </div>
       </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
       {orders.data.filter(o => o.amount_due > 0).length === 0 ? (
        <div className="card p-12 text-center bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-250 dark:border-emerald-500/20 shadow-sm shadow-tactile-emerald rounded-2xl">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          </div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Zero Liability</h4>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-semibold">All credit lines settled. Supply chain health is optimal.</p>
        </div>
       ) : (
        orders.data.filter(o => o.amount_due > 0).map(order => (
         <div key={order.id} className="card bg-[var(--card-bg)] border border-[var(--card-border)] p-6 hover:border-rose-350 transition-all relative overflow-hidden shadow-sm rounded-2xl">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-2 text-left">
           <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-500 border border-rose-250 dark:border-rose-500/20">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
            </div>
            <div>
             <div className="flex items-center space-x-3 mb-1">
              <span className="text-sm font-bold text-[var(--color-slate-800)]">Order #{order.order_number}</span>
              <span className="badge badge-red text-[9px] font-bold">OUTSTANDING</span>
             </div>
             <p className="text-[10px] text-[var(--color-slate-400)] font-semibold uppercase">Due Date: <span className="text-rose-500 font-mono font-bold">{order.due_date || 'Immediate'}</span></p>
            </div>
           </div>

           <div className="flex flex-wrap items-center gap-8 lg:gap-12">
            <div className="text-right">
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-0.5">Total Liability</span>
             <span className="text-xs font-semibold text-[var(--color-slate-800)] font-mono">₹{order.total_amount}</span>
            </div>
            <div className="text-right">
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-0.5">Paid</span>
             <span className="text-xs font-semibold text-emerald-500 font-mono">₹{order.amount_paid}</span>
            </div>
            <div className="text-right">
             <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase tracking-wider block mb-0.5">Balance Due</span>
             <span className="text-sm font-bold text-rose-500 font-mono">₹{order.amount_due}</span>
            </div>
            <button 
             onClick={() => payLedger(Number(order.amount_due), order.id)}
             disabled={paymentLoading || Number(order.amount_due) <= 0}
             className="btn-tactile-emerald text-xs font-bold uppercase tracking-wider px-4 py-2 flex items-center group shadow-tactile-emerald cursor-pointer disabled:opacity-50"
            >
             {paymentLoading ? 'Opening payment...' : `Pay ₹${Number(order.amount_due).toLocaleString('en-IN')}`}
             <svg className="w-3.5 h-3.5 ml-2 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            </button>
           </div>
          </div>
         </div>
        ))
       )}
      </div>
     </div>
    )}

    {activeTab === 'sales' && (
     <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
       <div className="tab-bar">
        <button 
         onClick={() => navigate('/sales/record')}
         className={`tab-pill ${salesSubTab === 'record' ? 'bg-emerald-500 text-white shadow-tactile-emerald font-semibold' : 'bg-slate-100 hover:bg-slate-200 text-slate-650'}`}
        >
         Record Sale
        </button>
        <button 
         onClick={() => navigate('/sales/history')}
         className={`tab-pill ${salesSubTab === 'history' ? 'bg-emerald-500 text-white shadow-tactile-emerald font-semibold' : 'bg-slate-100 hover:bg-slate-200 text-slate-650'}`}
        >
         Sales History
        </button>
       </div>
       {salesSubTab === 'record' && saleItems.length > 0 && (
        <button 
         onClick={handleRecordSale}
         disabled={isRecordingSale}
         className="btn-tactile-emerald text-xs font-semibold px-4 py-2 flex items-center disabled:opacity-50 shadow-tactile-emerald cursor-pointer"
        >
         {isRecordingSale ? 'Processing...' : 'Generate Bill'}
         <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
        </button>
       )}
      </div>

      {salesSubTab === 'record' ? (
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        <div className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl">
         <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)] mb-4">Item Entry</h4>
         <div className="space-y-4">
          <div>
           <label className="block text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mb-1.5">Select Product</label>
           <select 
            className="input-field"
            id="sale-product-select"
            defaultValue="0"
           >
            <option value="0" disabled className="text-slate-500 bg-slate-50">Select from inventory...</option>
            {inventory.data.map(item => (
             <option key={item.id} value={item.product.id} className="text-slate-800 bg-slate-50">{item.product.name} ({item.current_stock} available)</option>
            ))}
           </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
           <div>
            <label className="block text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mb-1.5">Quantity Sold</label>
            <input 
             type="number"
             className="input-field"
             placeholder="Qty..."
             id="sale-qty-input"
            />
           </div>
           <div>
            <label className="block text-xs font-semibold text-[var(--color-slate-400)] uppercase tracking-wider mb-1.5">Unit Price (₹)</label>
            <input 
             type="number"
             className="input-field"
             placeholder="Price..."
             id="sale-price-input"
            />
           </div>
          </div>
          <button 
           onClick={() => {
            const pSelect = document.getElementById('sale-product-select') as HTMLSelectElement;
            const qInput = document.getElementById('sale-qty-input') as HTMLInputElement;
            const prInput = document.getElementById('sale-price-input') as HTMLInputElement;
            const pid = parseInt(pSelect.value);
            const qty = parseFloat(qInput.value);
            const price = parseFloat(prInput.value);
            if (pid > 0 && qty > 0 && price >= 0) {
             setSaleItems([...saleItems, { product: pid, quantity_sold: qty, unit_price: price }]);
             qInput.value = '';
             prInput.value = '';
            }
           }}
           className="btn-tactile-emerald w-full py-2.5 text-xs font-bold uppercase tracking-wider shadow-tactile-emerald cursor-pointer"
          >
           Add to Bill
          </button>
         </div>
        </div>

        <div className="dash-section p-6 border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm rounded-2xl">
         <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--color-slate-800)] mb-4 flex items-center justify-between">
          <span>Bill Preview</span>
          <span className="badge badge-green text-[9px] font-bold">{saleItems.length} Items</span>
         </h4>
         <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
          {saleItems.length === 0 ? (
           <div className="py-12 text-center">
            <p className="text-emerald-600/70 dark:text-emerald-400/70 text-xs font-medium italic">No items added to current session</p>
           </div>
          ) : (
           saleItems.map((si, idx) => {
            const p = inventory.data.find(inv => inv.product.id === si.product)?.product;
            return (
             <div key={idx} className="flex justify-between items-center bg-[var(--color-slate-100)] p-3 rounded-xl border border-[var(--color-slate-200)]">
              <div>
               <div className="text-xs font-bold uppercase tracking-wide text-emerald-950 dark:text-emerald-50">{p?.name || 'Unknown Product'}</div>
               <div className="text-[10px] text-emerald-700/60 dark:text-emerald-300/60 mt-0.5">QTY: {si.quantity_sold} × ₹{si.unit_price} </div>
              </div>
              <div className="flex items-center space-x-3">
               <div className="text-xs font-bold text-primary-600 dark:text-primary-500 font-mono">₹{(si.quantity_sold * si.unit_price).toFixed(2)}</div>
               <button 
                onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}
                className="text-red-500 hover:text-red-650 p-1 transition-colors cursor-pointer"
               >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
               </button>
              </div>
             </div>
            );
           })
          )}
         </div>
        </div>
       </div>
      ) : (
       <div className="dash-section border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm overflow-hidden rounded-2xl text-left">
        <div className="overflow-x-auto">
         <table className="min-w-full premium-table">
          <thead>
           <tr className="border-b border-[var(--color-slate-200)]">
            <th className="text-left">Sale ID</th>
            <th className="text-left">Date</th>
            <th className="text-left">Items</th>
            <th className="text-left">Total Amount</th>
            <th className="text-left">Invoice #</th>
            <th className="text-right">Action</th>
           </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-slate-200)]">
           {sales.loading ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-500">Loading history...</td></tr>
           ) : sales.data.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-slate-500 italic">No sales transactions recorded yet</td></tr>
           ) : (
            sales.data.map(sale => (
             <tr key={sale.id} className="hover:bg-[var(--color-slate-100)] transition-colors">
              <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-emerald-950 dark:text-emerald-50">#{sale.id}</td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(sale.sale_date).toLocaleDateString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-emerald-900 dark:text-emerald-100 font-semibold">{sale.total_items} units</td>
              <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-emerald-600 dark:text-emerald-500 font-mono">₹{sale.total_amount}</td>
              <td className="px-4 py-3 whitespace-nowrap">
               <span className="badge badge-blue">{sale.invoice_number}</span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-xs">
               <button 
                onClick={() => setShowInvoice(sale)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-500 transition-colors cursor-pointer"
               >
                View Invoice
               </button>
              </td>
             </tr>
            ))
           )}
          </tbody>
         </table>
        </div>
       </div>
      )}
     </div>
    )}

   </div>

   {/* Add Inventory Modal */}
   {showAddInventory && (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in">
     <div className="flex min-h-full items-center justify-center p-4 sm:p-6" onClick={() => setShowAddInventory(false)}>
      <div 
       className="bg-[var(--card-bg)] rounded-3xl border border-[var(--card-border)] max-w-lg w-full p-6 animate-scale-in relative h-auto overflow-hidden shadow-xl"
       onClick={(e) => e.stopPropagation()}
      >
       <div className="flex justify-between items-start mb-6 text-left">
        <div>
         <h3 className="text-base font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Asset Registration</h3>
         <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Manually log physical inventory for AI synchronization and supply chain tracking.</p>
        </div>
        <button
         onClick={() => setShowAddInventory(false)}
         className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-[var(--color-slate-100)] rounded-lg transition-colors cursor-pointer"
        >
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
       </div>

       <div className="grid grid-cols-1 gap-4 text-left">
        {/* Product Selection */}
        <div>
         <label className="block text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider mb-1.5">Select Asset Reference</label>
         <select 
          className="input-field"
          value={newInventoryItem.productId}
          onChange={(e) => setNewInventoryItem({ ...newInventoryItem, productId: parseInt(e.target.value) })}
         >
          <option value="0">Initialize asset from catalog...</option>
          {products.data.map(p => (
           <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
          ))}
         </select>
         <p className="mt-1.5 text-[9px] text-[var(--color-slate-450)] font-semibold uppercase">Reference the exact product name and brand for accurate AI trend prediction.</p>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-2 gap-4">
         <div>
          <label className="block text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider mb-1.5">Stock Volume</label>
          <div className="relative">
           <input 
            type="number"
            className="input-field pr-12"
            value={newInventoryItem.currentStock}
            onChange={(e) => setNewInventoryItem({ ...newInventoryItem, currentStock: parseInt(e.target.value) })}
           />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--color-slate-400)] uppercase">Units</span>
          </div>
         </div>
         <div>
          <label className="block text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider mb-1.5">Supply Floor</label>
          <div className="relative">
           <input 
            type="number"
            className="input-field pr-10"
            value={newInventoryItem.reorderLevel}
            onChange={(e) => setNewInventoryItem({ ...newInventoryItem, reorderLevel: parseInt(e.target.value) })}
           />
           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[var(--color-slate-400)] uppercase">Min</span>
          </div>
         </div>
         <p className="col-span-2 text-[9px] text-[var(--color-slate-450)] font-semibold uppercase">Supply floor sets the threshold for critical low-stock intelligence triggers.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--color-slate-200)] mt-2">
         <button 
          onClick={() => setShowAddInventory(false)}
          className="btn-secondary text-xs font-semibold px-4 py-2 cursor-pointer"
         >
          Discard Changes
         </button>
         <button 
          disabled={addingItem || newInventoryItem.productId === 0}
          onClick={() => handleAddInventoryItem(newInventoryItem.productId, newInventoryItem.currentStock, newInventoryItem.reorderLevel)}
          className="btn-tactile-indigo text-xs font-bold uppercase tracking-wider px-4 py-2 flex items-center justify-center gap-2 shadow-tactile-indigo cursor-pointer"
         >
          {addingItem ? 'Processing...' : 'Confirm Update'}
         </button>
        </div>
       </div>
      </div>
     </div>
    </div>
   )}

   {/* Invoice Modal */}
   {showInvoice && (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowInvoice(null)}>
     <div 
      className="rounded-3xl shadow-xl max-w-md w-full animate-scale-in overflow-y-auto bg-[var(--card-bg)] border border-[var(--card-border)] p-6"
      style={{maxHeight: '90vh'}}
      onClick={(e) => e.stopPropagation()}
     >
      {/* Header */}
      <div className="flex justify-between items-start mb-6 text-left">
       <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-slate-800)]">Tax Invoice</h3>
        <p className="text-[10px] text-slate-400 font-semibold mt-0.5 font-mono">{showInvoice.invoice_number}</p>
       </div>
       <div className="flex items-center space-x-3">
        <div className="text-right">
         <div className="text-[9px] text-[var(--color-slate-400)] font-bold uppercase">Date</div>
         <div className="text-xs font-bold text-[var(--color-slate-850)] font-mono">{new Date(showInvoice.sale_date).toLocaleDateString()}</div>
        </div>
        <button 
         onClick={() => setShowInvoice(null)}
         className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-[var(--color-slate-100)] rounded-lg transition-colors cursor-pointer"
        >
         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
       </div>
      </div>

      <div className="space-y-4 text-left">
       {/* Items */}
       <div>
        <div className="text-[10px] font-bold text-[var(--color-slate-400)] uppercase tracking-wider mb-2">Sold Items</div>
        <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
         {showInvoice.items.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center py-2.5 px-3 rounded-xl border border-[var(--color-slate-200)] bg-[var(--color-slate-100)] shadow-sm">
           <div>
            <span className="text-xs font-bold uppercase text-[var(--color-slate-800)] block">{item.product_name}</span>
            <span className="text-[10px] text-[var(--color-slate-450)] font-semibold">{item.quantity_sold} × ₹{item.unit_price}</span>
           </div>
           <span className="text-xs font-bold text-[var(--color-slate-900)] font-mono">₹{item.line_total}</span>
          </div>
         ))}
        </div>
       </div>

       {/* Total */}
       <div className="p-3 rounded-xl border border-[var(--color-slate-200)] bg-[var(--color-slate-100)] flex justify-between items-center text-xs shadow-sm">
        <span className="text-[10px] text-[var(--color-slate-400)] font-bold uppercase">Total Quantity</span>
        <span className="font-bold text-[var(--color-slate-800)] font-mono">{showInvoice.total_items} units</span>
       </div>
       <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 flex justify-between items-center shadow-sm">
        <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase">Grand Total</span>
        <span className="text-xl font-bold text-emerald-650 dark:text-emerald-450 font-mono">₹{showInvoice.total_amount}</span>
       </div>

       {/* Close Button */}
       <button 
        onClick={() => setShowInvoice(null)}
        className="btn-secondary w-full py-2 text-xs font-semibold justify-center cursor-pointer"
       >
        Close Invoice
       </button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}
