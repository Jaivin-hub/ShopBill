import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingUp, IndianRupee, List, BarChart, CreditCard,
    Package, Loader, Truck, AlertTriangle, ShoppingCart, Users,
    Activity, Layers, Printer, ChevronRight, PieChart, Wallet, Calendar, ArrowRight, Check
} from 'lucide-react';
import SalesChart from './SalesChart';

// --- Constants ---
const DATE_FILTERS = [
    { id: '24h', label: '24 Hours', days: 1 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: 'all', label: 'All Time', days: Infinity },
    { id: 'custom', label: 'Custom', days: 0 },
];

const VIEW_TYPES = ['Day', 'Week', 'Month'];

// --- Utility Functions ---
const getLocalFormattedDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getTodayDateString = () => getLocalFormattedDate(new Date());
const getDateXDaysAgo = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    return getLocalFormattedDate(d);
};

const getFilterDateStrings = (filterId, startStr, endStr) => {
    const filter = DATE_FILTERS.find(f => f.id === filterId);
    if (filter && filter.days !== 0) {
        if (filter.days === Infinity) return { startDate: '', endDate: '' };
        return { startDate: getDateXDaysAgo(filter.days), endDate: getTodayDateString() };
    }
    if (filterId === 'custom' && startStr && endStr) {
        if (new Date(startStr).getTime() > new Date(endStr).getTime()) return { startDate: '', endDate: '' };
        return { startDate: startStr, endDate: endStr };
    }
    return getFilterDateStrings('7d', null, null);
};

