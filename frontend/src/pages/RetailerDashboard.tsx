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
} from '../api';
import type { 
  AIInsight, 
  InventoryItem, 
  OrderSummary, 
  WholesalerProduct, 
  Cart,
  Sale,
  CreateSaleItemPayload
} from '../api';
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

  const latestInsights = useMemo(() => insights.data.slice(0, 5), [insights.data]);
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
    } catch (e: any) {
      alert("Failed to generate insights: " + e.message);
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
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-black leading-7 text-slate-800 sm:text-3xl sm:truncate uppercase tracking-tighter">
            Retailer Portal
          </h2>
          <p className="mt-1 text-sm text-slate-400 font-medium italic">
            Manage inventory, optimize ordering, and receive SmartStock AI insights.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-2">
          <button
            onClick={() => navigate('/retailer/dashboard')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'glass text-slate-400 border-none hover:bg-white/5'}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('marketplace'); navigate('/retailer/dashboard'); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'marketplace' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'glass text-slate-400 border-none hover:bg-white/5'}`}
          >
            Marketplace
          </button>
          <button
            onClick={() => { setActiveTab('cart'); navigate('/retailer/dashboard'); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center ${activeTab === 'cart' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'glass text-slate-400 border-none hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            Cart ({cart.data.items.length})
          </button>
          <button
            onClick={() => { setActiveTab('inventory'); navigate('/retailer/dashboard'); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center ${activeTab === 'inventory' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'glass text-slate-400 border-none hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
            Inventory
          </button>
          <button
            onClick={() => { setActiveTab('ledger'); navigate('/retailer/dashboard'); }}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center ${activeTab === 'ledger' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'glass text-slate-400 border-none hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Ledger
          </button>
          <button
            onClick={() => navigate('/sales/record')}
            className={`px-4 py-2 text-sm font-bold rounded-xl transition-all flex items-center ${activeTab === 'sales' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'glass text-slate-400 border-none hover:bg-white/5'}`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Sales
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SmartStock AI Block */}
          <section className="card lg:col-span-3 bg-gradient-to-br from-primary-900 to-slate-100 border-none p-6 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-600/20 rounded-full blur-3xl group-hover:bg-primary-600/30 transition-all"></div>
            <h3 className="text-lg font-black text-white mb-4 flex items-center relative z-10 uppercase tracking-widest">
              <svg className="w-6 h-6 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              AI Intelligence
              <button 
                onClick={handleGenerateInsights}
                className="ml-auto text-[10px] bg-white/5 hover:bg-white/10 px-4 py-1.5 rounded-full border border-white/10 transition-all font-black uppercase tracking-widest flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Sync Data
              </button>
            </h3>
            {insights.loading ? (
              <p className="text-sm text-primary-200 animate-pulse relative z-10 font-medium italic">Analyzing logistics velocity...</p>
            ) : insights.error ? (
              renderError(insights.error)
            ) : latestInsights.length === 0 ? (
              <p className="text-base text-primary-200 relative z-10 font-medium italic opacity-60">Supply chain optimized. Global telemetry confirms zero alerts.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {latestInsights.map((insight) => (
                  <div key={insight.id} className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 transition-all cursor-default group/item">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${
                        insight.type === 'low_stock' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        insight.type === 'seasonal' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        insight.type === 'demand_increase' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                        'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      }`}>
                        {insight.type.replace('_', ' ')}
                      </span>
                      <svg className="w-4 h-4 text-white/30 opacity-0 group-hover/item:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                    <div className="font-black text-white text-base leading-tight uppercase tracking-tighter">
                      {insight.title}
                    </div>
                    <div className="text-xs text-slate-300 mt-3 line-clamp-2 opacity-80 leading-relaxed font-medium italic">
                      {insight.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card p-6 border-t-2 border-red-500/50">
            <h3 className="text-base font-black text-slate-800 mb-6 border-b border-white/5 pb-4 flex items-center uppercase tracking-widest">
              <svg className="w-5 h-5 mr-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              Stock Alerts
            </h3>
            {inventory.loading ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Scanning Inventory...</p>
            ) : inventory.error ? (
              renderError(inventory.error)
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-12 glass rounded-3xl border-none">
                <svg className="mx-auto h-12 w-12 text-slate-500 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40 italic">Zero critical stock deviations</p>
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

          <section className="card p-6 lg:col-span-2 border-t-2 border-primary-500/50 shadow-2xl">
            <h3 className="text-base font-black text-slate-800 mb-6 border-b border-white/5 pb-4 flex items-center uppercase tracking-widest">
              <svg className="w-5 h-5 mr-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              Workflow Activity
            </h3>
            {orders.loading ? (
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Fetching Logistics Log...</p>
            ) : orders.error ? (
              renderError(orders.error)
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-12 glass rounded-3xl border-none">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-40 italic">Infrastructure idle. No recent deployments.</p>
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
                          Confirm Receipt
                        </button>
                      )}
                      <span className={`badge px-3 py-1 ${order.status === 'delivered' ? 'badge-green' : order.status === 'pending' ? 'badge-yellow' : 'badge-blue'}`}>
                        {order.status === 'delivered' ? 'RECEIVED' : order.status.toUpperCase()}
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
        <div className="card p-10 bg-slate-100 border-none shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
            <div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-2">Wholesale Exchange</h3>
              <p className="text-sm text-slate-400 font-medium italic">Premium catalog with AI-optimized cost efficiency</p>
            </div>
            <div className="flex items-center space-x-2 glass p-2 rounded-2xl">
              <span className="text-[10px] font-black text-slate-400 px-4 uppercase tracking-widest">Exchange Status</span>
              <span className="badge badge-green px-6 border-none shadow-lg shadow-secondary-500/10">Active</span>
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
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">My Inventory</h3>
                  <button 
                    onClick={() => setShowAddInventory(true)}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Add Item
                  </button>
                </div>

                <div className="card overflow-hidden border-none shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/5">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Volume</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Threshold</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Health</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/2 divide-y divide-white/5">
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
            <div>
              <h3 className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-2">Credit Ledger</h3>
              <p className="text-sm text-slate-400 font-medium italic">Financial reconciliation and over-the-horizon settlement tracking</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="glass p-4 rounded-2xl border-none shadow-xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Outstanding</span>
                <span className="text-2xl font-black text-red-500 tracking-tighter">₹{orders.data.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}</span>
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
              <div className="rounded-[2.5rem] p-10 shadow-2xl border border-slate-700" style={{background: '#1e293b'}}>
                <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-8">Item Entry</h4>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-4">Select Product</label>
                    <select 
                      className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary-500"
                      style={{background: '#334155', color: 'white', border: '1px solid #475569'}}
                      id="sale-product-select"
                      defaultValue="0"
                    >
                      <option value="0" disabled>Select from inventory...</option>
                      {inventory.data.map(item => (
                        <option key={item.id} value={item.product.id}>{item.product.name} ({item.current_stock} available)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-300 uppercase tracking-widest mb-4">Quantity Sold</label>
                    <input 
                      type="number"
                      className="w-full rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-primary-500"
                      style={{background: '#334155', color: 'white', border: '1px solid #475569'}}
                      placeholder="Enter quantity..."
                      id="sale-qty-input"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const pSelect = document.getElementById('sale-product-select') as HTMLSelectElement;
                      const qInput = document.getElementById('sale-qty-input') as HTMLInputElement;
                      const pid = parseInt(pSelect.value);
                      const qty = parseFloat(qInput.value);
                      if (pid > 0 && qty > 0) {
                        setSaleItems([...saleItems, { product: pid, quantity_sold: qty }]);
                        qInput.value = '';
                      }
                    }}
                    className="w-full text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl transition-all shadow-xl" style={{background: '#2563eb'}}
                  >
                    Add to Bill
                  </button>
                </div>
              </div>

              <div className="rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden" style={{background: '#0f172a'}}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center">
                  Bill Preview
                  <span className="ml-4 px-3 py-1 bg-white/10 rounded-full text-[10px] tracking-widest font-black">{saleItems.length} ITEMS</span>
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
                        <div key={idx} className="flex justify-between items-center bg-white/5 p-5 rounded-2xl border border-white/5">
                          <div>
                            <div className="text-sm font-black text-white uppercase tracking-tight">{p?.name || 'Unknown Product'}</div>
                            <div className="text-[10px] font-black text-slate-300 tracking-widest mt-1">QTY: {si.quantity_sold}</div>
                          </div>
                          <button 
                            onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-500 p-2"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
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
            className="rounded-[2rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] max-w-lg w-full animate-scale-in overflow-y-auto"
            style={{background: '#1e293b', maxHeight: '90vh', border: '1px solid rgba(255,255,255,0.08)'}}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">Tax Invoice</h3>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{color: '#64748b'}}>{showInvoice.invoice_number}</p>
              </div>
              <div className="flex items-start space-x-6">
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest mb-1" style={{color: '#64748b'}}>Date</div>
                  <div className="text-sm font-black text-white">{new Date(showInvoice.sale_date).toLocaleDateString()}</div>
                </div>
                <button 
                  onClick={() => setShowInvoice(null)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  style={{color: '#94a3b8'}}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
            </div>

            <div className="p-8">
              {/* Divider */}
              <div className="border-t border-dashed mb-8" style={{borderColor: 'rgba(255,255,255,0.1)'}}></div>

              {/* Items */}
              <div className="space-y-4 mb-8">
                <div className="text-[10px] font-black uppercase tracking-widest mb-4" style={{color: '#64748b'}}>Sold Items</div>
                {showInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 px-4 rounded-xl" style={{background: 'rgba(255,255,255,0.05)'}}>
                    <span className="text-sm font-bold text-white uppercase tracking-tight">{item.product_name}</span>
                    <span className="text-sm font-black" style={{color: '#38bdf8'}}>x{item.quantity_sold}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="rounded-2xl p-6 mb-8 flex justify-between items-center" style={{background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)'}}>
                <span className="text-[10px] font-black uppercase tracking-widest" style={{color: '#64748b'}}>Total Quantity</span>
                <span className="text-2xl font-black text-white">{showInvoice.total_items} UNITS</span>
              </div>

              {/* Close Button */}
              <button 
                onClick={() => setShowInvoice(null)}
                className="w-full text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-2xl transition-all"
                style={{background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)'}}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#10b981')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0f172a')}
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
