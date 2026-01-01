import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Loader } from 'lucide-react'; 
import InventoryContent from './InventoryContent'; 

// --- Configuration and Constants ---
const USER_ROLES = {
  OWNER: 'owner', 
  MANAGER: 'manager',
  CASHIER: 'cashier', 
};

const initialItemState = {
    name: '',
    price: '',
    quantity: '',
    reorderLevel: 5,
    hsn: ''
};

const InventoryManager = ({ apiClient, API, userRole, showToast }) => {
    const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER;
    const isOwner = userRole === USER_ROLES.OWNER;
    
    // --- Data States ---
    const [inventory, setInventory] = useState([]);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true); 
    
    // --- UI/Form States ---
    const [isFormModalOpen, setIsFormModalOpen] = useState(false); 
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); 
    const [formData, setFormData] = useState(initialItemState); 
    const [isEditing, setIsEditing] = useState(false); 
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('default'); 
    const [showStickySearch, setShowStickySearch] = useState(false);
    
    // --- Data Fetching Logic ---
    const fetchInventory = useCallback(async () => {
        setIsProcessing(true); 
        try {
            const response = await apiClient.get(API.inventory);
            setInventory(response.data);
            showToast('Inventory data refreshed.', 'info');
        } catch (error) {
            console.error("Failed to load inventory data:", error);
            showToast('Error loading inventory data. Check network connection.', 'error');
        } finally {
            setIsProcessing(false); 
            setIsLoadingInitial(false);
        }
    }, [apiClient, API.inventory, showToast]);

    useEffect(() => {
        if (hasAccess) {
            fetchInventory();
        } else {
             setIsLoadingInitial(false);
        }
    }, [hasAccess, fetchInventory]); 

    // --- Sticky Search Scroll Effect ---
    useEffect(() => {
        if (!isOwner) return;
        const scrollTarget = document.querySelector('.scrollable-content') || window;
        
        const handleScroll = () => {
            const scrollThreshold = 100; 
            const scrollTop = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
            setShowStickySearch(scrollTop > scrollThreshold);
        };
        
        scrollTarget.addEventListener('scroll', handleScroll);
        return () => scrollTarget.removeEventListener('scroll', handleScroll);
    }, [isOwner]);
    
    // --- Modal & Form Handlers ---
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
    };

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
    };

    const handleDeleteClick = (itemId, itemName) => {
        setItemToDelete({ id: itemId, name: itemName });
        setIsConfirmModalOpen(true);
    };
    
    const openBulkUploadModal = () => setIsBulkUploadModalOpen(true);
    const closeBulkUploadModal = () => setIsBulkUploadModalOpen(false);
    
    const handleBulkUpload = async (items) => {
        closeBulkUploadModal();
        setIsProcessing(true);
        try {
            const response = await apiClient.post(`${API.inventory}/bulk`, items);
            showToast(response.data.message || `${response.data.insertedCount} items uploaded successfully!`, 'success');
            await fetchInventory();
        } catch (error) {
            console.error('Bulk Upload Error:', error.response?.data || error.message);
            showToast(`Error: ${error.response?.data?.error || 'Bulk upload failed.'}`, 'error');
            setIsProcessing(false); 
        } 
    };
    
    const handleAddItem = async () => { 
        setIsProcessing(true);
        try {
            const dataToSend = { ...formData, _id: undefined, id: undefined }; 
            await apiClient.post(API.inventory, dataToSend);
            showToast(`New item added: ${formData.name}`, 'success');
            await fetchInventory(); 
            closeFormModal();
        } catch (error) {
            showToast(`Error adding item: ${error.response?.data?.error || error.message}`, 'error');
            setIsProcessing(false); 
        } 
    };
    
    const handleUpdateItem = async () => { 
        setIsProcessing(true);
        const itemId = formData._id || formData.id; 
        if (!itemId) {
            setIsProcessing(false);
            return showToast('Error: Missing item ID.', 'error');
        }
        try {
            const { _id, id, ...dataToSend } = formData; 
            await apiClient.put(`${API.inventory}/${itemId}`, dataToSend);
            showToast(`${formData.name} updated successfully!`, 'success');
            await fetchInventory(); 
            closeFormModal();
        } catch (error) {
            showToast(`Error updating item: ${error.response?.data?.error || error.message}`, 'error');
            setIsProcessing(false); 
        } 
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        isEditing ? handleUpdateItem() : handleAddItem();
    };
    
    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        const { id: itemId, name: itemName } = itemToDelete;
        setIsConfirmModalOpen(false);
        setItemToDelete(null);
        setIsProcessing(true);
        try {
            await apiClient.delete(`${API.inventory}/${itemId}`);
            showToast(`${itemName} deleted successfully.`, 'success');
            await fetchInventory(); 
        } catch (error) {
            showToast(`Error deleting item: ${error.response?.data?.error || error.message}`, 'error');
            setIsProcessing(false); 
        }
    };
    
    // --- Sorting and Filtering Logic ---
    const sortedAndFilteredInventory = useMemo(() => {
        return [...inventory]
            .filter(item => 
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (item.hsn && item.hsn.toLowerCase().includes(searchTerm.toLowerCase()))
            )
            .sort((a, b) => {
                if (sortOption === 'low-stock') {
                    const aIsLow = a.quantity <= a.reorderLevel;
                    const bIsLow = b.quantity <= b.reorderLevel;
                    if (aIsLow && !bIsLow) return -1;
                    if (!aIsLow && bIsLow) return 1;
                    if (a.quantity !== b.quantity) return a.quantity - b.quantity;
                }
                return a.name.localeCompare(b.name);
            });
    }, [inventory, searchTerm, sortOption]);
    
    // --- Semantic Render Transitions ---
    
    if (!hasAccess) {
        return (
            <main className="p-4 md:p-8 text-center h-full flex flex-col items-center justify-center bg-gray-950 transition-colors duration-300" aria-labelledby="access-denied-title">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" aria-hidden="true" />
                <h1 id="access-denied-title" className="text-xl font-semibold text-gray-200">Access Denied</h1>
                <p className="text-gray-400">Only authorized users can manage the full inventory.</p>
            </main>
        );
    }

    if (isLoadingInitial) {
         return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 bg-gray-950" aria-busy="true" aria-live="polite">
                <Loader className="w-10 h-10 animate-spin text-teal-400" aria-hidden="true" />
                <span className="sr-only">Loading Inventory data...</span>
            </div>
        );
    }

    return (
        <InventoryContent
            // Data
            inventory={sortedAndFilteredInventory}
            // State
            loading={isProcessing} 
            isFormModalOpen={isFormModalOpen}
            isConfirmModalOpen={isConfirmModalOpen}
            isBulkUploadModalOpen={isBulkUploadModalOpen} 
            formData={formData}
            isEditing={isEditing}
            itemToDelete={itemToDelete}
            searchTerm={searchTerm}
            sortOption={sortOption}
            showStickySearch={showStickySearch}
            // Handlers
            setSearchTerm={setSearchTerm}
            setSortOption={setSortOption}
            setFormData={setFormData}
            openAddModal={openAddModal}
            openBulkUploadModal={openBulkUploadModal}
            closeBulkUploadModal={closeBulkUploadModal}
            handleBulkUpload={handleBulkUpload}
            handleEditClick={handleEditClick}
            handleDeleteClick={handleDeleteClick}
            closeFormModal={closeFormModal}
            handleInputChange={handleInputChange}
            handleFormSubmit={handleFormSubmit}
            confirmDeleteItem={confirmDeleteItem}
            setIsConfirmModalOpen={setIsConfirmModalOpen}
        />
    );
};

export default InventoryManager;