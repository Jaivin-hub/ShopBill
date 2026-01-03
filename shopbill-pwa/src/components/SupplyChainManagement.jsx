import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Truck, Plus, History, Users, PackageCheck, IndianRupee, AlertTriangle,
  ArrowRight, Loader, X, Search, ChevronDown, Check, Phone, Mail, ScanLine, Package,
  Calculator, Calendar
} from 'lucide-react';
import ScannerModal from './ScannerModal'; 

const DATE_FILTERS = [
    { id: '24h', label: ['24', 'Hrs'], days: 1 },
    { id: '7d', label: ['7', 'Days'], days: 7 },
    { id: '30d', label: ['30', 'Days'], days: 30 },
    { id: 'all', label: ['All', 'Time'], days: Infinity },
    { id: 'custom', label: ['Custom', 'Range'], days: 0 },
];

const SupplyChainManagement = ({ apiClient, API, showToast }) => {
  // --- States ---
  const [activeTab, setActiveTab] = useState('purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  // Date Filtering States
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Selection States
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  
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
    name: '', phone: '', email: '', gstin: ''
  });

  const [productForm, setProductForm] = useState({
    name: '', price: '', quantity: 0, reorderLevel: 5, hsn: ''
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

  // --- Filter Logic ---
  const filteredHistory = useMemo(() => {
    return purchaseHistory.filter(item => {
      const itemDate = new Date(item.date);
      const now = new Date();

      if (selectedFilter === 'custom') {
        if (!customStartDate || !customEndDate) return true;
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return itemDate >= start && itemDate <= end;
      }

      const filter = DATE_FILTERS.find(f => f.id === selectedFilter);
      if (!filter || filter.id === 'all') return true;

      const diffInDays = (now - itemDate) / (1000 * 60 * 60 * 24);
      return diffInDays <= filter.days;
    });
  }, [purchaseHistory, selectedFilter, customStartDate, customEndDate]);

  // --- Calculations ---
  const historyTotals = useMemo(() => {
    return filteredHistory.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0;
      const price = Number(curr.purchasePrice) || 0;
      return {
        totalQty: acc.totalQty + qty,
        totalValue: acc.totalValue + (qty * price)
      };
    }, { totalQty: 0, totalValue: 0 });
  }, [filteredHistory]);

  // --- Handlers ---
  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.productId || !purchaseForm.supplierId) return showToast("Select product & supplier", "info");
    
    setIsLoading(true);
    try {
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
    if (supplierForm.name.length < 2) return showToast("Enter a valid supplier name", "info");
    
    setIsLoading(true);
    try {
      await apiClient.post(API.scmSuppliers, supplierForm);
      showToast("Supplier added successfully", "success");
      setSupplierForm({ name: '', phone: '', email: '', gstin: '' });
      setIsSupplierModalOpen(false);
      fetchSCMData();
    } catch (error) {
      showToast("Failed to add supplier", "error");
    } finally { setIsLoading(false); }
  };

  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name) return showToast("Product name is required", "info");
    setIsLoading(true);
    try {
      const res = await apiClient.post(API.inventory, productForm);
      showToast("New product registered", "success");
      setPurchaseForm(prev => ({ ...prev, productId: res.data._id || res.data.id }));
      setProductForm({ name: '', price: '', quantity: 0, reorderLevel: 5, hsn: '' });
      setIsProductModalOpen(false);
      fetchSCMData();
    } catch (error) {
      showToast("Failed to add product", "error");
    } finally { setIsLoading(false); }
  };

  const handleScanSuccess = (scannedItem) => {
    const code = (scannedItem.hsn || scannedItem.barcode || "").toLowerCase().trim();
    const existing = inventory.find(p => p.hsn && p.hsn.toLowerCase().trim() === code);
    
    setIsScannerModalOpen(false);
    if (existing) {
      setPurchaseForm(prev => ({ ...prev, productId: existing._id || existing.id }));
      setIsProductModalOpen(false);
      showToast(`Existing product found: ${existing.name}`, "success");
    } else {
      setProductForm(prev => ({ ...prev, hsn: code }));
      setIsProductModalOpen(true);
      showToast("Barcode recognized. Fill in details to register.", "info");
    }
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
    <div className="p-4 md:p-8 bg-gray-950 min-h-screen text-gray-200">
      {/* HEADER SECTION */}
      <header className="">
        <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 tracking-tight uppercase text-white">
            Supply Management
        </h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 md:ml-11">
            Logistics & Procurement Control
        </p>
      </header>

      {/* STICKY TABS SECTION */}
      <div className="sticky top-0 z-40 py-4 bg-gray-950/80 backdrop-blur-xl -mx-4 px-4 md:-mx-8 md:px-8 border-b border-gray-900/50 transition-all">
        <div className="flex bg-gray-900/80 p-1 rounded-2xl border border-gray-800 shadow-2xl max-w-xl mx-auto">
            {['purchase', 'history', 'suppliers'].map((id) => (
            <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 py-3 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all ${
                activeTab === id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
                }`}
            >
                {id}
            </button>
            ))}
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto">
        {activeTab === 'purchase' && (
          <form onSubmit={handlePurchaseSubmit} className="space-y-4 max-w-2xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Purchase Form Content (Same as previous) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Product Name</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setIsProductPickerOpen(true); setSearchTerm(''); }} className="flex-1 bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between active:scale-[0.99] transition-all overflow-hidden text-left">
                  <div className="flex flex-col truncate mr-2">
                    <span className={selectedProduct ? 'text-white font-semibold truncate' : 'text-gray-500 truncate'}>{selectedProduct ? selectedProduct.name : 'Choose a product...'}</span>
                    {selectedProduct && <span className={`text-[10px] font-bold uppercase ${selectedProduct.quantity <= (selectedProduct.reorderLevel || 5) ? 'text-red-500' : 'text-indigo-400'}`}>Available: {selectedProduct.quantity}</span>}
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </button>
                <button type="button" onClick={() => setIsProductModalOpen(true)} className="bg-emerald-600/10 text-emerald-400 p-4 rounded-2xl border border-emerald-500/20 active:scale-90 transition-all flex-shrink-0"><Plus className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Supplier / Vendor</label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setIsSupplierPickerOpen(true); setSearchTerm(''); }} className="flex-1 bg-gray-900 border border-gray-800 p-4 rounded-2xl flex items-center justify-between active:scale-[0.99] transition-all overflow-hidden text-left">
                  <span className={selectedSupplier ? 'text-white font-semibold truncate' : 'text-gray-500 truncate'}>{selectedSupplier ? selectedSupplier.name : 'Choose a supplier...'}</span>
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </button>
                <button type="button" onClick={() => setIsSupplierModalOpen(true)} className="bg-indigo-600/10 text-indigo-400 p-4 rounded-2xl border border-indigo-500/20 active:scale-90 transition-all flex-shrink-0"><Plus className="w-6 h-6" /></button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Quantity Received</label>
                <input type="number" required min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({...purchaseForm, quantity: e.target.value})} className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none focus:border-indigo-500 text-white" placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Unit Purchase Cost</label>
                <div className="relative">
                  <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input type="number" required step="0.01" min="0" value={purchaseForm.purchasePrice} onChange={(e) => setPurchaseForm({...purchaseForm, purchasePrice: e.target.value})} className="w-full bg-gray-900 border border-gray-800 p-4 pl-10 rounded-2xl outline-none focus:border-indigo-500 text-white" placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Invoice / Bill Number</label>
                <input type="text" value={purchaseForm.invoiceNumber} onChange={(e) => setPurchaseForm({...purchaseForm, invoiceNumber: e.target.value})} className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none text-white" placeholder="Optional" />
              </div>
              <div className="space-y-2 overflow-hidden">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Entry Date</label>
                <input type="date" value={purchaseForm.date} onChange={(e) => setPurchaseForm({...purchaseForm, date: e.target.value})} className="w-full bg-gray-900 border border-gray-800 p-4 rounded-2xl outline-none text-sm text-white" />
              </div>
            </div>

            <button disabled={isLoading} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4">
              {isLoading ? <Loader className="animate-spin" /> : <>UPDATE STOCK <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 pb-20 animate-in fade-in duration-500">
              <nav aria-label="Report date filters" className="space-y-4">
                  <div className="overflow-x-auto no-scrollbar py-1">
                      <div className="inline-flex space-x-2 p-1 bg-gray-900 rounded-xl border border-gray-800" role="group">
                          {DATE_FILTERS.map(filter => (
                              <button
                                  key={filter.id}
                                  onClick={() => setSelectedFilter(filter.id)}
                                  className={`px-3 py-2 min-w-[70px] rounded-lg transition-all whitespace-nowrap flex flex-col items-center justify-center ${selectedFilter === filter.id
                                      ? 'bg-indigo-600 text-white shadow-lg'
                                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                      }`}
                                  disabled={isLoading}
                              >
                                  <span className="text-xs md:text-sm font-black leading-none">{filter.label[0]}</span>
                                  <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-tighter opacity-70 mt-0.5">{filter.label[1]}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  {selectedFilter === 'custom' && (
                      <div className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800 animate-in fade-in zoom-in duration-200">
                          <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="flex-1 p-2 text-xs border border-gray-700 rounded-lg bg-gray-800 text-white outline-none" />
                          <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="flex-1 p-2 text-xs border border-gray-700 rounded-lg bg-gray-800 text-white outline-none" />
                      </div>
                  )}
              </nav>

              {filteredHistory.length === 0 ? (
                  <div className="text-center py-20 bg-gray-900/30 rounded-3xl border border-dashed border-gray-800">
                    <History className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No records found for this period</p>
                  </div>
              ) : (
                  <>
                      {/* STAT CARDS - FIXED IN ONE ROW (2 COLUMNS) */}
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                          <div className="bg-gray-900 border border-gray-800 p-4 md:p-6 rounded-2xl md:rounded-3xl">
                              <p className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Total Qty</p>
                              <p className="text-xl md:text-2xl font-black text-white">{historyTotals.totalQty}</p>
                          </div>
                          <div className="bg-indigo-600 border border-indigo-500 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg shadow-indigo-600/20">
                              <p className="text-[9px] md:text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Total Value</p>
                              <p className="text-xl md:text-2xl font-black text-white flex items-center gap-1">
                                  <IndianRupee className="w-4 h-4 md:w-5 md:h-5" /> {historyTotals.totalValue.toLocaleString()}
                              </p>
                          </div>
                      </div>

                      <div className="overflow-x-auto rounded-3xl border border-gray-800 bg-gray-900/20">
                          <table className="w-full text-left min-w-[700px]">
                            <thead className="bg-gray-900 text-[10px] uppercase tracking-widest text-gray-500 font-black border-b border-gray-800">
                                <tr>
                                <th className="p-4">Date / Inv</th>
                                <th className="p-4">Item</th>
                                <th className="p-4">Supplier</th>
                                <th className="p-4 text-center">Unit Cost</th>
                                <th className="p-4 text-center">Qty</th>
                                <th className="p-4 text-right">Total Spent</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {filteredHistory.map(record => {
                                    const totalRowSpent = (record.quantity || 0) * (record.purchasePrice || 0);
                                    return (
                                        <tr key={record._id} className="hover:bg-gray-900/50 transition-colors">
                                            <td className="p-4 text-xs font-bold">
                                                <p className="text-white">{new Date(record.date).toLocaleDateString()}</p>
                                                <p className="text-[10px] text-gray-500 font-mono uppercase">{record.invoiceNumber || 'No Invoice'}</p>
                                            </td>
                                            <td className="p-4 text-xs font-semibold text-white">{record.productId?.name || '---'}</td>
                                            <td className="p-4 text-[10px] text-gray-400 font-bold uppercase">{record.supplierId?.name || 'Vendor'}</td>
                                            <td className="p-4 text-center text-[10px] text-gray-400 font-mono">₹{record.purchasePrice}</td>
                                            <td className="p-4 text-center text-xs font-black text-indigo-400">+{record.quantity}</td>
                                            <td className="p-4 text-right text-xs font-black text-emerald-400">₹{totalRowSpent.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                          </table>
                      </div>
                  </>
              )}
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20 animate-in fade-in duration-500">
            <button onClick={() => setIsSupplierModalOpen(true)} className="h-40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center gap-3 text-gray-500 hover:border-indigo-500 hover:text-indigo-400 transition-all bg-gray-900/10">
              <Plus className="w-8 h-8" />
              <span className="font-bold uppercase tracking-widest text-[10px]">Add Vendor</span>
            </button>
            {suppliers.map(s => (
              <div key={s._id} className="p-6 bg-gray-900 border border-gray-800 rounded-3xl group hover:border-indigo-500 transition-all">
                <h4 className="text-lg font-black text-white truncate">{s.name}</h4>
                <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
                  {s.phone && <p className="text-xs text-gray-400 flex items-center gap-2"><Phone className="w-3 h-3"/> {s.phone}</p>}
                  {s.gstin && <p className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 w-fit px-2 py-1 rounded">GST: {s.gstin}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALS SECTION */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
          <form onSubmit={handleQuickAddProduct} className="relative w-full max-w-md bg-gray-900 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-gray-800 shadow-2xl animate-in zoom-in duration-300 overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl md:text-2xl font-black tracking-tighter uppercase text-white">Quick Register</h3>
                <X className="w-6 h-6 text-gray-500 cursor-pointer" onClick={() => setIsProductModalOpen(false)} />
             </div>
             <button type="button" onClick={() => setIsScannerModalOpen(true)} className="w-full mb-6 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all group">
                <ScanLine className="w-5 h-5 group-hover:scale-125 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest">Scan Barcode / HSN</span>
             </button>
             <div className="space-y-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Product Name *</label>
                 <input required placeholder="Enter item name" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none border border-transparent focus:border-emerald-500 text-white" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Selling Price (₹) *</label>
                 <input type="number" required placeholder="Set retail price" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none text-white" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">HSN / Barcode</label>
                 <input placeholder="Code auto-fills after scan" value={productForm.hsn} onChange={e => setProductForm({...productForm, hsn: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none border border-gray-700/50 text-indigo-300 font-mono" />
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Reorder Alert Level</label>
                 <input type="number" placeholder="Default: 5" value={productForm.reorderLevel} onChange={e => setProductForm({...productForm, reorderLevel: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none text-white" />
               </div>
             </div>
             <button disabled={isLoading} className="w-full mt-6 bg-emerald-600 p-5 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 active:scale-95 transition-all">
               {isLoading ? <Loader className="animate-spin mx-auto" /> : 'Register & Select Item'}
             </button>
          </form>
        </div>
      )}

      {/* Highest Z-Index Scanner */}
      <div className="relative z-[150]">
        <ScannerModal isOpen={isScannerModalOpen} onClose={() => setIsScannerModalOpen(false)} onScanSuccess={handleScanSuccess} inventory={inventory} />
      </div>

      {isProductPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsProductPickerOpen(false)} />
          <div className="relative w-full max-w-lg bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl border-t border-gray-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 pb-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Select Product</h3>
                <button onClick={() => setIsProductPickerOpen(false)} className="p-2 bg-gray-800 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input placeholder="Search item..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 border-none p-4 pl-12 rounded-2xl outline-none focus:ring-1 focus:ring-indigo-500 text-white" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-2">
              {filteredProducts.map(item => {
                const isLowStock = item.quantity <= (item.reorderLevel || 5);
                return (
                  <button key={item._id} onClick={() => { setPurchaseForm({...purchaseForm, productId: item._id}); setIsProductPickerOpen(false); }} className={`w-full flex items-center justify-between p-4 hover:bg-gray-800 rounded-2xl transition-all border-b border-gray-800/30 last:border-none ${isLowStock ? 'bg-red-500/5' : ''}`}>
                    <div className="text-left">
                      <p className={`font-bold ${isLowStock ? 'text-red-400' : 'text-white'}`}>{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${isLowStock ? 'bg-red-500/20 text-red-500' : 'bg-indigo-500/10 text-indigo-400'}`}>Stock: {item.quantity}</p>
                        {isLowStock && <AlertTriangle className="w-3 h-3 text-red-500" />}
                      </div>
                    </div>
                    {purchaseForm.productId === item._id && <Check className="w-5 h-5 text-indigo-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isSupplierPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsSupplierPickerOpen(false)} />
          <div className="relative w-full max-w-lg bg-gray-900 rounded-t-[2.5rem] sm:rounded-3xl border-t border-gray-800 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 pb-2">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black uppercase tracking-tighter text-white">Select Supplier</h3>
                <button onClick={() => setIsSupplierPickerOpen(false)} className="p-2 bg-gray-800 rounded-full text-gray-400"><X className="w-5 h-5" /></button>
              </div>
              <input placeholder="Search vendor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-800 p-4 rounded-2xl outline-none text-white" />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredSuppliers.map(s => (
                <button key={s._id} onClick={() => { setPurchaseForm({...purchaseForm, supplierId: s._id}); setIsSupplierPickerOpen(false); }} className="w-full flex items-center justify-between p-4 hover:bg-gray-800 rounded-2xl transition-all border-b border-gray-800/30 last:border-none">
                  <div className="text-left"><p className="font-bold text-white">{s.name}</p><p className="text-xs text-gray-500 font-mono">{s.phone || 'No phone'}</p></div>
                  {purchaseForm.supplierId === s._id && <Check className="w-5 h-5 text-indigo-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setIsSupplierModalOpen(false)} />
          <form onSubmit={handleAddSupplier} className="relative w-full max-w-md bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 shadow-2xl animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black tracking-tighter uppercase text-white">New Vendor</h3><X className="w-6 h-6 text-gray-500 cursor-pointer" onClick={() => setIsSupplierModalOpen(false)} /></div>
             <div className="space-y-4">
               <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Supplier Name *</label><input required placeholder="Business / Shop Name" value={supplierForm.name} onChange={e => setSupplierForm({...supplierForm, name: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none border border-transparent focus:border-indigo-500 text-white" /></div>
               <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Contact Phone *</label><input required type="tel" placeholder="10-digit mobile" value={supplierForm.phone} onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none border border-transparent focus:border-indigo-500 text-white" /></div>
               <div className="space-y-1"><label className="text-[10px] font-bold text-gray-500 uppercase ml-1">GSTIN Number</label><input placeholder="Enter GST if available" value={supplierForm.gstin} onChange={e => setSupplierForm({...supplierForm, gstin: e.target.value})} className="w-full bg-gray-800 p-4 rounded-2xl outline-none text-white" /></div>
             </div>
             <button disabled={isLoading} className="w-full mt-6 bg-indigo-600 p-5 rounded-2xl font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">{isLoading ? <Loader className="animate-spin mx-auto" /> : 'Create Vendor Profile'}</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SupplyChainManagement;