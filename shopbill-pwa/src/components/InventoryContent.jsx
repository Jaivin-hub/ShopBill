import React, { useState, useRef, useEffect } from 'react';
import { 
    Package, Plus, AlertTriangle, Edit, Trash2, X, Search, 
    ListOrdered, Loader2, ScanLine, Upload, Hash, Layers, Bell 
} from 'lucide-react';
import ScannerModal from './ScannerModal';

const ScrollbarStyles = ({ darkMode }) => (
    <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${darkMode ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9'}; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* Prevent Auto-Zoom on iOS while maintaining original height */
        @media (max-width: 768px) {
            .no-zoom-search {
                font-size: 16px !important;
                /* Adjusting padding to keep height identical to sort button (approx 42px-44px) */
                padding-top: 0px !important;
                padding-bottom: 0px !important;
                height: 38px !important; 
            }
        }
    `}} />
);

// --- BULK UPLOAD MODAL ---
const BulkUploadModal = ({ isOpen, onClose, onSubmit, loading, darkMode }) => {
    const [csvData, setCsvData] = useState('');
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
    const requiredHeaders = ["name", "price", "quantity"];

    useEffect(() => {
        if (!isOpen) { setCsvData(''); setFile(null); setError(null); }
    }, [isOpen]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile?.name.endsWith('.csv')) {
            setFile(selectedFile);
            setError(null);
            const reader = new FileReader();
            reader.onload = (event) => setCsvData(event.target.result);
            reader.readAsText(selectedFile);
        } else {
            setError('Select a valid CSV.');
        }
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return (setError('CSV is empty') || null);
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) return (setError(`Missing: ${missing.join(',')}`) || null);

        return lines.slice(1).map(line => {
            const values = line.split(',');
            const item = {};
            headers.forEach((h, i) => item[h] = values[i]?.trim());
            return {
                name: item.name,
                price: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 0),
                reorderLevel: parseInt(item.reorderlevel || 5),
                hsn: item.hsn || ''
            };
        }).filter(i => i.name && !isNaN(i.price));
    };

    if (!isOpen) return null;

    const modalBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
    const innerBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';

    return (
        <section className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <form onSubmit={(e) => { e.preventDefault(); const items = parseCSV(csvData); if (items) onSubmit(items); }} className={`${modalBg} w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl`}>
                <div className={`p-6 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'} flex justify-between items-center`}>
                    <h2 className={`text-sm font-bold tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>Bulk Data Procurement</h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-6">
                    <input type="file" accept=".csv" onChange={handleFileChange} className={`w-full text-[10px] ${darkMode ? 'text-gray-400' : 'text-slate-500'} file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase ${darkMode ? 'file:bg-gray-800 file:text-white' : 'file:bg-slate-200 file:text-slate-700'} cursor-pointer`} />
                    <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} placeholder="Paste CSV data (Name, Price, Quantity)..." rows="5" className={`w-full p-4 ${innerBg} border ${darkMode ? 'border-gray-800 text-emerald-400' : 'border-slate-200 text-emerald-600'} rounded-lg text-xs font-mono placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all`} />
                    {error && <div className="text-red-500 text-[10px] font-bold tracking-widest">{error}</div>}
                </div>
                <div className={`p-6 ${innerBg} border-t ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                    <button type="submit" disabled={loading || !csvData} className="w-full py-3.5 bg-indigo-600 text-white text-[10px] font-bold tracking-widest rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute Bulk Upload'}
                    </button>
                </div>
            </form>
        </section>
    );
};

const InputField = ({ label, darkMode, ...props }) => (
    <div className="space-y-1.5">
        <label className={`text-[10px] font-bold tracking-widest ml-1 ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>{label}</label>
        <input className={`w-full p-3 ${darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition-colors placeholder-slate-300`} {...props} />
    </div>
);

const InventoryListCard = ({ item, handleEditClick, handleDeleteClick, loading, darkMode }) => {
    const isLowStock = item.quantity <= (item.reorderLevel || 5);
    const cardBg = darkMode ? (isLowStock ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-900/40 border-gray-800/60') : (isLowStock ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200 shadow-sm');
    
    return (
        <article className={`p-5 rounded-xl border transition-all ${cardBg}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-bold tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</h4>
                        {isLowStock && <Bell className="w-3 h-3 text-red-500 animate-pulse" />}
                    </div>
                    <p className={`text-[9px] font-bold tracking-wider mt-1 flex items-center gap-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                        <Hash className="w-2.5 h-2.5" /> {item.hsn || '---'}
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-bold text-emerald-500">₹{item.price?.toLocaleString()}</span>
                </div>
            </div>
            <div className={`flex justify-between items-center ${darkMode ? 'bg-gray-950/50 border-gray-800/50' : 'bg-slate-50 border-slate-100'} p-3 rounded-lg border`}>
                <div>
                    <p className={`text-[8px] font-bold tracking-widest ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>Inventory Level</p>
                    <p className={`text-xs font-bold ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`}>{item.quantity} Units</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => handleEditClick(item)} className={`p-2.5 ${darkMode ? 'bg-gray-800' : 'bg-slate-200'} rounded-md text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all`}><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteClick(item._id || item.id, item.name)} disabled={loading} className={`p-2.5 ${darkMode ? 'bg-gray-800' : 'bg-slate-200'} rounded-md text-red-500 hover:bg-red-600 hover:text-white transition-all`}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </article>
    );
};

const InventoryContent = ({
    inventory, loading, isFormModalOpen, isConfirmModalOpen, isBulkUploadModalOpen, formData, isEditing, itemToDelete, searchTerm, sortOption, setSearchTerm, setSortOption, handleEditClick, handleDeleteClick, closeFormModal, handleInputChange, handleFormSubmit, confirmDeleteItem, setIsConfirmModalOpen, openAddModal, openBulkUploadModal, closeBulkUploadModal, handleBulkUpload, setFormData, darkMode
}) => {
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const sortDropdownRef = useRef(null);

    const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200 shadow-sm';

    const openScannerModal = () => setIsScannerModalOpen(true);
    const closeScannerModal = () => setIsScannerModalOpen(false);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target)) setIsSortDropdownOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const sortOptions = [
        { value: 'default', label: 'Name (A-Z)' },
        { value: 'low-stock', label: 'Priority: Low Stock' },
    ];
    const currentSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label;

    const handleScannedItemSuccess = (scannedItem) => {
        const uniqueCode = (scannedItem.hsn || scannedItem.barcode)?.toLowerCase().trim();
        const existing = inventory.find(i => i.hsn?.toLowerCase().trim() === uniqueCode);
        closeScannerModal();
        if (existing) handleEditClick(existing);
        else handleScannedItemNotFound(uniqueCode, scannedItem);
    };

    const handleScannedItemNotFound = (code, data = {}) => {
        closeScannerModal();
        openAddModal();
        setFormData(prev => ({ ...prev, ...data, hsn: data.hsn || code || '', price: data.price || 0, quantity: data.quantity || 0 }));
    };

    return (
        <div className={`min-h-screen flex flex-col ${themeBase} transition-colors duration-200`}>
            <ScrollbarStyles darkMode={darkMode} />

            {/* --- HEADER --- */}
            <header className={`sticky top-0 z-[100] ${themeBase} border-b ${darkMode ? 'border-gray-800/60' : 'border-slate-200'} px-4 md:px-8 py-4`}>
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className={`text-xl font-bold tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                Inventory <span className="text-indigo-500">Vault</span>
                            </h1>
                            <p className="text-[10px] text-gray-500 font-bold tracking-wider mt-1">Asset Management Interface</p>
                        </div>
                        
                        <div className="flex md:hidden items-center gap-2">
                            <button onClick={openBulkUploadModal} className={`p-2.5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border text-emerald-500 rounded-lg active:scale-95`} title="Bulk Import">
                                <Upload className="w-4.5 h-4.5" />
                            </button>
                            <button onClick={openScannerModal} className={`p-2.5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border text-indigo-500 rounded-lg active:scale-95`}>
                                <ScanLine className="w-4.5 h-4.5" />
                            </button>
                            <button onClick={openAddModal} className="p-2.5 bg-indigo-600 text-white rounded-lg active:scale-95">
                                <Plus className="w-4.5 h-4.5" />
                            </button>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-3">
                        <button onClick={openScannerModal} className={`p-2.5 ${darkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-slate-200 hover:bg-slate-50'} border text-indigo-500 rounded-lg transition-all`} title="Scan Barcode">
                            <ScanLine className="w-5 h-5" />
                        </button>
                        <button onClick={openBulkUploadModal} className={`p-2.5 ${darkMode ? 'bg-gray-900 border-gray-800 hover:bg-gray-800' : 'bg-white border-slate-200 hover:bg-slate-50'} border text-emerald-500 rounded-lg transition-all`} title="Bulk Import">
                            <Upload className="w-5 h-5" />
                        </button>
                        <button onClick={openAddModal} className="px-5 py-2.5 bg-indigo-600 text-white text-[10px] font-bold tracking-widest rounded-lg hover:bg-indigo-500 transition-all flex items-center gap-2">
                            <Plus className="w-4 h-4" /> Add Asset
                        </button>
                    </div>
                </div>
            </header>

            {/* --- SEARCH & SORT --- */}
            <div className={`sticky top-[73px] md:top-[77px] z-[90] ${themeBase} border-b ${darkMode ? 'border-gray-900/60' : 'border-slate-200'} px-4 md:px-8 py-3`}>
                <div className="max-w-7xl mx-auto flex gap-3">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                        <input
                            type="text"
                            placeholder="search by asset name or HSN"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`no-zoom-search w-full pl-10 pr-4 py-2.5 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border rounded-lg md:text-[10px] font-bold text-white tracking-widest focus:outline-none focus:border-indigo-500 transition-all ${!darkMode ? 'text-slate-900' : ''}`}
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"><X className="w-3.5 h-3.5" /></button>}
                    </div>
                    
                    <div className="relative" ref={sortDropdownRef}>
                        <button 
                            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)} 
                            className={`flex items-center gap-2 px-4 py-2.5 ${darkMode ? 'bg-gray-900 border' : 'bg-white border'} rounded-lg text-[10px] font-bold tracking-wider transition-all ${isSortDropdownOpen ? 'border-indigo-500 text-indigo-500' : (darkMode ? 'border-gray-800 text-gray-500' : 'border-slate-200 text-slate-500')}`}
                        >
                            <ListOrdered className="w-4 h-4" />
                            <span className="hidden sm:inline">{currentSortLabel}</span>
                        </button>
                        {isSortDropdownOpen && (
                            <div className={`absolute right-0 mt-2 w-48 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} border rounded-lg shadow-2xl z-[100] overflow-hidden`}>
                                {sortOptions.map(opt => (
                                    <button 
                                        key={opt.value} 
                                        onClick={() => { setSortOption(opt.value); setIsSortDropdownOpen(false); }} 
                                        className={`w-full px-4 py-3.5 text-left text-[10px] font-bold tracking-wider transition-colors ${sortOption === opt.value ? 'bg-indigo-600 text-white' : (darkMode ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50')}`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- INVENTORY LIST --- */}
            <main className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-8 py-8">
                <div className="hidden lg:block rounded-xl border overflow-hidden shadow-sm overflow-x-auto custom-scrollbar" style={{ backgroundColor: darkMode ? 'rgba(17, 24, 39, 0.5)' : 'white', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }}>
                    <div className={`px-6 py-4 ${darkMode ? 'bg-gray-900 border-b border-gray-800' : 'bg-slate-50 border-b border-slate-100'} flex items-center gap-2`}>
                        <Layers className="w-4 h-4 text-indigo-500" />
                        <h2 className={`text-[10px] font-bold tracking-widest ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Master Inventory Log ({inventory.length} Records)</h2>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className={`${darkMode ? 'bg-gray-950 border-b border-gray-800' : 'bg-white border-b border-slate-100'}`}>
                                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 tracking-widest">Asset Description</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 tracking-widest text-center">Stock</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 tracking-widest text-center">Unit Price</th>
                                <th className="px-6 py-4 text-[9px] font-bold text-gray-500 tracking-widest text-right">Management</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y ${darkMode ? 'divide-gray-800/50' : 'divide-slate-100'}`}>
                            {inventory.map(item => {
                                const isLowStock = item.quantity <= (item.reorderLevel || 5);
                                return (
                                    <tr key={item._id || item.id} className={`group transition-colors ${isLowStock ? 'bg-red-500/[0.02] hover:bg-red-500/[0.05]' : (darkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50')}`}>
                                        <td className="px-6 py-4">
                                            <div className={`font-bold text-xs tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                                {item.name}
                                                {isLowStock && <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 text-[8px] rounded border border-red-500/20">LOW</span>}
                                            </div>
                                            <div className={`text-[9px] font-bold mt-1 tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                                                <Hash className="w-3 h-3" /> {item.hsn || '---'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-sm font-bold ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`}>{item.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-bold text-emerald-500 tracking-tight">₹{item.price?.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditClick(item)} className={`p-2 ${darkMode ? 'bg-gray-800 border-gray-700 text-indigo-400' : 'bg-slate-100 border-slate-200 text-indigo-600'} border rounded-md hover:text-white hover:bg-indigo-600 transition-all`}><Edit className="w-3.5 h-3.5" /></button>
                                                <button onClick={() => handleDeleteClick(item._id || item.id, item.name)} disabled={loading} className={`p-2 ${darkMode ? 'bg-gray-800 border-gray-700 text-red-400' : 'bg-slate-100 border-slate-200 text-red-600'} border rounded-md hover:text-white hover:bg-red-600 transition-all`}><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <section className="lg:hidden pb-20">
                    <div className="grid grid-cols-1 gap-4">
                        {inventory.map(item => <InventoryListCard key={item._id || item.id} item={item} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick} loading={loading} darkMode={darkMode} />)}
                        {inventory.length === 0 && (
                            <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-gray-900' : 'border-slate-200'} rounded-xl`}>
                                <Package className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                                <p className="text-[10px] font-bold text-gray-500 tracking-widest">Database Record Empty</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* MODALS */}
            {isFormModalOpen && (
                <section className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[120] p-4">
                    <form onSubmit={handleFormSubmit} className={`${cardBase} w-full max-w-xl rounded-xl border overflow-hidden shadow-2xl`}>
                        <div className={`p-6 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'} flex justify-between items-center`}>
                            <h2 className={`text-sm font-bold tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isEditing ? 'Modify' : 'Register New'} Asset</h2>
                            <button type="button" onClick={closeFormModal} className="p-2 hover:bg-black/5 rounded-lg text-gray-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-5 ${darkMode ? 'bg-gray-950/30' : 'bg-slate-50/50'}`}>
                            <div className="md:col-span-2"><InputField label="Product Description" name="name" type="text" value={formData.name} onChange={handleInputChange} darkMode={darkMode} required /></div>
                            <InputField label="Unit Price (₹)" name="price" type="number" value={formData.price} onChange={handleInputChange} darkMode={darkMode} required />
                            <InputField label="Stock Count" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} darkMode={darkMode} required />
                            <InputField label="Reorder Threshold" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} darkMode={darkMode} />
                            <InputField label="HSN Code" name="hsn" type="text" value={formData.hsn} onChange={handleInputChange} darkMode={darkMode} />
                        </div>
                        <div className={`p-6 border-t ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-white border-slate-100'}`}>
                            <button type="submit" disabled={loading || !formData.name} className={`w-full py-3.5 text-white text-[10px] font-bold tracking-widest rounded-lg transition-all active:scale-95 ${isEditing ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditing ? 'Update Asset' : 'Save To Inventory')}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {isConfirmModalOpen && (
                <section className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[130] p-4">
                    <div className={`${darkMode ? 'bg-gray-900 border-red-500/20' : 'bg-white border-slate-200'} w-full max-w-sm rounded-xl border p-6 text-center space-y-6 shadow-2xl`}>
                        <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20"><AlertTriangle className="w-7 h-7 text-red-500" /></div>
                        <div>
                            <h2 className={`text-sm font-bold tracking-wider ${darkMode ? 'text-white' : 'text-slate-900'}`}>Authorize Deletion</h2>
                            <p className="text-[10px] font-medium text-gray-500 tracking-widest mt-2">Permantently remove <span className={darkMode ? 'text-white' : 'text-slate-900'}>{itemToDelete?.name}</span>?</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsConfirmModalOpen(false)} className={`flex-1 py-3 ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-slate-100 text-slate-600'} text-[10px] font-bold rounded-lg`}>Cancel</button>
                            <button onClick={confirmDeleteItem} className="flex-1 py-3 bg-red-600 text-white text-[10px] font-bold rounded-lg">Confirm</button>
                        </div>
                    </div>
                </section>
            )}

            {loading && !isFormModalOpen && !isBulkUploadModalOpen && (
                <div className="fixed bottom-6 right-6 bg-indigo-600 text-white px-5 py-3 rounded-lg shadow-2xl flex items-center gap-3 z-50">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-[10px] font-bold tracking-widest">Syncing Data</span>
                </div>
            )}

            <ScannerModal isOpen={isScannerModalOpen} inventory={inventory} onClose={closeScannerModal} onScanSuccess={handleScannedItemSuccess} onScanNotFound={handleScannedItemNotFound} darkMode={darkMode} />
            <BulkUploadModal isOpen={isBulkUploadModalOpen} onClose={closeBulkUploadModal} onSubmit={handleBulkUpload} loading={loading} darkMode={darkMode} />
        </div>
    );
};

export default InventoryContent;