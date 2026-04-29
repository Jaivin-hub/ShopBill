import React, { useState, useMemo, useCallback, useEffect, memo, useRef } from 'react';
import { IndianRupee, Trash2, ShoppingCart, Minus, Plus, Search, X, Loader2, ScanLine, ChevronRight, Calculator, Printer, Package, User, CreditCard, XCircle, Sparkles, Box, ChevronDown, Receipt, Clock, ArrowRight } from 'lucide-react';
import PaymentModal, { WALK_IN_CUSTOMER } from './PaymentModal';
import ScannerModal from './ScannerModal';
import { useDebounce } from '../hooks/useDebounce';

const BillingPOS = memo(({ darkMode, apiClient, API, showToast, refreshRecentSalesRef, currentUser, requestAttendanceDecision }) => {
  const isTextileShop = (currentUser?.businessType || 'grocery') === 'textile';
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [variantSelectorItem, setVariantSelectorItem] = useState(null);
  const [isRecentSalesOpen, setIsRecentSalesOpen] = useState(false);
  const [recentSales, setRecentSales] = useState([]);
  const [salesLastReadAt, setSalesLastReadAt] = useState(null); // server-backed; when user opens modal we call mark-recent-read so count persists across navigation
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isFetchingSaleDetail, setIsFetchingSaleDetail] = useState(false);
  const [shopInfo, setShopInfo] = useState(null);
  const justClosedBillRef = useRef({ id: null, at: 0 });
  const closedBillIdRef = useRef(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invResponse, custResponse, offersResponse] = await Promise.all([
        apiClient.get(API.inventory),
        apiClient.get(API.customers),
        apiClient.get(API.offers).catch(() => ({ data: { offers: [] } })),
      ]);
      setInventory(invResponse.data || []);
      setCustomers(custResponse.data || []);
      const loadedOffers = Array.isArray(offersResponse?.data)
        ? offersResponse.data
        : (Array.isArray(offersResponse?.data?.offers) ? offersResponse.data.offers : []);
      setOffers(loadedOffers);
    } catch (error) {
      showToast('Error loading POS data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, API.inventory, API.customers, API.offers, showToast]);

  // Only fetch on mount, not when fetchData callback changes
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchData();
    }
  }, []); // Empty deps - only run on mount

  // Fetch recent sales (response includes lastReadAt for badge count). silent=true = no spinner, refresh in background.
  const fetchRecentSales = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingSales(true);
    try {
      const response = await apiClient.get(`${API.sales}?limit=10`);
      setRecentSales(response.data?.sales || []);
      if (response.data?.lastReadAt != null) {
        setSalesLastReadAt(response.data.lastReadAt instanceof Date ? response.data.lastReadAt : new Date(response.data.lastReadAt));
      }
    } catch (error) {
      if (error?.cancelled || error?.message?.includes?.('cancelled')) return;
      console.error('Error fetching recent sales:', error);
      if (!silent) showToast('Failed to load recent sales', 'error');
    } finally {
      setIsLoadingSales(false);
    }
  }, [apiClient, API.sales, showToast]);

  // When user opens Recent Sales modal: mark read, then refresh list (silent if we already have data to avoid double loading)
  const handleOpenRecentSales = useCallback(async () => {
    setIsRecentSalesOpen(true);
    try {
      const readRes = await apiClient.post(`${API.sales}/mark-recent-read`);
      const at = readRes?.data?.lastReadAt;
      if (at) setSalesLastReadAt(at instanceof Date ? at : new Date(at));
    } catch (e) {
      setSalesLastReadAt(new Date());
    }
    fetchRecentSales(recentSales.length > 0);
  }, [apiClient, API.sales, fetchRecentSales, recentSales.length]);

  // When user closes Recent Sales modal, keep count as seen (already marked read on open)
  const handleCloseRecentSales = useCallback(() => {
    setIsRecentSalesOpen(false);
  }, []);

  // Fetch recent sales on mount so the sales history count badge shows on billing page load
  const hasFetchedRecentSalesRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRecentSalesRef.current && apiClient && API?.sales) {
      hasFetchedRecentSalesRef.current = true;
      fetchRecentSales();
    }
  }, [apiClient, API, fetchRecentSales]);

  // Register refresh with App so socket 'new_sale' can trigger immediate count update on billing page
  useEffect(() => {
    if (refreshRecentSalesRef) refreshRecentSalesRef.current = fetchRecentSales;
    return () => {
      if (refreshRecentSalesRef) refreshRecentSalesRef.current = null;
    };
  }, [refreshRecentSalesRef, fetchRecentSales]);

  // Fetch shop info for bill display
  useEffect(() => {
    const fetchShopInfo = async () => {
      try {
        const response = await apiClient.get(API.profile);
        if (response.data) {
          setShopInfo({
            shopName: response.data.shopName || 'Shop',
            address: response.data.address || '',
            phone: response.data.phone || '',
            email: response.data.email || ''
          });
        }
      } catch (error) {
        console.error('Error fetching shop info:', error);
      }
    };
    fetchShopInfo();
  }, [apiClient, API.profile]);

  // Fetch sale detail for viewing (call after setting selectedSale to list item so modal opens immediately)
  const fetchSaleDetail = useCallback(async (saleId) => {
    setIsFetchingSaleDetail(true);
    try {
      const response = await apiClient.get(`${API.sales}/${saleId}`);
      const data = response.data;
      if (data?._id && closedBillIdRef.current === data._id) return;
      setSelectedSale(data);
    } catch (error) {
      console.error('Error fetching sale detail:', error);
      showToast('Failed to load bill details', 'error');
      setSelectedSale(null);
    } finally {
      setIsFetchingSaleDetail(false);
    }
  }, [apiClient, API.sales, showToast]);

  const closeBillDetail = useCallback(() => {
    const id = selectedSale?._id;
    setSelectedSale(null);
    if (id) {
      closedBillIdRef.current = id;
      justClosedBillRef.current = { id, at: Date.now() };
      setTimeout(() => {
        justClosedBillRef.current = { id: null, at: 0 };
      }, 500);
    }
  }, [selectedSale?._id]);

  const openBillDetail = useCallback((sale) => {
    const { id, at } = justClosedBillRef.current;
    if (sale._id && id === sale._id && Date.now() - at < 500) return;
    closedBillIdRef.current = null;
    setSelectedSale(sale);
    fetchSaleDetail(sale._id);
  }, [fetchSaleDetail]);

  // --- Core POS Logic ---
  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const activeOffers = useMemo(() => {
    const now = Date.now();
    return offers.filter((offer) => {
      if (!offer || offer.isActive === false) return false;
      const start = new Date(offer.startDate).getTime();
      const end = new Date(offer.endDate).getTime();
      if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
      return start <= now && now <= end;
    });
  }, [offers]);

  const getApplicableOffer = useCallback((itemId) => {
    const normalizedItemId = String(itemId || '');
    const productOffer = activeOffers.find((offer) => (
      offer.offerType === 'product' && String(offer.productId || '') === normalizedItemId
    ));
    if (productOffer) return productOffer;
    return activeOffers.find((offer) => offer.offerType === 'all_products') || null;
  }, [activeOffers]);

  const getDiscountedUnitPrice = useCallback((basePrice, itemId) => {
    const numericPrice = Number(basePrice) || 0;
    const appliedOffer = getApplicableOffer(itemId);
    if (!appliedOffer || numericPrice <= 0) {
      return {
        finalPrice: numericPrice,
        originalPrice: numericPrice,
        discountAmount: 0,
        appliedOffer: null,
      };
    }

    const discountValue = Number(appliedOffer.discountValue) || 0;
    let discountAmount = 0;
    if (appliedOffer.discountType === 'percentage') {
      discountAmount = (numericPrice * discountValue) / 100;
    } else {
      discountAmount = discountValue;
    }

    const finalPrice = Math.max(0, Number((numericPrice - discountAmount).toFixed(2)));
    const normalizedDiscountAmount = Number((numericPrice - finalPrice).toFixed(2));

    return {
      finalPrice,
      originalPrice: numericPrice,
      discountAmount: normalizedDiscountAmount,
      appliedOffer,
    };
  }, [getApplicableOffer]);

  // Debounce search term for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filteredInventory = useMemo(() => {
    const term = (scannedBarcode || debouncedSearchTerm).toLowerCase().trim();
    // Filter items that have stock (either base quantity or variant quantities)
    const inStockItems = inventory.filter(item => {
      if (item.variants && item.variants.length > 0) {
        // Check if any variant has stock
        return item.variants.some(v => (v.quantity || 0) > 0);
      }
      return (item.quantity || 0) > 0;
    });
    if (!term) return inStockItems.sort((a, b) => a.name.localeCompare(b.name));
    return inStockItems.filter(item =>
      item.name.toLowerCase().includes(term) || 
      (item.barcode && item.barcode.includes(term)) || 
      (item.hsn && item.hsn.includes(term)) ||
      (isTextileShop && (
        item.textileMeta?.brand?.toLowerCase()?.includes(term) ||
        item.textileMeta?.fabric?.toLowerCase()?.includes(term) ||
        item.textileMeta?.season?.toLowerCase()?.includes(term) ||
        item.textileMeta?.collection?.toLowerCase()?.includes(term)
      ))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, debouncedSearchTerm, scannedBarcode, isTextileShop]);

  const allCustomers = useMemo(() => [WALK_IN_CUSTOMER, ...customers.filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id)], [customers]);
  const resolvePaidMethod = useCallback((sale) => {
    const direct = String(sale?.paidVia || '').trim();
    if (direct) return direct;
    if (String(sale?.paymentMethod || '') === 'Mixed' && Number(sale?.amountPaid || 0) > 0) return 'UPI';
    return '';
  }, []);

  const getVariantDescriptor = useCallback((variant) => {
    if (!isTextileShop || !variant) return '';
    return [variant.size, variant.color].filter(Boolean).join(' · ');
  }, [isTextileShop]);

  const addItemToCart = useCallback((itemToAdd, variant = null) => {
    // If item has variants and no variant is selected, show variant selector
    if (itemToAdd.variants && itemToAdd.variants.length > 0 && !variant) {
      setVariantSelectorItem(itemToAdd);
      return;
    }

    setCart(prevCart => {
      const cartItemId = variant ? `${itemToAdd._id}_${variant._id}` : itemToAdd._id;
      const existingItem = prevCart.find(item => {
        const itemId = item.variantId ? `${item._id}_${item.variantId}` : item._id;
        return itemId === cartItemId;
      });

      if (existingItem) {
        const inventoryItem = inventory.find(i => i._id === itemToAdd._id);
        let availableStock;
        
        if (variant) {
          const variantInInventory = inventoryItem?.variants?.find(v => v._id.toString() === variant._id.toString());
          availableStock = variantInInventory?.quantity || 0;
        } else {
          availableStock = inventoryItem?.quantity || 0;
        }

        if (existingItem.quantity + 1 > availableStock) {
          showToast(`Stock limit reached.`, 'error');
          return prevCart;
        }
        return prevCart.map(item => {
          const itemId = item.variantId ? `${item._id}_${item.variantId}` : item._id;
          return itemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item;
        });
      }

      // Add new item to cart
      const variantDescriptor = getVariantDescriptor(variant);
      const priceInfo = getDiscountedUnitPrice(
        variant ? variant.price : itemToAdd.price,
        itemToAdd._id,
      );
      const cartItem = variant 
        ? {
            _id: itemToAdd._id,
            name: `${itemToAdd.name} (${variant.label}${variantDescriptor ? ` • ${variantDescriptor}` : ''})`,
            price: priceInfo.finalPrice,
            originalPrice: priceInfo.originalPrice,
            discountAmount: priceInfo.discountAmount,
            appliedOfferId: priceInfo.appliedOffer?._id || null,
            appliedOfferTitle: priceInfo.appliedOffer?.title || '',
            quantity: 1,
            variantId: variant._id,
            variantLabel: variant.label,
            variantSize: variant.size || '',
            variantColor: variant.color || ''
          }
        : {
            ...itemToAdd,
            price: priceInfo.finalPrice,
            originalPrice: priceInfo.originalPrice,
            discountAmount: priceInfo.discountAmount,
            appliedOfferId: priceInfo.appliedOffer?._id || null,
            appliedOfferTitle: priceInfo.appliedOffer?.title || '',
            quantity: 1,
          };

      return [...prevCart, cartItem];
    });
    
    setLastAddedId(itemToAdd._id);
    setTimeout(() => setLastAddedId(null), 500);
    setVariantSelectorItem(null);
  }, [inventory, showToast, getVariantDescriptor, getDiscountedUnitPrice]);

  const updateCartQuantity = useCallback((itemId, amount, variantId = null) => {
    setCart(prevCart => {
      const cartItemId = variantId ? `${itemId}_${variantId}` : itemId;
      const item = prevCart.find(i => {
        const iId = i.variantId ? `${i._id}_${i.variantId}` : i._id;
        return iId === cartItemId;
      });
      
      if (!item) return prevCart;
      
      const inventoryItem = inventory.find(i => i._id === itemId);
      if (!inventoryItem) return prevCart;

      let availableStock;
      if (variantId) {
        const variant = inventoryItem.variants?.find(v => v._id.toString() === variantId.toString());
        availableStock = variant?.quantity || 0;
      } else {
        availableStock = inventoryItem.quantity || 0;
      }

      const newQuantity = item.quantity + amount;
      if (amount > 0 && newQuantity > availableStock) {
        showToast('Stock limit reached', 'error');
        return prevCart;
      }
      
      const iId = item.variantId ? `${item._id}_${item.variantId}` : item._id;
      return newQuantity <= 0 
        ? prevCart.filter(i => {
            const checkId = i.variantId ? `${i._id}_${i.variantId}` : i._id;
            return checkId !== cartItemId;
          })
        : prevCart.map(i => {
            const checkId = i.variantId ? `${i._id}_${i.variantId}` : i._id;
            return checkId === cartItemId ? { ...i, quantity: newQuantity } : i;
          });
    });
  }, [inventory, showToast]);

  const removeItemFromCart = useCallback((itemId, variantId = null) => {
    setCart(prevCart => {
      const norm = (id) => (id == null ? '' : String(id));
      if (variantId != null && variantId !== '') {
        const cartItemId = `${norm(itemId)}_${norm(variantId)}`;
        return prevCart.filter(item => {
          const iId = item.variantId != null ? `${norm(item._id)}_${norm(item.variantId)}` : norm(item._id);
          return iId !== cartItemId; // keep items that are NOT the one to remove
        });
      }
      // Non-variant: remove the one matching itemId; keep all others (and all variant items)
      return prevCart.filter(item => {
        const isMatch = norm(item._id) === norm(itemId) && (item.variantId == null || item.variantId === '');
        return !isMatch;
      });
    });
  }, []);

  const handleCancelTransaction = () => {
    if (cart.length === 0) return;
    setCart([]);
    setSearchTerm('');
    showToast("Transaction Discarded", "info");
  };

  const handleOpenPaymentModal = useCallback(async () => {
    try {
      const allowed = typeof requestAttendanceDecision === 'function'
        ? await requestAttendanceDecision()
        : true;
      if (allowed !== false) setIsPaymentModalOpen(true);
    } catch (error) {
      // ignore: prompt flow already handles UX
    }
  }, [requestAttendanceDecision]);

  const scrollToCart = () => {
    const cartSection = document.getElementById('billing-list-section');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // UPDATED: Process Payment now handles mixed/split data correctly
  const processPayment = useCallback(async (amountPaid, amountCredited, paymentMethod, finalCustomer, paidVia = null) => {
    if (totalAmount <= 0) return;
    
    const customerToBill = finalCustomer || WALK_IN_CUSTOMER;
    
    // Construct the payload to match the backend expectation
    const saleData = {
      totalAmount: totalAmount,
      paymentMethod: paymentMethod, // 'Split Payment', 'Cash/UPI', or 'Credit'
      paidVia: paymentMethod === 'Mixed' ? paidVia : null,
      customer: customerToBill.name,
      customerId: (customerToBill._id || customerToBill.id),
      items: cart.map(item => ({ 
        itemId: item._id, 
        name: item.name, 
        quantity: item.quantity, 
        price: item.price,
        originalPrice: item.originalPrice ?? item.price,
        discountAmount: item.discountAmount || 0,
        appliedOfferId: item.appliedOfferId || null,
        appliedOfferTitle: item.appliedOfferTitle || null,
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || null,
        variantSize: item.variantSize || null,
        variantColor: item.variantColor || null
      })),
      // Ensure these are numbers
      amountPaid: parseFloat(amountPaid) || 0,
      amountCredited: parseFloat(amountCredited) || 0,
    };

    try {
      const response = await apiClient.post(API.sales, saleData, { headers: { 'x-skip-attendance-prompt': '1' } });
      showToast('Sale Success', 'success');
      setCart([]);
      setIsPaymentModalOpen(false);
      fetchData(); // Refresh inventory and customer balances
      // Optimistic update: prepend new sale so badge count shows instantly
      const newSale = response?.data?.newSale;
      if (newSale) {
        setRecentSales(prev => [newSale, ...prev].slice(0, 10));
      }
      await fetchRecentSales(); // Sync canonical list (populated customerId, etc.)
    } catch (error) {
      // Re-throw so the Modal can catch "Credit Limit Exceeded" errors
      throw error; 
    }
  }, [totalAmount, cart, apiClient, API.sales, fetchData, fetchRecentSales, showToast])

  const handlePhysicalScannerInput = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      setScannedBarcode(searchTerm);
      setSearchTerm('');
      e.preventDefault();
    }
  }

  const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';

  if (isLoading) return (
    <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
        <p className="text-xs font-black opacity-40 tracking-widest">Initializing Terminal...</p>
    </div>
  );

  return (
    <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${themeBase}`}>
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 10px; }
        .product-grid-scroll { max-height: 450px; overflow-y: auto; }
        .product-grid-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .product-grid-scroll::-webkit-scrollbar-track { background: transparent; }
        .product-grid-scroll::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 10px; }
        .no-zoom-input { font-size: 16px !important; }
        @keyframes cartPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        .cart-animate { animation: cartPulse 0.3s ease-in-out; }
        @keyframes cartBulge {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
        }
        .cart-bulge { animation: cartBulge 1.8s ease-in-out infinite; }
      `}</style>

      <header className={`sticky top-0 z-[100] shrink-0 w-full backdrop-blur-xl border-b px-4 md:px-8 py-4 transition-colors ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'} ${darkMode ? 'bg-gray-950/95' : 'bg-slate-50/95'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Billing <span className="text-indigo-500">Terminal</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-black tracking-[0.2em]">Active Session • High Performance Mode</p>
            </div>
            <div className="flex gap-2">
                <button 
                  onClick={handleOpenRecentSales} 
                  className={`p-2.5 border rounded-xl transition-all active:scale-90 relative ${darkMode ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-white border-slate-200 text-indigo-600 shadow-sm'}`}
                >
                  <Receipt className="w-5 h-5" />
                    {(() => {
                                    const unseenCount = salesLastReadAt == null
                                      ? recentSales.length
                                      : recentSales.filter(s => new Date(s.timestamp) > new Date(salesLastReadAt)).length;
                                    return unseenCount > 0 ? (
                      <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                        {unseenCount > 9 ? '9+' : unseenCount}
                      </span>
                    ) : null;
                  })()}
                </button>
                <button onClick={() => setIsCameraScannerOpen(true)} className={`p-2.5 border rounded-xl transition-all active:scale-90 ${darkMode ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-white border-slate-200 text-indigo-600 shadow-sm'}`}>
                  <ScanLine className="w-5 h-5" />
                </button>
            </div>
          </div>

          <div className="relative group overflow-hidden rounded-2xl">
            <Search className={`w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 z-10 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <input
              type="text" 
              placeholder="search by name, barcode, or hsn..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handlePhysicalScannerInput}
              className={`w-full border rounded-2xl py-3.5 pl-12 pr-12 text-[16px] md:text-[10px] font-black tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${inputBase}`}
            />
            {searchTerm && <X onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 cursor-pointer hover:text-indigo-500 z-10" />}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-8 pb-36 md:pb-44">
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-500" />
                    <p className="text-[10px] font-black text-slate-500 tracking-widest">Catalog ({filteredInventory.length})</p>
                </div>
              </div>
              
              <div className="product-grid-scroll custom-scroll pr-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                    {filteredInventory.map(item => {
                      const hasVariants = item.variants && item.variants.length > 0;
                      const itemOffer = getApplicableOffer(item._id);
                      const totalStock = hasVariants 
                        ? item.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                        : (item.quantity || 0);
                      const priceDisplay = hasVariants
                        ? (() => {
                            const prices = item.variants
                              .map(v => getDiscountedUnitPrice(v.price, item._id).finalPrice)
                              .filter(p => p !== undefined && p !== null);
                            if (prices.length === 0) return 'N/A';
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            return minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice}-${maxPrice}`;
                          })()
                        : `₹${getDiscountedUnitPrice(item.price || 0, item._id).finalPrice}`;

                      return (
                        <button
                          key={item._id}
                          onClick={() => addItemToCart(item)}
                          className={`p-3 rounded-xl border transition-all text-left active:scale-95 group relative overflow-hidden ${cardBase} hover:border-indigo-500/50 ${lastAddedId === item._id ? 'border-indigo-500 ring-2 ring-indigo-500/20' : ''}`}
                        >
                          <div className="relative z-10">
                            <div className="flex items-center gap-1 mb-1">
                              <p className="text-[9px] font-black truncate leading-tight group-hover:text-indigo-500">{item.name}</p>
                              {hasVariants && (
                                <span className={`text-[6px] font-black px-1 py-0.5 rounded flex-shrink-0 ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                  {item.variants.length}V
                                </span>
                              )}
                              {itemOffer && (
                                <span className={`text-[6px] font-black px-1 py-0.5 rounded flex-shrink-0 ${darkMode ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                                  OFF
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-black text-emerald-500 tracking-tighter">{priceDisplay}</p>
                          </div>
                          <div className={`absolute bottom-1 right-1 text-[8px] font-black px-1 rounded ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                            {totalStock}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </section>

            <section id="billing-list-section">
              <div className="flex items-center gap-2 mb-4 px-1">
                <ShoppingCart className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-black text-slate-500 tracking-widest">Billing List ({cart.length})</p>
              </div>

              <div className="space-y-2">
                  {[...cart].reverse().map(item => {
                    const cartItemId = item.variantId ? `${item._id}_${item.variantId}` : item._id;
                    return (
                      <div key={cartItemId} className={`rounded-2xl border p-3 md:p-4 flex items-center justify-between transition-all hover:bg-indigo-500/[0.02] ${cardBase}`}>
                        <div className="flex-1 truncate pr-2 md:pr-4 min-w-0">
                          <p className="text-xs font-black truncate mb-0.5">{item.name}</p>
                          <p className="text-[9px] font-bold text-slate-500 tracking-wider">Unit: ₹{item.price.toLocaleString()}</p>
                          {item.discountAmount > 0 && item.originalPrice > item.price && (
                            <p className="text-[8px] font-bold text-emerald-500 tracking-wider">
                              Offer: ₹{item.originalPrice.toLocaleString()} - ₹{item.discountAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-4 md:gap-8 flex-shrink-0">
                          <div className={`flex items-center rounded-xl border p-1 ${darkMode ? 'bg-gray-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <button onClick={() => updateCartQuantity(item._id, -1, item.variantId)} className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-8 text-center text-xs font-black text-indigo-500">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item._id, 1, item.variantId)} className="p-1.5 text-slate-500 hover:text-emerald-500 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                          </div>
                          
                          <div className="text-right min-w-[70px] md:min-w-[90px]">
                            <p className="text-sm font-black text-emerald-500">₹{(item.quantity * item.price).toLocaleString()}</p>
                            <button onClick={() => removeItemFromCart(item._id, item.variantId)} className="text-[8px] font-black text-rose-500/60 hover:text-rose-500 tracking-widest">Remove</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {cart.length === 0 && (
                    <div className={`text-center py-20 border-2 border-dashed rounded-3xl transition-colors ${darkMode ? 'border-slate-900 bg-slate-900/20' : 'border-slate-100 bg-white/50'}`}>
                        <div className="bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-8 h-8 text-indigo-500/40" />
                        </div>
                        <h3 className="text-sm font-black tracking-widest opacity-40">Cart is Empty</h3>
                    </div>
                  )}
              </div>
            </section>
        </div>
      </div>

      {cart.length > 0 && (
        <footer className={`fixed bottom-0 left-0 right-0 z-[40] md:z-[100] border-t shadow-[0_-20px_40px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-colors ${darkMode ? 'bg-gray-950/90 border-slate-800' : 'bg-white/90 border-slate-200'} md:bottom-0 bottom-[72px]`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3 md:gap-4 px-3 py-2.5 md:px-8 md:py-5 pb-safe md:pb-5">
            {/* Mobile: single compact row */}
            <div className="w-full md:flex-1 flex flex-row md:flex-row items-center gap-2 md:gap-4">
              <div className={`flex-1 min-w-0 border rounded-xl md:rounded-2xl px-3 py-2 md:px-6 md:py-4 flex flex-row md:flex-row items-center justify-between gap-2 shadow-inner ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="min-w-0">
                  <p className="text-[8px] md:text-[9px] font-black text-slate-500 tracking-[0.15em] md:tracking-[0.2em]">Total</p>
                  <p className="text-lg md:text-2xl font-black tracking-tighter text-indigo-500 truncate">₹{totalAmount.toLocaleString('en-IN')}</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4 shrink-0">
                  <span className="text-[10px] md:text-[9px] font-black text-slate-500">{cart.length}×{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                  <button
                    onClick={scrollToCart}
                    className="md:hidden relative flex items-center justify-center w-9 h-9 rounded-full bg-indigo-600 text-white active:scale-90 transition-transform shrink-0 cart-bulge"
                    aria-label="View Cart"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-[9px] font-black min-w-[14px] h-[14px] flex items-center justify-center rounded-full border-2 border-indigo-600">
                      {cart.length}
                    </span>
                  </button>
                  <div className="hidden md:flex gap-4">
                    <div className="text-right border-r border-slate-700/30 pr-4">
                      <p className="text-[9px] font-black text-slate-500 tracking-widest mb-1">Items</p>
                      <p className="text-sm font-black">{cart.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-500 tracking-widest mb-1">Qty</p>
                      <p className="text-sm font-black">{cart.reduce((a, b) => a + b.quantity, 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto flex flex-row items-center gap-2 md:gap-3 h-11 md:h-[68px]">
              <button
                onClick={handleCancelTransaction}
                className={`group h-full px-4 md:px-6 border rounded-xl md:rounded-2xl flex items-center justify-center gap-1.5 md:gap-2 transition-all active:scale-95 shrink-0 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-rose-500' : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600'}`}
                aria-label="Discard"
              >
                <XCircle className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-90 transition-transform" />
                <span className="text-[9px] md:text-[10px] font-black tracking-widest hidden sm:inline">Discard</span>
              </button>

              <button
                onClick={handleOpenPaymentModal}
                className="flex-1 md:min-w-[260px] h-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl md:rounded-2xl font-black text-[10px] md:text-[11px] tracking-[0.15em] md:tracking-[0.2em] flex items-center justify-center gap-2 md:gap-3 shadow-lg shadow-indigo-500/40 transition-all active:scale-95 min-w-0"
              >
                Collect Payment <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </footer>
      )}

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={totalAmount}
        allCustomers={allCustomers}
        processPayment={processPayment}
        showToast={showToast}
        apiClient={apiClient}
        darkMode={darkMode}
      />
      <ScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        inventory={inventory}
        onScanSuccess={(item) => { setIsCameraScannerOpen(false); addItemToCart(item); }}
        onScanNotFound={(code) => { 
          showToast(`Item "${code}" not found.`, 'error'); 
          setIsCameraScannerOpen(false);
        }}
        onScanError={(error) => {
          console.error('Scanner error:', error);
          showToast(error || 'Camera access failed.', 'error');
          setIsCameraScannerOpen(false);
        }}
        darkMode={darkMode}
      />

      {/* Recent Sales Modal */}
      {isRecentSalesOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4" onClick={handleCloseRecentSales}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div 
            className={`relative w-full max-w-xl md:max-w-2xl h-[85vh] sm:h-[80vh] max-h-[600px] ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border shadow-2xl overflow-hidden flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-3 sm:p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center shrink-0`}>
              <div className="flex items-center gap-3">
                <Receipt className={`w-5 h-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <div>
                  <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Recent Sales
                  </h3>
                  <p className={`text-xs font-bold mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Click on any bill to view details
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseRecentSales}
                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto custom-scroll flex-1 min-h-0">
              {isLoadingSales ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : recentSales.length > 0 ? (
                <div className="space-y-2">
                  {recentSales.map((sale) => {
                    const formatTime = (timestamp) => {
                      const date = new Date(timestamp);
                      const now = new Date();
                      const diffMs = now - date;
                      const diffMins = Math.floor(diffMs / 60000);
                      if (diffMins < 1) return 'Just now';
                      if (diffMins < 60) return `${diffMins}m ago`;
                      const diffHours = Math.floor(diffMins / 60);
                      if (diffHours < 24) return `${diffHours}h ago`;
                      return date.toLocaleDateString();
                    };

                    return (
                      <div
                        key={sale._id}
                        onClick={() => openBillDetail(sale)}
                        className={`group flex items-center justify-between p-4 border rounded-xl transition-all cursor-pointer active:scale-[0.98] hover:border-indigo-500/50 ${
                          darkMode 
                            ? 'bg-gray-950 border-slate-800 hover:bg-slate-900' 
                            : 'bg-slate-50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                            sale.amountCredited > 0 
                              ? 'bg-rose-500/5 border-rose-500/20 text-rose-600' 
                              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
                          }`}>
                            <Receipt className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className={`text-sm font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {sale.customerName || sale.customerId?.name || 'Walk-in Customer'}
                            </span>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {formatTime(sale.timestamp)}
                              </span>
                              <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                              <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {sale.items?.length || 0} Items
                              </span>
                              {sale.paymentMethod && (
                                <>
                                  <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />
                                  <span className={`text-[10px] font-bold uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {sale.paymentMethod}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className={`text-base font-black tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              ₹{sale.totalAmount?.toLocaleString()}
                            </p>
                            {sale.amountCredited > 0 && (
                              <span className={`text-[10px] font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                                Due: ₹{sale.amountCredited.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <ArrowRight className={`w-5 h-5 transition-all ${darkMode ? 'text-slate-600 group-hover:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600'} group-hover:translate-x-1`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Receipt className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    No recent sales found
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal - Reusing from SalesActivityPage */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-3 sm:p-4 z-[300] backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); closeBillDetail(); }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4;
                margin: 15mm;
              }
              /* Hide everything on the page */
              body * {
                visibility: hidden;
              }
              /* Show only the invoice content and its children */
              .print-content {
                visibility: visible !important;
                display: block !important;
              }
              .print-content * {
                visibility: visible !important;
              }
              /* Hide backdrop but keep print-content visible */
              body > div.fixed.inset-0 {
                background: transparent !important;
                backdrop-filter: none !important;
                position: static !important;
                display: block !important;
              }
              body { 
                background: white !important; 
                color: black !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .print-content { 
                box-shadow: none !important; 
                border: 1px solid #000 !important; 
                width: 210mm !important;
                max-width: 210mm !important;
                min-width: 210mm !important;
                margin: 0 auto !important;
                padding: 15mm !important;
                position: relative !important;
                left: auto !important;
                top: auto !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                page-break-inside: avoid !important;
                background: white !important;
                color: black !important;
              }
              /* Convert all colors to black and white */
              .print-content * {
                color: black !important;
                background: white !important;
                border-color: #000 !important;
              }
              /* Keep borders visible but in black */
              .print-content .border,
              .print-content [class*="border"] {
                border-color: #000 !important;
              }
              .print-content > * {
                page-break-inside: avoid !important;
                overflow: visible !important;
              }
              .print-content div {
                page-break-inside: avoid !important;
              }
              .custom-scroll {
                overflow: visible !important;
                max-height: none !important;
                height: auto !important;
              }
              /* Hide icons, buttons, and decorative elements */
              .print-content svg,
              .print-content [class*="lucide"],
              .print-content button {
                display: none !important;
              }
            }
          `}} />
          <div 
            className={`print-content ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-xl border w-full max-w-md overflow-hidden shadow-2xl h-[85vh] sm:h-[80vh] max-h-[600px] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedSale ? (
              <>
                <div className={`p-5 border-b flex justify-between items-center ${darkMode ? 'bg-gray-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[10px] font-black text-indigo-500 tracking-widest">Invoice Summary</span>
                    </div>
                    <h3 className={`text-base font-bold tabular-nums tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      #{selectedSale._id?.slice(-12).toUpperCase()}
                    </h3>
                    {(selectedSale.timestamp || selectedSale.createdAt) && (
                      <p className={`text-[10px] font-bold mt-1 flex items-center gap-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Clock className="w-3 h-3" />
                        {new Date(selectedSale.timestamp || selectedSale.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); closeBillDetail(); }} 
                    className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-200 text-slate-400'}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto custom-scroll">
                  {shopInfo && (
                    <div className={`pb-4 border-b text-center space-y-1 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <h2 className={`text-lg font-black uppercase tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {shopInfo.shopName}
                      </h2>
                      {shopInfo.address && (
                        <p className={`text-[10px] font-bold leading-relaxed px-4 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {shopInfo.address}
                        </p>
                      )}
                    </div>
                  )}

                  <div className={`flex flex-col gap-1 p-3.5 rounded-lg border ${darkMode ? 'bg-gray-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                    <span className={`text-[9px] font-bold tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Billed To</span>
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedSale.customerName || selectedSale.customerId?.name || 'Walk-in Customer'}
                      </span>
                    </div>
                  </div>

                  {selectedSale.paymentMethod && (
                    <div className={`flex flex-col gap-1 p-3.5 rounded-lg border ${darkMode ? 'bg-gray-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                      <span className={`text-[9px] font-bold tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Payment Method</span>
                      <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {selectedSale.paymentMethod === 'Mixed'
                          ? (() => {
                              const paidVia = resolvePaidMethod(selectedSale);
                              const hasCredit = Number(selectedSale.amountCredited || 0) > 0;
                              if (paidVia && hasCredit) return `${paidVia} & Credit`;
                              if (paidVia) return paidVia;
                              return 'Mixed Payment';
                            })()
                          : selectedSale.paymentMethod}
                      </span>
                      {selectedSale.paymentMethod === 'Mixed' && (
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {Number(selectedSale.amountPaid || 0) > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {resolvePaidMethod(selectedSale) || 'Paid'}: ₹{Number(selectedSale.amountPaid || 0).toLocaleString('en-IN')}
                            </span>
                          )}
                          {Number(selectedSale.amountCredited || 0) > 0 && (
                            <span className="text-[10px] font-bold text-rose-500">
                              Credit: ₹{Number(selectedSale.amountCredited || 0).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                    <span className={`text-[9px] font-bold tracking-widest px-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Line Items</span>
                    <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      {isFetchingSaleDetail && (!selectedSale.items || selectedSale.items.length === 0) ? (
                        <div className={`flex items-center justify-center gap-2 p-6 ${darkMode ? 'bg-slate-900/20' : 'bg-slate-50'}`}>
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                          <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Loading items...</span>
                        </div>
                      ) : (
                        selectedSale.items?.map((item, i) => (
                          <div key={i} className={`flex justify-between items-center p-3 text-xs border-b last:border-0 ${darkMode ? 'border-slate-800 bg-slate-900/20' : 'border-slate-100 bg-white'}`}>
                            <div className="flex flex-col">
                              <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {item.name || 'General Item'}
                              </span>
                              <span className={`text-[10px] font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                Qty: {item.quantity} × ₹{item.price?.toLocaleString()}
                              </span>
                            </div>
                            <span className={`font-bold tabular-nums ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className={`p-6 border-t space-y-4 ${darkMode ? 'bg-gray-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <p className={`text-[10px] font-bold tracking-widest ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Grand Total</p>
                      <p className={`text-2xl font-black tabular-nums tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        ₹{selectedSale.totalAmount?.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2.5 py-1 rounded text-[9px] font-black tracking-tight border ${
                        selectedSale.amountCredited > 0 
                          ? 'border-rose-500/20 text-rose-500 bg-rose-500/5' 
                          : 'border-emerald-500/20 text-emerald-600 bg-emerald-500/5'
                      }`}>
                        {selectedSale.amountCredited > 0 ? 'Payment Pending' : 'Fully Paid'}
                      </span>
                      {selectedSale.amountCredited > 0 && (
                        <div className="flex flex-col items-end gap-0.5">
                          {selectedSale.amountPaid > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              {selectedSale.paymentMethod === 'Mixed' && resolvePaidMethod(selectedSale)
                                ? `${resolvePaidMethod(selectedSale)}:`
                                : 'Paid:'} ₹{selectedSale.amountPaid?.toLocaleString()}
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-rose-500">Balance: ₹{selectedSale.amountCredited?.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      onClick={() => window.print()} 
                      className="flex-1 py-3 bg-indigo-600 text-white text-[11px] font-bold tracking-wider rounded-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                    >
                      <Printer className="w-4 h-4" /> Print Receipt
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); closeBillDetail(); }} 
                      className={`flex-1 py-3 text-[11px] font-bold tracking-wider rounded-lg border transition-all active:scale-[0.98] ${darkMode ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      Back to list
                    </button>
                  </div>
                </div>
              </>
          ) : null}
          </div>
        </div>
      )}

      {/* Variant Selector Modal */}
      {variantSelectorItem && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setVariantSelectorItem(null)}>
          <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm`} />
          <div 
            className={`relative w-full max-w-md ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`p-4 md:p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center shrink-0`}>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base md:text-lg font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Select Variant
                </h3>
                <p className={`text-xs font-bold mt-1 truncate ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {variantSelectorItem.name}
                </p>
              </div>
              <button
                onClick={() => setVariantSelectorItem(null)}
                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-all flex-shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto custom-scroll flex-1 min-h-0">
              <div className="space-y-2">
                {variantSelectorItem.variants
                  .filter(v => (v.quantity || 0) > 0)
                  .map((variant) => (
                    <button
                      key={variant._id}
                      onClick={() => addItemToCart(variantSelectorItem, variant)}
                      className={`w-full p-3 md:p-4 rounded-xl border text-left transition-all active:scale-95 hover:border-indigo-500/50 ${
                        darkMode 
                          ? 'bg-gray-950 border-slate-800 hover:bg-slate-900' 
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs md:text-sm font-black mb-1 truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {variant.label}
                          </p>
                          {isTextileShop && (variant.size || variant.color) && (
                            <p className={`text-[10px] font-bold mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              {[variant.size, variant.color].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          <div className="flex items-center gap-3 md:gap-4 mt-2">
                            <div>
                              <p className={`text-[8px] md:text-[9px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                              <p className="text-sm md:text-base font-black text-emerald-500">
                                ₹{getDiscountedUnitPrice(variant.price, variantSelectorItem._id).finalPrice?.toLocaleString() || '0'}
                              </p>
                            </div>
                            <div>
                              <p className={`text-[8px] md:text-[9px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock</p>
                              <p className={`text-sm md:text-base font-black ${(variant.quantity || 0) <= (variant.reorderLevel || 5) ? 'text-red-500' : 'text-indigo-500'}`}>
                                {variant.quantity || 0}
                              </p>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className={`w-4 h-4 md:w-5 md:h-5 ${darkMode ? 'text-slate-600' : 'text-slate-400'} flex-shrink-0`} />
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default BillingPOS;