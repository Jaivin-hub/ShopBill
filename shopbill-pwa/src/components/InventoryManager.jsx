import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import InventoryContent from './InventoryContent';
import OfflineUnavailableState from './OfflineUnavailableState';
import { StockHubInitialSkeleton } from './skeletons/PageSkeletons';
import { useDebounce } from '../hooks/useDebounce';
import { exportRowsToExcel } from '../utils/exportExcel';
import { fetchInventoryWithCache } from '../offline/fetchWithCatalog';
import { getActiveStoreId } from '../offline/catalogCache';
import { isBrowserOnline } from '../offline/connectivity';
import { useOffline } from '../contexts/OfflineContext';

// --- Configuration and Constants ---
const USER_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};

const emptyTextileMeta = () => ({
    brand: '',
    fabric: '',
    season: '',
    collection: '',
});

const initialItemState = {
    name: '',
    price: '',
    quantity: '',
    reorderLevel: 5,
    hsn: '',
    textileMeta: emptyTextileMeta(),
    variants: [] // Array of variant objects: { label, price, quantity, reorderLevel, hsn, sku, size?, color? }
};


// Added darkMode to props
const InventoryManager = ({ apiClient, API, userRole, showToast, darkMode, initialSortOption, onSortOptionSet, currentUser }) => {
    const isTextileShop = (currentUser?.businessType || 'grocery') === 'textile';
    // Permission: Owner and Manager only; Cashiers do not have access
    const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER;
    const themeBase = darkMode ? 'bg-gray-950 text-slate-100' : 'bg-slate-50 text-slate-900';


    // --- Data States ---
    const [inventory, setInventory] = useState([]);
    /** Inventory GET in flight — drives full-page skeleton first load, grid skeleton on refresh. */
    const [dataLoading, setDataLoading] = useState(true);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
    const [catalogUnavailable, setCatalogUnavailable] = useState(false);
    const { isOnline } = useOffline();

    // --- UI/Form States ---
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [isReportDownloading, setIsReportDownloading] = useState(false);
    const [formData, setFormData] = useState(initialItemState);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300); // Debounce search by 300ms
    const [sortOption, setSortOption] = useState(initialSortOption || 'default');
    const [showStickySearch, setShowStickySearch] = useState(false);

    // Set initial sort option when provided
    useEffect(() => {
        if (initialSortOption) {
            setSortOption(initialSortOption);
            if (onSortOptionSet) {
                onSortOptionSet();
            }
        }
    }, [initialSortOption, onSortOptionSet]);

    // --- Data Fetching Logic (Memoized for Pattern Consistency) ---
    const fetchInventory = useCallback(async () => {
        setDataLoading(true);
        const storeId = getActiveStoreId();
        try {
            const result = await fetchInventoryWithCache({
                apiClient,
                inventoryUrl: API.inventory,
                storeId,
            });
            if (result.cancelled) return;
            if (result.source === 'unavailable') {
                setCatalogUnavailable(true);
                setInventory([]);
                if (!isBrowserOnline()) {
                    showToast('No saved stock list offline. Open Stock or Billing once while online.', 'warning');
                } else {
                    showToast('Could not load inventory. Check your connection.', 'error');
                }
                return;
            }
            setCatalogUnavailable(false);
            setInventory(result.data || []);
            if (result.source === 'cache') {
                showToast('Offline — showing last saved stock (edits need internet)', 'warning');
            }
        } catch (error) {
            console.error('Inventory Fetch Error:', error);
            setCatalogUnavailable(true);
            showToast('System Link Failure: Could not sync inventory.', 'error');
        } finally {
            setDataLoading(false);
            setHasLoadedOnce(true);
        }
    }, [apiClient, API.inventory, showToast]);

    useEffect(() => {
        if (hasAccess) {
            fetchInventory();
        } else {
            setDataLoading(false);
            setHasLoadedOnce(true);
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
        if (name === 'price') {
            // Keep price as typed string so values like 9.00 remain visible while editing.
            if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                setFormData(prev => ({ ...prev, [name]: value }));
            }
            return;
        }
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
        // Ensure variants have unique IDs for stable keys
        const variantsWithIds = (item.variants || []).map((v, idx) => ({
            ...v,
            _id: v._id || `variant-${item._id}-${idx}-${Date.now()}`
        }));
        setFormData({
            _id: item._id,
            id: item.id,
            name: item.name,
            price: item.price || 0,
            quantity: item.quantity || 0,
            reorderLevel: item.reorderLevel || 5,
            hsn: item.hsn || '',
            textileMeta: {
                ...emptyTextileMeta(),
                ...(item.textileMeta || {}),
            },
            variants: variantsWithIds
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
        setIsBulkUploading(true);
        try {
            const response = await apiClient.post(`${API.inventory}/bulk`, items);
            const msg = response.data.updatedCount > 0
                ? `${response.data.insertedCount} added, ${response.data.updatedCount} updated.`
                : `${response.data.insertedCount} items integrated.`;
            showToast(`Batch processed: ${msg}`, 'success');
            await fetchInventory();
            closeBulkUploadModal();
        } catch (error) {
            showToast(error.response?.data?.error || 'Batch integration failed.', 'error');
        } finally {
            setIsBulkUploading(false);
        }
    };

    const handleAddItem = async () => {
        setIsProcessing(true);
        try {
            const { _id, id, ...dataToSend } = formData;
            if (!isTextileShop) {
                delete dataToSend.textileMeta;
            }

            // Clean variants: remove _id (only used for React keys) and clean empty values
            if (dataToSend.variants && dataToSend.variants.length > 0) {
                dataToSend.variants = dataToSend.variants.map(v => {
                    const cleaned = { ...v };
                    delete cleaned._id; // Remove React key _id
                    if (!isTextileShop) {
                        delete cleaned.size;
                        delete cleaned.color;
                    }
                    // Ensure numeric fields are numbers, not strings
                    cleaned.price = typeof cleaned.price === 'string' ? parseFloat(cleaned.price) || 0 : (cleaned.price || 0);
                    cleaned.quantity = typeof cleaned.quantity === 'string' ? parseInt(cleaned.quantity) || 0 : (cleaned.quantity || 0);
                    cleaned.reorderLevel = cleaned.reorderLevel !== null && cleaned.reorderLevel !== undefined 
                        ? (typeof cleaned.reorderLevel === 'string' ? parseInt(cleaned.reorderLevel) : cleaned.reorderLevel)
                        : null;
                    return cleaned;
                });
                // Set price and quantity to null when variants exist
                dataToSend.price = dataToSend.price === '' || dataToSend.price === null ? null : (parseFloat(dataToSend.price) || null);
                dataToSend.quantity = dataToSend.quantity === '' || dataToSend.quantity === null ? null : (parseInt(dataToSend.quantity) || null);
            } else {
                // Ensure price and quantity are numbers when no variants
                dataToSend.price = parseFloat(dataToSend.price) || 0;
                dataToSend.quantity = parseInt(dataToSend.quantity) || 0;
            }
            
            await apiClient.post(API.inventory, dataToSend);
            showToast(`Catalog Entry Created: ${formData.name}`, 'success');
            await fetchInventory();
            closeFormModal();
        } catch (error) {
            console.error('Add item error:', error.response?.data || error);
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
            if (!isTextileShop) {
                delete dataToSend.textileMeta;
            }
            
            // Clean variants: remove _id (only used for React keys) and clean empty values
            if (dataToSend.variants && dataToSend.variants.length > 0) {
                dataToSend.variants = dataToSend.variants.map(v => {
                    const cleaned = { ...v };
                    delete cleaned._id; // Remove React key _id
                    if (!isTextileShop) {
                        delete cleaned.size;
                        delete cleaned.color;
                    }
                    // Ensure numeric fields are numbers, not strings
                    cleaned.price = typeof cleaned.price === 'string' ? parseFloat(cleaned.price) || 0 : (cleaned.price || 0);
                    cleaned.quantity = typeof cleaned.quantity === 'string' ? parseInt(cleaned.quantity) || 0 : (cleaned.quantity || 0);
                    cleaned.reorderLevel = cleaned.reorderLevel !== null && cleaned.reorderLevel !== undefined 
                        ? (typeof cleaned.reorderLevel === 'string' ? parseInt(cleaned.reorderLevel) : cleaned.reorderLevel)
                        : null;
                    return cleaned;
                });
                // Set price and quantity to null when variants exist
                dataToSend.price = dataToSend.price === '' || dataToSend.price === null ? null : (parseFloat(dataToSend.price) || null);
                dataToSend.quantity = dataToSend.quantity === '' || dataToSend.quantity === null ? null : (parseInt(dataToSend.quantity) || null);
            } else {
                // Ensure price and quantity are numbers when no variants
                dataToSend.price = parseFloat(dataToSend.price) || 0;
                dataToSend.quantity = parseInt(dataToSend.quantity) || 0;
            }
            
            await apiClient.put(`${API.inventory}/${itemId}`, dataToSend);
            showToast(`Entry Reconfigured: ${formData.name}`, 'success');
            await fetchInventory();
            closeFormModal();
        } catch (error) {
            console.error('Update item error:', error.response?.data || error);
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
        setIsDeleting(true);
        try {
            await apiClient.delete(`${API.inventory}/${itemId}`);
            showToast(`Deleted: ${itemName}`, 'success');
            await fetchInventory();
            setIsConfirmModalOpen(false);
            setItemToDelete(null);
        } catch (error) {
            showToast('Deletion protocol failed.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // --- Pattern-Optimized Memoized Filtering (variant-aware low-stock sort) ---
    const sortedAndFilteredInventory = useMemo(() => {
        const isLowStock = (item) => {
            const hasVariants = item.variants && item.variants.length > 0;
            if (hasVariants) {
                return item.variants.some(v => {
                    const reorderLevel = v.reorderLevel != null ? v.reorderLevel : (item.reorderLevel || 5);
                    return (v.quantity || 0) <= reorderLevel;
                });
            }
            return (item.quantity || 0) <= (item.reorderLevel || 5);
        };
        const effectiveQuantity = (item) => {
            const hasVariants = item.variants && item.variants.length > 0;
            if (hasVariants) {
                const qty = Math.min(...item.variants.map(v => v.quantity ?? 0));
                return Number.isFinite(qty) ? qty : 0;
            }
            return item.quantity ?? 0;
        };

        const query = debouncedSearchTerm.toLowerCase();
        const textileMetaMatch = (item) => {
            if (!isTextileShop || !item.textileMeta) return false;
            const m = item.textileMeta;
            return ['brand', 'fabric', 'season', 'collection'].some(
                (k) => m[k] && String(m[k]).toLowerCase().includes(query)
            );
        };
        return [...inventory]
            .filter(item =>
                item.name.toLowerCase().includes(query) ||
                (item.hsn && item.hsn.toLowerCase().includes(query)) ||
                textileMetaMatch(item)
            )
            .sort((a, b) => {
                if (sortOption === 'low-stock') {
                    const aIsLow = isLowStock(a);
                    const bIsLow = isLowStock(b);
                    if (aIsLow && !bIsLow) return -1;
                    if (!aIsLow && bIsLow) return 1;
                    return effectiveQuantity(a) - effectiveQuantity(b);
                }
                return a.name.localeCompare(b.name);
            });
    }, [inventory, debouncedSearchTerm, sortOption, isTextileShop]);

    const handleDownloadReport = useCallback(async () => {
        if (isReportDownloading) return;
        setIsReportDownloading(true);
        const rows = [
            ['Name', 'HSN', 'Price', 'Quantity', 'Reorder Level', 'Has Variants']
        ];
        sortedAndFilteredInventory.forEach((item) => {
            rows.push([
                item.name || '',
                item.hsn || '',
                item.price ?? '',
                item.quantity ?? '',
                item.reorderLevel ?? 5,
                item.variants && item.variants.length > 0 ? 'Yes' : 'No'
            ]);
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach((v) => {
                    rows.push([
                        `  - Variant: ${v.label || v.variantlabel || [v.size, v.color].filter(Boolean).join('/') || 'Variant'}`,
                        v.hsn || '',
                        v.price ?? '',
                        v.quantity ?? '',
                        v.reorderLevel ?? item.reorderLevel ?? 5,
                        'Variant'
                    ]);
                });
            }
        });
        try {
            exportRowsToExcel(rows, `inventory-report-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Inventory');
            const isAndroid = /android/i.test(window?.navigator?.userAgent || '');
            showToast(isAndroid ? 'Inventory report downloaded as CSV.' : 'Inventory report downloaded as Excel.', 'success');
        } catch (error) {
            showToast('Inventory report download failed.', 'error');
        } finally {
            setTimeout(() => setIsReportDownloading(false), 600);
        }
    }, [isReportDownloading, showToast, sortedAndFilteredInventory]);

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

    if (dataLoading && !hasLoadedOnce) {
        return <StockHubInitialSkeleton darkMode={darkMode} />;
    }

    if (catalogUnavailable) {
        return (
            <main className={`min-h-0 flex flex-1 flex-col ${themeBase}`}>
                <OfflineUnavailableState
                    darkMode={darkMode}
                    title={isOnline ? 'Stock could not load' : 'Stock unavailable offline'}
                    description={
                        isOnline
                            ? 'Inventory data did not load. Check your connection and try again.'
                            : 'Open Billing or Stock once while online on this device to save your product list. After that, you can view stock offline.'
                    }
                    onRetry={() => {
                        setCatalogUnavailable(false);
                        fetchInventory();
                    }}
                />
            </main>
        );
    }

    return (
        <InventoryContent
            isTextileShop={isTextileShop}
            inventory={sortedAndFilteredInventory}
            listSyncing={dataLoading && hasLoadedOnce}
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
            handleDownloadReport={handleDownloadReport}
            isReportDownloading={isReportDownloading}
            closeBulkUploadModal={closeBulkUploadModal}
            handleBulkUpload={handleBulkUpload}
            handleEditClick={handleEditClick}
            handleDeleteClick={handleDeleteClick}
            closeFormModal={closeFormModal}
            handleInputChange={handleInputChange}
            handleFormSubmit={handleFormSubmit}
            confirmDeleteItem={confirmDeleteItem}
            setIsConfirmModalOpen={setIsConfirmModalOpen}
            isDeleting={isDeleting}
            isBulkUploading={isBulkUploading}
            darkMode={darkMode}
        />
    );
};

export default InventoryManager;