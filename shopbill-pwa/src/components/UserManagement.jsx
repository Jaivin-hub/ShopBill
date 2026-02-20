import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Plus, Trash2, Loader, MapPin, Building, Shield, Users, User, X, IndianRupee, TrendingUp, TrendingDown, Minus, ArrowUpDown, Phone, Calendar, Clock, CreditCard, CheckCircle, XCircle, AlertCircle, Mail, RotateCw, Search } from 'lucide-react';

const STAFF_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};

const SHOP_PLANS = {
    BASIC: 'BASIC',
    PRO: 'PRO',
    PREMIUM: 'PREMIUM',
};

// --- GLOBAL UTILITY: COMPARES CALENDAR DATES ONLY (YYYY-MM-DD) ---
const calculateDueStatus = (endDateString) => {
    if (!endDateString) return { text: 'N/A', isUrgent: false };

    try {
        const endDate = new Date(endDateString);
        const now = new Date();

        const todayVal = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        const expiryVal = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

        const diffDays = Math.round((expiryVal - todayVal) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return { text: 'Due Today', isUrgent: true };
        } else if (diffDays < 0) {
            return { text: 'Overdue', isUrgent: true };
        } else if (diffDays === 1) {
            return { text: 'Due Tomorrow', isUrgent: true };
        } else {
            return { text: `Due in ${diffDays} Days`, isUrgent: diffDays <= 3 };
        }
    } catch (e) {
        return { text: 'Invalid Date', isUrgent: false };
    }
};

const formatDateUTC = (isoString) => {
    if (!isoString || isoString === 'N/A') return 'N/A';
    try {
        const d = new Date(isoString);
        const day = d.getUTCDate();
        const year = d.getUTCFullYear();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = monthNames[d.getUTCMonth()];

        return `${month} ${day}, ${year}`;
    } catch (e) {
        return 'Invalid Date';
    }
};

const getPlanStyles = (plan) => {
    const planType = String(plan || '').toUpperCase();
    switch (planType) {
        case 'PREMIUM':
            return 'bg-purple-800/50 text-purple-300 border-purple-700';
        case 'PRO':
            return 'bg-indigo-800/50 text-indigo-300 border-indigo-700';
        case 'BASIC':
        default:
            return 'bg-gray-700/50 text-gray-300 border-gray-600';
    }
};

const StaffPill = ({ count }) => {
    return (
        <div className="flex items-center justify-center gap-2 w-full">
            <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-lg text-xs font-medium" title="Managers">
                    <Users className="w-3.5 h-3.5" />
                    <span>{count.manager}</span>
                </span>
                <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-xs font-medium" title="Cashiers">
                    <User className="w-3.5 h-3.5" />
                    <span>{count.cashier}</span>
                </span>
            </div>
        </div>
    );
};

