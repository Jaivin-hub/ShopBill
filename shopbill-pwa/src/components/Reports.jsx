import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, IndianRupee, List, BarChart, CreditCard, Package, Loader } from 'lucide-react';
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

    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
        const queryParams = { ...(startDate && { startDate }), ...(endDate && { endDate }) };

        try {
            const summaryResponse = await apiClient.get(API.reportsSummary, { params: queryParams });
            setSummaryData(summaryResponse.data);
            const chartResponse = await apiClient.get(API.reportsChartData, {
                params: { ...queryParams, viewType: viewType }
            });
            setChartData(chartResponse.data);
        } catch (error) {
            console.error("Failed to fetch report data:", error.response?.data || error.message);
            if (error.response?.status === 401 || error.message.includes('token')) {
                showToast({ message: "Authentication expired. Please log in again.", type: 'error' });
            } else {
                showToast({ message: "Failed to load reports.", type: 'error' });
            }
            setSummaryData(null);
            setChartData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter, customStartDate, customEndDate, viewType, showToast, apiClient, API.reportsSummary, API.reportsChartData]);

    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);

    const formatCurrency = (amount) => {
        const numericAmount = typeof amount === 'number' ? amount : 0;
        return `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const MetricCard = ({ title, value, icon: Icon, colorClass, description }) => (
        <div className={`p-4 rounded-xl shadow-lg border-b-4 ${colorClass} bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">{title}</p>
                    {isLoading ? (
                        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                    ) : (
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mt-1">
                            {value}
                        </h2>
                    )}
                </div>
                <Icon className={`w-6 h-6 md:w-8 h-8 ${colorClass.replace('border-b-4', 'text')}`} />
            </div>
            {description && <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-500 mt-2">{description}</p>}
        </div>
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
        <div className="h-screen w-full flex flex-col bg-white dark:bg-gray-950 overflow-hidden font-sans antialiased">
            <style jsx global>{`
                .font-sans { font-family: 'Inter', sans-serif; }
                /* Hide scrollbar for the filter list */
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Header Block (Fixed) */}
            <div className="flex-shrink-0 p-4 md:p-8 pb-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
                <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-1">
                    Business Reports
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Analyzing: <span className="font-semibold text-teal-500">{getCurrentFilterLabel()}</span></p>

                <div className="space-y-4">
                    <div className="overflow-x-auto no-scrollbar py-1">
                        <div className="inline-flex space-x-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                            {DATE_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all ${selectedFilter === filter.id
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }`}
                                    disabled={isLoading}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedFilter === 'custom' && (
                        <div className="flex gap-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="flex-1 p-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                disabled={isLoading}
                            />
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="flex-1 p-2 text-xs border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                disabled={isLoading}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Main Scrollable Content Area */}
            {/* pb-32 provides extra space at the bottom to ensure content clears your footer menu */}
            <div className="flex-grow overflow-y-auto p-4 md:p-8 pt-6 pb-32">
                <div className="max-w-7xl mx-auto">

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
                        <MetricCard title="Total Revenue" value={formatCurrency(data.revenue)} icon={IndianRupee} colorClass="border-b-indigo-500 text-indigo-400" description="Generated from bills" />
                        <MetricCard title="Bills Raised" value={data.billsRaised.toLocaleString()} icon={List} colorClass="border-b-teal-500 text-teal-400" description="Total sales bills" />
                        <MetricCard title="Avg. Bill Value" value={formatCurrency(data.averageBillValue)} icon={IndianRupee} colorClass="border-b-amber-500 text-amber-400" description="Revenue / Bills" />
                        <MetricCard title="Items Volume" value={data.volume.toLocaleString()} icon={Package} colorClass="border-b-sky-500 text-sky-400" description="Total units sold" />
                    </div>

                    {/* Chart Visualization */}
                    <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl shadow-2xl dark:shadow-indigo-900/10 border border-gray-200 dark:border-gray-800 mb-8">
                    <h3 className="text-xl font-bold flex items-center text-gray-200 mb-4 border-b border-gray-800 pb-3">
                        <BarChart className="w-5 h-5 mr-2 text-indigo-400" /> Trend Analysis
                    </h3>

                    {/* Chart Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        
                        {/* Y-Axis Selector (Chart By) - Uses Indigo for revenue focus */}
                        <div className="flex flex-col gap-2">
                            <div className="inline-flex rounded-full shadow-sm w-full">
                                <button
                                    onClick={() => setChartYAxis('revenue')}
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-l-full transition ${chartYAxis === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    disabled={isLoading}
                                >
                                    Revenue
                                </button>
                                <button
                                    onClick={() => setChartYAxis('bills')}
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-r-full transition ${chartYAxis === 'bills' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                    disabled={isLoading}
                                >
                                    Bills
                                </button>
                            </div>
                        </div>
                        
                        {/* View Type Selector (Group By) - Uses Teal for grouping action */}
                        <div className="flex flex-col gap-2">
                            <div className="inline-flex rounded-full shadow-sm w-full">
                                {VIEW_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setViewType(type)}
                                        className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
                                            viewType === type 
                                                ? 'bg-teal-600 text-white' 
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        } ${type === 'Day' ? 'rounded-l-full' : type === 'Month' ? 'rounded-r-full' : ''}`}
                                        disabled={isLoading}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {isLoading ? (
                         <div className="h-64 w-full bg-gray-800 rounded animate-pulse py-12 flex items-center justify-center">
                             <Loader className="w-6 h-6 animate-spin mr-2 text-teal-400" />
                             <p className="text-center text-gray-400">Loading chart data...</p>
                         </div>
                    ) : chartDataToRender.length > 0 ? (
                        <SalesChart 
                            data={chartDataToRender} 
                            viewType={viewType} 
                            yAxisKey={chartYAxis}
                        />
                    ) : (
                        <p className="text-center text-gray-400 py-12">No data available for the selected period.</p>
                    )}
                </div>

                    {/* Bottom Grid: Items and Financials */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-gray-100 dark:bg-gray-900 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold flex items-center text-gray-900 dark:text-gray-200 mb-4">
                                <Package className="w-5 h-5 mr-2 text-blue-400" /> Top Selling Items
                            </h3>
                            {isLoading ? (
                                <div className="space-y-3 animate-pulse">
                                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                    <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                </div>
                            ) : data.topItems.length > 0 ? (
                                <div className="space-y-3">
                                    {data.topItems.map((item, index) => (
                                        <div key={item.name} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                                            <span className="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                                                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold mr-3 flex items-center justify-center">{index + 1}</span>
                                                {item.name}
                                            </span>
                                            <span className="font-bold text-sm md:text-base text-blue-400">{item.quantity} units</span>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-center text-gray-500 py-4 text-sm">No records.</p>}
                        </div>

                        <div className="bg-gray-100 dark:bg-gray-900 p-4 md:p-6 rounded-xl border border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold flex items-center text-gray-900 dark:text-gray-200 mb-4">
                                <CreditCard className="w-5 h-5 mr-2 text-red-400" /> Financial Summary
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Khata Due</span>
                                    <span className="font-bold text-lg md:text-xl text-red-400">{formatCurrency(data.totalCreditOutstanding)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-800">
                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">All Time Revenue</span>
                                    <span className="font-bold text-teal-500">{formatCurrency(data.totalAllTimeRevenue)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">All Time Bills</span>
                                    <span className="font-bold text-indigo-400">{data.totalAllTimeBills.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;