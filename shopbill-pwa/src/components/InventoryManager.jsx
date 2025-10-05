import React, { useState, useEffect } from 'react';
// 🌟 Added ListOrdered for sort dropdown icon (optional, using Package for simplicity)
import { Package, Plus, AlertTriangle, Edit, Trash2, X, Search, ListOrdered } from 'lucide-react'; 
import axios from 'axios';
import API from '../config/api'

const USER_ROLES = {
  OWNER: 'owner', 
  CASHIER: 'cashier', 
};

// Initial state for a new/cleared item
const initialItemState = {
    name: '',
    price: 0,
    quantity: 0,
    reorderLevel: 5,
    hsn: ''
};

const InventoryManager = ({ inventory, userRole, refreshData, showToast }) => {
    const isOwner = userRole === USER_ROLES.OWNER;
    const [isFormModalOpen, setIsFormModalOpen] = useState(false); 
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState(initialItemState); 
    const [isEditing, setIsEditing] = useState(false); 
    
    // 🌟 EXISTING: State for search term
    const [searchTerm, setSearchTerm] = useState('');

    // 🌟 NEW: State for sorting
    const [sortOption, setSortOption] = useState('default'); // 'default', 'low-stock'

    // 🌟 EXISTING: State to control the visibility of the sticky search bar
    const [showStickySearch, setShowStickySearch] = useState(false);


    // 🌟 EXISTING: Scroll Effect to show/hide the sticky search bar
    useEffect(() => {
        // Only run this logic if the user is the owner and on this page
        if (!isOwner) return;

        const handleScroll = () => {
            // Check if the scroll container (main element) has scrolled past a threshold
            const mainContent = document.querySelector('main');
            if (mainContent) {
                // Determine a threshold (e.g., 100px)
                const scrollThreshold = 100; 
                setShowStickySearch(mainContent.scrollTop > scrollThreshold);
            }
        };

        // The main content area is the one with the scrollbar in the main App component
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
            return () => mainContent.removeEventListener('scroll', handleScroll);
        }
    }, [isOwner]); // Re-run effect if role changes

    if (!isOwner) {
        return (
            <div className="p-4 md:p-8 text-center h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Access Denied</h2>
                <p className="text-gray-500 dark:text-gray-400">Only the Owner role has permission to manage the full inventory.</p>
            </div>
        );
    }

    // --- Form Management Functions (Unchanged) ---
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' && name !== 'hsn' ? parseFloat(value) : value
        }));
    };
    
    const openAddModal = () => {
        setIsEditing(false);
        setFormData(initialItemState);
        setIsFormModalOpen(true);
    }

    const handleEditClick = (item) => {
        setIsEditing(true);
        setFormData({ 
            _id: item._id, 
            id: item.id,   
            name: item.name,
            price: item.price || 0,
            quantity: item.quantity || 0,
            reorderLevel: item.reorderLevel || 5,
            hsn: item.hsn || ''
        });
        setIsFormModalOpen(true);
    };

    const closeFormModal = () => {
        setIsFormModalOpen(false);
        setFormData(initialItemState);
        setIsEditing(false);
    }

    // --- API / Action Handlers (Unchanged) ---
    const handleAddItem = async () => { /* ... (axios POST logic) ... */
        setLoading(true);
        try {
            const dataToSend = { ...formData, _id: undefined, id: undefined }; 
            const response = await axios.post(`${API.inventory}`, dataToSend);
            showToast(`New item added: ${response.data.item.name}`, 'success');
            if (refreshData) { await refreshData(); }
            closeFormModal();
        } catch (error) {
            console.error('Add Item Error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Unknown error adding item.';
            showToast(`Error adding item: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleUpdateItem = async () => { /* ... (axios PUT logic) ... */
        setLoading(true);
        const itemId = formData._id || formData.id; 

        if (!itemId) {
            setLoading(false);
            return showToast('Error: Cannot update item without an ID.', 'error');
        }

        try {
            const { _id, id, ...dataToSend } = formData; 
            const response = await axios.put(`${API.inventory}/${itemId}`, dataToSend);
            showToast(`${response.data.item.name} updated successfully!`, 'success');
            if (refreshData) { await refreshData(); }
            closeFormModal();
        } catch (error) {
            console.error('Update Item Error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Unknown error updating item.';
            showToast(`Error updating item: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    }

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            handleUpdateItem();
        } else {
            handleAddItem();
        }
    }
    
    const handleDeleteClick = (itemId, itemName) => {
        setItemToDelete({ id: itemId, name: itemName });
        setIsConfirmModalOpen(true);
    }
    
    const confirmDeleteItem = async () => { /* ... (axios DELETE logic) ... */
        if (!itemToDelete) return;
        
        const { id: itemId, name: itemName } = itemToDelete;

        setIsConfirmModalOpen(false);
        setItemToDelete(null);

        setLoading(true);
        try {
            await axios.delete(`${API.inventory}/${itemId}`);
            showToast(`${itemName} deleted successfully.`, 'success');
            if (refreshData) { await refreshData(); }
        } catch (error) {
            console.error('Delete Item Error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Unknown error deleting item.';
            showToast(`Error deleting item: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    // 🌟 UPDATED: Search, Filter, and Sort Logic
    const sortedAndFilteredInventory = [...inventory]
        .filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (item.hsn && item.hsn.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            if (sortOption === 'low-stock') {
                const aIsLow = a.quantity <= a.reorderLevel;
                const bIsLow = b.quantity <= b.reorderLevel;
                
                // Low stock items (or out of stock) come first
                if (aIsLow && !bIsLow) return -1;
                if (!aIsLow && bIsLow) return 1;

                // Sort by quantity within the same group (lowest quantity first)
                if (a.quantity !== b.quantity) {
                    return a.quantity - b.quantity;
                }
            }
            // Default sort: alphabetical by name
            return a.name.localeCompare(b.name);
        });

    // InventoryListCard component (Unchanged)
    const InventoryListCard = ({ item }) => {
        const itemId = item._id || item.id;
        const isLowStock = item.quantity <= item.reorderLevel;

        return (
            <div 
                key={itemId} 
                className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border transition duration-150 ${
                    isLowStock 
                        ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10' 
                        : 'border-gray-100 dark:border-gray-700 hover:shadow-lg'
                }`}
            >
                <div className="flex justify-between items-start mb-2 border-b dark:border-gray-700 pb-2">
                    <div>
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-200 truncate max-w-[180px]">{item.name}</p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-0.5">HSN: {item.hsn}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-lg font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                            ₹{item.price ? item.price.toFixed(2) : '0.00'}
                        </span>
                        {isLowStock && (
                            <span className="block text-xs text-red-600 dark:text-red-400 flex items-center justify-end mt-1">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex justify-between items-center pt-2">
                    {/* text-indigo-600 remains from previous change */}
                    <p className={`text-sm font-medium ${isLowStock ? 'text-red-700 dark:text-red-300' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        Stock: <span className="font-bold">{item.quantity}</span>
                        {isLowStock && (
                            <span className="text-xs ml-2 text-gray-500 dark:text-gray-400">(Reorder: {item.reorderLevel})</span>
                        )}
                    </p>
                    
                    <div className="flex space-x-2">
                        <button 
                            className="text-indigo-600 hover:text-white hover:bg-indigo-600 p-2 rounded-full transition-colors duration-200 shadow-sm dark:text-indigo-400 dark:hover:text-white"
                            title="Edit Item"
                            onClick={() => handleEditClick(item)}
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button 
                            className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-full transition-colors duration-200 shadow-sm dark:text-red-400 dark:hover:text-white"
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

    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Inventory Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Detailed product configuration and stock levels.</p>
            
            {/* 🌟 Sticky Search and Sort Bar */}
            <div className={`
                fixed top-16 left-0 right-0 z-20 
                md:ml-64 
                px-4 md:px-8 
                py-3 
                bg-gray-50 dark:bg-gray-900 
                border-b border-gray-200 dark:border-gray-700 
                transition-all duration-300 
                ${showStickySearch ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'}
            `}>
                <div className="flex space-x-4">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search items by name or HSN code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 dark:text-gray-200 shadow-md"
                        />
                        {searchTerm && (
                            <button 
                                type="button" 
                                onClick={() => setSearchTerm('')} 
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                title="Clear Search"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {/* 🌟 NEW: Sticky Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="appearance-none w-full pl-3 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 dark:text-gray-200 shadow-md text-sm font-medium h-full"
                        >
                            <option value="default">Sort: Name (A-Z)</option>
                            <option value="low-stock">Sort: Low Stock / Out of Stock</option>
                        </select>
                        <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>
            </div>
            
            {/* 🌟 Margin to prevent content jump when sticky bar appears */}
            <div className={`${showStickySearch ? 'mb-16' : ''}`}></div> 

            {/* Desktop Table View (lg screens and up) */}
            <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700"> 
                 
                {/* Non-scrollable Header Section (Always visible) */}
                 <div className="p-4 md:p-6 flex justify-between items-center border-b dark:border-gray-700">
                    {/* Inventory Count Header */}
                    <h3 className="text-xl font-bold flex items-center text-indigo-600 dark:text-indigo-400">
                        <Package className="w-5 h-5 mr-2" /> Total Inventory Items ({sortedAndFilteredInventory.length})
                    </h3>
                    <div className="flex space-x-4">
                        {/* 🌟 NEW: Desktop Sort Dropdown */}
                        <div className="relative hidden xl:block">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-700 dark:text-gray-200 text-sm font-medium"
                            >
                                <option value="default">Sort: Name (A-Z)</option>
                                <option value="low-stock">Sort: Low Stock / Out of Stock</option>
                            </select>
                            <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                        {/* Add Item Button */}
                        <button 
                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-indigo-700 transition flex items-center disabled:opacity-50"
                            onClick={openAddModal}
                            disabled={loading}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Item
                        </button>
                    </div>
                </div>
                
                {/* Scrollable Table Area */}
                <div className="max-h-[60vh] overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            {/* Sticky table header */}
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10 shadow">
                                <tr>
                                    <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item Name/HSN</th>
                                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stock</th>
                                    <th className="px-3 md:px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                                    <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedAndFilteredInventory.map(item => { // 🌟 Using filtered inventory
                                    const itemId = item._id || item.id;
                                    const isLowStock = item.quantity <= item.reorderLevel;
                                    return (
                                    <tr 
                                        key={itemId} 
                                        className={`transition duration-150 ${isLowStock ? 'bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                    >
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                                            {item.name}
                                            <span className="block text-xs text-gray-400">HSN: {item.hsn}</span>
                                            {isLowStock && (
                                                <span className="block text-xs text-red-500 dark:text-red-400 flex items-center mt-1">
                                                    <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock! (Reorder Lvl: {item.reorderLevel})
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800 dark:text-gray-200">
                                            {item.quantity}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 dark:text-green-400 font-semibold">
                                            ₹{item.price ? item.price.toFixed(2) : '0.00'}
                                        </td>
                                        <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button 
                                                    className="text-indigo-600 hover:text-white hover:bg-indigo-600 p-2 rounded-full transition dark:text-indigo-400 dark:hover:text-white"
                                                    title="Edit Item"
                                                    onClick={() => handleEditClick(item)}
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    className="text-red-600 hover:text-white hover:bg-red-600 p-2 rounded-full transition dark:text-red-400 dark:hover:text-white"
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

            {/* Mobile List Card View (hidden on lg screens) */}
            <div className="lg:hidden">
                {/* Header for mobile view */}
                <div className="flex justify-between items-center mb-4">
                    {/* Inventory Count Header */}
                    <h3 className="text-lg font-bold flex items-center text-indigo-600 dark:text-indigo-400">
                        <Package className="w-4 h-4 mr-2" /> Inventory List ({sortedAndFilteredInventory.length})
                    </h3>
                    <button 
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center text-sm disabled:opacity-50"
                        onClick={openAddModal}
                        disabled={loading}
                        title="Add New Item"
                    >
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline ml-1">Add Item</span>
                    </button>
                </div>

                {/* 🌟 NEW: Non-sticky Search and Sort Bar for initial view on mobile */}
                {!showStickySearch && (
                    <div className="flex space-x-4 mb-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 dark:text-gray-200 shadow-sm"
                            />
                            {searchTerm && (
                                <button 
                                    type="button" 
                                    onClick={() => setSearchTerm('')} 
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    title="Clear Search"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                        {/* 🌟 NEW: Mobile Sort Dropdown (Non-sticky) */}
                        <div className="relative">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="appearance-none w-full pl-3 pr-8 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-800 dark:text-gray-200 shadow-sm text-sm font-medium h-full"
                            >
                                <option value="default">Sort: A-Z</option>
                                <option value="low-stock">Low Stock</option>
                            </select>
                            <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                )}
                
                {/* Scrollable list of cards */}
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pb-4"> 
                    {sortedAndFilteredInventory.map(item => ( // 🌟 Using filtered inventory
                        <InventoryListCard key={item._id || item.id} item={item} />
                    ))}
                </div>
            </div>

            {/* Item Form Modal (Unchanged) */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-end md:items-center justify-center z-50 p-0 md:p-4 transition-opacity">
                    <form onSubmit={handleFormSubmit} className="bg-white dark:bg-gray-800 w-full md:max-w-xl rounded-t-xl md:rounded-xl shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-full overflow-y-auto">
                        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20 rounded-t-xl sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-indigo-800 dark:text-indigo-300 flex items-center">
                                {isEditing ? <Edit className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />} 
                                {isEditing ? `Edit Item: ${formData.name}` : 'Add New Inventory Item'}
                            </h2>
                            <button type="button" onClick={closeFormModal} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label="Product Name" name="name" type="text" value={formData.name} onChange={handleInputChange} required />
                            <InputField label="Selling Price (₹)" name="price" type="number" value={formData.price} onChange={handleInputChange} min="0" required />
                            <InputField label="Current Stock Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleInputChange} min="0" required />
                            <InputField label="Reorder Level" name="reorderLevel" type="number" value={formData.reorderLevel} onChange={handleInputChange} min="0" required />
                            <InputField label="HSN/SAC Code" name="hsn" type="text" value={formData.hsn} onChange={handleInputChange} placeholder="e.g., 0401" />
                        </div>

                        <div className="p-5 border-t dark:border-gray-700">
                            <button 
                                type="submit"
                                className={`w-full py-3 text-white rounded-lg font-bold text-lg shadow-md transition flex items-center justify-center disabled:bg-gray-400 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-green-600 hover:bg-green-700'}`}
                                disabled={loading || !formData.name || formData.price <= 0 || formData.quantity < 0}
                            >
                                {loading 
                                    ? (isEditing ? 'Updating...' : 'Saving...') 
                                    : (isEditing ? 'Confirm & Update Item' : 'Confirm & Save Item')
                                }
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal (Unchanged) */}
            {isConfirmModalOpen && itemToDelete && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl transform transition-transform duration-300">
                        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-red-50 dark:bg-red-900/20 rounded-t-xl">
                            <h2 className="text-xl font-bold text-red-800 dark:text-red-300 flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Confirm Deletion</h2>
                            <button type="button" onClick={() => setIsConfirmModalOpen(false)} className="text-gray-600 dark:text-gray-400 hover:text-gray-800 p-1">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-5">
                            <p className="text-gray-700 dark:text-gray-300">
                                Are you sure you want to permanently delete the item: <strong className="font-semibold">{itemToDelete.name}</strong>? 
                                This action cannot be undone.
                            </p>
                        </div>

                        <div className="p-5 border-t dark:border-gray-700 flex justify-end space-x-3">
                            <button 
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDeleteItem}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition flex items-center disabled:opacity-50"
                                disabled={loading}
                            >
                                {loading ? 'Deleting...' : 'Delete Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {loading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-30 flex items-center justify-center z-40">
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-xl text-gray-700 dark:text-gray-200">Processing request...</div>
                </div>
            )}
        </div>
    );
};

// Helper component for form inputs (Unchanged)
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
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-white dark:bg-gray-700 dark:text-gray-200"
            {...props}
        />
    </div>
);


export default InventoryManager