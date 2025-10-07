import React, { useState, useMemo, useCallback } from 'react';
import { CreditCard, DollarSign, List, Trash2, User, ShoppingCart, Minus, Plus, Search, TrendingUp, X } from 'lucide-react';

// Default Walk-in Customer for Cash/UPI sales
const WALK_IN_CUSTOMER = { id: 'walk_in', name: 'Walk-in Customer', outstandingCredit: 0, creditLimit: 0 };

// Sub-component for Payment Modal: Handles Cash, Full Credit, or Partial/Mixed Payments
const PaymentModal = ({ isOpen, onClose, totalAmount, selectedCustomer, processPayment, showToast }) => {
    // Initialize amountPaid with the total due amount for quick full cash sale
    const [amountPaidInput, setAmountPaidInput] = useState(totalAmount.toFixed(2));
    const [paymentType, setPaymentType] = useState('Cash/UPI'); // 'Cash/UPI', 'Credit'

    // Reset state when modal opens/total changes
    React.useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(totalAmount.toFixed(2));
            setPaymentType('Cash/UPI');
        }
    }, [isOpen, totalAmount]);

    const khataDue = selectedCustomer.outstandingCredit || 0;
    const isCreditCustomer = selectedCustomer.id !== WALK_IN_CUSTOMER.id;

    const amountPaid = parseFloat(amountPaidInput) || 0;
    
    // Calculations based on user input (memoized for performance)
    const {
        amountCredited, // Amount of CURRENT bill added to khata (if paid < total or full credit selected)
        changeDue,      // Change to return (if paid > total)
        newKhataBalance, // The customer's total Khata due *after* this transaction
        paymentMethod    // 'Cash/UPI', 'Credit', or 'Mixed'
    } = useMemo(() => {
        const total = totalAmount;

        let amountCredited = 0;
        let changeDue = 0;
        let method = paymentType;
        
        if (paymentType === 'Credit') {
            // Full Credit Sale
            amountCredited = total;
            method = 'Credit';
        }
        else {
            if (amountPaid >= total) {
                // Full payment or Overpayment
                changeDue = amountPaid - total;
                method = 'Cash/UPI';
            } else if (amountPaid > 0 && amountPaid < total) {
                // Partial payment: Remaining amount goes to Khata
                amountCredited = total - amountPaid;
                method = 'Mixed'; // Cash + Credit
            } else {
                 // Paid 0 cash/UPI, meaning full amount must be credited
                 amountCredited = total;
                 method = 'Credit';
            }
        }
        
        // Final Khata balance calculation
        const newKhataBalance = khataDue + amountCredited;

        return { amountCredited, changeDue, newKhataBalance, paymentMethod: method };
    }, [amountPaid, totalAmount, paymentType, khataDue]);


    const handleConfirmPayment = () => {
        if (totalAmount <= 0) {
            showToast('Cart is empty. Cannot process payment.', 'error');
            return;
        }

        // Validation: Credit/Mixed sale requires a saved customer
        if (amountCredited > 0 && selectedCustomer.id === WALK_IN_CUSTOMER.id) {
            showToast('Please select a specific customer to add the remaining amount to Khata/Credit.', 'error');
            return;
        }

        // Validation: Amount paid cannot be negative
        if (amountPaid < 0) {
             showToast('Amount paid cannot be negative.', 'error');
             return;
        }
        
        // Call the main processing function
        processPayment(amountPaid, amountCredited, paymentMethod);
    };


    if (!isOpen) return null;

    // Updated Styling for the modal (Dark/Indigo theme)
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 border border-indigo-700">
                
                {/* Modal Header */}
                <div className="p-5 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-white flex items-center">
                        <DollarSign className="w-6 h-6 text-teal-400 mr-2" />
                        Process Payment
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 space-y-5">
                    
                    {/* Customer Info */}
                    <div className="flex justify-between items-center p-3 bg-indigo-900/40 rounded-lg border border-indigo-700">
                        <span className="text-sm font-semibold text-gray-300">Bill To:</span>
                        <span className="font-extrabold text-indigo-400 truncate max-w-[60%] text-lg">{selectedCustomer.name}</span>
                    </div>

                    {/* Total Due */}
                    <div className="p-4 bg-indigo-900/60 rounded-xl shadow-xl border border-indigo-600">
                        <p className="flex justify-between items-center text-xl font-medium text-gray-200">
                            <span>Sale Total:</span>
                            <span className="text-4xl font-extrabold text-teal-400">₹{totalAmount.toFixed(2)}</span>
                        </p>
                    </div>

                    {/* Khata Status */}
                    {isCreditCustomer && (
                        <div className="flex justify-between items-center p-2 border-b border-gray-700 text-sm">
                            <span className="font-medium text-gray-300">Customer Outstanding Khata:</span>
                            <span className={`font-bold ${khataDue > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                ₹{khataDue.toFixed(2)}
                            </span>
                        </div>
                    )}
                    
                    {/* Payment Type Toggle (Full Credit vs Cash/Mixed) */}
                    <div className="flex rounded-xl overflow-hidden shadow-2xl">
                        <button
                            onClick={() => setPaymentType('Cash/UPI')}
                            className={`flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'Cash/UPI' 
                                    ? 'bg-teal-600 text-white shadow-inner shadow-teal-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            <DollarSign className="w-5 h-5 inline-block mr-1" /> Cash / Mixed
                        </button>
                        <button
                            onClick={() => setPaymentType('Credit')}
                            disabled={!isCreditCustomer}
                            className={`flex-1 py-3 text-center font-bold text-lg transition-all duration-200 ${
                                paymentType === 'Credit' 
                                    ? 'bg-red-600 text-white shadow-inner shadow-red-900' 
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={!isCreditCustomer ? 'Requires a selected customer other than Walk-in' : ''}
                        >
                            <CreditCard className="w-5 h-5 inline-block mr-1" /> Full Khata
                        </button>
                    </div>

                    {/* Amount Paid Input (Visible only for Cash/Mixed) */}
                    {paymentType === 'Cash/UPI' && (
                        <div className="space-y-2">
                            <label htmlFor="amount-paid" className="block text-sm font-medium text-gray-300">Amount Received (Cash/UPI)</label>
                            <input
                                id="amount-paid"
                                type="number"
                                step="0.01"
                                value={amountPaidInput}
                                onChange={(e) => setAmountPaidInput(e.target.value)}
                                className="w-full p-4 border-2 border-teal-600 bg-gray-700 text-teal-400 rounded-xl text-3xl font-extrabold focus:ring-teal-500 focus:border-teal-500 shadow-xl transition-colors"
                                placeholder={totalAmount.toFixed(2)}
                                autoFocus
                            />
                        </div>
                    )}
                    
                    {/* Transaction Summary */}
                    <div className="pt-2 space-y-3">
                        {/* Change Due (Cash Overpayment) */}
                        {changeDue > 0.01 && (
                            <p className="flex justify-between font-bold text-xl text-green-400 p-3 bg-green-900/40 rounded-lg border border-green-700">
                                <span>Change Due:</span>
                                <span>₹{changeDue.toFixed(2)}</span>
                            </p>
                        )}

                        {/* Amount Added to Khata (Credit/Partial Payment) */}
                        {amountCredited > 0.01 && (
                             <p className={`flex justify-between font-bold text-xl p-3 rounded-lg border ${
                                 amountCredited > 0 && isCreditCustomer 
                                     ? 'bg-red-900/40 text-red-400 border-red-700'
                                     : 'bg-yellow-900/40 text-yellow-400 border-yellow-700'
                             }`}>
                                <span>{paymentMethod === 'Credit' ? 'Full Sale to Khata' : 'Remaining Khata/Credit:'}</span>
                                <span className="text-2xl font-extrabold">₹{amountCredited.toFixed(2)}</span>
                            </p>
                        )}

                        {/* New Khata Balance */}
                        {isCreditCustomer && amountCredited > 0 && (
                            <p className="flex justify-between text-sm text-gray-400 pt-3 border-t border-gray-700 mt-2">
                                <span>New Outstanding Khata Balance:</span>
                                <span className="font-semibold text-white text-base">₹{newKhataBalance.toFixed(2)}</span>
                            </p>
                        )}
                        
                        {/* Status Message if paid 0 in Cash/UPI mode and not credit customer */}
                        {paymentType === 'Cash/UPI' && amountCredited > 0 && !isCreditCustomer && (
                             <p className="text-xs text-center text-yellow-400 p-2 bg-yellow-900/30 rounded-lg">
                                This transaction requires selecting a saved customer to be recorded as Khata/Credit.
                            </p>
                        )}
                    </div>

                </div>

                {/* Modal Footer (Action Button) */}
                <div className="p-5 border-t border-gray-700">
                    <button 
                        onClick={handleConfirmPayment} 
                        className="w-full py-4 bg-teal-600 text-white rounded-xl font-extrabold text-xl shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition active:scale-[0.99] transform disabled:opacity-50"
                        disabled={totalAmount <= 0}
                    >
                        Confirm {paymentMethod} Transaction
                    </button>
                </div>
            </div>
        </div>
    );
};


const BillingPOS = ({ inventory, customers, addSale, showToast }) => {
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(WALK_IN_CUSTOMER);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false); // NEW STATE FOR MODAL

  // 1. Total Amount Calculation
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  // 2. Filtered Inventory: exclude 0 stock and apply search filter
  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    
    // Filter out 0 stock items AND apply search filter
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


  const addItemToCart = useCallback((itemToAdd) => {
    // Basic stock check before adding (though filteredInventory handles display, this handles direct action)
    if (itemToAdd.quantity <= 0) {
        showToast(`${itemToAdd.name} is currently out of stock.`, 'error');
        return;
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(item => item._id === itemToAdd._id);
      
      if (existingItem) {
        // Check if adding one more exceeds available inventory stock
        const inventoryItem = inventory.find(i => i._id === itemToAdd._id);
        if (existingItem.quantity + 1 > inventoryItem?.quantity) {
             showToast(`Only ${inventoryItem.quantity} units of ${itemToAdd.name} available.`, 'error');
             return prevCart;
        }
        
        // Increase quantity if item exists
        return prevCart.map(item =>
          item._id === itemToAdd._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        // Add new item to cart
        return [...prevCart, { ...itemToAdd, quantity: 1 }];
      }
    });
    showToast(`Added ${itemToAdd.name}`, 'info');
  }, [showToast, inventory]);

  const updateCartQuantity = useCallback((itemId, amount) => {
    setCart(prevCart => {
        // Find by MongoDB _id
        const item = prevCart.find(i => i._id === itemId);
        const inventoryItem = inventory.find(i => i._id === itemId);

        if (!item || !inventoryItem) return prevCart;

        const newQuantity = item.quantity + amount;
        
        // Prevent increasing past available stock
        if (amount > 0 && newQuantity > inventoryItem.quantity) {
             showToast(`Cannot add more. Only ${inventoryItem.quantity} units available.`, 'error');
             return prevCart;
        }

        if (newQuantity <= 0) {
            // Remove item if quantity drops to zero
            return prevCart.filter(i => i._id !== itemId);
        } else {
            // Update quantity
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
    
  // Renamed and updated to handle mixed payments from the modal
  const processPayment = async (amountPaid, amountCredited, paymentMethod) => {
    if (totalAmount <= 0) {
      showToast('Cart is empty. Cannot process sale.', 'error');
      return;
    }
     
    // Check credit limit before logging a credit sale
    if (amountCredited > 0 && selectedCustomer.creditLimit > 0) {
        const potentialNewCredit = selectedCustomer.outstandingCredit + amountCredited;
        if (potentialNewCredit > selectedCustomer.creditLimit) {
            showToast(`Credit limit of ₹${selectedCustomer.creditLimit.toFixed(0)} exceeded! Cannot add ₹${amountCredited.toFixed(2)} to Khata.`, 'error');
            return;
        }
    }
     
    // Prepare items data for the server
    const saleItems = cart.map(item => ({
        itemId: item._id || item.id, // Ensure we pass the MongoDB _id
        name: item.name,
        quantity: item.quantity,
        price: item.price,
    }));

    const saleData = {
      totalAmount: totalAmount,
      paymentMethod: paymentMethod, // 'Cash/UPI', 'Credit', or 'Mixed'
      customer: selectedCustomer.name,
      customerId: selectedCustomer._id || selectedCustomer.id, // Use MongoDB ID if available
      items: saleItems,
      // NEW FIELDS for detailed accounting
      amountPaid: amountPaid,
      amountCredited: amountCredited, // The portion of the current bill added to Khata
    };
     
    // Log the sale (calls the mock API in App.js)
    await addSale(saleData); 
     
    // Clear the cart and reset the customer after successful transaction
    setCart([]);
    setSelectedCustomer(WALK_IN_CUSTOMER);
    setSearchTerm(''); // Clear search term after sale
    setIsPaymentModalOpen(false); // Close modal
     
    // App.js now handles the success toast.
  };


  // --- Component Render ---

  return (
    // Updated background to match LandingPage's primary dark color
    <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 text-gray-300 pb-60 md:pb-8 transition-colors duration-300">
      
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
                    // Updated styling: dark background, indigo border, white text
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
                // Enhanced credit display
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
                // Updated styling: dark background, gray border, indigo focus
                className="w-full pl-10 pr-10 py-3 border border-gray-700 rounded-xl text-base focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-800 text-white shadow-xl"
            />
             {searchTerm && (
                // Clear button placed inside the input field
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
                        // Updated button style: darker background, purple accent
                        className="bg-indigo-900/40 text-indigo-300 p-2 rounded-lg font-semibold text-xs transition hover:bg-indigo-800/60 shadow-md border border-indigo-700 active:scale-[0.98] transform whitespace-nowrap overflow-hidden text-ellipsis"
                        onClick={() => addItemToCart(item)}
                        title={item.name}
                    >
                        <span className="truncate block leading-tight">{item.name}</span> 
                        <span className="text-xs font-normal opacity-80 block mt-0.5 text-teal-400">₹{item.price.toFixed(2)}</span>
                    </button>
                ))}
            
                {/* Display message if no items are found */}
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
                    // Updated item card style: darker background, gray border
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
         
        {/* Placeholder for scroll space on mobile (Hidden on desktop) */}
        <div className="h-4 md:hidden"></div>
      </div>
       
      {/* STICKY FOOTER: Total and Payment Buttons - Rendered only when the cart has items (cart.length > 0) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t-4 border-teal-600 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] p-4 z-20 md:static md:p-0 md:mt-6 md:border-0 md:shadow-none md:bg-transparent transition-colors duration-300">
            <div className="p-3 bg-indigo-900/60 rounded-xl mb-3 border border-indigo-700">
                <p className="text-xl font-bold text-white flex justify-between items-center">
                    <span>TOTAL:</span>
                    <span className="text-teal-400 text-4xl font-extrabold">₹{totalAmount.toFixed(2)}</span>
                </p>
            </div>

            {/* NEW: Single button to open the Payment Modal */}
            <div className="grid grid-cols-1 gap-3">
                <button 
                    className="py-4 bg-teal-600 text-white rounded-xl font-extrabold text-xl shadow-2xl shadow-teal-900/50 hover:bg-teal-700 transition flex items-center justify-center active:scale-[0.99] transform"
                    onClick={() => {
                        if (totalAmount > 0) {
                             setIsPaymentModalOpen(true);
                        } else {
                            showToast('Cart is empty. Please add items.', 'error');
                        }
                    }}
                >
                    <DollarSign className="w-5 h-5 inline-block mr-2" /> Process Payment
                </button>
            </div>
        </div>
      )}

      {/* Payment Modal (Updated the styling inside the component definition above) */}
      <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          totalAmount={totalAmount}
          selectedCustomer={selectedCustomer}
          processPayment={processPayment}
          showToast={showToast}
      />

    </div>
  );
};


// Dummy components 
const Dashboard = () => <div className="p-8"><h1 className="text-2xl font-bold">Dashboard Placeholder</h1></div>; 
const Ledger = () => <div className="p-8"><h1 className="text-2xl font-bold">Khata/Ledger Placeholder</h1></div>; 


export default BillingPOS;