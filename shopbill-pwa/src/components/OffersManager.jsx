import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Calendar, Plus, RefreshCw, Tag, Trash2 } from 'lucide-react';

const OFFER_TYPES = [
  { id: 'product', label: 'Individual Product Offer' },
  { id: 'all_products', label: 'All Products Discount' },
  { id: 'custom', label: 'Other Offer' },
];

const emptyForm = {
  title: '',
  description: '',
  offerType: 'product',
  productName: '',
  discountType: 'percentage',
  discountValue: '',
  startDate: '',
  endDate: '',
};

const OffersManager = ({ darkMode, apiClient, API, showToast, userRole }) => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const canManage = ['owner', 'manager'].includes(String(userRole || '').toLowerCase());

  const fetchOffers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(API.offers);
      const payload = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.offers) ? res.data.offers : []);
      setOffers(payload);
    } catch (error) {
      setOffers([]);
      showToast?.('Unable to load offers right now.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, API, showToast]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await apiClient.get(API.inventory);
        const payload = Array.isArray(res?.data) ? res.data : [];
        setProducts(payload);
      } catch (error) {
        setProducts([]);
      }
    };
    fetchProducts();
  }, [apiClient, API.inventory]);

  const statusBuckets = useMemo(() => {
    const now = new Date();
    const active = [];
    const scheduled = [];
    const expired = [];
    offers.forEach((offer) => {
      const start = new Date(offer.startDate);
      const end = new Date(offer.endDate);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        if (now < start) scheduled.push(offer);
        else if (now > end) expired.push(offer);
        else active.push(offer);
      } else {
        active.push(offer);
      }
    });
    return { active, scheduled, expired };
  }, [offers]);

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate || !form.discountValue) {
      showToast?.('Please fill title, discount, start date and end date.', 'error');
      return;
    }
    if (form.offerType === 'product' && !form.productName) {
      showToast?.('Please select a product.', 'error');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      showToast?.('End date must be after start date.', 'error');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      offerType: form.offerType,
      productId: form.offerType === 'product' ? form.productName : null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startDate: form.startDate,
      endDate: form.endDate,
    };

    setIsSaving(true);
    try {
      await apiClient.post(API.offers, payload);
      setForm(emptyForm);
      setIsFormOpen(false);
      showToast?.('Offer created successfully.', 'success');
      fetchOffers();
    } catch (error) {
      showToast?.('Failed to create offer. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!offerId) return;
    try {
      await apiClient.delete(API.offerById(offerId));
      showToast?.('Offer removed.', 'success');
      setOffers((prev) => prev.filter((o) => o._id !== offerId && o.id !== offerId));
    } catch (error) {
      showToast?.('Unable to delete offer now.', 'error');
    }
  };

  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-gray-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

  if (!canManage) {
    return (
      <div className={`h-full flex items-center justify-center ${darkMode ? 'bg-gray-950 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
        Access restricted.
      </div>
    );
  }

  const renderOfferList = (list, emptyLabel) => (
    <div className="space-y-3">
      {list.length === 0 ? (
        <p className={`text-xs font-bold ${textMuted}`}>{emptyLabel}</p>
      ) : list.map((offer) => (
        <div key={offer._id || offer.id} className={`border rounded-xl p-3 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{offer.title}</p>
              <p className={`text-[11px] font-bold mt-1 ${textMuted}`}>
                {offer.offerType === 'product' ? `Product: ${offer.productName || '-'}` : offer.offerType === 'all_products' ? 'All products' : 'Custom offer'}
              </p>
              <p className={`text-[11px] font-bold mt-1 ${textMuted}`}>
                {offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`} | {offer.startDate?.slice(0, 10)} to {offer.endDate?.slice(0, 10)}
              </p>
            </div>
            <button
              onClick={() => handleDeleteOffer(offer._id || offer.id)}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10"
              title="Delete offer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`h-full min-h-0 overflow-y-auto px-4 md:px-8 py-6 ${darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <section className={`${cardBase} border rounded-2xl p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">Offers <span className="text-indigo-500">Manager</span></h1>
              <p className={`text-[10px] font-black tracking-[0.2em] mt-1 ${textMuted}`}>CREATE AND SCHEDULE STORE OFFERS</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsFormOpen((prev) => !prev)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black tracking-widest flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isFormOpen ? 'CLOSE FORM' : 'ADD NEW OFFER'}
              </button>
              <button onClick={fetchOffers} className={`p-2.5 rounded-xl border ${cardBase}`} title="Refresh offers">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </section>

        {isFormOpen && (
          <section className={`${cardBase} border rounded-2xl p-5`}>
            <h2 className="text-sm font-black tracking-widest mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-500" /> NEW OFFER</h2>
            <form onSubmit={handleCreateOffer} className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Offer title" className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`} />
              <select value={form.offerType} onChange={(e) => setForm((p) => ({ ...p, offerType: e.target.value, productName: '' }))} className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`}>
                {OFFER_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
              </select>
              {form.offerType === 'product' && (
                <select value={form.productName} onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))} className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`}>
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product._id || product.id} value={product._id || product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              )}
              <select value={form.discountType} onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))} className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`}>
                <option value="percentage">Percentage Discount</option>
                <option value="flat">Flat Amount Discount</option>
              </select>
              <input type="number" step="0.01" min="0" value={form.discountValue} onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))} placeholder={form.discountType === 'percentage' ? 'Discount %' : 'Discount amount'} className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`} />
              <input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`} />
              <input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} className={`w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`} />
              <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Optional description" rows={3} className={`md:col-span-2 w-full border rounded-xl p-3 text-sm font-bold ${inputBase}`} />
              <button type="submit" disabled={isSaving} className="md:col-span-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-widest disabled:opacity-60">
                {isSaving ? 'CREATING OFFER...' : 'CREATE OFFER'}
              </button>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${cardBase} border rounded-2xl p-4`}>
            <h3 className="text-xs font-black tracking-widest mb-3 flex items-center gap-2"><BadgePercent className="w-4 h-4 text-emerald-500" /> ACTIVE OFFERS</h3>
            {renderOfferList(statusBuckets.active, 'No active offers.')}
          </div>
          <div className={`${cardBase} border rounded-2xl p-4`}>
            <h3 className="text-xs font-black tracking-widest mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-500" /> SCHEDULED OFFERS</h3>
            {renderOfferList(statusBuckets.scheduled, 'No scheduled offers.')}
          </div>
          <div className={`${cardBase} border rounded-2xl p-4`}>
            <h3 className="text-xs font-black tracking-widest mb-3 flex items-center gap-2"><Tag className="w-4 h-4 text-amber-500" /> EXPIRED OFFERS</h3>
            {renderOfferList(statusBuckets.expired, 'No expired offers.')}
          </div>
        </section>
      </div>
    </div>
  );
};

export default OffersManager;
