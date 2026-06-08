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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in" role="dialog" aria-modal="true" onClick={onClose}>
      <div 
        className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-xl border border-orange-200/50 dark:border-orange-500/20 max-w-4xl w-full p-6 sm:p-8 animate-scale-in relative h-auto overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-semibold text-orange-950 dark:text-orange-100 mb-1 tracking-tight">
              Add New Product
            </h3>
            <p className="text-sm text-orange-700/70 dark:text-orange-300/70">Initialize a new product record in the marketplace directory.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-950/30 text-orange-500 hover:text-orange-750 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3.5 rounded-lg text-sm font-medium flex items-center border border-rose-100 dark:border-rose-950/50 animate-fade-in">
            <svg className="w-4 h-4 mr-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Section 1: Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-orange-50/50 dark:bg-orange-950/10 p-5 rounded-xl border border-orange-100 dark:border-orange-950/50 shadow-sm">
              <h4 className="md:col-span-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                Product Details
              </h4>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Product Name</label>
                <input type="text" required placeholder="e.g. Premium Basmati Rice" className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Brand</label>
                <input type="text" placeholder="e.g. India Gate" className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Category</label>
                <select required className="input-field appearance-none shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Stock Unit</label>
                <input type="text" required className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" placeholder="e.g. piece, kg, pack" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Transit Time (Days)</label>
                <input type="number" required min="1" className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20" value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
              </div>
            </div>

            {/* Section 2: Pricing & Stock */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-orange-50/50 dark:bg-orange-950/10 p-5 rounded-xl border border-orange-100 dark:border-orange-950/50 shadow-sm">
              <h4 className="md:col-span-3 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                Pricing & Inventory
              </h4>
              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Trade Price (₹)</label>
                <input type="number" step="0.01" required className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-orange-600 font-semibold" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">MRP (₹)</label>
                <input type="number" step="0.01" className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium" value={mrp} onChange={(e) => setMrp(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Min Order Qty</label>
                <input type="number" required min="1" className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium" value={minOrderQty} onChange={(e) => setMinOrderQty(e.target.value)} />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-orange-850 dark:text-orange-300 mb-1.5">Initial Stock Level</label>
                <input type="number" required min="0" className="input-field shadow-inset-tactile focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 font-medium" value={availableStock} onChange={(e) => setAvailableStock(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-6 flex flex-col justify-between">
            <div className="bg-orange-50/50 dark:bg-orange-950/10 p-5 rounded-xl border border-orange-100 dark:border-orange-950/50 shadow-sm flex-1 flex flex-col">
              <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-4">
                Product Image
              </h4>
              
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-orange-200 dark:border-orange-900/50 rounded-xl p-6 bg-white dark:bg-[#0a0a0a] hover:border-orange-500 transition-all cursor-pointer relative overflow-hidden min-h-[160px]">
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
                  <div className="p-3 bg-orange-100 dark:bg-orange-950/30 text-orange-600 rounded-full mb-3 inline-block">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
                  <p className="text-xs font-medium text-orange-850 dark:text-orange-300">Upload Image</p>
                  <p className="text-[11px] text-orange-400/80 mt-1">PNG, JPG up to 5MB</p>
                </div>

                {imageFile && (
                  <div className="absolute inset-1.5 bg-orange-100/90 rounded flex flex-col items-center justify-center p-4 border border-orange-200 animate-scale-in">
                    <svg className="w-8 h-8 text-emerald-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    <p className="text-xs font-medium text-orange-950 truncate w-full text-center px-4">{imageFile.name}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setImageFile(null); }} className="mt-3 text-xs font-medium text-rose-600 hover:text-rose-500 transition-colors">Discard</button>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-tactile-orange py-2.5 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 group shadow-tactile-primary"
                >
                  {loading ? 'Adding Product...' : (
                    <>
                      Add Product
                      <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full btn-secondary py-2.5 text-sm font-semibold active:scale-[0.98] shadow-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
