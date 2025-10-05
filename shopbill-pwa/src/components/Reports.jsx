import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, List, BarChart, CreditCard, Package } from 'lucide-react'; 
import SalesChart from './SalesChart';
import axios from 'axios';
import API from '../config/api'; 

// --- Constants ---
const DATE_FILTERS = [
    { id: '24h', label: '24 Hrs', days: 1 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: 'all', label: 'All Time', days: Infinity },
    { id: 'custom', label: 'Custom Range', days: 0 },
];

const VIEW_TYPES = ['Day', 'Week', 'Month'];

// --- Utility Functions (UPDATED FOR LOCAL TIMEZONE CORRECTNESS) ---

// 1. Helper: Correctly formats any Date object to YYYY-MM-DD using LOCAL time components
const getLocalFormattedDate = (date) => {
    // We use local methods (getFullYear, getMonth, getDate) to ensure the date 
    // corresponds to the local calendar day, avoiding UTC shift.
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // +1 because getMonth() is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get today's date string (local time)
const getTodayDateString = () => getLocalFormattedDate(new Date());

// Helper to get a date string X days ago (including today)
const getDateXDaysAgo = (days) => {
    const d = new Date();
    // To include today (1st day), subtract (X - 1) days.
    d.setDate(d.getDate() - (days - 1)); 
    return getLocalFormattedDate(d); // Use the new local formatter
};

// 2. Utility function to format Date strings for the Server API
const getFilterDateStrings = (filterId, startStr, endStr) => {
    // Logic for fixed presets
    const filter = DATE_FILTERS.find(f => f.id === filterId);

    if (filter && filter.days !== 0) {
        if (filter.days === Infinity) return { startDate: '', endDate: '' }; 
        
        // This now uses the local date string for both start and end
        return { 
            startDate: getDateXDaysAgo(filter.days), 
            endDate: getTodayDateString() 
        };
    }
    
    // Logic for custom range
    if (filterId === 'custom' && startStr && endStr) {
        if (new Date(startStr).getTime() > new Date(endStr).getTime()) {
            console.warn("Start date is after end date. Sending no filter.");
            return { startDate: '', endDate: '' };
        }
        return { startDate: startStr, endDate: endStr };
    }
    
    // Default to a 7-day period if no valid selection is made
    return getFilterDateStrings('7d', null, null); 
};


const Reports = ({ sales, customers, showToast }) => {
    // --- State Management ---
    const [selectedFilter, setSelectedFilter] = useState('7d');
    const [viewType, setViewType] = useState('Day');
    const [chartYAxis, setChartYAxis] = useState('revenue');
    
    // Set custom defaults using the new, correct helper function
    const [customStartDate, setCustomStartDate] = useState(getDateXDaysAgo(7)); 
    const [customEndDate, setCustomEndDate] = useState(getTodayDateString());
    
    // Server-Fetched Data States
    const [summaryData, setSummaryData] = useState(null);
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- Data Fetching Logic (useEffect) ---
    const fetchReportData = useCallback(async () => {
        setIsLoading(true);
        // 1. Get formatted date strings based on current state
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);

        // Prepare query parameters
        const queryParams = {
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        };

        try {
            // --- Fetch Summary Metrics ---
            const summaryResponse = await axios.get(API.reportsSummary, { params: queryParams });
            setSummaryData(summaryResponse.data);
            
            // --- Fetch Chart Data (requires viewType) ---
            const chartResponse = await axios.get(API.reportsChartData, { 
                params: { 
                    ...queryParams,
                    viewType: viewType // Add viewType to the chart query
                } 
            });
            setChartData(chartResponse.data);

        } catch (error) {
            console.error("Failed to fetch report data:", error);
            showToast({ message: "Failed to load reports. Please check server connection.", type: 'error' });
            setSummaryData(null);
            setChartData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter, customStartDate, customEndDate, viewType, showToast]); 

    // Re-fetch data whenever filters or viewType change
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);


    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        const numericAmount = typeof amount === 'number' ? amount : 0;
        return `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };
    
    const MetricCard = ({ title, value, icon: Icon, colorClass, description }) => (
        <div className={`p-4 rounded-xl shadow-lg border-b-4 ${colorClass} bg-white dark:bg-gray-800 transition-shadow`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    {isLoading ? (
                         <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                    ) : (
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                            {value}
                        </h2>
                    )}
                </div>
                <Icon className={`w-8 h-8 ${colorClass.replace('border-b-4', 'text')}`} />
            </div>
            {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
        </div>
    );

    const getCurrentFilterLabel = () => {
        if (selectedFilter === 'custom') {
            return `${customStartDate} to ${customEndDate}`;
        }
        return DATE_FILTERS.find(f => f.id === selectedFilter)?.label || 'Loading...';
    };

    // Use a default/loading structure if data hasn't arrived yet
    const data = summaryData || {
        revenue: 0,
        billsRaised: 0,
        averageBillValue: 0,
        volume: 0,
        topItems: [],
        totalCreditOutstanding: 0,
        totalAllTimeBills: 0, 
        totalAllTimeRevenue: 0, 
    };
    
    const chartDataToRender = chartData || [];
    
    // --- Render Component ---
    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
            <style jsx global>{`
                .font-sans {
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
            
            {/* 2. FIXED HEADER BLOCK (Title, Description, and Filters) */}
            <div className="pb-4 mb-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 z-10">
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-2">
                    <TrendingUp className="inline-block w-7 h-7 mr-2 text-indigo-500" /> Business Reports
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Analyzing data for: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{getCurrentFilterLabel()}</span></p>

                {/* --- Filter Controls & View Type Selector --- */}
                <div className="space-y-4">
                    {/* Preset Filters */}
                    <div className="overflow-x-auto whitespace-nowrap py-2">
                        <div className="inline-flex space-x-2 p-1 bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700">
                            {DATE_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${
                                        selectedFilter === filter.id
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    disabled={isLoading}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date Picker (Visible when 'custom' is selected) */}
                    {selectedFilter === 'custom' && (
                        <div className="flex flex-col md:flex-row gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border dark:border-gray-700">
                            <div className="flex-1">
                                <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. SCROLLABLE CONTENT BLOCK (Metrics, Charts, Details) */}
            <div className="flex-grow overflow-y-auto">

                {/* --- 2. Key Metrics Grid (Responsive 2-column) --- */}
                {/* MetricCard uses the 'data' derived from summaryData */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard
                        title="Total Revenue"
                        value={formatCurrency(data.revenue)}
                        icon={DollarSign}
                        colorClass="border-b-indigo-500 text-indigo-500"
                        description={`Generated from bills`}
                    />
                    <MetricCard
                        title="Bills Raised" 
                        value={data.billsRaised.toLocaleString()}
                        icon={List}
                        colorClass="border-b-green-500 text-green-500"
                        description={`Total sales bills in period`}
                    />
                    <MetricCard
                        title="Avg. Bill Value"
                        value={formatCurrency(data.averageBillValue)}
                        icon={DollarSign}
                        colorClass="border-b-amber-500 text-amber-500"
                        description={`Revenue / Bills Raised`}
                    />
                    <MetricCard
                        title="Items Volume"
                        value={data.volume.toLocaleString()}
                        icon={Package}
                        colorClass="border-b-yellow-500 text-yellow-500"
                        description={`Total units sold`}
                    />
                    
                </div>
                
                {/* --- 3. Sales Chart Visualization --- */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border dark:border-gray-700 mb-8">
                    <h3 className="text-xl font-bold flex items-center text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-gray-700 pb-3">
                        <BarChart className="w-5 h-5 mr-2 text-indigo-500" /> Trend Analysis
                    </h3>

                    {/* Chart Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        
                        {/* Y-Axis Selector (Chart By) */}
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
                        
                        {/* View Type Selector (Group By) */}
                        <div className="flex flex-col gap-2">
                            <div className="inline-flex rounded-full shadow-sm w-full">
                                {VIEW_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setViewType(type)}
                                        className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
                                            viewType === type 
                                                ? 'bg-green-600 text-white' 
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
                         <div className="h-64 w-full bg-gray-100 dark:bg-gray-700 rounded animate-pulse py-12">
                             <p className="text-center text-gray-500 dark:text-gray-400">Loading chart data...</p>
                         </div>
                    ) : chartDataToRender.length > 0 ? (
                        <SalesChart 
                            data={chartDataToRender} 
                            viewType={viewType} 
                            yAxisKey={chartYAxis}
                        />
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-12">No data available for the selected period.</p>
                    )}
                </div>

                {/* --- 4. Top Selling Items & Khata Due --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-4">
                    {/* Top Selling Items */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border dark:border-gray-700">
                        <h3 className="text-xl font-bold flex items-center text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-gray-700 pb-3">
                            <Package className="w-5 h-5 mr-2 text-blue-500" /> Top Selling Items
                        </h3>
                        
                        {isLoading ? (
                             <div className="space-y-3">
                                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                <div className="h-10 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                             </div>
                        ) : data.topItems.length > 0 ? (
                            <div className="space-y-3">
                                {data.topItems.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                                            <span className="w-6 h-6 text-center rounded-full bg-blue-500 text-white text-sm font-bold mr-3 flex items-center justify-center">{index + 1}</span>
                                            {item.name}
                                        </span>
                                        <span className="font-extrabold text-lg text-blue-600 dark:text-blue-400">
                                            {item.quantity.toLocaleString()} units
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">No sales recorded in this period.</p>
                        )}
                    </div>

                    {/* Khata Due / Total Summary */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-2xl border dark:border-gray-700">
                        <h3 className="text-xl font-bold flex items-center text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-gray-700 pb-3">
                            <CreditCard className="w-5 h-5 mr-2 text-red-500" /> Financial Summary
                        </h3>
                        
                        <div className="flex flex-col space-y-4">
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Khata Due (All Time):</span>
                                {isLoading ? (
                                    <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                ) : (
                                    <span className="font-extrabold text-2xl text-red-600 dark:text-red-400">{formatCurrency(data.totalCreditOutstanding)}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Revenue (All Time):</span>
                                {isLoading ? (
                                    <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                ) : (
                                    <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(data.totalAllTimeRevenue)}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Bills Raised (All Time):</span> 
                                {isLoading ? (
                                    <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                                ) : (
                                    <span className="font-bold text-lg text-purple-600 dark:text-purple-400">{data.totalAllTimeBills.toLocaleString()}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;