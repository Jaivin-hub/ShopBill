import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, IndianRupee, List, BarChart, CreditCard, Package, Loader, Truck, AlertTriangle, ShoppingCart, Users, Activity, Layers } from 'lucide-react';
import SalesChart from './SalesChart';

// --- Constants ---
const DATE_FILTERS = [
    { id: '24h', label: '24 Hrs', days: 1 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: 'all', label: 'All Time', days: Infinity },
    { id: 'custom', label: 'Custom Range', days: 0 },
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

    // SCM Specific States
    const [suppliers, setSuppliers] = useState([]);
    const [purchases, setPurchases] = useState([]);

    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
        const queryParams = { ...(startDate && { startDate }), ...(endDate && { endDate }) };

        try {
            // Fetch Sales Data
            const summaryResponse = await apiClient.get(API.reportsSummary, { params: queryParams });
            setSummaryData(summaryResponse.data);
            
            const chartResponse = await apiClient.get(API.reportsChartData, {
                params: { ...queryParams, viewType: viewType }
            });
            setChartData(chartResponse.data);

            // Fetch SCM Data - Note: We fetch all and filter locally to ensure consistency with UI filters
            const [suppliersRes, purchasesRes] = await Promise.all([
                apiClient.get(API.scmSuppliers),
                apiClient.get(API.scmPurchases)
            ]);
            setSuppliers(suppliersRes.data);
            setPurchases(purchasesRes.data);

        } catch (error) {
            console.error("Failed to fetch report data:", error.response?.data || error.message);
            if (error.response?.status === 401 || error.message.includes('token')) {
                showToast({ message: "Authentication expired. Please log in again.", type: 'error' });
            } else {
                showToast({ message: "Failed to load reports.", type: 'error' });
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter, customStartDate, customEndDate, viewType, showToast, apiClient, API]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const formatCurrency = (amount) => {
        const numericAmount = typeof amount === 'number' ? amount : 0;
        return `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    // --- Dynamic Filtering Logic for SCM ---
    const scmInsights = useMemo(() => {
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
        
        // Filter purchases based on the active report date range
        const filteredPurchases = purchases.filter(p => {
            if (!startDate || !endDate) return true; // 'All Time'
            const purchaseDate = new Date(p.date || p.createdAt).toISOString().split('T')[0];
            return purchaseDate >= startDate && purchaseDate <= endDate;
        });

        const totalInvestment = filteredPurchases.reduce((acc, curr) => acc + (curr.purchasePrice * curr.quantity), 0);
        
        // Group spend by supplier within the filtered range
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

    const MetricCard = ({ title, value, icon: Icon, colorClass, description }) => (
        <article className={`p-4 rounded-xl shadow-lg border-b-4 ${colorClass} bg-gray-900 border border-gray-800`}>
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h2>
                    {isLoading ? (
                        <div className="h-6 w-20 bg-gray-800 rounded animate-pulse mt-1"></div>
                    ) : (
                        <p className="text-xl md:text-2xl font-black text-white mt-1">
                            {value}
                        </p>
                    )}
                </div>
                <Icon aria-hidden="true" className={`w-6 h-6 md:w-8 h-8 ${colorClass.replace('border-b-4', 'text')}`} />
            </div>
            {description && <p className="text-[10px] md:text-xs text-gray-500 mt-2 font-medium">{description}</p>}
        </article>
    );

    const getCurrentFilterLabel = () => {
        if (selectedFilter === 'custom') return `${customStartDate} to ${customEndDate}`;
        return DATE_FILTERS.find(f => f.id === selectedFilter)?.label || 'Loading...';
    };

    const data = summaryData || {
        revenue: 0, billsRaised: 0, averageBillValue: 0, volume: 0,
        topItems: [], totalCreditOutstanding: 0, totalAllTimeBills: 0, totalAllTimeRevenue: 0,
    };

    const chartDataToRender = chartData || [];

    return (
        <main className="h-screen w-full flex flex-col bg-gray-950 overflow-hidden font-sans antialiased text-gray-100">
            <style jsx global>{`
                .font-sans { font-family: 'Inter', sans-serif; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            <header className="flex-shrink-0 p-4 md:p-8 pb-4 border-b border-gray-800 bg-gray-950">
                <h1 className="text-3xl font-extrabold text-white">Business Reports</h1>
                <p className="text-sm text-gray-400 mb-4 tracking-wide">
                    Analyzing: <span className="font-bold text-teal-400">{getCurrentFilterLabel()}</span>
                </p>

                <nav className="space-y-4">
                    <div className="overflow-x-auto no-scrollbar py-1">
                        <div className="inline-flex space-x-2 p-1 bg-gray-900 rounded-xl border border-gray-800">
                            {DATE_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${selectedFilter === filter.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                                    disabled={isLoading}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {selectedFilter === 'custom' && (
                        <div className="flex gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800">
                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="flex-1 p-2 text-xs border border-gray-700 rounded-lg bg-gray-800 text-white outline-none" />
                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="flex-1 p-2 text-xs border border-gray-700 rounded-lg bg-gray-800 text-white outline-none" />
                        </div>
                    )}
                </nav>
            </header>

            <div className="flex-grow overflow-y-auto p-4 md:p-8 pt-6 pb-32 custom-scrollbar">
                <div className="max-w-7xl mx-auto">
                    {/* Primary Sales KPI Section */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                        <MetricCard title="Total Revenue" value={formatCurrency(data.revenue)} icon={IndianRupee} colorClass="border-b-indigo-500 text-indigo-400" description="Generated from bills" />
                        <MetricCard title="Bills Raised" value={data.billsRaised.toLocaleString()} icon={List} colorClass="border-b-emerald-500 text-emerald-400" description="Total sales bills" />
                        <MetricCard title="Avg. Bill Value" value={formatCurrency(data.averageBillValue)} icon={IndianRupee} colorClass="border-b-amber-500 text-amber-400" description="Revenue / Bills" />
                        <MetricCard title="Items Volume" value={data.volume.toLocaleString()} icon={Package} colorClass="border-b-sky-500 text-sky-400" description="Total units sold" />
                    </section>

                    {/* Sales Trend Chart */}
                    <section className="bg-gray-900 p-4 md:p-6 rounded-xl shadow-2xl border border-gray-800 mb-8">
                        <h3 className="text-xl font-bold flex items-center text-gray-100 mb-4 border-b border-gray-800 pb-3">
                            <BarChart className="w-5 h-5 mr-2 text-indigo-400" /> Trend Analysis
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="inline-flex rounded-full shadow-inner bg-gray-800 p-1">
                                {['revenue', 'bills'].map(key => (
                                    <button key={key} onClick={() => setChartYAxis(key)} className={`flex-1 px-3 py-2 text-xs font-bold rounded-full transition uppercase ${chartYAxis === key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>{key}</button>
                                ))}
                            </div>
                            <div className="inline-flex rounded-full shadow-inner bg-gray-800 p-1">
                                {VIEW_TYPES.map(type => (
                                    <button key={type} onClick={() => setViewType(type)} className={`flex-1 px-3 py-2 text-xs font-bold rounded-full transition ${viewType === type ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}>{type}</button>
                                ))}
                            </div>
                        </div>
                        {isLoading ? <div className="h-64 flex items-center justify-center"><Loader className="animate-spin text-emerald-400" /></div> : <div className="bg-gray-950/30 p-2 rounded-lg"><SalesChart data={chartDataToRender} viewType={viewType} yAxisKey={chartYAxis} /></div>}
                    </section>

                    {/* Supply Chain Insights - Filtered */}
                    <section className="bg-gray-900 p-4 md:p-6 rounded-xl shadow-2xl border border-gray-800 mb-8">
                         <h3 className="text-xl font-bold flex items-center text-gray-100 mb-6 border-b border-gray-800 pb-3">
                            <Truck className="w-5 h-5 mr-2 text-amber-500" /> Supply Chain Insights
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-4 p-4 bg-gray-950/40 rounded-xl border border-gray-800/60">
                                <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                                    <Layers className="w-6 h-6 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Procurement ({selectedFilter})</p>
                                    <p className="text-xl font-black text-white">{formatCurrency(scmInsights.totalStockValue)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-950/40 rounded-xl border border-gray-800/60">
                                <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                                    <Users className="w-6 h-6 text-teal-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Vendors</p>
                                    <p className="text-xl font-black text-white">{scmInsights.activeSuppliers}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-gray-950/40 rounded-xl border border-gray-800/60">
                                <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                    <Activity className="w-6 h-6 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Orders in Period</p>
                                    <p className="text-xl font-black text-white">{scmInsights.filteredPurchaseCount}</p>
                                </div>
                            </div>
                         </div>
                    </section>

                    {/* Vendor Analysis & Financial Health Grid */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-2xl">
                            <h3 className="text-lg font-bold flex items-center text-gray-100 mb-6">
                                <ShoppingCart className="w-5 h-5 mr-2 text-indigo-400" /> Vendor Spend Analysis
                            </h3>
                            <div className="space-y-3">
                                {scmInsights.topSuppliers.length > 0 ? scmInsights.topSuppliers.map((sup, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-950/40 rounded-xl border border-gray-800/60 hover:bg-gray-950/80 transition-all duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-800">{idx + 1}</div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-200">{sup.name}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{sup.orders} Purchases</p>
                                            </div>
                                        </div>
                                        <p className="text-sm font-black text-indigo-400">{formatCurrency(sup.totalSpent)}</p>
                                    </div>
                                )) : <div className="text-center py-12 border-2 border-dashed border-gray-800 rounded-xl">
                                        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">No Activity for this Period</p>
                                     </div>}
                            </div>
                        </div>

                        <aside className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-2xl">
                            <h3 className="text-lg font-bold flex items-center text-gray-200 mb-6">
                                <CreditCard className="w-5 h-5 mr-2 text-red-400" /> Financial Health Summary
                            </h3>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center p-4 bg-red-500/5 rounded-xl border border-red-500/10 mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">Total Khata Due</span>
                                    <span className="font-black text-xl text-red-500">{formatCurrency(data.totalCreditOutstanding)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 mb-3">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">All Time Revenue</span>
                                    <span className="font-black text-xl text-emerald-400">{formatCurrency(data.totalAllTimeRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tight">All Time Bills</span>
                                    <span className="font-black text-xl text-indigo-400">{data.totalAllTimeBills.toLocaleString()}</span>
                                </div>
                            </div>
                        </aside>
                    </section>

                    {/* Best Performing Products */}
                    <section className="bg-gray-900 p-5 md:p-6 rounded-2xl border border-gray-800 shadow-2xl">
                        <h3 className="text-lg font-bold flex items-center text-gray-200 mb-6 border-b border-gray-800 pb-3">
                            <Package className="w-5 h-5 mr-2 text-sky-400" /> Top Selling Products
                        </h3>
                        {isLoading ? <div className="h-24 animate-pulse bg-gray-800 rounded-xl"></div> : data.topItems.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.topItems.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between p-4 bg-gray-950/50 rounded-xl border border-gray-800 hover:border-sky-500/30 transition-all">
                                        <div className="flex items-center">
                                            <span className="w-7 h-7 rounded-lg bg-sky-900/50 text-sky-400 text-[10px] font-black mr-3 flex items-center justify-center border border-sky-500/20">{index + 1}</span>
                                            <span className="text-sm font-bold text-gray-300">{item.name}</span>
                                        </div>
                                        <span className="font-black text-sm text-sky-400">{item.quantity} Units</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-center text-gray-600 py-10 text-xs font-bold uppercase">No data for this period.</p>}
                    </section>
                </div>
            </div>
        </main>
    );
};

export default Reports;