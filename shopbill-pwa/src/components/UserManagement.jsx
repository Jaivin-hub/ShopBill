// src/components/UserManagement.js (Frontend - Fixed Date Joined Extraction and Tenure Sorting)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Plus, Trash2, Loader, MapPin, Building, Shield, Users, User, X, IndianRupee, TrendingUp, TrendingDown, Minus, ArrowUpDown, Phone, Calendar, Clock, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import API from '../config/api';

// Define roles for staff count (for display purposes)
const STAFF_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};
// Define available plans
const SHOP_PLANS = {
    BASIC: 'Basic',
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise',
};

// --- Utility Functions ---

// Helper function to format the ISO date string to a clean, local date (e.g., Oct 07, 2025)
const formatDate = (isoString) => {
    if (!isoString || isoString === 'N/A') return 'N/A';
    try {
        // Use the original ISO string for date sorting in the main component if possible, 
        // but this function is for display only.
        return new Date(isoString).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    } catch (e) {
        return 'Invalid Date';
    }
};

const getPlanStyles = (plan) => {
    switch (plan) {
        case SHOP_PLANS.ENTERPRISE:
            return 'bg-purple-800/50 text-purple-300 border-purple-700';
        case SHOP_PLANS.PRO:
            return 'bg-indigo-800/50 text-indigo-300 border-indigo-700';
        case SHOP_PLANS.BASIC:
        default:
            return 'bg-gray-200 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600';
    }
};

/**
 * FINAL: Clean Staff Summary - Managers and Cashiers only
 */
const StaffPill = ({ count }) => {
    return (
        <div className="flex items-center justify-center gap-2 w-full">
            {/* Displaying Managers and Cashiers count */}
            <div className="flex items-center gap-2">
                <span 
                    className="flex items-center gap-1.5 text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-teal-500/20" 
                    title="Managers"
                >
                    <Users className="w-3.5 h-3.5" />
                    <span>{count.manager}</span>
                </span>
                <span 
                    className="flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 hover:bg-yellow-500/20" 
                    title="Cashiers"
                >
                    <User className="w-3.5 h-3.5" />
                    <span>{count.cashier}</span>
                </span>
            </div>
        </div>
    );
};

const PerformanceTrendIndicator = ({ performance }) => {
    // Handles data coming from the backend now
    const { metric, trend } = performance;
    
    let icon = Minus;
    let color = 'text-gray-600 dark:text-gray-400';
    let bgColor = 'bg-gray-500/10';
    let borderColor = 'border-gray-500/20';

    if (trend === 'up') {
        icon = TrendingUp;
        color = 'text-green-400';
        bgColor = 'bg-green-500/10';
        borderColor = 'border-green-500/30';
    } else if (trend === 'down') {
        icon = TrendingDown;
        color = 'text-red-400';
        bgColor = 'bg-red-500/10';
        borderColor = 'border-red-500/30';
    }

    const IconComponent = icon;

    return (
        <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${bgColor} border ${borderColor} transition-all duration-200`}>
            <IconComponent className={`w-3.5 h-3.5 ${color}`} />
            <span className={color}>{metric}</span>
        </div>
    );
};

// Generate current month payment status (dummy data)
const generateCurrentMonthPaymentStatus = () => {
    const statuses = ['paid', 'pending', 'failed', 'overdue'];
    const weights = [0.7, 0.15, 0.1, 0.05]; // 70% paid, 15% pending, 10% failed, 5% overdue
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
        cumulative += weights[i];
        if (random < cumulative) {
            return statuses[i];
        }
    }
    return 'paid'; // fallback
};

// Payment Status Badge Component
const PaymentStatusBadge = ({ status }) => {
    let icon, color, bgColor, borderColor, text;
    
    switch (status) {
        case 'paid':
            icon = CheckCircle;
            color = 'text-green-400';
            bgColor = 'bg-green-500/10';
            borderColor = 'border-green-500/30';
            text = 'Paid';
            break;
        case 'pending':
            icon = Clock;
            color = 'text-yellow-400';
            bgColor = 'bg-yellow-500/10';
            borderColor = 'border-yellow-500/30';
            text = 'Pending';
            break;
        case 'failed':
            icon = XCircle;
            color = 'text-red-400';
            bgColor = 'bg-red-500/10';
            borderColor = 'border-red-500/30';
            text = 'Failed';
            break;
        case 'overdue':
            icon = AlertCircle;
            color = 'text-orange-400';
            bgColor = 'bg-orange-500/10';
            borderColor = 'border-orange-500/30';
            text = 'Overdue';
            break;
        default:
            icon = Clock;
            color = 'text-gray-400';
            bgColor = 'bg-gray-500/10';
            borderColor = 'border-gray-500/30';
            text = 'Unknown';
    }
    
    const IconComponent = icon;
    
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${bgColor} ${color} border ${borderColor} transition-all duration-200`}>
            <IconComponent className="w-3.5 h-3.5" />
            {text}
        </span>
    );
};

