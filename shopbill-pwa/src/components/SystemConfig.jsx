import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings, Save, Loader, CheckCircle, AlertCircle, DollarSign,
    Shield, Database, Mail, Bell, Lock, Globe, CreditCard,
    Server, RefreshCw, Download, Upload, Trash2, Plus, X,
    Edit2, Eye, EyeOff, Calendar, Clock
} from 'lucide-react';
import API from '../config/api';

// Plan Configuration Component
const PlanConfigCard = ({ plan, config, onUpdate, isEditing, onEdit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: plan.name,
        price: plan.price,
        features: plan.features || [],
        maxUsers: plan.maxUsers || 0,
        maxInventory: plan.maxInventory || 0,
        maxStorage: plan.maxStorage || 0,
    });
    const [newFeature, setNewFeature] = useState('');

    useEffect(() => {
        if (isEditing) {
            setFormData({
                name: plan.name,
                price: plan.price,
                features: plan.features || [],
                maxUsers: plan.maxUsers || 0,
                maxInventory: plan.maxInventory || 0,
                maxStorage: plan.maxStorage || 0,
            });
        }
    }, [plan, isEditing]);

    const handleSave = () => {
        onUpdate(plan.id, formData);
    };

    const handleAddFeature = () => {
        if (newFeature.trim()) {
            setFormData({
                ...formData,
                features: [...formData.features, newFeature.trim()]
            });
            setNewFeature('');
        }
    };

    const handleRemoveFeature = (index) => {
        setFormData({
            ...formData,
            features: formData.features.filter((_, i) => i !== index)
        });
    };

    const planColors = {
        basic: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
        pro: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
        enterprise: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
    };

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${planColors[plan.id]}`}>
                        {plan.name}
                    </span>
                    {!isEditing && (
                        <span className="text-sm text-gray-400">
                            {config.plans[plan.id]?.subscribers || 0} subscribers
                        </span>
                    )}
                </div>
                {!isEditing ? (
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all duration-200 cursor-pointer"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="p-2 rounded-lg text-green-400 hover:text-white hover:bg-green-500/20 transition-all duration-200 cursor-pointer"
                        >
                            <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onCancel}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-500/20 transition-all duration-200 cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Plan Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Monthly Price (₹)</label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            step="0.01"
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Max Users</label>
                            <input
                                type="number"
                                value={formData.maxUsers}
                                onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Max Inventory</label>
                            <input
                                type="number"
                                value={formData.maxInventory}
                                onChange={(e) => setFormData({ ...formData, maxInventory: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">Max Storage (GB)</label>
                            <input
                                type="number"
                                value={formData.maxStorage}
                                onChange={(e) => setFormData({ ...formData, maxStorage: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Features</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                                placeholder="Add feature..."
                                className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                            <button
                                onClick={handleAddFeature}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.features.map((feature, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm border border-indigo-500/30"
                                >
                                    {feature}
                                    <button
                                        onClick={() => handleRemoveFeature(index)}
                                        className="hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Monthly Price</span>
                        <span className="text-lg font-semibold text-white">₹{plan.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Max Users</span>
                        <span className="text-sm font-medium text-white">{plan.maxUsers || 'Unlimited'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Max Inventory</span>
                        <span className="text-sm font-medium text-white">{plan.maxInventory || 'Unlimited'}</span>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                        <div className="pt-3 border-t border-gray-700/50">
                            <p className="text-sm text-gray-400 mb-2">Features:</p>
                            <ul className="space-y-1">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                                        <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Toggle Switch Component
const ToggleSwitch = ({ label, checked, onChange, description }) => {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="flex-1">
                <p className="text-sm font-medium text-white">{label}</p>
                {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    checked ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );
};

const SystemConfig = ({ apiClient, API, showToast, currentUser, darkMode = true }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('plans');
    const [editingPlan, setEditingPlan] = useState(null);
    const [config, setConfig] = useState({
        plans: {
            basic: {
                name: 'Basic',
                price: 499,
                features: ['Basic Inventory Management', 'Up to 5 Users', 'Email Support'],
                maxUsers: 5,
                maxInventory: 1000,
                maxStorage: 10,
                subscribers: 89
            },
            pro: {
                name: 'Pro',
                price: 799,
                features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
                maxUsers: 20,
                maxInventory: 10000,
                maxStorage: 50,
                subscribers: 52
            },
            enterprise: {
                name: 'Enterprise',
                price: 999,
                features: ['Unlimited Everything', 'Custom Integrations', '24/7 Support', 'Dedicated Manager'],
                maxUsers: -1,
                maxInventory: -1,
                maxStorage: 500,
                subscribers: 15
            }
        },
        system: {
            baseCurrency: 'INR',
            taxRate: 18.0,
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            language: 'en'
        },
        featureFlags: {
            aiReports: true,
            globalNotifications: true,
            advancedAnalytics: false,
            apiAccess: true,
            customBranding: false,
            multiCurrency: false
        },
        security: {
            twoFactorAuth: true,
            sessionTimeout: 30,
            passwordMinLength: 8,
            requireStrongPassword: true,
            ipWhitelist: false
        },
        email: {
            smtpEnabled: true,
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            smtpUser: 'noreply@shopbill.com',
            smtpSecure: true
        },
        maintenance: {
            maintenanceMode: false,
            maintenanceMessage: 'System is under maintenance. Please check back later.'
        }
    });

    // Fetch configuration
    const fetchConfig = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminConfig);
            if (response.data.success) {
                // Deep merge API data with default config to preserve missing fields
                const apiData = response.data.data;
                setConfig(prev => {
                    // Merge plans, preserving subscribers count
                    const mergedPlans = {};
                    ['basic', 'pro', 'enterprise'].forEach(planKey => {
                        mergedPlans[planKey] = {
                            ...prev.plans[planKey],
                            ...(apiData.plans?.[planKey] || {}),
                            // Preserve subscribers if not in API response
                            subscribers: apiData.plans?.[planKey]?.subscribers ?? prev.plans[planKey].subscribers
                        };
                    });
                    
                    return {
                        plans: mergedPlans,
                        system: { ...prev.system, ...(apiData.system || {}) },
                        featureFlags: { ...prev.featureFlags, ...(apiData.featureFlags || {}) },
                        security: { ...prev.security, ...(apiData.security || {}) },
                        email: { ...prev.email, ...(apiData.email || {}) },
                        maintenance: { ...prev.maintenance, ...(apiData.maintenance || {}) }
                    };
                });
            } else {
                throw new Error(response.data.message || 'Failed to load configuration');
            }
        } catch (error) {
            console.error('Failed to load config:', error);
            showToast('Using default configuration. API connection failed.', 'warning');
            // Keep default config on error
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API, showToast]);

    useEffect(() => {
        if (currentUser && currentUser.role === 'superadmin') {
            fetchConfig();
        }
    }, [fetchConfig, currentUser]);

    // Save configuration
    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const response = await apiClient.put(API.superadminConfig, config);
            if (response.data.success) {
                setConfig(response.data.data); // Update with server response
                showToast('Configuration saved successfully!', 'success');
            } else {
                showToast(response.data.error || 'Failed to save configuration.', 'error');
            }
        } catch (error) {
            console.error('Failed to save config:', error);
            const errorMessage = error.response?.data?.error || 'Error saving configuration.';
            showToast(errorMessage, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Update plan
    const handleUpdatePlan = (planId, planData) => {
        setConfig(prev => ({
            ...prev,
            plans: {
                ...prev.plans,
                [planId]: {
                    ...prev.plans[planId],
                    ...planData
                }
            }
        }));
        setEditingPlan(null);
        showToast(`${planData.name} plan updated!`, 'success');
    };

    // Update system setting
    const handleSystemUpdate = (key, value) => {
        setConfig(prev => ({
            ...prev,
            system: {
                ...prev.system,
                [key]: value
            }
        }));
    };

    // Toggle feature flag
    const handleToggleFeature = (feature) => {
        setConfig(prev => ({
            ...prev,
            featureFlags: {
                ...prev.featureFlags,
                [feature]: !prev.featureFlags[feature]
            }
        }));
    };

    // Update security setting
    const handleSecurityUpdate = (key, value) => {
        setConfig(prev => ({
            ...prev,
            security: {
                ...prev.security,
                [key]: value
            }
        }));
    };

    // Update email setting
    const handleEmailUpdate = (key, value) => {
        setConfig(prev => ({
            ...prev,
            email: {
                ...prev.email,
                [key]: value
            }
        }));
    };

    // Toggle maintenance mode
    const handleToggleMaintenance = () => {
        setConfig(prev => ({
            ...prev,
            maintenance: {
                ...prev.maintenance,
                maintenanceMode: !prev.maintenance.maintenanceMode
            }
        }));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300" aria-busy="true" aria-live="polite">
                <Loader className="w-10 h-10 animate-spin text-indigo-400" aria-hidden="true" />
                <p className='mt-3 text-gray-300'>Loading system configuration...</p>
            </div>
        );
    }

    const tabs = [
        { id: 'plans', name: 'Subscription Plans', icon: CreditCard },
        { id: 'system', name: 'System Settings', icon: Settings },
        { id: 'features', name: 'Feature Flags', icon: Globe },
        { id: 'security', name: 'Security', icon: Shield },
        { id: 'email', name: 'Email/SMS', icon: Mail },
        { id: 'maintenance', name: 'Maintenance', icon: Server },
    ];

    return (
    // Theme variables
    const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const cardBg = darkMode ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white border-slate-200';
    const inputBg = darkMode ? 'bg-gray-700/50 border-gray-600/50' : 'bg-slate-100 border-slate-300';
    const inputText = darkMode ? 'text-white' : 'text-slate-900';

    return (
        <main className={`p-4 md:p-8 h-full flex flex-col ${mainBg} transition-colors duration-300 overflow-y-auto custom-scrollbar`} itemScope itemType="https://schema.org/WebPage">
            {/* Header */}
            <header className="mb-6" itemProp="headline">
                <div className="flex items-center justify-between mb-2">
                    <h1 className={`text-3xl font-extrabold ${textPrimary} flex items-center gap-3`}>
                        <Settings className="w-8 h-8 text-indigo-400" aria-hidden="true" />
                        System Configuration
                    </h1>
                    <button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Save all configuration changes"
                    >
                        {isSaving ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" aria-hidden="true" />
                                Save All Changes
                            </>
                        )}
                    </button>
                </div>
                <p className="text-gray-400" itemProp="description">Manage system-wide settings, subscription plans, feature flags, security, email/SMS, and maintenance mode configurations for the entire Pocket POS platform.</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto custom-scrollbar pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-gray-700/50'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.name}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="flex-1">
                {/* Plans Tab */}
                {activeTab === 'plans' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {Object.entries(config.plans).map(([planId, plan]) => (
                                <PlanConfigCard
                                    key={planId}
                                    plan={{ ...plan, id: planId }}
                                    config={config}
                                    onUpdate={handleUpdatePlan}
                                    isEditing={editingPlan === planId}
                                    onEdit={() => setEditingPlan(planId)}
                                    onCancel={() => setEditingPlan(null)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* System Settings Tab */}
                {activeTab === 'system' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-400" />
                                General Settings
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Base Currency</label>
                                    <select
                                        value={config.system.baseCurrency}
                                        onChange={(e) => handleSystemUpdate('baseCurrency', e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        value={config.system.taxRate}
                                        onChange={(e) => handleSystemUpdate('taxRate', parseFloat(e.target.value))}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Timezone</label>
                                    <select
                                        value={config.system.timezone}
                                        onChange={(e) => handleSystemUpdate('timezone', e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">EST</option>
                                        <option value="America/Los_Angeles">PST</option>
                                        <option value="Asia/Kolkata">IST</option>
                                        <option value="Europe/London">GMT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Date Format</label>
                                    <select
                                        value={config.system.dateFormat}
                                        onChange={(e) => handleSystemUpdate('dateFormat', e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                                    >
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Feature Flags Tab */}
                {activeTab === 'features' && (
                    <div className="space-y-4">
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-indigo-400" />
                                Feature Toggles
                            </h2>
                            <div className="space-y-3">
                                <ToggleSwitch
                                    label="AI-Powered Reports"
                                    checked={config.featureFlags.aiReports}
                                    onChange={() => handleToggleFeature('aiReports')}
                                    description="Enable AI-generated insights and recommendations"
                                />
                                <ToggleSwitch
                                    label="Global Notifications"
                                    checked={config.featureFlags.globalNotifications}
                                    onChange={() => handleToggleFeature('globalNotifications')}
                                    description="Send system-wide notifications to all users"
                                />
                                <ToggleSwitch
                                    label="Advanced Analytics"
                                    checked={config.featureFlags.advancedAnalytics}
                                    onChange={() => handleToggleFeature('advancedAnalytics')}
                                    description="Enable advanced data analytics and visualization"
                                />
                                <ToggleSwitch
                                    label="API Access"
                                    checked={config.featureFlags.apiAccess}
                                    onChange={() => handleToggleFeature('apiAccess')}
                                    description="Allow shops to access REST API"
                                />
                                <ToggleSwitch
                                    label="Custom Branding"
                                    checked={config.featureFlags.customBranding}
                                    onChange={() => handleToggleFeature('customBranding')}
                                    description="Allow shops to customize their branding"
                                />
                                <ToggleSwitch
                                    label="Multi-Currency Support"
                                    checked={config.featureFlags.multiCurrency}
                                    onChange={() => handleToggleFeature('multiCurrency')}
                                    description="Enable support for multiple currencies"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-400" />
                                Security Settings
                            </h2>
                            <div className="space-y-4">
                                <ToggleSwitch
                                    label="Two-Factor Authentication"
                                    checked={config.security.twoFactorAuth}
                                    onChange={(value) => handleSecurityUpdate('twoFactorAuth', value)}
                                    description="Require 2FA for all admin accounts"
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Session Timeout (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={config.security.sessionTimeout}
                                        onChange={(e) => handleSecurityUpdate('sessionTimeout', parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">
                                        Minimum Password Length
                                    </label>
                                    <input
                                        type="number"
                                        value={config.security.passwordMinLength}
                                        onChange={(e) => handleSecurityUpdate('passwordMinLength', parseInt(e.target.value))}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <ToggleSwitch
                                    label="Require Strong Password"
                                    checked={config.security.requireStrongPassword}
                                    onChange={(value) => handleSecurityUpdate('requireStrongPassword', value)}
                                    description="Enforce complex password requirements"
                                />
                                <ToggleSwitch
                                    label="IP Whitelist"
                                    checked={config.security.ipWhitelist}
                                    onChange={(value) => handleSecurityUpdate('ipWhitelist', value)}
                                    description="Restrict access to whitelisted IP addresses"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Email/SMS Tab */}
                {activeTab === 'email' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Mail className="w-5 h-5 text-indigo-400" />
                                Email Configuration
                            </h2>
                            <div className="space-y-4">
                                <ToggleSwitch
                                    label="Enable SMTP"
                                    checked={config.email.smtpEnabled}
                                    onChange={(value) => handleEmailUpdate('smtpEnabled', value)}
                                    description="Enable email sending via SMTP"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">SMTP Host</label>
                                        <input
                                            type="text"
                                            value={config.email.smtpHost}
                                            onChange={(e) => handleEmailUpdate('smtpHost', e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">SMTP Port</label>
                                        <input
                                            type="number"
                                            value={config.email.smtpPort}
                                            onChange={(e) => handleEmailUpdate('smtpPort', parseInt(e.target.value))}
                                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">SMTP User</label>
                                        <input
                                            type="text"
                                            value={config.email.smtpUser}
                                            onChange={(e) => handleEmailUpdate('smtpUser', e.target.value)}
                                            className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Use SSL/TLS</label>
                                        <ToggleSwitch
                                            checked={config.email.smtpSecure}
                                            onChange={(value) => handleEmailUpdate('smtpSecure', value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Maintenance Tab */}
                {activeTab === 'maintenance' && (
                    <div className="space-y-6">
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Server className="w-5 h-5 text-indigo-400" />
                                Maintenance Mode
                            </h2>
                            <div className="space-y-4">
                                <ToggleSwitch
                                    label="Enable Maintenance Mode"
                                    checked={config.maintenance.maintenanceMode}
                                    onChange={handleToggleMaintenance}
                                    description="Put the entire system in maintenance mode. Only superadmins can access."
                                />
                                {config.maintenance.maintenanceMode && (
                                    <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                                        <AlertCircle className="w-5 h-5 text-yellow-400 mb-2" />
                                        <p className="text-sm text-yellow-300">
                                            Maintenance mode is active. All users except superadmins will see the maintenance message.
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Maintenance Message</label>
                                    <textarea
                                        value={config.maintenance.maintenanceMessage}
                                        onChange={(e) => setConfig(prev => ({
                                            ...prev,
                                            maintenance: {
                                                ...prev.maintenance,
                                                maintenanceMessage: e.target.value
                                            }
                                        }))}
                                        rows={4}
                                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                        placeholder="Enter maintenance message..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default SystemConfig;

