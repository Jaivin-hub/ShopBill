import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Plus, Trash2, Loader, MapPin, Building, Shield, Users, User, X, IndianRupee, TrendingUp, TrendingDown, Minus, ArrowUpDown, Phone, Calendar, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Mail, RotateCw } from 'lucide-react';

// Define roles for staff count (for display purposes)
const STAFF_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};
// Define available plans
const SHOP_PLANS = {
    BASIC: 'BASIC', // Ensure these match the database casing
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
};

// --- Utility Functions ---

// Helper function to format the ISO date string to a clean, local date (e.g., Oct 07, 2025)
const formatDate = (isoString) => {
    if (!isoString || isoString === 'N/A') return 'N/A';
    try {
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
    switch (String(plan).toUpperCase()) { // Ensure case insensitivity
        case SHOP_PLANS.PREMIUM:
            return 'bg-purple-800/50 text-purple-300 border-purple-700';
        case SHOP_PLANS.PRO:
            return 'bg-indigo-800/50 text-indigo-300 border-indigo-700';
        case SHOP_PLANS.BASIC:
        default:
            return 'bg-gray-700/50 text-gray-300 border-gray-600';
    }
};

/**
 * Staff Summary Component
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
    let color = 'text-gray-400';
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

// 🛑 RENAMED & REFACTORED: Subscription Status Badge Component
const SubscriptionStatusBadge = ({ status }) => {
    let icon, color, bgColor, borderColor, text;
    
    // Normalize status to lowercase for robust comparison
    const normalizedStatus = status ? status.toLowerCase() : 'unknown';

    switch (normalizedStatus) {
        case 'active':
            icon = CheckCircle;
            color = 'text-green-400';
            bgColor = 'bg-green-500/10';
            borderColor = 'border-green-500/30';
            text = 'Active';
            break;
        case 'authenticated':
            icon = Shield;
            color = 'text-blue-400';
            bgColor = 'bg-blue-500/10';
            borderColor = 'border-blue-500/30';
            text = 'Trial/Auth'; // Mandate Auth, Trial Active
            break;
        case 'created':
            icon = Plus;
            color = 'text-cyan-400';
            bgColor = 'bg-cyan-500/10';
            borderColor = 'border-cyan-500/30';
            text = 'Created'; // Mandate not yet authenticated
            break;
        case 'cancellation_pending':
            icon = Clock;
            color = 'text-yellow-400';
            bgColor = 'bg-yellow-500/10';
            borderColor = 'border-yellow-500/30';
            text = 'Cancelling'; // Scheduled to cancel at cycle end
            break;
        case 'trial_cancellation_pending':
            icon = Clock;
            color = 'text-yellow-400';
            bgColor = 'bg-yellow-500/10';
            borderColor = 'border-yellow-500/30';
            text = 'Trial Cancelled'; // Mandate cancelled during trial
            break;
        case 'cancelled':
            icon = XCircle;
            color = 'text-red-400';
            bgColor = 'bg-red-500/10';
            borderColor = 'border-red-500/30';
            text = 'Cancelled';
            break;
        case 'halted':
            icon = AlertCircle;
            color = 'text-orange-400';
            bgColor = 'bg-orange-500/10';
            borderColor = 'border-orange-500/30';
            text = 'Halted'; // Failed payments
            break;
        default:
            icon = Clock;
            color = 'text-gray-400';
            bgColor = 'bg-gray-500/10';
            borderColor = 'border-gray-500/30';
            text = status; // Fallback to raw status string
    }
    
    const IconComponent = icon;
    
    return (
        <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${bgColor} ${color} border ${borderColor} min-w-[120px] transition-all duration-200`}>
            <IconComponent className="w-3.5 h-3.5" />
            {text}
        </span>
    );
};

// Generate dummy payment data (kept for fallback)
const generateDummyPaymentData = (shopName, plan) => {
    const planPrices = {
        [SHOP_PLANS.BASIC]: 499,
        [SHOP_PLANS.PRO]: 799,
        [SHOP_PLANS.PREMIUM]: 999,
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
                    className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
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
                className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col cursor-default"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="flex items-center justify-between p-6 border-b border-gray-800 bg-gradient-to-r from-gray-800/50 to-gray-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <CreditCard className="w-6 h-6 text-indigo-400" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Payment History</h2>
                            <p className="text-sm text-gray-400">{shopName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200 cursor-pointer"
                        aria-label="Close payment modal"
                    >
                        <X className="w-5 h-5 cursor-pointer" />
                    </button>
                </header>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {paymentData && (
                        <>
                            {/* Current Plan & Upcoming Payment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-3">
                                        <IndianRupee className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Current Plan</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-white mb-1">{paymentData.currentPlan}</p>
                                    <p className="text-sm text-gray-400">{paymentData.billingCycle} Billing</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-5 border border-indigo-500/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Calendar className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Next Payment</h3>
                                    </div>
                                    <p className="text-2xl font-bold text-white mb-1">
                                        ₹{paymentData.upcomingPayment.amount.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        {paymentData.upcomingPayment.daysUntil > 0 
                                            ? `Due in ${paymentData.upcomingPayment.daysUntil} days`
                                            : 'Due today'}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formatDate(paymentData.upcomingPayment.date)}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Payment History */}
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-400" aria-hidden="true" />
                                    Payment History
                                </h3>
                                <div className="space-y-3">
                                    {paymentData.paymentHistory.map((payment) => (
                                        <article
                                            key={payment.id}
                                            className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-200"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-white">
                                                                ₹{payment.amount.toFixed(2)}
                                                            </span>
                                                            {getStatusBadge(payment.status)}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                                                            {formatDate(payment.date)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                                                            {payment.method}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            ID: {payment.transactionId}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-gray-800/30">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all duration-200 cursor-pointer"
                            aria-label="Close payment modal"
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
    const [sortBy, setSortBy] = useState({ key: 'dateJoined', direction: 'descending' });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, shopName: null, shopPlan: null, shopId: null });

    // --- Data Mapping Logic ---
    const mapUserToShop = (user) => ({
        id: user._id, 
        dateSortValue: user.createdAt,
        dateJoined: formatDate(user.createdAt), 
        name: user.shopName || user.email.split('@')[0].trim() || user._id, 
        email: user.email || 'N/A', // 👈 NEW FIELD
        phone: user.phone || 'N/A', // 👈 NEW FIELD
        
        status: user.isActive !== false ? 'Active' : 'Inactive', 
        plan: (user.plan || SHOP_PLANS.BASIC).toUpperCase(), // Ensure uppercase for style matching
        staffCount: { owner: 1, manager: user.managerCount || 0, cashier: user.cashierCount || 0 }, 
        performanceTrend: user.performanceTrend || { metric: "N/A", trend: 'flat' }, 
        // subscriptionStatus is now the actual status from the backend
        subscriptionStatus: user.subscriptionStatus || 'created', 
        apiEndpoint: `/api/superadmin/shops/${user._id}`,
    });

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminShops);
            if (response.data.success) {
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

    // 🚨 NEW HANDLER: Combined refresh and initial load
    const handleRefresh = () => {
        fetchShops();
    };

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
            // 🚨 UPDATED FILTER: Search by email and phone instead of location
            shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.phone.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            let aValue = a[sortBy.key];
            let bValue = b[sortBy.key];
            
            // Reliable date comparison using the stored ISO string (dateSortValue)
            if (sortBy.key === 'dateJoined') {
                const aDate = new Date(a.dateSortValue).getTime();
                const bDate = new Date(b.dateSortValue).getTime();

                if (aDate < bDate) return sortBy.direction === 'ascending' ? -1 : 1;
                if (aDate > bDate) return sortBy.direction === 'ascending' ? 1 : -1;
                return 0;
            }

            // ✅ UPDATE: Subscription status sorting with priority order
            if (sortBy.key === 'subscriptionStatus') {
                const statusPriority = { 
                    'active': 1, 
                    'authenticated': 2, 
                    'cancellation_pending': 3,
                    'trial_cancellation_pending': 4,
                    'created': 5,
                    'halted': 6, 
                    'cancelled': 7, 
                    'unknown': 8 
                };
                const aPriority = statusPriority[String(aValue).toLowerCase()] || 8;
                const bPriority = statusPriority[String(bValue).toLowerCase()] || 8;
                
                if (aPriority < bPriority) return sortBy.direction === 'ascending' ? -1 : 1;
                if (aPriority > bPriority) return sortBy.direction === 'ascending' ? 1 : -1;
                return 0;
            }

            // Default string comparison (for name, email, phone, plan, status, etc.)
            const result = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
            return sortBy.direction === 'ascending' ? result : -result;
        });
    }, [shops, searchTerm, sortBy]);


    // --- API Integration: Delete Shop (DELETE) ---
    const handleDeleteShop = async (shopId, shopName) => {
        console.log(`[DELETE] Attempting to delete shop: ${shopName} (ID: ${shopId})`);

        if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE the shop and all its data for: ${shopName}? This action cannot be undone.`)) {
            console.log('[DELETE] Deletion cancelled by user.');
            return;
        }

        setIsLoading(true);
        try {
            const deleteUrl = API.superadminShopDetails(shopId); 
            const response = await apiClient.delete(deleteUrl);
            
            if (response.data.success) {
                setShops(prev => prev.filter(s => s.id !== shopId));
                showToast(`Shop ${shopName} deleted successfully.`, 'success'); 
            } else {
                 showToast(response.data.message || `Failed to delete shop ${shopName}.`, 'error'); 
            }
        } catch (error) {
            console.error('Delete Shop Error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete shop due to a network or server error.';
            showToast(errorMessage, 'error'); 
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
        <main className="p-4 md:p-8 h-full flex flex-col bg-gray-950 transition-colors duration-300" itemScope itemType="https://schema.org/ItemList">
            {/* Header / Search Bar */}
            <header className="pb-4 border-b border-gray-800 flex justify-between items-center" itemProp="headline">
                <h1 className="text-3xl font-extrabold text-white flex items-center">
                    <Building className="w-7 h-7 mr-3 text-indigo-400" aria-hidden="true" /> Shop Management
                    {/* 🚨 REFRESH BUTTON */}
                    <button 
                        onClick={handleRefresh}
                        disabled={isLoading}
                        title="Refresh Shop List"
                        aria-label="Refresh shop list"
                        className={`cursor-pointer ml-4 p-2 rounded-lg transition-all duration-200 ${
                            isLoading 
                                ? 'text-gray-500 bg-gray-700 cursor-not-allowed' 
                                : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10'
                        }`}
                    >
                        <RotateCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
                    </button>
                </h1>
            </header>
            
            <div className="pt-4 pb-6">
                <input
                    type="text"
                    // 🚨 UPDATED PLACEHOLDER
                    placeholder="Search by Shop Name, Email, or Phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search shops by name, email, or phone"
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                />
            </div>

            {/* Table */}
            <div className="flex-grow overflow-y-auto">
                {isLoading && shops.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400" aria-busy="true" aria-live="polite">
                        <Loader className="w-10 h-10 animate-spin text-indigo-400" aria-hidden="true" />
                        <p className='mt-3 text-gray-300'>Loading shop list...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl shadow-2xl border border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
                        <table className="min-w-full" role="table" aria-label="Shop management table">
                            <thead className="bg-gradient-to-r from-gray-800/90 to-gray-800/70 sticky top-0 z-10 border-b border-gray-700/50">
                                <tr>
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700/40 transition-all duration-200 group"
                                        onClick={() => handleSort('name')}
                                        scope="col"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Shop Name</span>
                                            <SortIcon columnKey="name" />
                                        </div>
                                    </th>
                                    {/* 🚨 NEW COLUMN: Email */}
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-700/40 transition-all duration-200"
                                        scope="col"
                                        onClick={() => handleSort('email')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Email</span>
                                            <SortIcon columnKey="email" />
                                        </div>
                                    </th>
                                    {/* 🚨 NEW COLUMN: Phone */}
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden md:table-cell cursor-pointer hover:bg-gray-700/40 transition-all duration-200"
                                        scope="col"
                                        onClick={() => handleSort('phone')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Phone</span>
                                            <SortIcon columnKey="phone" />
                                        </div>
                                    </th>
                                    {/* Date Joined (Kept) */}
                                    <th 
                                        className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider hidden lg:table-cell cursor-pointer hover:bg-gray-700/40 transition-all duration-200"
                                        scope="col"
                                        onClick={() => handleSort('dateJoined')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span>Joined</span>
                                            <SortIcon columnKey="dateJoined" />
                                        </div>
                                    </th>
                                    {/* Plan (Now Clickable) */}
                                    <th 
                                        className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('plan')}
                                    >
                                        <div className="flex justify-center items-center gap-2">
                                            <span>Plan</span>
                                            <SortIcon columnKey="plan" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider" scope="col">
                                        Staff
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                        Performance
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider" scope="col">
                                        Status
                                    </th>
                                    <th 
                                        className="px-6 py-4 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/40 transition-all duration-200"
                                        onClick={() => handleSort('subscriptionStatus')}
                                    >
                                        <div className="flex justify-center items-center gap-2">
                                            {/* 🚨 UPDATED HEADER */}
                                            <span>Subscription Status</span>
                                            <SortIcon columnKey="subscriptionStatus" />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider" scope="col">
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
                                            {/* 🚨 NEW CELL: Email */}
                                            <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span className="truncate max-w-[150px]">{shop.email}</span>
                                                </div>
                                            </td>
                                            {/* 🚨 NEW CELL: Phone */}
                                            <td className="px-6 py-5 whitespace-nowrap hidden md:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span className="font-medium">{shop.phone}</span>
                                                </div>
                                            </td>
                                            {/* Date Joined */}
                                            <td className="px-6 py-5 whitespace-nowrap hidden lg:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                                                    <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                                    <span>{shop.dateJoined}</span>
                                                </div>
                                            </td>

                                            {/* 🚨 UPDATED CELL: Plan with Color Indication */}
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
                                            {/* Subscription Status */}
                                            <td className="px-6 py-5 whitespace-nowrap text-center">
                                                {/* 🚨 UPDATED COMPONENT NAME */}
                                                <SubscriptionStatusBadge status={shop.subscriptionStatus} />
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
        </main>
    );
};

export default UserManagement;