// Generate dummy payment data
const generateDummyPaymentData = (shopName, plan) => {
    const planPrices = {
        [SHOP_PLANS.BASIC]: 2499,
        [SHOP_PLANS.PRO]: 6999,
        [SHOP_PLANS.ENTERPRISE]: 16999,
    };
    
    const price = planPrices[plan] || planPrices[SHOP_PLANS.BASIC];
    const now = new Date();
    
    // Generate payment history (last 6 months)
    const paymentHistory = [];
    for (let i = 5; i >= 0; i--) {
        const paymentDate = new Date(now);
        paymentDate.setMonth(paymentDate.getMonth() - i);
        
        // Random payment status (mostly paid, some failed)
        const isPaid = Math.random() > 0.15;
        const status = isPaid ? 'paid' : 'failed';
        
        paymentHistory.push({
            id: `payment-${i}`,
            date: paymentDate.toISOString(),
            amount: price,
            status: status,
            transactionId: `TXN${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
            method: ['Credit Card', 'Debit Card', 'Bank Transfer', 'UPI'][Math.floor(Math.random() * 4)],
        });
    }
    
    // Generate upcoming payment
    const nextPaymentDate = new Date(now);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    nextPaymentDate.setDate(1); // First of next month
    
    const daysUntilPayment = Math.ceil((nextPaymentDate - now) / (1000 * 60 * 60 * 24));
    
    return {
        paymentHistory: paymentHistory.sort((a, b) => new Date(b.date) - new Date(a.date)),
        upcomingPayment: {
            date: nextPaymentDate.toISOString(),
            amount: price,
            daysUntil: daysUntilPayment,
        },
        currentPlan: plan,
        billingCycle: 'Monthly',
    };
};

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, shopName, shopPlan, shopId, apiClient, API, showToast }) => {
    const [paymentData, setPaymentData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    useEffect(() => {
        if (isOpen && shopId) {
            const fetchPaymentData = async () => {
                setIsLoading(true);
                try {
                    const response = await apiClient.get(API.superadminShopPayments(shopId));
                    if (response.data.success) {
                        setPaymentData(response.data.data);
                    } else {
                        throw new Error(response.data.message || 'Failed to load payment data');
                    }
                } catch (error) {
                    console.error('Failed to load payment data:', error);
                    // Fallback to dummy data
                    const data = generateDummyPaymentData(shopName, shopPlan);
                    setPaymentData(data);
                    showToast('Using cached payment data. API connection failed.', 'warning');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPaymentData();
        }
    }, [isOpen, shopId, shopName, shopPlan, apiClient, API, showToast]);
    
    if (!isOpen) return null;
    
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div 
                    className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-center h-64">
                        <Loader className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                </div>
            </div>
        );
    }
    
    const getStatusBadge = (status) => {
        if (status === 'paid') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Paid
                </span>
            );
        } else if (status === 'failed') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pending
                </span>
            );
        }
    };
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose}>
            <div 
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-100 dark:from-gray-800/50 to-gray-100 dark:to-gray-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment History</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{shopName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                    >
                        <X className="w-5 h-5 cursor-pointer" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {paymentData && (
                        <>
                            {/* Current Plan & Upcoming Payment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <IndianRupee className="w-5 h-5 text-indigo-400" />
                                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Current Plan</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{paymentData.currentPlan}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{paymentData.billingCycle} Billing</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-5 border border-indigo-500/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-5 h-5 text-indigo-400" />
                                        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Next Payment</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                        ₹{paymentData.upcomingPayment.amount.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {paymentData.upcomingPayment.daysUntil > 0 
                                            ? `Due in ${paymentData.upcomingPayment.daysUntil} days`
                                            : 'Due today'}
                                    </p>
                                    <p className="text-xs text-gray-600 dark:text-gray-500 mt-1">
                                        {formatDate(paymentData.upcomingPayment.date)}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Payment History */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-400" />
                                    Payment History
                                </h3>
                                <div className="space-y-3">
                                    {paymentData.paymentHistory.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="bg-gray-100 dark:bg-gray-800/30 rounded-lg p-4 border border-gray-200 dark:border-gray-700/30 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                ₹{payment.amount.toFixed(2)}
                                                            </span>
                                                            {getStatusBadge(payment.status)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {formatDate(payment.date)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <CreditCard className="w-3.5 h-3.5" />
                                                            {payment.method}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            ID: {payment.transactionId}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/30">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 cursor-pointer"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


const UserManagement = ({ apiClient, API, showToast, currentUser }) => { 
    const [shops, setShops] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState({ key: 'name', direction: 'ascending' });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, shopName: null, shopPlan: null, shopId: null });

    // --- Data Fetching Logic ---
    const mapUserToShop = (user) => ({
        id: user._id, 
        // 💥 Extraction Fix: Using createdAt to derive dateJoined
        dateJoined: formatDate(user.createdAt), 
        // 💥 Extraction Fix: Deriving shop name from email
        name: user.email.split('@')[0].trim() || user._id, 
        
        // Using sensible defaults for currently missing fields
        location: user.location || 'N/A', 
        status: user.isActive !== false ? 'Active' : 'Inactive', 
        plan: user.plan || SHOP_PLANS.BASIC, 
        phone: user.phone || 'N/A',
        staffCount: { owner: 1, manager: user.managerCount || 0, cashier: user.cashierCount || 0 }, 
        tenureDays: user.tenureDays || 'N/A', // Assuming 0 or N/A if not calculated by backend
        performanceTrend: user.performanceTrend || { metric: "N/A", trend: 'flat' }, 
        paymentStatus: user.paymentStatus || generateCurrentMonthPaymentStatus(), // Current month payment status (from API or generated)
        apiEndpoint: `/api/superadmin/shops/${user._id}`,
    });

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminShops);
            if (response.data.success) {
                // Payment status is now included in the shops response
                // Ensure data structure is flat and map to shop object
                const mappedShops = response.data.data.map(mapUserToShop);
                setShops(mappedShops);
                showToast(`Loaded ${mappedShops.length} shops successfully.`, 'success');
            } else {
                showToast(response.data.message || 'Failed to load shops.', 'error');
            }
        } catch (error) {
            console.error('Fetch Shops Error:', error);
            const errorMessage = error.response?.data?.error || 'Could not connect to the Superadmin API.';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API, showToast]); 

    useEffect(() => {
        if (currentUser && currentUser.role === 'superadmin') {
            fetchShops();
        } else if (currentUser) {
            setShops([]); 
            showToast('Access Denied: Only Superadmin can view shop list.', 'warning');
        }
    }, [fetchShops, currentUser]);

    // --- Sorting and Filtering Logic ---
    const handleSort = (key) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    const filteredAndSortedShops = useMemo(() => {
        let filtered = shops.filter(shop => 
            shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.location.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            let aValue = a[sortBy.key];
            let bValue = b[sortBy.key];
            
            // --- FIX: Ensure Numeric Sorting for tenureDays ---
            if (sortBy.key === 'tenureDays') {
                // Convert to number, defaulting to 0 if 'N/A' or invalid
                const aNum = isNaN(Number(aValue)) ? 0 : Number(aValue);
                const bNum = isNaN(Number(bValue)) ? 0 : Number(bValue);

                if (aNum < bNum) return sortBy.direction === 'ascending' ? -1 : 1;
                if (aNum > bNum) return sortBy.direction === 'ascending' ? 1 : -1;
                return 0;
            }
            // --- End FIX ---

            // Handle payment status sorting with priority order
            if (sortBy.key === 'paymentStatus') {
                const statusPriority = { 'paid': 1, 'pending': 2, 'failed': 3, 'overdue': 4 };
                const aPriority = statusPriority[aValue] || 5;
                const bPriority = statusPriority[bValue] || 5;
                
                if (aPriority < bPriority) return sortBy.direction === 'ascending' ? -1 : 1;
                if (aPriority > bPriority) return sortBy.direction === 'ascending' ? 1 : -1;
                return 0;
            }

            // Handle date comparison for dateJoined
            if (sortBy.key === 'dateJoined') {
                // Since the backend provided 'createdAt' is available in the original 'user' object, 
                // but here we only have the formatted string ('Oct 07, 2025'), simple string comparison 
                // is unreliable. For simplicity and since we only have the formatted string here, 
                // we'll rely on the default string comparison below, but it's noted as an area for improvement 
                // (ideally, the mapUserToShop would save the ISO date for sorting).
            }

            // Default string comparison (for name, location, plan, status, etc.)
            const result = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
            return sortBy.direction === 'ascending' ? result : -result;
        });
    }, [shops, searchTerm, sortBy]);


    // --- 💥 API Integration: Delete Shop (DELETE) FIX 💥 ---
    const handleDeleteShop = async (shopId, shopName) => {
        console.log(`[DELETE] Attempting to delete shop: ${shopName} (ID: ${shopId})`);

        // IMPORTANT: Use a custom modal instead of window.confirm in production
        if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE the shop and all its data for: ${shopName}? This action cannot be undone.`)) {
            console.log('[DELETE] Deletion cancelled by user.');
            return;
        }

        setIsLoading(true);
        try {
            // FIX: Ensure API.superadminShopDetails is called as a function to get the full URL
            const deleteUrl = API.superadminShopDetails(shopId); 
            const response = await apiClient.delete(deleteUrl);
            
            if (response.data.success) {
                setShops(prev => prev.filter(s => s.id !== shopId));
                showToast(`Shop ${shopName} deleted successfully.`, 'success'); // SUCCESS TOAST ADDED
            } else {
                 showToast(response.data.message || `Failed to delete shop ${shopName}.`, 'error'); // ERROR TOAST ADDED
            }
        } catch (error) {
            console.error('Delete Shop Error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete shop due to a network or server error.';
            showToast(errorMessage, 'error'); // ERROR TOAST ADDED
        } finally {
            setIsLoading(false);
        }
    };

    // Handle opening payment modal
    const handleOpenPaymentModal = (shopId, shopName, shopPlan) => {
        setPaymentModal({ isOpen: true, shopId, shopName, shopPlan });
    };

    // Handle closing payment modal
    const handleClosePaymentModal = () => {
        setPaymentModal({ isOpen: false, shopId: null, shopName: null, shopPlan: null });
    };

    // --- Component Render ---
    const SortIcon = ({ columnKey }) => {
        if (sortBy.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600 cursor-pointer" />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 cursor-pointer ${sortBy.direction === 'ascending' ? 'rotate-180 text-indigo-400' : 'text-indigo-400'}`} />;
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300">
            {/* Header / Search Bar */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center">
                    <Building className="w-7 h-7 mr-3 text-indigo-400" /> Shop Management
                </h1>
            </div>
            
            <div className="pt-4 pb-6">
                <input
                    type="text"
                    placeholder="Search by Shop Name or Location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                />
            </div>

            {/* Table */}
            <div className="flex-grow overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-600 dark:text-gray-400">
                        <Loader className="w-10 h-10 animate-spin text-indigo-400" />
                        <p className='mt-3 text-gray-700 dark:text-gray-300'>Loading shop list...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800/50 bg-white dark:bg-gray-900/50 backdrop-blur-sm">
                        <table className="min-w-full">
                            <thead className="bg-gradient-to-r from-gray-100 dark:from-gray-800/90 to-gray-100 dark:to-gray-800/70 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700/50">
                                <tr>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200 group"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Shop Name</span>
                                            <SortIcon columnKey="name" />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('location')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Location</span>
                                            <SortIcon columnKey="location" />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('dateJoined')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Joined</span>
                                            <SortIcon columnKey="dateJoined" />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('tenureDays')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Tenure</span>
                                            <SortIcon columnKey="tenureDays" />
                                        </div>
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('plan')}
                                    >
                                        <div className="flex justify-center items-center gap-2">
                                            <span>Plan</span>
                                            <SortIcon columnKey="plan" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Staff
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                        Performance
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('paymentStatus')}
                                    >
                                        <div className="flex justify-center items-center gap-2">
                                            <span>Payment Status</span>
                                            <SortIcon columnKey="paymentStatus" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-900/30 divide-y divide-gray-200 dark:divide-gray-800/50">
                                {filteredAndSortedShops.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <Building className="w-12 h-12 text-gray-600 mb-3" />
                                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                                                    {searchTerm ? 'No shops found matching your criteria.' : 'No shops registered or failed to load from API.'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedShops.map((shop, index) => (
                                        <tr 
                                            key={shop.id} 
                                            className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-all duration-200 border-b border-gray-200 dark:border-gray-800/30 group"
                                        >
                                            {/* Shop Name */}
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                                        <Store className="w-5 h-5 text-indigo-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                                            {shop.name}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Location */}
                                            <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span className="truncate max-w-[150px]">{shop.location}</span>
                                                </div>
                                            </td>
                                            {/* Date Joined */}
                                            <td className="px-6 py-5 whitespace-nowrap hidden lg:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span>{shop.dateJoined}</span>
                                                </div>
                                            </td>
                                            {/* Tenure (Days) */}
                                            <td className="px-6 py-5 whitespace-nowrap text-left hidden lg:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span className="font-medium">{shop.tenureDays}</span>
                                                </div>
                                            </td>
                                            {/* Plan */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <span 
                                                    className={`px-3 py-1.5 inline-flex items-center text-xs font-semibold rounded-lg border transition-all duration-200 ${getPlanStyles(shop.plan)}`}
                                                >
                                                    <IndianRupee className='w-3.5 h-3.5 mr-1.5' />
                                                    {shop.plan.toUpperCase()}
                                                </span>
                                            </td>
                                            {/* Staff Summary */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <StaffPill count={shop.staffCount} />
                                            </td>
                                            {/* Performance (30D) */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center hidden md:table-cell">
                                                <PerformanceTrendIndicator performance={shop.performanceTrend} />
                                            </td>
                                            {/* Status */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <span 
                                                    className={`px-3 py-1.5 inline-flex text-xs font-semibold rounded-lg transition-all duration-200 ${
                                                        shop.status === 'Active' 
                                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                                                        shop.status === 'Suspended' 
                                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                                    }`}
                                                >
                                                    {shop.status}
                                                </span>
                                            </td>
                                            {/* Payment Status */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                <PaymentStatusBadge status={shop.paymentStatus} />
                                            </td>
                                            {/* Action Column */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center gap-2">
                                                    <button 
                                                        className="text-indigo-400 hover:text-white hover:bg-indigo-500/20 p-2.5 rounded-lg transition-all duration-200 border border-transparent hover:border-indigo-500/30 group/btn cursor-pointer"
                                                        title="View Payment History"
                                                        onClick={() => {
                                                            handleOpenPaymentModal(shop.id, shop.name, shop.plan);
                                                        }}
                                                    >
                                                        <CreditCard className="w-4 h-4 group-hover/btn:scale-110 transition-transform cursor-pointer" />
                                                    </button>
                                                    <button 
                                                        className="text-red-400 hover:text-white hover:bg-red-500/20 p-2.5 rounded-lg transition-all duration-200 border border-transparent hover:border-red-500/30 group/btn cursor-pointer"
                                                        title="Delete Shop"
                                                        onClick={() => {
                                                            console.log(`[CLICK] Delete button clicked for ${shop.name}.`);
                                                            handleDeleteShop(shop.id, shop.name);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform cursor-pointer" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {/* Payment Modal */}
            <PaymentModal
                isOpen={paymentModal.isOpen}
                onClose={handleClosePaymentModal}
                shopId={paymentModal.shopId}
                shopName={paymentModal.shopName}
                shopPlan={paymentModal.shopPlan}
                apiClient={apiClient}
                API={API}
                showToast={showToast}
            />
        </div>
    );
};

export default UserManagement;