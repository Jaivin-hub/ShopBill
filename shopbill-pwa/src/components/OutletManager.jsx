import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { 
    Store, Plus, MapPin, Phone, 
    MoreVertical, Power, Edit3, Trash2, 
    ArrowUpRight, Building2, ShieldCheck,
    Loader2, X, Save, Mail, Globe, 
    Receipt, AlertCircle, Search
} from 'lucide-react';
import API from '../config/api';
import { validateShopName, validatePhoneNumber, validateEmail, validateTaxId, validateAddress } from '../utils/validation';

const OutletManager = ({ apiClient, showToast, currentUser, onOutletSwitch, currentOutletId, darkMode, setCurrentPage }) => {
    const [outlets, setOutlets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
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

    const fetchOutlets = useCallback(async (showLoading = true, preserveOnError = false) => {
        if (showLoading) setIsLoading(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data.success && Array.isArray(response.data.data)) {
                setOutlets(response.data.data);
            } else if (response.data.success && !Array.isArray(response.data.data)) {
                // If response is successful but data is not an array, set empty array
                setOutlets([]);
            }
        } catch (error) {
            console.error('Failed to fetch outlets:', error);
            // Only show toast if this is the initial load, not a refetch
            if (showLoading) {
                showToast('Failed to load store locations.', 'error');
            }
            // If preserveOnError is true, don't clear the outlets list
            if (!preserveOnError) {
                setOutlets([]);
            }
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [apiClient, showToast]);

    useEffect(() => {
        if (isPremium && currentUser) {
            // Skip refetch if we're in the middle of switching (manual refetch will handle it)
            if (!isSwitchingRef.current) {
                fetchOutlets();
            }
        } else {
            setIsLoading(false);
        }
    }, [isPremium, currentUser, currentOutletId, fetchOutlets]);

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
                fetchOutlets();
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
        isSwitchingRef.current = true; // Mark that we're switching
        try {
            const response = await apiClient.put(API.switchOutlet(outletId));
            if (response.data.success) {
                showToast(`Switched to ${response.data.data.outlet.name}`, 'success');
                // Update parent state first - this will trigger useEffect, but we'll skip it
                if (onOutletSwitch) {
                    onOutletSwitch(response.data.data.outlet);
                }
                // Manually refetch immediately to ensure list updates
                // Don't show loading state during refetch to avoid clearing the list
                // Preserve existing outlets if refetch fails
                await fetchOutlets(false, true);
            }
        } catch (error) {
            showToast('Failed to switch outlet.', 'error');
        } finally {
            setIsSubmitting(false);
            // Reset switching flag after a short delay to allow useEffect to work normally next time
            setTimeout(() => {
                isSwitchingRef.current = false;
            }, 500);
        }
    };

    const handleDelete = async (outletId) => {
        if (!window.confirm('Deactivate this branch?')) return;
        try {
            await apiClient.delete(API.outletDetails(outletId));
            showToast('Branch deactivated', 'success');
            fetchOutlets();
        } catch (error) {
            showToast('Action failed', 'error');
        }
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
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className={`text-2xl font-black tracking-tight flex items-center gap-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                    STORE NETWORK
                                </h1>
                                <p className={`text-xs font-bold mt-1 tracking-wide opacity-70 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Managing {outlets.length} active branches across your enterprise
                                </p>
                            </div>
                        </div>
                        
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-600 group-focus-within:text-indigo-500' : 'text-slate-400 group-focus-within:text-indigo-500'} transition-colors`} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, address, phone, email, or tax ID..."
                                className={`w-full pl-10 pr-10 py-2.5 md:py-3 ${inputBase} border rounded-xl text-[16px] md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all ${darkMode ? 'placeholder:text-slate-500' : 'placeholder:text-slate-400'}`}
                            />
                            {searchTerm && (
                                <X 
                                    onClick={() => setSearchTerm('')} 
                                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'} cursor-pointer transition-colors`} 
                                />
                            )}
                        </div>
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
                    const isActive = currentOutletId === outlet._id;
                    return (
                        <article
                            key={outlet._id}
                            className={`group relative p-6 rounded-2xl border transition-all duration-300 ${cardBase} ${
                                isActive ? 'ring-2 ring-indigo-500 ring-offset-4 ring-offset-black' : 'hover:border-slate-600'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-3xl ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-indigo-400'}`}>
                                    <Store size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleOpenModal(outlet)} className="p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                                        <Edit3 size={16} />
                                    </button>
                                    {!isActive && (
                                        <button onClick={() => handleDelete(outlet._id)} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xl font-black tracking-tight mb-2 truncate">{outlet.name}</h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <MapPin size={14} className="text-indigo-500" />
                                        <span className="truncate">{outlet.address || 'Address not listed'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                                        <Phone size={14} className="text-indigo-500" />
                                        <span>{outlet.phone || 'No contact phone'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
                                {isActive ? (
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
        </main>
    );
};

export default OutletManager;