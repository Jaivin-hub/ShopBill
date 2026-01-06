import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingUp, IndianRupee, List, BarChart, CreditCard,
    Package, Loader, Truck, AlertTriangle, ShoppingCart, Users,
    Activity, Layers, Printer, ChevronRight, PieChart, Wallet
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

const Reports = ({ apiClient, API, showToast }) => {
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

    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
        const queryParams = { ...(startDate && { startDate }), ...(endDate && { endDate }) };

        try {
            const [summaryResponse, chartResponse, suppliersRes, purchasesRes] = await Promise.all([
                apiClient.get(API.reportsSummary, { params: queryParams }),
                apiClient.get(API.reportsChartData, { params: { ...queryParams, viewType: viewType } }),
                apiClient.get(API.scmSuppliers).catch(() => ({ data: [] })),
                apiClient.get(API.scmPurchases).catch(() => ({ data: [] }))
            ]);

            setSummaryData(summaryResponse.data);
            setChartData(chartResponse.data);
            setSuppliers(suppliersRes.data);
            setPurchases(purchasesRes.data);
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
        <div className="min-h-screen bg-gray-950 text-gray-200">
            {/* CLEAN PROFESSIONAL HEADER */}
            <header className="sticky top-0 z-[100] bg-gray-950 border-b border-gray-800/60 px-4 md:px-8 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 uppercase">
                            Business <span className="text-indigo-500">Analytics</span>
                        </h1>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Comprehensive store performance data</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
                            {DATE_FILTERS.map(filter => (
                                <button 
                                    key={filter.id} 
                                    onClick={() => setSelectedFilter(filter.id)} 
                                    className={`px-3 py-1.5 rounded-md transition-all text-[10px] font-bold uppercase tracking-tight ${selectedFilter === filter.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => window.print()} className="p-2.5 bg-gray-900 border border-gray-800 text-gray-400 rounded-lg hover:text-white transition-all">
                            <Printer className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 pb-20">
                {/* KPI DASHBOARD */}
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { title: "Net Revenue", value: formatCurrency(data.revenue), icon: IndianRupee, color: "text-emerald-400" },
                        { title: "Total Invoices", value: data.billsRaised, icon: List, color: "text-indigo-400" },
                        { title: "Avg Order Value", value: formatCurrency(data.averageBillValue), icon: Activity, color: "text-amber-400" },
                        { title: "Items Sold", value: data.volume, icon: Package, color: "text-sky-400" }
                    ].map((m, i) => (
                        <div key={i} className="bg-gray-900/50 border border-gray-800 p-5 rounded-xl hover:bg-gray-900 transition-all border-l-4 border-l-transparent hover:border-l-indigo-500">
                            <div className="flex justify-between items-start mb-3">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{m.title}</p>
                                <m.icon className={`w-4 h-4 ${m.color}`} />
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {isLoading ? <span className="animate-pulse opacity-50">...</span> : m.value}
                            </h2>
                        </div>
                    ))}
                </section>

                {/* SALES PERFORMANCE CHART */}
                <section className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Sales Performance</h3>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex bg-gray-950 p-1 rounded-md border border-gray-800">
                                {['revenue', 'bills'].map(k => (
                                    <button key={k} onClick={() => setChartYAxis(k)} className={`px-4 py-1 text-[10px] font-bold uppercase rounded transition-all ${chartYAxis === k ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>{k}</button>
                                ))}
                            </div>
                            <div className="flex bg-gray-950 p-1 rounded-md border border-gray-800">
                                {VIEW_TYPES.map(t => (
                                    <button key={t} onClick={() => setViewType(t)} className={`px-4 py-1 text-[10px] font-bold uppercase rounded transition-all ${viewType === t ? 'bg-indigo-600 text-white' : 'text-gray-600'}`}>{t}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 h-[350px] w-full">
                        {isLoading ? (
                            <div className="h-full w-full flex items-center justify-center"><Loader className="animate-spin text-indigo-500 w-6 h-6" /></div>
                        ) : (
                            <SalesChart data={chartData || []} viewType={viewType} yAxisKey={chartYAxis} />
                        )}
                    </div>
                </section>

                {/* SECONDARY INSIGHTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* PROCUREMENT INSIGHTS */}
                    <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                                <Truck className="w-4 h-4 text-amber-500" />
                                Procurement & Inventory
                            </h3>
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Recent Activity</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                            {[
                                { label: "Stock Invested", val: formatCurrency(scmInsights.totalStockValue), icon: Layers, color: "text-amber-500" },
                                { label: "Supply Chain", val: `${scmInsights.activeSuppliers} Vendors`, icon: Users, color: "text-teal-500" },
                                { label: "Procurements", val: scmInsights.filteredPurchaseCount, icon: ShoppingCart, color: "text-indigo-500" }
                            ].map((s, i) => (
                                <div key={i} className="p-4 bg-gray-950 border border-gray-800 rounded-lg">
                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                                    <p className="text-lg font-bold text-white">{s.val}</p>
                                </div>
                            ))}
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Vendor Contribution</p>
                            {scmInsights.topSuppliers.length > 0 ? scmInsights.topSuppliers.map((sup, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-gray-950/50 rounded-lg border border-gray-800/40 hover:border-gray-700 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="text-[10px] font-bold text-gray-600 w-4">0{idx + 1}</div>
                                        <div>
                                            <p className="text-xs font-bold text-white uppercase">{sup.name}</p>
                                            <p className="text-[9px] text-gray-500 font-medium uppercase">{sup.orders} Order Cycles</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white">{formatCurrency(sup.totalSpent)}</p>
                                        <div className="w-20 h-1 bg-gray-800 rounded-full mt-1.5 overflow-hidden">
                                            <div className="h-full bg-amber-500" style={{ width: `${(sup.totalSpent / scmInsights.totalStockValue) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-10 bg-gray-950/40 rounded-lg border border-dashed border-gray-800">
                                    <p className="text-[11px] font-medium text-gray-600 uppercase italic">No procurement history for this period</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {/* TOP ITEMS */}
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-sky-400" />
                                Best Sellers
                            </h3>
                            <div className="space-y-2">
                                {data.topItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-950/80 border border-gray-800/50 rounded-lg">
                                        <span className="text-xs font-bold text-gray-300 uppercase truncate pr-4">{item.name}</span>
                                        <span className="shrink-0 text-[10px] font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">{item.quantity} Unit</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* FINANCIAL STANDING */}
                        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-red-500" />
                                Liabilities & Equity
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-lg group">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Credit Outstanding</p>
                                        <AlertTriangle className="w-3 h-3 text-red-500 opacity-50 group-hover:opacity-100" />
                                    </div>
                                    <p className="text-xl font-bold text-red-500 tracking-tight">{formatCurrency(data.totalCreditOutstanding)}</p>
                                </div>
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Lifetime Revenue</p>
                                    <p className="text-xl font-bold text-emerald-400 tracking-tight">{formatCurrency(data.totalAllTimeRevenue)}</p>
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