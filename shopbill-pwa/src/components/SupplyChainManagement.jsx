import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Truck, Plus, History, Users, PackageCheck, IndianRupee, 
  ArrowRight, Loader, X, Search, ChevronDown, Check
} from 'lucide-react';

const SupplyChainManagement = ({ apiClient, API, showToast }) => {
  // --- States ---
  const [activeTab, setActiveTab] = useState('purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  // Selection States (Mobile Dropdown Replacement)
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  
  // Form Data
  const [purchaseForm, setPurchaseForm] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    purchasePrice: '',
    invoiceNumber: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [supplierForm, setSupplierForm] = useState({
    name: '', contactPerson: '', phone: '', email: '', gstin: ''
  });

  const fetchSCMData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [suppliersRes, historyRes, inventoryRes] = await Promise.all([
        apiClient.get(`${API.inventory}/suppliers`).catch(() => ({ data: [] })),
        apiClient.get(`${API.inventory}/purchases`).catch(() => ({ data: [] })),
        apiClient.get(API.inventory).catch(() => ({ data: [] }))
      ]);
      setSuppliers(suppliersRes.data || []);
      setPurchaseHistory(historyRes.data || []);
      setInventory(inventoryRes.data || []);
    } catch (error) {
      showToast("Could not load supply chain data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, API, showToast]);

  useEffect(() => { fetchSCMData(); }, [fetchSCMData]);

  // Filtered Lists for Search
  const filteredProducts = useMemo(() => 
    inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [inventory, searchTerm]
  );

  const filteredSuppliers = useMemo(() => 
    suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [suppliers, searchTerm]
  );

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.productId || !purchaseForm.supplierId) return showToast("Select product & supplier", "info");
    setIsLoading(true);
    try {
      await apiClient.post(`${API.inventory}/purchases`, purchaseForm);
      await apiClient.patch(`${API.inventory}/${purchaseForm.productId}/add-stock`, {
        quantity: parseFloat(purchaseForm.quantity)
      });
      showToast(`Stock updated successfully!`, 'success');
      setPurchaseForm({
        productId: '', supplierId: '', quantity: '', purchasePrice: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0]
      });
      fetchSCMData();
    } catch (error) {
      showToast("Failed to record purchase", 'error');
    } finally { setIsLoading(false); }
  };

  // Helper for rendering Selected Items
  const selectedProduct = inventory.find(p => p._id === purchaseForm.productId);
  const selectedSupplier = suppliers.find(s => s._id === purchaseForm.supplierId);

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-full text-gray-200">
      <header className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Truck className="text-indigo-500 w-7 h-7" /> SUPPLY CHAIN
        </h1>
      </header>

      {/* Mobile-Friendly Tabs */}
      <div className="flex bg-gray-900/50 p-1 rounded-2xl mb-6 border border-gray-800">
        {['purchase', 'history', 'suppliers'].map((id) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {activeTab === 'purchase' && (
        <form onSubmit={handlePurchaseSubmit} className="space-y-4 max-w-2xl mx-auto pb-20">
          
          {/* Custom Product Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Select Product</label>
            <button
              type="button"
              onClick={() => { setIsProductPickerOpen(true); setSearchTerm(''); }}
              className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <span className={selectedProduct ? 'text-white font-semibold' : 'text-gray-500'}>
                {selectedProduct ? selectedProduct.name : 'Choose a product...'}
              </span>
              <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-indigo-400" />
            </button>
          </div>

          {/* Custom Supplier Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Select Supplier</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setIsSupplierPickerOpen(true); setSearchTerm(''); }}
                className="flex-1 bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all"
              >
                <span className={selectedSupplier ? 'text-white font-semibold' : 'text-gray-500'}>
                  {selectedSupplier ? selectedSupplier.name : 'Choose a supplier...'}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              <button 
                type="button" 
                onClick={() => setIsSupplierModalOpen(true)}
                className="bg-indigo-600/10 text-indigo-400 p-4 rounded-2xl border border-indigo-500/20 active:scale-90 transition-all"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Quantity & Price Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Quantity</label>
              <input 
                type="number" required
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none focus:border-indigo-500"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Unit Cost</label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input 
                  type="number" required step="0.01"
                  value={purchaseForm.purchasePrice}
                  onChange={(e) => setPurchaseForm({...purchaseForm, purchasePrice: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-800 p-4 pl-10 rounded-2xl outline-none focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Invoice Number & Date</label>
            <div className="flex gap-2">
              <input 
                type="text"
                value={purchaseForm.invoiceNumber}
                onChange={(e) => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})}
                className="flex-1 bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none"
                placeholder="Inv #"
              />
              <input 
                type="date"
                value={purchaseForm.date}
                onChange={(e) => setPurchaseForm({...purchaseForm, date: e.target.value})}
                className="bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none text-xs"
              />
            </div>
          </div>

          <button 
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoading ? <Loader className="animate-spin" /> : <>RECORD STOCK ENTRY <ArrowRight className="w-5 h-5" /></>}
          </button>
        </form>
      )}

      {/* --- MOBILE SELECTION DRAWERS (Modals) --- */}
      {(isProductPickerOpen || isSupplierPickerOpen) && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
          
          <div className="relative w-full max-w-lg bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl border-t border-gray-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 pb-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black">{isProductPickerOpen ? 'Select Product' : 'Select Supplier'}</h3>
                <button onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} className="p-2 bg-gray-800 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  autoFocus
                  placeholder={`Search ${isProductPickerOpen ? 'products' : 'suppliers'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 border-none p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 pt-2">
              {isProductPickerOpen ? (
                filteredProducts.map(item => (
                  <button
                    key={item._id}
                    onClick={() => { setPurchaseForm({...purchaseForm, productId: item._id}); setIsProductPickerOpen(false); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-800 rounded-2xl transition-all border-b border-gray-800/50 last:border-none"
                  >
                    <div className="text-left">
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs text-gray-500">Current Stock: <span className="text-indigo-400">{item.quantity}</span></p>
                    </div>
                    {purchaseForm.productId === item._id && <Check className="w-5 h-5 text-indigo-500" />}
                  </button>
                ))
              ) : (
                filteredSuppliers.map(s => (
                  <button
                    key={s._id}
                    onClick={() => { setPurchaseForm({...purchaseForm, supplierId: s._id}); setIsSupplierPickerOpen(false); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-800 rounded-2xl transition-all border-b border-gray-800/50 last:border-none"
                  >
                    <div className="text-left">
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.contactPerson || 'Vendor'}</p>
                    </div>
                    {purchaseForm.supplierId === s._id && <Check className="w-5 h-5 text-indigo-500" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* History and Supplier Tabs omitted for brevity but remain the same as previous logic */}
      {/* ... [Rest of your History and Add Supplier Modal code] ... */}
    </div>
  );
};

export default SupplyChainManagement;