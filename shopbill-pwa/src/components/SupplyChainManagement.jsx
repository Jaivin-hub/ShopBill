import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Truck, Plus, History, Users, PackageCheck, IndianRupee, 
  ArrowRight, Loader, X, Search, ChevronDown, Check, Phone, Mail
} from 'lucide-react';

const SupplyChainManagement = ({ apiClient, API, showToast }) => {
  // --- States ---
  const [activeTab, setActiveTab] = useState('purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  // Selection States
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
        apiClient.get(API.scmSuppliers).catch(() => ({ data: [] })),
        apiClient.get(API.scmPurchases).catch(() => ({ data: [] })),
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

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.productId || !purchaseForm.supplierId) return showToast("Select product & supplier", "info");
    
    setIsLoading(true);
    try {
      // Logic: One API call handles both record creation and stock increment on backend
      await apiClient.post(API.scmPurchases, {
        ...purchaseForm,
        quantity: Number(purchaseForm.quantity),
        purchasePrice: Number(purchaseForm.purchasePrice)
      });
      
      showToast(`Stock entry recorded successfully!`, 'success');
      setPurchaseForm({
        productId: '', supplierId: '', quantity: '', purchasePrice: '', 
        invoiceNumber: '', date: new Date().toISOString().split('T')[0]
      });
      fetchSCMData();
    } catch (error) {
      showToast(error.response?.data?.error || "Failed to record purchase", 'error');
    } finally { setIsLoading(false); }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post(API.scmSuppliers, supplierForm);
      showToast("Supplier added successfully", "success");
      setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', gstin: '' });
      setIsSupplierModalOpen(false);
      fetchSCMData();
    } catch (error) {
      showToast("Failed to add supplier", "error");
    } finally { setIsLoading(false); }
  };

  const filteredProducts = useMemo(() => 
    inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [inventory, searchTerm]
  );

  const filteredSuppliers = useMemo(() => 
    suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [suppliers, searchTerm]
  );

  const selectedProduct = inventory.find(p => p._id === purchaseForm.productId);
  const selectedSupplier = suppliers.find(s => s._id === purchaseForm.supplierId);

  return (
    <div className="p-4 md:p-8 bg-gray-950 min-h-full text-gray-200">
      <header className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2 tracking-tight">
          <Truck className="text-indigo-500 w-7 h-7" /> SUPPLY CHAIN
        </h1>
      </header>

      {/* Tabs */}
      <div className="flex bg-gray-900/50 p-1 rounded-2xl mb-8 border border-gray-800">
        {['purchase', 'history', 'suppliers'].map((id) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      {activeTab === 'purchase' && (
        <form onSubmit={handlePurchaseSubmit} className="space-y-4 max-w-2xl mx-auto pb-20">
          
          {/* Custom Product Picker */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Select Product</label>
            <button
              type="button"
              onClick={() => { setIsProductPickerOpen(true); setSearchTerm(''); }}
              className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all"
            >
              <div className="flex flex-col items-start">
                <span className={selectedProduct ? 'text-white font-semibold' : 'text-gray-500'}>
                  {selectedProduct ? selectedProduct.name : 'Choose a product...'}
                </span>
                {selectedProduct && (
                  <span className="text-[10px] text-indigo-400 font-bold uppercase">
                    Current Stock: {selectedProduct.quantity}
                  </span>
                )}
              </div>
              <ChevronDown className="w-5 h-5 text-gray-500 group-hover:text-indigo-400" />
            </button>
          </div>

          {/* Custom Supplier Picker */}
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Quantity to Add</label>
              <input 
                type="number" required
                value={purchaseForm.quantity}
                onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none focus:border-indigo-500"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Unit Cost (Buying Price)</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Invoice Number</label>
              <input 
                type="text"
                value={purchaseForm.invoiceNumber}
                onChange={(e) => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none"
                placeholder="Bill #"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Date</label>
              <input 
                type="date"
                value={purchaseForm.date}
                onChange={(e) => setPurchaseForm({...purchaseForm, date: e.target.value})}
                className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none text-xs"
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

      {/* Drawer Modals */}
      {(isProductPickerOpen || isSupplierPickerOpen) && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
          
          <div className="relative w-full max-w-lg bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl border-t border-gray-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 pb-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black uppercase tracking-tighter">
                  {isProductPickerOpen ? 'Choose Product' : 'Choose Supplier'}
                </h3>
                <button onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} className="p-2 bg-gray-800 rounded-full text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  autoFocus
                  placeholder="Quick search..."
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
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-800 rounded-2xl transition-all border-b border-gray-800/30 last:border-none"
                  >
                    <div className="text-left">
                      <p className="font-bold text-white">{item.name}</p>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        In Stock: <span className={item.quantity <= (item.reorderLevel || 5) ? 'text-red-400' : 'text-indigo-400'}>{item.quantity} {item.unit || 'units'}</span>
                      </p>
                    </div>
                    {purchaseForm.productId === item._id && <Check className="w-5 h-5 text-indigo-500" />}
                  </button>
                ))
              ) : (
                filteredSuppliers.map(s => (
                  <button
                    key={s._id}
                    onClick={() => { setPurchaseForm({...purchaseForm, supplierId: s._id}); setIsSupplierPickerOpen(false); }}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-800 rounded-2xl transition-all border-b border-gray-800/30 last:border-none"
                  >
                    <div className="text-left">
                      <p className="font-bold text-white">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.phone || 'No phone recorded'}</p>
                    </div>
                    {purchaseForm.supplierId === s._id && <Check className="w-5 h-5 text-indigo-500" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Tab */}
      {activeTab === 'history' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {purchaseHistory.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
               <History className="w-12 h-12 text-gray-800 mx-auto mb-4" />
               <p className="text-gray-500 font-medium">No purchase records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-gray-800">
              <table className="w-full text-left">
                <thead className="bg-gray-900 text-[10px] uppercase tracking-widest text-gray-500 font-black border-b border-gray-800">
                  <tr>
                    <th className="p-4">Date/Invoice</th>
                    <th className="p-4">Product</th>
                    <th className="p-4">Supplier</th>
                    <th className="p-4 text-right">Qty</th>
                    <th className="p-4 text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {purchaseHistory.map(record => (
                    <tr key={record._id} className="hover:bg-gray-900/50 transition-colors">
                      <td className="p-4">
                        <p className="text-xs font-bold">{new Date(record.date).toLocaleDateString()}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{record.invoiceNumber || 'NO INV'}</p>
                      </td>
                      <td className="p-4 text-sm font-semibold">{record.productId?.name || 'Deleted Product'}</td>
                      <td className="p-4 text-xs text-gray-400">{record.supplierId?.name || 'Direct'}</td>
                      <td className="p-4 text-right font-bold text-indigo-400">+{record.quantity}</td>
                      <td className="p-4 text-right text-xs font-mono">₹{(record.purchasePrice * record.quantity).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supplier List Tab */}
      {activeTab === 'suppliers' && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            onClick={() => setIsSupplierModalOpen(true)}
            className="h-40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-all active:scale-95 bg-gray-900/20"
          >
            <Plus className="w-8 h-8" />
            <span className="font-bold uppercase tracking-widest text-[10px]">New Supplier</span>
          </button>
          
          {suppliers.map(s => (
            <div key={s._id} className="p-6 bg-gray-900 border border-gray-800 rounded-3xl hover:border-gray-700 transition-all group">
              <h4 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">{s.name}</h4>
              <p className="text-xs text-gray-500 font-medium mb-4">{s.contactPerson || 'Vendor'}</p>
              <div className="space-y-2 border-t border-gray-800 pt-4">
                {s.phone && <p className="text-xs text-gray-400 flex items-center gap-2 font-mono"><Phone className="w-3 h-3"/> {s.phone}</p>}
                {s.email && <p className="text-xs text-gray-400 flex items-center gap-2 font-mono"><Mail className="w-3 h-3"/> {s.email}</p>}
                {s.gstin && <p className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 w-fit px-2 py-1 rounded">GST: {s.gstin}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsSupplierModalOpen(false)} />
          <form onSubmit={handleAddSupplier} className="relative w-full max-w-md bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black tracking-tighter uppercase">New Vendor</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer" onClick={() => setIsSupplierModalOpen(false)} />
             </div>
             <div className="space-y-3">
               <input placeholder="Supplier/Firm Name" required value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none" />
               <input placeholder="Contact Person" value={supplierForm.contactPerson} onChange={e => setSupplierForm({...supplierForm, contactPerson: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none" />
               <input placeholder="Phone" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none" />
               <input placeholder="GSTIN (Optional)" value={supplierForm.gstin} onChange={e => setSupplierForm({...supplierForm, gstin: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none" />
             </div>
             <button disabled={isLoading} className="w-full mt-6 bg-indigo-600 p-5 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
               {isLoading ? <Loader className="animate-spin mx-auto" /> : 'Save Supplier'}
             </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SupplyChainManagement;