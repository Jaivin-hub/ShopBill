import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Truck, Plus, History, Users, PackageCheck, IndianRupee, AlertTriangle,
  ArrowRight, Loader, X, Search, ChevronDown, Check, Phone, Mail, ScanLine, Package,
  Calculator, Calendar, Store, Info, Hash, ExternalLink, RefreshCcw, Bell, Edit, Download, Settings2, Trash2
} from 'lucide-react';
import ScannerModal from './ScannerModal';
import { validateName, validatePhoneNumber, validateEmail, validateGSTIN, validatePrice, validateQuantity } from '../utils/validation';
import { exportRowsToExcel } from '../utils/exportExcel';

const DATE_FILTERS = [
  { id: '24h', label: ['24', 'Hrs'], days: 1 },
  { id: '7d', label: ['7', 'Days'], days: 7 },
  { id: '30d', label: ['30', 'Days'], days: 30 },
  { id: 'all', label: ['All', 'Time'], days: Infinity },
  { id: 'custom', label: ['Custom', 'Range'], days: 0 },
];

const EMPTY_PRODUCT_FORM = {
  name: '',
  price: '',
  quantity: 0,
  reorderLevel: 5,
  hsn: '',
  variants: []
};

const SupplyChainManagement = ({ apiClient, API, showToast, darkMode }) => {
  const [activeTab, setActiveTab] = useState('purchase');
  const [isLoading, setIsLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Theme Variables - Matching other pages
  const themeBase = darkMode ? 'bg-gray-950 text-slate-200' : 'bg-slate-50 text-slate-900';
  const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
  const inputBase = darkMode ? 'bg-gray-950 border-slate-800 text-white' : 'bg-slate-100 border-slate-200 text-slate-900';
  const dateTextColor = darkMode ? 'text-white' : 'text-slate-900';
  const headerBg = darkMode ? 'bg-gray-950/80' : 'bg-white/80';

  const [inventorySort, setInventorySort] = useState('low-stock');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [historyProductFilter, setHistoryProductFilter] = useState('all');
  const [historySupplierFilter, setHistorySupplierFilter] = useState('all');
  const [isProductPickerOpen, setIsProductPickerOpen] = useState(false);
  const [isSupplierPickerOpen, setIsSupplierPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState(null);

  const [purchaseForm, setPurchaseForm] = useState({
    productId: '', supplierId: '', quantity: '', purchasePrice: '',
    invoiceNumber: '', date: new Date().toISOString().split('T')[0]
  });

  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', email: '', gstin: '' });
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT_FORM);
  const [hasProductVariants, setHasProductVariants] = useState(false);
  const [editingProductVariantIndex, setEditingProductVariantIndex] = useState(null);
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

  // Only fetch on mount, not when callback changes
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchSCMData();
    }
  }, []);

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

  const dateScopedHistory = useMemo(() => {
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

  const historyProductOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    dateScopedHistory.forEach((item) => {
      const productId = item.productId?._id || item.productId || item.itemId || item.productName;
      const productName = item.productId?.name || item.productName || 'Unknown Product';
      const key = String(productId || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push({ id: key, name: productName });
    });
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [dateScopedHistory]);

  const historySupplierOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    dateScopedHistory.forEach((item) => {
      const supplierId = item.supplierId?._id || item.supplierId || item.supplierName;
      const supplierName = item.supplierId?.name || item.supplierName || 'Unknown Supplier';
      const key = String(supplierId || '').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      options.push({ id: key, name: supplierName });
    });
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [dateScopedHistory]);

  const filteredHistory = useMemo(() => {
    return dateScopedHistory.filter((item) => {
      const productId = String(item.productId?._id || item.productId || item.itemId || item.productName || '');
      const supplierId = String(item.supplierId?._id || item.supplierId || item.supplierName || '');
      const productMatch = historyProductFilter === 'all' || productId === historyProductFilter;
      const supplierMatch = historySupplierFilter === 'all' || supplierId === historySupplierFilter;
      return productMatch && supplierMatch;
    });
  }, [dateScopedHistory, historyProductFilter, historySupplierFilter]);

  const historyTotals = useMemo(() => {
    return filteredHistory.reduce((acc, curr) => {
      const qty = Number(curr.quantity) || 0;
      const price = Number(curr.purchasePrice || curr.price) || 0;
      return { totalQty: acc.totalQty + qty, totalValue: acc.totalValue + (qty * price) };
    }, { totalQty: 0, totalValue: 0 });
  }, [filteredHistory]);

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.productId || !purchaseForm.supplierId) return showToast("Select product & supplier", "info");
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

    const normalizedSupplier = {
      name: String(supplierForm.name || '').replace(/\s+/g, ' ').trim(),
      phone: String(supplierForm.phone || '').replace(/\D/g, ''),
      email: String(supplierForm.email || '').trim().toLowerCase(),
      gstin: String(supplierForm.gstin || '').replace(/\s+/g, '').toUpperCase()
    };
    
    // Validate supplier form
    const errors = {};
    const nameError = validateName(normalizedSupplier.name, 'Supplier name');
    if (nameError) errors.name = nameError;
    
    const phoneError = validatePhoneNumber(normalizedSupplier.phone);
    if (phoneError) errors.phone = phoneError;
    
    // Email is optional, but if provided, validate it
    if (normalizedSupplier.email) {
      const emailError = validateEmail(normalizedSupplier.email);
      if (emailError) errors.email = emailError;
    }
    
    // GSTIN is optional, but if provided, validate it
    if (normalizedSupplier.gstin) {
      const gstinError = validateGSTIN(normalizedSupplier.gstin);
      if (gstinError) errors.gstin = gstinError;
    }
    
    setSupplierErrors(errors);
    
    if (Object.keys(errors).length > 0) {
      showToast("Please fix validation errors", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      if (editingSupplierId) {
        // Update existing supplier
        const updated = await apiClient.put(API.scmSupplierUpdate(editingSupplierId), normalizedSupplier);
        showToast("Supplier updated", "success");
        const updatedId = updated?.data?._id || updated?.data?.id || editingSupplierId;
        if (updatedId) {
          setPurchaseForm(prev => ({ ...prev, supplierId: String(updatedId) }));
        }
      } else {
        // Create new supplier
        const created = await apiClient.post(API.scmSuppliers, normalizedSupplier);
        showToast("Supplier added", "success");
        const createdId = created?.data?._id || created?.data?.id;
        if (createdId) {
          setPurchaseForm(prev => ({ ...prev, supplierId: String(createdId) }));
        }
      }
      setSupplierForm({ name: '', phone: '', email: '', gstin: '' });
      setSupplierErrors({});
      setEditingSupplierId(null);
      setIsSupplierModalOpen(false);
      setIsSupplierPickerOpen(false);
      setSearchTerm('');
      fetchSCMData();
    } catch (error) { 
      showToast(editingSupplierId ? "Error updating supplier" : "Error adding supplier", "error");
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleEditSupplier = (supplier) => {
    setSupplierForm({
      name: supplier.name || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      gstin: supplier.gstin || ''
    });
    setEditingSupplierId(supplier._id);
    setSupplierErrors({});
    setIsSupplierModalOpen(true);
  };

  const handleCloseSupplierModal = () => {
    setIsSupplierModalOpen(false);
    setSupplierForm({ name: '', phone: '', email: '', gstin: '' });
    setSupplierErrors({});
    setEditingSupplierId(null);
  };

  const handleQuickAddProduct = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { ...productForm };
      if (hasProductVariants && Array.isArray(payload.variants) && payload.variants.length > 0) {
        payload.variants = payload.variants.map((v) => ({
          label: String(v.label || '').trim(),
          price: Number(v.price || 0),
          quantity: Number(v.quantity || 0),
          reorderLevel: v.reorderLevel === '' || v.reorderLevel == null ? null : Number(v.reorderLevel),
          hsn: String(v.hsn || '').trim()
        })).filter((v) => v.label && Number.isFinite(v.price));
        payload.price = null;
        payload.quantity = null;
      } else {
        payload.price = Number(payload.price || 0);
        payload.quantity = Number(payload.quantity || 0);
        payload.variants = [];
      }
      const res = await apiClient.post(API.inventory, payload);
      showToast("Product saved", "success");
      const createdId = res?.data?._id || res?.data?.id || res?.data?.item?._id || res?.data?.item?.id;
      if (createdId) {
        setPurchaseForm(prev => ({ ...prev, productId: String(createdId) }));
      }
      setProductForm(EMPTY_PRODUCT_FORM);
      setHasProductVariants(false);
      setEditingProductVariantIndex(null);
      setIsProductModalOpen(false);
      setIsProductPickerOpen(false);
      setSearchTerm('');
      fetchSCMData();
    } catch (error) { showToast("Error adding product", "error"); } finally { setIsLoading(false); }
  };

  const addQuickVariant = () => {
    const newVariant = {
      _id: `scm-var-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: '',
      price: '',
      quantity: 0,
      reorderLevel: productForm.reorderLevel || 5,
      hsn: productForm.hsn || ''
    };
    const currentCount = (productForm.variants || []).length;
    setProductForm((prev) => ({ ...prev, variants: [...(prev.variants || []), newVariant] }));
    setEditingProductVariantIndex(currentCount);
  };

  const updateQuickVariant = (index, field, value) => {
    setProductForm((prev) => {
      const variants = [...(prev.variants || [])];
      variants[index] = { ...variants[index], [field]: value };
      return { ...prev, variants };
    });
  };

  const removeQuickVariant = (index) => {
    setProductForm((prev) => ({ ...prev, variants: (prev.variants || []).filter((_, i) => i !== index) }));
    if (editingProductVariantIndex === index) setEditingProductVariantIndex(null);
    else if (editingProductVariantIndex !== null && index < editingProductVariantIndex) setEditingProductVariantIndex(editingProductVariantIndex - 1);
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

  const handleDownloadReport = useCallback(() => {
    const rows = [];
    if (activeTab === 'history') {
      rows.push(['Date', 'Product', 'Supplier', 'Quantity', 'Purchase Price', 'Invoice']);
      filteredHistory.forEach((entry) => {
        rows.push([
          new Date(entry.date || entry.createdAt || '').toLocaleDateString('en-IN'),
          entry.productId?.name || entry.productName || '',
          entry.supplierId?.name || entry.supplierName || '',
          entry.quantity || 0,
          entry.purchasePrice || entry.price || 0,
          entry.invoiceNumber || ''
        ]);
      });
    } else if (activeTab === 'suppliers') {
      rows.push(['Supplier', 'Phone', 'Email', 'GSTIN']);
      suppliers.forEach((s) => {
        rows.push([s.name || '', s.phone || '', s.email || '', s.gstin || '']);
      });
    } else {
      rows.push(['Product', 'HSN', 'Quantity', 'Reorder Level', 'Status']);
      sortedInventory.forEach((item) => {
        const qty = Number(item.quantity || 0);
        const reorder = Number(item.reorderLevel || 5);
        rows.push([
          item.name || '',
          item.hsn || '',
          qty,
          reorder,
          qty <= reorder ? 'Low Stock' : 'Healthy'
        ]);
      });
    }
    exportRowsToExcel(rows, `supply-chain-${activeTab}-${new Date().toISOString().slice(0, 10)}.xlsx`, 'SupplyChain');
    showToast('Supply Chain report downloaded as Excel.', 'success');
  }, [activeTab, filteredHistory, showToast, sortedInventory, suppliers]);

  return (
    <div className={`h-full flex flex-col min-h-0 transition-colors duration-300 ${themeBase}`}>
      <header className={`sticky top-0 z-[100] shrink-0 backdrop-blur-xl border-b px-4 md:px-8 py-4 transition-colors ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'} ${darkMode ? 'bg-gray-950/95' : 'bg-slate-50/95'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              Supply <span className="text-indigo-500">Chain</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-black tracking-[0.2em]">
              Efficient Supply Management
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'history' && (
              <button
                onClick={handleDownloadReport}
                className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm'}`}
                title="Download Supply Chain Report"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span className="hidden md:inline text-[10px] font-black tracking-[0.18em]">
                    DOWNLOAD REPORT
                  </span>
                </span>
              </button>
            )}
            <div className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} flex p-1 rounded-xl border shadow-inner`}>
            {[
              { id: 'purchase', label: 'ADD STOCK', icon: PackageCheck },
              { id: 'history', label: 'LOGS', icon: History },
              { id: 'suppliers', label: 'SUPPLIERS', icon: Store }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : (darkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-500 hover:text-slate-600')}`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar px-4 md:px-8 py-6">
        <div className="max-w-7xl mx-auto space-y-8 pb-12">
        {activeTab === 'purchase' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              <form onSubmit={handlePurchaseSubmit}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-black text-indigo-500 tracking-[0.2em] ">Arrival Entry</span>
                  <button type="button" onClick={() => setIsScannerModalOpen(true)} className="flex items-center gap-2.5 px-3.5 py-2 bg-indigo-600/10 text-indigo-500 rounded-lg border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all">
                    <ScanLine className="w-4 h-4" />
                    <span className="text-[10px] font-black tracking-widest ">Scan Code</span>
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Select Product</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsProductPickerOpen(true); setSearchTerm(''); }} className={`flex-1 ${inputBase} px-4 py-3 rounded-xl flex items-center justify-between text-left border focus:border-indigo-500 transition-all`}>
                          <span className={`text-xs font-black truncate ${selectedProduct ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{selectedProduct ? selectedProduct.name : 'Choose Item...'}</span>
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        </button>
                        <button type="button" onClick={() => setIsProductModalOpen(true)} className="bg-indigo-600 p-3 rounded-xl hover:bg-indigo-500 text-white shadow-lg active:scale-95 transition-all"><Plus className="w-5 h-5" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Select Supplier</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setIsSupplierPickerOpen(true); setSearchTerm(''); }} className={`flex-1 ${inputBase} px-4 py-3 rounded-xl flex items-center justify-between text-left border focus:border-indigo-500 transition-all`}>
                          <span className={`text-xs font-black truncate ${selectedSupplier ? (darkMode ? 'text-white' : 'text-slate-900') : 'text-slate-500'}`}>{selectedSupplier ? selectedSupplier.name : 'Choose Supplier...'}</span>
                          <ChevronDown className="w-5 h-5 text-slate-500" />
                        </button>
                        <button type="button" onClick={() => setIsSupplierModalOpen(true)} className={`p-3 rounded-xl hover:text-indigo-400 border transition-all ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}><Plus className="w-5 h-5" /></button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Arrival Qty</label>
                      <input type="number" required min="1" value={purchaseForm.quantity} onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} className={`w-full ${inputBase} px-4 py-3 rounded-xl outline-none text-sm font-black border focus:border-indigo-500`} placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Cost Per Unit</label>
                      <input type="number" required step="0.01" value={purchaseForm.purchasePrice} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasePrice: e.target.value })} className={`w-full ${inputBase} px-4 py-3 rounded-xl outline-none text-sm font-black border focus:border-indigo-500`} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Invoice Number</label>
                      <input type="text" value={purchaseForm.invoiceNumber} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })} className={`w-full ${inputBase} px-4 py-3 rounded-xl outline-none text-sm font-mono border focus:border-indigo-500`} placeholder="Optional" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 tracking-[0.15em] ml-1 ">Arrival Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10 pointer-events-none" />
                        <input 
                          type="date" 
                          value={purchaseForm.date} 
                          onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })} 
                          className={`w-full ${inputBase} ${dateTextColor} pl-10 pr-4 py-3 rounded-xl outline-none text-sm font-black border focus:border-indigo-500 appearance-none`}
                          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-5 space-y-3">
                  <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                    <span className="text-[11px] font-black text-indigo-500 tracking-widest ">ENTRY TOTAL</span>
                    <span className={`text-xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>₹{(Number(purchaseForm.quantity || 0) * Number(purchaseForm.purchasePrice || 0)).toLocaleString()}</span>
                  </div>
                  <button disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black text-[10px] tracking-[0.22em] shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 ">
                    {isLoading ? <Loader className="w-5 h-5 animate-spin" /> : <>Post stock entry <ArrowRight className="w-5 h-5" /></>}
                  </button>
                </div>
              </form>

              <div className={`hidden lg:flex ${darkMode ? 'bg-slate-900/20 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} rounded-2xl overflow-hidden flex-col`}>
                <div className={`p-5 border-b ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <h3 className={`text-[11px] font-black tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'} `}>Live Stock Overview</h3>
                    <div className="flex items-center gap-2">
                      <select value={inventorySort} onChange={(e) => setInventorySort(e.target.value)} className={`${darkMode ? 'bg-gray-950 border-slate-800' : 'bg-white border-slate-200'} text-[10px] font-black text-indigo-500 px-3 py-1.5 rounded-lg border outline-none cursor-pointer`}>
                        <option value="low-stock">SORT: LOW STOCK</option>
                        <option value="a-z">SORT: A-Z</option>
                      </select>
                      <button onClick={fetchSCMData} className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all"><RefreshCcw className="w-5 h-5 text-indigo-500" /></button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input placeholder="Search items..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className={`w-full ${inputBase} py-3 pl-11 pr-4 rounded-xl text-[11px] font-bold border outline-none focus:border-indigo-500 transition-all`} />
                  </div>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {sortedInventory.map(item => {
                    const isLow = item.quantity <= (item.reorderLevel || 5);
                    const isSelected = purchaseForm.productId === item._id;
                    return (
                      <button key={item._id} onClick={() => setPurchaseForm(prev => ({ ...prev, productId: item._id }))} className={`p-4 rounded-xl border text-left transition-all relative group hover:scale-[1.02] active:scale-95 ${isSelected ? 'bg-indigo-600 border-indigo-500 shadow-lg' : isLow ? 'bg-red-500/5 border-red-500/20' : (darkMode ? 'bg-gray-950/50 border-slate-800/50' : 'bg-slate-50 border-slate-200')}`}>
                        <div className="flex justify-between items-start mb-3 gap-2">
                          <p className={`text-[11px] font-black truncate ${isSelected ? 'text-white' : (darkMode ? 'text-slate-300' : 'text-slate-700')}`}>{item.name}</p>
                          {isLow && <AlertTriangle className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-red-500'} shrink-0`} />}
                        </div>
                        <div className="flex justify-between items-end mb-4">
                          <p className={`text-xl font-black tracking-tighter ${isSelected ? 'text-white' : isLow ? 'text-red-500' : 'text-emerald-500'}`}>{item.quantity}</p>
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
            {/* Filters first so KPIs below reflect selected range */}
            <section className={`${cardBase} rounded-2xl border p-4 md:p-6`}>
              <div className="space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 xl:flex-1">
                    {DATE_FILTERS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFilter(f.id)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap border ${
                          selectedFilter === f.id
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg'
                            : (darkMode
                              ? 'text-slate-400 border-slate-700 hover:bg-indigo-500/10'
                              : 'text-slate-500 border-slate-200 hover:bg-indigo-500/10')
                        }`}
                      >
                        {f.label[0]} {f.label[1]}
                      </button>
                    ))}
                  </div>
                  {selectedFilter === 'custom' && (
                    <div className="flex items-center gap-2 w-full xl:w-auto">
                      <div className="relative flex-1 xl:w-40">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10 pointer-events-none" />
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className={`w-full ${inputBase} ${dateTextColor} text-[16px] md:text-xs font-black p-2.5 pl-10 rounded-xl outline-none border focus:border-indigo-500 transition-colors`}
                          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                        />
                      </div>
                      <div className="relative flex-1 xl:w-40">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 z-10 pointer-events-none" />
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className={`w-full ${inputBase} ${dateTextColor} text-[16px] md:text-xs font-black p-2.5 pl-10 rounded-xl outline-none border focus:border-indigo-500 transition-colors`}
                          style={{ colorScheme: darkMode ? 'dark' : 'light' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 md:ml-auto md:max-w-[430px]">
                  <select
                    value={historyProductFilter}
                    onChange={(e) => setHistoryProductFilter(e.target.value)}
                    className={`w-full ${inputBase} ${dateTextColor} text-[13px] md:text-xs font-black p-2.5 rounded-xl outline-none border focus:border-indigo-500 transition-colors`}
                  >
                    <option value="all">All Products</option>
                    {historyProductOptions.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={historySupplierFilter}
                    onChange={(e) => setHistorySupplierFilter(e.target.value)}
                    className={`w-full ${inputBase} ${dateTextColor} text-[13px] md:text-xs font-black p-2.5 rounded-xl outline-none border focus:border-indigo-500 transition-colors`}
                  >
                    <option value="all">All Suppliers</option>
                    {historySupplierOptions.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* KPI Cards - Matching Dashboard Style */}
            <section className="grid grid-cols-2 gap-4">
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBase}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1">
                      Outlay Total
                    </p>
                    <h2 className="text-lg sm:text-2xl font-black text-emerald-400 leading-tight break-words">
                      ₹{historyTotals.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h2>
                  </div>
                  <div className="shrink-0 p-2.5 sm:p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <IndianRupee size={18} />
                  </div>
                </div>
              </div>
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBase}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1">
                      Purchases
                    </p>
                    <h2 className="text-lg sm:text-2xl font-black text-indigo-400 leading-tight break-words">
                      {filteredHistory.length}
                    </h2>
                  </div>
                  <div className="shrink-0 p-2.5 sm:p-3 bg-indigo-500/10 rounded-xl text-indigo-500">
                    <History size={18} />
                  </div>
                </div>
              </div>
            </section>

            {/* Purchase History Table - Matching Dashboard Style */}
            <section className={`${cardBase} rounded-2xl border overflow-hidden flex flex-col max-h-[72vh]`}>
              {/* Header */}
              <div className={`p-4 md:p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                <div>
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Purchase History
                  </h3>
                  <p className={`text-[10px] font-black tracking-widest mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Complete procurement log
                  </p>
                </div>
              </div>

              {/* Mobile View */}
              <div className="md:hidden p-4 space-y-3 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                    <p className={`text-sm font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No purchase records found</p>
                  </div>
                ) : filteredHistory.map(record => (
                  <div key={record._id} className={`${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-200'} p-4 rounded-xl border transition-all hover:border-indigo-500/50`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {record.productId?.name || 'Unknown Product'}
                        </p>
                        <p className="text-[10px] font-mono font-bold text-slate-500 mt-1">
                          {record.invoiceNumber || 'DIR-ENTRY'}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black">
                          +{Number(record.quantity || 0)}
                        </span>
                        <p className="text-[10px] font-black text-slate-500 mt-1.5">
                          @ ₹{(Number(record.purchasePrice || record.price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <div className={`flex justify-between items-end pt-3 border-t ${darkMode ? 'border-slate-800/30' : 'border-slate-200'}`}>
                      <div>
                        <p className="text-[10px] text-slate-500 font-black tracking-tight">
                          {record.supplierId?.name || 'Unknown Supplier'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                          {new Date(record.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <p className="text-base font-black text-emerald-500">
                          ₹{((Number(record.quantity || 0)) * (Number(record.purchasePrice || record.price || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 mt-0.5">Total</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-auto custom-scrollbar flex-1 min-h-0">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <Package className={`w-16 h-16 mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                    <p className={`text-sm font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No purchase records found</p>
                  </div>
                ) : (
                  <table className="w-full text-left min-w-[900px]">
                    <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-slate-900' : 'bg-slate-50'} text-[10px] font-black text-slate-500 tracking-[0.2em] border-b ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                      <tr>
                        <th className="px-6 py-4">Date / Invoice</th>
                        <th className="px-6 py-4">Product</th>
                        <th className="px-6 py-4">Supplier</th>
                        <th className="px-6 py-4 text-center">Unit Cost</th>
                        <th className="px-6 py-4 text-center">Quantity</th>
                        <th className="px-6 py-4 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-slate-800/30' : 'divide-slate-100'}`}>
                      {filteredHistory.map((record) => (
                        <tr key={record._id} className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'} transition-all group`}>
                          <td className="px-6 py-4">
                            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {new Date(record.date).toLocaleDateString()}
                            </p>
                            <p className="text-[10px] font-mono text-slate-500 mt-1">
                              {record.invoiceNumber || 'DIR-ENTRY'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className={`text-sm font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {record.productId?.name || 'Unknown Product'}
                            </p>
                            {record.productId?.hsn && (
                              <p className="text-[10px] text-slate-500 font-bold mt-1 tracking-tighter">
                                HSN: {record.productId.hsn}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`${darkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-indigo-50 text-indigo-600 border-indigo-100'} px-3 py-1.5 rounded-xl text-[10px] font-black border`}>
                              {record.supplierId?.name || 'Unknown Supplier'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-black text-slate-500">
                                ₹{(Number(record.purchasePrice || record.price || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">per unit</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px]">
                              +{Number(record.quantity || 0)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-base font-black text-emerald-500">
                                ₹{((Number(record.quantity || 0)) * (Number(record.purchasePrice || record.price || 0))).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5">Total</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-20">
              {suppliers.map(s => (
                <div key={s._id} className={`${cardBase} p-5 rounded-2xl group hover:border-indigo-500/50 transition-all flex flex-col justify-between border shadow-sm`}>
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/20">{s.name ? s.name[0] : 'V'}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditSupplier(s);
                        }}
                        className="p-2 hover:bg-indigo-500/10 rounded-xl transition-all group/edit"
                        aria-label="Edit supplier"
                      >
                        <Edit className="w-4 h-4 text-slate-400 group-hover/edit:text-indigo-500 transition-all" />
                      </button>
                    </div>
                    <h4 className={`text-sm font-black truncate mb-4 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.name}</h4>
                    <div className={`flex items-center gap-3 pt-4 border-t ${darkMode ? 'border-slate-800/50' : 'border-slate-100'}`}>
                      {s.phone ? (
                        <a
                          href={`tel:${String(s.phone).replace(/[^\d+]/g, '')}`}
                          className={`flex items-center gap-3 text-[11px] font-mono font-black transition-colors ${darkMode ? 'text-slate-300 hover:text-indigo-400' : 'text-slate-600 hover:text-indigo-600'}`}
                          aria-label={`Call ${s.name}`}
                          title={`Call ${s.phone}`}
                        >
                          <Phone className="w-4 h-4 text-indigo-500" />
                          <span>{s.phone}</span>
                        </a>
                      ) : (
                        <>
                          <Phone className="w-4 h-4 text-indigo-500" />
                          <span className="text-[11px] font-mono text-slate-500 font-black">N/A</span>
                        </>
                      )}
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
      </div>

      {/* FAB: Add New Supplier Button - Floating Icon */}
      {activeTab === 'suppliers' && (
        <button 
          onClick={() => {
            setEditingSupplierId(null);
            setSupplierForm({ name: '', phone: '', email: '', gstin: '' });
            setSupplierErrors({});
            setIsSupplierModalOpen(true);
          }} 
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] w-14 h-14 md:w-16 md:h-16 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center hover:shadow-indigo-600/60 group"
          aria-label="Add new supplier"
        >
          <Plus className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
          <span className="hidden md:block absolute right-full mr-4 bg-slate-900 text-white text-[11px] font-black px-4 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity tracking-widest uppercase">Add Supplier</span>
        </button>
      )}

      {/* --- MODALS --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
            setIsProductModalOpen(false);
            setProductForm(EMPTY_PRODUCT_FORM);
            setHasProductVariants(false);
            setEditingProductVariantIndex(null);
          }} />
          <form
            onSubmit={handleQuickAddProduct}
            className={`relative w-full max-w-lg ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden max-h-[90vh] md:max-h-[88vh] flex flex-col`}
          >
            {/* Header */}
            <div className={`p-5 border-b ${darkMode ? 'border-slate-800 bg-gray-950/50' : 'border-slate-100 bg-slate-50'} flex justify-between items-center`}>
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
                onClick={() => {
                  setIsProductModalOpen(false);
                  setProductForm(EMPTY_PRODUCT_FORM);
                  setHasProductVariants(false);
                  setEditingProductVariantIndex(null);
                }}
                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="p-5 space-y-4 overflow-y-auto min-h-0 flex-1 custom-scrollbar">
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
                  className={`w-full ${inputBase} p-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
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
                      required={!hasProductVariants}
                      placeholder="0.00"
                      value={productForm.price}
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                      className={`w-full pl-8 pr-4 ${inputBase} p-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
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
                    className={`w-full ${inputBase} p-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
                  />
                </div>
              </div>

              {/* Variants toggle + list */}
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings2 className={`w-4 h-4 ${hasProductVariants ? 'text-indigo-500' : 'text-slate-500'}`} />
                    <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Enable Variants</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasProductVariants) {
                        setHasProductVariants(false);
                        setProductForm((prev) => ({ ...prev, variants: [] }));
                        setEditingProductVariantIndex(null);
                      } else {
                        setHasProductVariants(true);
                        addQuickVariant();
                      }
                    }}
                    className={`relative w-11 h-6 rounded-full transition-colors ${hasProductVariants ? 'bg-indigo-600' : 'bg-slate-400'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${hasProductVariants ? 'translate-x-5' : ''}`} />
                  </button>
                </div>

                {hasProductVariants && (
                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={addQuickVariant}
                      className="px-3 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-500 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Variant
                    </button>
                    {(productForm.variants || []).map((variant, index) => (
                      <div key={variant._id || `scm-v-${index}`} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <button
                            type="button"
                            onClick={() => setEditingProductVariantIndex((prev) => (prev === index ? null : index))}
                            className={`flex items-center gap-2 text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}
                          >
                            <span>{(variant.label || '').trim() || `Variant ${index + 1}`}</span>
                            <span className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                              (₹{Number(variant.price || 0).toFixed(2)} · Qty {variant.quantity || 0})
                            </span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${editingProductVariantIndex === index ? 'rotate-180' : ''}`} />
                          </button>
                          <button type="button" onClick={() => removeQuickVariant(index)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {editingProductVariantIndex === index && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              placeholder="Variant label"
                              value={variant.label}
                              onChange={(e) => updateQuickVariant(index, 'label', e.target.value)}
                              className={`w-full ${inputBase} p-2.5 rounded-lg text-xs border focus:outline-none focus:border-indigo-500`}
                            />
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Price"
                              value={variant.price ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) updateQuickVariant(index, 'price', val);
                              }}
                              className={`w-full ${inputBase} p-2.5 rounded-lg text-xs border focus:outline-none focus:border-indigo-500`}
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="Quantity"
                              value={variant.quantity === 0 ? '' : variant.quantity}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) updateQuickVariant(index, 'quantity', val === '' ? 0 : Number(val));
                              }}
                              className={`w-full ${inputBase} p-2.5 rounded-lg text-xs border focus:outline-none focus:border-indigo-500`}
                            />
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="Reorder level"
                              value={variant.reorderLevel ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d+$/.test(val)) updateQuickVariant(index, 'reorderLevel', val === '' ? null : Number(val));
                              }}
                              className={`w-full ${inputBase} p-2.5 rounded-lg text-xs border focus:outline-none focus:border-indigo-500`}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                    className={`flex-1 ${inputBase} p-3 rounded-xl text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400`}
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerModalOpen(true)}
                    className={`p-3 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'} rounded-xl border hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-indigo-500 transition-all`}
                    title="Scan Barcode"
                  >
                    <ScanLine className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className={`p-5 border-t ${darkMode ? 'bg-gray-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'} flex gap-3`}>
              <button
                type="button"
                onClick={() => {
                  setIsProductModalOpen(false);
                  setProductForm(EMPTY_PRODUCT_FORM);
                  setHasProductVariants(false);
                  setEditingProductVariantIndex(null);
                }}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                  darkMode
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !String(productForm.name || '').trim() || (!hasProductVariants && !String(productForm.price || '').trim()) || (hasProductVariants && !(productForm.variants || []).some(v => String(v.label || '').trim() && String(v.price || '').trim()))}
                className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Product'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {(isProductPickerOpen || isSupplierPickerOpen) && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
          <div className={`relative w-full max-w-md ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} rounded-2xl border max-h-[75vh] flex flex-col overflow-hidden animate-in zoom-in duration-200 shadow-2xl`}>
            <div className={`p-5 border-b ${darkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-[11px] font-black tracking-[0.25em] text-indigo-500 ">{isProductPickerOpen ? 'Select Product' : 'Select Supplier'}</h3>
                <X className="w-6 h-6 text-slate-500 cursor-pointer hover:text-red-500" onClick={() => { setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} />
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input placeholder="Type to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full ${inputBase} p-3 pl-12 rounded-xl outline-none text-sm font-black border focus:border-indigo-500`} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {(isProductPickerOpen ? filteredProducts : filteredSuppliers).map(item => {
                const isLow = isProductPickerOpen && (item.quantity <= (item.reorderLevel || 5));
                const isSelected = (isProductPickerOpen ? purchaseForm.productId : purchaseForm.supplierId) === item._id;
                return (
                  <button key={item._id} onClick={() => { setPurchaseForm({ ...purchaseForm, [isProductPickerOpen ? 'productId' : 'supplierId']: item._id }); setIsProductPickerOpen(false); setIsSupplierPickerOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'hover:bg-indigo-500/10 border-transparent'}`}>
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
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseSupplierModal} />
          <form onSubmit={handleAddSupplier} className={`relative w-full max-w-sm ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} p-6 rounded-2xl border shadow-2xl animate-in zoom-in duration-300`}>
            <div className="flex justify-between items-center mb-5">
              <h3 className={`text-xl font-black tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {editingSupplierId ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button
                type="button"
                onClick={handleCloseSupplierModal}
                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1 ">Full Name</label>
                <input
                  required
                  placeholder="Business / Supplier Name"
                  value={supplierForm.name}
                  onChange={e => {
                    const value = e.target.value.replace(/\s+/g, ' ').replace(/^\s+/, '');
                    setSupplierForm({ ...supplierForm, name: value });
                    if (supplierErrors.name) setSupplierErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full ${inputBase} p-3 rounded-xl outline-none text-sm font-black border ${supplierErrors.name ? 'border-rose-500' : ''}`}
                />
                {supplierErrors.name && <p className="text-[10px] font-bold text-rose-500 ml-1">{supplierErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1 ">Contact No</label>
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Phone Number"
                  value={supplierForm.phone}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setSupplierForm({ ...supplierForm, phone: value });
                    if (supplierErrors.phone) setSupplierErrors(prev => ({ ...prev, phone: undefined }));
                  }}
                  className={`w-full ${inputBase} p-3 rounded-xl outline-none text-sm font-black border ${supplierErrors.phone ? 'border-rose-500' : ''}`}
                />
                {supplierErrors.phone && <p className="text-[10px] font-bold text-rose-500 ml-1">{supplierErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 tracking-widest ml-1 ">Identification (GSTIN)</label>
                <input
                  placeholder="Optional ID"
                  value={supplierForm.gstin}
                  onChange={e => {
                    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
                    setSupplierForm({ ...supplierForm, gstin: value });
                    if (supplierErrors.gstin) setSupplierErrors(prev => ({ ...prev, gstin: undefined }));
                  }}
                  className={`w-full ${inputBase} p-3 rounded-xl outline-none text-sm font-mono text-indigo-500 border ${supplierErrors.gstin ? 'border-rose-500' : ''}`}
                />
                {supplierErrors.gstin && <p className="text-[10px] font-bold text-rose-500 ml-1">{supplierErrors.gstin}</p>}
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                className={`w-full mt-2 py-3 rounded-xl font-black text-[10px] tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${darkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              >
                {isLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    {editingSupplierId ? 'Updating...' : 'Saving...'}
                  </>
                ) : (
                  editingSupplierId ? 'Update Supplier' : 'Save Supplier'
                )}
              </button>
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