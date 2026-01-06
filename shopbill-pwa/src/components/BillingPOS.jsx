import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { IndianRupee, Trash2, ShoppingCart, Minus, Plus, Search, X, Loader, ScanLine, ChevronRight, Calculator, Printer, Package, User, CreditCard, XCircle } from 'lucide-react';
import PaymentModal, { WALK_IN_CUSTOMER } from './PaymentModal';
import ScannerModal from './ScannerModal';

const BillingPOS = ({ apiClient, API, showToast }) => {
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

  // Updated Cancel Logic: Clears cart which hides the footer
  const handleCancelTransaction = () => {
    if (cart.length === 0) return;
    // if (window.confirm("Discard current transaction? This will clear the cart.")) {
      setCart([]);
      setSearchTerm('');
      showToast("Transaction Cancelled", "info");
    // }
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

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loader className="w-8 h-8 animate-spin text-indigo-500" /></div>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-200">
      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #312e81; border-radius: 4px; }
        .product-grid-scroll { max-height: 320px; overflow-y: auto; }
      `}</style>

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-[100] bg-gray-950 border-b border-gray-800/60 px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2 uppercase text-white">
                Billing <span className="text-indigo-500">Terminal</span>
              </h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Authorized Point of Sale</p>
            </div>
            <button onClick={() => setIsCameraScannerOpen(true)} className="p-2.5 bg-gray-900 border border-gray-800 text-indigo-400 rounded-lg hover:bg-gray-800 transition-all">
              <ScanLine className="w-5 h-5" />
            </button>
          </div>

          <div className="relative group">
            <Search className="w-4.5 h-4.5 text-gray-600 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text" 
              placeholder="SEARCH PRODUCTS BY NAME, BARCODE, OR HSN..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handlePhysicalScannerInput}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl py-3 pl-12 pr-12 text-[10px] font-bold uppercase tracking-wider text-white placeholder:text-gray-700 outline-none focus:border-indigo-500 transition-all shadow-sm"
            />
            {searchTerm && <X onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 cursor-pointer hover:text-white" />}
          </div>
        </div>
      </header>

      {/* --- WORKSPACE --- */}
      <main className="flex-1 px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-8 pb-44">
            
            {/* SCROLLABLE PRODUCT LISTING */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Product Catalog</p>
              </div>
              <div className="product-grid-scroll custom-scroll pr-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {filteredInventory.map(item => (
                    <button
                        key={item._id}
                        onClick={() => addItemToCart(item)}
                        className="p-4 bg-gray-900/40 border border-gray-800/60 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/[0.02] transition-all text-left active:scale-95 group"
                    >
                        <p className="text-[10px] font-bold text-white uppercase truncate mb-1.5 group-hover:text-indigo-400">{item.name}</p>
                        <div className="flex justify-between items-end">
                            <p className="text-sm font-bold text-emerald-500 tracking-tight">₹{item.price.toLocaleString()}</p>
                            <p className="text-[8px] font-bold text-gray-600 uppercase">{item.quantity}</p>
                        </div>
                    </button>
                    ))}
                </div>
              </div>
            </section>

            {/* LIVE CART */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-4 h-4 text-indigo-500" />
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Current Items ({cart.length})</p>
              </div>

              <div className="space-y-2">
                  {[...cart].reverse().map(item => (
                  <div key={item._id} className="bg-gray-900/30 border border-gray-800/60 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex-1 truncate pr-6">
                        <p className="text-xs font-bold text-white uppercase truncate mb-1">{item.name}</p>
                        <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wider">₹{item.price.toLocaleString()} / UNIT</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex items-center bg-gray-950 rounded-lg border border-gray-800 p-1">
                            <button onClick={() => updateCartQuantity(item._id, -1)} className="p-1.5 text-gray-500 hover:text-rose-500 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                            <span className="w-8 text-center text-xs font-bold text-indigo-400">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item._id, 1)} className="p-1.5 text-gray-500 hover:text-emerald-500 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="text-right min-w-[100px]">
                            <p className="text-sm font-bold text-emerald-500">₹{(item.quantity * item.price).toLocaleString()}</p>
                            <button onClick={() => removeItemFromCart(item._id)} className="text-[8px] font-bold text-gray-600 hover:text-rose-500 uppercase tracking-widest">Remove</button>
                        </div>
                      </div>
                  </div>
                  ))}
                  
                  {cart.length === 0 && (
                    <div className="text-center py-16 border border-dashed border-gray-900 rounded-xl">
                        <ShoppingCart className="w-8 h-8 text-gray-800 mx-auto mb-4" />
                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Cart is empty</p>
                    </div>
                  )}
              </div>
            </section>
        </div>
      </main>

      {/* --- FOOTER ACTION BAR (Hidden if cart is empty) --- */}
      {cart.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 z-[100] bg-gray-950/95 backdrop-blur-md border-t border-gray-800 px-4 md:px-8 py-5 shadow-2xl">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-3">
            
            {/* Bill Summary */}
            <div className="w-full md:flex-1 bg-gray-900 border border-gray-800 rounded-xl px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Amount</p>
                <p className="text-xl font-bold text-white tracking-tight">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Qty</p>
                <p className="text-xs font-bold text-indigo-400">{cart.reduce((a, b) => a + b.quantity, 0)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="w-full md:w-auto flex items-center gap-3">
              <button
                onClick={handleCancelTransaction}
                className="flex-1 md:w-auto px-6 h-[58px] bg-gray-900 border border-gray-800 hover:bg-rose-500/10 hover:border-rose-500/50 text-gray-500 hover:text-rose-500 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 group"
              >
                <XCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Cancel</span>
              </button>

              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex-[2] md:min-w-[280px] bg-indigo-600 hover:bg-indigo-500 text-white h-[58px] rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/20 transition-all active:scale-95"
              >
                Checkout <ChevronRight className="w-4 h-4" />
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