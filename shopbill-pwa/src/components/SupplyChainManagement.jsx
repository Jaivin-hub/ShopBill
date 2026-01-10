import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck, Plus, History, Users, PackageCheck, IndianRupee, AlertTriangle,
  ArrowRight, Loader, X, Search, ChevronDown, Check, Phone, Mail, ScanLine, Package,
  Calculator, Calendar, Store, Info, Hash, ExternalLink, RefreshCcw, Bell
} from 'lucide-react';
import ScannerModal from './ScannerModal';

const DATE_FILTERS = [
  { id: '24h', label: ['24', 'Hrs'], days: 1 },
  { id: '7d', label: ['7', 'Days'], days: 7 },
  { id: '30d', label: ['30', 'Days'], days: 30 },
  { id: 'all', label: ['All', 'Time'], days: Infinity },
  { id: 'custom', label: ['Custom', 'Range'], days: 0 },
];

const SupplyChainManagement = ({ apiClient, API, showToast, darkMode }) => {
  const [activeTab, setActiveTab] = useState('purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Theme Variables
  const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-gray-900/40 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';

  const [inventorySort, setInventorySort] = useState('low-stock');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({
    productId: '', supplierId: '', quantity: '', purchasePrice: '',
    invoiceNumber: '', date: new Date().toISOString().split('T')[0]
  });

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', gstin: '' });
  const [productForm, setProductForm] = useState({ name: '', price: '', quantity: 0, reorderLevel: 5, hsn: '' });

  // Auto-set custom range to current month
  useEffect(() => {
    if (selectedFilter === 'custom' && (!customStartDate || !customEndDate)) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];
      setCustomStartDate(firstDay);
      setCustomEndDate(today);
    }
  }, [selectedFilter]);

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

  const sortedInventory = useMemo(() => {
    let result = inventory.filter(item =>
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      (item.hsn && item.hsn.toLowerCase().includes(inventorySearch.toLowerCase()))
    );
    if (inventorySort === 'low-stock') {
      result.sort((a, b) => {
        const aLow = a.quantity <= (a.reorderLevel || 5);
        const bLow = b.quantity <= (b.reorderLevel || 5);
        if (aLow && !bLow) return -1;
        if (!aLow && bLow) return 1;
        return a.quantity - b.quantity;
      });
    } else if (inventorySort === 'a-z') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [inventory, inventorySort, inventorySearch]);

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

  const historyTotals = useMemo(() => {
    return filteredHistory.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0;
      const price = Number(curr.purchasePrice) || 0;
      return { totalQty: acc.totalQty + qty, totalValue: acc.totalValue + (qty * price) };
    }, { totalQty: 0, totalValue: 0 });
  }, [filteredHistory]);

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.productId || !purchaseForm.supplierId) return showToast("Select product & vendor", "info");
    setIsLoading(true);
    try {
      await apiClient.post(API.scmPurchases, { ...purchaseForm, quantity: Number(purchaseForm.quantity), purchasePrice: Number(purchaseForm.purchasePrice) });
      showToast(`Stock updated!`, 'success');
      setPurchaseForm({ productId: '', supplierId: '', quantity: '', purchasePrice: '', invoiceNumber: '', date: new Date().toISOString().split('T')[0] });
      fetchSCMData();
    } catch (error) {
      showToast("Error saving entry", 'error');
    } finally { setIsLoading(false); }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await apiClient.post(API.scmSuppliers, supplierForm);
      showToast("Vendor added", "success");
      setSupplierForm({ name: '', phone: '', email: '', gstin: '' });
      setIsSupplierModalOpen(false);
      fetchSCMData();
    } catch (error) { showToast("Error adding vendor", "error"); } finally { setIsLoading(false); }
  };

  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await apiClient.post(API.inventory, productForm);
      showToast("Product saved", "success");
      setPurchaseForm(prev => ({ ...prev, productId: res.data._id || res.data.id }));
      setProductForm({ name: '', price: '', quantity: 0, reorderLevel: 5, hsn: '' });
      setIsProductModalOpen(false);
      fetchSCMData();
    } catch (error) { showToast("Error adding product", "error"); } finally { setIsLoading(false); }
  };

  const handleScanSuccess = (scannedItem) => {
    const code = (scannedItem.hsn || scannedItem.barcode || "").toLowerCase().trim();
    const existing = inventory.find(p => p.hsn && p.hsn.toLowerCase().trim() === code);
    setIsScannerModalOpen(false);
    if (existing) {
      setPurchaseForm(prev => ({ ...prev, productId: existing._id || existing.id }));
      showToast(`Found: ${existing.name}`, "success");
    } else {
      setProductForm(prev => ({ ...prev, hsn: code }));
      setIsProductModalOpen(true);
      showToast("Barcode detected.", "info");
    }
  };

  const filteredProducts = useMemo(() => inventory.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())), [inventory, searchTerm]);
  const filteredSuppliers = useMemo(() => suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())), [suppliers, searchTerm]);
  const selectedProduct = inventory.find(p => p._id === purchaseForm.productId);
  const selectedSupplier = suppliers.find(s => s._id === purchaseForm.supplierId);

  return (
    <div className={`min-h-screen ${themeBase} selection:bg-indigo-500/30 font-sans transition-colors duration-200 pb-24`}>
      <header className={`sticky top-0 z-[100] ${darkMode ? 'bg-gray-950 border-gray-800/50' : 'bg-white border-slate-200 shadow-sm'} border-b px-4 md:px-8 py-4`}>
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tighter leading-none`}>
              Supply <span className="text-indigo-500">Chain</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1.5 uppercase">Inventory Inbound</p>
          </div>

          <div className={`${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'} flex p-1 rounded-xl border shadow-inner`}>
            {[
              { id: 'purchase', label: 'ADD STOCK', icon: PackageCheck },
              { id: 'history', label: 'LOGS', icon: History },
              { id: 'suppliers', label: 'VENDORS', icon: Store }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto p-4 md:p-8">
        {activeTab === 'purchase' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <form onSubmit={handlePurchaseSubmit} className={`${cardBase} rounded-2xl p-6 space-y-6 overflow-hidden`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Arrival Entry</span>
                  <button type="button" onClick={() => setIsScannerModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all">
                    <ScanLine className="w-4 h-4" />
                    <span className="text-[9px] font-black ">Scan Code</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 tracking-widest ml-1">Select Product</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsProductPickerOpen(true); setSearchTerm(''); }} className={`flex-1 ${inputBase} px-4 py-3 rounded-xl flex items-center justify-between text-left hover:border-indigo-500/50 transition-all`}>
                          <span className={`text-[11px] font-bold truncate ${selectedProduct ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-gray-400'}`}>{selectedProduct ? selectedProduct.name : 'Choose Item...'}</span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </button>
                        <button type="button" onClick={() => setIsProductModalOpen(true)} className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 text-white shrink-0"><Plus className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 tracking-widest ml-1">Select Vendor</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsSupplierPickerOpen(true); setSearchTerm(''); }} className={`flex-1 ${inputBase} px-4 py-3 rounded-xl flex items-center justify-between text-left hover:border-indigo-500/50 transition-all`}>
                          <span className={`text-[11px] font-bold truncate ${selectedSupplier ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-gray-400'}`}>{selectedSupplier ? selectedSupplier.name : 'Choose Vendor...'}</span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </button>
                        <button type="button" onClick={() => setIsSupplierModalOpen(true)} className={`p-3 rounded-xl hover:text-indigo-400 border shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-200 border-slate-300'}`}><Users className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 tracking-widest ml-1">Arrival Qty</label>
                      <input type="number" required min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} className={`w-full ${inputBase} px-4 py-3 rounded-xl outline-none text-xs font-black focus:border-indigo-500`} placeholder="0" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 tracking-widest ml-1">Cost Per Unit</label>
                      <input type="number" required step="0.01" value={purchaseForm.purchasePrice} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })} className={`w-full ${inputBase} px-4 py-3 rounded-xl outline-none text-xs font-black focus:border-indigo-500`} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-gray-500 tracking-widest ml-1">Invoice Number</label>
                      <input type="text" value={purchaseForm.invoiceNumber} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })} className={`w-full ${inputBase} px-4 py-3 rounded-xl outline-none text-xs font-mono`} placeholder="OPTIONAL" />
                    </div>
                    <div className="space-y-1.5 max-w-full">
                      <label className="text-[9px] font-black text-gray-500 tracking-widest ml-1">Arrival Date</label>
                      <div className="relative w-full overflow-hidden rounded-xl">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-500 z-10 pointer-events-none" />
                        <input 
                          type="date" 
                          value={purchaseForm.date} 
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} 
                          className={`w-full ${inputBase} pl-9 pr-4 py-3 rounded-xl outline-none text-[10px] font-bold border-transparent focus:border-indigo-500 appearance-none`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                    <span className="text-[9px] font-black text-indigo-400 tracking-widest">ENTRY TOTAL</span>
                    <span className={`text-xl font-black italic ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{(Number(purchaseForm.quantity || 0) * Number(purchaseForm.purchasePrice || 0)).toLocaleString()}</span>
                  </div>
                  <button disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-black text-[10px] tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3">
                    {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <>POST STOCK ENTRY <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </form>

              <div className={`hidden lg:flex ${darkMode ? 'bg-gray-900/20 border-gray-800' : 'bg-white border-slate-200 shadow-sm'} rounded-2xl overflow-hidden flex-col`}>
                <div className={`p-4 border-b ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-100'} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`text-[10px] font-black tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>LIVE STOCK OVERVIEW</h3>
                    <div className="flex items-center gap-2">
                      <select value={inventorySort} onChange={(e) => setInventorySort(e.target.value)} className={`${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-200 shadow-sm'} text-[9px] font-black text-indigo-400 px-2 py-1 rounded-lg outline-none cursor-pointer`}>
                        <option value="low-stock">Sort: Low Stock</option>
                        <option value="a-z">Sort: A-Z</option>
                      </select>
                      <button onClick={fetchSCMData} className="p-2 hover:bg-slate-200 dark:hover:bg-gray-800 rounded-lg transition-all"><RefreshCcw className="w-4 h-4 text-indigo-400" /></button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input placeholder="Search items..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className={`w-full ${inputBase} py-2 pl-9 pr-4 rounded-xl text-[10px] outline-none focus:border-indigo-500 transition-all`} />
                  </div>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[440px] custom-scrollbar">
                  {sortedInventory.map(item => {
                    const isLow = item.quantity <= (item.reorderLevel || 5);
                    const isSelected = purchaseForm.productId === item._id;
                    return (
                      <button key={item._id} onClick={() => setPurchaseForm(prev => ({ ...prev, productId: item._id }))} className={`p-4 rounded-xl border text-left transition-all relative group hover:scale-[1.02] active:scale-95 ${isSelected ? 'bg-indigo-600/20 border-indigo-500 shadow-lg' : isLow ? 'bg-red-500/5 border-red-500/20' : (darkMode ? 'bg-gray-950/50 border-gray-800/50' : 'bg-slate-50 border-slate-200')}`}>
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <p className={`text-[10px] font-black truncate ${isSelected ? 'text-indigo-400' : (darkMode ? 'text-gray-400' : 'text-slate-600')}`}>{item.name}</p>
                          {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                        </div>
                        <div className="flex justify-between items-end mb-3">
                          <p className={`text-xl font-black tracking-tighter ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>{item.quantity}</p>
                          <div className="text-right">
                            <p className="text-[7px] font-black text-gray-600 ">Rate: ₹{item.price}</p>
                            <p className="text-[7px] font-black text-gray-600 ">Stock</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 pt-2 border-t ${darkMode ? 'border-gray-800/50' : 'border-slate-200'}`}>
                          <Bell className={`w-2.5 h-2.5 ${isLow ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                          <span className="text-[8px] font-black text-gray-500 tracking-tighter">Min Alert: {item.reorderLevel || 5}</span>
                        </div>
                        {isSelected && <div className="absolute top-2 right-2"><Check className="w-3 h-3 text-indigo-500" /></div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col animate-in fade-in duration-500 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 shrink-0">
              {[
                { label: 'Logged Units', val: historyTotals.totalQty, icon: Package },
                { label: 'Outlay Total', val: `₹${historyTotals.totalValue.toLocaleString()}`, icon: IndianRupee },
                { label: 'Cycles', val: filteredHistory.length, icon: RefreshCcw },
                { label: 'Avg Cost', val: `₹${(historyTotals.totalValue / (filteredHistory.length || 1)).toFixed(0)}`, icon: Calculator }
              ].map((stat, i) => (
                <div key={i} className={`${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-slate-200'} border p-2 md:p-4 rounded-xl flex flex-col items-center text-center shadow-sm`}>
                  <div className={`p-1.5 md:p-2 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200'} rounded-lg mb-1 md:mb-2 border`}><stat.icon className="w-3 md:w-4 h-3 md:h-4 text-indigo-500" /></div>
                  <p className="text-[7px] md:text-[8px] font-black text-gray-600 tracking-widest mb-0.5 uppercase">{stat.label}</p>
                  <p className={`text-xs md:text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className={`${darkMode ? 'bg-gray-900/20 border-gray-800' : 'bg-white border-slate-200 shadow-sm'} rounded-2xl flex flex-col overflow-hidden min-h-0`}>
              <div className={`p-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-100'} border-b flex flex-col md:flex-row justify-between items-center px-6 gap-4 shrink-0`}>
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full">
                  {DATE_FILTERS.map(f => (
                    <button key={f.id} onClick={() => setSelectedFilter(f.id)} className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all whitespace-nowrap ${selectedFilter === f.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-slate-200 dark:hover:bg-gray-800'}`}>{f.label[0]} {f.label[1]}</button>
                  ))}
                </div>
                {selectedFilter === 'custom' && (
                  <div className="flex items-center gap-2 overflow-x-hidden w-full md:w-auto mt-2 md:mt-0">
                    <div className="relative flex-1 md:w-36">
                       <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500 z-10 pointer-events-none" />
                       <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className={`w-full ${inputBase} text-[10px] font-bold p-2 pl-8 rounded-lg outline-none border border-transparent focus:border-indigo-500 shadow-sm transition-colors text-slate-900 dark:text-white`} style={{ colorScheme: darkMode ? 'dark' : 'light' }} />
                    </div>
                    <div className="relative flex-1 md:w-36">
                       <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-indigo-500 z-10 pointer-events-none" />
                       <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className={`w-full ${inputBase} text-[10px] font-bold p-2 pl-8 rounded-lg outline-none border border-transparent focus:border-indigo-500 shadow-sm transition-colors text-slate-900 dark:text-white`} style={{ colorScheme: darkMode ? 'dark' : 'light' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:hidden p-4 space-y-3 overflow-y-auto max-h-[50vh] custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-[10px] text-gray-500 font-black py-10 uppercase tracking-widest">No records found</p>
                ) : filteredHistory.map(record => (
                  <div key={record._id} className={`${cardBase} p-4 rounded-xl border-l-4 border-l-indigo-500`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className={`text-[10px] font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{record.productId?.name}</p>
                        <p className="text-[8px] font-mono text-gray-500">{record.invoiceNumber || 'DIR-ENTRY'}</p>
                      </div>
                      <div className="text-right">
                         <span className="bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded text-[9px] font-black">+{record.quantity} Units</span>
                         <p className="text-[8px] font-black text-gray-500 mt-1 uppercase">@ ₹{record.purchasePrice}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-end pt-2 border-t border-gray-800/30">
                      <div>
                        <p className="text-[8px] text-gray-500 font-black uppercase">Vendor: {record.supplierId?.name}</p>
                        <p className="text-[8px] text-gray-500 font-bold">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-xs font-black text-emerald-500">₹{((record.quantity || 0) * (record.purchasePrice || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full text-left min-w-[800px]">
                  <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-900' : 'bg-slate-100'} text-[9px] font-black text-gray-500 tracking-widest border-b ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                    <tr>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Product Details</th>
                      <th className="px-6 py-4">Vendor</th>
                      <th className="px-6 py-4 text-center">Unit Price</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-right">Net Value</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-800/30' : 'divide-slate-100'} text-[10px]`}>
                    {filteredHistory.map((record) => (
                      <tr key={record._id} className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all group`}>
                        <td className="px-6 py-4">
                          <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{new Date(record.date).toLocaleDateString()}</p>
                          <p className="text-[8px] font-mono text-gray-500 mt-0.5 ">{record.invoiceNumber || 'DIR-ENTRY'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{record.productId?.name}</p>
                          <p className="text-[8px] text-gray-500 font-bold mt-0.5 uppercase tracking-tighter">HSN: {record.productId?.hsn || '---'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-slate-100 text-slate-600'} px-2 py-1 rounded text-[9px] font-black border ${darkMode ? 'border-gray-700' : 'border-slate-200'}`}>
                            {record.supplierId?.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-500">₹{record.purchasePrice}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded font-black">+{record.quantity}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-black text-emerald-500 text-xs">
                          ₹{((record.quantity || 0) * (record.purchasePrice || 0)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {suppliers.map(s => (
                <div key={s._id} className={`${cardBase} p-4 rounded-xl group hover:border-indigo-500/50 transition-all flex flex-col justify-between`}>
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center text-indigo-500 font-black text-sm border border-indigo-500/10 ">{s.name ? s.name[0] : 'V'}</div>
                      <ExternalLink className={`w-3 h-3 text-gray-500 group-hover:text-indigo-500 transition-all cursor-pointer`} />
                    </div>
                    <h4 className={`text-[11px] font-black truncate mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                    <div className={`flex items-center gap-2 pt-3 border-t ${darkMode ? 'border-gray-800/50' : 'border-slate-100'}`}>
                      <Phone className="w-3 h-3 text-gray-400" />
                      <span className="text-[9px] font-mono text-gray-500 font-bold">{s.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => setIsSupplierModalOpen(true)} 
              className="fixed bottom-[85px] right-6 md:bottom-10 md:right-10 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-all z-[100] group"
            >
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              <span className="absolute right-full mr-3 bg-gray-900 text-white text-[10px] font-black px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity hidden md:block">REGISTER VENDOR</span>
            </button>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
          <form onSubmit={handleQuickAddProduct} className={`relative w-full max-w-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} p-6 rounded-2xl border shadow-2xl animate-in zoom-in duration-200`}>
            <h3 className={`text-lg font-black tracking-tighter mb-4 flex justify-between items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              QUICK ITEM ENTRY <X className="w-5 h-5 cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setIsProductModalOpen(false)} />
            </h3>
            <div className="space-y-4">
              <input required placeholder="Product Label / Name" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} className={`w-full ${inputBase} p-3 rounded-xl outline-none text-xs`} />
              <div className="grid grid-cols-2 gap-3">
                <input type="number" required placeholder="Retail Rate (₹)" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} className={`w-full ${inputBase} p-3 rounded-xl outline-none text-xs`} />
                <input type="number" placeholder="Alert Level" value={productForm.reorderLevel} onChange={e => setProductForm({ ...productForm, reorderLevel: e.target.value })} className={`w-full ${inputBase} p-3 rounded-xl outline-none text-xs`} />
              </div>
              <div className="flex gap-2">
                <input placeholder="HSN / Barcode Data" value={productForm.hsn} onChange={e => setProductForm({ ...productForm, hsn: e.target.value })} className={`flex-1 ${inputBase} p-3 rounded-xl outline-none text-[10px] font-mono`} />
                <button type="button" onClick={() => setIsScannerModalOpen(true)} className={`p-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-100 border-slate-200'} rounded-xl border hover:bg-indigo-600 hover:text-white text-indigo-500 transition-all`}><ScanLine className="w-4 h-4" /></button>
              </div>
              <button className="w-full bg-indigo-600 py-3 rounded-xl text-[10px] font-black text-white tracking-widest hover:bg-indigo-500 transition-all shadow-xl uppercase">Register Product</button>
            </div>
          </form>
        </div>
      )}

      {(isProductPickerOpen || isSupplierPickerOpen) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
          <div className={`relative w-full max-w-md ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} rounded-2xl border max-h-[75vh] flex flex-col overflow-hidden animate-in zoom-in duration-200 shadow-2xl`}>
            <div className={`p-5 border-b ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black tracking-widest text-indigo-500 uppercase">{isProductPickerOpen ? 'Select Product' : 'Select Vendor'}</h3>
                <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-500" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input placeholder="Type to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${inputBase} p-3 pl-10 rounded-xl outline-none text-xs focus:border-indigo-500`} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
              {(isProductPickerOpen ? filteredProducts : filteredSuppliers).map(item => {
                const isLow = isProductPickerOpen && (item.quantity <= (item.reorderLevel || 5));
                return (
                  <button key={item._id} onClick={() => { setPurchaseForm({ ...purchaseForm, [isProductPickerOpen ? 'productId' : 'supplierId']: item._id }); setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} className={`w-full flex items-center justify-between p-3.5 hover:bg-indigo-600 rounded-xl transition-all group border border-transparent`}>
                    <div className="text-left">
                      <p className={`text-xs font-bold truncate ${darkMode ? 'text-gray-200 group-hover:text-white' : 'text-slate-700 group-hover:text-white'}`}>{item.name}</p>
                      {isProductPickerOpen && <p className={`text-[8px] font-black mt-0.5 ${isLow ? 'text-red-500 group-hover:text-white' : 'text-gray-500 group-hover:text-indigo-100'}`}>Stock: {item.quantity}</p>}
                    </div>
                    {((isProductPickerOpen ? purchaseForm.productId : purchaseForm.supplierId) === item._id) && <Check className="w-4 h-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsSupplierModalOpen(false)} />
          <form onSubmit={handleAddSupplier} className={`relative w-full max-w-sm ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} p-6 rounded-2xl border shadow-2xl animate-in zoom-in duration-300`}>
            <h3 className={`text-lg font-black tracking-tighter mb-4 flex justify-between items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              NEW VENDOR ENTRY <X className="w-5 h-5 cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setIsSupplierModalOpen(false)} />
            </h3>
            <div className="space-y-4">
              <input required placeholder="Business / Vendor Name" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className={`w-full ${inputBase} p-3 rounded-xl outline-none text-xs`} />
              <input required type="tel" placeholder="Phone Number" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className={`w-full ${inputBase} p-3 rounded-xl outline-none text-xs`} />
              <input placeholder="Tax ID / GSTIN (Optional)" value={supplierForm.gstin} onChange={e => setSupplierForm({ ...supplierForm, gstin: e.target.value })} className={`w-full ${inputBase} p-3 rounded-xl outline-none text-[10px] font-mono text-indigo-500 uppercase`} />
              <button className={`w-full mt-2 ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'} py-3 rounded-xl font-black text-[10px] tracking-widest transition-all shadow-xl uppercase`}>Save Vendor</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative z-[150]">
        <ScannerModal isOpen={isScannerModalOpen} onClose={() => setIsScannerModalOpen(false)} onScanSuccess={handleScanSuccess} inventory={inventory} darkMode={darkMode} />
      </div>

      <style jsx global>{`
        /* Prevent mobile auto-zoom on input focus */
        input, select, textarea {
          font-size: 16px !important;
          touch-action: manipulation;
        }
        @media (min-width: 768px) {
          input, select, textarea {
            font-size: inherit !important;
          }
        }
        /* Mobile specific font overrides for design consistency */
        input.text-xs, input.text-[10px] {
          font-size: 16px !important;
        }

        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
        
        /* Fixed date picker visual for mobile */
        input[type="date"] {
           position: relative;
        }
        input[type="date"]::-webkit-calendar-picker-indicator { 
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
          filter: ${darkMode ? 'invert(1)' : 'none'}; 
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default SupplyChainManagement;