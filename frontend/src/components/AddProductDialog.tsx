import { useState, useEffect, type FormEvent } from 'react';
import { getCategories, addWholesalerProduct, type Category } from '../api';
import { useAuth } from '../AuthContext';

interface AddProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProductDialog({ isOpen, onClose, onSuccess }: AddProductDialogProps) {
  const { accessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  
  // Form state
  const [productName, setProductName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unit, setUnit] = useState('piece');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [mrp, setMrp] = useState('');
  const [availableStock, setAvailableStock] = useState('100');
  const [minOrderQty, setMinOrderQty] = useState('1');
  const [leadTimeDays, setLeadTimeDays] = useState('1');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accessToken) {
      loadCategories();
    }
  }, [isOpen, accessToken]);

  const loadCategories = async () => {
    try {
      const data = await getCategories(accessToken!);
      setCategories(data);
      if (data.length > 0) setCategoryId(data[0].id.toString());
    } catch (err: any) {
      console.error('Failed to load categories', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('product_name', productName);
      formData.append('product_brand', brand);
      formData.append('product_category_id', categoryId);
      formData.append('product_unit', unit);
      
      if (imageFile) {
        formData.append('product_image', imageFile);
      }

      formData.append('wholesale_price', wholesalePrice);
      if (mrp) formData.append('mrp', mrp);
      formData.append('available_stock', availableStock);
      formData.append('min_order_qty', minOrderQty);
      formData.append('lead_time_days', leadTimeDays);
      formData.append('status', 'active');

      await addWholesalerProduct(accessToken, formData);
      onSuccess();
      onClose();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setBrand('');
    setUnit('piece');
    setWholesalePrice('');
    setMrp('');
    setAvailableStock('100');
    setMinOrderQty('1');
    setLeadTimeDays('1');
    setImageFile(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-50/80 backdrop-blur-xl animate-fade-in" role="dialog" aria-modal="true">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-12" onClick={onClose}>
        <div 
          className="bg-slate-100 rounded-[3rem] shadow-[0_64px_128px_-24px_rgba(0,0,0,1)] max-w-6xl w-full p-12 animate-scale-in relative h-auto max-h-none overflow-visible border border-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-start mb-12">
            <div>
              <h3 className="text-4xl font-black text-slate-800 uppercase tracking-tighter mb-3">
                Asset Provisioning
              </h3>
              <p className="text-sm text-slate-400 font-medium italic">Initialize a new professional asset reference in the global marketplace infrastructure.</p>
            </div>
            <button 
              onClick={onClose}
              className="p-4 bg-white/5 rounded-full text-slate-500 hover:text-white hover:bg-red-500/20 transition-all border border-white/5 group"
            >
              <svg className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>

          {error && (
            <div className="mb-8 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center border border-red-100 animate-fade-in">
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Section 1: Basic Info */}
            <div className="lg:col-span-2 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/3 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                <h4 className="md:col-span-2 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                  <span className="w-12 h-px bg-white/5 mr-4"></span>
                  Registry Identification
                </h4>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Asset Designation</label>
                  <input type="text" required placeholder="e.g. PREMIUM LOGISTICS UNIT" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={productName} onChange={(e) => setProductName(e.target.value)} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Origin Brand</label>
                  <input type="text" placeholder="e.g. GLOBAL HARVEST" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Classification</label>
                  <select required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl appearance-none" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Stock Unit</label>
                  <input type="text" required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" placeholder="e.g. UNIT, KG, CRATE" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Transit velocity (Days)</label>
                  <input type="number" required min="1" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
                </div>
              </div>

              {/* Section 2: Pricing & Stock */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white/3 p-10 rounded-[2.5rem] border border-white/5 shadow-inner">
                <h4 className="md:col-span-3 text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center">
                  <span className="w-12 h-px bg-white/5 mr-4"></span>
                  Trade Valuation
                </h4>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Trade Rate (₹)</label>
                  <input type="number" step="0.01" required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-lg font-black text-primary-500 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Market Price (₹)</label>
                  <input type="number" step="0.01" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={mrp} onChange={(e) => setMrp(e.target.value)} />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Commitment Floor</label>
                  <input type="number" required min="1" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)} />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Initial Deployment Volume</label>
                  <input type="number" required min="0" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-lg font-bold text-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-xl" value={availableStock} onChange={(e) => setAvailableStock(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="space-y-10">
              <div className="bg-white/3 p-10 rounded-[2.5rem] border border-white/5 h-full flex flex-col shadow-inner">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center mb-8">
                  <span className="w-12 h-px bg-white/5 mr-4"></span>
                  Asset Imagery
                </h4>
                
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.2rem] p-10 bg-slate-50 hover:bg-white/5 hover:border-primary-500/50 transition-all cursor-pointer group relative overflow-hidden shadow-xl">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setImageFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  
                  <div className="text-center">
                    <div className="p-6 bg-primary-600/10 rounded-full text-primary-500 mb-6 inline-block group-hover:scale-110 transition-transform shadow-lg shadow-primary-500/5">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    </div>
                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Upload Asset</p>
                    <p className="text-[8px] text-slate-500 mt-2 uppercase font-black tracking-widest opacity-60">RAW FORMAT • MAX 5MB</p>
                  </div>

                  {imageFile && (
                    <div className="absolute inset-2 bg-slate-100 rounded-[2rem] flex flex-col items-center justify-center p-6 shadow-2xl border border-white/5 animate-scale-in">
                      <svg className="w-10 h-10 text-secondary-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      <p className="text-[10px] font-black text-slate-800 truncate w-full text-center px-6 uppercase tracking-widest">{imageFile.name}</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); }} className="mt-4 text-[10px] font-black text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors">Discard</button>
                    </div>
                  )}
                </div>

                <div className="mt-10 space-y-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-6 bg-primary-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-primary-500 shadow-2xl shadow-primary-500/30 disabled:opacity-50 transition-all flex items-center justify-center gap-3 group"
                  >
                    {loading ? 'Executing Infrastructure Add...' : (
                      <>
                        Deploy to Marketplace
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-6 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/5 border border-white/5 transition-all"
                  >
                    Abort
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
