import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Truck, Plus, History, Users, PackageCheck, IndianRupee, AlertTriangle,
  ArrowRight, Loader, X, Search, ChevronDown, Check, Phone, Mail, ScanLine, Package,
  Calculator, Calendar, Store, Info, Hash, ExternalLink, RefreshCcw, Bell
} from 'lucide-react';
import ScannerModal from './ScannerModal';
import { validateName, validatePhoneNumber, validateEmail, validateGSTIN, validatePrice, validateQuantity } from '../utils/validation';

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

  // Theme Variables - Matching other pages
  const themeBase = darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';
  const dateTextColor = darkMode ? 'text-white' : 'text-slate-900';
  const headerBg = darkMode ? 'bg-slate-950/80' : 'bg-white/80';

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
  const [supplierErrors, setSupplierErrors] = useState({});
  const [productErrors, setProductErrors] = useState({});

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
    
    // Validate supplier form
    const errors = {};
    const nameError = validateName(supplierForm.name, 'Vendor name');
    if (nameError) errors.name = nameError;
    
    const phoneError = validatePhoneNumber(supplierForm.phone);
    if (phoneError) errors.phone = phoneError;
    
    // Email is optional, but if provided, validate it
    if (supplierForm.email && supplierForm.email.trim()) {
      const emailError = validateEmail(supplierForm.email);
      if (emailError) errors.email = emailError;
    }
    
    // GSTIN is optional, but if provided, validate it
    if (supplierForm.gstin && supplierForm.gstin.trim()) {
      const gstinError = validateGSTIN(supplierForm.gstin);
      if (gstinError) errors.gstin = gstinError;
    }
    
    setSupplierErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast("Please fix validation errors", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      await apiClient.post(API.scmSuppliers, supplierForm);
      showToast("Vendor added", "success");
      setSupplierForm({ name: '', phone: '', email: '', gstin: '' });
      setSupplierErrors({});
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
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] backdrop-blur-xl border-b px-4 md:px-8 py-4 transition-colors ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Supply <span className="text-indigo-500">Chain</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-black tracking-[0.2em]">
              Efficient Supply Management
            </p>
          </div>

          <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} flex p-1.5 rounded-2xl border shadow-inner`}>
            {[
              { id: 'purchase', label: 'ADD STOCK', icon: PackageCheck },
              { id: 'history', label: 'LOGS', icon: History },
              { id: 'suppliers', label: 'VENDORS', icon: Store }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600')}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {activeTab === 'purchase' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              <form onSubmit={handlePurchaseSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black text-indigo-500 tracking-[0.2em] ">Arrival Entry</span>
                  <button type="button" onClick={() => setIsScannerModalOpen(true)} className="flex items-center gap-2.5 px-4 py-2 bg-indigo-600/10 text-indigo-500 rounded-xl border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all">
                    <ScanLine className="w-4 h-4" />
                    <span className="text-[10px] font-black tracking-widest ">Scan Code</span>
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Select Product</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsProductPickerOpen(true); setSearchTerm(''); }} className={`flex-1 ${inputBase} px-4 py-4 rounded-2xl flex items-center justify-between text-left border focus:border-indigo-500 transition-all`}>
                          <span className={`text-sm font-black truncate ${selectedProduct ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{selectedProduct ? selectedProduct.name : 'Choose Item...'}</span>
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        </button>
                        <button type="button" onClick={() => setIsProductModalOpen(true)} className="bg-indigo-600 p-4 rounded-2xl hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Select Vendor</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsSupplierPickerOpen(true); setSearchTerm(''); }} className={`flex-1 ${inputBase} px-4 py-4 rounded-2xl flex items-center justify-between text-left border focus:border-indigo-500 transition-all`}>
                          <span className={`text-sm font-black truncate ${selectedSupplier ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{selectedSupplier ? selectedSupplier.name : 'Choose Vendor...'}</span>
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        </button>
                        <button type="button" onClick={() => setIsSupplierModalOpen(true)} className={`p-4 rounded-2xl hover:text-indigo-400 border transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}><Plus className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Arrival Qty</label>
                      <input type="number" required min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} className={`w-full ${inputBase} px-4 py-4 rounded-2xl outline-none text-[16px] md:text-sm font-black border focus:border-indigo-500`} placeholder="0" />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Cost Per Unit</label>
                      <input type="number" required step="0.01" value={purchaseForm.purchasePrice} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })} className={`w-full ${inputBase} px-4 py-4 rounded-2xl outline-none text-[16px] md:text-sm font-black border focus:border-indigo-500`} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Invoice Number</label>
                      <input type="text" value={purchaseForm.invoiceNumber} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })} className={`w-full ${inputBase} px-4 py-4 rounded-2xl outline-none text-[16px] md:text-sm font-mono border focus:border-indigo-500`} placeholder="Optional" />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Arrival Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10 pointer-events-none" />
                        <input 
                          type="date" 
                          value={purchaseForm.date} 
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} 
                          className={`w-full ${inputBase} ${dateTextColor} pl-10 pr-4 py-4 rounded-2xl outline-none text-[16px] md:text-sm font-black border focus:border-indigo-500 appearance-none`}
                          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 space-y-4">
                  <div className="flex justify-between items-center p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                    <span className="text-[11px] font-black text-indigo-500 tracking-widest ">ENTRY TOTAL</span>
                    <span className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{(Number(purchaseForm.quantity || 0) * Number(purchaseForm.purchasePrice || 0)).toLocaleString()}</span>
                  </div>
                  <button disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[11px] tracking-[0.25em] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 ">
                    {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <>Post stock entry <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </form>

              <div className={`hidden lg:flex ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} rounded-3xl overflow-hidden flex-col`}>
                <div className={`p-6 border-b ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'} space-y-4`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`text-[11px] font-black tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'} `}>Live Stock Overview</h3>
                    <div className="flex items-center gap-2">
                      <select value={inventorySort} onChange={(e) => setInventorySort(e.target.value)} className={`${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'} text-[10px] font-black text-indigo-500 px-3 py-1.5 rounded-xl border outline-none cursor-pointer`}>
                        <option value="low-stock">SORT: LOW STOCK</option>
                        <option value="a-z">SORT: A-Z</option>
                      </select>
                      <button onClick={fetchSCMData} className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all"><RefreshCcw className="w-5 h-5 text-indigo-500" /></button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input placeholder="Search items..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className={`w-full ${inputBase} py-3.5 pl-11 pr-4 rounded-2xl text-[11px] font-bold border outline-none focus:border-indigo-500 transition-all`} />
                  </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {sortedInventory.map(item => {
                    const isLow = item.quantity <= (item.reorderLevel || 5);
                    const isSelected = purchaseForm.productId === item._id;
                    return (
                      <button key={item._id} onClick={() => setPurchaseForm(prev => ({ ...prev, productId: item._id }))} className={`p-5 rounded-2xl border text-left transition-all relative group hover:scale-[1.02] active:scale-95 ${isSelected ? 'bg-indigo-600 border-indigo-500 shadow-lg' : isLow ? 'bg-red-500/5 border-red-500/20' : (darkMode ? 'bg-slate-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200')}`}>
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <p className={`text-[11px] font-black truncate ${isSelected ? 'text-white' : (darkMode ? 'text-slate-300' : 'text-slate-700')}`}>{item.name}</p>
                          {isLow && <AlertTriangle className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-red-500'} shrink-0`} />}
                        </div>
                        <div className="flex justify-between items-end mb-4">
                          <p className={`text-2xl font-black tracking-tighter ${isSelected ? 'text-white' : isLow ? 'text-red-500' : 'text-emerald-500'}`}>{item.quantity}</p>
                          <div className="text-right">
                            <p className={`text-[9px] font-black ${isSelected ? 'text-indigo-100' : 'text-slate-500'} `}>Rate: ₹{item.price}</p>
                          </div>
                        </div>
                        <div className={`flex items-center gap-2 pt-3 border-t ${isSelected ? 'border-white/20' : darkMode ? 'border-slate-800/50' : 'border-slate-200'}`}>
                          <Bell className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : isLow ? 'text-red-500 animate-pulse' : 'text-slate-400'}`} />
                          <span className={`text-[9px] font-black tracking-tight ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>MIN ALERT: {item.reorderLevel || 5}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="flex flex-col animate-in fade-in duration-500 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
              {[
                { label: 'Logged Units', val: historyTotals.totalQty, icon: Package },
                { label: 'Outlay Total', val: `₹${historyTotals.totalValue.toLocaleString()}`, icon: IndianRupee },
                { label: 'Cycles', val: filteredHistory.length, icon: RefreshCcw },
                { label: 'Avg Cost', val: `₹${(historyTotals.totalValue / (filteredHistory.length || 1)).toFixed(0)}`, icon: Calculator }
              ].map((stat, i) => (
                <div key={i} className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} border p-5 rounded-2xl flex flex-col items-center text-center shadow-sm`}>
                  <div className={`p-2.5 ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'} rounded-xl mb-3 border`}><stat.icon className="w-5 h-5 text-indigo-500" /></div>
                  <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-1.5 ">{stat.label}</p>
                  <p className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className={`${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} rounded-3xl flex flex-col overflow-hidden min-h-0`}>
              <div className={`p-6 ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'} border-b flex flex-col md:flex-row justify-between items-center px-8 gap-5 shrink-0`}>
                <div className="flex gap-3 overflow-x-auto no-scrollbar max-w-full">
                  {DATE_FILTERS.map(f => (
                    <button key={f.id} onClick={() => setSelectedFilter(f.id)} className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap border ${selectedFilter === f.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : (darkMode ? 'text-slate-400 border-transparent hover:bg-indigo-500/10' : 'text-slate-500 border-transparent hover:bg-indigo-500/10')}`}>{f.label[0]} {f.label[1]}</button>
                  ))}
                </div>
                {selectedFilter === 'custom' && (
                  <div className="flex items-center gap-3 overflow-x-hidden w-full md:w-auto mt-2 md:mt-0">
                    <div className="relative flex-1 md:w-44">
                       <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10 pointer-events-none" />
                       <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className={`w-full ${inputBase} ${dateTextColor} text-[16px] md:text-xs font-black p-3 pl-10 rounded-xl outline-none border border-transparent focus:border-indigo-500 transition-colors`} style={{ colorScheme: darkMode ? 'dark' : 'light' }} />
                    </div>
                    <div className="relative flex-1 md:w-44">
                       <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10 pointer-events-none" />
                       <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className={`w-full ${inputBase} ${dateTextColor} text-[16px] md:text-xs font-black p-3 pl-10 rounded-xl outline-none border border-transparent focus:border-indigo-500 transition-colors`} style={{ colorScheme: darkMode ? 'dark' : 'light' }} />
                    </div>
                  </div>
                )}
              </div>

              <div className="md:hidden p-6 space-y-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <p className="text-center text-[11px] text-slate-500 font-black py-12 tracking-widest ">No records found</p>
                ) : filteredHistory.map(record => (
                  <div key={record._id} className={`${cardBase} p-5 rounded-2xl border-l-4 border-l-indigo-500`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{record.productId?.name}</p>
                        <p className="text-[10px] font-mono font-bold text-slate-500 mt-1 ">{record.invoiceNumber || 'DIR-ENTRY'}</p>
                      </div>
                      <div className="text-right">
                         <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black">+{record.quantity}</span>
                         <p className="text-[10px] font-black text-slate-500 mt-1.5">@ ₹{record.purchasePrice}</p>
                      </div>
                    </div>
                    <div className={`flex justify-between items-end pt-3 border-t ${darkMode ? 'border-slate-800/20' : 'border-slate-200'}`}>
                      <div>
                        <p className="text-[10px] text-slate-500 font-black  tracking-tight">VNDR: {record.supplierId?.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-black text-emerald-500">₹{((record.quantity || 0) * (record.purchasePrice || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-auto custom-scrollbar flex-1 min-h-0">
                <table className="w-full text-left min-w-[900px]">
                  <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-slate-900' : 'bg-slate-100'} text-[10px] font-black text-slate-500 tracking-[0.2em] border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'} `}>
                    <tr>
                      <th className="px-8 py-5">Date / Invoice</th>
                      <th className="px-8 py-5">Product Identity</th>
                      <th className="px-8 py-5">Vendor</th>
                      <th className="px-8 py-5 text-center">Unit Cost</th>
                      <th className="px-8 py-5 text-center">Qty</th>
                      <th className="px-8 py-5 text-right">Net Valuation</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-slate-800/30' : 'divide-slate-100'} text-xs`}>
                    {filteredHistory.map((record) => (
                      <tr key={record._id} className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all group`}>
                        <td className="px-8 py-5">
                          <p className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{new Date(record.date).toLocaleDateString()}</p>
                          <p className="text-[10px] font-mono text-slate-500 mt-1 ">{record.invoiceNumber || 'DIR-ENTRY'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <p className={`font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>{record.productId?.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold mt-1  tracking-tighter">HSN: {record.productId?.hsn || '---'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-indigo-50 text-indigo-600'} px-3 py-1.5 rounded-xl text-[10px] font-black border ${darkMode ? 'border-slate-700' : 'border-indigo-100'}`}>
                            {record.supplierId?.name}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-center font-black text-slate-500">₹{record.purchasePrice}</td>
                        <td className="px-8 py-5 text-center">
                          <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px]">+{record.quantity}</span>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-emerald-500 text-sm">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
              {suppliers.map(s => (
                <div key={s._id} className={`${cardBase} p-6 rounded-2xl group hover:border-indigo-500/50 transition-all flex flex-col justify-between border shadow-sm`}>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/20">{s.name ? s.name[0] : 'V'}</div>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-all cursor-pointer" />
                    </div>
                    <h4 className={`text-sm font-black truncate mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                    <div className={`flex items-center gap-3 pt-4 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                      <Phone className="w-4 h-4 text-indigo-500" />
                      <span className="text-[11px] font-mono text-slate-500 font-black">{s.phone || 'N/A'}</span>
                    </div>
                    {s.gstin && (
                       <div className="flex items-center gap-3 mt-2">
                        <Hash className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-mono text-emerald-600 font-black ">{s.gstin}</span>
                       </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </main>

      {/* FOOTER: Add New Vendor Button - Above Footer Menu */}
      {activeTab === 'suppliers' && (
        <div className={`fixed bottom-[72px] md:hidden inset-x-0 z-[40] px-4 py-3 border-t ${darkMode ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.1)]`}>
          <button 
            onClick={() => setIsSupplierModalOpen(true)} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-black tracking-widest uppercase">Add New Vendor</span>
          </button>
        </div>
      )}

      {/* DESKTOP: Add New Vendor Button - Fixed Position */}
      {activeTab === 'suppliers' && (
        <button 
          onClick={() => setIsSupplierModalOpen(true)} 
          className="hidden md:flex fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-2xl items-center justify-center active:scale-90 transition-all z-[100] group"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-300" />
          <span className="absolute right-full mr-4 bg-slate-900 text-white text-[11px] font-black px-4 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity tracking-widest uppercase">Register Vendor</span>
        </button>
      )}

      {/* --- MODALS --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
          <form onSubmit={handleQuickAddProduct} className={`relative w-full max-w-lg ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden`}>
            {/* Header */}
            <div className={`p-6 border-b ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50'} flex justify-between items-center`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10">
                  <Package className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Quick Add Product
                  </h3>
                  <p className={`text-[10px] font-bold tracking-wider mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Add product while creating purchase entry
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-6 space-y-5">
              {/* Product Name */}
              <div className="space-y-2">
                <label className={`text-xs font-bold tracking-wide flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <span>Product Name</span>
                  <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  placeholder="Enter product name"
                  value={productForm.name}
                  onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                  className={`w-full ${inputBase} p-4 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
                />
              </div>

              {/* Price and Alert Level */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={`text-xs font-bold tracking-wide flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span>Price per Unit</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={productForm.price}
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                      className={`w-full pl-8 pr-4 ${inputBase} p-4 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className={`text-xs font-bold tracking-wide ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Low Stock Alert
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5"
                    value={productForm.reorderLevel}
                    onChange={e => setProductForm({ ...productForm, reorderLevel: e.target.value })}
                    className={`w-full ${inputBase} p-4 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
                  />
                </div>
              </div>

              {/* HSN / Barcode */}
              <div className="space-y-2">
                <label className={`text-xs font-bold tracking-wide flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <Hash className="w-3.5 h-3.5" />
                  <span>HSN Code / Barcode</span>
                </label>
                <div className="flex gap-2">
                  <input
                    placeholder="Optional - Enter HSN or scan barcode"
                    value={productForm.hsn}
                    onChange={e => setProductForm({ ...productForm, hsn: e.target.value })}
                    className={`flex-1 ${inputBase} p-4 rounded-xl text-[16px] md:text-xs font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(true)}
                    className={`p-4 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} rounded-xl border hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-500 transition-all`}
                    title="Scan Barcode"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className={`p-6 border-t ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'} flex gap-3`}>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold transition-all ${
                  darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg"
              >
                Add Product
              </button>
            </div>
          </form>
        </div>
      )}

      {(isProductPickerOpen || isSupplierPickerOpen) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
          <div className={`relative w-full max-w-md ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-3xl border max-h-[75vh] flex flex-col overflow-hidden animate-in zoom-in duration-200 shadow-2xl`}>
            <div className={`p-6 border-b ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[11px] font-black tracking-[0.25em] text-indigo-500 ">{isProductPickerOpen ? 'Select Product' : 'Select Vendor'}</h3>
                <X className="w-6 h-6 text-slate-500 cursor-pointer hover:text-red-500" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="Type to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${inputBase} p-4 pl-12 rounded-2xl outline-none text-[16px] md:text-sm font-black border focus:border-indigo-500`} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {(isProductPickerOpen ? filteredProducts : filteredSuppliers).map(item => {
                const isLow = isProductPickerOpen && (item.quantity <= (item.reorderLevel || 5));
                const isSelected = (isProductPickerOpen ? purchaseForm.productId : purchaseForm.supplierId) === item._id;
                return (
                  <button key={item._id} onClick={() => { setPurchaseForm({ ...purchaseForm, [isProductPickerOpen ? 'productId' : 'supplierId']: item._id }); setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'hover:bg-indigo-500/10 border-transparent'}`}>
                    <div className="text-left">
                      <p className={`text-sm font-black truncate ${isSelected ? 'text-white' : (darkMode ? 'text-slate-200' : 'text-slate-700')}`}>{item.name}</p>
                      {isProductPickerOpen && <p className={`text-[10px] font-black mt-1  ${isSelected ? 'text-indigo-100' : isLow ? 'text-red-500' : 'text-slate-500'}`}>Stock: {item.quantity} Units</p>}
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-white" />}
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
          <form onSubmit={handleAddSupplier} className={`relative w-full max-w-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} p-8 rounded-3xl border shadow-2xl animate-in zoom-in duration-300`}>
            <h3 className={`text-xl font-black tracking-tighter mb-6 flex justify-between items-center ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              NEW VENDOR ENTRY <X className="w-6 h-6 cursor-pointer text-slate-500 hover:text-red-500" onClick={() => setIsSupplierModalOpen(false)} />
            </h3>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1 ">Full Name</label>
                <input required placeholder="Business / Vendor Name" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} className={`w-full ${inputBase} p-4 rounded-2xl outline-none text-[16px] md:text-sm font-black border`} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1 ">Contact No</label>
                <input required type="tel" placeholder="Phone Number" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} className={`w-full ${inputBase} p-4 rounded-2xl outline-none text-[16px] md:text-sm font-black border`} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1 ">Identification (GSTIN)</label>
                <input placeholder="Optional ID" value={supplierForm.gstin} onChange={e => setSupplierForm({ ...supplierForm, gstin: e.target.value })} className={`w-full ${inputBase} p-4 rounded-2xl outline-none text-[16px] md:text-xs font-mono text-indigo-500 border `} />
              </div>
              <button className={`w-full mt-3 py-4 rounded-2xl font-black text-[11px] tracking-[0.2em] transition-all shadow-xl  ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>Save Vendor</button>
            </div>
          </form>
        </div>
      )}

      <div className="relative z-[150]">
        <ScannerModal 
            isOpen={isScannerModalOpen} 
            onClose={() => setIsScannerModalOpen(false)} 
            onScanSuccess={handleScanSuccess}
            onScanNotFound={(code) => {
                console.warn('Scanned item not found:', code);
            }}
            onScanError={(error) => {
                console.error('Scanner error:', error);
                setIsScannerModalOpen(false);
            }}
            inventory={inventory} 
            darkMode={darkMode} 
        />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        input, select, textarea {
          font-size: 16px !important;
          touch-action: manipulation;
        }
        @media (min-width: 768px) {
          input, select, textarea {
            font-size: inherit !important;
          }
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
      `}} />
    </div>
  );
};

export default SupplyChainManagement;