import React, { useState, useEffect } from 'react';
import { 
    Store, Plus, MapPin, Phone, 
    MoreVertical, Power, Edit3, Trash2, 
    ArrowUpRight, Building2, ShieldCheck,
    Loader2, X, Save, Mail, Globe, 
    Receipt, AlertCircle
} from 'lucide-react';
import API from '../config/api';
import { validateShopName, validatePhoneNumber, validateEmail, validateTaxId, validateAddress } from '../utils/validation';

const OutletManager = ({ apiClient, showToast, currentUser, onOutletSwitch, currentOutletId, darkMode }) => {
    const [outlets, setOutlets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
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

    const isPremium = currentUser?.plan === 'PREMIUM';

    // Styling logic
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const inputBase = darkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
    const subText = darkMode ? 'text-slate-400' : 'text-slate-500';

    useEffect(() => {
        if (isPremium && currentUser) {
            fetchOutlets();
        } else {
            setIsLoading(false);
        }
    }, [isPremium, currentUser, currentOutletId]);

    const fetchOutlets = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data.success) {
                setOutlets(response.data.data || []);
            }
        } catch (error) {
            showToast('Failed to load store locations.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

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
            }
        } catch (error) {
            showToast(error.response?.data?.error || 'Save failed.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSwitchOutlet = async (outletId) => {
        setIsSubmitting(true);
        try {
            const response = await apiClient.put(API.switchOutlet(outletId));
            if (response.data.success) {
                showToast(`Switched to ${response.data.data.outlet.name}`, 'success');
                if (onOutletSwitch) onOutletSwitch(response.data.data.outlet);
                // Refetch outlets to update the list and show which outlet is now active
                await fetchOutlets();
            }
        } catch (error) {
            showToast('Failed to switch outlet.', 'error');
        } finally {
            setIsSubmitting(false);
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
        <main className="p-4 md:p-8 min-h-screen bg-transparent text-white">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        STORE NETWORK
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-1 tracking-wide uppercase opacity-70">
                        Managing {outlets.length} active branches across your enterprise
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={18} /> ADD NEW BRANCH
                </button>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {outlets.map((outlet) => {
                    const isActive = currentOutletId === outlet._id;
                    return (
                        <article
                            key={outlet._id}
                            className={`group relative p-6 rounded-[2.5rem] border transition-all duration-300 ${cardBase} ${
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
                })}
            </section>

            {/* UPGRADED MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
                    <div className={`${cardBase} w-full max-w-md rounded-2xl border overflow-hidden shadow-2xl`}>
                        <div className={`p-6 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center`}>
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
                                            {editingOutlet ? 'Updating...' : 'Creating...'}
                                        </>
                                    ) : (
                                        editingOutlet ? 'Update Branch' : 'Create Branch'
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