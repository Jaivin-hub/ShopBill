import React, { useState, useRef, useEffect } from 'react';
import { 
    Package, Plus, AlertTriangle, Edit, Trash2, X, Search, 
    ListOrdered, Loader2, ScanLine, Upload, Hash, Layers, Bell, Info, 
    ChevronDown, ChevronUp, Settings2, ChevronRight
} from 'lucide-react';
import ScannerModal from './ScannerModal';

const ScrollbarStyles = ({ darkMode }) => (
    <style dangerouslySetInnerHTML={{
        __html: `
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
    const [showVariants, setShowVariants] = useState(false);
    const hasVariants = item.variants && item.variants.length > 0;
    
    // Calculate totals for products with variants
    const totalQuantity = hasVariants 
        ? item.variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
        : (item.quantity || 0);
    
    const priceRange = hasVariants && item.variants.length > 0
        ? {
            min: Math.min(...item.variants.map(v => v.price || 0)),
            max: Math.max(...item.variants.map(v => v.price || 0))
        }
        : null;
    
    // Check low stock - for variants, check each variant
    const isLowStock = hasVariants
        ? item.variants.some(v => {
            const variantReorderLevel = v.reorderLevel !== null && v.reorderLevel !== undefined 
                ? v.reorderLevel 
                : (item.reorderLevel || 5);
            return (v.quantity || 0) <= variantReorderLevel;
        })
        : (item.quantity || 0) <= (item.reorderLevel || 5);
    
    const cardBg = darkMode 
        ? (isLowStock ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/80 border-slate-800/50 hover:border-indigo-500/30') 
        : (isLowStock ? 'bg-red-50/80 border-red-200' : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300');
    
    return (
        <article className={`group rounded-xl border transition-all duration-200 hover:shadow-md ${cardBg}`}>
            <div className="p-3 md:p-4">
                {/* Mobile: Stacked Layout */}
                <div className="md:hidden space-y-3">
                    {/* Top Row: Name and Actions */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${isLowStock ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
                                <Package className={`w-3.5 h-3.5 ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className={`text-xs font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                        {item.name}
                                    </h4>
                                    {isLowStock && <Bell className="w-3 h-3 text-red-500 animate-pulse flex-shrink-0" />}
                                    {hasVariants && (
                                        <span className={`text-[7px] font-black px-1 py-0.5 rounded ${darkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                                            {item.variants.length}V
                                        </span>
                                    )}
                                </div>
                                {item.hsn && (
                                    <p className={`text-[8px] font-bold tracking-wider flex items-center gap-1 mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                        <Hash className="w-2.5 h-2.5" /> {item.hsn}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                            {hasVariants && (
                                <button
                                    onClick={() => setShowVariants(!showVariants)}
                                    className={`p-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg transition-all active:scale-90`}
                                >
                                    <ChevronDown className={`w-3.5 h-3.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'} transition-transform ${showVariants ? 'rotate-180' : ''}`} />
                                </button>
                            )}
                            <button 
                                onClick={() => handleEditClick(item)} 
                                className={`p-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg text-indigo-500 transition-all active:scale-90`}
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(item._id || item.id, item.name)} 
                                disabled={loading} 
                                className={`p-1.5 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'} rounded-lg text-red-500 transition-all active:scale-90`}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Stats Row: Compact Grid */}
                    <div className={`grid gap-2 ${hasVariants ? 'grid-cols-3' : 'grid-cols-3'}`}>
                        <div className="text-center p-2 rounded-lg bg-slate-950/30">
                            <p className={`text-[7px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock</p>
                            <p className={`text-sm font-black tabular-nums ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`}>
                                {totalQuantity}
                            </p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-950/30">
                            <p className={`text-[7px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reorder</p>
                            {hasVariants ? (
                                <p className={`text-[10px] font-black tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Varies
                                </p>
                            ) : (
                                <p className={`text-sm font-black tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {item.reorderLevel || 5}
                                </p>
                            )}
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-950/30">
                            <p className={`text-[7px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                            {hasVariants && priceRange ? (
                                <p className="text-sm font-black text-emerald-500 tabular-nums">
                                    {priceRange.min === priceRange.max 
                                        ? `₹${priceRange.min.toLocaleString()}`
                                        : `₹${priceRange.min.toLocaleString()}-${priceRange.max.toLocaleString()}`
                                    }
                                </p>
                            ) : (
                                <p className="text-sm font-black text-emerald-500 tabular-nums">
                                    ₹{item.price?.toLocaleString() || '0'}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desktop: Original Horizontal Layout */}
                <div className="hidden md:flex items-center justify-between gap-3">
                    {/* Left: Product Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isLowStock ? 'bg-red-500/10' : 'bg-indigo-500/10'}`}>
                            <Package className={`w-4 h-4 ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h4 className={`text-sm font-black tracking-tight truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    {item.name}
                                </h4>
                                {isLowStock && <Bell className="w-3.5 h-3.5 text-red-500 animate-pulse flex-shrink-0" />}
                                {hasVariants && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${darkMode ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                                        {item.variants.length} {item.variants.length === 1 ? 'Variant' : 'Variants'}
                                    </span>
                                )}
                            </div>
                            {item.hsn && (
                                <p className={`text-[9px] font-bold tracking-wider flex items-center gap-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                    <Hash className="w-3 h-3" /> {item.hsn}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Center: Stats */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-center">
                            <p className={`text-[8px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock</p>
                            <p className={`text-base font-black tabular-nums ${isLowStock ? 'text-red-500' : 'text-indigo-500'}`}>
                                {totalQuantity}
                            </p>
                        </div>
                        <div className="text-center">
                            <p className={`text-[8px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reorder</p>
                            {hasVariants ? (
                                <p className={`text-xs font-black tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    Varies
                                </p>
                            ) : (
                                <p className={`text-base font-black tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {item.reorderLevel || 5}
                                </p>
                            )}
                        </div>
                        <div className="text-center">
                            <p className={`text-[8px] font-black tracking-widest mb-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                            {hasVariants && priceRange ? (
                                <p className="text-base font-black text-emerald-500 tabular-nums">
                                    {priceRange.min === priceRange.max 
                                        ? `₹${priceRange.min.toLocaleString()}`
                                        : `₹${priceRange.min.toLocaleString()}-${priceRange.max.toLocaleString()}`
                                    }
                                </p>
                            ) : (
                                <p className="text-base font-black text-emerald-500 tabular-nums">
                                    ₹{item.price?.toLocaleString() || '0'}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex gap-1.5 flex-shrink-0">
                        {hasVariants && (
                            <button
                                onClick={() => setShowVariants(!showVariants)}
                                className={`p-2 ${darkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} rounded-lg transition-all active:scale-90`}
                                title={showVariants ? 'Hide Variants' : 'Show Variants'}
                            >
                                <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'} transition-transform ${showVariants ? 'rotate-180' : ''}`} />
                            </button>
                        )}
                        <button 
                            onClick={() => handleEditClick(item)} 
                            className={`p-2 ${darkMode ? 'bg-slate-800 hover:bg-indigo-600' : 'bg-slate-100 hover:bg-indigo-600'} rounded-lg text-indigo-500 hover:text-white transition-all active:scale-90`}
                            title="Edit"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => handleDeleteClick(item._id || item.id, item.name)} 
                            disabled={loading} 
                            className={`p-2 ${darkMode ? 'bg-slate-800 hover:bg-red-600' : 'bg-slate-100 hover:bg-red-600'} rounded-lg text-red-500 hover:text-white transition-all active:scale-90`}
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Variants List - Expandable */}
            {hasVariants && showVariants && (
                <div className={`px-3 md:px-4 pb-3 md:pb-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                    <div className="pt-2 md:pt-3 space-y-2">
                        {item.variants.map((variant, idx) => {
                            const variantReorderLevel = variant.reorderLevel !== null && variant.reorderLevel !== undefined 
                                ? variant.reorderLevel 
                                : (item.reorderLevel || 5);
                            const variantIsLowStock = (variant.quantity || 0) <= variantReorderLevel;
                            
                            return (
                                <div key={variant._id || idx} className={`p-2.5 md:p-3 rounded-lg border ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    {/* Mobile: Stacked Layout */}
                                    <div className="md:hidden space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-xs font-black ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    {variant.label}
                                                </span>
                                                {variantIsLowStock && <Bell className="w-3 h-3 text-red-500 animate-pulse flex-shrink-0" />}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="text-center p-1.5 rounded bg-slate-950/30">
                                                <p className={`text-[7px] font-black tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock</p>
                                                <p className={`text-xs font-black tabular-nums ${variantIsLowStock ? 'text-red-500' : 'text-indigo-500'}`}>
                                                    {variant.quantity || 0}
                                                </p>
                                            </div>
                                            <div className="text-center p-1.5 rounded bg-slate-950/30">
                                                <p className={`text-[7px] font-black tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reorder</p>
                                                <p className={`text-xs font-black tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {variantReorderLevel}
                                                </p>
                                            </div>
                                            <div className="text-center p-1.5 rounded bg-slate-950/30">
                                                <p className={`text-[7px] font-black tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                                                <p className="text-xs font-black text-emerald-500 tabular-nums">
                                                    ₹{variant.price?.toLocaleString() || '0'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Desktop: Horizontal Layout */}
                                    <div className="hidden md:flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className={`text-xs font-black ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                {variant.label}
                                            </span>
                                            {variantIsLowStock && <Bell className="w-3 h-3 text-red-500 animate-pulse flex-shrink-0" />}
                                        </div>
                                        <div className="flex items-center gap-4 flex-shrink-0">
                                            <div className="text-center">
                                                <p className={`text-[8px] font-black tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Stock</p>
                                                <p className={`text-sm font-black tabular-nums ${variantIsLowStock ? 'text-red-500' : 'text-indigo-500'}`}>
                                                    {variant.quantity || 0}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-[8px] font-black tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reorder</p>
                                                <p className={`text-sm font-black tabular-nums ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                    {variantReorderLevel}
                                                </p>
                                            </div>
                                            <div className="text-center">
                                                <p className={`text-[8px] font-black tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Price</p>
                                                <p className="text-sm font-black text-emerald-500 tabular-nums">
                                                    ₹{variant.price?.toLocaleString() || '0'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </article>
    );
};

const InventoryContent = ({
    inventory, loading, isFormModalOpen, isConfirmModalOpen, isBulkUploadModalOpen, formData, isEditing, itemToDelete, searchTerm, sortOption, setSearchTerm, setSortOption, handleEditClick, handleDeleteClick, closeFormModal, handleInputChange, handleFormSubmit, confirmDeleteItem, setIsConfirmModalOpen, openAddModal, openBulkUploadModal, closeBulkUploadModal, handleBulkUpload, setFormData, darkMode
}) => {
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const sortDropdownRef = useRef(null);
    const [hasVariants, setHasVariants] = useState(false);
    const [editingVariantIndex, setEditingVariantIndex] = useState(null);

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

    // Variant management functions
    useEffect(() => {
        if (formData.variants && formData.variants.length > 0) {
            setHasVariants(true);
        } else {
            setHasVariants(false);
        }
    }, [formData.variants]);

    const addVariant = () => {
        const newVariant = {
            _id: `variant-${Date.now()}-${Math.random()}`, // Unique ID for stable key
            label: '',
            price: 0,
            quantity: 0,
            reorderLevel: formData.reorderLevel || 5,
            hsn: formData.hsn || '',
            sku: ''
        };
        setFormData(prev => ({
            ...prev,
            variants: [...(prev.variants || []), newVariant]
        }));
        setEditingVariantIndex((formData.variants || []).length);
    };

    const updateVariant = (index, field, value) => {
        setFormData(prev => {
            const variants = [...(prev.variants || [])];
            variants[index] = { ...variants[index], [field]: value };
            return { ...prev, variants };
        });
    };

    const removeVariant = (index) => {
        setFormData(prev => ({
            ...prev,
            variants: (prev.variants || []).filter((_, i) => i !== index)
        }));
        if (editingVariantIndex === index) setEditingVariantIndex(null);
    };

    const toggleVariants = () => {
        if (hasVariants) {
            // Disable variants - clear them
            setFormData(prev => ({ ...prev, variants: [] }));
            setHasVariants(false);
        } else {
            // Enable variants - add one empty variant
            setHasVariants(true);
            addVariant();
        }
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
                    {/* Desktop & Tablet: Enhanced Card Grid Layout */}
                    <section className="hidden md:block pb-6">
                        <div className={`mb-6 flex items-center justify-between ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'} px-6 py-4 rounded-2xl border ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5 text-indigo-500" />
                                <h2 className={`text-[11px] font-black tracking-[0.2em] ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                    Master Registry
                                </h2>
                                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${darkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                                    {inventory.length} {inventory.length === 1 ? 'Asset' : 'Assets'}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {inventory.map(item => <InventoryListCard key={item._id || item.id} item={item} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick} loading={loading} darkMode={darkMode} />)}
                            {inventory.length === 0 && (
                                <div className={`col-span-full text-center py-20 border-2 border-dashed ${darkMode ? 'border-slate-800' : 'border-slate-200'} rounded-2xl`}>
                                    <Package className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                                    <p className="text-[10px] font-black text-slate-500 tracking-widest">No Records Found</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Mobile: Compact Card Layout */}
                    <section className="md:hidden pb-20">
                        <div className="grid grid-cols-1 gap-4">
                            {inventory.map(item => <InventoryListCard key={item._id || item.id} item={item} handleEditClick={handleEditClick} handleDeleteClick={handleDeleteClick} loading={loading} darkMode={darkMode} />)}
                            {inventory.length === 0 && (
                                <div className={`text-center py-20 border-2 border-dashed ${darkMode ? 'border-slate-800' : 'border-slate-200'} rounded-2xl`}>
                                    <Package className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                                    <p className="text-[10px] font-black text-slate-500 tracking-widest">No Records Found</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>

            {/* --- MODALS --- */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 overflow-x-hidden" onClick={(e) => e.target === e.currentTarget && closeFormModal()}>
                    <form onSubmit={handleFormSubmit} className={`${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transform transition-all`} onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center shrink-0 overflow-x-hidden`}>
                            <h3 className={`text-lg font-black truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {isEditing ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <button
                                type="button"
                                onClick={closeFormModal}
                                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form Fields - Scrollable */}
                        <div className="p-6 space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 min-h-0 overscroll-contain">
                            {/* Product Name */}
                            <div>
                                <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter product name"
                                    required
                                    className={`no-zoom-input w-full ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} px-4 py-3 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                />
                            </div>

                            {/* Variants Toggle */}
                            <div>
                                <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                    Product Variants
                                </label>
                                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Settings2 className={`w-5 h-5 ${hasVariants ? 'text-indigo-500' : 'text-slate-500'}`} />
                                            <div>
                                                <p className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                    Enable Variants
                                                </p>
                                                <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Different sizes, prices, or options
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={toggleVariants}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${hasVariants ? 'bg-indigo-600' : 'bg-slate-400'}`}
                                        >
                                            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${hasVariants ? 'translate-x-6' : 'translate-x-0'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Price and Stock - Only show if no variants */}
                            {!hasVariants && (
                                <>
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Price per Unit <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>₹</span>
                                            <input
                                                name="price"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.price}
                                                onChange={handleInputChange}
                                                placeholder="0.00"
                                                required
                                                className={`no-zoom-input w-full ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} pl-8 pr-4 py-3 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Current Stock <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            name="quantity"
                                            type="number"
                                            min="0"
                                            value={formData.quantity}
                                            onChange={handleInputChange}
                                            placeholder="0"
                                            required
                                            className={`no-zoom-input w-full ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} px-4 py-3 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Variants Management */}
                            {hasVariants && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={`text-xs font-bold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Variants
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addVariant}
                                            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> Add Variant
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {(formData.variants || []).map((variant, index) => (
                                            <div key={variant._id || `variant-${index}`} className={`p-4 rounded-xl border transition-all overflow-x-hidden ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                        Variant {index + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeVariant(index)}
                                                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className={`text-[10px] font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            Label (e.g., 500ml, 1L) *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={variant.label}
                                                            onChange={(e) => updateVariant(index, 'label', e.target.value)}
                                                            placeholder="500ml"
                                                            required
                                                            className={`w-full p-2.5 text-xs ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-lg focus:outline-none focus:border-indigo-500`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            Price (₹) *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            value={variant.price === 0 ? '' : variant.price}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || val === '0') {
                                                                    updateVariant(index, 'price', 0);
                                                                } else if (/^\d*\.?\d*$/.test(val)) {
                                                                    updateVariant(index, 'price', parseFloat(val) || 0);
                                                                }
                                                            }}
                                                            placeholder="0.00"
                                                            required
                                                            className={`w-full p-2.5 text-xs ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-lg focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            Current Stock *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={variant.quantity === 0 ? '' : variant.quantity}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || val === '0') {
                                                                    updateVariant(index, 'quantity', 0);
                                                                } else if (/^\d+$/.test(val)) {
                                                                    updateVariant(index, 'quantity', parseInt(val) || 0);
                                                                }
                                                            }}
                                                            placeholder="0"
                                                            required
                                                            className={`w-full p-2.5 text-xs ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-lg focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className={`text-[10px] font-bold mb-1 block ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                                                            Low Stock Alert
                                                        </label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={variant.reorderLevel || ''}
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    updateVariant(index, 'reorderLevel', null);
                                                                } else if (/^\d+$/.test(val)) {
                                                                    updateVariant(index, 'reorderLevel', parseInt(val));
                                                                }
                                                            }}
                                                            placeholder={formData.reorderLevel || '5'}
                                                            className={`w-full p-2.5 text-xs ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'} border rounded-lg focus:outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!formData.variants || formData.variants.length === 0) && (
                                            <div className={`text-center py-8 border-2 border-dashed rounded-xl ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                                <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No variants added. Click "Add Variant" to create one.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Reorder Level and HSN - Only show when no variants (each variant has its own reorder level) */}
                            {!hasVariants && (
                                <>
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Low Stock Alert
                                        </label>
                                        <input
                                            name="reorderLevel"
                                            type="number"
                                            min="0"
                                            value={formData.reorderLevel}
                                            onChange={handleInputChange}
                                            placeholder="5"
                                            className={`no-zoom-input w-full ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} px-4 py-3 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                        />
                                    </div>

                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            HSN Code / Barcode
                                        </label>
                                        <input
                                            name="hsn"
                                            type="text"
                                            value={formData.hsn}
                                            onChange={handleInputChange}
                                            placeholder="Optional"
                                            className={`no-zoom-input w-full ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} px-4 py-3 rounded-xl text-sm font-mono border focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                        />
                                    </div>
                                </>
                            )}

                            {/* HSN Code - Show as optional default when variants enabled (can be overridden per variant) */}
                            {hasVariants && (
                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        HSN Code / Barcode <span className="text-[10px] text-slate-500 font-normal">(Optional default for all variants)</span>
                                    </label>
                                    <input
                                        name="hsn"
                                        type="text"
                                        value={formData.hsn}
                                        onChange={handleInputChange}
                                        placeholder="Optional - Can be set per variant"
                                        className={`no-zoom-input w-full ${darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'} px-4 py-3 rounded-xl text-sm font-mono border focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className={`p-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex gap-3 shrink-0 overflow-x-hidden`}>
                            <button
                                type="button"
                                onClick={closeFormModal}
                                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                    darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !formData.name || (hasVariants && (!formData.variants || formData.variants.length === 0))}
                                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {isEditing ? 'Updating...' : 'Saving...'}
                                    </>
                                ) : (
                                    isEditing ? 'Update Product' : 'Add Product'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
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