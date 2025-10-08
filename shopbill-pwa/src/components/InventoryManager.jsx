import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Loader } from 'lucide-react'; 
import InventoryContent from './InventoryContent'; 
import axios from 'axios';
import API from '../config/api'

// --- Configuration and Constants ---
const USER_ROLES = {
  OWNER: 'owner', 
  CASHIER: 'cashier', 
};
const initialItemState = {
    name: '',
    price: '',
    quantity: '',
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
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('default'); 
    const [showStickySearch, setShowStickySearch] = useState(false);
    
    // --- Utility to get config with token ---
    const getAuthHeaders = () => {
        const token = localStorage.getItem('userToken');
        if (!token) {
            // In a real app, you might want to force a logout here
            showToast('Authentication token missing. Please log in.', 'error');
            return null;
        }
        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    };
    
    // --- Sticky Search Scroll Effect (remains the same) ---
    useEffect(() => {
        if (!isOwner) return;
        const mainContent = document.querySelector('main'); 
        
        const handleScroll = () => {
            const scrollThreshold = 100; 
            setShowStickySearch(window.scrollY > scrollThreshold || (mainContent && mainContent.scrollTop > scrollThreshold));
        };
        
        window.addEventListener('scroll', handleScroll);
        if (mainContent) {
            mainContent.addEventListener('scroll', handleScroll);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (mainContent) {
                mainContent.removeEventListener('scroll', handleScroll);
            }
        };
    }, [isOwner]);
    
    // --- Modal & Form Handlers (remain the same) ---
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
    const handleDeleteClick = (itemId, itemName) => {
        setItemToDelete({ id: itemId, name: itemName });
        setIsConfirmModalOpen(true);
    }
    
    // --- CRUD Handlers (FIXED: Added Auth Headers) ---
    const handleAddItem = async () => { 
        const config = getAuthHeaders();
        if (!config) return;

        setLoading(true);
        try {
            const dataToSend = { ...formData, _id: undefined, id: undefined }; 
            // PASS CONFIG
            await axios.post(`${API.inventory}`, dataToSend, config);
            await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
            showToast(`New item added: ${formData.name}`, 'success');
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
    
    const handleUpdateItem = async () => { 
        const config = getAuthHeaders();
        if (!config) return;

        setLoading(true);
        const itemId = formData._id || formData.id; 

        if (!itemId) {
            setLoading(false);
            return showToast('Error: Cannot update item without an ID.', 'error');
        }
        try {
            const { _id, id, ...dataToSend } = formData; 
            // PASS CONFIG
            await axios.put(`${API.inventory}/${itemId}`, dataToSend, config);
            await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
            showToast(`${formData.name} updated successfully!`, 'success');
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
    
    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        const config = getAuthHeaders();
        if (!config) return;

        const { id: itemId, name: itemName } = itemToDelete;
        setIsConfirmModalOpen(false);
        setItemToDelete(null);
        setLoading(true);
        try {
            // PASS CONFIG
            await axios.delete(`${API.inventory}/${itemId}`, config);
            await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
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
    
    // --- Sorting and Filtering Logic (Memoized, remains the same) ---
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
                    if (a.quantity !== b.quantity) {
                        return a.quantity - b.quantity;
                    }
                }
                return a.name.localeCompare(b.name);
            });
    }, [inventory, searchTerm, sortOption]);
    
    // --- Access Denied Component (remains the same) ---
    if (!isOwner) {
        return (
            <div className="p-4 md:p-8 text-center h-full flex flex-col items-center justify-center bg-gray-950 transition-colors duration-300">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-200">Access Denied</h2>
                <p className="text-gray-400">Only the Owner role has permission to manage the full inventory.</p>
            </div>
        );
    }

    // --- RENDER InventoryContent (The Child) ---
    return (
        <InventoryContent
            // Data
            inventory={sortedAndFilteredInventory}
            // State
            loading={loading}
            isFormModalOpen={isFormModalOpen}
            isConfirmModalOpen={isConfirmModalOpen}
            formData={formData}
            isEditing={isEditing}
            itemToDelete={itemToDelete}
            searchTerm={searchTerm}
            sortOption={sortOption}
            showStickySearch={showStickySearch}
            // Handlers
            setSearchTerm={setSearchTerm}
            setSortOption={setSortOption}
            openAddModal={openAddModal}
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