const Reports = ({ apiClient, API, showToast, darkMode }) => {
    const [selectedFilter, setSelectedFilter] = useState('7d');
    const [viewType, setViewType] = useState('Day');
    const [chartYAxis, setChartYAxis] = useState('revenue');
    const [customStartDate, setCustomStartDate] = useState(getDateXDaysAgo(7));
    const [customEndDate, setCustomEndDate] = useState(getTodayDateString());
    const [summaryData, setSummaryData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [purchases, setPurchases] = useState([]);
    const [showAllBestSellers, setShowAllBestSellers] = useState(false);
    const [allBestSellers, setAllBestSellers] = useState([]);

    // Theme Variables
    const themeBase = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-slate-900';
    const cardBase = darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-slate-200 shadow-sm';
    const subCardBase = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200';
    const headerBase = darkMode ? 'bg-gray-950 border-gray-800/60' : 'bg-white border-slate-200 shadow-sm';

    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
        const queryParams = { ...(startDate && { startDate }), ...(endDate && { endDate }) };

        try {
            const [summaryResponse, chartResponse, suppliersRes, purchasesRes, allBestSellersRes] = await Promise.all([
                apiClient.get(API.reportsSummary, { params: queryParams }),
                apiClient.get(API.reportsChartData, { params: { ...queryParams, viewType: viewType } }),
                apiClient.get(API.scmSuppliers).catch(() => ({ data: [] })),
                apiClient.get(API.scmPurchases).catch(() => ({ data: [] })),
                apiClient.get(API.reportsSummary, { params: { ...queryParams, topItemsLimit: 100 } }) // Fetch all best sellers
            ]);

            setSummaryData(summaryResponse.data);
            setChartData(chartResponse.data);
            setSuppliers(suppliersRes.data);
            setPurchases(purchasesRes.data);
            setAllBestSellers(allBestSellersRes.data.topItems || []);
        } catch (error) {
            showToast({ message: "Failed to sync report data.", type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter, customStartDate, customEndDate, viewType, apiClient, API, showToast]);

    useEffect(() => { fetchReportData(); }, [fetchReportData]);

    const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

    const scmInsights = useMemo(() => {
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
        const filteredPurchases = purchases.filter(p => {
            if (!startDate || !endDate) return true;
            const purchaseDate = new Date(p.date || p.createdAt).toISOString().split('T')[0];
            return purchaseDate >= startDate && purchaseDate <= endDate;
        });

        const totalInvestment = filteredPurchases.reduce((acc, curr) => acc + (curr.purchasePrice * curr.quantity), 0);
        const supplierSpendMap = filteredPurchases.reduce((acc, curr) => {
            const sId = curr.supplierId?._id || 'unknown';
            const sName = curr.supplierId?.name || 'Unknown Vendor';
            if (!acc[sId]) acc[sId] = { name: sName, totalSpent: 0, orders: 0 };
            acc[sId].totalSpent += (curr.purchasePrice * curr.quantity);
            acc[sId].orders += 1;
            return acc;
        }, {});

        return {
            totalStockValue: totalInvestment,
            activeSuppliers: suppliers.length,
            filteredPurchaseCount: filteredPurchases.length,
            topSuppliers: Object.values(supplierSpendMap).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5)
        };
    }, [purchases, suppliers, selectedFilter, customStartDate, customEndDate]);

    const data = summaryData || {
        revenue: 0, billsRaised: 0, averageBillValue: 0, volume: 0,
        topItems: [], totalCreditOutstanding: 0, totalAllTimeBills: 0, totalAllTimeRevenue: 0,
    };

    return (
        <div className={`min-h-screen ${themeBase} transition-colors duration-200`}>
            {/* CLEAN PROFESSIONAL HEADER */}
            <header className={`sticky top-0 z-[100] ${headerBase} px-4 md:px-8 py-4 border-b backdrop-blur-md`}>
                <div className="max-w-7xl mx-auto space-y-3">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight flex items-center gap-2 `}>
                                Business <span className="text-indigo-500">Analytics</span>
                            </h1>
                            <p className="text-[10px] text-gray-500 font-bold tracking-widest  opacity-70">Store Intelligence Unit</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className={`flex overflow-x-auto no-scrollbar ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-slate-100 border-slate-200'} p-1 rounded-lg border flex-1 md:flex-none`}>
                                {DATE_FILTERS.map(filter => (
                                    <button 
                                        key={filter.id} 
                                        onClick={() => setSelectedFilter(filter.id)} 
                                        className={`px-3 py-1.5 rounded-md transition-all text-[10px] font-bold tracking-tight whitespace-nowrap ${selectedFilter === filter.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => window.print()} className={`p-2.5 ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-500 shadow-sm'} rounded-lg hover:text-indigo-500 transition-all`}>
                                <Printer className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* ULTRA COMPACT SINGLE ROW CUSTOM RANGE */}
                    {selectedFilter === 'custom' && (
                        <div className={`flex items-center gap-1.5 p-1.5 rounded-xl border animate-in fade-in slide-in-from-top-1 duration-300 ${darkMode ? 'bg-gray-900/60 border-gray-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="pl-1 hidden sm:block">
                                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            
                            <div className="flex items-center gap-1 flex-1">
                                <input 
                                    type="date" 
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className={`w-full text-[10px] font-black px-2 py-1.5 rounded-md border outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                />
                                <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                                <input 
                                    type="date" 
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className={`w-full text-[10px] font-black px-2 py-1.5 rounded-md border outline-none focus:ring-1 focus:ring-indigo-500 transition-all ${darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-slate-50 border-slate-200'}`}
                                />
                            </div>

                            {/* <button 
                                onClick={fetchReportData}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 px-3 rounded-lg transition-all active:scale-90 shadow-md shadow-indigo-500/20"
                                title="Apply Range"
                            >
                                <span className="hidden sm:inline text-[9px] font-black  tracking-widest">Apply</span>
                                <Check className="sm:hidden w-3.5 h-3.5" />
                            </button> */}
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
                {/* KPI DASHBOARD */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: "Net Revenue", value: formatCurrency(data.revenue), icon: IndianRupee, color: "text-emerald-500" },
                        { title: "Total Invoices", value: data.billsRaised, icon: List, color: "text-indigo-500" },
                        { title: "Avg Order Value", value: formatCurrency(data.averageBillValue), icon: Activity, color: "text-amber-500" },
                        { title: "Items Sold", value: data.volume, icon: Package, color: "text-sky-500" }
                    ].map((m, i) => (
                        <div key={i} className={`${cardBase} p-5 rounded-xl transition-all border-l-4 border-l-transparent hover:border-l-indigo-500`}>
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-[10px] font-bold text-gray-500  tracking-widest">{m.title}</p>
                                <m.icon className={`w-4 h-4 ${m.color}`} />
                            </div>
                            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                                {isLoading ? <span className="animate-pulse opacity-50">...</span> : m.value}
                            </h2>
                        </div>
                    ))}
                </section>

                {/* SALES PERFORMANCE CHART */}
                <section className={`${cardBase} rounded-xl overflow-hidden`}>
                    <div className={`p-6 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            <h3 className={`text-sm font-bold  tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'}`}>Sales Performance</h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className={`flex ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200 shadow-inner'} p-1 rounded-md border`}>
                                {['revenue', 'bills'].map(k => (
                                    <button key={k} onClick={() => setChartYAxis(k)} className={`px-4 py-1 text-[10px] font-bold  rounded transition-all ${chartYAxis === k ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{k}</button>
                                ))}
                            </div>
                            <div className={`flex ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-100 border-slate-200 shadow-inner'} p-1 rounded-md border`}>
                                {VIEW_TYPES.map(t => (
                                    <button key={t} onClick={() => setViewType(t)} className={`px-4 py-1 text-[10px] font-bold  rounded transition-all ${viewType === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 h-[300px] md:h-[350px] w-full">
                        {isLoading ? (
                            <div className="h-full w-full flex items-center justify-center"><Loader className="animate-spin text-indigo-500 w-6 h-6" /></div>
                        ) : (
                            <SalesChart data={chartData || []} viewType={viewType} yAxisKey={chartYAxis} darkMode={darkMode} />
                        )}
                    </div>
                </section>

                {/* SECONDARY INSIGHTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* PROCUREMENT INSIGHTS */}
                    <div className={`lg:col-span-2 ${cardBase} rounded-xl p-6`}>
                        <div className="flex items-center justify-between mb-8">
                            <h3 className={`text-sm font-bold  tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                                <Truck className="w-4 h-4 text-amber-500" />
                                Procurement & Inventory
                            </h3>
                            <span className="hidden sm:block text-[10px] font-bold text-gray-500 ">Recent Activity</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                { label: "Stock Invested", val: formatCurrency(scmInsights.totalStockValue), icon: Layers, color: "text-amber-500" },
                                { label: "Supply Chain", val: `${scmInsights.activeSuppliers} Vendors`, icon: Users, color: "text-teal-500" },
                                { label: "Procurements", val: scmInsights.filteredPurchaseCount, icon: ShoppingCart, color: "text-indigo-500" }
                            ].map((s, i) => (
                                <div key={i} className={`p-4 ${subCardBase} border rounded-lg`}>
                                    <p className="text-[9px] font-bold text-gray-500  tracking-widest mb-1">{s.label}</p>
                                    <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.val}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500  tracking-widest mb-4">Vendor Contribution</p>
                            {scmInsights.topSuppliers.length > 0 ? scmInsights.topSuppliers.map((sup, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-gray-950/50 border-gray-800/40' : 'bg-slate-50 border-slate-100'} rounded-lg border hover:border-indigo-500/50 transition-all`}>
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-bold text-gray-400 w-4">0{idx + 1}</div>
                                        <div>
                                            <p className={`text-xs font-bold  ${darkMode ? 'text-white' : 'text-slate-800'}`}>{sup.name}</p>
                                            <p className="text-[9px] text-gray-500 font-medium ">{sup.orders} Order Cycles</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(sup.totalSpent)}</p>
                                        <div className={`w-20 h-1 ${darkMode ? 'bg-gray-800' : 'bg-slate-200'} rounded-full mt-1.5 overflow-hidden`}>
                                            <div className="h-full bg-amber-500" style={{ width: `${(sup.totalSpent / Math.max(scmInsights.totalStockValue, 1)) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className={`text-center py-10 ${darkMode ? 'bg-gray-950/40' : 'bg-slate-100/50'} rounded-lg border border-dashed ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                                    <p className="text-[11px] font-medium text-gray-400">No procurement history for this period</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* TOP ITEMS */}
                        <div className={`${cardBase} rounded-xl p-6`}>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={`text-sm font-bold  tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'} flex items-center gap-2`}>
                                    <TrendingUp className="w-4 h-4 text-sky-500" />
                                    Best Sellers
                                </h3>
                                {allBestSellers.length > 5 && (
                                    <button
                                        onClick={() => setShowAllBestSellers(!showAllBestSellers)}
                                        className={`text-[10px] font-bold tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                                            darkMode 
                                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {showAllBestSellers ? 'Show Less' : `View All (${allBestSellers.length})`}
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                {(showAllBestSellers ? allBestSellers : data.topItems).map((item, idx) => (
                                    <div key={idx} className={`flex items-center justify-between p-3 ${darkMode ? 'bg-gray-950/80 border-gray-800/50' : 'bg-slate-50 border-slate-100 shadow-sm'} border rounded-lg`}>
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                            <span className={`text-[10px] font-bold text-slate-500 w-4 shrink-0`}>#{idx + 1}</span>
                                            <span className={`text-xs font-bold  truncate ${darkMode ? 'text-gray-300' : 'text-slate-700'}`}>{item.name}</span>
                                        </div>
                                        <span className="shrink-0 text-[10px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">{item.quantity} Unit{item.quantity !== 1 ? 's' : ''}</span>
                                    </div>
                                ))}
                                {showAllBestSellers && allBestSellers.length === 0 && (
                                    <div className={`text-center py-6 ${darkMode ? 'bg-gray-950/40' : 'bg-slate-100/50'} rounded-lg border border-dashed ${darkMode ? 'border-gray-800' : 'border-slate-200'}`}>
                                        <p className="text-[11px] font-medium text-gray-400">No products found</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* FINANCIAL STANDING */}
                        <div className={`${cardBase} rounded-xl p-6`}>
                            <h3 className={`text-sm font-bold  tracking-wider ${darkMode ? 'text-white' : 'text-slate-800'} mb-6 flex items-center gap-2`}>
                                <Wallet className="w-4 h-4 text-red-500" />
                                Liabilities & Equity
                            </h3>
                            <div className="space-y-4">
                                <div className={`p-4 ${darkMode ? 'bg-red-500/5 border-red-500/10' : 'bg-red-50/50 border-red-100 shadow-sm'} border rounded-lg group`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[9px] font-bold text-red-500  tracking-widest">Credit Outstanding</p>
                                        <AlertTriangle className="w-3 h-3 text-red-500 opacity-50 group-hover:opacity-100" />
                                    </div>
                                    <p className="text-xl font-bold text-red-500 tracking-tight">{formatCurrency(data.totalCreditOutstanding)}</p>
                                </div>
                                <div className={`p-4 ${darkMode ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-emerald-50/50 border-emerald-100 shadow-sm'} border rounded-lg`}>
                                    <p className="text-[9px] font-bold text-emerald-600  tracking-widest mb-1">Lifetime Revenue</p>
                                    <p className="text-xl font-bold text-emerald-600 tracking-tight">{formatCurrency(data.totalAllTimeRevenue)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default Reports;