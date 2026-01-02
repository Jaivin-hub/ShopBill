import React, { useState, useRef, useEffect } from 'react';
import { Package, Plus, AlertTriangle, Edit, Trash2, X, Search, ListOrdered, Loader, ScanLine, Upload } from 'lucide-react'; 
import ScannerModal from './ScannerModal'; 
const BulkUploadModal = ({ isOpen, onClose, onSubmit, loading }) => {
    const [csvData, setCsvData] = useState('');
    const [file, setFile] = useState(null);
    const [error, setError] = useState(null);
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
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
        if (missingHeaders.length > 0) {
            setError(`Missing required CSV columns: ${missingHeaders.join(', ')}. Please ensure the first row contains: ${requiredHeaders.join(', ')}`);
            return null;
        }
        const result = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',');
            const item = {};
            for (let j = 0; j < headers.length; j++) {
                item[headers[j]] = values[j] ? values[j].trim() : ''; 
            }
            const name = item.name;
            const price = parseFloat(item.price || 0);
            const quantity = parseInt(item.quantity || 0);
            const reorderLevel = parseInt(item.reorderlevel || 5);
            const hsn = item.hsn || '';
            if (name && !isNaN(price) && !isNaN(quantity) && price >= 0 && quantity >= 0) {
                 result.push({
                    name,
                    price,
                    quantity,
                    reorderLevel,
                    hsn,
                 });
            } else {
                 console.warn(`Skipping invalid row ${i+1} due to bad data: ${lines[i]}`);
            }
        }
        if (result.length === 0) {
            setError('No valid product data found in the CSV file.');
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
        <section className="fixed inset-0 bg-gray-900/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" role="dialog" aria-modal="true" aria-labelledby="bulk-upload-title">
             <form onSubmit={handleSubmit} 
                className="bg-gray-800 w-full max-w-lg md:max-w-xl rounded-xl shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-[90vh] overflow-y-auto border border-teal-700">
                <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-teal-900/40 rounded-t-xl sticky top-0 z-10">
                    <h2 id="bulk-upload-title" className="text-xl font-bold text-teal-300 flex items-center">
                        <Upload className="w-5 h-5 mr-2" /> Bulk Inventory Upload (CSV)
                    </h2>
                    <button type="button" onClick={onClose} aria-label="Close bulk upload" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <p className="text-gray-700 dark:text-gray-300 text-sm">Upload a CSV file or paste the data below. <strong>Required columns: name, price, quantity</strong>.</p>
                    <div>
                        <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select CSV File</label>
                        <input
                            id="csv-file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-600 dark:text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 bg-gray-50 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                    </div>
                    <div>
                        <label htmlFor="csv-data" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or Paste CSV Data Directly</label>
                        <textarea
                            id="csv-data"
                            value={csvData}
                            onChange={(e) => { setCsvData(e.target.value); setError(null); setFile(null); }}
                            placeholder={allExpectedHeaders.join(', ') + '\nProduct A, 10.50, 100, 10, 8421'}
                            rows="6"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-teal-500 focus:border-teal-500 transition-colors bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500 font-mono text-xs"
                        ></textarea>
                    </div>
                    {error && (
                        <div className="p-3 bg-red-900/30 text-red-300 rounded-lg flex items-start" role="alert">
                            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                            <span className='text-sm'>{error}</span>
                        </div>
                    )}
                </div>
                <div className="p-5 border-t border-gray-200 dark:border-gray-700">
                    <button 
                        type="submit"
                        className="w-full py-3 text-white rounded-xl font-extrabold text-lg shadow-2xl bg-teal-600 hover:bg-teal-700 shadow-teal-900/50 transition flex items-center justify-center disabled:opacity-50 active:scale-[0.99]"
                        disabled={loading || !csvData}
                    >
                        {loading ? <Loader className='w-5 h-5 mr-2 animate-spin' /> : 'Upload & Add Items'}
                    </button>
                </div>
            </form>
        </section>
    );
}
const InputField = ({ label, name, type, value, onChange, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
        </label>
        <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-500"
            {...props}
        />
    </div>
);
const InventoryListCard = ({ item, handleEditClick, handleDeleteClick, loading }) => {
    const itemId = item._id || item.id;
    const isLowStock = item.quantity <= item.reorderLevel;
    return (
        <article 
            key={itemId} 
            className={`bg-gray-100 dark:bg-gray-900 p-4 rounded-xl shadow-lg border transition duration-150 ${
                isLowStock 
                    ? 'border-red-300 dark:border-red-700/50 bg-red-50 dark:bg-red-900/10' 
                    : 'border-gray-200 dark:border-gray-800 hover:shadow-2xl'
            }`}>
            <div className="flex justify-between items-start mb-2 border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="min-w-0"> 
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-200 truncate max-w-[180px]">{item.name}</h4>
                    <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center mt-0.5">HSN: {item.hsn.length > 15 ? `${item.hsn.slice(0, 10)}...` : item.hsn}</span>
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
                        aria-label={`Edit ${item.name}`}
                        onClick={() => handleEditClick(item)}
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button 
                        className="text-red-400 hover:text-white hover:bg-red-600 p-2 rounded-full transition-colors duration-200 shadow-sm"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => handleDeleteClick(item._id || item.id, item.name)}
                        disabled={loading}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </article>
    );
};
const InventoryContent = ({
    inventory, loading, isFormModalOpen, isConfirmModalOpen, isBulkUploadModalOpen, formData, isEditing, itemToDelete, searchTerm, sortOption, showStickySearch, setSearchTerm, setSortOption, handleEditClick, handleDeleteClick, closeFormModal, handleInputChange, handleFormSubmit, confirmDeleteItem, setIsConfirmModalOpen, openAddModal, openBulkUploadModal, closeBulkUploadModal, handleBulkUpload, setFormData, 
}) => {
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const openScannerModal = () => setIsScannerModalOpen(true);
    const closeScannerModal = () => setIsScannerModalOpen(false);
    const handleScannedItemSuccess = (scannedItem) => {
        const uniqueCode = scannedItem.hsn || scannedItem.barcode; 
        if (!uniqueCode) {
            closeScannerModal();
            return;
        }
        const normalizedUniqueCode = uniqueCode.toLowerCase().trim();
        const existingItem = inventory.find(item => 
            item.hsn && item.hsn.toLowerCase().trim() === normalizedUniqueCode
        );
        closeScannerModal(); 
        if (existingItem) {
            handleEditClick(existingItem); 
        } else {
             handleScannedItemNotFound(uniqueCode, scannedItem); 
        }
    };
    const handleScannedItemNotFound = (uniqueCode, prefillData = {}) => {
        closeScannerModal();
        openAddModal(); 
        setFormData(prev => ({
            ...prev,
            ...prefillData, 
            hsn: prefillData.hsn || uniqueCode || '', 
            price: prefillData.price || prev.price || 0,
            quantity: prefillData.quantity || prev.quantity || 0,
            reorderLevel: prefillData.reorderLevel || prev.reorderLevel || 5, 
        }));
    };
    const handleScannedItemError = () => {};
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
        <main className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 transition-colors duration-300" itemScope itemType="https://schema.org/ItemList">
            <header itemProp="headline">
                <h1 className="text-3xl font-extrabold text-white">Inventory Management</h1>
                <p className="text-sm text-gray-400 mb-4" itemProp="description">Detailed product configuration and stock levels.</p>
            </header>
            <section className={`
                fixed top-16 left-0 right-0 z-20 
                md:ml-64 
                px-4 md:px-8 
                py-3 
                bg-white dark:bg-gray-950 
                border-b border-gray-200 dark:border-gray-700 
                shadow-xl dark:shadow-gray-900/50
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
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 shadow-md"
                        />
                        {searchTerm && (
                            <button 
                                type="button" 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                aria-label="Clear search"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <div className="relative" ref={sortDropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                            className="w-full pl-3 pr-8 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-200 shadow-md text-sm font-medium flex items-center h-full"
                        >
                            {currentSortLabel}
                            <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                        </button>
                        
                        {isSortDropdownOpen && (
                            <div className="absolute right-0 z-30 w-56 mt-1 rounded-lg shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-indigo-500 overflow-hidden">
                                {sortOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => handleSortSelect(option.value)}
                                        className={`w-full text-left px-4 py-2 cursor-pointer text-sm font-medium transition-colors 
                                            ${option.value === sortOption 
                                                ? 'bg-indigo-600 text-white' 
                                                : 'text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </section>
            <div className={`${showStickySearch ? 'mb-16' : ''}`}></div> 
            <div className="hidden lg:block bg-gray-100 dark:bg-gray-900 rounded-xl shadow-2xl dark:shadow-indigo-900/10 border border-gray-200 dark:border-gray-800">  
                 <header className="p-4 md:p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold flex items-center text-indigo-600 dark:text-indigo-400">
                        <Package className="w-5 h-5 mr-2" /> Total Inventory Items ({inventory.length})
                    </h2>
                    <div className="flex space-x-3">
                        <div className="relative hidden xl:block" ref={sortDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                className="cursor-pointer w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 text-sm font-medium flex items-center"
                            >
                                {currentSortLabel}
                                <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                            </button>
                            {isSortDropdownOpen && (
                                <div className="absolute right-0 z-30 w-56 mt-1 rounded-lg shadow-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-indigo-500 overflow-hidden">
                                    {sortOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleSortSelect(option.value)}
                                            className={`w-full text-left px-4 py-2 cursor-pointer text-sm font-medium transition-colors 
                                                ${option.value === sortOption 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'text-gray-900 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button 
                            className="bg-cyan-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-cyan-700 transition flex items-center disabled:opacity-50"
                            onClick={openScannerModal} 
                            disabled={loading}
                            aria-label="Scan item barcode"
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
                </header>
                <div className="max-h-[60vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-200 dark:bg-gray-800 sticky top-0 z-10 shadow-lg dark:shadow-gray-900/10">
                                <tr>
                                    <th scope="col" className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Item Name/HSN</th>
                                    <th scope="col" className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                                    <th scope="col" className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                    <th scope="col" className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                {inventory.map(item => {
                                    const itemId = item._id || item.id;
                                    const isLowStock = item.quantity <= item.reorderLevel;
                                    return (
                                    <tr 
                                        key={itemId} 
                                        className={`transition duration-150 ${isLowStock ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-gray-800'}`}>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                                            <div className="font-semibold">{item.name}</div>
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
                                                    aria-label={`Edit ${item.name}`}
                                                    onClick={() => handleEditClick(item)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="text-red-400 hover:text-white hover:bg-red-600 p-2 rounded-full transition"
                                                    aria-label={`Delete ${item.name}`}
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
            <section className="lg:hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center text-indigo-400">
                        <Package className="w-4 h-4 mr-2" /> Inventory List ({inventory.length})
                    </h3>
                    <div className="flex space-x-2">
                        <button 
                            className="bg-cyan-600 text-white px-2 py-1.5 rounded-lg shadow-md hover:bg-cyan-700 transition flex items-center text-sm disabled:opacity-50"
                            onClick={openScannerModal}
                            disabled={loading}
                            aria-label="Scan barcode"
                        >
                            <ScanLine className="w-4 h-4" />
                        </button>
                        <button 
                            className="bg-teal-700 text-white px-2 py-1.5 rounded-lg shadow-md hover:bg-teal-800 transition flex items-center text-sm disabled:opacity-50"
                            onClick={openBulkUploadModal}
                            disabled={loading}
                            aria-label="Bulk upload CSV"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                        <button 
                            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center text-sm disabled:opacity-50"
                            onClick={openAddModal}
                            disabled={loading}
                            aria-label="Add new item">
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
                                    aria-label="Clear search"
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
                                        <button
                                            key={option.value}
                                            onClick={() => handleSortSelect(option.value)}
                                            className={`w-full text-left px-4 py-2 cursor-pointer text-sm font-medium transition-colors 
                                                ${option.value === sortOption 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'text-gray-200 hover:bg-gray-700'
                                                }`}
                                        >
                                            {option.label.replace('Sort: ', '')}
                                        </button>
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
            </section>
            {isFormModalOpen && (
                <section className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
                    <form onSubmit={handleFormSubmit} 
                        className="bg-gray-800 w-full max-w-sm sm:max-w-md md:max-w-xl rounded-xl shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-[90vh] overflow-y-auto border border-indigo-700">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl sticky top-0 z-10">
                            <h2 id="form-modal-title" className="text-xl font-bold text-indigo-300 flex items-center">
                                {isEditing ? <Edit className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />} 
                                {isEditing ? `Edit Item: ${formData.name}` : 'Add New Inventory Item'}
                            </h2>
                            <button type="button" onClick={closeFormModal} aria-label="Close form" className="text-gray-400 hover:text-white p-1">
                                <X className="cursor-pointer w-6 h-6" />
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
                </section>
            )}
            {isConfirmModalOpen && itemToDelete && (
                <section className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity" role="alertdialog" aria-modal="true" aria-labelledby="confirm-delete-title">
                    <div className="bg-gray-900 w-full max-w-sm rounded-xl shadow-2xl transform transition-transform duration-300 border border-red-700">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-red-900/20 rounded-t-xl">
                            <h2 id="confirm-delete-title" className="text-xl font-bold text-red-300 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Confirm Deletion</h2>
                            <button type="button" onClick={() => setIsConfirmModalOpen(false)} aria-label="Cancel deletion" className="text-gray-400 hover:text-white p-1">
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
                </section>
            )}
            {loading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40" role="status" aria-live="polite">
                    <div className="bg-gray-900 p-6 rounded-xl shadow-2xl text-indigo-400 flex items-center border border-gray-700">
                         <Loader className='w-6 h-6 mr-3 animate-spin' /> Processing request...
                    </div>
                </div>
            )}
            <ScannerModal 
                isOpen={isScannerModalOpen}
                inventory={inventory}
                onClose={closeScannerModal}
                onScanSuccess={handleScannedItemSuccess}
                onScanError={handleScannedItemError}
                onScanNotFound={handleScannedItemNotFound} 
            />
            <BulkUploadModal
                isOpen={isBulkUploadModalOpen}
                onClose={closeBulkUploadModal}
                onSubmit={handleBulkUpload}
                loading={loading}
            />
        </main>
    );
};

export default InventoryContent;