import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, DollarSign, List, BarChart, CreditCard, Package, Loader } from 'lucide-react'; 
import SalesChart from './SalesChart';
// NOTE: Removed direct axios import
// import axios from 'axios';
// NOTE: Removed direct API import, now received via props
// import API from '../config/api'; 

// --- Constants ---
const DATE_FILTERS = [
    { id: '24h', label: '24 Hrs', days: 1 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: 'all', label: 'All Time', days: Infinity },
    { id: 'custom', label: 'Custom Range', days: 0 },
];

const VIEW_TYPES = ['Day', 'Week', 'Month'];

// --- Utility Functions (Unchanged - for correctness) ---

// 1. Helper: Correctly formats any Date object to YYYY-MM-DD using LOCAL time components
const getLocalFormattedDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get today's date string (local time)
const getTodayDateString = () => getLocalFormattedDate(new Date());

// Helper to get a date string X days ago (including today)
const getDateXDaysAgo = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1)); 
    return getLocalFormattedDate(d);
};

// 2. Utility function to format Date strings for the Server API
const getFilterDateStrings = (filterId, startStr, endStr) => {
    const filter = DATE_FILTERS.find(f => f.id === filterId);

    if (filter && filter.days !== 0) {
        if (filter.days === Infinity) return { startDate: '', endDate: '' }; 
        
        return { 
            startDate: getDateXDaysAgo(filter.days), 
            endDate: getTodayDateString() 
        };
    }
    
    if (filterId === 'custom' && startStr && endStr) {
        if (new Date(startStr).getTime() > new Date(endStr).getTime()) {
            console.warn("Start date is after end date. Sending no filter.");
            return { startDate: '', endDate: '' };
        }
        return { startDate: startStr, endDate: endStr };
    }
    
    return getFilterDateStrings('7d', null, null); 
};


