import React from 'react';
import { Package, Plus, AlertTriangle, Edit, Trash2, X, Search, ListOrdered, Loader } from 'lucide-react'; 

// Helper component for form inputs (Moved from original file)
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
            className="w-full p-3 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-800 text-gray-200 placeholder-gray-500"
            {...props}
        />
    </div>
);

// Inventory List Card Component (Moved from original file)
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
                <div>
                    <p className="text-base font-semibold text-gray-200 truncate max-w-[180px]">{item.name}</p>
                    <span className="text-xs text-gray-400 flex items-center mt-0.5">HSN: {item.hsn}</span>
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


const InventoryContent = ({
    inventory,
    loading,
    isFormModalOpen,
    isConfirmModalOpen,
    formData,
    isEditing,
    itemToDelete,
    searchTerm,
    sortOption,
    showStickySearch,
    setSearchTerm,
    setSortOption,
    openAddModal,
    handleEditClick,
    handleDeleteClick,
    closeFormModal,
    handleInputChange,
    handleFormSubmit,
    confirmDeleteItem,
    setIsConfirmModalOpen,
}) => {
    
    // --- Main Render ---
    return (
        <div className="p-4 md:p-8 h-full overflow-y-auto bg-gray-950 transition-colors duration-300">
            <h1 className="text-3xl font-extrabold text-white mb-2">Inventory Management</h1>
            <p className="text-gray-400 mb-6">Detailed product configuration and stock levels.</p>
            
            {/* Sticky Search and Sort Bar */}
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
                    {/* Sticky Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="appearance-none w-full pl-3 pr-8 py-2.5 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-md text-sm font-medium h-full"
                        >
                            <option value="default">Sort: Name (A-Z)</option>
                            <option value="low-stock">Sort: Low Stock / Out of Stock</option>
                        </select>
                        <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                </div>
            </div>
            
            {/* Margin to prevent content jump when sticky bar appears */}
            <div className={`${showStickySearch ? 'mb-16' : ''}`}></div> 
            
            {/* Desktop Table View (lg screens and up) */}
            <div className="hidden lg:block bg-gray-900 rounded-xl shadow-2xl shadow-indigo-900/10 border border-gray-800">  
                
                 <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-700">
                    <h3 className="text-xl font-bold flex items-center text-indigo-400">
                        <Package className="w-5 h-5 mr-2" /> Total Inventory Items ({inventory.length})
                    </h3>
                    <div className="flex space-x-4">
                        {/* Desktop Sort Dropdown */}
                        <div className="relative hidden xl:block">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-800 text-gray-200 text-sm font-medium"
                            >
                                <option value="default">Sort: Name (A-Z)</option>
                                <option value="low-stock">Sort: Low Stock / Out of Stock</option>
                            </select>
                            <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
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
                        <table className="min-w-full divide-y divide-gray-700">
                            {/* Sticky table header */}
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
                                            <span className="block text-xs text-gray-500">HSN: {item.hsn}</span>
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
            
            {/* Mobile List Card View (hidden on lg screens) */}
            <div className="lg:hidden">
                {/* Header for mobile view */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold flex items-center text-indigo-400">
                        <Package className="w-4 h-4 mr-2" /> Inventory List ({inventory.length})
                    </h3>
                    {/* Add Item Button */}
                    <button 
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-md hover:bg-indigo-700 transition flex items-center text-sm disabled:opacity-50"
                        onClick={openAddModal}
                        disabled={loading}
                        title="Add New Item">
                        <Plus className="w-4 h-4" /> <span className="hidden sm:inline ml-1">Add Item</span>
                    </button>
                </div>
                
                {/* Non-sticky Search and Sort Bar for initial view on mobile */}
                {!showStickySearch && (
                    <div className="flex space-x-4 mb-4">
                        <div className="relative flex-grow">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search items..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-sm"
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
                        <div className="relative">
                            <select
                                value={sortOption}
                                onChange={(e) => setSortOption(e.target.value)}
                                className="appearance-none w-full pl-3 pr-8 py-2.5 border border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-900 text-gray-200 shadow-sm text-sm font-medium h-full"
                            >
                                <option value="default">Sort: A-Z</option>
                                <option value="low-stock">Low Stock</option>
                            </select>
                            <ListOrdered className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                )}
                
                {/* Scrollable list of cards */}
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
            
            {/* Item Form Modal */}
            {isFormModalOpen && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-end md:items-center justify-center z-50 p-0 md:p-4 transition-opacity">
                    <form onSubmit={handleFormSubmit} className="bg-gray-900 w-full md:max-w-xl rounded-t-xl md:rounded-xl shadow-2xl transform transition-transform duration-300 translate-y-0 max-h-full overflow-y-auto border border-gray-700">
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-indigo-900/20 rounded-t-xl sticky top-0 z-10">
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
                                className={`w-full py-3 text-white rounded-lg font-bold text-lg shadow-md transition flex items-center justify-center disabled:opacity-50 ${isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-teal-600 hover:bg-teal-700'}`}
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
            
            {/* Delete Confirmation Modal */}
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
            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-40">
                    <div className="bg-gray-900 p-6 rounded-xl shadow-2xl text-indigo-400 flex items-center border border-gray-700">
                         <Loader className='w-6 h-6 mr-3 animate-spin' /> Processing request...
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryContent;