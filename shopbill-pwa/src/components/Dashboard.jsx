import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    IndianRupee, CreditCard, Users, Package,
    List, Loader2, TrendingUp, Clock, Activity, 
    ShieldCheck, RefreshCw, PlusCircle, ShoppingCart, 
    ChevronRight, Inbox, Sparkles
} from 'lucide-react';

const USER_ROLES = { OWNER: 'owner', MANAGER: 'manager', CASHIER: 'cashier' };

const Dashboard = ({ darkMode, userRole, currentUser, apiClient, API, showToast, onViewAllSales, onViewAllInventory, onViewAllCredit, setCurrentPage }) => {
    const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER;
    const [inventory, setInventory] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [sales, setSales] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [invResponse, custResponse, salesResponse] = await Promise.all([
                apiClient.get(API.inventory), apiClient.get(API.customers), apiClient.get(API.sales),
            ]);
            setInventory(invResponse.data || []);
            setCustomers(custResponse.data || []);
            setSales(salesResponse.data || []);
        } catch (error) {
            showToast('Could not update data. Please check connection.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, API, showToast]);

    useEffect(() => { if (hasAccess) fetchDashboardData(); }, [hasAccess, fetchDashboardData]);

    // --- DYNAMIC CAPTIONS LOGIC ---
    const getWelcomeContent = () => {
        const name = currentUser?.name || 'User';
        switch (userRole) {
            case USER_ROLES.OWNER:
                return {
                    title: `Owner's`,
                    desc: `Hello ${name}, here’s how your business is performing today.`
                };
            case USER_ROLES.MANAGER:
                return {
                    title: `Manager`,
                    desc: `Ready to optimize? Monitor inventory levels and oversee daily operations from here.`
                };
            case USER_ROLES.CASHIER:
                return {
                    title: `Cashier`,
                    desc: `Track your personal sales performance and manage active customer credit.`
                };
            default:
                return {
                    title: `Business`,
                    desc: `Monitor your daily activities and manage your shop efficiently.`
                };
        }
    };

    const welcome = getWelcomeContent();

    const today = useMemo(() => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const todaySales = sales.filter(s => new Date(s.timestamp) > start);
        return {
            totalSales: todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0),
            totalCredit: todaySales.filter(s => s.paymentMethod !== 'Cash').reduce((sum, sale) => sum + (sale.amountCredited || 0), 0)
        };
    }, [sales]);

    const totalOwed = useMemo(() => customers.reduce((sum, c) => sum + (c.outstandingCredit || 0), 0), [customers]);
    const topDebtors = useMemo(() => [...customers].filter(c => c.outstandingCredit > 0).sort((a,b) => b.outstandingCredit - a.outstandingCredit).slice(0, 5), [customers]);
    const lowStock = useMemo(() => inventory.filter(i => (i.quantity || 0) <= (i.reorderLevel || 0)).slice(0, 5), [inventory]);
    const recentSales = useMemo(() => [...sales].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5), [sales]);

    const formatTime = (ts) => {
        const mins = Math.floor((new Date() - new Date(ts)) / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
        return `${Math.floor(mins/1440)}d ago`;
    };

    const themeBase = darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm';
    const subText = darkMode ? 'text-slate-400' : 'text-slate-500';

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
            <h2 className="text-lg font-bold">Manager Access Only</h2>
        </div>
    );

    if (isLoading) return (
        <div className={`h-screen flex flex-col items-center justify-center ${themeBase}`}>
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs font-medium opacity-50">Updating your business data...</p>
        </div>
    );

    return (
        <main className={`min-h-screen pt-2 pb-24 px-6 ${themeBase}`}>
            <div className="max-w-7xl mx-auto space-y-8">
                
                {/* DYNAMIC WELCOME HERO */}
                <header className={`sticky top-0 z-[100]  space-y-1 ${themeBase}`}>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-black tracking-tight">{welcome.title} <span className="text-indigo-500">Dashboard</span></h1>
                    </div>
                    <p className={`text-sm font-medium leading-relaxed max-w-2xl ${subText}`}>
                        {welcome.desc}
                    </p>
                </header>

                {/* COMPACT KPI SECTION */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${cardBase}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Sales Today</p>
                            <h2 className="text-2xl font-black">₹{today.totalSales.toLocaleString('en-IN')}</h2>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl"><TrendingUp className="text-emerald-500 w-6 h-6" /></div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${cardBase}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Credit Issued</p>
                            <h2 className="text-2xl font-black">₹{today.totalCredit.toLocaleString('en-IN')}</h2>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl"><CreditCard className="text-blue-500 w-6 h-6" /></div>
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${cardBase}`}>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Ledger</p>
                            <h2 className={`text-2xl font-black ${totalOwed > 0 ? 'text-rose-500' : ''}`}>₹{totalOwed.toLocaleString('en-IN')}</h2>
                        </div>
                        <div className="p-3 bg-rose-500/10 rounded-xl"><Users className="text-rose-500 w-6 h-6" /></div>
                    </div>
                </section>

                {/* QUICK ACTIONS BAR */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => setCurrentPage('billing')} className={`p-3 rounded-2xl border flex items-center gap-3 hover:scale-[1.03] active:scale-95 transition-all ${cardBase}`}>
                        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-500/20"><PlusCircle size={18}/></div>
                        <span className="text-xs font-black uppercase tracking-tight">New Bill</span>
                    </button>
                    <button onClick={() => setCurrentPage('inventory')} className={`p-3 rounded-2xl border flex items-center gap-3 hover:scale-[1.03] active:scale-95 transition-all ${cardBase}`}>
                        <div className="bg-amber-500 p-2 rounded-xl text-white shadow-lg shadow-amber-500/20"><Package size={18}/></div>
                        <span className="text-xs font-black uppercase tracking-tight">Add Stock</span>
                    </button>
                    <button onClick={() => setCurrentPage('khata')} className={`p-3 rounded-2xl border flex items-center gap-3 hover:scale-[1.03] active:scale-95 transition-all ${cardBase}`}>
                        <div className="bg-blue-500 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20"><Users size={18}/></div>
                        <span className="text-xs font-black uppercase tracking-tight">Ledger</span>
                    </button>
                    <button onClick={fetchDashboardData} className={`p-3 rounded-2xl border flex items-center gap-3 hover:scale-[1.03] active:scale-95 transition-all ${cardBase}`}>
                        <div className="bg-slate-600 p-2 rounded-xl text-white shadow-lg shadow-slate-500/20"><RefreshCw size={18}/></div>
                        <span className="text-xs font-black uppercase tracking-tight">Sync</span>
                    </button>
                </div>

                {/* MAIN CONTENT GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Low Stock Section */}
                    <div className={`rounded-3xl border flex flex-col overflow-hidden transition-all ${cardBase}`}>
                        <div className="px-6 py-5 border-b border-inherit flex justify-between items-center bg-slate-500/5">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] flex items-center gap-2"><Package size={16} className="text-amber-500"/> Low Stock</h3>
                            {lowStock.length > 0 && <button onClick={onViewAllInventory} className="text-[10px] font-bold text-indigo-500">MANAGE</button>}
                        </div>
                        <div className="flex-1 min-h-[220px]">
                            {lowStock.length > 0 ? (
                                <div className="p-5 space-y-3">
                                    {lowStock.map(item => (
                                        <div key={item._id} className="flex justify-between items-center group p-2 hover:bg-slate-500/5 rounded-lg transition-colors">
                                            <span className="text-sm font-semibold">{item.name}</span>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded ${darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>{item.quantity} Left</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={Package} title="Fully Stocked" message="Every item is ready on the shelves." actionText="Inventory" onAction={() => setCurrentPage('inventory')} />
                            )}
                        </div>
                    </div>

                    {/* Customer Credit Section */}
                    <div className={`rounded-3xl border flex flex-col overflow-hidden transition-all ${cardBase}`}>
                        <div className="px-6 py-5 border-b border-inherit flex justify-between items-center bg-slate-500/5">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] flex items-center gap-2"><Clock size={16} className="text-blue-500"/> Recovery</h3>
                            {topDebtors.length > 0 && <button onClick={onViewAllCredit} className="text-[10px] font-bold text-indigo-500">LEDGER</button>}
                        </div>
                        <div className="flex-1 min-h-[220px]">
                            {topDebtors.length > 0 ? (
                                <div className="p-5 space-y-3">
                                    {topDebtors.map(c => (
                                        <div key={c._id} className="flex justify-between items-center group p-2 hover:bg-slate-500/5 rounded-lg transition-colors">
                                            <span className="text-sm font-semibold">{c.name}</span>
                                            <span className="text-sm font-black">₹{c.outstandingCredit.toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={Users} title="All Clear" message="No pending dues at the moment." actionText="Open Ledger" onAction={() => setCurrentPage('khata')} />
                            )}
                        </div>
                    </div>

                    {/* Recent Sales Section */}
                    <div className={`rounded-3xl border flex flex-col overflow-hidden transition-all ${cardBase}`}>
                        <div className="px-6 py-5 border-b border-inherit flex justify-between items-center bg-slate-500/5">
                            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] flex items-center gap-2"><Activity size={16} className="text-emerald-500"/> Activities</h3>
                            {recentSales.length > 0 && <button onClick={onViewAllSales} className="text-[10px] font-bold text-indigo-500">HISTORY</button>}
                        </div>
                        <div className="flex-1 min-h-[220px]">
                            {recentSales.length > 0 ? (
                                <div className="p-5 space-y-4">
                                    {recentSales.map(sale => (
                                        <div key={sale._id} className="flex justify-between items-center group p-2 hover:bg-slate-500/5 rounded-lg transition-colors">
                                            <div>
                                                <p className="text-sm font-black">₹{sale.totalAmount.toLocaleString('en-IN')}</p>
                                                <p className="text-[10px] opacity-50 font-bold uppercase tracking-tighter">{formatTime(sale.timestamp)}</p>
                                            </div>
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                                sale.paymentMethod === 'Cash' 
                                                ? (darkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-100') 
                                                : (darkMode ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-blue-50 text-blue-600 border-blue-100')
                                            }`}>
                                                {sale.paymentMethod.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState icon={ShoppingCart} title="Awaiting Sales" message="Open the bill counter to start selling." actionText="Open POS" onAction={() => setCurrentPage('billing')} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Dashboard;