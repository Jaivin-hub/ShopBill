import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
    IndianRupee, CreditCard, Users, Package,
    List, Loader2, TrendingUp, Clock, Activity,
    ShieldCheck, RefreshCw, PlusCircle, ShoppingCart,
    ChevronRight, Inbox, Sparkles, Box, ArrowRight,
    Store, MapPin, BarChart3, Settings2, Truck
} from 'lucide-react';
import AttendancePunch from './AttendancePunch';

const USER_ROLES = { OWNER: 'owner', MANAGER: 'manager', CASHIER: 'cashier' };

const Dashboard = ({ darkMode, userRole, apiClient, API, showToast, onViewAllSales, onViewAllInventory, onViewAllCredit, setCurrentPage, onViewSaleDetails, onLogout, currentUser }) => {
    const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.CASHIER;

    // --- States ---
    const [inventory, setInventory] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Limit sales to last 100 for dashboard performance
            const [invResponse, custResponse, salesResponse] = await Promise.all([
                apiClient.get(API.inventory),
                apiClient.get(API.customers),
                apiClient.get(`${API.sales}?limit=100`), // Limit sales for dashboard
            ]);

            setInventory(invResponse.data || []);
            setCustomers(custResponse.data || []);
            // Handle paginated response structure - sales API returns { sales: [...], pagination: {...} }
            const salesData = salesResponse.data;
            setSales(Array.isArray(salesData) ? salesData : (salesData?.sales || []));

        } catch (error) {
            const errorData = error.response?.data;
            if (error.response?.status === 403 && errorData?.status === 'halted') {
                showToast(errorData.message || 'Subscription Issue. Logging out...', 'error');
                onLogout();
                return;
            }
            showToast('Could not update data. Please check connection.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API, showToast, onLogout]);

    useEffect(() => {
        if (hasAccess) fetchDashboardData();
    }, [hasAccess, fetchDashboardData]);

    // --- Optimized Data Calculations ---
    const today = useMemo(() => {
        if (!Array.isArray(sales)) return { totalSales: 0, totalCredit: 0 };
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const todaySales = sales.filter(s => s && new Date(s.timestamp) > start);
        return {
            totalSales: todaySales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0),
            totalCredit: todaySales.reduce((sum, sale) => sum + (sale.amountCredited || 0), 0)
        };
    }, [sales]);

    const totalOwed = useMemo(() =>
        customers.reduce((sum, c) => sum + (c.outstandingCredit || 0), 0)
        , [customers]);

    const topDebtors = useMemo(() =>
        customers
            .filter(c => (c.outstandingCredit || 0) > 0)
            .sort((a, b) => b.outstandingCredit - a.outstandingCredit)
            .slice(0, 5)
        , [customers]);

    const lowStock = useMemo(() => {
        const lowStockItems = [];
        
        inventory.forEach(item => {
            // For items with variants, check each variant individually
            if (item.variants && item.variants.length > 0) {
                item.variants.forEach(variant => {
                    const variantReorderLevel = variant.reorderLevel !== null && variant.reorderLevel !== undefined 
                        ? variant.reorderLevel 
                        : (item.reorderLevel || 5);
                    if ((variant.quantity || 0) <= variantReorderLevel) {
                        lowStockItems.push({
                            productId: item._id,
                            productName: item.name,
                            variantLabel: variant.label,
                            quantity: variant.quantity || 0,
                            reorderLevel: variantReorderLevel,
                            isVariant: true
                        });
                    }
                });
            } else {
                // For items without variants, check base quantity
                if ((item.quantity || 0) <= (item.reorderLevel || 0)) {
                    lowStockItems.push({
                        productId: item._id,
                        productName: item.name,
                        variantLabel: null,
                        quantity: item.quantity || 0,
                        reorderLevel: item.reorderLevel || 0,
                        isVariant: false
                    });
                }
            }
        });
        
        return lowStockItems.slice(0, 5);
    }, [inventory]);

    const recentSales = useMemo(() =>
        [...sales]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5)
        , [sales]);

    const formatTime = (ts) => {
        const diff = new Date() - new Date(ts);
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
        return `${Math.floor(mins / 1440)}d ago`;
    };

    // --- Styling Vars ---
    const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    const headerBg = darkMode ? 'bg-slate-950/80' : 'bg-white/80';
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const subText = darkMode ? 'text-slate-400' : 'text-slate-500';

    const welcome = useMemo(() => {
        const content = {
            [USER_ROLES.OWNER]: { title: `Owner's`, desc: `Manage operations and shop performance.` },
            [USER_ROLES.MANAGER]: { title: `Manager's`, desc: `Optimize stock and daily tasks.` },
            [USER_ROLES.CASHIER]: { title: `Cashier's`, desc: `Sales tracking and credit management.` }
        };
        return content[userRole] || { title: `Business`, desc: `Operations dashboard.` };
    }, [userRole]);

    // Role-based quick actions
    const quickActions = useMemo(() => {
        const allActions = [
            { label: 'New Bill', icon: PlusCircle, color: 'bg-indigo-600', page: 'billing', roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], order: { owner: 1, manager: 1, cashier: 1 } },
            { label: 'Add Stock', icon: Package, color: 'bg-amber-500', page: 'inventory', roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], order: { owner: 2, manager: 2, cashier: null } },
            { label: 'Ledger', icon: Users, color: 'bg-blue-500', page: 'khata', roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], order: { owner: 3, manager: 3, cashier: 2 } },
            { label: 'Recent Sales', icon: ShoppingCart, color: 'bg-emerald-500', page: 'salesActivity', roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], order: { owner: 4, manager: 4, cashier: 3 } },
            { label: 'Team Management', icon: ShieldCheck, color: 'bg-teal-500', page: 'staffPermissions', roles: [USER_ROLES.OWNER], order: { owner: 5, manager: null, cashier: null } },
            ...(currentUser?.plan === 'PREMIUM' || currentUser?.plan === 'PRO' 
                ? [{ label: 'Supply Chain', icon: Truck, color: 'bg-purple-500', page: 'scm', roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], order: { owner: 6, manager: 5, cashier: null } }]
                : []
            )
        ];
        
        // Filter by role and sort by order
        return allActions
            .filter(action => action.roles.includes(userRole))
            .sort((a, b) => {
                const orderA = a.order[userRole];
                const orderB = b.order[userRole];
                if (orderA === null) return 1;
                if (orderB === null) return -1;
                return orderA - orderB;
            });
    }, [userRole, currentUser?.plan, fetchDashboardData]);

    const EmptyState = ({ icon: Icon, title, message, actionText, onAction }) => (
        <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className={`p-3 rounded-full mb-3 ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Icon size={24} className="opacity-20" />
            </div>
            <h4 className="text-sm font-bold mb-1">{title}</h4>
            <p className={`text-[11px] mb-4 max-w-[200px] leading-relaxed ${subText}`}>{message}</p>
            {actionText && (
                <button onClick={onAction} className="text-[11px] font-bold text-indigo-500 hover:underline flex items-center gap-1">
                    {actionText} <ChevronRight size={12} />
                </button>
            )}
        </div>
    );

    if (!hasAccess) return (
        <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
            <ShieldCheck className="w-10 h-10 text-slate-500 mb-2 opacity-40" />
            <h2 className="text-lg font-bold">Access Restricted</h2>
            <p className="text-xs opacity-50">Please use the Billing Terminal.</p>
        </div>
    );

    if (isLoading) return (
        <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs font-black opacity-40 tracking-widest ">Syncing Dashboard...</p>
        </div>
    );

    return (
        <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeBase}`}>
            <header className={`sticky top-0 z-[100] backdrop-blur-xl border-b px-4 md:px-8 py-4 transition-colors ${headerBg} ${darkMode ? 'border-slate-800/60' : 'border-slate-200'}`}>
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">
                            {welcome.title} <span className="text-indigo-500">Dashboard</span>
                        </h1>
                        <p className="text-[9px] text-slate-500 font-black tracking-[0.2em]">
                            {welcome.desc}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchDashboardData}
                            disabled={isLoading}
                            className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${cardBase} ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                            title="Refresh Dashboard"
                        >
                            <RefreshCw className={`w-4 h-4 ${darkMode ? 'text-slate-300' : 'text-slate-600'} ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-inherit">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black tracking-widest opacity-60">SYSTEM LIVE</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 md:px-8 py-6 overflow-x-hidden">
                <div className="max-w-7xl mx-auto space-y-8 pb-12">

                    {/* KPI CARDS */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBase}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1">
                                        Today's Sales
                                    </p>
                                    <h2 className="text-2xl font-black text-emerald-400">
                                        ₹{today.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </h2>
                                </div>
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><TrendingUp size={20} /></div>
                            </div>
                        </div>
                        <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBase}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1">
                                        Credit Given Today
                                    </p>
                                    <h2 className="text-2xl font-black text-amber-400">
                                        ₹{today.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </h2>
                                </div>
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><CreditCard size={20} /></div>
                            </div>
                        </div>
                        <div className={`p-5 rounded-2xl border transition-all hover:scale-[1.01] ${cardBase}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 tracking-widest mb-1 ">Outstanding Ledger</p>
                                    <h2 className={`text-2xl font-black ${totalOwed > 0 ? 'text-rose-500' : ''}`}>₹{totalOwed.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h2>
                                </div>
                                <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><Users size={20} /></div>
                            </div>
                        </div>
                    </section>

                    {/* ATTENDANCE PUNCH (For Staff Only) */}
                    {(userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.CASHIER) && (
                        <div className="mb-4">
                            <AttendancePunch
                                apiClient={apiClient}
                                API={API}
                                showToast={showToast}
                                darkMode={darkMode}
                                currentUser={currentUser}
                            />
                        </div>
                    )}

                    {/* ACTION BUTTONS */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                        {quickActions.map((btn, i) => {
                            const totalItems = quickActions.length;
                            const isLastItem = i === totalItems - 1;
                            
                            // Mobile: if last item is alone in 2-column grid (7 items = 2+2+2+1), make it span full width
                            const itemsInLastRow2Col = totalItems % 2;
                            const shouldSpanMobile = isLastItem && itemsInLastRow2Col === 1;
                            
                            // Tablet/Desktop: if last item is alone in 3-column grid (7 items = 3+3+1), make it span 2 columns
                            const itemsInLastRow3Col = totalItems % 3;
                            const shouldSpan3Col = isLastItem && itemsInLastRow3Col === 1 && totalItems > 3;
                            
                            return (
                                <button
                                    key={i}
                                    onClick={btn.action || (() => setCurrentPage(btn.page))}
                                    className={`${shouldSpanMobile ? 'col-span-2 sm:col-span-1' : ''} ${shouldSpan3Col ? 'sm:col-span-2 lg:col-span-2 xl:col-span-1' : ''} p-3 rounded-2xl border flex items-center gap-3 hover:scale-[1.03] active:scale-95 transition-all ${cardBase}`}
                                >
                                    <div className={`${btn.color} p-2 rounded-xl text-white shadow-lg shrink-0`}><btn.icon size={18} /></div>
                                    <span className="text-xs font-black tracking-tight">{btn.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* INSIGHTS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* INVENTORY - LEFT AS IS */}
                        <div className={`rounded-3xl border flex flex-col overflow-hidden ${cardBase}`}>
                            <div className="px-6 py-5 border-b border-inherit flex justify-between items-center bg-slate-500/5">
                                <h3 className="text-[11px] font-black tracking-[0.1em] flex items-center gap-2 ">
                                    <Package size={16} className="text-amber-500" /> Low Stock
                                </h3>
                                {lowStock.length > 0 && (
                                    <button
                                        onClick={onViewAllInventory}
                                        className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1 leading-none"
                                    >
                                        <span className="inline-block">MANAGE</span>
                                        <ArrowRight size={12} className="inline-block" />
                                    </button>
                                )}
                            </div>
                            <div className="p-5 flex-1">
                                {lowStock.length > 0 ? (
                                    <div className="space-y-3">
                                        {lowStock.map((item, index) => {
                                            // Display product name with variant label if it's a variant
                                            const displayName = item.isVariant 
                                                ? `${item.productName} - ${item.variantLabel}`
                                                : item.productName;
                                            
                                            return (
                                                <div key={`${item.productId}-${item.variantLabel || 'base'}-${index}`} className="flex justify-between items-center p-2 hover:bg-slate-500/5 rounded-lg transition-colors border border-transparent hover:border-inherit">
                                                    <span className="text-sm font-semibold truncate pr-2">{displayName}</span>
                                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded whitespace-nowrap ${darkMode ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                                        {item.quantity} LEFT
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <EmptyState icon={Package} title="Optimal Levels" message="All stock levels healthy." actionText="Inventory" onAction={() => setCurrentPage('inventory')} />
                                )}
                            </div>
                        </div>

                        {/* RECOVERY/CREDIT - LEFT AS IS */}
                        <div className={`rounded-3xl border flex flex-col overflow-hidden ${cardBase}`}>
                            <div className="px-6 py-5 border-b border-inherit flex justify-between items-center bg-slate-500/5">
                                <h3 className="text-[11px] font-black tracking-[0.1em] flex items-center gap-2 ">
                                    <Clock size={16} className="text-blue-500" /> Top Debtors
                                </h3>
                                {topDebtors.length > 0 && (
                                    <button
                                        onClick={onViewAllCredit}
                                        className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1 leading-none"
                                    >
                                        <span className="inline-block">VIEW ALL</span>
                                        <ArrowRight size={12} className="inline-block" />
                                    </button>
                                )}
                            </div>
                            <div className="p-5 flex-1">
                                {topDebtors.length > 0 ? (
                                    <div className="space-y-3">
                                        {topDebtors.map(c => (
                                            <div key={c._id} className="flex justify-between items-center p-2 hover:bg-slate-500/5 rounded-lg transition-colors">
                                                <span className="text-sm font-semibold truncate pr-2">{c.name}</span>
                                                <span className="text-sm font-black text-rose-500">₹{c.outstandingCredit.toLocaleString('en-IN')}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={Users} title="Zero Credit" message="No outstanding balances to collect." actionText="Ledger" onAction={() => setCurrentPage('khata')} />
                                )}
                            </div>
                        </div>

                        {/* ACTIVITY SECTION - LEFT AS IS */}
                        <div className={`rounded-3xl border flex flex-col overflow-hidden ${cardBase}`}>
                            <div className="px-6 py-5 border-b border-inherit flex justify-between items-center bg-slate-500/5">
                                <h3 className="text-[11px] font-black tracking-[0.1em] flex items-center gap-2 ">
                                    <Activity size={16} className="text-emerald-500" /> Recent Sales
                                </h3>
                                {sales.length > 0 && (
                                    <button
                                        onClick={onViewAllSales}
                                        className="text-[10px] font-bold text-indigo-500 hover:underline flex items-center gap-1 leading-none"
                                    >
                                        <span className="inline-block">HISTORY</span>
                                        <ArrowRight size={12} className="inline-block" />
                                    </button>
                                )}
                            </div>
                            <div className="p-5 flex-1">
                                {recentSales.length > 0 ? (
                                    <div className="space-y-4">
                                        {recentSales.map(sale => (
                                            <div key={sale._id} className="flex flex-col gap-1 p-2 hover:bg-slate-500/5 rounded-lg transition-all group">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm font-black">₹{sale.totalAmount.toLocaleString('en-IN')}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] opacity-50 font-bold">{formatTime(sale.timestamp)}</span>
                                                        {onViewSaleDetails && (
                                                            <button onClick={() => onViewSaleDetails(sale)} className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-indigo-500 text-white transition-all">
                                                                <ArrowRight size={10} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {sale.paymentMethod === 'Mixed' ? (
                                                        <>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${darkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                                                PAID: ₹{(sale.amountPaid || 0).toLocaleString()}
                                                            </span>
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${darkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                                DUE: ₹{(sale.amountCredited || 0).toLocaleString()}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border  ${sale.paymentMethod === 'Credit'
                                                            ? (darkMode ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-100')
                                                            : (darkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100')
                                                            }`}>
                                                            {sale.paymentMethod === 'Credit'
                                                                ? `DUE: ₹${sale.totalAmount.toLocaleString()}`
                                                                : `PAID: ₹${sale.totalAmount.toLocaleString()}`
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={ShoppingCart} title="No Sales" message="No transactions recorded today." actionText="Open POS" onAction={() => setCurrentPage('billing')} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default memo(Dashboard);