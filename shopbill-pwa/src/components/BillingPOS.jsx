import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { DollarSign, List, Trash2, User, ShoppingCart, Minus, Plus, Search, X, Loader } from 'lucide-react';
// Import the PaymentModal and WALK_IN_CUSTOMER from the new file
import PaymentModal, { WALK_IN_CUSTOMER } from './PaymentModal'; 

/**
 * Main POS component: Manages cart, customer selection, inventory search, and sale finalization.
 * NOTE: Now fetches its own inventory and customer data.
 */
// CRITICAL: Updated props to remove centralized data and use API client
const BillingPOS = ({ apiClient, API, showToast }) => {
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN_CUSTOMER);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // 1. Component-level Data States
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);


  // --- Data Fetching and Lifecycle ---

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch data concurrently
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // --- EXISTING CALCULATIONS (Data remains locally calculated) ---

  // 1. Total Amount Calculation
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // 2. Filtered Inventory: exclude 0 stock and apply search filter
  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    const inStockItems = inventory.filter(item => 
      item.quantity > 0 
    );
    
    if (!term) {
        return inStockItems.sort((a, b) => a.name.localeCompare(b.name));
    }

    return inStockItems.filter(item => 
      item.name.toLowerCase().includes(term) || (item.barcode && item.barcode.includes(term))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory, searchTerm]);


  // 3. Customer List
  const allCustomers = useMemo(() => [WALK_IN_CUSTOMER, ...customers.filter(c => c.id !== WALK_IN_CUSTOMER.id)], [customers]);


  // --- Cart Management Functions (Unchanged logic, just relies on local inventory state) ---

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
    
  // Sale Finalization Logic (UPDATED TO USE apiClient)
  const processPayment = useCallback(async (amountPaid, amountCredited, paymentMethod) => {
    if (totalAmount <= 0) {
      showToast('Cart is empty. Cannot process sale.', 'error');
      return;
    }
     
    // 1. Check credit limit before logging a credit sale
    if (amountCredited > 0 && selectedCustomer.creditLimit > 0) {
        const potentialNewCredit = selectedCustomer.outstandingCredit + amountCredited;
        if (potentialNewCredit > selectedCustomer.creditLimit) {
            showToast(`Credit limit of ₹${selectedCustomer.creditLimit.toFixed(0)} exceeded! Cannot add ₹${amountCredited.toFixed(2)} to Khata.`, 'error');
            return;
        }
    }
     
    // 2. Prepare data
    const saleItems = cart.map(item => ({
        itemId: item._id || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
    }));

    const saleData = {
      totalAmount: totalAmount,
      paymentMethod: paymentMethod,
      customer: selectedCustomer.name,
      customerId: selectedCustomer._id || selectedCustomer.id,
      items: saleItems,
      amountPaid: amountPaid,
      amountCredited: amountCredited,
    };
     
    try {
      showToast('Processing sale...', 'info');
      // 3. Log the sale via API (This should also update inventory stock on the backend)
      await apiClient.post(API.sales, saleData); 
       
      // 4. Update customer credit on the server if necessary
      if (amountCredited > 0 && selectedCustomer._id) {
        // We assume the API has an endpoint for credit transactions/updates
        await apiClient.put(`${API.customers}/${selectedCustomer._id}/credit`, {
          // The backend should calculate the new outstandingCredit
          amountChange: amountCredited, 
          type: 'sale_credit',
        });
      }
      
      showToast('Sale successfully recorded!', 'success');

      // 5. Clear cart and reset state
      setCart([]);
      setSelectedCustomer(WALK_IN_CUSTOMER);
      setSearchTerm('');
      setIsPaymentModalOpen(false);

      // 6. Refresh data for POS view (to show updated stock/credit)
      fetchData(); 

    } catch (error) {
      console.error("Sale processing failed:", error);
      showToast('Error finalizing sale. Check server connection.', 'error');
    }
     
  }, [totalAmount, selectedCustomer, cart, showToast, apiClient, API.sales, API.customers, fetchData]);


  // --- Component Render ---

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
        <Loader className="w-10 h-10 animate-spin text-teal-400" />
        <p className='mt-3'>Loading inventory and customer data...</p>
      </div>
    );
  }

  return (
    // Adjusted bottom padding on mobile (pb-24) to accommodate the sticky footer
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 text-gray-300 pb-24 md:pb-8 transition-colors duration-300">
      
      {/* 1. Main Heading and Description */}
      <h1 className="text-3xl font-extrabold text-white mb-1">Point of Sale (POS)</h1>
      <p className="text-gray-400 mb-6">Optimized for fast and accurate day-to-day billing.</p>
       
      {/* Main Content Area (Mobile Stacked) */}
      <div className="space-y-6">
             
        {/* 1. Customer Selection Card - High Priority */}
        <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/20 border border-gray-800 transition duration-300">
            <h3 className="text-base font-bold flex items-center text-white mb-3">
                <User className="w-5 h-5 inline-block mr-2 text-teal-400" /> Bill To Customer
            </h3>
            <div className="relative">
                <select
                    id="customer-select"
                    value={selectedCustomer._id || selectedCustomer.id}
                    onChange={(e) => {
                    const customerId = e.target.value;
                    const customer = allCustomers.find(c => (c._id || c.id) === customerId) || WALK_IN_CUSTOMER;
                    setSelectedCustomer(customer);
                    }}
                    className="appearance-none w-full p-3.5 border border-indigo-600 bg-gray-700 text-white rounded-lg text-base font-semibold focus:ring-indigo-500 focus:border-indigo-500 pr-10 transition-colors shadow-inner"
                >
                    {allCustomers.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                        {c.name} {c.outstandingCredit > 0 ? `(DUE: ₹${c.outstandingCredit.toFixed(0)})` : ''}
                    </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-indigo-400">
                    <List className="w-5 h-5" />
                </div>
            </div>
            {selectedCustomer.outstandingCredit > 0 && (
                <div className="flex justify-end mt-3">
                    <p className="text-sm text-red-400 font-bold p-2 bg-red-900/30 rounded-lg shadow-sm border border-red-700">
                        <span className="opacity-80 font-medium text-gray-300">Khata Due:</span> ₹{selectedCustomer.outstandingCredit.toFixed(0)}
                    </p>
                </div>
            )}
        </div>

        {/* 2. Item Search/Scan Input (Simplified) */}
        <div className="relative flex items-center">
            <Search className="w-5 h-5 text-gray-500 absolute left-3 z-10" />
            <input 
                type="text" 
                placeholder="Search Item by Name or Barcode..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-700 rounded-xl text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-800 text-white shadow-xl"
            />
             {searchTerm && (
                <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full bg-gray-700/50 transition-colors"
                    title="Clear Search"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
         
        {/* 3. Quick Buttons (Filtered by Search Term and Stock > 0) */}
        <div className="max-h-96 overflow-y-auto p-3 border border-gray-700 rounded-xl bg-gray-900 shadow-inner">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {filteredInventory.map(item => ( 
                    <button 
                        key={item._id || item.id}
                        className="bg-indigo-900/40 text-indigo-300 p-2 rounded-lg font-semibold text-xs transition hover:bg-indigo-800/60 shadow-md border border-indigo-700 active:scale-[0.98] transform whitespace-nowrap overflow-hidden text-ellipsis"
                        onClick={() => addItemToCart(item)}
                        title={item.name}
                    >
                        <span className="truncate block leading-tight">{item.name}</span> 
                        <span className="text-xs font-normal opacity-80 block mt-0.5 text-teal-400">₹{item.price.toFixed(2)}</span>
                    </button>
                ))}
            
                {filteredInventory.length === 0 && (
                    <div className="col-span-4 sm:col-span-5 md:col-span-6 lg:col-span-8 text-center py-4 text-gray-500">
                        <Search className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                        {searchTerm 
                            ? `No items match "${searchTerm}" or they are out of stock.`
                            : 'No items are currently in stock.'}
                    </div>
                )}
            </div>
        </div>


        {/* 4. Cart Display - Mid Priority */}
        <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/20 border border-gray-800 transition duration-300">
            <h3 className="text-lg font-bold flex items-center text-white mb-3 pb-2 border-b border-gray-700">
                <ShoppingCart className="w-5 h-5 mr-2 text-teal-400" /> Cart Items ({cart.length})
            </h3>
             
            <div className="max-h-80 overflow-y-auto space-y-3 p-1">
                {cart.map(item => (
                    <div key={item._id || item.id} className="flex justify-between items-center text-sm p-3 bg-gray-800 rounded-xl border border-gray-700 shadow-inner">
                        <span className="font-medium text-white w-2/5 truncate">{item.name}</span>
                         
                        {/* Quantity Controls (Optimized for touch) */}
                        <div className="flex items-center space-x-2 w-1/5 justify-center">
                            <button 
                                onClick={() => updateCartQuantity(item._id || item.id, -1)} 
                                className="p-1 rounded-lg bg-red-900/40 text-red-300 active:bg-red-900/60 transition hover:bg-red-900/60"
                                title="Decrease Quantity"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-extrabold w-4 text-center text-base text-white">{item.quantity}</span>
                            <button 
                                onClick={() => updateCartQuantity(item._id || item.id, 1)} 
                                className="p-1 rounded-lg bg-green-900/40 text-green-300 active:bg-green-900/60 transition hover:bg-green-900/60"
                                title="Increase Quantity"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center w-2/5 justify-end">
                            <span className="font-extrabold text-lg text-teal-400">₹{(item.quantity * item.price).toFixed(2)}</span>
                            <button 
                                onClick={() => removeItemFromCart(item._id || item.id)} 
                                className="text-red-400 hover:text-red-300 ml-3 p-1 transition"
                                title="Remove Item"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <p className="text-gray-500 text-center py-6 border-dashed border-2 border-gray-700 rounded-xl mx-auto">
                        <ShoppingCart className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                        Cart is empty. Use the search bar or quick buttons to add items.
                    </p>
                )}
            </div>
        </div>

        {/* 🌟 MODIFIED POSITION FOR TOTAL DISPLAY & BUTTON (Desktop/In-Scroll - md:block) */}
        {cart.length > 0 && (
            <div className="hidden md:block p-3 bg-gray-900 rounded-xl mb-3 border border-indigo-700 shadow-2xl shadow-indigo-900/10">
                <div className="flex justify-between items-stretch space-x-4">
                    {/* Total Display: Desktop version was already correct */}
                    <div className="flex-1 p-3 py-3 bg-indigo-900/60 rounded-lg border border-indigo-800 flex items-center justify-between">
                        <span className="text-xl font-bold text-white">FINAL TOTAL:</span>
                        <span className="text-teal-400 text-3xl font-extrabold">₹{totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Payment Button */}
                    <button 
                        className="w-2/5 py-3 bg-teal-600 text-white rounded-lg font-extrabold text-xl shadow-xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] transform"
                        onClick={() => {
                            if (totalAmount > 0) {
                                setIsPaymentModalOpen(true);
                            } else {
                                showToast('Cart is empty. Please add items.', 'error');
                            }
                        }}
                    >
                        <DollarSign className="w-5 h-5 inline-block mr-2" /> Pay
                    </button>
                </div>
            </div>
        )}
         
        {/* Placeholder for scroll space on mobile (Hidden on desktop) */}
        <div className="h-4 md:hidden"></div>
      </div>
       
      {/* 🌟 MODIFIED STICKY FOOTER (Mobile Only - Reduced Height and Single Line Total) */}
      {cart.length > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 bg-gray-900 border-t-4 border-teal-600 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] p-3 z-20 transition-colors duration-300">
            <div className="flex items-stretch space-x-3">
                
                {/* Total Display: Key change is here - made it a single flex row */}
                <div className="flex-1 p-2 py-3 bg-indigo-900/60 rounded-lg border border-indigo-800 flex items-center justify-between">
                    <span className="text-lg font-bold text-white">TOTAL</span>
                    <span className="text-2xl font-extrabold text-teal-400 truncate">₹{totalAmount.toFixed(2)}</span>
                </div>

                {/* Payment Button */}
                <button 
                    className="w-2/5 py-3 bg-teal-600 text-white rounded-lg font-extrabold text-lg shadow-xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] transform"
                    onClick={() => {
                        if (totalAmount > 0) {
                             setIsPaymentModalOpen(true);
                        } else {
                            showToast('Cart is empty. Please add items.', 'error');
                        }
                    }}
                >
                    <DollarSign className="w-5 h-5 inline-block mr-2" /> Pay
                </button>
            </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          totalAmount={totalAmount}
          selectedCustomer={selectedCustomer}
          processPayment={processPayment} // Pass the sale finalization logic
          showToast={showToast}
      />

    </div>
  );
};


export default BillingPOS;