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
            <div className="w-1 h-6 bg-primary-600 flex-shrink-0" />
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
              Retailer Portal
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-4">
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
            Cart {cart.data.items.length > 0 && <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs">{cart.data.items.length}</span>}
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
              className="px-3 py-1.5 text-sm font-medium rounded transition-all flex items-center bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 relative"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {notificationsState.data.filter(n => !n.read_at).length > 0 && (
                <span className="absolute top-1 right-2 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-500 rounded-full">{notificationsState.data.filter(n => !n.read_at).length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg z-50 border border-slate-200 dark:border-slate-800 overflow-hidden text-left bg-white dark:bg-slate-900">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
                  {notificationsState.data.filter(n => !n.read_at).length > 0 && (
                    <button onClick={handleMarkAllNotificationsRead} className="text-xs text-primary-600 hover:text-primary-500 font-medium">Mark All Read</button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                  {notificationsState.data.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 italic text-center">No notifications yet</p>
                  ) : (
                    notificationsState.data.slice(0, 20).map(note => (
                      <div key={note.id} className={`p-4 border-b border-slate-100 dark:border-slate-800 cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-850 ${note.read_at ? 'opacity-60 bg-transparent' : 'bg-primary-50/50 dark:bg-primary-950/10'}`} onClick={() => !note.read_at && handleMarkNotificationRead(note.id)}>
                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">{note.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{note.body}</p>
                        <span className="text-xs text-slate-400 mt-1.5 block">{new Date(note.created_at).toLocaleString()}</span>
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
            <div className="kpi-card stagger-1 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-850 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                </div>
                <span className="badge badge-green">Revenue</span>
              </div>
              <p className="text-xs font-medium text-slate-500 mb-1">Monthly Sales</p>
              <p className="stat-value text-slate-800 dark:text-slate-100">₹{kpis.data?.total_sales_revenue?.toLocaleString() || 0}</p>
            </div>
            {/* Orders This Month */}
            <div className="kpi-card stagger-2 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-850 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500 mb-1">Orders This Month</p>
              <p className="stat-value text-slate-800 dark:text-slate-100">{kpis.data?.orders_this_month || 0}</p>
            </div>
            {/* Outstanding Credit */}
            <div className="kpi-card stagger-3 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-850 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                {(kpis.data?.outstanding_credit ?? 0) > 0 && <span className="badge badge-red">Due</span>}
              </div>
              <p className="text-xs font-medium text-slate-500 mb-1">Outstanding Credit</p>
              <p className="stat-value text-red-500">₹{kpis.data?.outstanding_credit?.toLocaleString() || 0}</p>
            </div>
            {/* Low Stock Items */}
            <div className="kpi-card stagger-4 animate-fade-in">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-850 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                {(kpis.data?.low_stock_count ?? 0) > 0 && <span className="badge badge-yellow">Alert</span>}
              </div>
              <p className="text-xs font-medium text-slate-500 mb-1">Low Stock Items</p>
              <p className={`stat-value ${(kpis.data?.low_stock_count ?? 0) > 0 ? 'text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}>{kpis.data?.low_stock_count || 0}</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
            {/* Sales Trend Chart */}
            <div className="dash-section p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
                </div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sales Trend (30 Days)</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesTrend.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--card-border)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(tick) => {try {return new Date(tick).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} catch(e) {return tick}}} />
                    <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '0.375rem', fontSize: '12px', color: 'var(--color-slate-800)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      labelFormatter={(label) => {try {return new Date(label).toLocaleDateString()} catch(e) {return label}}}
                    />
                    <Area type="monotone" dataKey="total_revenue" name="Revenue" stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Inventory Levels Chart */}
            <div className="dash-section p-6">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-7 h-7 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                </div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">Critical Inventory Levels</h4>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={inventoryLevels.data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="var(--card-border)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} angle={-45} textAnchor="end" height={60} />
                    <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderRadius: '0.375rem', fontSize: '12px', color: 'var(--color-slate-800)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                      cursor={{fill: 'var(--color-slate-100)', opacity: 0.15}}
                    />
                    <Bar dataKey="current_stock" name="Current Stock" fill="#3b82f6" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="reorder_level" name="Reorder Level" fill="#f59e0b" fillOpacity={0.8} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SmartStock AI Block — Real-Time Insights with Reorder Now */}
          <section className="lg:col-span-3 relative overflow-hidden rounded-lg p-6 bg-slate-900 border border-slate-800 text-white shadow">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 className="text-base font-semibold text-white">Smart Stock Assistant</h3>
              </div>
              <button
                onClick={handleGenerateInsights}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-all font-medium flex items-center gap-1.5 text-white"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Update Alerts
              </button>
            </div>
            {realtimeInsights.loading ? (
              <p className="text-sm text-primary-200 animate-pulse font-medium">Checking your stock levels...</p>
            ) : realtimeInsights.error ? (
              renderError(realtimeInsights.error)
            ) : realtimeInsights.data.filter(i => i.alert_level !== 'ok' && i.alert_level !== 'no_data').length === 0 ? (
              <p className="text-sm text-primary-200 font-medium">Everything is in stock. Your store is ready to sell!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {realtimeInsights.data
                  .filter(i => i.alert_level !== 'ok' && i.alert_level !== 'no_data')
                  .slice(0, 6)
                  .map((insight) => (
                    <div key={insight.product_id} className="bg-slate-800 rounded border border-slate-700 p-4 transition-all flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`badge ${
                          insight.alert_level === 'critical' ? 'badge-red' :
                          insight.alert_level === 'warning' ? 'badge-yellow' :
                          'badge-blue'
                        }`}>
                          {insight.alert_level.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          {insight.days_to_stockout !== null ? `${insight.days_to_stockout}d left` : 'below min'}
                        </span>
                      </div>
                      <div className="font-semibold text-white text-sm leading-tight mb-1">
                        {insight.product}
                      </div>
                      <div className="text-xs text-slate-300 mt-1 leading-relaxed flex-1">
                        {insight.message}
                      </div>
                      {insight.action && (
                        <div className="mt-4 pt-3 border-t border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-400 font-medium">
                              via {insight.action.supplier_name}
                            </span>
                            <span className="text-xs font-semibold text-emerald-400">
                              ₹{insight.action.price}/unit
                            </span>
                          </div>
                          <button
                            id={`reorder-btn-${insight.product_id}`}
                            onClick={() => handleReorderNow(insight)}
                            disabled={reorderingId === insight.product_id}
                            className={`w-full py-2 rounded text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                              reorderSuccessId === insight.product_id
                                ? 'bg-emerald-600 text-white'
                                : 'bg-primary-600 text-white hover:bg-primary-500 disabled:opacity-60'
                            }`}
                          >
                            {reorderSuccessId === insight.product_id ? (
                              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> Added</>
                            ) : reorderingId === insight.product_id ? (
                              <><div className="w-3 h-3 border-2 border-slate-400 border-t-slate-900 rounded-full animate-spin"/> Adding...</>
                            ) : (
                              <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg> Reorder ({insight.action.quantity} units)</>
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
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Low Stock Warnings</h3>
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
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="py-3 flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 group-hover:text-primary-600 transition-colors">{item.product.name}</p>
                      <p className="text-xs text-slate-500">Reorder Level: {item.reorder_level}</p>
                    </div>
                    <span className="badge badge-red">
                      {item.current_stock} {item.product.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dash-section p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Orders</h3>
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
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors px-2 rounded">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">#{order.order_number}</span>
                      <span className="text-xs text-slate-500 mt-1 font-medium">Total: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      {order.status === 'dispatched' && (
                        <button
                          onClick={() => handleMarkAsReceived(order.id)}
                          className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all shadow-sm flex items-center"
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
        <div className="dash-section p-6 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Supplier Marketplace</h3>
                <span className="text-xs text-slate-500">{marketplace.data.length} Products Available</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 rounded border border-emerald-200 dark:border-emerald-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Exchange Active</span>
            </div>
          </div>

          {marketplace.loading ? (
            <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div></div>
          ) : marketplace.error ? (
            <div className="border border-red-200 dark:border-red-800 p-6 rounded-lg text-red-600 dark:text-red-400 text-sm">{marketplace.error}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {marketplace.data.map(wp => (
                <div key={wp.id} className="group bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 p-4 transition-all flex flex-col relative overflow-hidden shadow-sm">
                  <div className="absolute top-3 right-3 z-10">
                     {wp.available_stock < wp.min_order_qty ? (
                       <span className="badge badge-red">Stock Out</span>
                     ) : (
                       <span className="badge badge-blue">In Stock</span>
                     )}
                  </div>
                  <div className="aspect-video w-full overflow-hidden rounded bg-slate-50 dark:bg-slate-850 flex items-center justify-center mb-4 min-h-[140px] border border-slate-100 dark:border-slate-800">
                    {wp.product.image ? (
                      <img src={getFullImageUrl(wp.product.image)!} alt={wp.product.name} className="object-cover w-full h-full" />
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        <span className="text-xs text-slate-400 mt-1.5 font-medium">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight text-sm mb-1">{wp.product.name}</h4>
                    <p className="text-xs text-slate-500 mb-3">{wp.product.brand} &bull; {wp.product.unit}</p>
                    <div className="mt-auto pt-3 flex flex-col border-t border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500 line-through">MRP: ₹{wp.mrp}</p>
                      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">₹{wp.wholesale_price} <span className="text-xs font-normal text-slate-500">/ {wp.product.unit}</span></p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850 p-1 rounded border border-slate-200 dark:border-slate-800">
                      <button 
                        onClick={() => setQuantities(q => ({ ...q, [wp.id]: Math.max(wp.min_order_qty, (q[wp.id] || wp.min_order_qty) - 1) }))}
                        className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-500"
                        disabled={wp.available_stock < wp.min_order_qty}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
                      </button>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{quantities[wp.id] || wp.min_order_qty}</span>
                      <button 
                        onClick={() => setQuantities(q => ({ ...q, [wp.id]: Math.min(wp.available_stock, (q[wp.id] || wp.min_order_qty) + 1) }))}
                        className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-800 transition-all text-slate-500"
                        disabled={wp.available_stock < wp.min_order_qty}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                      </button>
                    </div>

                    <button
                      disabled={addingToCart === wp.id || wp.available_stock < wp.min_order_qty}
                      onClick={() => handleAddToCart(wp.id)}
                      className="w-full btn-primary py-2 text-xs font-semibold"
                    >
                      {addingToCart === wp.id ? 'Adding...' : 'Add to Cargo'}
                    </button>
                    <div className="flex justify-between items-center text-xs text-slate-500 mt-2 px-1">
                       <span>Min: {wp.min_order_qty}</span>
                       <span className={wp.available_stock < wp.min_order_qty * 2 ? 'text-red-500 font-semibold' : ''}>Stock: {wp.available_stock}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cart' && (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
          <div className="bg-slate-50 dark:bg-slate-950 px-6 py-8 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Shopping Cart</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verify bulk requisitions before checkout.</p>
          </div>

          <div className="p-6">
            {cart.loading ? (
              <div className="flex justify-center py-24"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div></div>
            ) : cart.error ? (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 p-4 rounded text-red-600 dark:text-red-400 text-sm">{cart.error}</div>
            ) : cart.data.items.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                </div>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Your cart is empty</h4>
                <p className="text-slate-500 mt-1 text-sm">Head back to the marketplace to add some products.</p>
                <button 
                  onClick={() => setActiveTab('marketplace')}
                  className="mt-4 btn-primary text-xs font-semibold px-4 py-2"
                >
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  {cart.data.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-950/40 rounded border border-slate-100 dark:border-slate-800/80 transition-all">
                      <div className="flex items-center space-x-4">
                        <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded flex-shrink-0 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center p-1">
                          {item.wholesaler_product.product.image ? (
                            <img src={getFullImageUrl(item.wholesaler_product.product.image)!} className="object-contain w-full h-full" alt="" />
                          ) : (
                            <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate text-sm">{item.wholesaler_product.product.name}</h4>
                          <p className="text-xs text-slate-500">{item.wholesaler_product.product.brand}</p>
                          <p className="text-xs font-semibold text-primary-600 mt-1">₹{item.unit_price_snapshot} / {item.wholesaler_product.product.unit}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-1">
                          <button 
                            onClick={() => handleUpdateCartQty(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M20 12H4"></path></svg>
                          </button>
                          <span className="w-8 text-center text-sm font-medium text-slate-700 dark:text-slate-300">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateCartQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-850 rounded text-slate-500"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                          </button>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">₹{(item.quantity * item.unit_price_snapshot).toFixed(2)}</p>
                          <button 
                            onClick={() => handleUpdateCartQty(item.id, 0)}
                            className="text-xs font-medium text-red-600 hover:text-red-500 transition-colors mt-1"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded border border-slate-200 dark:border-slate-800 h-fit">
                  <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4 pb-2 border-b border-slate-200 dark:border-slate-800">
                    Order Summary
                  </h4>
                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Subtotal</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-medium text-slate-500">
                      <span>Shipping</span>
                      <span className="text-emerald-600 font-medium">Free / Optimized</span>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end">
                      <span className="text-xs font-medium text-slate-500">Total</span>
                      <span className="text-xl font-bold text-primary-600">₹{cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleCheckout}
                    className="w-full btn-primary py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    Proceed to Payment
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7-7 7"></path></svg>
                  </button>
                  <p className="text-xs text-slate-500 mt-4 text-center">Fulfillment terms are governed by Wholesaler agreements.</p>
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
              <div className="w-1 h-6 bg-primary-600 flex-shrink-0" />
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Current Inventory</h3>
              <span className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-medium">{inventory.data.length} Items</span>
            </div>
            <button
              onClick={() => setShowAddInventory(true)}
              className="btn-primary text-xs font-semibold px-4 py-2 flex items-center gap-2"
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {inventory.data.filter(item => Number(item.current_stock) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </div>
                        <p className="text-sm font-medium text-slate-750 dark:text-slate-300">No Active Inventory</p>
                        <p className="text-xs text-slate-500 mt-1">Initiate a purchase or manually add items to stock your shelf.</p>
                      </td>
                    </tr>
                  ) : inventory.data.filter(item => Number(item.current_stock) > 0).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-all group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded bg-slate-50 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                            <img 
                              src={getFullImageUrl(item.product.image || null) || `https://ui-avatars.com/api/?name=${item.product.name}&background=random`} 
                              className="h-full w-full object-contain rounded" 
                              alt={item.product.name} 
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-500 transition-colors">{item.product.name}</div>
                            <div className="text-xs text-slate-500">{item.product.brand}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="badge badge-blue">{item.product.category?.name || 'GENERIC'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-255">{item.current_stock} <span className="text-xs text-slate-500 font-normal lowercase">{item.product.unit}</span></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                        {editingInventoryId === item.id ? (
                          <div className="flex items-center space-x-2">
                            <input 
                              type="number"
                              className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm font-medium text-slate-800 dark:text-slate-100 focus:border-primary-500 focus:outline-none"
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
                              className="p-1 text-emerald-650 hover:text-emerald-500 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </button>
                            <button 
                              onClick={() => setEditingInventoryId(null)}
                              className="p-1 text-red-600 hover:text-red-500 transition-colors"
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
                            <span className="font-medium">{item.reorder_level} {item.product.unit}</span>
                            <svg className="w-3.5 h-3.5 opacity-0 group-hover/threshold:opacity-100 transition-opacity text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
              <div className="w-1 h-6 bg-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Credit Ledger</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Financial reconciliation and settlement tracking</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="card p-4 min-w-[200px]">
                <span className="text-xs text-slate-500 font-medium block mb-1">Total Outstanding</span>
                <span className="text-2xl font-bold text-red-500">₹{orders.data.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {orders.data.filter(o => o.amount_due > 0).length === 0 ? (
              <div className="card p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                 <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                 </div>
                 <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">Zero Liability</h4>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All credit lines are settled. Supply chain health is optimal.</p>
              </div>
            ) : (
              orders.data.filter(o => o.amount_due > 0).map(order => (
                <div key={order.id} className="card p-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-2">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                      </div>
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <span className="text-base font-semibold text-slate-800 dark:text-slate-100">Order #{order.order_number}</span>
                          <span className="badge badge-red text-xs">OUTSTANDING</span>
                        </div>
                        <p className="text-xs text-slate-500">Due Date: <span className="text-red-500 font-medium">{order.due_date || 'Immediate'}</span></p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8 lg:gap-12">
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-medium block mb-0.5">Total Liability</span>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">₹{order.total_amount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-medium block mb-0.5">Paid</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-500">₹{order.amount_paid}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-500 font-medium block mb-0.5">Balance Due</span>
                        <span className="text-lg font-bold text-red-500">₹{order.amount_due}</span>
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
                        className="btn-primary text-xs font-semibold px-4 py-2 flex items-center group"
                      >
                        Settle Line
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
          <div className="flex justify-between items-center mb-6">
            <div className="tab-bar">
              <button 
                onClick={() => navigate('/sales/record')}
                className={`tab-pill ${salesSubTab === 'record' ? 'active' : ''}`}
              >
                Record Sale
              </button>
              <button 
                onClick={() => navigate('/sales/history')}
                className={`tab-pill ${salesSubTab === 'history' ? 'active' : ''}`}
              >
                Sales History
              </button>
            </div>
            {salesSubTab === 'record' && saleItems.length > 0 && (
              <button 
                onClick={handleRecordSale}
                disabled={isRecordingSale}
                className="btn-primary text-xs font-semibold px-4 py-2 flex items-center disabled:opacity-50"
              >
                {isRecordingSale ? 'Processing...' : 'Generate Bill'}
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </button>
            )}
          </div>

          {salesSubTab === 'record' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="dash-section p-6">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Item Entry</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Product</label>
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
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Quantity Sold</label>
                      <input 
                        type="number"
                        className="input-field"
                        placeholder="Qty..."
                        id="sale-qty-input"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1.5">Unit Price (₹)</label>
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
                    className="btn-primary w-full py-2.5 text-xs font-semibold"
                  >
                    Add to Bill
                  </button>
                </div>
              </div>

              <div className="dash-section p-6 relative">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                  Bill Preview
                  <span className="ml-2.5 px-2 py-0.5 bg-primary-100 dark:bg-primary-900/40 rounded text-xs font-semibold text-primary-700 dark:text-primary-400">{saleItems.length} Items</span>
                </h4>
                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {saleItems.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-slate-400 dark:text-slate-500 text-xs font-medium italic">No items added to current session</p>
                    </div>
                  ) : (
                    saleItems.map((si, idx) => {
                      const p = inventory.data.find(inv => inv.product.id === si.product)?.product;
                      return (
                        <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-200 dark:border-slate-800">
                          <div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p?.name || 'Unknown Product'}</div>
                            <div className="text-xs text-slate-500 mt-0.5">QTY: {si.quantity_sold} × ₹{si.unit_price} </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-sm font-semibold text-primary-600 dark:text-primary-500">₹{(si.quantity_sold * si.unit_price).toFixed(2)}</div>
                            <button 
                              onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-650 p-1 transition-colors"
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
            <div className="dash-section overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full premium-table">
                  <thead>
                    <tr>
                      <th className="text-left">Sale ID</th>
                      <th className="text-left">Date</th>
                      <th className="text-left">Items</th>
                      <th className="text-left">Total Amount</th>
                      <th className="text-left">Invoice #</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sales.loading ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">Loading history...</td></tr>
                    ) : sales.data.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500 italic">No sales transactions recorded yet</td></tr>
                    ) : (
                      sales.data.map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-200">#{sale.id}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{new Date(sale.sale_date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-800 dark:text-slate-200">{sale.total_items} units</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-emerald-600 dark:text-emerald-500">₹{sale.total_amount}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="badge badge-blue">{sale.invoice_number}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <button 
                              onClick={() => setShowInvoice(sale)}
                              className="text-xs font-semibold text-primary-600 hover:text-primary-500 transition-colors"
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

      {/* Add Inventory Modal */}
      {showAddInventory && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6" onClick={() => setShowAddInventory(false)}>
            <div 
              className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 animate-scale-in relative h-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Asset Registration</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manually log physical inventory for AI synchronization and supply chain tracking.</p>
                </div>
                <button
                  onClick={() => setShowAddInventory(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Product Selection */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Select Asset Reference</label>
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
                  <p className="mt-1.5 text-xs text-slate-400">Reference the exact product name and brand for accurate AI trend prediction.</p>
                </div>

                {/* Quantities */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Stock Volume</label>
                    <div className="relative">
                      <input 
                        type="number"
                        className="input-field pr-12"
                        value={newInventoryItem.currentStock}
                        onChange={(e) => setNewInventoryItem({ ...newInventoryItem, currentStock: parseInt(e.target.value) })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Units</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Supply Floor</label>
                    <div className="relative">
                      <input 
                        type="number"
                        className="input-field pr-10"
                        value={newInventoryItem.reorderLevel}
                        onChange={(e) => setNewInventoryItem({ ...newInventoryItem, reorderLevel: parseInt(e.target.value) })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">Min</span>
                    </div>
                  </div>
                  <p className="col-span-2 text-xs text-slate-400">Supply floor sets the threshold for critical low-stock intelligence triggers.</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                  <button 
                    onClick={() => setShowAddInventory(false)}
                    className="btn-secondary text-xs font-semibold px-4 py-2"
                  >
                    Discard Changes
                  </button>
                  <button 
                    disabled={addingItem || newInventoryItem.productId === 0}
                    onClick={() => handleAddInventoryItem(newInventoryItem.productId, newInventoryItem.currentStock, newInventoryItem.reorderLevel)}
                    className="btn-primary text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 disabled:opacity-50"
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
            className="rounded-lg shadow-xl max-w-md w-full animate-scale-in overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6"
            style={{maxHeight: '90vh'}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tax Invoice</h3>
                <p className="text-xs text-slate-500 mt-0.5">{showInvoice.invoice_number}</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Date</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{new Date(showInvoice.sale_date).toLocaleDateString()}</div>
                </div>
                <button 
                  onClick={() => setShowInvoice(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Items */}
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2">Sold Items</div>
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  {showInvoice.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2.5 px-3 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30">
                      <div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 block">{item.product_name}</span>
                        <span className="text-xs text-slate-500">{item.quantity_sold} × ₹{item.unit_price}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">₹{item.line_total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="p-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/30 flex justify-between items-center text-sm">
                <span className="text-xs text-slate-500 font-medium">Total Quantity</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{showInvoice.total_items} units</span>
              </div>
              <div className="p-3.5 rounded border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/20 flex justify-between items-center">
                <span className="text-xs text-emerald-600 dark:text-emerald-500 font-semibold">Grand Total</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">₹{showInvoice.total_amount}</span>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowInvoice(null)}
                className="btn-secondary w-full py-2 text-xs font-semibold justify-center"
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
