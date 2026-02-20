import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { 
    Store, Plus, MapPin, Phone, 
    Edit3, Trash2, 
    ArrowUpRight, Building2,
    Loader2, X,
    AlertCircle, Search, Users
} from 'lucide-react';
import API from '../config/api';
import { validateShopName, validatePhoneNumber, validateEmail, validateTaxId, validateAddress } from '../utils/validation';
import ConfirmationModal from './ConfirmationModal';

const OutletManager = ({ apiClient, showToast, currentUser, onOutletSwitch, currentOutletId, darkMode, setCurrentPage, onOutletsChange }) => {
    const [outlets, setOutlets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        settings: { receiptFooter: 'Thank you for shopping!' }
    });
    const [errors, setErrors] = useState({});
    const [validationErrors, setValidationErrors] = useState({});
    const [apiError, setApiError] = useState(null);
    const errorRef = useRef(null);
    const isSwitchingRef = useRef(false);
    const prevOutletIdRef = useRef(currentOutletId);
    const isFetchingRef = useRef(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [outletToDelete, setOutletToDelete] = useState(null);
    const [outletStaff, setOutletStaff] = useState({}); // { outletId: [staff members] }
    const [loadingStaff, setLoadingStaff] = useState({}); // { outletId: true/false }
    const fetchingStaffRef = useRef(new Set()); // Track which outlets are currently being fetched

    const isPremium = currentUser?.plan === 'PREMIUM';

    // Styling logic
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const inputBase = darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const subText = darkMode ? 'text-slate-400' : 'text-slate-500';

    // Filter outlets based on search term
    const filteredOutlets = useMemo(() => {
        if (!debouncedSearchTerm.trim()) return outlets;
        const term = debouncedSearchTerm.toLowerCase().trim();
        return outlets.filter(outlet =>
            outlet.name?.toLowerCase().includes(term) ||
            outlet.address?.toLowerCase().includes(term) ||
            outlet.phone?.includes(term) ||
            outlet.email?.toLowerCase().includes(term) ||
            outlet.taxId?.toLowerCase().includes(term)
        );
    }, [outlets, debouncedSearchTerm]);

    // Fetch staff for a specific outlet
    const fetchStaffForOutlet = useCallback(async (outletId) => {
        if (!outletId) return;
        
        // Use ref to prevent race conditions - check and set atomically
        const outletIdStr = String(outletId);
        if (fetchingStaffRef.current.has(outletIdStr)) {
            console.log(`[OutletManager] Already fetching staff for outlet ${outletIdStr}, skipping`);
            return;
        }
        
        fetchingStaffRef.current.add(outletIdStr);
        setLoadingStaff(prev => ({ ...prev, [outletIdStr]: true }));
        
        try {
            // Make API call with outlet-specific header without modifying global defaults
            const response = await apiClient.get(API.staff, {
                headers: {
                    'x-store-id': outletIdStr
                }
            });
            
            // Handle both array response and object with data property
            let staffData = [];
            if (Array.isArray(response.data)) {
                staffData = response.data;
            } else if (response.data?.data && Array.isArray(response.data.data)) {
                staffData = response.data.data;
            } else if (response.data?.staff && Array.isArray(response.data.staff)) {
                staffData = response.data.staff;
            }
            
            // Sort staff by name for consistent display
            staffData.sort((a, b) => {
                const nameA = (a.name || a.email || '').toLowerCase();
                const nameB = (b.name || b.email || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            console.log(`[OutletManager] Fetched ${staffData.length} staff for outlet ${outletIdStr}`);
            
            // Use functional update to ensure we're updating the correct outlet
            setOutletStaff(prev => {
                const updated = { ...prev };
                updated[outletIdStr] = staffData;
                return updated;
            });
        } catch (error) {
            if (error.cancelled || error.message?.includes('cancelled')) {
                return;
            }
            console.error(`[OutletManager] Failed to fetch staff for outlet ${outletIdStr}:`, error);
            // Set empty array on error
            setOutletStaff(prev => {
                const updated = { ...prev };
                updated[outletIdStr] = [];
                return updated;
            });
        } finally {
            fetchingStaffRef.current.delete(outletIdStr);
            setLoadingStaff(prev => {
                const updated = { ...prev };
                updated[outletIdStr] = false;
                return updated;
            });
        }
    }, [apiClient, API]);

    const fetchOutlets = useCallback(async (showLoading = true, preserveOnError = false) => {
        // Prevent duplicate simultaneous calls
        if (isFetchingRef.current) {
            console.log('[OutletManager] Fetch already in progress, skipping duplicate call');
            return;
        }

        isFetchingRef.current = true;
        if (showLoading) setIsLoading(true);
        try {
            console.log('[OutletManager] Fetching outlets, showLoading:', showLoading, 'preserveOnError:', preserveOnError);
            const response = await apiClient.get(API.outlets);
            console.log('[OutletManager] Outlets API response:', response.data);
            if (response.data.success && Array.isArray(response.data.data)) {
                // Always update the list with the response data (includes staffCount from API)
                console.log('[OutletManager] Setting outlets:', response.data.data.length, 'outlets');
                
                // Clear old staff data for outlets that no longer exist
                const newOutletIds = new Set(response.data.data.map(o => String(o._id)));
                setOutletStaff(prev => {
                    const updated = { ...prev };
                    // Remove staff data for outlets that are no longer in the list
                    Object.keys(updated).forEach(outletId => {
                        if (!newOutletIds.has(outletId)) {
                            delete updated[outletId];
                        }
                    });
                    return updated;
                });
                
                setOutlets(response.data.data);
                
                // Fetch staff details only for the currently active outlet (for displaying staff list)
                const activeOutlet = response.data.data.find(o => String(o._id) === String(currentOutletId));
                if (activeOutlet && activeOutlet._id && activeOutlet.isActive !== false && activeOutlet.staffCount > 0) {
                    fetchStaffForOutlet(activeOutlet._id);
                }
            } else if (response.data.success && !Array.isArray(response.data.data)) {
                // If response is successful but data is not an array
                console.warn('[OutletManager] API returned non-array data:', response.data.data);
                if (!preserveOnError) {
                    setOutlets([]);
                }
            } else {
                // If response is not successful
                console.warn('[OutletManager] API response not successful:', response.data);
                if (!preserveOnError) {
                    setOutlets([]);
                }
            }
        } catch (error) {
            // Handle cancellation errors gracefully (they're expected for duplicate prevention)
            if (error.cancelled || error.message?.includes('cancelled')) {
                console.log('[OutletManager] Request cancelled (duplicate prevention), ignoring');
                // Don't treat cancellation as an error - the finally block will handle cleanup
                return;
            }
            console.error('[OutletManager] Failed to fetch outlets:', error);
            // Only show toast if this is the initial load, not a refetch
            if (showLoading) {
                showToast('Failed to load store locations.', 'error');
            }
            // If preserveOnError is true, don't clear the outlets list on error
            if (!preserveOnError) {
                setOutlets([]);
            }
        } finally {
            // Always reset loading state and fetching flag
            console.log('[OutletManager] Fetch outlets completed, setting isLoading to false');
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [apiClient, showToast, fetchStaffForOutlet]);

    // Initial load effect - only run once when component mounts or user changes
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (isPremium && currentUser && !hasInitializedRef.current) {
            hasInitializedRef.current = true;
            fetchOutlets();
        } else if (!isPremium || !currentUser) {
            setIsLoading(false);
            hasInitializedRef.current = false;
        }
    }, [isPremium, currentUser, fetchOutlets]);
    
    // Effect for when currentOutletId changes (after switching)
    useEffect(() => {
        // Only refetch if currentOutletId actually changed (not on initial mount)
        if (isPremium && currentUser && currentOutletId && prevOutletIdRef.current !== currentOutletId) {
            prevOutletIdRef.current = currentOutletId;
            // Wait a bit to ensure parent state is fully updated, then refetch
            // Show loading spinner if we're switching, otherwise refetch silently
            const timer = setTimeout(() => {
                const shouldShowLoading = isSwitchingRef.current;
                console.log('Refetching outlets after switch, showLoading:', shouldShowLoading);
                fetchOutlets(shouldShowLoading, true);
                if (shouldShowLoading) {
                    isSwitchingRef.current = false; // Reset the flag after starting fetch
                }
            }, 300);
            return () => clearTimeout(timer);
        } else if (currentOutletId && !prevOutletIdRef.current) {
            // Initialize the ref on first mount
            prevOutletIdRef.current = currentOutletId;
        }
    }, [currentOutletId, isPremium, currentUser, fetchOutlets]);

    // Fetch staff details when currentOutletId changes (only for active outlet)
    useEffect(() => {
        if (isPremium && currentUser && currentOutletId) {
            // Find the outlet in the current list
            const activeOutlet = outlets.find(o => String(o._id) === String(currentOutletId));
            if (activeOutlet && activeOutlet.staffCount > 0) {
                fetchStaffForOutlet(currentOutletId);
            }
        }
    }, [currentOutletId, outlets, isPremium, currentUser, fetchStaffForOutlet]);

    const handleOpenModal = (outlet = null) => {
        if (outlet) {
            setEditingOutlet(outlet);
            setFormData({
                name: outlet.name || '',
                taxId: outlet.taxId || '',
                address: outlet.address || '',
                phone: outlet.phone || '',
                email: outlet.email || '',
                settings: outlet.settings || { receiptFooter: 'Thank you for shopping!' }
            });
        } else {
            setEditingOutlet(null);
            setFormData({
                name: '', taxId: '', address: '', phone: '', email: '',
                settings: { receiptFooter: 'Thank you for shopping!' }
            });
        }
        setErrors({});
        setValidationErrors({});
        setApiError(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingOutlet(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all fields
        const errors = {};
        const nameError = validateShopName(formData.name);
        if (nameError) errors.name = nameError;
        
        // Phone is optional, but if provided, validate it
        if (formData.phone && formData.phone.trim()) {
            const phoneError = validatePhoneNumber(formData.phone);
            if (phoneError) errors.phone = phoneError;
        }
        
        // Email is optional, but if provided, validate it
        if (formData.email && formData.email.trim()) {
            const emailError = validateEmail(formData.email);
            if (emailError) errors.email = emailError;
        }
        
        // Tax ID is optional, but if provided, validate it
        if (formData.taxId && formData.taxId.trim()) {
            const taxIdError = validateTaxId(formData.taxId);
            if (taxIdError) errors.taxId = taxIdError;
        }
        
        // Address is optional, but if provided, validate it
        if (formData.address && formData.address.trim()) {
            const addressError = validateAddress(formData.address);
            if (addressError) errors.address = addressError;
        }
        
        setValidationErrors(errors);
        
        if (Object.keys(errors).length > 0) {
            showToast('Please fix validation errors', 'error');
            return;
        }

        setIsSubmitting(true);
        setApiError(null); // Clear previous API errors
        try {
            const apiCall = editingOutlet 
                ? apiClient.put(API.outletDetails(editingOutlet._id), formData)
                : apiClient.post(API.outlets, formData);

            const response = await apiCall;
            if (response.data.success) {
                showToast(`Store ${editingOutlet ? 'updated' : 'created'} successfully!`, 'success');
                await fetchOutlets();
                
                // Notify parent to refetch outlets (for Header component)
                if (onOutletsChange) {
                    onOutletsChange();
                }
                
                handleCloseModal();
                setValidationErrors({});
                setApiError(null);
            } else {
                // Handle case where API returns success: false
                const errorMessage = response.data?.error || response.data?.message || 'Save failed.';
                setApiError(errorMessage);
                showToast(errorMessage, 'error');
                // Scroll to error after a brief delay to ensure it's rendered
                setTimeout(() => {
                    errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }
        } catch (error) {
            // Extract error message from response
            const errorMessage = error.response?.data?.error 
                || error.response?.data?.message 
                || error.message 
                || 'Save failed.';
            
            console.error('Store creation/update error:', error);
            setApiError(errorMessage); // Set error to display in modal
            showToast(errorMessage, 'error');
            // Scroll to error after a brief delay to ensure it's rendered
            setTimeout(() => {
                errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSwitchOutlet = async (outletId) => {
        setIsSubmitting(true);
        isSwitchingRef.current = true; // Set flag to indicate we're switching
        try {
            const response = await apiClient.put(API.switchOutlet(outletId));
            if (response.data.success) {
                showToast(`Switched to ${response.data.data.outlet.name}`, 'success');
                // Update parent state - this will trigger useEffect to refetch outlets
                if (onOutletSwitch) {
                    onOutletSwitch(response.data.data.outlet);
                }
                // The useEffect will automatically refetch when currentOutletId changes
                // Loading will be shown during the refetch
            } else {
                isSwitchingRef.current = false; // Reset if switch failed
            }
        } catch (error) {
            showToast('Failed to switch outlet.', 'error');
            isSwitchingRef.current = false; // Reset on error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (outlet) => {
        setOutletToDelete(outlet);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!outletToDelete) return;
        const deletedOutletId = outletToDelete._id;
        const wasCurrentOutlet = deletedOutletId === currentOutletId;
        
        try {
            await apiClient.delete(API.outletDetails(deletedOutletId));
            showToast('Branch deleted', 'success');
            setDeleteModalOpen(false);
            setOutletToDelete(null);
            
            // Update local outlets list
            await fetchOutlets();
            
            // Notify parent to refetch outlets (for Header component)
            if (onOutletsChange) {
                await onOutletsChange();
            }
            
            // If the deleted outlet was the current one, switch to first available
            if (wasCurrentOutlet) {
                // Wait a bit for outlets to be fetched, then switch
                setTimeout(async () => {
                    try {
                        const response = await apiClient.get(API.outlets);
                        if (response.data?.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
                            const firstOutlet = response.data.data[0];
                            // Switch to the first outlet
                            const switchResponse = await apiClient.put(API.switchOutlet(firstOutlet._id));
                            if (switchResponse.data?.success && onOutletSwitch) {
                                onOutletSwitch(switchResponse.data.data.outlet);
                            }
                        } else {
                            // No outlets left, clear current outlet
                            if (onOutletSwitch) {
                                onOutletSwitch(null);
                            }
                        }
                    } catch (switchError) {
                        console.error('Failed to switch outlet after deletion:', switchError);
                    }
                }, 300);
            }
        } catch (error) {
            showToast('Action failed', 'error');
            setDeleteModalOpen(false);
            setOutletToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalOpen(false);
        setOutletToDelete(null);
    };


    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center">
                <div className="p-6 rounded-full bg-indigo-500/10 mb-6">
                    <Building2 className="w-16 h-16 text-indigo-500" />
                </div>
                <h2 className="text-2xl font-black mb-3 uppercase tracking-tight">Enterprise Multi-Store Access</h2>
                <p className="max-w-md mb-8 text-slate-400 text-sm leading-relaxed">
                    Manage up to 10 locations, sync inventory, and track global sales with our Premium Plan.
                </p>
                <button onClick={() => window.location.href = '/plan-upgrade'} className="bg-indigo-600 hover:bg-indigo-500 px-8 py-3 rounded-2xl font-black text-xs tracking-widest text-white shadow-xl shadow-indigo-600/20 transition-all active:scale-95">
                    UPGRADE TO PREMIUM
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">Syncing Store Network...</p>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-transparent text-white">
            {/* Sticky Header */}
            <header className={`sticky top-0 z-[50] ${darkMode ? 'bg-slate-950/95 backdrop-blur-xl border-b border-slate-800' : 'bg-white/95 backdrop-blur-xl border-b border-slate-200'} shadow-sm`}>
                <div className="p-4 md:p-6">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                                <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    STORE NETWORK
                                </h1>
                                <p className={`text-xs font-bold tracking-wide opacity-70 mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Managing {outlets.length} active branches across your enterprise
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowSearch(!showSearch);
                                    if (showSearch) {
                                        setSearchTerm(''); // Clear search when hiding
                                    }
                                }}
                                className={`p-3 rounded-xl border transition-all active:scale-95 shrink-0 ${
                                    showSearch 
                                        ? darkMode 
                                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' 
                                            : 'bg-indigo-50 border-indigo-500/50 text-indigo-600'
                                        : darkMode 
                                            ? 'bg-slate-800 border-slate-700 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400' 
                                            : 'bg-white border-slate-200 hover:border-indigo-500/50 text-slate-600 hover:text-indigo-600'
                                }`}
                            >
                                <Search size={18} />
                            </button>
                        </div>
                        
                        {/* Search Bar - Only show when showSearch is true */}
                        {showSearch && (
                            <div className="relative group">
                                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${darkMode ? 'text-slate-600 group-focus-within:text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'} transition-colors`} />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by name, address, phone, email, or tax ID..."
                                    className={`w-full pl-10 pr-10 py-2.5 md:py-3 ${inputBase} border rounded-xl text-[16px] md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}`}
                                    autoFocus
                                />
                                {searchTerm && (
                                    <X 
                                        onClick={() => setSearchTerm('')} 
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 z-10 ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'} cursor-pointer transition-colors`} 
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="p-4 md:p-8">
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredOutlets.length === 0 && !isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20">
                            <Store className={`w-16 h-16 ${darkMode ? 'text-slate-700' : 'text-slate-300'} mb-4`} />
                            <p className={`text-lg font-black ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                {searchTerm ? 'No branches found' : 'No branches available'}
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'} mt-2`}>
                                {searchTerm ? 'Try a different search term' : 'Create your first branch to get started'}
                            </p>
                        </div>
                    ) : (
                        filteredOutlets.map((outlet) => {
                    const isCurrentActive = currentOutletId === outlet._id;
                    return (
                        <article
                            key={outlet._id}
                            className={`group relative p-6 rounded-2xl border transition-all duration-300 ${cardBase} ${
                                isCurrentActive ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-black' : 'hover:border-slate-600'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-3xl ${isCurrentActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400'}`}>
                                    <Store size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(outlet)} className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                                        <Edit3 size={16} />
                                    </button>
                                    {!isCurrentActive && (
                                        <button onClick={() => handleDeleteClick(outlet)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-black tracking-tight mb-4 truncate">{outlet.name}</h3>
                                
                                {/* Contact Information */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <MapPin size={14} className="text-indigo-500" />
                                        <span className="truncate">{outlet.address || 'Address not listed'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Phone size={14} className="text-indigo-500" />
                                        <span>{outlet.phone || 'No contact phone'}</span>
                                    </div>
                                </div>

                                {/* Staff Section - Separate Card Style */}
                                <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Users size={16} className="text-indigo-500" />
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Staff Team</span>
                                        </div>
                                        <span className={`text-sm font-black ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                            {outlet.staffCount || 0}
                                        </span>
                                    </div>
                                    
                                    {/* Only show staff details for the currently active outlet */}
                                    {isCurrentActive && (() => {
                                        const outletIdStr = String(outlet._id);
                                        const staffList = outletStaff[outletIdStr];
                                        const isLoading = loadingStaff[outletIdStr];
                                        
                                        if (staffList && staffList.length > 0 && !isLoading) {
                                            return (
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {staffList.slice(0, 4).map((staff) => (
                                                        <div key={staff._id || staff.email || Math.random()} className="flex items-center gap-2 text-[11px] font-bold">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${staff.active ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                                                            <span className={`truncate flex-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                                                {staff.name || staff.email}
                                                            </span>
                                                            <span className={`text-[10px] uppercase px-2 py-0.5 rounded ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                                                                {staff.role || 'Staff'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {staffList.length > 4 && (
                                                        <div className={`text-[10px] font-bold pt-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                                                            +{staffList.length - 4} more staff members
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }
                                        
                                        if (!isLoading && (!staffList || staffList.length === 0) && (outlet.staffCount === 0 || !outlet.staffCount)) {
                                            return (
                                                <div className={`text-[11px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    No staff members assigned
                                                </div>
                                            );
                                        }
                                        
                                        if (isLoading && outlet.staffCount > 0) {
                                            return (
                                                <div className={`text-[11px] font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Loading staff details...
                                                </div>
                                            );
                                        }
                                        
                                        return null;
                                    })()}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                                {isCurrentActive ? (
                                    <div className="flex items-center gap-2 text-emerald-500">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <span className="text-[10px] font-black tracking-widest uppercase">Currently Active</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleSwitchOutlet(outlet._id)}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-slate-800 hover:bg-indigo-600 text-white text-[10px] font-black tracking-widest rounded-2xl transition-all flex items-center justify-center gap-2 uppercase"
                                    >
                                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                                        Switch To Hub
                                    </button>
                                )}
                            </div>
                        </article>
                        );
                    })
                    )}
                </section>
            </div>

            {/* FAB: Add New Branch Button - Floating Icon */}
            <button 
                onClick={() => handleOpenModal()} 
                className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] w-14 h-14 md:w-16 md:h-16 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/50 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center hover:shadow-indigo-600/60 group"
                aria-label="Add new branch"
            >
                <Plus className="w-6 h-6 md:w-8 md:h-8 group-hover:rotate-90 transition-transform duration-300" strokeWidth={2.5} />
            </button>

            {/* UPGRADED MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-3 sm:p-4">
                    <div className={`${cardBase} w-full max-w-md h-[85vh] sm:h-[80vh] max-h-[600px] rounded-2xl border overflow-hidden shadow-2xl flex flex-col`}>
                        <div className={`p-3 sm:p-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center flex-shrink-0`}>
                            <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {editingOutlet ? 'Configure Branch' : 'New Branch'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                                {/* API Error Message */}
                                {apiError && (
                                    <div 
                                        ref={errorRef}
                                        className={`p-4 rounded-xl border flex gap-3 items-start animate-in slide-in-from-top-2 duration-300 ${darkMode ? 'bg-rose-500/10 border-rose-500/30 ring-2 ring-rose-500/20 animate-pulse' : 'bg-rose-50 border-rose-200 ring-2 ring-rose-500/10 animate-pulse'}`}
                                    >
                                        <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 animate-pulse ${darkMode ? 'text-rose-400' : 'text-rose-600'}`} />
                                        <div className="flex-1">
                                            <p className={`text-sm font-bold ${darkMode ? 'text-rose-400' : 'text-rose-600'}`}>
                                                {apiError}
                                            </p>
                                            {apiError && apiError.includes('Store limit reached') && setCurrentPage && (
                                                <p className={`text-xs mt-2 ${darkMode ? 'text-rose-300' : 'text-rose-500'}`}>
                                                    If you want to create more stores,{' '}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            handleCloseModal();
                                                            setCurrentPage('support');
                                                        }}
                                                        className={`underline font-bold hover:opacity-80 transition-opacity ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}
                                                    >
                                                        contact support
                                                    </button>
                                                    .
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Branch Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => {
                                            setFormData({ ...formData, name: e.target.value });
                                            if (validationErrors.name) setValidationErrors(prev => ({ ...prev, name: null }));
                                        }}
                                        placeholder="e.g. Mumbai North Hub"
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${validationErrors.name ? 'border-red-500' : ''}`}
                                    />
                                    {validationErrors.name && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.name}</p>}
                                </div>

                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Tax ID / GSTIN
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                        placeholder="Optional"
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            maxLength="10"
                                            value={formData.phone}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                setFormData({ ...formData, phone: value });
                                                if (validationErrors.phone) setValidationErrors(prev => ({ ...prev, phone: null }));
                                            }}
                                            placeholder="10-digit mobile"
                                            className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${validationErrors.phone ? 'border-red-500' : ''}`}
                                        />
                                        {validationErrors.phone && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.phone}</p>}
                                    </div>
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => {
                                                setFormData({ ...formData, email: e.target.value });
                                                if (validationErrors.email) setValidationErrors(prev => ({ ...prev, email: null }));
                                            }}
                                            placeholder="branch@business.com"
                                            className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${validationErrors.email ? 'border-red-500' : ''}`}
                                        />
                                        {validationErrors.email && <p className="text-[10px] text-red-500 font-bold mt-1">{validationErrors.email}</p>}
                                    </div>
                                </div>

                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Address
                                    </label>
                                    <textarea
                                        rows="2"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Complete street address, city, state..."
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none`}
                                    />
                                </div>

                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Receipt Footer Note
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.settings.receiptFooter}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            settings: { ...formData.settings, receiptFooter: e.target.value }
                                        })}
                                        placeholder="Visit again!"
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-[16px] md:text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                    />
                                </div>
                            </div>

                            <div className={`p-3 sm:p-4 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0`}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className={`flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                                        darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="hidden sm:inline">{editingOutlet ? 'Updating...' : 'Creating...'}</span>
                                            <span className="sm:hidden">{editingOutlet ? 'Updating' : 'Creating'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="hidden sm:inline">{editingOutlet ? 'Update Branch' : 'Create Branch'}</span>
                                            <span className="sm:hidden">{editingOutlet ? 'Update' : 'Create'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && outletToDelete && (
                <ConfirmationModal
                    message={`Are you sure you want to delete "${outletToDelete.name}"? This will delete the store and it can't be accessed later.`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleDeleteCancel}
                    darkMode={darkMode}
                    confirmText="Delete Branch"
                    cancelText="Cancel"
                />
            )}
        </main>
    );
};

export default OutletManager;