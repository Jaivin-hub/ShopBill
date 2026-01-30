import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle, Loader2, PackageSearch } from 'lucide-react';
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
    hsn: '',
    variants: [] // Array of variant objects: { label, price, quantity, reorderLevel, hsn, sku }
};


// Added darkMode to props
const InventoryManager = ({ apiClient, API, userRole, showToast, darkMode }) => {
    // Permission Logic
    const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER;
    const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';


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

    // --- Data Fetching Logic (Memoized for Pattern Consistency) ---
    const fetchInventory = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsProcessing(true);
        try {
            const response = await apiClient.get(API.inventory);
            setInventory(response.data);
        } catch (error) {
            console.error("Inventory Fetch Error:", error);
            showToast('System Link Failure: Could not sync inventory.', 'error');
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

    // --- Optimized Scroll Observer for Sticky UI Elements ---
    useEffect(() => {
        const scrollTarget = document.querySelector('.scrollable-content') || window;

        const handleScroll = () => {
            const scrollTop = scrollTarget === window ? window.scrollY : scrollTarget.scrollTop;
            setShowStickySearch(scrollTop > 40);
        };

        scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollTarget.removeEventListener('scroll', handleScroll);
    }, []);

    // --- Modal & Form Handlers ---
    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' && name !== 'hsn' ? (value === '' ? '' : parseFloat(value)) : value
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
            hsn: item.hsn || '',
            variants: item.variants || [] // Load variants if they exist
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
            showToast(`Batch Processed: ${response.data.insertedCount} items integrated.`, 'success');
            await fetchInventory(true);
        } catch (error) {
            showToast(error.response?.data?.error || 'Batch integration failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddItem = async () => {
        setIsProcessing(true);
        try {
            const { _id, id, ...dataToSend } = formData;
            await apiClient.post(API.inventory, dataToSend);
            showToast(`Catalog Entry Created: ${formData.name}`, 'success');
            await fetchInventory(true);
            closeFormModal();
        } catch (error) {
            showToast(error.response?.data?.error || 'Add operation failed.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUpdateItem = async () => {
        setIsProcessing(true);
        const itemId = formData._id || formData.id;
        try {
            const { _id, id, ...dataToSend } = formData;
            await apiClient.put(`${API.inventory}/${itemId}`, dataToSend);
            showToast(`Entry Reconfigured: ${formData.name}`, 'success');
            await fetchInventory(true);
            closeFormModal();
        } catch (error) {
            showToast(error.response?.data?.error || 'Update failed.', 'error');
        } finally {
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
        setIsProcessing(true);
        try {
            await apiClient.delete(`${API.inventory}/${itemId}`);
            showToast(`Entry Purged: ${itemName}`, 'success');
            await fetchInventory(true);
        } catch (error) {
            showToast('Deletion protocol failed.', 'error');
        } finally {
            setIsProcessing(false);
            setItemToDelete(null);
        }
    };

    // --- Pattern-Optimized Memoized Filtering ---
    const sortedAndFilteredInventory = useMemo(() => {
        const query = searchTerm.toLowerCase();
        return [...inventory]
            .filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.hsn && item.hsn.toLowerCase().includes(query))
            )
            .sort((a, b) => {
                if (sortOption === 'low-stock') {
                    const aIsLow = a.quantity <= a.reorderLevel;
                    const bIsLow = b.quantity <= b.reorderLevel;
                    if (aIsLow && !bIsLow) return -1;
                    if (!aIsLow && bIsLow) return 1;
                    return a.quantity - b.quantity;
                }
                return a.name.localeCompare(b.name);
            });
    }, [inventory, searchTerm, sortOption]);

    // --- Render States ---
    if (!hasAccess) {
        return (
            <main className={`min-h-screen flex flex-col items-center justify-center p-8 text-center ${darkMode ? 'bg-gray-950' : 'bg-slate-50'}`}>
                <div className="bg-red-500/10 p-6 rounded-[1.25rem] border border-red-500/20 mb-6">
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                </div>
                <h1 className={`text-xl font-black uppercase tracking-tighter ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access<span className="text-red-500">Restricted</span></h1>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-4 max-w-xs leading-relaxed ${darkMode ? 'text-gray-500' : 'text-slate-400'}`}>
                    Inventory management protocols are restricted to Level 2 personnel (Owners/Managers).
                </p>
            </main>
        );
    }

    if (isLoadingInitial) {
        return (
            <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <p className="text-xs font-black opacity-40 tracking-widest ">Syncing Inventory...</p>
            </div>
        );
    }

    return (
        <InventoryContent
            inventory={sortedAndFilteredInventory}
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
            darkMode={darkMode} // Successfully passing darkMode down
        />
    );
};

export default InventoryManager;