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
  payOutstanding,
  getPaymentHistory,
  createSale,
  getSalesHistory,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
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
  AppNotification,
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'marketplace' | 'cart' | 'inventory' | 'ledger' | 'sales'>('dashboard');
  const [salesSubTab, setSalesSubTab] = useState<'record' | 'history'>('record');
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [editingInventoryId, setEditingInventoryId] = useState<number | null>(null);
  const [editingThresholdValue, setEditingThresholdValue] = useState<string>('');
  const [updatingThreshold, setUpdatingThreshold] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [reorderingId, setReorderingId] = useState<number | null>(null);
  const [reorderSuccessId, setReorderSuccessId] = useState<number | null>(null);
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/sales/record') {
      setActiveTab('sales');
      setSalesSubTab('record');
    } else if (location.pathname === '/sales/history') {
      setActiveTab('sales');
      setSalesSubTab('history');
    } else if (location.pathname.startsWith('/retailer/dashboard')) {
      setActiveTab('dashboard');
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

  const notificationsLoader = useMemo(
    () => () => (accessToken ? getNotifications(accessToken) : Promise.resolve<AppNotification[]>([])),
    [accessToken],
  );
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

  const notificationsState = useDashboardData<AppNotification[]>([], notificationsLoader);
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
        setActiveTab('cart');
      }, 1200);
    } catch (e: any) {
      alert('Failed to add to cart: ' + e.message);
    } finally {
      setReorderingId(null);
    }
  }

  const handleCheckout = () => {
    navigate('/checkout/payment');
  };

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

  const handleMarkNotificationRead = async (id: number) => {
    if (!accessToken) return;
    try {
      await markNotificationRead(accessToken, id);
      notificationsState.mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!accessToken) return;
    try {
      await markAllNotificationsRead(accessToken);
      notificationsState.mutate();
    } catch (e) {
      console.error(e);
    }
  };

  const cartTotal = useMemo(() => {
    return cart.data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price_snapshot), 0);
  }, [cart.data.items]);

  // Error parsing helper
  const renderError = (err: any) => {
    if (!err) return null;
    const msg = typeof err === 'string' ? err : (err.detail || err.message || "Protocol transmission interrupted. Please sync again.");
    return (
      <div className="flex items-center space-x-3 text-red-500 font-black uppercase tracking-widest text-[10px] animate-pulse bg-red-500/5 p-4 rounded-2xl border border-red-500/10">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>{msg}</span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between mb-8 gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-1.5 h-9 rounded-full bg-gradient-to-b from-orange-400 to-orange-700 shadow-md shadow-orange-500/40 flex-shrink-0" />
            <h2 className="text-2xl font-black text-slate-800 sm:text-3xl uppercase tracking-tighter">
              Retailer Portal
            </h2>
          </div>
          <p className="text-sm text-slate-400 font-medium ml-5">
            Manage inventory, optimize ordering, and receive SmartStock AI insights.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button onClick={() => { setActiveTab('dashboard'); navigate('/retailer/dashboard'); }} className={`tab-pill${activeTab === 'dashboard' ? ' active' : ''}`}>
            Dashboard
          </button>
          <button onClick={() => { setActiveTab('marketplace'); navigate('/retailer/dashboard'); }} className={`tab-pill${activeTab === 'marketplace' ? ' active' : ''}`}>
            Marketplace
          </button>
          <button onClick={() => { setActiveTab('cart'); navigate('/retailer/dashboard'); }} className={`tab-pill${activeTab === 'cart' ? ' active' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            Cart {cart.data.items.length > 0 && <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-[9px]">{cart.data.items.length}</span>}
          </button>
          <button onClick={() => { setActiveTab('inventory'); navigate('/retailer/dashboard'); }} className={`tab-pill${activeTab === 'inventory' ? ' active' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            Inventory
          </button>
          <button onClick={() => { setActiveTab('ledger'); navigate('/retailer/dashboard'); }} className={`tab-pill${activeTab === 'ledger' ? ' active' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            Ledger
          </button>
          <button onClick={() => navigate('/sales/record')} className={`tab-pill${activeTab === 'sales' ? ' active' : ''}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Sales
          </button>
          
          {/* Notifications Bell */}
          <div className="relative z-50">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center glass text-slate-400 border-none hover:bg-white/5 relative"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {notificationsState.data.filter(n => !n.read_at).length > 0 && (
                <span className="absolute top-1 right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white bg-red-500 rounded-full ring-2 ring-slate-900">{notificationsState.data.filter(n => !n.read_at).length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 border border-white/10 overflow-hidden text-left bg-[#0f172a] backdrop-blur-xl">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Notifications</h3>
                  {notificationsState.data.filter(n => !n.read_at).length > 0 && (
                    <button onClick={handleMarkAllNotificationsRead} className="text-[10px] text-primary-400 hover:text-primary-300 font-bold uppercase tracking-widest">Mark All Read</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notificationsState.data.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 italic text-center">No notifications yet</p>
                  ) : (
                    notificationsState.data.slice(0, 20).map(note => (
                      <div key={note.id} className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/10 ${note.read_at ? 'opacity-60 bg-transparent' : 'bg-primary-500/10'}`} onClick={() => !note.read_at && handleMarkNotificationRead(note.id)}>
                        <h4 className="text-sm font-bold text-white mb-1">{note.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{note.body}</p>
                        <span className="text-[10px] text-slate-500 mt-2 block tracking-widest uppercase">{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Financial Overview KPIs */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
            {/* Monthly Sales */}
            <div className="kpi-card stagger-1 animate-fade-in" style={{'--kpi-accent': 'linear-gradient(90deg,#ff6b00,#ea580c)'} as React.CSSProperties}>
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/15">Revenue</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 relative z-10">Monthly Sales</p>
              <p className="stat-value text-slate-800 relative z-10">₹{kpis.data?.total_sales_revenue?.toLocaleString() || 0}</p>
            </div>
            {/* Orders This Month */}
            <div className="kpi-card stagger-2 animate-fade-in" style={{'--kpi-accent': 'linear-gradient(90deg,#3b82f6,#2563eb)'} as React.CSSProperties}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                </div>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 relative z-10">Orders This Month</p>
              <p className="stat-value text-slate-800 relative z-10">{kpis.data?.orders_this_month || 0}</p>
            </div>
            {/* Outstanding Credit */}
            <div className="kpi-card stagger-3 animate-fade-in" style={{'--kpi-accent': 'linear-gradient(90deg,#ef4444,#dc2626)'} as React.CSSProperties}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                {(kpis.data?.outstanding_credit ?? 0) > 0 && <span className="text-[9px] font-black uppercase tracking-wider text-red-400 bg-red-400/10 px-2 py-1 rounded-full border border-red-400/15 animate-pulse-slow">Due</span>}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 relative z-10">Outstanding Credit</p>
              <p className="stat-value text-red-400 relative z-10">₹{kpis.data?.outstanding_credit?.toLocaleString() || 0}</p>
            </div>
            {/* Low Stock Items */}
            <div className="kpi-card stagger-4 animate-fade-in" style={{'--kpi-accent': 'linear-gradient(90deg,#f59e0b,#d97706)'} as React.CSSProperties}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/6 to-transparent rounded-[1.25rem] pointer-events-none" />
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                {(kpis.data?.low_stock_count ?? 0) > 0 && <span className="text-[9px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-1 rounded-full border border-amber-400/15 animate-pulse-slow">Alert</span>}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 relative z-10">Low Stock Items</p>
              <p className={`stat-value relative z-10 ${(kpis.data?.low_stock_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-800'}`}>{kpis.data?.low_stock_count || 0}</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
            {/* Sales Trend Chart */}
            <div className="dash-section p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sales Trend (30 Days)</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickFormatter={(tick) => {try {return new Date(tick).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} catch(e) {return tick}}} />
                    <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px', fontWeight: 'bold' }}
                      labelFormatter={(label) => {try {return new Date(label).toLocaleDateString()} catch(e) {return label}}}
                    />
                    <Area type="monotone" dataKey="total_revenue" name="Revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Levels Chart */}
            <div className="dash-section p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Critical Inventory Levels</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryLevels.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px', fontWeight: 'bold', color: 'black' }}
                      cursor={{fill: '#334155', opacity: 0.4}}
                    />
                    <Bar dataKey="current_stock" name="Current Stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="reorder_level" name="Reorder Level" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SmartStock AI Block — Real-Time Insights with Reorder Now */}
          <section className="lg:col-span-3 relative overflow-hidden rounded-2xl p-6 text-white shadow-2xl group border border-white/8" style={{background: 'linear-gradient(135deg, #1c0f0a 0%, #0c0c0e 60%, #0f172a 100%)'}}>
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-blue-500/5 pointer-events-none" />
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-orange-500/15 rounded-full blur-3xl group-hover:bg-orange-500/25 transition-all duration-700" />
            <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-primary-600/10 rounded-full blur-2xl" />
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shadow-inner">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 className="text-base font-black text-white uppercase tracking-widest">Smart Stock Assistant</h3>
              </div>
              <button
                onClick={handleGenerateInsights}
                className="text-[10px] bg-white/8 hover:bg-white/15 px-4 py-2 rounded-full border border-white/15 transition-all font-black uppercase tracking-widest flex items-center gap-1.5 text-white/80 hover:text-white"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Update Alerts
              </button>
            </div>
            {realtimeInsights.loading ? (
              <p className="text-sm text-primary-200 animate-pulse relative z-10 font-medium italic">Checking your stock levels...</p>
            ) : realtimeInsights.error ? (
              renderError(realtimeInsights.error)
            ) : realtimeInsights.data.filter(i => i.alert_level !== 'ok' && i.alert_level !== 'no_data').length === 0 ? (
              <p className="text-base text-primary-200 relative z-10 font-medium italic opacity-60">Everything is in stock. Your store is ready to sell!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {realtimeInsights.data
                  .filter(i => i.alert_level !== 'ok' && i.alert_level !== 'no_data')
                  .slice(0, 6)
                  .map((insight) => (
                    <div key={insight.product_id} className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all group/item flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                          insight.alert_level === 'critical' ? 'bg-red-500/30 text-red-300 border border-red-500/40 animate-pulse' :
                          insight.alert_level === 'warning' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                          'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        }`}>
                          {insight.alert_level.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                          {insight.days_to_stockout !== null ? `${insight.days_to_stockout}d left` : 'below min'}
                        </span>
                      </div>
                      <div className="font-black text-white text-sm leading-tight uppercase tracking-tighter mb-1">
                        {insight.product}
                      </div>
                      <div className="text-xs text-slate-300 mt-1 opacity-80 leading-relaxed font-medium italic flex-1">
                        {insight.message}
                      </div>
                      {insight.action && (
                        <div className="mt-4 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                              via {insight.action.supplier_name}
                            </span>
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                              ₹{insight.action.price}/unit
                            </span>
                          </div>
                          <button
                            id={`reorder-btn-${insight.product_id}`}
                            onClick={() => handleReorderNow(insight)}
                            disabled={reorderingId === insight.product_id}
                            className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                              reorderSuccessId === insight.product_id
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-primary-600 text-white hover:bg-primary-500 shadow-xl shadow-primary-600/20 disabled:opacity-60'
                            }`}
                          >
                            {reorderSuccessId === insight.product_id ? (
                              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> Added to Cart</>
                            ) : reorderingId === insight.product_id ? (
                              <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin"/> Adding...</>
                            ) : (
                              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg> Reorder Now ({insight.action.quantity} units)</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </section>

          <section className="dash-section p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/6">
              <div className="w-8 h-8 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Low Stock Warnings</h3>
            </div>
            {inventory.loading ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Checking Stock...</p>
            ) : inventory.error ? (
              renderError(inventory.error)
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-12 glass rounded-3xl border-none">
                <svg className="mx-auto h-12 w-12 text-slate-500 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40 italic">No low stock items found</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="py-3 flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-primary-600 transition-colors">{item.product.name}</p>
                      <p className="text-xs text-slate-400">Reorder Level: {item.reorder_level}</p>
                    </div>
                    <span className="badge badge-red font-black">
                      {item.current_stock} {item.product.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dash-section p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/6">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Recent Orders</h3>
            </div>
            {orders.loading ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Loading Orders...</p>
            ) : orders.error ? (
              renderError(orders.error)
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12 glass rounded-3xl border-none">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40 italic">No orders to show</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-4 flex justify-between items-center hover:bg-slate-50/50 transition-colors px-2 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">#{order.order_number}</span>
                      <span className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-tighter">TOTAL: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {order.status === 'dispatched' && (
                        <button
                          onClick={() => handleMarkAsReceived(order.id)}
                          className="px-3 py-1 text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-all shadow-sm flex items-center"
                        >
                          Order Received
                        </button>
                      )}
                      <span className={`badge px-3 py-1 ${order.status === 'delivered' ? 'badge-green' : order.status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>
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
        <div className="dash-section p-8 relative">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/4 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Supplier Marketplace</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{marketplace.data.length} Products Available</span>
              </div>
            </div>
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Exchange Active</span>
            </div>
          </div>

          {marketplace.loading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>
          ) : marketplace.error ? (
            <div className="glass border-red-500/20 p-6 rounded-2xl text-red-400 text-sm font-medium italic">{marketplace.error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {marketplace.data.map(wp => (
                <div key={wp.id} className="group glass rounded-[2rem] p-6 hover:shadow-2xl hover:shadow-primary-500/5 hover:-translate-y-1 transition-all duration-500 flex flex-col relative overflow-hidden border-none bg-white/3">
                  <div className="absolute top-4 right-4 z-10">
                     {wp.available_stock < wp.min_order_qty ? (
                       <span className="badge badge-red shadow-lg">Stock Out</span>
                     ) : (
                       <span className="badge badge-blue shadow-lg">In Stock</span>
                     )}
                  </div>
                  <div className="aspect-w-4 aspect-h-3 w-full overflow-hidden rounded-2xl bg-white/2 flex items-center justify-center mb-6 min-h-[180px] group-hover:scale-105 transition-transform duration-700">
                    {wp.product.image ? (
                      <img src={getFullImageUrl(wp.product.image)!} alt={wp.product.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="flex flex-col items-center opacity-10">
                        <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        <span className="text-[10px] mt-2 font-black uppercase tracking-widest text-white">RETAIL ASSET</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 line-clamp-2 leading-tight group-hover:text-primary-400 transition-colors uppercase tracking-tighter text-sm mb-2">{wp.product.name}</h4>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-l-2 border-primary-500 pl-3 mb-4">{wp.product.brand} • {wp.product.unit}</p>
                    <div className="mt-auto pt-4 flex flex-col border-t border-white/5">
                      <p className="text-[10px] font-bold text-slate-500 line-through mb-1">MRP: ₹{wp.mrp}</p>
                      <p className="text-2xl font-black text-slate-800 tracking-tighter">₹{wp.wholesale_price} <span className="text-[10px] font-bold text-slate-500 lowercase tracking-normal">/ unit</span></p>
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between bg-white/2 p-1.5 rounded-2xl border border-white/5">
                      <button 
                        onClick={() => setQuantities(q => ({ ...q, [wp.id]: Math.max(wp.min_order_qty, (q[wp.id] || wp.min_order_qty) - 1) }))}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-slate-400"
                        disabled={wp.available_stock < wp.min_order_qty}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
                      </button>
                      <span className="text-base font-black text-slate-700">{quantities[wp.id] || wp.min_order_qty}</span>
                      <button 
                        onClick={() => setQuantities(q => ({ ...q, [wp.id]: Math.min(wp.available_stock, (q[wp.id] || wp.min_order_qty) + 1) }))}
                        className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-all text-slate-400"
                        disabled={wp.available_stock < wp.min_order_qty}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>

                    <button
                      disabled={addingToCart === wp.id || wp.available_stock < wp.min_order_qty}
                      onClick={() => handleAddToCart(wp.id)}
                      className="w-full bg-primary-600 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-2xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all disabled:opacity-50 disabled:grayscale">
                      {addingToCart === wp.id ? 'Optimizing...' : 'Add to Cargo'}
                    </button>
                    <div className="flex justify-between items-center text-[10px] uppercase font-black tracking-widest opacity-60 px-2">
                       <span>Min: {wp.min_order_qty}</span>
                       <span className={wp.available_stock < wp.min_order_qty*2 ? 'text-red-400' : ''}>Stock: {wp.available_stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cart' && (
        <div className="card bg-slate-100 shadow-[0_32px_64px_-16px_rgba(0,0,0,1)] border-none overflow-hidden animate-fade-in">
          <div className="bg-slate-50 px-8 py-12 border-b border-white/5 relative overflow-hidden">
            <div className="absolute -left-12 -top-12 w-48 h-48 bg-primary-600/10 rounded-full blur-3xl"></div>
            <h3 className="text-4xl font-black tracking-tighter uppercase text-slate-800 relative z-10">Exchange Cargo</h3>
            <p className="text-slate-400 font-medium mt-2 italic relative z-10">Verify bulk requisitions for final deployment</p>
          </div>

          <div className="p-8">
            {cart.loading ? (
              <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div></div>
            ) : cart.error ? (
              <div className="bg-error-50 border border-error-100 p-4 rounded-xl text-error-600 text-sm">{cart.error}</div>
            ) : cart.data.items.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <h4 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Your cart is empty</h4>
                <p className="text-slate-500 mt-2 text-sm font-medium">Head back to the marketplace to add some inventory.</p>
                <button 
                  onClick={() => setActiveTab('marketplace')}
                  className="mt-8 btn-primary px-8 py-3 rounded-xl uppercase font-black text-[10px] tracking-widest"
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-4">
                  {cart.data.items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-6 p-6 glass rounded-2xl border-none hover:bg-white/5 transition-all group">
                      <div className="w-20 h-20 bg-white/5 rounded-xl flex-shrink-0 border border-white/5 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                        {item.wholesaler_product.product.image ? (
                          <img src={getFullImageUrl(item.wholesaler_product.product.image)!} className="object-contain w-full h-full group-hover:scale-110 transition-transform duration-500" alt="" />
                        ) : (
                          <svg className="w-8 h-8 text-white/10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-black text-slate-800 uppercase tracking-tight truncate mb-1">{item.wholesaler_product.product.name}</h4>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.wholesaler_product.product.brand}</p>
                        <p className="text-sm font-black text-primary-500 mt-2">₹{item.unit_price_snapshot} / unit</p>
                      </div>
                      <div className="flex items-center bg-white/5 border border-white/5 rounded-xl p-1 shadow-lg">
                        <button 
                          onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-slate-400"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
                        </button>
                        <span className="w-10 text-center text-sm font-black text-slate-700">{item.quantity}</span>
                        <button 
                          onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg text-slate-400"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                        </button>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <p className="text-lg font-black text-slate-800 tracking-tighter">₹{(item.quantity * item.unit_price_snapshot).toFixed(2)}</p>
                        <button 
                          onClick={() => handleUpdateCartQty(item.id, 0)}
                          className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors mt-2"
                        >
                          Cancel Line
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="glass rounded-[2rem] p-8 h-fit border-none shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-600 to-transparent"></div>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8 border-b border-white/5 pb-4 flex items-center">
                    Deployment Specs
                  </h4>
                  <div className="space-y-5 mb-10">
                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                      <span>Base Value</span>
                      <span className="text-slate-700 tracking-tighter">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                      <span>Logistics</span>
                      <span className="text-secondary-500 italic">Optimized</span>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Valuation</span>
                      <span className="text-3xl font-black text-primary-500 tracking-tighter shadow-primary-500/20">₹{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full bg-primary-600 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl shadow-2xl shadow-primary-500/30 hover:bg-primary-500 transition-all flex items-center justify-center group"
                  >
                    Confirm Deployment
                    <svg className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7-7 7"></path></svg>
                  </button>
                  <p className="text-[10px] text-slate-500 mt-8 text-center leading-relaxed font-medium italic opacity-60">By confirming, you execute a professional trade agreement. Wholesalers will be prioritized for immediate fulfillment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
              <div className="animate-fade-in space-y-6">
                <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full bg-gradient-to-b from-orange-400 to-orange-700 flex-shrink-0" />
                    <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Current Inventory</h3>
                    <span className="text-[9px] font-black bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-orange-400 uppercase tracking-widest">{inventory.data.length} Items</span>
                  </div>
                  <button
                    onClick={() => setShowAddInventory(true)}
                    className="btn-primary text-[10px] font-black uppercase tracking-widest px-5 py-2.5 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                    Add Item
                  </button>
                </div>

                <div className="dash-section overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full premium-table">
                      <thead>
                        <tr>
                          <th className="text-left">Product</th>
                          <th className="text-left">Category</th>
                          <th className="text-left">Stock</th>
                          <th className="text-left">Reorder Level</th>
                          <th className="text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {inventory.data.filter(item => Number(item.current_stock) > 0).length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-24 text-center">
                               <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                               </div>
                               <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Active Inventory</p>
                               <p className="text-[10px] text-slate-500 font-medium italic mt-1">Initiate a purchase or manually add items to stock your shelf.</p>
                            </td>
                          </tr>
                        ) : inventory.data.filter(item => Number(item.current_stock) > 0).map((item) => (
                          <tr key={item.id} className="hover:bg-white/5 transition-all group">
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-white/5 p-2 border border-white/5 shadow-inner">
                                  <img 
                                    src={getFullImageUrl(item.product.image || null) || `https://ui-avatars.com/api/?name=${item.product.name}&background=random`} 
                                    className="h-full w-full object-contain rounded-lg" 
                                    alt={item.product.name} 
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-black text-slate-800 group-hover:text-primary-400 transition-colors uppercase tracking-tight">{item.product.name}</div>
                                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{item.product.brand}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <span className="badge badge-blue bg-primary-500/10 text-primary-400 border border-primary-500/20">{item.product.category?.name || 'GENERIC'}</span>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              <div className="text-sm font-black text-slate-800">{item.current_stock} <span className="text-[10px] text-slate-500 font-bold lowercase">{item.product.unit}</span></div>
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap text-[10px] text-slate-400 font-black uppercase tracking-widest">
                              {editingInventoryId === item.id ? (
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="number"
                                    className="w-16 bg-slate-50 border border-primary-500/20 rounded-lg px-2 py-1 text-sm font-black text-slate-800 focus:ring-1 focus:ring-primary-500 outline-none"
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
                                    className="p-1 text-emerald-500 hover:text-emerald-400 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                  </button>
                                  <button 
                                    onClick={() => setEditingInventoryId(null)}
                                    className="p-1 text-red-500 hover:text-red-400 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                  </button>
                                </div>
                              ) : (
                                <div 
                                  className="flex items-center space-x-2 cursor-pointer group/threshold"
                                  onClick={() => {
                                    setEditingInventoryId(item.id);
                                    setEditingThresholdValue(item.reorder_level.toString());
                                  }}
                                >
                                  <span>{item.reorder_level} {item.product.unit}</span>
                                  <svg className="w-3 h-3 opacity-0 group-hover/threshold:opacity-100 transition-opacity text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-5 whitespace-nowrap">
                              {parseFloat(item.current_stock.toString()) <= parseFloat(item.reorder_level.toString()) ? (
                                <span className="badge badge-red bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse-slow font-black">CRITICAL</span>
                              ) : (
                                <span className="badge badge-green bg-secondary-500/10 text-secondary-500 border border-secondary-500/20 font-black">OPTIMAL</span>
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
        <div className="animate-fade-in space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-10 rounded-full bg-gradient-to-b from-red-400 to-red-700 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-1">Credit Ledger</h3>
                <p className="text-sm text-slate-400 font-medium">Financial reconciliation and settlement tracking</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="glass p-4 rounded-2xl border-none shadow-xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Outstanding</span>
                <span className="text-4xl font-black text-red-500 tracking-tighter">₹{orders.data.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {orders.data.filter(o => o.amount_due > 0).length === 0 ? (
              <div className="card p-24 text-center bg-slate-100 border-none shadow-2xl">
                 <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </div>
                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Zero Liability</h4>
                 <p className="text-slate-500 mt-2 font-medium italic">All credit lines are settled. Supply chain health is optimal.</p>
              </div>
            ) : (
              orders.data.filter(o => o.amount_due > 0).map(order => (
                <div key={order.id} className="group glass rounded-[2.5rem] p-8 border-none hover:bg-white/5 transition-all shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-red-500/20 group-hover:bg-red-500 transition-all"></div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-inner">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="text-xl font-black text-slate-800 tracking-tighter uppercase">#{order.order_number}</span>
                          <span className="badge badge-red font-black text-[10px] tracking-widest px-3">OUTSTANDING</span>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DUE DATE: <span className="text-red-500">{order.due_date || 'IMMEDIATE'}</span></p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-12">
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 font-bold">Total Liability</span>
                        <span className="text-xl font-black text-slate-800 tracking-tighter italic">₹{order.total_amount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Paid</span>
                        <span className="text-xl font-black text-emerald-500 tracking-tighter">₹{order.amount_paid}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Balance Due</span>
                        <span className="text-3xl font-black text-red-500 tracking-tighter shadow-red-500/20">₹{order.amount_due}</span>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!accessToken) return;
                          try {
                            const payments = await getPaymentHistory(accessToken, order.id);
                            const pendingPayment = payments.find((p: any) => p.status !== 'paid');
                            if (pendingPayment) {
                              const res = await payOutstanding(accessToken, pendingPayment.id);
                              alert(`Settlement successful! Discount applied: ₹${res.discount_applied}`);
                              orders.mutate();
                            } else {
                              alert("Already settled or no payment record found.");
                            }
                          } catch (e: any) {
                            alert(e.message);
                          }
                        }}
                        className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest px-10 py-5 rounded-2xl hover:bg-emerald-600 transition-all shadow-2xl shadow-slate-900/20 flex items-center group"
                      >
                        Settle Line
                        <svg className="w-4 h-4 ml-3 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
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
        <div className="space-y-8 animate-fade-in">
          <div className="flex justify-between items-end mb-8">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit shadow-inner">
              <button 
                onClick={() => navigate('/sales/record')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${salesSubTab === 'record' ? 'bg-white text-primary-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Record Sale
              </button>
              <button 
                onClick={() => navigate('/sales/history')}
                className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${salesSubTab === 'history' ? 'bg-white text-primary-600 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Sales History
              </button>
            </div>
            {salesSubTab === 'record' && saleItems.length > 0 && (
              <button 
                onClick={handleRecordSale}
                disabled={isRecordingSale}
                className="bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center disabled:opacity-50"
              >
                {isRecordingSale ? 'Processing...' : 'Generate Bill'}
                <svg className="w-4 h-4 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </button>
            )}
          </div>

          {salesSubTab === 'record' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="dash-section p-10 rounded-[2.5rem] border border-slate-200">
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8">Item Entry</h4>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Select Product</label>
                    <select 
                      className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 bg-slate-100 text-slate-800 border border-slate-200 focus:outline-none"
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
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Quantity Sold</label>
                      <input 
                        type="number"
                        className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 bg-slate-100 text-slate-800 border border-slate-200 focus:outline-none"
                        placeholder="Qty..."
                        id="sale-qty-input"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Unit Price (₹)</label>
                      <input 
                        type="number"
                        className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary-500 bg-slate-100 text-slate-800 border border-slate-200 focus:outline-none"
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
                    className="w-full text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl transition-all shadow-xl bg-blue-600 hover:bg-blue-700"
                  >
                    Add to Bill
                  </button>
                </div>
              </div>

              <div className="dash-section p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center">
                  Bill Preview
                  <span className="ml-4 px-3 py-1 bg-primary-500/10 rounded-full text-[10px] tracking-widest font-black text-primary-500">{saleItems.length} ITEMS</span>
                </h4>
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {saleItems.length === 0 ? (
                    <div className="py-20 text-center">
                      <p className="text-slate-400 text-sm font-bold uppercase tracking-widest italic opacity-60">No items added to current session</p>
                    </div>
                  ) : (
                    saleItems.map((si, idx) => {
                      const p = inventory.data.find(inv => inv.product.id === si.product)?.product;
                      return (
                        <div key={idx} className="flex justify-between items-center bg-slate-100/50 p-5 rounded-2xl border border-slate-200/50">
                          <div>
                            <div className="text-sm font-black text-slate-800 uppercase tracking-tight">{p?.name || 'Unknown Product'}</div>
                            <div className="text-[10px] font-black text-slate-500 tracking-widest mt-1">QTY: {si.quantity_sold} × ₹{si.unit_price} </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-sm font-black text-primary-400">₹{(si.quantity_sold * si.unit_price).toFixed(2)}</div>
                            <button 
                              onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}
                              className="text-red-400 hover:text-red-500 p-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white overflow-hidden animate-fade-in">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sale ID</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Items</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Amount</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice #</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sales.loading ? (
                    <tr><td colSpan={5} className="px-10 py-20 text-center font-bold text-slate-400">Loading history...</td></tr>
                  ) : sales.data.length === 0 ? (
                    <tr><td colSpan={5} className="px-10 py-20 text-center font-bold text-slate-400 uppercase tracking-widest italic opacity-50">No sales transactions recorded yet</td></tr>
                  ) : (
                    sales.data.map(sale => (
                      <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6 whitespace-nowrap text-sm font-black text-slate-800">#{sale.id}</td>
                        <td className="px-10 py-6 whitespace-nowrap text-sm font-bold text-slate-500">{new Date(sale.sale_date).toLocaleDateString()}</td>
                        <td className="px-10 py-6 whitespace-nowrap text-sm font-black text-slate-800">{sale.total_items} UNITS</td>
                        <td className="px-10 py-6 whitespace-nowrap text-sm font-black text-emerald-600">₹{sale.total_amount}</td>
                        <td className="px-10 py-6 whitespace-nowrap">
                          <span className="badge badge-blue bg-primary-500/10 text-primary-600 border border-primary-500/10 text-[10px] font-black uppercase">{sale.invoice_number}</span>
                        </td>
                        <td className="px-10 py-6 whitespace-nowrap text-right">
                          <button 
                            onClick={() => setShowInvoice(sale)}
                            className="text-[10px] font-black uppercase tracking-widest text-primary-500 hover:text-primary-600 underline underline-offset-4"
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
          )}
        </div>
      )}

      {/* Add Inventory Modal */}
      {showAddInventory && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50/80 backdrop-blur-xl animate-fade-in">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-8" onClick={() => setShowAddInventory(false)}>
            <div 
              className="bg-slate-100 rounded-[3rem] shadow-[0_64px_128px_-24px_rgba(0,0,0,1)] max-w-5xl w-full p-12 animate-scale-in relative h-auto max-h-none overflow-visible border border-white/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-10">
                <div>
                  <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mb-3">Asset Registration</h3>
                  <p className="text-sm text-slate-400 font-medium italic">Manually log physical inventory for AI synchronization and supply chain tracking.</p>
                </div>
                <button
                  onClick={() => setShowAddInventory(false)}
                  className="p-4 bg-white/5 rounded-full text-slate-500 hover:text-white hover:bg-red-500/20 transition-all border border-white/5 group"
                >
                  <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Product Selection Section */}
                <div className="space-y-6">
                  <div className="bg-white/3 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Select Asset Reference</label>
                    <select 
                      className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-base font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all shadow-xl"
                      value={newInventoryItem.productId}
                      onChange={(e) => setNewInventoryItem({ ...newInventoryItem, productId: parseInt(e.target.value) })}
                    >
                      <option value="0">Initialize asset from catalog...</option>
                      {products.data.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>
                      ))}
                    </select>
                    <p className="mt-4 text-[10px] text-slate-500 font-medium leading-relaxed italic opacity-80">Reference the exact product name and brand for accurate AI trend prediction.</p>
                  </div>
                </div>

                {/* Quantities Section */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-8 bg-white/3 p-8 rounded-[2rem] border border-white/5 shadow-inner">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Stock Volume</label>
                      <div className="relative">
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-2xl font-black text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all shadow-xl"
                          value={newInventoryItem.currentStock}
                          onChange={(e) => setNewInventoryItem({ ...newInventoryItem, currentStock: parseInt(e.target.value) })}
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none">Units</span>
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Supply Floor</label>
                      <div className="relative">
                        <input 
                          type="number"
                          className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-2xl font-black text-slate-800 focus:ring-2 focus:ring-primary-500 transition-all shadow-xl"
                          value={newInventoryItem.reorderLevel}
                          onChange={(e) => setNewInventoryItem({ ...newInventoryItem, reorderLevel: parseInt(e.target.value) })}
                        />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase tracking-widest pointer-events-none">Min</span>
                      </div>
                    </div>
                    <p className="col-span-2 text-[10px] text-slate-500 font-medium leading-relaxed italic opacity-80">Supply floor sets the threshold for critical low-stock intelligence triggers.</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="lg:col-span-2 flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-100 mt-2">
                  <button 
                    onClick={() => setShowAddInventory(false)}
                    className="px-8 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all flex-1"
                  >
                    Discard Changes
                  </button>
                  <button 
                    disabled={addingItem || newInventoryItem.productId === 0}
                    onClick={() => handleAddInventoryItem(newInventoryItem.productId, newInventoryItem.currentStock, newInventoryItem.reorderLevel)}
                    className="px-8 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-primary-600 shadow-2xl shadow-slate-900/20 disabled:opacity-50 transition-all flex-[2] flex items-center justify-center gap-2 group"
                  >
                    {addingItem ? 'Processing Reference...' : (
                      <>
                        Confirm Inventory Update
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7-7 7"></path></svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in" onClick={() => setShowInvoice(null)}>
          <div 
            className="rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] max-w-lg w-full animate-scale-in overflow-y-auto bg-slate-100 border border-slate-200"
            style={{maxHeight: '90vh'}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-1">Tax Invoice</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{showInvoice.invoice_number}</p>
              </div>
              <div className="flex items-start space-x-6">
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1 text-slate-400">Date</div>
                  <div className="text-sm font-black text-slate-800">{new Date(showInvoice.sale_date).toLocaleDateString()}</div>
                </div>
                <button 
                  onClick={() => setShowInvoice(null)}
                  className="p-2 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Divider */}
              <div className="border-t border-dashed border-slate-200 mb-8"></div>

              {/* Items */}
              <div className="space-y-4 mb-8">
                <div className="text-[10px] font-black uppercase tracking-widest mb-4 text-slate-400">Sold Items</div>
                {showInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 px-4 rounded-xl bg-slate-50 border border-slate-200">
                    <div>
                      <span className="text-sm font-bold text-slate-800 uppercase tracking-tight block">{item.product_name}</span>
                      <span className="text-[10px] font-black text-slate-500">{item.quantity_sold} × ₹{item.unit_price}</span>
                    </div>
                    <span className="text-sm font-black text-primary-500">₹{item.line_total}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="rounded-2xl p-6 mb-4 flex justify-between items-center bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Quantity</span>
                <span className="text-xl font-black text-slate-800">{showInvoice.total_items} UNITS</span>
              </div>
              <div className="rounded-2xl p-6 mb-8 flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Grand Total</span>
                <span className="text-3xl font-black text-emerald-600">₹{showInvoice.total_amount}</span>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowInvoice(null)}
                className="w-full text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl transition-all bg-slate-800 hover:bg-slate-900 border border-slate-700 hover:border-emerald-500/30"
              >
                ← Back / Close Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
