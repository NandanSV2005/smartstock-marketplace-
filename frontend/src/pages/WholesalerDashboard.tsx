import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { getWholesalerOrders, getWholesalerOwnProducts, updateOrderStatus, updateWholesalerProduct } from '../api';
import type { OrderSummary, WholesalerProduct } from '../api';
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
  const [activeTab, setActiveTab] = useState<'terminal' | 'ledger'>('terminal');

  const loadProducts = useCallback(async () => {
    if (!accessToken) return;
    try {
      const productsData = await getWholesalerOwnProducts(accessToken);
      setProducts(productsData);
    } catch (err: any) {
      console.error("Failed to refresh products", err);
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

  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const activeOrders = useMemo(() => orders.filter(o => ['accepted', 'packed', 'dispatched'].includes(o.status)), [orders]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-10 border-b border-white/5 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black leading-7 text-slate-800 sm:text-4xl sm:truncate uppercase tracking-tighter">
            Wholesale Terminal
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium italic">
            Orchestrate marketplace logistics, adjust dynamic pricing, and monitor fulfillment velocity.
          </p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
          <button 
            onClick={() => setActiveTab('terminal')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'terminal' ? 'bg-white text-primary-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Operations
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-white text-primary-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Credit Ledger
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

            <section className="card p-10 bg-slate-100 border-none shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
              <h3 className="text-base font-black text-slate-800 mb-8 flex items-center uppercase tracking-widest relative z-10">
                <span className="bg-primary-600 text-white w-8 h-8 rounded-xl flex justify-center items-center text-xs mr-4 font-black shadow-lg shadow-primary-500/20">{pendingOrders.length}</span>
                Incoming Signal Queue
              </h3>
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center glass rounded-2xl border-none font-medium italic">Neutral queue status. No active signals.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingOrders.map(order => (
                    <li key={order.id} className="glass p-6 rounded-2xl border-none flex justify-between items-center group hover:bg-white/5 transition-all">
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h4 className="font-black text-slate-800 uppercase tracking-tighter text-lg">Signal #{order.order_number}</h4>
                          <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                            order.payment_method === 'pay_now' ? 'bg-emerald-500/10 text-emerald-500' :
                            order.payment_method === 'partial' ? 'bg-yellow-500/10 text-yellow-500' :
                            'bg-blue-500/10 text-blue-500'
                          }`}>
                            {order.payment_method?.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-2">
                          <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Valuation: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
                          <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Paid: ₹{order.amount_paid}</p>
                          {order.amount_due > 0 && (
                            <>
                              <span className="text-slate-300 opacity-20 text-[10px] font-black">|</span>
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Due: ₹{order.amount_due}</p>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2 max-w-xs truncate font-medium italic" title={order.delivery_address}>{order.delivery_address}</p>
                      </div>
                      <div className="flex space-x-3">
                        <button onClick={() => handleUpdateStatus(order.id, order.status, 'cancelled')} className="text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest px-4 py-2 transition-colors">Discard</button>
                        <button onClick={() => handleUpdateStatus(order.id, order.status, 'accepted')} className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest py-3 px-8 rounded-xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all">Accept Signal</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-10 border-t-2 border-secondary-500/50 shadow-2xl">
              <h3 className="text-base font-black text-slate-800 mb-8 border-b border-white/5 pb-4 flex items-center uppercase tracking-widest">
                <svg className="w-5 h-5 mr-4 text-secondary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Fulfillment Logistics
              </h3>
              {activeOrders.length === 0 ? (
                <p className="text-sm text-slate-500 py-12 text-center font-medium italic">No active logistics operations in progress.</p>
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
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Valuation: ₹{parseFloat(order.total_amount.toString()).toFixed(2)}</p>
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
                          <button onClick={() => handleUpdateStatus(order.id, 'accepted', 'packed')} className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-widest py-3 px-6 rounded-xl border border-white/10 hover:bg-white/5 transition-all">Move to Packing</button>
                        )}
                        {order.status === 'packed' && (
                          <button onClick={() => handleUpdateStatus(order.id, 'packed', 'dispatched')} className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest py-3 px-6 rounded-xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all">Begin Dispatch</button>
                        )}
                        {order.status === 'dispatched' && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic flex items-center">
                            <svg className="w-3 h-3 mr-2 text-blue-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Wait for Handshake
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
            <section className="card p-10 flex flex-col h-full bg-slate-100 border-none shadow-2xl relative overflow-hidden">
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-primary-600/5 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-6 relative z-10">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-widest">Global Catalog</h3>
                <span className="text-[10px] font-black bg-primary-600 px-4 py-1.5 rounded-full text-white uppercase tracking-widest shadow-lg shadow-primary-500/20">{products.length} Assets</span>
              </div>
              
              <button 
                onClick={() => setIsAddProductOpen(true)}
                className="bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest py-5 rounded-2xl shadow-xl shadow-primary-500/20 hover:bg-primary-500 transition-all mb-10 relative z-10 flex items-center justify-center gap-3 group"
              >
                <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                Provision Asset
              </button>

              <div className="flex-1 overflow-y-auto relative z-10 space-y-2">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-[10px] font-black text-slate-500 uppercase tracking-widest italic opacity-40">
                    Infrastructure empty. Provision first asset to begin.
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
                                <input 
                                  type="number" 
                                  value={editPrice} 
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  className="w-full bg-slate-50 text-sm font-black p-3 rounded-xl border-none focus:ring-1 focus:ring-primary-500 outline-none text-slate-800 shadow-inner"
                                />
                              </div>
                              <div>
                                <label className="block text-[8px] uppercase font-black text-slate-500 mb-2 tracking-widest">Volume</label>
                                <input 
                                  type="number" 
                                  value={editStock} 
                                  onChange={(e) => setEditStock(e.target.value)}
                                  className="w-full bg-slate-50 text-sm font-black p-3 rounded-xl border-none focus:ring-1 focus:ring-primary-500 outline-none text-slate-800 shadow-inner"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                              <button 
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="text-[10px] font-black text-slate-500 hover:text-red-500 uppercase tracking-widest transition-colors"
                              >
                                Abort
                              </button>
                              <button 
                                onClick={() => handleSaveProduct(p.id)}
                                disabled={isSaving}
                                className="text-[10px] font-black text-primary-500 hover:text-primary-400 uppercase tracking-widest transition-colors"
                              >
                                {isSaving ? 'Syncing...' : 'Commit'}
                              </button>
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
                              <button 
                                onClick={() => handleEditProduct(p)}
                                className="mt-4 text-[9px] text-slate-400 font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all hover:text-primary-500"
                              >
                                Reconfigure
                              </button>
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

      {activeTab === 'ledger' && !loading && (
        <div className="animate-fade-in space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-10 bg-slate-100 border-none shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Realized Revenue</span>
              <span className="text-4xl font-black text-emerald-500 tracking-tighter">
                ₹{orders.reduce((acc, o) => acc + Number(o.amount_paid), 0).toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-500 mt-4 font-medium italic">Total payments received across all fulfillment channels.</p>
            </div>
            
            <div className="card p-10 bg-slate-100 border-none shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Credit Exposure</span>
              <span className="text-4xl font-black text-red-500 tracking-tighter">
                ₹{orders.reduce((acc, o) => acc + Math.max(0, Number(o.amount_due)), 0).toFixed(2)}
              </span>
              <p className="text-[10px] text-slate-500 mt-4 font-medium italic">Outstanding liabilities pending retailer settlement.</p>
            </div>
          </div>

          <section className="card p-10 shadow-2xl">
            <h3 className="text-base font-black text-slate-800 mb-8 flex items-center uppercase tracking-widest">
              <svg className="w-5 h-5 mr-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
              Aging Portfolio / Credit Signals
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr className="text-left">
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Reference</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valuation</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Realized</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Outstanding</th>
                    <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Window</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {orders.filter(o => Number(o.amount_due) > 0).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm text-slate-500 font-medium italic">No active credit exposure in current portfolio.</td>
                    </tr>
                  ) : (
                    orders.filter(o => Number(o.amount_due) > 0).map(order => (
                      <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-6 pr-6">
                          <span className="font-black text-slate-800 uppercase tracking-tighter">#{order.order_number}</span>
                        </td>
                        <td className="py-6 pr-6">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">₹{Number(order.total_amount).toFixed(2)}</span>
                        </td>
                        <td className="py-6 pr-6">
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">₹{Number(order.amount_paid).toFixed(2)}</span>
                        </td>
                        <td className="py-6 pr-6">
                          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">₹{Number(order.amount_due).toFixed(2)}</span>
                        </td>
                        <td className="py-6">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            {order.due_date ? new Date(order.due_date).toLocaleDateString() : 'IMMEDIATE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
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
