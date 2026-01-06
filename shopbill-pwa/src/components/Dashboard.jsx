import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    IndianRupee, CreditCard, Users, Package, AlertTriangle,
    List, Loader, ArrowRight, TrendingUp, ShoppingBag, 
    Clock, Activity, ArrowUpRight, ShieldCheck, BarChart3
} from 'lucide-react';

const USER_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};

const Dashboard = ({ userRole, apiClient, API, showToast, onViewAllSales, onViewAllInventory, onViewAllCredit, onViewSaleDetails }) => {
    const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER;

    const [inventory, setInventory] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [invResponse, custResponse, salesResponse] = await Promise.all([
                apiClient.get(API.inventory),
                apiClient.get(API.customers),
                apiClient.get(API.sales),
            ]);

            setInventory(invResponse.data || []);
            setCustomers(custResponse.data || []);
            setSales(salesResponse.data || []);
        } catch (error) {
            showToast('Error syncing dashboard data.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API.inventory, API.customers, API.sales, showToast]);

    useEffect(() => {
        if (hasAccess) fetchDashboardData();
    }, [hasAccess, fetchDashboardData]);

    // --- DATA CALCULATIONS ---
    const today = useMemo(() => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const todaySales = sales.filter(s => new Date(s.timestamp) > startOfDay);
        const totalSales = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCreditGiven = todaySales
            .filter(s => s.paymentMethod === 'Credit' || s.paymentMethod === 'Mixed')
            .reduce((sum, sale) => sum + sale.amountCredited, 0);
        return { totalSales, totalCreditGiven };
    }, [sales]);

    const customersWithCredit = useMemo(() => customers.filter(cust => cust.outstandingCredit > 0), [customers]);
    const totalOutstandingCredit = useMemo(() => customers.reduce((sum, cust) => sum + (cust.outstandingCredit || 0), 0), [customers]);
    const topCreditHolders = useMemo(() => [...customersWithCredit].sort((a, b) => b.outstandingCredit - a.outstandingCredit).slice(0, 5), [customersWithCredit]);
    const allLowStockAlerts = useMemo(() => inventory.filter(item => (item.quantity || 0) <= (item.reorderLevel || 0)), [inventory]);
    const lowStockAlerts = useMemo(() => allLowStockAlerts.slice(0, 5), [allLowStockAlerts]);
    const recentSales = useMemo(() => [...sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5), [sales]);

    const formatTimeAgo = (timestamp) => {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return "Just now";
        let interval = seconds / 3600;
        if (interval > 1 && interval < 24) return Math.floor(interval) + "h ago";
        if (interval >= 24) return Math.floor(interval / 24) + "d ago";
        return Math.floor(seconds / 60) + "m ago";
    };

    const dashboardTitle = {
        [USER_ROLES.OWNER]: "OWNER",
        [USER_ROLES.MANAGER]: "MANAGER",
        [USER_ROLES.CASHIER]: "CASHIER",
    }[userRole] || "DASHBOARD";

    if (!hasAccess) {
        return (
            <main className="h-screen flex flex-col items-center justify-center bg-gray-950 p-8 text-center">
                <div className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/20 mb-6">
                    <ShieldCheck className="w-10 h-10 text-rose-500/50" />
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Access Restricted</h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-2">Administrative permissions required</p>
            </main>
        );
    }

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-6 h-6 animate-spin text-indigo-500" />
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em]">Synchronizing Analytics</span>
                </div>
            </div>
        );
    }

    return (
        <main className="min-h-screen flex flex-col bg-gray-950 text-gray-200">
            <style>{`
                .dashboard-scroll::-webkit-scrollbar { width: 4px; }
                .dashboard-scroll::-webkit-scrollbar-track { background: transparent; }
                .dashboard-scroll::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
            `}</style>

            {/* --- TOP NAVIGATION BAR --- */}
            <header className="sticky top-0 z-[100] bg-gray-950/90 backdrop-blur-md border-b border-gray-800/60 px-6 py-5">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-lg font-bold tracking-tight text-white uppercase leading-none">
                                {dashboardTitle} <span className="text-indigo-500">Terminal</span>
                            </h1>
                            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.25em] mt-1.5 flex items-center gap-1.5">
                                Operational Insights
                            </p>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- CONTENT WORKSPACE --- */}
            <div className="flex-1 overflow-y-auto dashboard-scroll px-6 py-8">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* CORE KPI CARDS */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {/* REVENUE */}
                        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <TrendingUp className="w-16 h-16 text-emerald-500" />
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Daily Gross Revenue</p>
                            <div className="flex items-end justify-between">
                                <h2 className="text-3xl font-bold text-white tabular-nums">₹{today.totalSales.toLocaleString('en-IN')}</h2>
                                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                    <IndianRupee className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* DAILY CREDIT */}
                        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-indigo-500/30 transition-all group relative overflow-hidden">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Credit Issued (Today)</p>
                            <div className="flex items-end justify-between">
                                <h2 className="text-3xl font-bold text-white tabular-nums">₹{today.totalCreditGiven.toLocaleString('en-IN')}</h2>
                                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                    <CreditCard className="w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {/* TOTAL DEBT */}
                        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 hover:border-rose-500/30 transition-all group relative overflow-hidden">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Total Accounts Receivable</p>
                            <div className="flex items-end justify-between">
                                <h2 className="text-3xl font-bold text-rose-500 tabular-nums">₹{totalOutstandingCredit.toLocaleString('en-IN')}</h2>
                                <div className="p-2 bg-rose-500/10 text-rose-500 rounded-lg">
                                    <Users className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECONDARY ANALYTICS GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* STOCK STATUS */}
                        <section className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/30">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Package className="w-4 h-4 text-amber-500" /> Inventory Health
                                </h3>
                                <button onClick={onViewAllInventory} className="text-[10px] font-bold text-indigo-500 hover:text-white transition-colors flex items-center gap-1">
                                    VIEW CATALOG <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="p-6 space-y-3.5 flex-grow">
                                {lowStockAlerts.length > 0 ? (
                                    lowStockAlerts.map(item => (
                                        <div key={item._id} className="flex items-center justify-between p-3.5 bg-gray-950/40 border border-gray-800/60 rounded-xl">
                                            <div className="max-w-[140px]">
                                                <p className="text-[11px] font-bold text-gray-200 uppercase truncate">{item.name}</p>
                                                <p className="text-[9px] font-bold text-rose-500 uppercase mt-1 tracking-tighter">Below Threshold</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white">{item.quantity} <span className="text-[10px] text-gray-600">UNITS</span></p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-center opacity-40">
                                        <Package className="w-8 h-8 mb-2" />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">Inventory Levels Optimal</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* TOP DEBTORS */}
                        <section className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/30">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" /> Pending Recoveries
                                </h3>
                                <button onClick={onViewAllCredit} className="text-[10px] font-bold text-indigo-500 hover:text-white transition-colors flex items-center gap-1">
                                    KHATA LEDGER <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="px-6 py-2 flex-grow">
                                {topCreditHolders.length > 0 ? (
                                    topCreditHolders.map((cust, idx) => (
                                        <div key={cust._id} className={`py-4 flex items-center justify-between ${idx !== topCreditHolders.length - 1 ? 'border-b border-gray-800/50' : ''}`}>
                                            <div>
                                                <p className="text-[11px] font-bold text-white uppercase">{cust.name}</p>
                                                <p className="text-[9px] font-bold text-gray-600 uppercase mt-0.5">Account Active</p>
                                            </div>
                                            <p className={`text-sm font-bold tabular-nums ${cust.outstandingCredit > 2000 ? 'text-rose-500' : 'text-amber-500'}`}>
                                                ₹{cust.outstandingCredit.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-center opacity-40">
                                        <Users className="w-8 h-8 mb-2" />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">No Active Receivables</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* RECENT SALES */}
                        <section className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                            <div className="px-6 py-5 border-b border-gray-800/50 flex justify-between items-center bg-gray-900/30">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <List className="w-4 h-4 text-emerald-500" /> Activity Stream
                                </h3>
                                <button onClick={onViewAllSales} className="text-[10px] font-bold text-indigo-500 hover:text-white transition-colors flex items-center gap-1">
                                    HISTORY <ArrowUpRight className="w-3 h-3" />
                                </button>
                            </div>
                            <div className="p-6 space-y-5 flex-grow">
                                {recentSales.length > 0 ? (
                                    recentSales.map((sale) => (
                                        <div key={sale._id} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <p className="text-[11px] font-bold text-white tabular-nums">₹{sale.totalAmount.toLocaleString('en-IN')}</p>
                                                    <p className="text-[9px] font-bold text-gray-600 uppercase mt-0.5">{formatTimeAgo(sale.timestamp)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-tighter ${
                                                    sale.paymentMethod === 'Credit' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                    'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                                }`}>
                                                    {sale.paymentMethod}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-center opacity-40">
                                        <Activity className="w-8 h-8 mb-2" />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">No Recent Activity</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Dashboard;