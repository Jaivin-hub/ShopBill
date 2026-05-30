import React, { useState, useEffect, useCallback } from 'react';
import {
    Settings, Settings2, Save, Loader, CheckCircle, AlertCircle,
    Shield, Mail, Globe, CreditCard,
    Server, Plus, X,
    Edit2,
} from 'lucide-react';
import API from '../config/api';
import { SystemConfigInitialSkeleton } from './skeletons/PageSkeletons';

const getConfigTheme = (darkMode) => ({
    card: darkMode
        ? 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600/50'
        : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/40',
    cardInner: darkMode ? 'bg-gray-800/30 border-gray-700/30' : 'bg-slate-50 border-slate-200',
    textPrimary: darkMode ? 'text-white' : 'text-slate-900',
    textSecondary: darkMode ? 'text-gray-400' : 'text-slate-600',
    textMuted: darkMode ? 'text-gray-500' : 'text-slate-500',
    input: darkMode
        ? 'bg-gray-700/50 border-gray-600/50 text-white'
        : 'bg-white border-slate-300 text-slate-900',
    tabIdle: darkMode
        ? 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300 border-gray-700/50'
        : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-slate-200',
});

// Plan Configuration Component
const PlanConfigCard = ({ plan, config, onUpdate, isEditing, onEdit, onCancel, darkMode = true }) => {
    const t = getConfigTheme(darkMode);
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
        <div className={`rounded-xl p-4 sm:p-6 border transition-all duration-200 ${t.card}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
                    <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm font-semibold border ${planColors[plan.id]}`}>
                        {plan.name}
                    </span>
                    {!isEditing && (
                        <span className={`text-xs sm:text-sm ${t.textSecondary}`}>
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
                        <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Plan Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`}
                        />
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Monthly Price (₹)</label>
                        <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`}
                            step="0.01"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Max Users</label>
                            <input
                                type="number"
                                value={formData.maxUsers}
                                onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Max Inventory</label>
                            <input
                                type="number"
                                value={formData.maxInventory}
                                onChange={(e) => setFormData({ ...formData, maxInventory: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`}
                            />
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Max Storage (GB)</label>
                            <input
                                type="number"
                                value={formData.maxStorage}
                                onChange={(e) => setFormData({ ...formData, maxStorage: parseInt(e.target.value) })}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`}
                            />
                        </div>
                    </div>
                    <div>
                        <label className={`block text-sm font-medium mb-2 ${t.textSecondary}`}>Features</label>
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                                placeholder="Add feature..."
                                className={`flex-1 min-w-0 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`}
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
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${t.textSecondary}`}>Monthly Price</span>
                        <span className={`text-lg font-semibold ${t.textPrimary}`}>₹{plan.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${t.textSecondary}`}>Max Users</span>
                        <span className={`text-sm font-medium ${t.textPrimary}`}>{plan.maxUsers || 'Unlimited'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${t.textSecondary}`}>Max Inventory</span>
                        <span className={`text-sm font-medium ${t.textPrimary}`}>{plan.maxInventory || 'Unlimited'}</span>
                    </div>
                    {plan.features && plan.features.length > 0 && (
                        <div className={`pt-3 border-t ${darkMode ? 'border-gray-700/50' : 'border-slate-200'}`}>
                            <p className={`text-sm mb-2 ${t.textSecondary}`}>Features</p>
                            <ul className="space-y-1">
                                {plan.features.map((feature, index) => (
                                    <li key={index} className={`text-sm flex items-start gap-2 ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                                        <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                                        <span className="min-w-0 break-words">{feature}</span>
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
const ToggleSwitch = ({ label, checked, onChange, description, darkMode = true }) => {
    const t = getConfigTheme(darkMode);
    return (
        <div className={`flex items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border ${t.cardInner}`}>
            <div className="flex-1 min-w-0 pr-1">
                <p className={`text-sm font-medium ${t.textPrimary}`}>{label}</p>
                {description && (
                    <p className={`text-[11px] mt-0.5 leading-snug ${t.textMuted}`}>{description}</p>
                )}
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    checked ? 'bg-indigo-600' : darkMode ? 'bg-gray-600' : 'bg-slate-300'
                }`}
                aria-pressed={checked}
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

const ConfigSection = ({ title, icon: Icon, children, darkMode }) => {
    const t = getConfigTheme(darkMode);
    return (
        <div className={`rounded-xl p-4 sm:p-6 border ${t.card}`}>
            <h2 className={`text-base sm:text-lg font-semibold mb-4 flex items-center gap-2 ${t.textPrimary}`}>
                <Icon className="w-5 h-5 text-indigo-500 shrink-0" aria-hidden="true" />
                <span className="min-w-0">{title}</span>
            </h2>
            {children}
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
                price: 999,
                features: ['Advanced Inventory', 'Up to 20 Users', 'Priority Support', 'Advanced Reports'],
                maxUsers: 20,
                maxInventory: 10000,
                maxStorage: 50,
                subscribers: 52
            },
            enterprise: {
                name: 'Enterprise',
                price: 2999,
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

    const t = getConfigTheme(darkMode);
    const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const textPrimary = t.textPrimary;
    const textSecondary = t.textSecondary;
    const inputClass = `w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${t.input}`;

    if (isLoading) {
        return <SystemConfigInitialSkeleton darkMode={darkMode} />;
    }

    const tabs = [
        { id: 'plans', name: 'Subscription Plans', shortName: 'Plans', icon: CreditCard },
        { id: 'system', name: 'System Settings', shortName: 'System', icon: Settings },
        { id: 'features', name: 'Feature Flags', shortName: 'Features', icon: Globe },
        { id: 'security', name: 'Security', shortName: 'Security', icon: Shield },
        { id: 'email', name: 'Email/SMS', shortName: 'Email', icon: Mail },
        { id: 'maintenance', name: 'Maintenance', shortName: 'Maint.', icon: Server },
    ];

    return (
        <main
            className={`min-h-0 h-full flex flex-col px-3 py-4 sm:px-6 sm:py-6 md:px-8 ${mainBg} transition-colors duration-300 overflow-y-auto overflow-x-hidden custom-scrollbar`}
            itemScope
            itemType="https://schema.org/WebPage"
        >
            <header className="mb-4 sm:mb-6 shrink-0" itemProp="headline">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h1 className={`text-xl sm:text-2xl md:text-3xl font-extrabold ${textPrimary} flex items-center gap-2 sm:gap-3`}>
                            <Settings2 className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-500 shrink-0" aria-hidden="true" />
                            <span className="truncate">System Config</span>
                        </h1>
                        <p className={`text-xs sm:text-sm mt-1 ${textSecondary}`} itemProp="description">
                            Plans, features, security, and platform settings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        className="flex w-full sm:w-auto shrink-0 items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        aria-label="Save all configuration changes"
                    >
                        {isSaving ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" aria-hidden="true" />
                                Save changes
                            </>
                        )}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 mb-4 sm:mb-6 shrink-0">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1 sm:gap-2 px-2 py-2.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-sm font-semibold transition-all cursor-pointer border ${
                                isActive
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : t.tabIdle
                            }`}
                        >
                            <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span className="truncate max-w-full sm:hidden">{tab.shortName}</span>
                            <span className="truncate max-w-full hidden sm:inline">{tab.name}</span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 min-h-0 pb-6">
                {activeTab === 'plans' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
                        {Object.entries(config.plans).map(([planId, plan]) => (
                            <PlanConfigCard
                                key={planId}
                                plan={{ ...plan, id: planId }}
                                config={config}
                                onUpdate={handleUpdatePlan}
                                isEditing={editingPlan === planId}
                                onEdit={() => setEditingPlan(planId)}
                                onCancel={() => setEditingPlan(null)}
                                darkMode={darkMode}
                            />
                        ))}
                    </div>
                )}

                {activeTab === 'system' && (
                    <ConfigSection title="General Settings" icon={Globe} darkMode={darkMode}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Base Currency</label>
                                    <select
                                        value={config.system.baseCurrency}
                                        onChange={(e) => handleSystemUpdate('baseCurrency', e.target.value)}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="INR">INR (₹)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        value={config.system.taxRate}
                                        onChange={(e) => handleSystemUpdate('taxRate', parseFloat(e.target.value))}
                                        className={inputClass}
                                        step="0.1"
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Timezone</label>
                                    <select
                                        value={config.system.timezone}
                                        onChange={(e) => handleSystemUpdate('timezone', e.target.value)}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">EST</option>
                                        <option value="America/Los_Angeles">PST</option>
                                        <option value="Asia/Kolkata">IST</option>
                                        <option value="Europe/London">GMT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Date Format</label>
                                    <select
                                        value={config.system.dateFormat}
                                        onChange={(e) => handleSystemUpdate('dateFormat', e.target.value)}
                                        className={`${inputClass} cursor-pointer`}
                                    >
                                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                    </select>
                                </div>
                            </div>
                    </ConfigSection>
                )}

                {activeTab === 'features' && (
                    <ConfigSection title="Feature Toggles" icon={Globe} darkMode={darkMode}>
                            <div className="space-y-2 sm:space-y-3">
                                <ToggleSwitch
                                    label="AI-Powered Reports"
                                    checked={config.featureFlags.aiReports}
                                    onChange={() => handleToggleFeature('aiReports')}
                                    description="AI insights"
                                    darkMode={darkMode}
                                />
                                <ToggleSwitch
                                    label="Global Notifications"
                                    checked={config.featureFlags.globalNotifications}
                                    onChange={() => handleToggleFeature('globalNotifications')}
                                    description="System-wide alerts"
                                    darkMode={darkMode}
                                />
                                <ToggleSwitch
                                    label="Advanced Analytics"
                                    checked={config.featureFlags.advancedAnalytics}
                                    onChange={() => handleToggleFeature('advancedAnalytics')}
                                    description="Extra analytics"
                                    darkMode={darkMode}
                                />
                                <ToggleSwitch
                                    label="API Access"
                                    checked={config.featureFlags.apiAccess}
                                    onChange={() => handleToggleFeature('apiAccess')}
                                    description="REST API for shops"
                                    darkMode={darkMode}
                                />
                                <ToggleSwitch
                                    label="Custom Branding"
                                    checked={config.featureFlags.customBranding}
                                    onChange={() => handleToggleFeature('customBranding')}
                                    description="Shop branding"
                                    darkMode={darkMode}
                                />
                                <ToggleSwitch
                                    label="Multi-Currency Support"
                                    checked={config.featureFlags.multiCurrency}
                                    onChange={() => handleToggleFeature('multiCurrency')}
                                    description="Multiple currencies"
                                    darkMode={darkMode}
                                />
                            </div>
                    </ConfigSection>
                )}

                {activeTab === 'security' && (
                    <ConfigSection title="Security Settings" icon={Shield} darkMode={darkMode}>
                            <div className="space-y-3 sm:space-y-4">
                                <ToggleSwitch
                                    label="Two-Factor Authentication"
                                    checked={config.security.twoFactorAuth}
                                    onChange={(value) => handleSecurityUpdate('twoFactorAuth', value)}
                                    description="2FA for admins"
                                    darkMode={darkMode}
                                />
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>
                                        Session Timeout (minutes)
                                    </label>
                                    <input
                                        type="number"
                                        value={config.security.sessionTimeout}
                                        onChange={(e) => handleSecurityUpdate('sessionTimeout', parseInt(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>
                                        Minimum Password Length
                                    </label>
                                    <input
                                        type="number"
                                        value={config.security.passwordMinLength}
                                        onChange={(e) => handleSecurityUpdate('passwordMinLength', parseInt(e.target.value))}
                                        className={inputClass}
                                    />
                                </div>
                                <ToggleSwitch
                                    label="Require Strong Password"
                                    checked={config.security.requireStrongPassword}
                                    onChange={(value) => handleSecurityUpdate('requireStrongPassword', value)}
                                    description="Complex passwords"
                                    darkMode={darkMode}
                                />
                                <ToggleSwitch
                                    label="IP Whitelist"
                                    checked={config.security.ipWhitelist}
                                    onChange={(value) => handleSecurityUpdate('ipWhitelist', value)}
                                    description="Allowed IPs only"
                                    darkMode={darkMode}
                                />
                            </div>
                    </ConfigSection>
                )}

                {activeTab === 'email' && (
                    <ConfigSection title="Email Configuration" icon={Mail} darkMode={darkMode}>
                            <div className="space-y-3 sm:space-y-4">
                                <ToggleSwitch
                                    label="Enable SMTP"
                                    checked={config.email.smtpEnabled}
                                    onChange={(value) => handleEmailUpdate('smtpEnabled', value)}
                                    description="Send mail via SMTP"
                                    darkMode={darkMode}
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>SMTP Host</label>
                                        <input
                                            type="text"
                                            value={config.email.smtpHost}
                                            onChange={(e) => handleEmailUpdate('smtpHost', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>SMTP Port</label>
                                        <input
                                            type="number"
                                            value={config.email.smtpPort}
                                            onChange={(e) => handleEmailUpdate('smtpPort', parseInt(e.target.value))}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>SMTP User</label>
                                        <input
                                            type="text"
                                            value={config.email.smtpUser}
                                            onChange={(e) => handleEmailUpdate('smtpUser', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <ToggleSwitch
                                            label="Use SSL/TLS"
                                            checked={config.email.smtpSecure}
                                            onChange={(value) => handleEmailUpdate('smtpSecure', value)}
                                            darkMode={darkMode}
                                        />
                                    </div>
                                </div>
                            </div>
                    </ConfigSection>
                )}

                {activeTab === 'maintenance' && (
                    <ConfigSection title="Maintenance Mode" icon={Server} darkMode={darkMode}>
                            <div className="space-y-3 sm:space-y-4">
                                <ToggleSwitch
                                    label="Enable Maintenance Mode"
                                    checked={config.maintenance.maintenanceMode}
                                    onChange={handleToggleMaintenance}
                                    description="Superadmin access only"
                                    darkMode={darkMode}
                                />
                                {config.maintenance.maintenanceMode && (
                                    <div className={`p-3 sm:p-4 rounded-lg border flex gap-2 ${darkMode ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-amber-50 border-amber-200'}`}>
                                        <AlertCircle className={`w-5 h-5 shrink-0 ${darkMode ? 'text-yellow-400' : 'text-amber-600'}`} />
                                        <p className={`text-xs sm:text-sm ${darkMode ? 'text-yellow-200' : 'text-amber-800'}`}>
                                            Active — other users see the maintenance message.
                                        </p>
                                    </div>
                                )}
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${textSecondary}`}>Maintenance Message</label>
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
                                        className={inputClass}
                                        placeholder="Enter maintenance message..."
                                    />
                                </div>
                            </div>
                    </ConfigSection>
                )}
            </div>
        </main>
    );
};

export default SystemConfig;