const PerformanceTrendIndicator = ({ performance }) => {
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
        <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${bgColor} border ${borderColor}`}>
            <IconComponent className={`w-3.5 h-3.5 ${color}`} />
            <span className={color}>{metric}</span>
        </div>
    );
};

const SubscriptionStatusBadge = ({ status }) => {
    let icon, color, bgColor, borderColor, text;
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
            text = 'Trial/Auth';
            break;
        case 'created':
            icon = Plus;
            color = 'text-cyan-400';
            bgColor = 'bg-cyan-500/10';
            borderColor = 'border-cyan-500/30';
            text = 'Created';
            break;
        case 'cancellation_pending':
            icon = Clock;
            color = 'text-yellow-400';
            bgColor = 'bg-yellow-500/10';
            borderColor = 'border-yellow-500/30';
            text = 'Cancelling';
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
            text = 'Halted';
            break;
        default:
            icon = Clock;
            color = 'text-gray-400';
            bgColor = 'bg-gray-500/10';
            borderColor = 'border-gray-500/30';
            text = status;
    }

    const IconComponent = icon;
    return (
        <span className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${bgColor} ${color} border ${borderColor} min-w-[110px]`}>
            <IconComponent className="w-3.5 h-3.5" />
            {text}
        </span>
    );
};

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
                    showToast('Failed to fetch payment records.', 'error');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPaymentData();
        }
    }, [isOpen, shopId, apiClient, API, showToast]);

    if (!isOpen) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
                <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-4xl flex flex-col" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center h-64">
                        <Loader className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status) => {
        const s = status?.toLowerCase();
        if (s === 'paid') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30"><CheckCircle className="w-3.5 h-3.5" />Paid</span>;
        if (s === 'failed') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30"><XCircle className="w-3.5 h-3.5" />Failed</span>;
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"><AlertCircle className="w-3.5 h-3.5" />Pending</span>;
    };

    const nextPaymentStatus = calculateDueStatus(paymentData?.upcomingPayment?.date || paymentData?.planEndDate);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800 bg-gradient-to-r from-gray-800/50 to-gray-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg md:text-xl font-bold text-white">Payment History</h2>
                            <p className="text-xs md:text-sm text-gray-400">{shopName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar">
                    {paymentData ? (
                        <>
                            {/* 🚀 FIXED: Changed grid-cols-1 to grid-cols-2 for mobile row layout */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                <div className="bg-gray-800/50 rounded-xl p-3 md:p-5 border border-gray-700/50">
                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                        <IndianRupee className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                                        <h3 className="text-[10px] md:text-sm font-semibold text-gray-400 tracking-wider">Plan</h3>
                                    </div>
                                    <p className="text-lg md:text-2xl font-bold text-white mb-1">{paymentData.currentPlan || shopPlan}</p>
                                    <p className="text-[10px] md:text-sm text-gray-400">Monthly</p>
                                </div>

                                <div className={`bg-gradient-to-br rounded-xl p-3 md:p-5 border transition-all duration-300 ${nextPaymentStatus.isUrgent ? 'from-red-500/10 to-orange-500/10 border-red-500/40' : 'from-indigo-500/10 to-purple-500/10 border-indigo-500/30'}`}>
                                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                                        <Calendar className={`w-4 h-4 md:w-5 md:h-5 ${nextPaymentStatus.isUrgent ? 'text-red-400' : 'text-indigo-400'}`} />
                                        <h3 className="text-[10px] md:text-sm font-semibold text-gray-400 tracking-wider">Next Due</h3>
                                    </div>
                                    <p className="text-lg md:text-2xl font-bold text-white mb-1">
                                        ₹{paymentData.upcomingPayment?.amount?.toFixed(0) || '0'}
                                    </p>
                                    <p className={`text-[10px] md:text-sm font-bold tracking-tight ${nextPaymentStatus.isUrgent ? 'text-red-400' : 'text-indigo-400'}`}>
                                        {nextPaymentStatus.text}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1 truncate">
                                        {formatDateUTC(paymentData.upcomingPayment?.date || paymentData?.planEndDate)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-base md:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-indigo-400" />Payment History
                                </h3>
                                <div className="space-y-3">
                                    {paymentData.paymentHistory && paymentData.paymentHistory.length > 0 ? (
                                        paymentData.paymentHistory.map((payment) => (
                                            <article key={payment.id} className="bg-gray-800/30 rounded-lg p-3 md:p-4 border border-gray-700/30 hover:border-gray-600/50 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1 overflow-hidden">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-sm font-semibold text-white">₹{payment.amount?.toFixed(2)}</span>
                                                            {getStatusBadge(payment.status)}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] md:text-xs text-gray-400">
                                                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDateUTC(payment.date)}</span>
                                                            <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />{payment.method || 'Online'}</span>
                                                            <span className="text-gray-500 truncate">ID: {payment.transactionId}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </article>
                                        ))
                                    ) : (
                                        <p className="text-center py-8 text-gray-600 border border-dashed border-gray-800 rounded-lg text-sm">No previous transaction records.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-500">No payment data found.</div>
                    )}
                </div>
                <div className="p-4 md:p-6 border-t border-gray-800 bg-gray-800/30 flex justify-end">
                    <button onClick={onClose} className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all text-sm md:text-base">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const UserManagement = ({ apiClient, API, showToast, currentUser, darkMode = true }) => {
    const [shops, setShops] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState({ key: 'dateJoined', direction: 'descending' });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, shopName: null, shopPlan: null, shopId: null });

    const mapUserToShop = (user) => {
        const dueStatus = calculateDueStatus(user.planEndDate);
        return {
            id: user._id,
            dateSortValue: user.createdAt,
            dateJoined: formatDateUTC(user.createdAt),
            name: user.shopName || user.email.split('@')[0],
            email: user.email || 'N/A',
            phone: user.phone || 'N/A',
            status: user.isActive !== false ? 'Active' : 'Inactive',
            plan: String(user.plan || 'BASIC').toUpperCase(),
            staffCount: { manager: user.managerCount || 0, cashier: user.cashierCount || 0 },
            performanceTrend: user.performanceTrend || { metric: "0.00%", trend: 'flat' },
            subscriptionStatus: user.subscriptionStatus || 'created',
            planEndDate: user.planEndDate,
            dueStatus: dueStatus
        };
    };

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminShops);
            if (response.data.success) {
                const mappedShops = response.data.data.map(mapUserToShop);
                setShops(mappedShops);
            }
        } catch (error) {
            showToast('Could not load shop list.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API, showToast]);

    useEffect(() => {
        if (currentUser?.role === 'superadmin') fetchShops();
    }, [fetchShops, currentUser]);

    const handleRefresh = () => fetchShops();

    const handleSort = (key) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    const filteredAndSortedShops = useMemo(() => {
        let filtered = shops.filter(shop =>
            shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.phone.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            let aValue = a[sortBy.key];
            let bValue = b[sortBy.key];

            if (sortBy.key === 'dateJoined') {
                return sortBy.direction === 'ascending'
                    ? new Date(a.dateSortValue) - new Date(b.dateSortValue)
                    : new Date(b.dateSortValue) - new Date(a.dateSortValue);
            }

            if (sortBy.key === 'plan') {
                // Plan order: BASIC < PRO < PREMIUM
                const planOrder = { 'BASIC': 1, 'PRO': 2, 'PREMIUM': 3 };
                const aOrder = planOrder[aValue] || 0;
                const bOrder = planOrder[bValue] || 0;
                const result = aOrder - bOrder;
                return sortBy.direction === 'ascending' ? result : -result;
            }

            const result = String(aValue).toLowerCase().localeCompare(String(bValue).toLowerCase());
            return sortBy.direction === 'ascending' ? result : -result;
        });
    }, [shops, searchTerm, sortBy]);

    const handleDeleteShop = async (shopId, shopName) => {
        if (!window.confirm(`Delete ${shopName} permanently?`)) return;
        setIsLoading(true);
        try {
            const response = await apiClient.delete(API.superadminShopDetails(shopId));
            if (response.data.success) {
                setShops(prev => prev.filter(s => s.id !== shopId));
                showToast(`Shop deleted.`, 'success');
            }
        } catch (error) {
            showToast('Delete failed.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenPaymentModal = (shopId, shopName, shopPlan) => {
        setPaymentModal({ isOpen: true, shopId, shopName, shopPlan });
    };

    const handleClosePaymentModal = () => {
        setPaymentModal({ isOpen: false, shopId: null, shopName: null, shopPlan: null });
    };

    const SortIcon = ({ columnKey }) => {
        const iconColor = darkMode ? 'text-gray-600' : 'text-slate-500';
        const activeColor = 'text-indigo-400';
        if (sortBy.key !== columnKey) return <ArrowUpDown className={`w-3 h-3 ml-1 ${iconColor}`} />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortBy.direction === 'ascending' ? 'rotate-180 ' : ''}${activeColor}`} />;
    };

    // Theme variables
    const mainBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
    const headerBg = darkMode ? 'bg-gray-950' : 'bg-white';
    const borderColor = darkMode ? 'border-gray-800' : 'border-slate-200';
    const textPrimary = darkMode ? 'text-white' : 'text-slate-900';
    const textSecondary = darkMode ? 'text-gray-400' : 'text-slate-600';
    const textMuted = darkMode ? 'text-gray-500' : 'text-slate-500';
    const cardBg = darkMode ? 'bg-gray-900' : 'bg-white';
    const inputBg = darkMode ? 'bg-gray-900' : 'bg-slate-100';
    const inputBorder = darkMode ? 'border-gray-800' : 'border-slate-300';
    const buttonBg = darkMode ? 'bg-gray-900 hover:bg-gray-800' : 'bg-slate-100 hover:bg-slate-200';

    return (
        <main className={`h-screen flex flex-col ${mainBg} transition-colors duration-300 overflow-hidden`}>
            <header className={`p-4 md:p-6 border-b ${borderColor} flex justify-between items-center flex-shrink-0 ${headerBg} z-10`}>
                <h1 className={`text-xl md:text-2xl font-bold ${textPrimary} flex items-center`}>
                    <Building className="w-6 h-6 mr-2 md:mr-3 text-indigo-400" />
                    <span className="hidden xs:block">Shop Management</span>
                    <span className="xs:hidden">Shops</span>
                    <button onClick={handleRefresh} disabled={isLoading} className={`ml-4 p-2 rounded-lg ${buttonBg} transition-all cursor-pointer`}>
                        <RotateCw className={`w-4 h-4 ${textSecondary} ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </h1>

                <div className="hidden sm:block relative w-64 md:w-80">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                    <input
                        type="text"
                        placeholder="Search shops..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 ${inputBg} border ${inputBorder} rounded-xl text-sm ${textPrimary} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                    />
                </div>
            </header>

            <div className={`p-4 border-b ${borderColor} sm:hidden flex-shrink-0 ${headerBg}`}>
                <div className="relative w-full">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textMuted}`} />
                    <input
                        type="text"
                        placeholder="Search name, email, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 ${inputBg} border ${inputBorder} rounded-xl text-sm ${textPrimary}`}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {isLoading && shops.length === 0 ? (
                    <div className={`h-full flex flex-col items-center justify-center ${textMuted}`}>
                        <Loader className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                        <p className="animate-pulse">Fetching shop data...</p>
                    </div>
                ) : (
                    <>
                        {/* MOBILE/TABLET VIEW (Cards) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
                            {filteredAndSortedShops.length === 0 ? (
                                <div className={`col-span-full py-20 text-center ${textMuted}`}>No shops found matching your search.</div>
                            ) : (
                                filteredAndSortedShops.map((shop) => {
                                    const shopCardBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200';
                                    const innerCardBg = darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-200';
                                    return (
                                    <div key={shop.id} className={`${shopCardBg} border rounded-2xl p-4 flex flex-col gap-4 shadow-lg`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                    <Store className="w-5 h-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <h3 className={`${textPrimary} font-bold leading-tight`}>{shop.name}</h3>
                                                    <p className={`text-[10px] ${textMuted} tracking-widest`}>Joined {shop.dateJoined}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleOpenPaymentModal(shop.id, shop.name, shop.plan)} className="p-2 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer">
                                                    <CreditCard className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className={`flex flex-col p-2 rounded-lg ${innerCardBg} border`}>
                                                <span className={`text-[10px] ${textMuted} mb-1`}>Due Status</span>
                                                <div className="flex items-center gap-1.5">
                                                    <Clock className={`w-3 h-3 ${shop.dueStatus.isUrgent ? 'text-red-400' : 'text-indigo-400'}`} />
                                                    <span className={`text-xs font-bold ${shop.dueStatus.isUrgent ? 'text-red-400' : textPrimary}`}>
                                                        {shop.dueStatus.text}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className={`flex flex-col p-2 rounded-lg ${innerCardBg} border`}>
                                                <span className={`text-[10px] ${textMuted} mb-1`}>Performance</span>
                                                <PerformanceTrendIndicator performance={shop.performanceTrend} />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                            <a
                                                href={`mailto:${shop.email}`}
                                                className={`flex items-center text-xs ${textSecondary} gap-2 hover:text-indigo-400 transition-colors overflow-hidden max-w-[150px] md:max-w-none`}
                                            >
                                                <Mail className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-600' : 'text-slate-500'} shrink-0`} />
                                                <span className="truncate">{shop.email}</span>
                                            </a>
                                            <a
                                                href={`tel:${shop.phone}`}
                                                className={`flex items-center text-xs ${textSecondary} gap-2 hover:text-indigo-400 transition-colors shrink-0`}
                                            >
                                                <Phone className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-600' : 'text-slate-500'} shrink-0`} />
                                                <span>{shop.phone}</span>
                                            </a>
                                        </div>

                                        <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPlanStyles(shop.plan)}`}>{shop.plan}</span>
                                                <StaffPill count={shop.staffCount} />
                                            </div>
                                            <SubscriptionStatusBadge status={shop.subscriptionStatus} />
                                        </div>
                                    </div>
                                    );
                                })
                            )}
                        </div>

                        {/* DESKTOP VIEW (Table with Horizontal Scroll Protection) */}
                        <div className="hidden lg:block w-full">
                            <div className={`overflow-x-auto rounded-2xl border ${borderColor} ${darkMode ? 'bg-gray-900/40' : 'bg-white/50'} backdrop-blur-sm`}>
                                <table className={`min-w-full table-auto divide-y ${borderColor}`}>
                                    <thead className={`${darkMode ? 'bg-gray-800/80' : 'bg-slate-100/80'} sticky top-0 z-10`}>
                                        <tr>
                                            <th onClick={() => handleSort('name')} className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} tracking-wider cursor-pointer hover:${textPrimary} transition-colors`}>
                                                <div className="flex items-center">Shop <SortIcon columnKey="name" /></div>
                                            </th>
                                            <th className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} tracking-wider`}>Contact Details</th>
                                            <th onClick={() => handleSort('dateJoined')} className={`px-6 py-4 text-left text-xs font-semibold ${textSecondary} tracking-wider cursor-pointer hover:${textPrimary} transition-colors`}>
                                                <div className="flex items-center">Joined <SortIcon columnKey="dateJoined" /></div>
                                            </th>
                                            <th onClick={() => handleSort('plan')} className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider cursor-pointer hover:${textPrimary} transition-colors`}>
                                                <div className="flex items-center justify-center">Plan / Due <SortIcon columnKey="plan" /></div>
                                            </th>
                                            <th className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider`}>Staffing</th>
                                            <th className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider`}>Growth</th>
                                            <th className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider`}>Subscription</th>
                                            <th className={`px-6 py-4 text-center text-xs font-semibold ${textSecondary} tracking-wider`}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${borderColor}`}>
                                        {filteredAndSortedShops.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className={`px-6 py-20 text-center ${textMuted}`}>No shops found matching your search.</td>
                                            </tr>
                                        ) : (
                                            filteredAndSortedShops.map((shop) => {
                                                const rowHover = darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-slate-50';
                                                return (
                                                <tr key={shop.id} className={`${rowHover} transition-colors group`}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"><Store className="w-4 h-4 text-indigo-400" /></div>
                                                            <span className={`text-sm font-semibold ${textPrimary} group-hover:text-indigo-400 transition-colors truncate max-w-[150px]`}>{shop.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-slate-700'} truncate max-w-[180px]`}>{shop.email}</div>
                                                        <div className={`text-[10px] ${textMuted} font-mono tracking-tighter`}>{shop.phone}</div>
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-xs ${textSecondary} font-medium`}>{shop.dateJoined}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-tighter border ${getPlanStyles(shop.plan)}`}>
                                                                {shop.plan}
                                                            </span>
                                                            <span className={`text-[10px] flex items-center gap-1 ${shop.dueStatus.isUrgent ? 'text-red-400' : textMuted}`}>
                                                                <Clock className="w-3 h-3" /> {shop.dueStatus.text}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center"><StaffPill count={shop.staffCount} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center"><PerformanceTrendIndicator performance={shop.performanceTrend} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center"><SubscriptionStatusBadge status={shop.subscriptionStatus} /></td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button onClick={() => handleOpenPaymentModal(shop.id, shop.name, shop.plan)} className="p-2 text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all cursor-pointer"><CreditCard className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

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