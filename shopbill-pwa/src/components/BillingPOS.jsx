import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { IndianRupee, Trash2, ShoppingCart, Minus, Plus, Search, X, Loader, ScanLine, ChevronRight, Calculator, Printer, Package, User, CreditCard, XCircle, Sparkles, Box } from 'lucide-react';
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
    const inStockItems = inventory.filter(item => item.quantity > 0);
    if (!term) return inStockItems.sort((a, b) => a.name.localeCompare(b.name));
    return inStockItems.filter(item =>
      item.name.toLowerCase().includes(term) || 
      (item.barcode && item.barcode.includes(term)) || 
      (item.hsn && item.hsn.includes(term))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, searchTerm, scannedBarcode]);

  const allCustomers = useMemo(() => [WALK_IN_CUSTOMER, ...customers.filter(c => c._id !== WALK_IN_CUSTOMER._id)], [customers]);

  const addItemToCart = useCallback((itemToAdd) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === itemToAdd._id);
      if (existingItem) {
        const inventoryItem = inventory.find(i => i._id === itemToAdd._id);
        if (existingItem.quantity + 1 > inventoryItem?.quantity) {
          showToast(`Stock limit reached.`, 'error');
          return prevCart;
        }
        return prevCart.map(item => item._id === itemToAdd._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { ...itemToAdd, quantity: 1 }];
    });
  }, [inventory, showToast]);

  const updateCartQuantity = useCallback((itemId, amount) => {
    setCart(prevCart => {
      const item = prevCart.find(i => i._id === itemId);
      const inventoryItem = inventory.find(i => i._id === itemId);
      if (!item || !inventoryItem) return prevCart;
      const newQuantity = item.quantity + amount;
      if (amount > 0 && newQuantity > inventoryItem.quantity) {
          showToast('Stock limit reached', 'error');
          return prevCart;
      }
      return newQuantity <= 0 ? prevCart.filter(i => i._id !== itemId) : prevCart.map(i => i._id === itemId ? { ...i, quantity: newQuantity } : i);
    });
  }, [inventory, showToast]);

  const removeItemFromCart = useCallback((itemId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== itemId));
  }, []);

  const handleCancelTransaction = () => {
    if (cart.length === 0) return;
    setCart([]);
    setSearchTerm('');
    showToast("Transaction Discarded", "info");
  };

  const processPayment = useCallback(async (amountPaid, amountCredited, paymentMethod, finalCustomer) => {
    if (totalAmount <= 0) return;
    const customerToBill = finalCustomer || WALK_IN_CUSTOMER;
    const saleData = {
      totalAmount, paymentMethod, customer: customerToBill.name,
      customerId: customerToBill._id,
      items: cart.map(item => ({ itemId: item._id, name: item.name, quantity: item.quantity, price: item.price })),
      amountPaid, amountCredited,
    };
    try {
      await apiClient.post(API.sales, saleData);
      showToast('Sale Success', 'success');
      setCart([]);
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (error) {
      showToast('Process error.', 'error');
    }
  }, [totalAmount, cart, apiClient, API.sales, fetchData, showToast]);

  const handlePhysicalScannerInput = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      setScannedBarcode(searchTerm);
      setSearchTerm('');
      e.preventDefault();
    }
  }

  // Styling logic based on Dashboard theme
  const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const headerBg = darkMode ? 'bg-slate-950/80' : 'bg-white/80';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';

  if (isLoading) return (
    <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
        <Loader className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
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
        
        /* Fixed zoom logic that doesn't break page width */
        .no-zoom-input {
          font-size: 16px !important; 
        }
        @media (max-width: 768px) {
          .no-zoom-input {
            transform: scale(0.8);
            transform-origin: left center;
            width: 125% !important;
          }
        }
      `}</style>

      {/* --- STICKY HEADER --- */}
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

          {/* This wrapper MUST have overflow-hidden to stop the 'width: 125%' input from making the page scroll left */}
          <div className="relative group overflow-hidden rounded-2xl">
            <Search className={`w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 z-10 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
            <input
              type="text" 
              placeholder="search by name, barcode, or hsn..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handlePhysicalScannerInput}
              className={`no-zoom-input w-full border rounded-2xl py-3.5 pl-12 pr-12 text-base md:text-[10px] font-black tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all ${inputBase}`}
            />
            {searchTerm && <X onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 cursor-pointer hover:text-indigo-500 z-10" />}
          </div>
        </div>
      </header>

      {/* --- WORKSPACE --- */}
      {/* Removed overflow-x-hidden from main to ensure sticky logic isn't blocked by overflow properties */}
      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-8 pb-44">
            
            {/* COMPACT PRODUCT CATALOG */}
            <section>
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-indigo-500" />
                    <p className="text-[10px] font-black text-slate-500 tracking-widest">Catalog ({filteredInventory.length})</p>
                </div>
                <p className="text-[9px] font-bold text-slate-400">Click to add</p>
              </div>
              
              <div className="product-grid-scroll custom-scroll pr-2">
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                    {filteredInventory.map(item => (
                    <button
                        key={item._id}
                        onClick={() => addItemToCart(item)}
                        className={`p-3 rounded-xl border transition-all text-left active:scale-95 group relative overflow-hidden ${cardBase} hover:border-indigo-500/50`}
                    >
                        <div className="relative z-10">
                            <p className="text-[9px] font-black truncate mb-1 leading-tight group-hover:text-indigo-500">{item.name}</p>
                            <p className="text-xs font-black text-emerald-500 tracking-tighter">₹{item.price}</p>
                        </div>
                        <div className={`absolute bottom-1 right-1 text-[8px] font-black px-1 rounded ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                            {item.quantity}
                        </div>
                    </button>
                    ))}
                </div>
              </div>
            </section>

            {/* BILLING ITEMS */}
            <section>
              <div className="flex items-center gap-2 mb-4 px-1">
                <ShoppingCart className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-black text-slate-500 tracking-widest">Billing List ({cart.length})</p>
              </div>

              <div className="space-y-2">
                  {[...cart].reverse().map(item => (
                  <div key={item._id} className={`rounded-2xl border p-4 flex items-center justify-between transition-all hover:bg-indigo-500/[0.02] ${cardBase}`}>
                      <div className="flex-1 truncate pr-4">
                        <p className="text-xs font-black truncate mb-0.5">{item.name}</p>
                        <p className="text-[9px] font-bold text-slate-500 tracking-wider">Unit: ₹{item.price.toLocaleString()}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 md:gap-8">
                        <div className={`flex items-center rounded-xl border p-1 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                            <button onClick={() => updateCartQuantity(item._id, -1)} className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-8 text-center text-xs font-black text-indigo-500">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item._id, 1)} className="p-1.5 text-slate-500 hover:text-emerald-500 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        
                        <div className="text-right min-w-[90px]">
                            <p className="text-sm font-black text-emerald-500">₹{(item.quantity * item.price).toLocaleString()}</p>
                            <button onClick={() => removeItemFromCart(item._id)} className="text-[8px] font-black text-rose-500/60 hover:text-rose-500 tracking-widest">Remove</button>
                        </div>
                      </div>
                  </div>
                  ))}
                  
                  {cart.length === 0 && (
                    <div className={`text-center py-20 border-2 border-dashed rounded-3xl transition-colors ${darkMode ? 'border-slate-900 bg-slate-900/20' : 'border-slate-100 bg-white/50'}`}>
                        <div className="bg-indigo-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShoppingCart className="w-8 h-8 text-indigo-500/40" />
                        </div>
                        <h3 className="text-sm font-black tracking-widest opacity-40">Cart is Empty</h3>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">Select items from the catalog above to bill</p>
                    </div>
                  )}
              </div>
            </section>
        </div>
      </main>

      {/* --- FLOATING ACTION FOOTER --- */}
      {cart.length > 0 && (
        <footer className={`fixed bottom-0 left-0 right-0 z-[100] border-t px-4 md:px-8 py-5 shadow-[0_-20px_40px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-colors ${darkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
            
            <div className={`w-full md:flex-1 border rounded-2xl px-6 py-4 flex items-center justify-between shadow-inner ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
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

      {/* MODALS */}
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
    </div>
  );
};

export default BillingPOS;