// CRITICAL: Updated props to accept apiClient and API
const Reports = ({ apiClient, API, showToast }) => {
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
        
        // --- AUTHENTICATION REMOVAL: apiClient handles token/headers ---
        // const userToken = localStorage.getItem('userToken'); 
        // if (!userToken) { ... }
        // const headers = { 'Authorization': `Bearer ${userToken}` };
        // --- END AUTHENTICATION REMOVAL ---

        // 1. Get formatted date strings based on current state
        const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);

        // 2. Prepare query parameters
        const queryParams = {
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
        };

        try {
            // --- Fetch Summary Metrics using apiClient ---
            const summaryResponse = await apiClient.get(API.reportsSummary, { 
                params: queryParams,
                // Removed headers: headers
            });
            setSummaryData(summaryResponse.data);
            
            // --- Fetch Chart Data using apiClient (requires viewType) ---
            const chartResponse = await apiClient.get(API.reportsChartData, { 
                params: { 
                    ...queryParams,
                    viewType: viewType // Add viewType to the chart query
                },
                // Removed headers: headers
            });
            setChartData(chartResponse.data);

        } catch (error) {
            console.error("Failed to fetch report data:", error.response?.data || error.message);
            
            // Handle specific authentication error if the API client fails without showing a generic toast
            if (error.response?.status === 401 || error.message.includes('token')) {
                 showToast({ message: "Authentication expired. Please log in again.", type: 'error' });
            } else {
                 showToast({ message: "Failed to load reports. Please check server connection.", type: 'error' });
            }
            
            setSummaryData(null);
            setChartData(null);
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter, customStartDate, customEndDate, viewType, showToast, apiClient, API.reportsSummary, API.reportsChartData]); 

    // Re-fetch data whenever filters or viewType change
    useEffect(() => {
        fetchReportData();
    }, [fetchReportData]);


    // --- Helper Functions ---
    const formatCurrency = (amount) => {
        const numericAmount = typeof amount === 'number' ? amount : 0;
        return `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };
    
    // MetricCard Component - UPDATED FOR DARK THEME
    const MetricCard = ({ title, value, icon: Icon, colorClass, description }) => (
        <div className={`p-4 rounded-xl shadow-xl shadow-indigo-900/10 border-b-4 ${colorClass} bg-gray-900 transition-shadow border border-gray-800`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-400">{title}</p>
                    {isLoading ? (
                         <div className="h-6 w-20 bg-gray-700 rounded animate-pulse mt-1"></div>
                    ) : (
                        <h2 className="text-2xl font-extrabold text-white mt-1">
                            {value}
                        </h2>
                    )}
                </div>
                {/* Ensure the icon uses the specified colorClass for text */}
                <Icon className={`w-8 h-8 ${colorClass.replace('border-b-4', 'text')}`} />
            </div>
            {description && <p className="text-xs text-gray-500 mt-2">{description}</p>}
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
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-950 transition-colors duration-300 font-sans">
            <style jsx global>{`
                .font-sans {
                    font-family: 'Inter', sans-serif;
                }
            `}</style>
            
            {/* 2. FIXED HEADER BLOCK (Title, Description, and Filters) - UPDATED FOR DARK THEME */}
            <div className="pb-4 mb-4 border-b border-gray-800 bg-gray-950 z-10 sticky top-0">
                <h1 className="text-3xl font-extrabold text-white mb-2">
                    Business Reports
                </h1>
                <p className="text-gray-400 mb-6">Analyzing data for: <span className="font-semibold text-teal-400">{getCurrentFilterLabel()}</span></p>

                {/* --- Filter Controls & View Type Selector --- */}
                <div className="space-y-4">
                    {/* Preset Filters */}
                    <div className="overflow-x-auto whitespace-nowrap py-2">
                        <div className="inline-flex space-x-2 p-1 bg-gray-900 rounded-xl shadow-xl shadow-indigo-900/10 border border-gray-800">
                            {DATE_FILTERS.map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setSelectedFilter(filter.id)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-150 ${
                                        selectedFilter === filter.id
                                            ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                                            : 'text-gray-300 hover:bg-gray-700'
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
                        <div className="flex flex-col md:flex-row gap-4 p-4 bg-gray-900 rounded-xl shadow-md border border-gray-800">
                            <div className="flex-1">
                                <label htmlFor="start-date" className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                                <input
                                    id="start-date"
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-teal-500 focus:border-teal-500"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="end-date" className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                                <input
                                    id="end-date"
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-teal-500 focus:border-teal-500"
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <MetricCard
                        title="Total Revenue"
                        value={formatCurrency(data.revenue)}
                        icon={DollarSign}
                        colorClass="border-b-indigo-500 text-indigo-400" 
                        description={`Generated from bills`}
                    />
                    <MetricCard
                        title="Bills Raised" 
                        value={data.billsRaised.toLocaleString()}
                        icon={List}
                        colorClass="border-b-teal-500 text-teal-400"
                        description={`Total sales bills in period`}
                    />
                    <MetricCard
                        title="Avg. Bill Value"
                        value={formatCurrency(data.averageBillValue)}
                        icon={DollarSign}
                        colorClass="border-b-amber-500 text-amber-400"
                        description={`Revenue / Bills Raised`}
                    />
                    <MetricCard
                        title="Items Volume"
                        value={data.volume.toLocaleString()}
                        icon={Package}
                        colorClass="border-b-sky-500 text-sky-400"
                        description={`Total units sold`}
                    />
                    
                </div>
                
                {/* --- 3. Sales Chart Visualization - UPDATED FOR DARK THEME --- */}
                <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/10 border border-gray-800 mb-8">
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
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-l-full transition ${chartYAxis === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                    disabled={isLoading}
                                >
                                    Revenue
                                </button>
                                <button
                                    onClick={() => setChartYAxis('bills')}
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-r-full transition ${chartYAxis === 'bills' ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
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
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
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

                {/* --- 4. Top Selling Items & Khata Due - UPDATED FOR DARK THEME --- */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-4">
                    {/* Top Selling Items */}
                    <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/10 border border-gray-800">
                        <h3 className="text-xl font-bold flex items-center text-gray-200 mb-4 border-b border-gray-800 pb-3">
                            <Package className="w-5 h-5 mr-2 text-blue-400" /> Top Selling Items
                        </h3>
                        
                        {isLoading ? (
                             <div className="space-y-3">
                                <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
                                <div className="h-10 w-3/4 bg-gray-800 rounded animate-pulse"></div>
                             </div>
                        ) : data.topItems.length > 0 ? (
                            <div className="space-y-3">
                                {data.topItems.map((item, index) => (
                                    <div key={item.name} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                                        <span className="font-semibold text-gray-300 flex items-center">
                                            <span className="w-6 h-6 text-center rounded-full bg-blue-600 text-white text-sm font-bold mr-3 flex items-center justify-center">{index + 1}</span>
                                            {item.name}
                                        </span>
                                        <span className="font-extrabold text-lg text-blue-400">
                                            {item.quantity.toLocaleString()} units
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-400 py-4">No sales recorded in this period.</p>
                        )}
                    </div>

                    {/* Khata Due / Total Summary */}
                    <div className="bg-gray-900 p-4 rounded-xl shadow-2xl shadow-indigo-900/10 border border-gray-800">
                        <h3 className="text-xl font-bold flex items-center text-gray-200 mb-4 border-b border-gray-800 pb-3">
                            <CreditCard className="w-5 h-5 mr-2 text-red-400" /> Financial Summary
                        </h3>
                        
                        <div className="flex flex-col space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-800">
                                <span className="font-medium text-gray-300">Total Khata Due (All Time):</span>
                                {isLoading ? (
                                    <div className="h-6 w-24 bg-gray-700 rounded animate-pulse"></div>
                                ) : (
                                    <span className="font-extrabold text-2xl text-red-400">{formatCurrency(data.totalCreditOutstanding)}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-800">
                                <span className="font-medium text-gray-300">Total Revenue (All Time):</span>
                                {isLoading ? (
                                    <div className="h-6 w-20 bg-gray-700 rounded animate-pulse"></div>
                                ) : (
                                    <span className="font-bold text-lg text-teal-400">{formatCurrency(data.totalAllTimeRevenue)}</span>
                                )}
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="font-medium text-gray-300">Total Bills Raised (All Time):</span> 
                                {isLoading ? (
                                    <div className="h-6 w-12 bg-gray-700 rounded animate-pulse"></div>
                                ) : (
                                    <span className="font-bold text-lg text-indigo-400">{data.totalAllTimeBills.toLocaleString()}</span>
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