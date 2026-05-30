import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Calendar, Plus, RefreshCw, RotateCcw, Tag, Trash2, X } from 'lucide-react';
import { OffersInitialSkeleton } from './skeletons/PageSkeletons';
import ConfirmationModal from './ConfirmationModal';

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
  startTime: '00:00',
  endDate: '',
  endTime: '23:59',
};

const STATUS_TABS = [
  { id: 'active', label: 'Active', icon: BadgePercent, accent: 'border-l-emerald-500', iconClass: 'text-emerald-500' },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar, accent: 'border-l-indigo-500', iconClass: 'text-indigo-500' },
  { id: 'expired', label: 'Expired', icon: Tag, accent: 'border-l-amber-500', iconClass: 'text-amber-500' },
];

function defaultReactivateDateTimes() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const startTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  const endDate = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
  const endTime = startTime;
  return { startDate, startTime, endDate, endTime };
}

/** Start/end date+time rows: two columns per row, constrained for mobile native pickers */
function OfferDateTimeFields({
  startDate,
  startTime,
  endDate,
  endTime,
  onFieldChange,
  inputBase,
  textMuted,
  darkMode,
  className = '',
}) {
  const fieldInputClass = `w-full min-w-0 max-w-full box-border mt-0.5 min-h-[44px] border rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`;
  const colorScheme = darkMode ? 'dark' : 'light';
  const rows = [
    { label: 'Start', dateKey: 'startDate', timeKey: 'startTime', date: startDate, time: startTime },
    { label: 'End', dateKey: 'endDate', timeKey: 'endTime', date: endDate, time: endTime },
  ];

  return (
    <div className={`space-y-3 min-w-0 w-full max-w-full overflow-hidden ${className}`.trim()}>
      {rows.map(({ label, dateKey, timeKey, date, time }) => (
        <div key={label} className="min-w-0 w-full">
          <p className={`text-[10px] font-bold tracking-wider uppercase mb-1.5 ${textMuted}`}>{label}</p>
          <div className="grid grid-cols-2 gap-2 min-w-0 w-full">
            <div className="min-w-0">
              <label className={`text-[9px] font-bold tracking-wider ${textMuted}`}>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => onFieldChange(dateKey, e.target.value)}
                className={fieldInputClass}
                style={{ colorScheme }}
              />
            </div>
            <div className="min-w-0">
              <label className={`text-[9px] font-bold tracking-wider ${textMuted}`}>Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => onFieldChange(timeKey, e.target.value)}
                className={fieldInputClass}
                style={{ colorScheme }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const OffersManager = ({ darkMode, apiClient, API, showToast, userRole }) => {
  const [offers, setOffers] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [offerBucket, setOfferBucket] = useState('active');
  const [offerPendingDelete, setOfferPendingDelete] = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [reactivateFields, setReactivateFields] = useState(() => defaultReactivateDateTimes());
  const [isReactivating, setIsReactivating] = useState(false);

  const canManage = ['owner', 'manager'].includes(String(userRole || '').toLowerCase());

  const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
  const subCardBase = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200';
  const headerBase = darkMode ? 'bg-gray-950 border-gray-800/60' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900';
  const textMuted = darkMode ? 'text-slate-400' : 'text-slate-500';

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
      setHasLoadedOnce(true);
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

  const emptyMessages = useMemo(
    () => ({
      active: 'No active offers. Create one or check Scheduled.',
      scheduled: 'No upcoming offers scheduled.',
      expired: 'No expired offers in history.',
    }),
    []
  );

  const currentList = statusBuckets[offerBucket] || [];
  const currentTabMeta = STATUS_TABS.find((t) => t.id === offerBucket) || STATUS_TABS[0];
  const TabIcon = currentTabMeta.icon;

  const discountBadgeClass =
    offerBucket === 'active'
      ? darkMode
        ? 'bg-emerald-500/15 text-emerald-400'
        : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
      : offerBucket === 'scheduled'
        ? darkMode
          ? 'bg-indigo-500/15 text-indigo-300'
          : 'bg-indigo-50 text-indigo-700 border border-indigo-200/80'
        : darkMode
          ? 'bg-amber-500/12 text-amber-300'
          : 'bg-amber-50 text-amber-900 border border-amber-200/80';

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate || !form.startTime || !form.endTime || !form.discountValue) {
      showToast?.('Please fill title, discount, start/end date and start/end time.', 'error');
      return;
    }
    if (form.offerType === 'product' && !form.productName) {
      showToast?.('Please select a product.', 'error');
      return;
    }
    const startDateTime = new Date(`${form.startDate}T${form.startTime}`);
    const endDateTime = new Date(`${form.endDate}T${form.endTime}`);
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      showToast?.('Invalid start or end date/time.', 'error');
      return;
    }
    if (startDateTime > endDateTime) {
      showToast?.('End date/time must be after start date/time.', 'error');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      offerType: form.offerType,
      productId: form.offerType === 'product' ? form.productName : null,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
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

  const openReactivateModal = (offer) => {
    setReactivateTarget(offer);
    setReactivateFields(defaultReactivateDateTimes());
  };

  const handleReactivateOffer = async () => {
    if (!reactivateTarget) return;
    const { startDate, startTime, endDate, endTime } = reactivateFields;
    if (!startDate || !startTime || !endDate || !endTime) {
      showToast?.('Please set start and end date/time.', 'error');
      return;
    }
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
      showToast?.('Invalid start or end date/time.', 'error');
      return;
    }
    if (startDateTime > endDateTime) {
      showToast?.('End must be after start.', 'error');
      return;
    }
    const offer = reactivateTarget;
    const offerId = offer._id || offer.id;
    const rawProductId = offer.productId;
    const productId =
      offer.offerType === 'product'
        ? (typeof rawProductId === 'object' && rawProductId !== null ? rawProductId._id || rawProductId.id : rawProductId)
        : null;

    setIsReactivating(true);
    try {
      await apiClient.put(API.offerById(offerId), {
        title: offer.title,
        description: offer.description || '',
        offerType: offer.offerType,
        productId,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        isActive: true,
      });
      showToast?.('Offer reactivated.', 'success');
      setReactivateTarget(null);
      await fetchOffers();
    } catch (error) {
      showToast?.(error.response?.data?.error || 'Could not reactivate offer.', 'error');
    } finally {
      setIsReactivating(false);
    }
  };

  if (!canManage) {
    return (
      <div className={`h-full flex items-center justify-center ${themeBase}`}>
        <p className={`text-sm font-bold ${textMuted}`}>Access restricted.</p>
      </div>
    );
  }

  if (isLoading && !hasLoadedOnce) {
    return <OffersInitialSkeleton darkMode={darkMode} />;
  }

  return (
    <div className={`h-full flex flex-col min-h-0 ${themeBase} transition-colors duration-200`}>
      <header
        className={`sticky top-0 z-[100] shrink-0 ${headerBase} px-3 sm:px-4 md:px-8 pt-3 pb-3 md:py-4 border-b backdrop-blur-md ${darkMode ? 'bg-gray-950/95' : 'bg-white/95'}`}
      >
        <div className="max-w-7xl mx-auto space-y-3">
          {/* Mobile: tight title row + full-width primary CTA; md+: inline actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 pr-2">
              <h1 className={`text-lg sm:text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight leading-tight`}>
                Store <span className="text-indigo-500">Offers</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-gray-500 font-bold tracking-widest opacity-80 mt-0.5">Promotions &amp; pricing</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={fetchOffers}
                disabled={isLoading}
                className={`touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'bg-gray-900 border-gray-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600 shadow-sm'}`}
                title="Refresh"
                aria-label="Refresh offers"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsFormOpen((prev) => !prev)}
                className={`touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isFormOpen ? (darkMode ? 'bg-gray-900 border-gray-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700') : 'bg-indigo-600 border-indigo-500 text-white shadow-sm hover:bg-indigo-500'}`}
                title={isFormOpen ? 'Close form' : 'New offer'}
                aria-label={isFormOpen ? 'Close offer form' : 'New offer'}
              >
                {isFormOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile: 3-column tab grid (44px+ touch). Desktop: compact pill row */}
          <div
            role="tablist"
            aria-label="Offer status"
            className={`grid grid-cols-3 gap-1 p-1 rounded-xl border md:flex md:flex-nowrap md:overflow-x-auto md:no-scrollbar ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'}`}
          >
            {STATUS_TABS.map((tab) => {
              const isActive = offerBucket === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setOfferBucket(tab.id)}
                  className={`touch-manipulation flex items-center justify-center min-h-[44px] md:min-h-[40px] md:py-2 md:px-2 rounded-lg md:rounded-md transition-all font-bold text-[10px] md:text-[10px] md:tracking-tight md:whitespace-nowrap md:flex-1 ${isActive ? 'bg-indigo-600 text-white shadow-md' : darkMode ? 'text-gray-400 active:bg-gray-800' : 'text-slate-600 active:bg-white/80'}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8 space-y-4 md:space-y-6 pb-28 md:pb-20">
          {isFormOpen && (
            <section className={`${cardBase} rounded-2xl md:rounded-xl border p-4 md:p-5 min-w-0 overflow-hidden`}>
              <h2 className="text-[10px] font-bold text-gray-500 tracking-widest mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                CREATE OFFER
              </h2>
              <form onSubmit={handleCreateOffer} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 min-w-0 max-w-full">
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Offer title"
                  className={`w-full min-h-[44px] border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`}
                />
                <select
                  value={form.offerType}
                  onChange={(e) => setForm((p) => ({ ...p, offerType: e.target.value, productName: '' }))}
                  className={`w-full min-h-[44px] border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`}
                >
                  {OFFER_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {form.offerType === 'product' && (
                  <select
                    value={form.productName}
                    onChange={(e) => setForm((p) => ({ ...p, productName: e.target.value }))}
                    className={`w-full min-h-[44px] border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`}
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id || product.id} value={product._id || product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value }))}
                  className={`w-full min-h-[44px] border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`}
                >
                  <option value="percentage">Percentage discount</option>
                  <option value="flat">Flat amount discount</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discountValue}
                  onChange={(e) => setForm((p) => ({ ...p, discountValue: e.target.value }))}
                  placeholder={form.discountType === 'percentage' ? 'Discount %' : 'Discount amount'}
                  className={`w-full min-h-[44px] border rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`}
                />
                <OfferDateTimeFields
                  className="md:col-span-2"
                  darkMode={darkMode}
                  inputBase={inputBase}
                  textMuted={textMuted}
                  startDate={form.startDate}
                  startTime={form.startTime}
                  endDate={form.endDate}
                  endTime={form.endTime}
                  onFieldChange={(key, value) => setForm((p) => ({ ...p, [key]: value }))}
                />
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                  className={`md:col-span-2 w-full border rounded-xl p-3 text-sm font-bold outline-none focus:ring-1 focus:ring-indigo-500 ${inputBase}`}
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="touch-manipulation md:col-span-2 min-h-[48px] py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black tracking-widest disabled:opacity-60 transition-all active:scale-[0.99]"
                >
                  {isSaving ? 'Creating…' : 'Create offer'}
                </button>
              </form>
            </section>
          )}

          <section className={`${cardBase} rounded-2xl md:rounded-xl border p-3 sm:p-4 md:p-5`}>
            <div className="flex items-center gap-3 mb-3 md:mb-4">
              <div className={`p-2.5 rounded-xl ${darkMode ? 'bg-gray-900' : 'bg-slate-100'}`}>
                <TabIcon className={`w-5 h-5 ${currentTabMeta.iconClass}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-gray-500 tracking-widest">{currentTabMeta.label.toUpperCase()}</p>
                <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {currentList.length} {currentList.length === 1 ? 'offer' : 'offers'}
                </p>
              </div>
            </div>

            {currentList.length === 0 ? (
              <div className={`rounded-2xl border p-8 sm:p-10 text-center ${subCardBase}`}>
                <TabIcon className={`w-12 h-12 mx-auto mb-4 opacity-35 ${currentTabMeta.iconClass}`} />
                <p className={`text-sm font-bold leading-relaxed max-w-xs mx-auto ${textMuted}`}>{emptyMessages[offerBucket]}</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 list-none p-0 m-0">
                {currentList.map((offer) => {
                  const discountLabel =
                    offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `₹${offer.discountValue} off`;
                  const scopeLabel =
                    offer.offerType === 'product'
                      ? offer.productName || 'Product'
                      : offer.offerType === 'all_products'
                        ? 'All products'
                        : 'Custom';
                  return (
                    <li key={offer._id || offer.id} className="min-w-0">
                      <div
                        className={`w-full border rounded-2xl p-4 border-l-[5px] transition-all ${currentTabMeta.accent} ${darkMode ? 'bg-gray-950/90 border-gray-800' : 'bg-white border-slate-200 shadow-sm'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black tracking-tight ${discountBadgeClass}`}>
                                {discountLabel}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${textMuted}`}>{scopeLabel}</span>
                            </div>
                            <p className={`text-base font-black leading-snug break-words ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {offer.title}
                            </p>
                            <p className={`text-[12px] font-semibold leading-relaxed ${textMuted}`}>
                              {offer.startDate?.slice(0, 10)} → {offer.endDate?.slice(0, 10)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            {offerBucket === 'expired' && (
                              <button
                                type="button"
                                onClick={() => openReactivateModal(offer)}
                                className="touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-emerald-500 hover:bg-emerald-500/10 active:bg-emerald-500/15 transition-colors"
                                title="Reactivate offer"
                                aria-label={`Reactivate offer ${offer.title}`}
                              >
                                <RotateCcw className="w-5 h-5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setOfferPendingDelete(offer)}
                              className="touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 active:bg-rose-500/15 transition-colors"
                              title="Delete offer"
                              aria-label={`Delete offer ${offer.title}`}
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {offerPendingDelete && (
        <ConfirmationModal
          darkMode={darkMode}
          message={`Delete "${offerPendingDelete.title}" offer? This action cannot be undone.`}
          confirmText="Delete offer"
          cancelText="Cancel"
          onCancel={() => setOfferPendingDelete(null)}
          onConfirm={async () => {
            const offerId = offerPendingDelete?._id || offerPendingDelete?.id;
            await handleDeleteOffer(offerId);
            setOfferPendingDelete(null);
          }}
        />
      )}

      {reactivateTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => !isReactivating && setReactivateTarget(null)}
        >
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}
            role="dialog"
            aria-labelledby="reactivate-offer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
              <h2 id="reactivate-offer-title" className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Reactivate offer
              </h2>
              <button
                type="button"
                onClick={() => !isReactivating && setReactivateTarget(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                aria-label="Close"
                disabled={isReactivating}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className={`text-xs font-bold ${textMuted}`}>
                Set a new window for <span className={darkMode ? 'text-white' : 'text-slate-800'}>{reactivateTarget.title}</span>.
              </p>
              <OfferDateTimeFields
                darkMode={darkMode}
                inputBase={inputBase}
                textMuted={textMuted}
                startDate={reactivateFields.startDate}
                startTime={reactivateFields.startTime}
                endDate={reactivateFields.endDate}
                endTime={reactivateFields.endTime}
                onFieldChange={(key, value) => setReactivateFields((f) => ({ ...f, [key]: value }))}
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isReactivating}
                  onClick={() => setReactivateTarget(null)}
                  className={`flex-1 min-h-[44px] rounded-xl text-xs font-black tracking-widest border transition-colors ${darkMode ? 'border-gray-700 text-slate-300 hover:bg-gray-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isReactivating}
                  onClick={handleReactivateOffer}
                  className="flex-1 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black tracking-widest disabled:opacity-60 transition-colors"
                >
                  {isReactivating ? 'Saving…' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersManager;
