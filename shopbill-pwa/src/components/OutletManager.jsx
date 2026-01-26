import React, { useState, useEffect } from 'react';
import { Store, Plus, Edit, Trash2, X, Save, Loader, AlertCircle, CheckCircle, Building } from 'lucide-react';
import API from '../config/api';

const OutletManager = ({ apiClient, showToast, currentUser, onOutletSwitch, currentOutletId }) => {
    const [outlets, setOutlets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOutlet, setEditingOutlet] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        taxId: '',
        address: '',
        phone: '',
        email: '',
        settings: {
            receiptFooter: 'Thank you for shopping!'
        }
    });
    const [errors, setErrors] = useState({});

    // Check if user has PREMIUM plan
    const isPremium = currentUser?.plan === 'PREMIUM';

    useEffect(() => {
        if (isPremium && currentUser) {
            fetchOutlets();
        } else {
            setIsLoading(false);
        }
    }, [isPremium, currentUser]);

    const fetchOutlets = async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data.success) {
                setOutlets(response.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch outlets:', error);
            showToast('Failed to load outlets.', 'error');
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
                settings: outlet.settings || {
                    receiptFooter: 'Thank you for shopping!'
                }
            });
        } else {
            setEditingOutlet(null);
            setFormData({
                name: '',
                taxId: '',
                address: '',
                phone: '',
                email: '',
                settings: {
                    receiptFooter: 'Thank you for shopping!'
                }
            });
        }
        setErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingOutlet(null);
        setFormData({
            name: '',
            taxId: '',
            address: '',
            phone: '',
            email: '',
            settings: {
                lowStockThreshold: 5,
                receiptFooter: 'Thank you for shopping!'
            }
        });
        setErrors({});
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) {
            newErrors.name = 'Outlet name is required.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            if (editingOutlet) {
                // Update existing outlet
                const response = await apiClient.put(API.outletDetails(editingOutlet._id), formData);
                if (response.data.success) {
                    showToast('Outlet updated successfully!', 'success');
                    await fetchOutlets();
                    handleCloseModal();
                }
            } else {
                // Create new outlet
                const response = await apiClient.post(API.outlets, formData);
                if (response.data.success) {
                    showToast('Outlet created successfully!', 'success');
                    await fetchOutlets();
                    handleCloseModal();
                }
            }
        } catch (error) {
            console.error('Outlet save error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save outlet.';
            showToast(errorMessage, 'error');
        }
    };

    const handleDelete = async (outletId) => {
        if (!window.confirm('Are you sure you want to deactivate this outlet? This action can be reversed later.')) {
            return;
        }

        try {
            const response = await apiClient.delete(API.outletDetails(outletId));
            if (response.data.success) {
                showToast('Outlet deactivated successfully.', 'success');
                await fetchOutlets();
            }
        } catch (error) {
            console.error('Outlet delete error:', error);
            showToast('Failed to deactivate outlet.', 'error');
        }
    };

    const handleSwitchOutlet = async (outletId) => {
        try {
            const response = await apiClient.put(API.switchOutlet(outletId));
            if (response.data.success) {
                showToast('Outlet switched successfully!', 'success');
                if (onOutletSwitch) {
                    onOutletSwitch(response.data.data.outlet);
                }
                await fetchOutlets();
            }
        } catch (error) {
            console.error('Switch outlet error:', error);
            showToast('Failed to switch outlet.', 'error');
        }
    };

    if (!isPremium) {
        return (
            <div className="p-4 md:p-8 bg-gray-950 text-white">
                <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
                    <Building className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
                    <h2 className="text-2xl font-bold mb-4">Multiple Outlets Feature</h2>
                    <p className="text-gray-400 mb-6">
                        The multiple outlets feature is only available for PREMIUM plan users. 
                        Upgrade your plan to manage multiple store locations from a single account.
                    </p>
                    <button
                        onClick={() => window.location.href = '/plan-upgrade'}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        Upgrade to Premium
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950">
                <Loader className="w-10 h-10 animate-spin text-indigo-400" />
            </div>
        );
    }

    return (
        <main className="p-4 md:p-8 bg-gray-950 text-white min-h-screen" itemScope itemType="https://schema.org/ItemList">
            <header className="mb-6" itemProp="headline">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                            <Store className="w-8 h-8 text-indigo-400" aria-hidden="true" />
                            Outlet Management
                        </h1>
                        <p className="text-gray-400 mt-2" itemProp="description">
                            Manage multiple store locations. Switch between outlets to view and manage outlet-specific data.
                        </p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                        aria-label="Create new outlet"
                    >
                        <Plus className="w-5 h-5" aria-hidden="true" />
                        Add Outlet
                    </button>
                </div>
            </header>

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Outlet list">
                {outlets.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                        <Store className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400 mb-4">No outlets found.</p>
                        <button
                            onClick={() => handleOpenModal()}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Create Your First Outlet
                        </button>
                    </div>
                ) : (
                    outlets.map((outlet) => (
                        <article
                            key={outlet._id}
                            className={`bg-gray-800 rounded-xl p-6 border-2 transition-all ${
                                currentOutletId === outlet._id
                                    ? 'border-indigo-500 shadow-lg shadow-indigo-500/20'
                                    : 'border-gray-700 hover:border-gray-600'
                            }`}
                            itemScope
                            itemType="https://schema.org/Store"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-1" itemProp="name">
                                        {outlet.name}
                                    </h3>
                                    {currentOutletId === outlet._id && (
                                        <span className="inline-block px-2 py-1 text-xs font-bold bg-indigo-600 text-white rounded-full">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(outlet)}
                                        className="p-2 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition-colors"
                                        aria-label={`Edit outlet ${outlet.name}`}
                                    >
                                        <Edit className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    {currentOutletId !== outlet._id && (
                                        <button
                                            onClick={() => handleDelete(outlet._id)}
                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            aria-label={`Delete outlet ${outlet.name}`}
                                        >
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-400 mb-4">
                                {outlet.address && (
                                    <p className="flex items-center gap-2">
                                        <span className="w-4 h-4">📍</span>
                                        <span itemProp="address">{outlet.address}</span>
                                    </p>
                                )}
                                {outlet.phone && (
                                    <p className="flex items-center gap-2">
                                        <span className="w-4 h-4">📞</span>
                                        <span itemProp="telephone">{outlet.phone}</span>
                                    </p>
                                )}
                                {outlet.email && (
                                    <p className="flex items-center gap-2">
                                        <span className="w-4 h-4">✉️</span>
                                        <span itemProp="email">{outlet.email}</span>
                                    </p>
                                )}
                                {outlet.taxId && (
                                    <p className="flex items-center gap-2">
                                        <span className="w-4 h-4">🏢</span>
                                        <span>GST: {outlet.taxId}</span>
                                    </p>
                                )}
                            </div>

                            {currentOutletId !== outlet._id && (
                                <button
                                    onClick={() => handleSwitchOutlet(outlet._id)}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Switch to This Outlet
                                </button>
                            )}
                        </article>
                    ))
                )}
            </section>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="outlet-modal-title">
                    <section className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
                        <header className="p-6 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800 z-10">
                            <h2 id="outlet-modal-title" className="text-2xl font-bold text-white">
                                {editingOutlet ? 'Edit Outlet' : 'Create New Outlet'}
                            </h2>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                aria-label="Close modal"
                            >
                                <X className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                                    Outlet Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={`w-full px-4 py-2 bg-gray-700 border rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition ${
                                        errors.name ? 'border-red-500' : 'border-gray-600'
                                    }`}
                                    required
                                />
                                {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-1">
                                        Phone
                                    </label>
                                    <input
                                        id="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-1">
                                    Address
                                </label>
                                <textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
                                />
                            </div>

                            <div>
                                <label htmlFor="taxId" className="block text-sm font-medium text-gray-300 mb-1">
                                    Tax ID / GSTIN
                                </label>
                                <input
                                    id="taxId"
                                    type="text"
                                    value={formData.taxId}
                                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                            </div>

                            <div>
                                <label htmlFor="receiptFooter" className="block text-sm font-medium text-gray-300 mb-1">
                                    Receipt Footer
                                </label>
                                <input
                                    id="receiptFooter"
                                    type="text"
                                    value={formData.settings.receiptFooter}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        settings: { ...formData.settings, receiptFooter: e.target.value }
                                    })}
                                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-6 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Save className="w-4 h-4" aria-hidden="true" />
                                    {editingOutlet ? 'Update Outlet' : 'Create Outlet'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </main>
    );
};

export default OutletManager;

