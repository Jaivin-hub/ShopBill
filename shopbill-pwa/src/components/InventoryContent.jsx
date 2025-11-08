import React, { useState, useRef, useEffect } from 'react';
import { Package, Plus, AlertTriangle, Edit, Trash2, X, Search, ListOrdered, Loader, ScanLine, Upload } from 'lucide-react'; 
import ScannerModal from './ScannerModal'; 

// =========================================================================
// BulkUploadModal Component (UNMODIFIED)
// =========================================================================
const BulkUploadModal = ({ isOpen, onClose, onSubmit, loading }) => {
    const [csvData, setCsvData] = useState('');
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);

    // ONLY name, price, and quantity are REQUIRED. 
    // reorderLevel and hsn are OPTIONAL in the parsing logic.
    const requiredHeaders = ["name", "price", "quantity"];
    const allExpectedHeaders = ["name", "price", "quantity", "reorderLevel", "hsn"];

    useEffect(() => {
        if (!isOpen) {
            setCsvData('');
            setFile(null);
            setError(null);
        }
    }, [isOpen]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.name.endsWith('.csv')) {
            setFile(selectedFile);
            setError(null);
            const reader = new FileReader();
            reader.onload = (event) => {
                setCsvData(event.target.result);
            };
            reader.readAsText(selectedFile);
        } else {
            setFile(null);
            setCsvData('');
            setError('Please select a valid CSV file.');
        }
    };

    const parseCSV = (text) => {
        const lines = text.trim().split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            setError('CSV must contain a header row and at least one data row.');
            return null;
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        
        // --- UPDATED VALIDATION LOGIC ---
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            setError(`Missing required CSV columns: ${missingHeaders.join(', ')}. Please ensure the first row contains: ${requiredHeaders.join(', ')}`);
            return null;
        }

        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const item = {};
            
            // Map values to the appropriate header key
            for (let j = 0; j < headers.length; j++) {
                // Use the lowercase, trimmed header
                item[headers[j]] = values[j] ? values[j].trim() : ''; 
            }
            
            // Get values using the expected keys, falling back to defaults
            const name = item.name;
            // Use logical OR for safe defaults if column is missing or value is empty
            const price = parseFloat(item.price || 0);
            const quantity = parseInt(item.quantity || 0);
            const reorderLevel = parseInt(item.reorderlevel || 5); // Use 5 as default if not present or invalid
            const hsn = item.hsn || '';

            // Final validation: Ensure name is present and numbers are valid
            if (name && !isNaN(price) && !isNaN(quantity) && price >= 0 && quantity >= 0) {
                 result.push({
                    name,
                    price,
                    quantity,
                    reorderLevel,
                    hsn,
                 });
            } else {
                 // Log or track invalid rows if needed
                 console.warn(`Skipping invalid row ${i+1} due to bad data: ${lines[i]}`);
            }
        }
        
        if (result.length === 0) {
            setError('No valid product data found in the CSV file. Check if name, price, and quantity are valid for all rows.');
            return null;
        }

        return result;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);

        if (!csvData) {
            return setError('Please upload a CSV file or paste data.');
        }

        const items = parseCSV(csvData);

        if (items) {
            onSubmit(items);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
             <form onSubmit={handleSubmit} 
                className="bg-gray-800 w-full max-w-lg md:max-w-xl rounded-xl shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-[90vh] overflow-y-auto border border-teal-700">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-teal-900/40 rounded-t-xl sticky top-0 z-10">
                    <h2 className="text-xl font-bold text-teal-300 flex items-center">
                        <Upload className="w-5 h-5 mr-2" /> Bulk Inventory Upload (CSV)
                    </h2>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-gray-300 text-sm">Upload a CSV file or paste the data below. <strong>Required columns: name, price, quantity</strong>. Optional: reorderLevel, hsn.</p>
                    
                    <div>
                        <label htmlFor="csv-file" className="block text-sm font-medium text-gray-300 mb-1">
                            Select CSV File
                        </label>
                        <input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 bg-gray-700 p-2 rounded-lg border border-gray-600"
                        />
                    </div>

                    <label htmlFor="csv-data" className="block text-sm font-medium text-gray-300 mb-1">
                        Or Paste CSV Data Directly
                    </label>
                    <textarea
                        id="csv-data"
                        value={csvData}
                        onChange={(e) => { setCsvData(e.target.value); setError(null); setFile(null); }}
                        placeholder={allExpectedHeaders.join(', ') + '\nProduct A, 10.50, 100, 10, 8421'}
                        rows="6"
                        className="w-full p-3 border border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition-colors bg-gray-700 text-gray-200 placeholder-gray-500 font-mono text-xs"
                    ></textarea>

                    {error && (
                        <div className="p-3 bg-red-900/30 text-red-300 rounded-lg flex items-start">
                            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className='text-sm'>{error}</span>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-gray-700">
                    <button 
                        type="submit"
                        className="w-full py-3 text-white rounded-xl font-extrabold text-lg shadow-2xl bg-teal-600 hover:bg-teal-700 shadow-teal-900/50 transition flex items-center justify-center disabled:opacity-50 active:scale-[0.99]"
                        disabled={loading || !csvData}
                    >
                        {loading 
                            ? <Loader className='w-5 h-5 mr-2 animate-spin' />
                            : 'Upload & Add Items'
                        }
                    </button>
                </div>
            </form>
        </div>
    );
}

// =========================================================================
// InventoryListCard and InputField (UNMODIFIED)
// =========================================================================
const InputField = ({ label, name, type, value, onChange, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-700 text-gray-200 placeholder-gray-500"
            {...props}
        />
    </div>
);
const InventoryListCard = ({ item, handleEditClick, handleDeleteClick, loading }) => {
    const itemId = item._id || item.id;
    const isLowStock = item.quantity <= item.reorderLevel;
    return (
        <div 
    key={itemId} 
    className={`bg-gray-900 p-4 rounded-xl shadow-lg border transition duration-150 ${
        isLowStock 
            ? 'border-red-700/50 bg-red-900/10' 
            : 'border-gray-800 hover:shadow-2xl'
    }`}>
    <div className="flex justify-between items-start mb-2 border-b border-gray-700 pb-2">
        
        {/* FIX APPLIED HERE: Added 'min-w-0' to this div */}
        <div className="min-w-0"> 
            <p className="text-base font-semibold text-gray-200 truncate max-w-[180px]">{item.name}</p>
            <span className="text-xs text-gray-400 flex items-center mt-0.5">HSN: {item.hsn.length > 15 ? `${item.hsn.slice(0, 10)}...` : item.hsn}</span>
        </div>
        
        <div className="text-right">
            <span className="text-lg font-bold text-teal-400 whitespace-nowrap">
                ₹{item.price ? item.price.toFixed(2) : '0.00'}
            </span>
            {isLowStock && (
                <span className="block text-xs text-red-400 flex items-center justify-end mt-1">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                </span>
            )}
        </div>
    </div>
    <div className="flex justify-between items-center pt-2">
        <p className={`text-sm font-medium ${isLowStock ? 'text-red-300' : 'text-indigo-400'}`}>
            Stock: <span className="font-bold">{item.quantity}</span>
            {isLowStock && (
                <span className="text-xs ml-2 text-gray-400">(Reorder: {item.reorderLevel})</span>
            )}
        </p>
        
        <div className="flex space-x-2">
            <button 
                className="text-indigo-400 hover:text-white hover:bg-indigo-600 p-2 rounded-full transition-colors duration-200 shadow-sm"
                title="Edit Item"
                onClick={() => handleEditClick(item)}
            >
                <Edit className="w-4 h-4" />
            </button>
            <button 
                className="text-red-400 hover:text-white hover:bg-red-600 p-2 rounded-full transition-colors duration-200 shadow-sm"
                title="Delete Item"
                onClick={() => handleDeleteClick(item._id || item.id, item.name)}
                disabled={loading}
            >
                <Trash2 className="w-4 h-4" />
            </button>
        </div>
    </div>
</div>
    );
};
// =========================================================================
// InventoryContent Component (UPDATED SCANNING LOOKUP LOGIC)
// =========================================================================
const InventoryContent = ({
    inventory,
    loading,
    isFormModalOpen,
    isConfirmModalOpen,
    isBulkUploadModalOpen, 
    formData,
    isEditing,
    itemToDelete,
    searchTerm,
    sortOption,
    showStickySearch,
    setSearchTerm,
    setSortOption,
    handleEditClick,
    handleDeleteClick,
    closeFormModal,
    handleInputChange,
    handleFormSubmit,
    confirmDeleteItem,
    setIsConfirmModalOpen,
    openAddModal, 
    openBulkUploadModal, 
    closeBulkUploadModal, 
    handleBulkUpload, 
    setFormData, 
}) => {
    const mockSetFormData = setFormData;
    console.log('inventory===',inventory)
    
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const openScannerModal = () => setIsScannerModalOpen(true);
    const closeScannerModal = () => setIsScannerModalOpen(false);
    
    // --- Scanning Handlers (MODIFIED: Lookup fix) ---
    const handleScannedItemSuccess = (scannedItem) => {
        console.log('scanned item====',scannedItem)
        // Use the code that came back from the lookup, which is the scanned item's identifier
        const uniqueCode = scannedItem.hsn || scannedItem.barcode; 
        
        // Ensure the code exists before proceeding
        if (!uniqueCode) {
            closeScannerModal();
            return handleScannedItemError("Scanned item data missing unique identifier.");
        }
        
        // CRITICAL FIX: Find the item in the local inventory using the HSN/Unique Code.
        // We trim/normalize the codes for a safer comparison, even with URLs.
        const normalizedUniqueCode = uniqueCode.toLowerCase().trim();
        const existingItem = inventory.find(item => 
            item.hsn && item.hsn.toLowerCase().trim() === normalizedUniqueCode
        );
        
        // 2. Close Scanner (Crucial for the modal cleanup)
        closeScannerModal(); 

        if (existingItem) {
            // 3. EXISTING ITEM: Open Edit Modal directly and pre-fill data 
            handleEditClick(existingItem); 
        } else {
             // 4. NEW ITEM: Open Add Modal, pre-filled with the scanned HSN and other data
             handleScannedItemNotFound(uniqueCode, scannedItem); 
        }
    };

    const handleScannedItemNotFound = (uniqueCode, prefillData = {}) => {
        // 1. Close Scanner (Crucial for the modal cleanup)
        closeScannerModal();
        
        // 2. Open Add Item Modal
        openAddModal(); 
        
        // 3. Pre-fill the form data using the unique code and any other data returned by the lookup
        mockSetFormData(prev => ({
            ...prev,
            ...prefillData, 
            hsn: prefillData.hsn || uniqueCode || '', 
            price: prefillData.price || prev.price || 0,
            quantity: prefillData.quantity || prev.quantity || 0,
            reorderLevel: prefillData.reorderLevel || prev.reorderLevel || 5, 
        }));
    };

    const handleScannedItemError = (errorMessage) => {
        console.error("Scanning Error:", errorMessage);
        // The ScannerModal will show the error, no need to do anything here except close if necessary.
        // For hard errors, we rely on the user to manually close the ScannerModal after seeing the error message.
    };
    // --- End Scanning Handlers ---

    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const sortDropdownRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setIsSortDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const handleSortSelect = (optionValue) => {
        setSortOption(optionValue);
        setIsSortDropdownOpen(false);
    };
    const sortOptions = [
        { value: 'default', label: 'Sort: Name (A-Z)' },
        { value: 'low-stock', label: 'Sort: Low Stock / Out of Stock' },
    ];
    const currentSortLabel = sortOptions.find(opt => opt.value === sortOption)?.label;

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 transition-colors duration-300">
            <h1 className="text-3xl font-extrabold text-white mb-2">Inventory Management</h1>
            <p className="text-gray-400 mb-6">Detailed product configuration and stock levels.</p>
            {/* Sticky Search Bar (remains the same) */}
            <div className={`
                fixed top-16 left-0 right-0 z-20 
                md:ml-64 
                px-4 md:px-8 
                py-3 
                bg-gray-950 
                border-b border-gray-700 
                shadow-xl shadow-gray-900/50
                transition-all duration-300 
                ${showStickySearch ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
            `}>
                <div className="flex space-x-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search items by name or HSN code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-md"
                        />
                        {searchTerm && (
                            <button 
                                type="button" 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                title="Clear Search"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="relative" ref={sortDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                            className="w-full pl-3 pr-8 py-2.5 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-md text-sm font-medium flex items-center h-full"
                        >
                            {currentSortLabel}
                            <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        </button>
                        
                        {isSortDropdownOpen && (
                            <div className="absolute right-0 z-30 w-56 mt-1 rounded-lg shadow-2xl bg-gray-800 border border-indigo-500 overflow-hidden">
                                {sortOptions.map(option => (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSortSelect(option.value)}
                                        className={`px-4 py-2 cursor-pointer text-sm font-medium transition-colors 
                                            ${option.value === sortOption 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'text-gray-200 hover:bg-gray-700'
                                            }`}
                                    >
                                        {option.label}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className={`${showStickySearch ? 'mb-16' : ''}`}></div> 
            
            {/* Desktop View */}
            <div className="hidden lg:block bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 border border-gray-800">  
                 <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-xl font-bold flex items-center text-indigo-400">
                        <Package className="w-5 h-5 mr-2" /> Total Inventory Items ({inventory.length})
                    </h3>
                    <div className="flex space-x-3">
                        <div className="relative hidden xl:block" ref={sortDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                className="w-full pl-3 pr-8 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-800 text-gray-200 text-sm font-medium flex items-center"
                            >
                                {currentSortLabel}
                                <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                            </button>
                            {isSortDropdownOpen && (
                                <div className="absolute right-0 z-30 w-56 mt-1 rounded-lg shadow-2xl bg-gray-800 border border-indigo-500 overflow-hidden">
                                    {sortOptions.map(option => (
                                        <div
                                            key={option.value}
                                            onClick={() => handleSortSelect(option.value)}
                                            className={`px-4 py-2 cursor-pointer text-sm font-medium transition-colors 
                                                ${option.value === sortOption 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'text-gray-200 hover:bg-gray-700'
                                                }`}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button 
                            className="bg-cyan-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-cyan-700 transition flex items-center disabled:opacity-50"
                            onClick={openScannerModal} 
                            disabled={loading}
                            title="Scan Item Barcode/QR"
                        >
                            <ScanLine className="w-4 h-4" />
                            <span className="ml-2">Scan</span>
                        </button>
                        <button 
                            className="bg-teal-700 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-teal-800 transition flex items-center disabled:opacity-50"
                            onClick={openBulkUploadModal}
                            disabled={loading}
                        >
                            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                        </button>
                        <button 
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition flex items-center disabled:opacity-50"
                            onClick={openAddModal}
                            disabled={loading}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </button>
                    </div>
                </div>
                {/* Table View (remains the same) */}
                <div className="max-h-[60vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-800 sticky top-0 z-10 shadow-lg shadow-gray-900/10">
                                <tr>
                                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Item Name/HSN</th>
                                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Stock</th>
                                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                                    <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900 divide-y divide-gray-800">
                                {inventory.map(item => {
                                    const itemId = item._id || item.id;
                                    const isLowStock = item.quantity <= item.reorderLevel;
                                    return (
                                    <tr 
                                        key={itemId} 
                                        className={`transition duration-150 ${isLowStock ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-gray-800'}`}>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                                            {item.name}
                                            <span className="block text-xs text-gray-500">HSN: {item.hsn.length > 15 ? `${item.hsn.slice(0, 15)}...` : item.hsn}</span>
                                            {isLowStock && (
                                                <span className="block text-xs text-red-400 flex items-center mt-1">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock! (Reorder Lvl: {item.reorderLevel})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-200">
                                            {item.quantity}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center text-teal-400 font-semibold">
                                            ₹{item.price ? item.price.toFixed(2) : '0.00'}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                    className="text-indigo-400 hover:text-white hover:bg-indigo-600 p-2 rounded-full transition"
                                                    title="Edit Item"
                                                    onClick={() => handleEditClick(item)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="text-red-400 hover:text-white hover:bg-red-600 p-2 rounded-full transition"
                                                    title="Delete Item"
                                                    onClick={() => handleDeleteClick(itemId, item.name)}
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Mobile/Card View (remains the same) */}
            <div className="lg:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center text-indigo-400">
                        <Package className="w-4 h-4 mr-2" /> Inventory List ({inventory.length})
                    </h3>
                    <div className="flex space-x-2">
                        <button 
                            className="bg-cyan-600 text-white px-2 py-1.5 rounded-lg shadow-md hover:bg-cyan-700 transition flex items-center text-sm disabled:opacity-50"
                            onClick={openScannerModal}
                            disabled={loading}
                            title="Scan Item"
                        >
                            <ScanLine className="w-4 h-4" />
                        </button>
                        <button 
                            className="bg-teal-700 text-white px-2 py-1.5 rounded-lg shadow-md hover:bg-teal-800 transition flex items-center text-sm disabled:opacity-50"
                            onClick={openBulkUploadModal}
                            disabled={loading}
                            title="Bulk Upload"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                        <button 
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center text-sm disabled:opacity-50"
                            onClick={openAddModal}
                            disabled={loading}
                            title="Add New Item">
                            <Plus className="w-4 h-4" /> <span className="hidden sm:inline ml-1">Add Item</span>
                        </button>
                    </div>
                </div>
                {!showStickySearch && (
                    <div className="flex gap-3 mb-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-sm text-sm"
                            />
                            {searchTerm && (
                                <button 
                                    type="button" 
                                    onClick={() => setSearchTerm('')} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-200"
                                    title="Clear Search"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        <div className="relative" ref={sortDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                className="w-full pl-3 pr-8 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-sm text-sm font-medium flex items-center h-full whitespace-nowrap"
                            >
                                {currentSortLabel.replace('Sort: ', '')} 
                                <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                            </button>
                            
                            {isSortDropdownOpen && (
                                <div className="absolute right-0 z-30 w-56 mt-1 rounded-lg shadow-2xl bg-gray-800 border border-indigo-500 overflow-hidden">
                                    {sortOptions.map(option => (
                                        <div
                                            key={option.value}
                                            onClick={() => handleSortSelect(option.value)}
                                            className={`px-4 py-2 cursor-pointer text-sm font-medium transition-colors 
                                                ${option.value === sortOption 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'text-gray-200 hover:bg-gray-700'
                                                }`}
                                        >
                                            {option.label.replace('Sort: ', '')}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pb-4"> 
                    {inventory.map(item => (
                        <InventoryListCard 
                            key={item._id || item.id} 
                            item={item} 
                            handleEditClick={handleEditClick}
                            handleDeleteClick={handleDeleteClick}
                            loading={loading}
                        />
                    ))}
                </div>
            </div>
            
            {/* Single Add/Edit Modal (remains the same) */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity">
                    <form onSubmit={handleFormSubmit} 
                        className="bg-gray-800 w-full max-w-sm sm:max-w-md md:max-w-xl rounded-xl shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-[90vh] overflow-y-auto border border-indigo-700">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-indigo-300 flex items-center">
                                {isEditing ? <Edit className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />} 
                                {isEditing ? `Edit Item: ${formData.name}` : 'Add New Inventory Item'}
                            </h2>
                            <button type="button" onClick={closeFormModal} className="text-gray-400 hover:text-white p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Product Name" name="name" type="text" value={formData.name} onChange={handleInputChange} required />
                            <InputField label="Selling Price (₹)" name="price" type="number" value={formData.price} onChange={handleInputChange} min="0" required />
                            <InputField label="Current Stock Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} min="0" required />
                            <InputField label="Reorder Level" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} min="0" required />
                            <InputField label="HSN/SAC Code (Optional)" name="hsn" type="text" value={formData.hsn} onChange={handleInputChange} placeholder="e.g., 0401" />
                        </div>
                        <div className="p-5 border-t border-gray-700">
                            <button 
                                type="submit"
                                className={`w-full py-3 text-white rounded-xl font-extrabold text-lg shadow-2xl hover:bg-teal-700 transition flex items-center justify-center disabled:opacity-50 active:scale-[0.99] ${
                                    isEditing 
                                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/50' 
                                        : 'bg-teal-600 hover:bg-teal-700 shadow-teal-900/50'
                                }`}
                                disabled={loading || !formData.name || formData.price <= 0 || formData.quantity < 0}
                            >
                                {loading 
                                    ? <Loader className='w-5 h-5 mr-2 animate-spin' />
                                    : (isEditing ? 'Confirm & Update Item' : 'Confirm & Save Item')
                                }
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {/* Confirmation Modal (remains the same) */}
            {isConfirmModalOpen && itemToDelete && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-gray-900 w-full max-w-sm rounded-xl shadow-2xl transform transition-transform duration-300 border border-red-700">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-red-900/20 rounded-t-xl">
                            <h2 className="text-xl font-bold text-red-300 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Confirm Deletion</h2>
                            <button type="button" onClick={() => setIsConfirmModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-gray-300">
                                Are you sure you want to permanently delete the item: <strong className="font-semibold text-white">{itemToDelete.name}</strong>? 
                                This action cannot be undone.
                            </p>
                        </div>
                        <div className="p-5 border-t border-gray-700 flex justify-end space-x-3">
                            <button 
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteItem}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition flex items-center disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? <Loader className='w-5 h-5 mr-2 animate-spin' /> : 'Delete Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Global Loading Overlay (remains the same) */}
            {loading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-gray-900 p-6 rounded-xl shadow-2xl text-indigo-400 flex items-center border border-gray-700">
                         <Loader className='w-6 h-6 mr-3 animate-spin' /> Processing request...
                    </div>
                </div>
            )}
            
            {/* Scanner Modal (remains the same) */}
            <ScannerModal 
                isOpen={isScannerModalOpen}
                inventory={inventory}
                onClose={closeScannerModal}
                onScanSuccess={handleScannedItemSuccess}
                onScanError={handleScannedItemError}
                onScanNotFound={handleScannedItemNotFound} 
            />
            
            {/* NEW: Bulk Upload Modal */}
            <BulkUploadModal
                isOpen={isBulkUploadModalOpen}
                onClose={closeBulkUploadModal}
                onSubmit={handleBulkUpload}
                loading={loading}
            />
        </div>
    );
};

export default InventoryContent;