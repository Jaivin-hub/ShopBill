import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { IndianRupee, Trash2, ShoppingCart, Minus, Plus, Search, X, Loader2, ScanLine, ChevronRight, Calculator, Printer, Package, User, CreditCard, XCircle, Sparkles, Box, ArrowDown, ChevronDown } from 'lucide-react';
import PaymentModal, { WALK_IN_CUSTOMER } from './PaymentModal';
import ScannerModal from './ScannerModal';

const BillingPOS = ({ darkMode, apiClient, API, showToast }) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastAddedId, setLastAddedId] = useState(null);
  const [variantSelectorItem, setVariantSelectorItem] = useState(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invResponse, custResponse] = await Promise.all([
        apiClient.get(API.inventory),
        apiClient.get(API.customers),
      ]);
      setInventory(invResponse.data || []);
      setCustomers(custResponse.data || []);
    } catch (error) {
      showToast('Error loading POS data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, API.inventory, API.customers, showToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Core POS Logic ---
  const totalAmount = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  const filteredInventory = useMemo(() => {
    const term = (scannedBarcode || searchTerm).toLowerCase().trim();
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
      (item.hsn && item.hsn.includes(term))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, searchTerm, scannedBarcode]);

  const allCustomers = useMemo(() => [WALK_IN_CUSTOMER, ...customers.filter(c => (c._id || c.id) !== WALK_IN_CUSTOMER.id)], [customers]);

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
      const cartItem = variant 
        ? {
            _id: itemToAdd._id,
            name: `${itemToAdd.name} (${variant.label})`,
            price: variant.price,
            quantity: 1,
            variantId: variant._id,
            variantLabel: variant.label
          }
        : { ...itemToAdd, quantity: 1 };

      return [...prevCart, cartItem];
    });
    
    setLastAddedId(itemToAdd._id);
    setTimeout(() => setLastAddedId(null), 500);
    setVariantSelectorItem(null);
  }, [inventory, showToast]);

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
      if (variantId) {
        const cartItemId = `${itemId}_${variantId}`;
        return prevCart.filter(item => {
          const iId = item.variantId ? `${item._id}_${item.variantId}` : item._id;
          return iId !== cartItemId;
        });
      }
      return prevCart.filter(item => {
        // Only remove if it doesn't have a variant (to avoid removing variant items)
        return item._id === itemId && !item.variantId;
      });
    });
  }, []);

  const handleCancelTransaction = () => {
    if (cart.length === 0) return;
    setCart([]);
    setSearchTerm('');
    showToast("Transaction Discarded", "info");
  };

  const scrollToCart = () => {
    const cartSection = document.getElementById('billing-list-section');
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // UPDATED: Process Payment now handles mixed/split data correctly
  const processPayment = useCallback(async (amountPaid, amountCredited, paymentMethod, finalCustomer, force = false) => {
    if (totalAmount <= 0) return;
    
    const customerToBill = finalCustomer || WALK_IN_CUSTOMER;
    
    // Construct the payload to match the backend expectation
    const saleData = {
      totalAmount: totalAmount,
      paymentMethod: paymentMethod, // 'Split Payment', 'Cash/UPI', or 'Credit'
      customer: customerToBill.name,
      customerId: (customerToBill._id || customerToBill.id),
      items: cart.map(item => ({ 
        itemId: item._id, 
        name: item.name, 
        quantity: item.quantity, 
        price: item.price,
        variantId: item.variantId || null,
        variantLabel: item.variantLabel || null
      })),
      // Ensure these are numbers
      amountPaid: parseFloat(amountPaid) || 0,
      amountCredited: parseFloat(amountCredited) || 0,
      forceOverride: force 
    };

    try {
      await apiClient.post(API.sales, saleData);
      showToast('Sale Success', 'success');
      setCart([]);
      setIsPaymentModalOpen(false);
      fetchData(); // Refresh inventory and customer balances
    } catch (error) {
      // Re-throw so the Modal can catch "Credit Limit Exceeded" errors
      throw error; 
    }
  }, [totalAmount, cart, apiClient, API.sales, fetchData, showToast])

  const handlePhysicalScannerInput = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      setScannedBarcode(searchTerm);
      setSearchTerm('');
      e.preventDefault();
    }
  }

  const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerBg = darkMode ? 'bg-slate-950/80' : 'bg-white/80';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';

  if (isLoading) return (
    <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
        <p className="text-xs font-black opacity-40 tracking-widest">Initializing Terminal...</p>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeBase}`}>
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 10px; }
        .product-grid-scroll { max-height: 450px; overflow-y: auto; }
        .no-zoom-input { font-size: 16px !important; }
        @media (max-width: 768px) {
          .no-zoom-input { transform: scale(0.8); transform-origin: left center; width: 125% !important; }
        }
        @keyframes cartPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        .cart-animate { animation: cartPulse 0.3s ease-in-out; }
      `}</style>

      <header className={`sticky top-0 z-[100] w-full backdrop-blur-xl border-b px-4 md:px-8 py-4 transition-colors ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight">
                Billing <span className="text-indigo-500">Terminal</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-black tracking-[0.2em]">Active Session • High Performance Mode</p>
            </div>
            <div className="flex gap-2">
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

      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-8 pb-44">
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
                      const totalStock = hasVariants 
                        ? item.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                        : (item.quantity || 0);
                      const priceDisplay = hasVariants
                        ? (() => {
                            const prices = item.variants.map(v => v.price).filter(p => p !== undefined && p !== null);
                            if (prices.length === 0) return 'N/A';
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            return minPrice === maxPrice ? `₹${minPrice}` : `₹${minPrice}-${maxPrice}`;
                          })()
                        : `₹${item.price || 0}`;

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
                        </div>
                        
                        <div className="flex items-center gap-2 md:gap-4 md:gap-8 flex-shrink-0">
                          <div className={`flex items-center rounded-xl border p-1 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
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
      </main>

      {cart.length > 0 && (
          <div className="md:hidden fixed bottom-[100px] left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-bottom-4 fade-in duration-300">
              <button 
                onClick={scrollToCart}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 active:scale-90 transition-transform cart-animate"
              >
                  <div className="relative">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-indigo-600">
                        {cart.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest">View Cart</span>
                  <ArrowDown className="w-3 h-3 animate-bounce" />
              </button>
          </div>
      )}

      {cart.length > 0 && (
        <footer className={`fixed bottom-0 left-0 right-0 z-[100] border-t px-4 md:px-8 py-5 shadow-[0_-20px_40px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-colors ${darkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
            
            <div className={`w-full md:flex-1 border rounded-2xl px-6 py-4 flex items-center justify-between shadow-inner ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div>
                <p className="text-[9px] font-black text-slate-500 tracking-[0.2em] mb-1">Total Payable</p>
                <p className="text-2xl font-black tracking-tighter text-indigo-500">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="flex gap-4">
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

            <div className="w-full md:w-auto flex items-center gap-3 h-[68px]">
              <button
                onClick={handleCancelTransaction}
                className={`group h-full px-6 border rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-rose-500' : 'bg-white border-slate-200 text-slate-400 hover:text-rose-600'}`}
              >
                <XCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                <span className="text-[10px] font-black tracking-widest">Discard</span>
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex-1 md:min-w-[260px] h-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/40 transition-all active:scale-95"
              >
                Collect Payment <ChevronRight className="w-5 h-5" />
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
        onScanNotFound={() => setIsCameraScannerOpen(false)}
        onScanError={() => setIsCameraScannerOpen(false)}
      />

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

            <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              <div className="space-y-2">
                {variantSelectorItem.variants
                  .filter(v => (v.quantity || 0) > 0)
                  .map((variant) => (
                    <button
                      key={variant._id}
                      onClick={() => addItemToCart(variantSelectorItem, variant)}
                      className={`w-full p-3 md:p-4 rounded-xl border text-left transition-all active:scale-95 hover:border-indigo-500/50 ${
                        darkMode 
                          ? 'bg-slate-950 border-slate-800 hover:bg-slate-900' 
                          : 'bg-slate-50 border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs md:text-sm font-black mb-1 truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {variant.label}
                          </p>
                          <div className="flex items-center gap-3 md:gap-4 mt-2">
                            <div>
                              <p className={`text-[8px] md:text-[9px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                              <p className="text-sm md:text-base font-black text-emerald-500">₹{variant.price?.toLocaleString() || '0'}</p>
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
};

export default BillingPOS;