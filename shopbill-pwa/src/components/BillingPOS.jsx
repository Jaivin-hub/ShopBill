import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DollarSign, IndianRupee, List, Trash2, User, ShoppingCart, Minus, Plus, Search, X, Loader, ScanLine } from 'lucide-react';
import PaymentModal, { WALK_IN_CUSTOMER, ADD_NEW_CUSTOMER_ID } from './PaymentModal';
import ScannerModal from './ScannerModal'; // Assuming ScannerModal is in this path

const BillingPOS = ({ apiClient, API, showToast }) => {
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  // State for the camera scanner modal
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

      setInventory(invResponse.data);
      setCustomers(custResponse.data);
      showToast('Inventory and Customer data ready.', 'info');
    } catch (error) {
      console.error("Failed to load POS data:", error);
      showToast('Error loading POS data. Check network connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, API.inventory, API.customers, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Core POS Logic ---
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const filteredInventory = useMemo(() => {
    const term = (scannedBarcode || searchTerm).toLowerCase().trim(); 
    const inStockItems = inventory.filter(item =>
      item.quantity > 0
    );
    if (!term) {
      return inStockItems.sort((a, b) => a.name.localeCompare(b.name));
    }
    return inStockItems.filter(item =>
      item.name.toLowerCase().includes(term) || (item.barcode && item.barcode.includes(term))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, searchTerm, scannedBarcode]);

  const allCustomers = useMemo(() => [WALK_IN_CUSTOMER, ...customers.filter(c => c._id !== WALK_IN_CUSTOMER._id)], [customers]);

  const addItemToCart = useCallback((itemToAdd) => {
    if (itemToAdd.quantity <= 0) {
      showToast(`${itemToAdd.name} is currently out of stock.`, 'error');
      return;
    }
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === itemToAdd._id);
      if (existingItem) {
        const inventoryItem = inventory.find(i => i._id === itemToAdd._id);
        if (existingItem.quantity + 1 > inventoryItem?.quantity) {
          showToast(`Only ${inventoryItem.quantity} units of ${itemToAdd.name} available.`, 'error');
          return prevCart;
        }
        return prevCart.map(item =>
          item._id === itemToAdd._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { ...itemToAdd, quantity: 1 }];
      }
    });
    showToast(`Added ${itemToAdd.name}`, 'info');
  }, [showToast, inventory]);

  const updateCartQuantity = useCallback((itemId, amount) => {
    setCart(prevCart => {
      const item = prevCart.find(i => i._id === itemId);
      const inventoryItem = inventory.find(i => i._id === itemId);
      if (!item || !inventoryItem) return prevCart;
      const newQuantity = item.quantity + amount;
      if (amount > 0 && newQuantity > inventoryItem.quantity) {
        showToast(`Cannot add more. Only ${inventoryItem.quantity} units available.`, 'error');
        return prevCart;
      }
      if (newQuantity <= 0) {
        return prevCart.filter(i => i._id !== itemId);
      } else {
        return prevCart.map(i =>
          i._id === itemId ? { ...i, quantity: newQuantity } : i
        );
      }
    });
  }, [inventory, showToast]);

  const removeItemFromCart = useCallback((itemId) => {
    setCart(prevCart => prevCart.filter(item => item._id !== itemId));
    showToast('Item removed from cart.', 'error');
  }, [showToast]);

  const processPayment = useCallback(async (amountPaid, amountCredited, paymentMethod, finalCustomer) => {
    if (totalAmount <= 0) {
      showToast('Cart is empty. Cannot process sale.', 'error');
      return;
    }
    const customerToBill = finalCustomer || WALK_IN_CUSTOMER;
    const saleItems = cart.map(item => ({
      itemId: item._id || item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
    }));
    const saleData = {
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      customer: customerToBill.name,
      customerId: customerToBill._id,
      items: saleItems,
      amountPaid: amountPaid,
      amountCredited: amountCredited,
    };
    try {
      showToast('Processing sale...', 'info');
      await apiClient.post(API.sales, saleData);
      showToast('Sale successfully recorded!', 'success');
      setCart([]);
      setSearchTerm('');
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Sale processing failed:", error);
      const errorMessage = error.response?.data?.error || 'Error finalizing sale. Check server connection.';
      showToast(errorMessage, 'error');
    }
  }, [totalAmount, cart, showToast, apiClient, API.sales, fetchData]);

  // --- Barcode Scanner Logic ---
  useEffect(() => {
    if (scannedBarcode) {
      const item = inventory.find(i => i.hsn === scannedBarcode); 
      if (item) {
        addItemToCart(item);
        setScannedBarcode('');
      } else {
        setSearchTerm(scannedBarcode);
        showToast(`Item with HSN/Code "${scannedBarcode}" not found.`, 'error');
        setScannedBarcode('');
      }
    }
  }, [scannedBarcode, inventory, addItemToCart, showToast]);

  const handlePhysicalScannerInput = (e) => {
    if (e.key === 'Enter' && searchTerm) {
      setScannedBarcode(searchTerm);
      setSearchTerm('');
      e.preventDefault(); 
    }
  }

  const handleScanItemFound = useCallback((itemData) => {
      setIsCameraScannerOpen(false); 
      addItemToCart(itemData);      
      setSearchTerm('');            
  }, [addItemToCart]);

  const handleScanItemNotFound = useCallback((rawCode) => {
      setIsCameraScannerOpen(false); 
      setSearchTerm(rawCode);        
      showToast(`Item with code ${rawCode} not found. Please add manually.`, 'error');
  }, [showToast]);
  
  const handleScanError = useCallback((errorMessage) => {
       setIsCameraScannerOpen(false); 
       showToast(errorMessage, 'error');
  }, [showToast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
        <Loader className="w-10 h-10 animate-spin text-teal-400" />
        {/* <p className='mt-3'>Loading inventory and customer data...</p> */}
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950 transition-colors duration-300 overflow-hidden">
      {/* Header - Fixed */}
      <div className="p-4 md:p-8 pb-0">
        <h1 className="text-3xl font-extrabold text-white mb-2">Point of Sale</h1>
        <p className="text-gray-400 mb-6">Optimized for fast and accurate day-to-day billing.</p>
      </div>

      {/* Main Scrollable Area - This is what fixes the overlap */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 space-y-6 pb-40 md:pb-8">
        
        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-gray-500 absolute left-3 z-10" />
          <input
            type="text"
            placeholder="Search Item by Name or Scan Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handlePhysicalScannerInput}
            className="w-full pl-10 pr-24 py-3 border border-gray-700 rounded-xl text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-800 text-white shadow-xl"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-14 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50 transition-colors z-10"
              title="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsCameraScannerOpen(true)}
            className="cursor-pointer absolute right-3 top-1/2 transform -translate-y-1/2 text-teal-400 hover:text-white p-2 rounded-full bg-indigo-900/50 hover:bg-indigo-700/50 transition-colors z-10"
            title="Scan Barcode with Camera"
          >
            <ScanLine className="w-5 h-5" />
          </button>
        </div>

        {/* Inventory Quick Access Grid */}
        <div className="max-h-96 overflow-y-auto p-3 border border-gray-700 rounded-xl bg-gray-900 shadow-inner">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {filteredInventory.map(item => (
              <button
                key={item._id || item.id}
                className="cursor-pointer bg-indigo-900/40 text-indigo-300 p-2 rounded-lg font-semibold text-xs transition hover:bg-indigo-800/60 shadow-md border border-indigo-700 active:scale-[0.98] transform whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => addItemToCart(item)}
                title={item.name}
              >
                <span className="truncate block leading-tight">{item.name}</span>
                <span className="text-xs font-normal opacity-80 block mt-0.5 text-teal-400">₹{item.price.toFixed(2)}</span>
              </button>
            ))}
            {filteredInventory.length === 0 && (
              <div className="col-span-4 sm:col-span-5 md:col-span-6 lg:col-span-8 text-center py-4 text-gray-500">
                <Search className="w-5 h-5 mx-auto mb-1 text-gray-400" />
                No items found.
              </div>
            )}
          </div>
        </div>

        {/* Cart Card */}
        <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/20 border border-gray-800 transition duration-300">
          <h3 className="text-lg font-bold flex items-center text-white mb-3 pb-2 border-b border-gray-700">
            <ShoppingCart className="w-5 h-5 mr-2 text-teal-400" /> Cart Items ({cart.length})
          </h3>
          <div className="space-y-3">
            {[...cart].reverse().map(item => (
              <div key={item._id || item.id} className="flex justify-between items-center text-sm p-3 bg-gray-800 rounded-xl border border-gray-700 shadow-inner">
                <span className="font-medium text-white w-2/5 truncate">{item.name}</span>
                <div className="flex items-center space-x-2 w-1/5 justify-center">
                  <button onClick={() => updateCartQuantity(item._id || item.id, -1)} className="p-1 rounded-lg bg-red-900/40 text-red-300"><Minus className="w-4 h-4" /></button>
                  <span className="font-extrabold w-4 text-center text-white">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item._id || item.id, 1)} className="p-1 rounded-lg bg-green-900/40 text-green-300"><Plus className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center w-2/5 justify-end">
                  <span className="font-extrabold text-lg text-teal-400">₹{(item.quantity * item.price).toFixed(2)}</span>
                  <button onClick={() => removeItemFromCart(item._id || item.id)} className="text-red-400 ml-3"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-gray-500 text-center py-6 border-dashed border-2 border-gray-700 rounded-xl">Cart is empty.</p>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Payment Bar (Above bottom of screen) */}
      {cart.length > 0 && (
        <div className="hidden md:block p-3 px-8 bg-gray-950 border-t border-gray-800">
          <div className="flex justify-between items-stretch space-x-4">
            <div className="flex-1 p-3 py-3 bg-indigo-900/60 rounded-lg border border-indigo-800 flex items-center justify-between">
              <span className="text-xl font-bold text-white">FINAL TOTAL:</span>
              <span className="text-teal-400 text-3xl font-extrabold">₹{totalAmount.toFixed(2)}</span>
            </div>
            <button
              className="w-2/5 py-3 bg-teal-600 text-white rounded-lg font-extrabold text-xl hover:bg-teal-700 transition"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <IndianRupee className="w-5 h-5 inline-block mr-2" /> Pay
            </button>
          </div>
        </div>
      )}

      {/* Mobile Payment Bar (Fixed at Bottom-16 to avoid menu) */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-gray-900 border-t-4 border-teal-600 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] p-3 z-20">
          <div className="flex items-stretch space-x-3">
            <div className="flex-1 p-2 py-3 bg-indigo-900/60 rounded-lg border border-indigo-800 flex items-center justify-between">
              <span className="text-lg font-bold text-white">TOTAL</span>
              <span className="text-2xl font-extrabold text-teal-400 truncate">₹{totalAmount.toFixed(2)}</span>
            </div>
            <button
              className="w-2/5 py-3 bg-teal-600 text-white rounded-lg font-extrabold text-lg shadow-xl"
              onClick={() => setIsPaymentModalOpen(true)}
            >
              <IndianRupee className="w-5 h-5 inline-block mr-2" /> Pay
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        totalAmount={totalAmount}
        allCustomers={allCustomers}
        processPayment={processPayment}
        showToast={showToast}
        onAddNewCustomer={() => showToast('Redirecting...', 'info')}
        apiClient={apiClient}
      />
      
      <ScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        inventory={inventory}
        onScanSuccess={handleScanItemFound}
        onScanNotFound={handleScanItemNotFound}
        onScanError={handleScanError}
        showToast={showToast}
      />
    </div>
  );
};

export default BillingPOS;