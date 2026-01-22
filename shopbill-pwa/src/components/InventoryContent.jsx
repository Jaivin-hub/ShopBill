import React, { useState, useRef, useEffect } from 'react';
import { 
    Package, Plus, AlertTriangle, Edit, Trash2, X, Search, 
    ListOrdered, Loader2, ScanLine, Upload, Hash, Layers, Bell, Info 
} from 'lucide-react';
import ScannerModal from './ScannerModal';

const ScrollbarStyles = ({ darkMode }) => (
    <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: ${darkMode ? 'rgba(15, 23, 42, 0.5)' : '#f1f5f9'}; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4f46e5; border-radius: 4px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }

        /* Prevent Auto-Zoom on iOS while maintaining design scale */
        .no-zoom-input {
            font-size: 16px !important;
        }
        @media (max-width: 768px) {
            .no-zoom-input {
                transform: scale(0.85);
                transform-origin: left center;
                width: 117.6% !important; 
            }
            .no-zoom-search {
                font-size: 16px !important;
                height: 42px !important;
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
        if (missing.length > 0) return (setError(`Missing Columns: ${missing.join(', ')}`) || null);

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

    const modalBg = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
    const innerBg = darkMode ? 'bg-slate-950' : 'bg-slate-50';

    return (
        <section className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4">
            <form onSubmit={(e) => { e.preventDefault(); const items = parseCSV(csvData); if (items) onSubmit(items); }} className={`${modalBg} w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl`}>
                <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
                    <div>
                        <h2 className={`text-sm font-black tracking-widest  ${darkMode ? 'text-white' : 'text-slate-900'}`}>Bulk Data Procurement</h2>
                        <p className="text-[9px] text-indigo-500 font-bold tracking-widest mt-1">IMPORT SYSTEM ACTIVE</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-red-500/10 rounded-xl text-gray-500 transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div className={`p-4 rounded-xl border ${darkMode ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-black tracking-widest text-indigo-500 ">CSV Requirements</span>
                        </div>
                        <p className={`text-[10px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            File must include a header row with: <strong className="text-indigo-400">name, price, quantity</strong>. 
                            Optional: <span className="">reorderlevel, hsn</span>.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <input type="file" accept=".csv" onChange={handleFileChange} className={`w-full text-[10px] ${darkMode ? 'text-gray-400' : 'text-slate-500'} file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[9px] file:font-black file: ${darkMode ? 'file:bg-slate-800 file:text-white' : 'file:bg-slate-200 file:text-slate-700'} cursor-pointer`} />
                        <textarea value={csvData} onChange={(e) => setCsvData(e.target.value)} placeholder="Paste CSV data here..." rows="5" className={`w-full p-4 ${innerBg} border ${darkMode ? 'border-slate-800 text-emerald-400' : 'border-slate-200 text-emerald-600'} rounded-xl text-xs font-mono placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all no-zoom-input`} />
                    </div>

                    {error && <div className="flex items-center gap-2 text-red-500 bg-red-500/5 p-3 rounded-lg border border-red-500/20"><AlertTriangle className="w-4 h-4" /><span className="text-[10px] font-bold tracking-widest">{error}</span></div>}
                </div>

                <div className={`p-6 ${innerBg} border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                    <button type="submit" disabled={loading || !csvData} className="w-full py-4 bg-indigo-600 text-white text-[10px] font-black tracking-[0.2em]  rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-lg active:scale-[0.98]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Execute Asset Integration'}
                    </button>
                </div>
            </form>
        </section>
    );
};

const InputField = ({ label, darkMode, ...props }) => (
    <div className="space-y-2">
        <label className={`text-[9px] font-black  tracking-[0.2em] ml-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
        <input className={`no-zoom-input w-full p-3.5 ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder-slate-700`} {...props} />
    </div>
);

const InventoryListCard = ({ item, handleEditClick, handleDeleteClick, loading, darkMode }) => {
    const isLowStock = item.quantity <= (item.reorderLevel || 5);
    const cardBg = darkMode ? (isLowStock ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900 border-slate-800') : (isLowStock ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200 shadow-sm');
    return (
        <article className={`p-5 rounded-2xl border transition-all ${cardBg}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-2">
                    <div className="flex items-center gap-2">
                        <h4 className={`text-xs font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</h4>
                        {isLowStock && <Bell className="w-3 h-3 text-red-500 animate-pulse" />}
                    </div>
                    <p className={`text-[9px] font-bold tracking-wider mt-1 flex items-center gap-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}><Hash className="w-2.5 h-2.5" /> {item.hsn || '---'}</p>
                </div>
                <div className="text-right"><span className="text-sm font-black text-emerald-500 tabular-nums">₹{item.price?.toLocaleString()}</span></div>
            </div>
            <div className={`flex justify-between items-center ${darkMode ? 'bg-slate-950 border-slate-800/50' : 'bg-slate-50 border-slate-100'} p-3 rounded-xl border`}>
                <div><p className={`text-[8px] font-black  tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Level</p><p className={`text-xs font-black ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`}>{item.quantity} Units</p></div>
                <div className="flex gap-2">
                    <button onClick={() => handleEditClick(item)} className={`p-2.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} rounded-xl text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all active:scale-90`}><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteClick(item._id || item.id, item.name)} disabled={loading} className={`p-2.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-200'} rounded-xl text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-90`}><Trash2 className="w-4 h-4" /></button>
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

    const themeBase = darkMode ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';

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
        { value: 'default', label: 'Alphabetical' },
        { value: 'low-stock', label: 'Low stock' },
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
        /* min-h-screen allows the window to scroll naturally */
        <div className={`min-h-screen flex flex-col ${themeBase} transition-colors duration-200`}>
            <ScrollbarStyles darkMode={darkMode} />

            {/* --- STICKY STACK (Header + Search/Sort) --- */}
            {/* sticky top-0 makes the header stick to the browser window */}
            <div className="sticky top-0 z-[100] shadow-sm flex-none">
                {/* Header */}
                <header className={`backdrop-blur-xl border-b px-4 md:px-8 py-5 ${darkMode ? 'bg-slate-950/80 border-slate-800/60' : 'bg-white/80 border-slate-200'}`}>
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Inventory <span className="text-indigo-500">Vault</span></h1>
                                <p className="text-[9px] text-slate-500 font-black tracking-[0.2em]  mt-1">Asset Management Interface</p>
                            </div>
                            <div className="flex md:hidden items-center gap-2">
                                <button onClick={openBulkUploadModal} className={`p-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border text-emerald-500 rounded-xl active:scale-90`}><Upload className="w-5 h-5" /></button>
                                <button onClick={openScannerModal} className={`p-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border text-indigo-500 rounded-xl active:scale-90`}><ScanLine className="w-5 h-5" /></button>
                                <button onClick={openAddModal} className="p-3 bg-indigo-600 text-white rounded-xl active:scale-90 shadow-lg shadow-indigo-600/20"><Plus className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3">
                            <button onClick={openScannerModal} className={`p-3 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-500'} border text-indigo-500 rounded-xl transition-all`}><ScanLine className="w-5 h-5" /></button>
                            <button onClick={openBulkUploadModal} className={`p-3 ${darkMode ? 'bg-slate-900 border-slate-800 hover:border-emerald-500' : 'bg-white border-slate-200 hover:border-emerald-500'} border text-emerald-500 rounded-xl transition-all`}><Upload className="w-5 h-5" /></button>
                            <button onClick={openAddModal} className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black tracking-[0.2em]  rounded-xl hover:bg-indigo-500 transition-all flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Add Asset
                            </button>
                        </div>
                    </div>
                </header>

                {/* Search & Sort Bar */}
                <div className={`border-b px-4 md:px-8 py-4 ${darkMode ? 'bg-slate-950 border-slate-900/60' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="max-w-7xl mx-auto flex gap-3">
                        <div className="relative flex-grow">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                            <input
                                type="text" placeholder="search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                className={`no-zoom-search w-full pl-11 pr-4 py-3 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-xl text-[10px] font-black text-white tracking-[0.2em]  focus:outline-none focus:border-indigo-500 transition-all ${!darkMode ? 'text-slate-900' : ''}`}
                            />
                            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"><X className="w-4 h-4" /></button>}
                        </div>
                        <div className="relative" ref={sortDropdownRef}>
                            <button 
                                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)} 
                                className={`flex items-center gap-2 px-5 py-3 ${darkMode ? 'bg-slate-900 border' : 'bg-white border'} rounded-xl text-[10px] font-black tracking-widest  transition-all ${isSortDropdownOpen ? 'border-indigo-500 text-indigo-500' : (darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500')}`}
                            >
                                <ListOrdered className="w-4 h-4" /> <span className="hidden sm:inline">{currentSortLabel}</span>
                            </button>
                            {isSortDropdownOpen && (
                                <div className={`absolute right-0 mt-2 w-56 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border rounded-xl shadow-2xl z-[100] overflow-hidden`}>
                                    {sortOptions.map(opt => (
                                        <button key={opt.value} onClick={() => { setSortOption(opt.value); setIsSortDropdownOpen(false); }} className={`w-full px-5 py-4 text-left text-[10px] font-black  tracking-widest transition-colors ${sortOption === opt.value ? 'bg-indigo-600 text-white' : (darkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-50')}`}>{opt.label}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CONTENT --- */}
            {/* Removed overflow-y-auto so the main page body handles scrolling */}
            <main className="flex-1">
                <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6">
                    <div className="hidden lg:block rounded-2xl border overflow-hidden shadow-sm overflow-x-auto" style={{ backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.4)' : 'white', borderColor: darkMode ? '#1e293b' : '#e2e8f0' }}>
                        <div className={`px-6 py-5 ${darkMode ? 'bg-slate-900 border-b border-slate-800' : 'bg-slate-50 border-b border-slate-100'} flex items-center gap-2`}>
                            <Layers className="w-4 h-4 text-indigo-500" /><h2 className={`text-[10px] font-black  tracking-[0.2em] ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Master Registry • {inventory.length} Assets Found</h2>
                        </div>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className={`${darkMode ? 'bg-slate-950 border-b border-slate-800' : 'bg-white border-b border-slate-100'}`}>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-500  tracking-widest">Asset Details</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-500  tracking-widest text-center">Stock Level</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-500  tracking-widest text-center">Unit Valuation</th>
                                    <th className="px-6 py-4 text-[9px] font-black text-slate-500  tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-slate-800/50' : 'divide-slate-100'}`}>
                                {inventory.map(item => {
                                    const isLowStock = item.quantity <= (item.reorderLevel || 5);
                                    return (
                                        <tr key={item._id || item.id} className={`group transition-colors ${isLowStock ? 'bg-red-500/[0.03]' : (darkMode ? 'hover:bg-white/[0.01]' : 'hover:bg-slate-50')}`}>
                                            <td className="px-6 py-5">
                                                <div className={`font-black text-xs tracking-tight flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}{isLowStock && <span className="px-1.5 py-0.5 bg-red-600 text-white text-[8px] font-black rounded ">Alert</span>}</div>
                                                <div className={`text-[9px] font-bold mt-1 tracking-wider flex items-center gap-1.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}><Hash className="w-3 h-3" /> {item.hsn || '---'}</div>
                                            </td>
                                            <td className="px-6 py-5 text-center"><span className={`text-sm font-black tabular-nums ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`}>{item.quantity}</span></td>
                                            <td className="px-6 py-5 text-center"><span className="text-sm font-black text-emerald-500 tabular-nums">₹{item.price?.toLocaleString()}</span></td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => handleEditClick(item)} className={`p-2.5 ${darkMode ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-slate-100 border-slate-200 text-indigo-600'} border rounded-xl transition-all active:scale-90`}><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteClick(item._id || item.id, item.name)} disabled={loading} className={`p-2.5 ${darkMode ? 'bg-slate-800 border-slate-700 text-red-400' : 'bg-slate-100 border-slate-200 text-red-600'} border rounded-xl transition-all active:scale-90`}><Trash2 className="w-4 h-4" /></button>
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
                                <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-slate-800' : 'border-slate-200'} rounded-2xl`}><Package className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" /><p className="text-[10px] font-black text-slate-500  tracking-widest">No Records Found</p></div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* --- MODALS --- */}
            {isFormModalOpen && (
                <section className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 overflow-y-auto">
                    <form onSubmit={handleFormSubmit} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl`}>
                        <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
                            <h2 className={`text-sm font-black  tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>{isEditing ? 'Modify' : 'Initialize'} Asset</h2>
                            <button type="button" onClick={closeFormModal} className="p-2 hover:bg-red-500/10 rounded-xl text-gray-500"><X className="w-5 h-5" /></button>
                        </div>
                        <div className={`p-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${darkMode ? 'bg-slate-950/20' : 'bg-slate-50/50'}`}>
                            <div className="md:col-span-2"><InputField label="Asset Description" name="name" type="text" value={formData.name} onChange={handleInputChange} darkMode={darkMode} required /></div>
                            <InputField label="Unit Valuation (₹)" name="price" type="number" value={formData.price} onChange={handleInputChange} darkMode={darkMode} required />
                            <InputField label="Initial Stock" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} darkMode={darkMode} required />
                            <InputField label="Reorder Alert" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} darkMode={darkMode} />
                            <InputField label="HSN / Barcode Index" name="hsn" type="text" value={formData.hsn} onChange={handleInputChange} darkMode={darkMode} />
                        </div>
                        <div className={`p-6 border-t ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-100'}`}>
                            <button type="submit" disabled={loading || !formData.name} className={`w-full py-4 text-white text-[10px] font-black  tracking-[0.2em] rounded-xl transition-all shadow-lg ${isEditing ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isEditing ? 'Confirm Modifications' : 'Commit to Database')}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            {isConfirmModalOpen && (
                <section className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[210] p-4">
                    <div className={`${darkMode ? 'bg-slate-900 border-red-500/20' : 'bg-white border-slate-200'} w-full max-w-sm rounded-2xl border p-8 text-center space-y-6 shadow-2xl`}>
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20"><AlertTriangle className="w-8 h-8 text-red-500" /></div>
                        <div><h2 className={`text-sm font-black  tracking-widest ${darkMode ? 'text-white' : 'text-slate-900'}`}>Authorize Purge</h2><p className="text-[10px] font-bold text-slate-500  tracking-widest mt-3 leading-relaxed">Permanent deletion of <br/><span className={darkMode ? 'text-white' : 'text-indigo-600'}>{itemToDelete?.name}</span>?</p></div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsConfirmModalOpen(false)} className={`flex-1 py-3.5 ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} text-[9px] font-black  tracking-widest rounded-xl`}>Cancel</button>
                            <button onClick={confirmDeleteItem} className="flex-1 py-3.5 bg-red-600 text-white text-[9px] font-black  tracking-widest rounded-xl shadow-lg shadow-red-500/20">Purge Record</button>
                        </div>
                    </div>
                </section>
            )}

            {loading && !isFormModalOpen && !isBulkUploadModalOpen && (
                <div className="fixed bottom-6 right-6 bg-indigo-600 text-white px-6 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-5">
                    <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[9px] font-black  tracking-[0.2em]">Synchronizing Records</span>
                </div>
            )}

            <ScannerModal isOpen={isScannerModalOpen} inventory={inventory} onClose={closeScannerModal} onScanSuccess={handleScannedItemSuccess} onScanNotFound={handleScannedItemNotFound} darkMode={darkMode} />
            <BulkUploadModal isOpen={isBulkUploadModalOpen} onClose={closeBulkUploadModal} onSubmit={handleBulkUpload} loading={loading} darkMode={darkMode} />
        </div>
    );
};

export default InventoryContent;