import React, { useState, useEffect } from 'react';
import { 
    Store, Plus, MapPin, Phone, 
    MoreVertical, Power, Edit3, Trash2, 
    ArrowUpRight, Building2, ShieldCheck,
    Loader2, X, Save, Mail, FileText
} from 'lucide-react';
import API from '../config/api';
import { validateShopName, validatePhoneNumber, validateEmail, validateTaxId, validateAddress } from '../utils/validation';

const StoreControl = ({ 
    darkMode, 
    apiClient, 
    showToast, 
    currentUser, 
    onOutletSwitch, 
    currentOutletId 
}) => {
    // --- STATE MANAGEMENT ---
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStore, setEditingStore] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        settings: { receiptFooter: 'Thank you for shopping!' }
    });

    // Check if user has PREMIUM plan
    const isPremium = currentUser?.plan === 'PREMIUM';

    // Styling logic
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const inputBase = darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const subText = darkMode ? 'text-slate-400' : 'text-slate-500';

    // --- API OPERATIONS ---

    /**
     * Updated Effect: 
     * Now watches currentUser to ensure we don't attempt a fetch before
     * user data (and thus the plan type) is verified.
     */
    useEffect(() => {
        if (currentUser) {
            if (isPremium) {
                fetchStores();
            } else {
                setIsLoading(false);
            }
        }
    }, [currentUser, isPremium]);

    const fetchStores = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data.success) {
                setStores(response.data.data || []);
            }
        } catch (error) {
            console.error('Fetch Stores Error:', error);
            showToast('Failed to load store locations.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSwitch = async (storeId) => {
        if (storeId === currentOutletId) return;
        setIsSubmitting(true);
        try {
            const response = await apiClient.put(API.switchOutlet(storeId));
            if (response.data.success) {
                showToast(`Switched to ${response.data.data.outlet.name}`, 'success');
                if (onOutletSwitch) onOutletSwitch(response.data.data.outlet);
                // Refetch stores to update the list and show which store is now active
                await fetchStores();
            }
        } catch (error) {
            showToast('Failed to switch outlet.', 'error');
        } finally {
            setIsSubmitting(false);
        }
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
        
        if (Object.keys(errors).length > 0) {
            showToast('Please fix validation errors', 'error');
            return;
        }
        
        setIsSubmitting(true);
        try {
            const apiCall = editingStore 
                ? apiClient.put(API.outletDetails(editingStore._id), formData)
                : apiClient.post(API.outlets, formData);

            const response = await apiCall;
            if (response.data.success) {
                showToast(`Store ${editingStore ? 'updated' : 'created'} successfully!`, 'success');
                fetchStores();
                handleCloseModal();
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Save failed.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleStatus = async (storeId, currentStatus) => {
        try {
            await apiClient.put(API.outletDetails(storeId), { isActive: !currentStatus });
            showToast(`Store ${!currentStatus ? 'Activated' : 'Deactivated'}`, 'success');
            fetchStores();
        } catch (error) {
            showToast('Update failed', 'error');
        }
    };

    // --- MODAL LOGIC ---
    const handleOpenModal = (store = null) => {
        if (store) {
            setEditingStore(store);
            setFormData({
                name: store.name || '',
                taxId: store.taxId || '',
                address: store.address || '',
                phone: store.phone || '',
                email: store.email || '',
                settings: store.settings || { receiptFooter: 'Thank you for shopping!' }
            });
        } else {
            setEditingStore(null);
            setFormData({ name: '', taxId: '', address: '', phone: '', email: '', settings: { receiptFooter: 'Thank you for shopping!' } });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingStore(null);
    };

    // --- VIEW LOGIC ---

    if (currentUser && !isPremium) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-indigo-600/5 rounded-3xl border border-dashed border-indigo-500/30">
                <Building2 className="w-16 h-16 text-indigo-500 mb-4 opacity-50" />
                <h2 className="text-xl font-black mb-2 uppercase tracking-tight">Enterprise Hub Locked</h2>
                <p className={`max-w-md mb-6 text-sm ${subText}`}>
                    Manage up to 10 locations, sync inventory, and track global sales with our Premium Plan.
                </p>
                <button 
                    onClick={() => window.location.href = '/settings/billing'} 
                    className="bg-indigo-600 px-8 py-3 rounded-2xl font-black text-xs tracking-widest text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
                >
                    UPGRADE NOW
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 gap-4">
                <Loader2 className="animate-spin text-indigo-500" size={40} />
                <p className="text-[10px] font-black tracking-widest opacity-50 uppercase">Loading Store Network...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* <h2 className="font-black text-lg tracking-tight uppercase">Store Network</h2> */}
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-black text-xs tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                >
                    <Plus size={16} /> ADD BRANCH
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stores.map((store) => {
                    const isCurrent = currentOutletId === store._id;
                    return (
                        <div key={store._id} className={`p-5 rounded-3xl border transition-all ${cardBase} ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-transparent' : ''}`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-2xl ${store.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                        <Store size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-sm tracking-tight">{store.name}</h3>
                                        <div className="flex items-center gap-1 opacity-60 text-[10px] font-bold">
                                            <MapPin size={10} /> {store.address || 'Location not set'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${store.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                        {store.isActive ? 'OPERATIONAL' : 'INACTIVE'}
                                    </span>
                                    {isCurrent && (
                                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                                            ACTIVE
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-6">
                                {isCurrent ? (
                                    <button onClick={() => handleOpenModal(store)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-500/10 text-[10px] font-black tracking-widest hover:bg-slate-500/20 transition-all uppercase">
                                        <Edit3 size={14} /> Configure
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleSwitch(store._id)}
                                        disabled={isSubmitting || !store.isActive}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-[10px] font-black tracking-widest hover:bg-indigo-500 transition-all uppercase disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />} Switch to Hub
                                    </button>
                                )}
                                <button onClick={() => toggleStatus(store._id, store.isActive)} className={`p-2.5 rounded-xl border transition-all ${store.isActive ? 'text-red-500 hover:bg-red-500/10 border-red-500/20' : 'text-emerald-500 hover:bg-emerald-500/10 border-emerald-500/20'}`}>
                                    <Power size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                <button onClick={() => handleOpenModal()} className="p-8 rounded-3xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center gap-3 opacity-40 hover:opacity-100 transition-all min-h-[160px]">
                    <Plus className="text-slate-500" size={24} />
                    <p className="text-[10px] font-black tracking-[0.2em] uppercase">Add New Branch</p>
                </button>
            </div>

            {/* CREATE/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className={`${cardBase} w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl`}>
                        <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
                            <h3 className={`text-lg font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                                {editingStore ? 'Edit Branch' : 'New Branch'}
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Branch Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        placeholder="e.g. Downtown Hub"
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                    />
                                </div>

                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Tax ID / GSTIN
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                                        placeholder="Optional"
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                    />
                                </div>

                                <div>
                                    <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        Address
                                    </label>
                                    <textarea
                                        rows="2"
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        placeholder="Full location address..."
                                        className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none`}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                            placeholder="+91 ..."
                                            className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-xs font-bold mb-2 block ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            placeholder="store@business.com"
                                            className={`w-full ${inputBase} px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={`p-6 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex gap-3`}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                                        darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            {editingStore ? 'Updating...' : 'Creating...'}
                                        </>
                                    ) : (
                                        editingStore ? 'Update Branch' : 'Create Branch'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 p-5 rounded-3xl bg-indigo-600/5 border border-indigo-500/20">
                <ShieldCheck className="text-indigo-500" size={24} />
                <div>
                    <p className="text-[10px] font-black text-indigo-500 tracking-[0.2em] uppercase">Enterprise Plan Active</p>
                    <p className={`text-[10px] leading-relaxed ${subText}`}>Your account is enabled for multi-store management. You can add up to 10 active branches.</p>
                </div>
            </div>
        </div>
    );
};

export default StoreControl;