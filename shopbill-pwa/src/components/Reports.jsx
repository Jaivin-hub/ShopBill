import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, List, BarChart, CreditCard, Package } from 'lucide-react'; 
import SalesChart from './SalesChart';

const DATE_FILTERS = [
    { id: '24h', label: '24 Hrs', days: 1 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: 'all', label: 'All Time', days: Infinity },
    { id: 'custom', label: 'Custom Range', days: 0 },
];

const VIEW_TYPES = ['Day', 'Week', 'Month'];

// Utility function to get the start and end timestamps based on filter or custom dates
const getFilterTimes = (filterId, startStr, endStr) => {
    // Logic for fixed presets
    const filter = DATE_FILTERS.find(f => f.id === filterId);
    if (filter && filter.days !== 0) {
        if (filter.days === Infinity) return { start: 0, end: Date.now() };
        
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - filter.days);
        start.setHours(0, 0, 0, 0); 
        return { start: start.getTime(), end: end.getTime() };
    }
    
    // Logic for custom range
    if (filterId === 'custom' && startStr && endStr) {
        try {
            const start = new Date(startStr);
            start.setHours(0, 0, 0, 0); 
            
            const end = new Date(endStr);
            end.setHours(23, 59, 59, 999);
            
            if (start.getTime() > end.getTime()) {
                console.warn("Start date is after end date. Defaulting to 7 days.");
                return getFilterTimes('7d', null, null);
            }
            return { start: start.getTime(), end: end.getTime() };
        } catch (e) {
            console.error("Invalid date parsing:", e);
            return getFilterTimes('7d', null, null);
        }
    }
    
    // Default to last 7 days
    return getFilterTimes('7d', null, null); 
};

// Helper to generate the unique time key for aggregation (Day/Week/Month)
const getTimeKey = (date, viewType) => {
    if (viewType === 'Month') {
        return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
    } else if (viewType === 'Week') {
        // Simple Week number approximation
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return d.getUTCFullYear() + '-W' + String(weekNo).padStart(2, '0');
    } else { // 'Day'
        return date.toISOString().substring(0, 10);
    }
};

const Reports = ({ sales, customers, showToast }) => {
    // Mock Data structures (replace with actual data if available)
    if (!sales || sales.length === 0) {
        sales = [
            { id: 1, totalAmount: 550.00, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), items: [{itemId: 'P001', name: 'Product A', quantity: 2}] },
            { id: 2, totalAmount: 1200.00, timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), items: [{itemId: 'P002', name: 'Product B', quantity: 1}] },
            { id: 3, totalAmount: 750.00, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), items: [{itemId: 'P001', name: 'Product A', quantity: 3}] },
            { id: 4, totalAmount: 300.00, timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), items: [{itemId: 'P003', name: 'Product C', quantity: 1}] },
            { id: 5, totalAmount: 2500.00, timestamp: new Date().toISOString(), items: [{itemId: 'P002', name: 'Product B', quantity: 5}] },
            { id: 6, totalAmount: 400.00, timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), items: [{itemId: 'P004', name: 'Product D', quantity: 10}] },
        ];
    }
    if (!customers || customers.length === 0) {
        customers = [
            { id: 'C001', name: 'Rahul S.', outstandingCredit: 1000, joiningDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'C002', name: 'Priya K.', outstandingCredit: 500, joiningDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'C003', name: 'Amit V.', outstandingCredit: 0, joiningDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'C004', name: 'Zoya M.', outstandingCredit: 2500, joiningDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 'C005', name: 'Bhavin P.', outstandingCredit: 0, joiningDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
        ];
    }

    const [selectedFilter, setSelectedFilter] = useState('7d');
    // CHART STATE UPDATES
    const [viewType, setViewType] = useState('Day'); // 'Day', 'Week', 'Month' for chart aggregation
    const [chartYAxis, setChartYAxis] = useState('revenue'); // 'revenue', 'bills'
    const [customStartDate, setCustomStartDate] = useState(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
    const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().substring(0, 10));

    // 1. Data Processing and Metrics Calculation (Optimized with custom range logic)
    const reportData = useMemo(() => {
        const { start: startTime, end: endTime } = getFilterTimes(selectedFilter, customStartDate, customEndDate);

        // --- Core Sales Filtering ---
        const filteredSales = sales.filter(sale => {
            const saleTime = new Date(sale.timestamp).getTime();
            return saleTime >= startTime && saleTime <= endTime;
        });

        // --- Metric Calculations ---
        const revenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const billsRaised = filteredSales.length; 
        
        // NEW Metric: Average Bill Value
        const averageBillValue = billsRaised > 0 ? revenue / billsRaised : 0;

        // Credit Outstanding is still needed for Financial Summary (All Time)
        const totalCreditOutstanding = customers.reduce((sum, cust) => sum + (cust.outstandingCredit || 0), 0);
        
        // --- Item Aggregation (for Volume and Top Items) ---
        const itemVolumeMap = new Map();
        let totalVolume = 0;

        filteredSales.forEach(sale => {
            (sale.items || []).forEach(item => {
                const key = item.itemId; 
                const current = itemVolumeMap.get(key) || { name: item.name, quantity: 0 };
                current.quantity += item.quantity;
                itemVolumeMap.set(key, current);
                totalVolume += item.quantity;
            });
        });

        const topItems = Array.from(itemVolumeMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5); 

        // --- Chart Data Aggregation (Simplified) ---
        const aggregationMap = new Map();
        filteredSales.forEach(sale => {
            const date = new Date(sale.timestamp);
            const key = getTimeKey(date, viewType);

            const currentData = aggregationMap.get(key) || { 
                name: key, 
                revenue: 0, 
                bills: 0, 
            };
            currentData.revenue += sale.totalAmount;
            currentData.bills += 1; 
            aggregationMap.set(key, currentData);
        });

        // Convert Map to array and sort by key (date/month)
        const sortedChartData = Array.from(aggregationMap.values()).sort((a, b) => a.name.localeCompare(b.name));


        return {
            revenue,
            billsRaised,
            averageBillValue,
            volume: totalVolume,
            topItems,
            totalCreditOutstanding,
            totalAllTimeBills: sales.length, 
            totalAllTimeRevenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0), 
            sortedChartData,
        };
    }, [sales, customers, selectedFilter, customStartDate, customEndDate, viewType]);

    // Helper for formatting large numbers with currency
    const formatCurrency = (amount) => {
        const numericAmount = typeof amount === 'number' ? amount : 0;
        // Use a minimum of 0 fraction digits for Indian currency context
        return `₹${numericAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };
    
    // Helper for rendering metric cards
    const MetricCard = ({ title, value, icon: Icon, colorClass, description }) => (
        <div className={`p-4 rounded-xl shadow-lg border-b-4 ${colorClass} bg-white dark:bg-gray-800 transition-shadow`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
                    <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                        {value}
                    </h2>
                </div>
                <Icon className={`w-8 h-8 ${colorClass.replace('border-b-4', 'text')}`} />
            </div>
            {description && <p className="text-xs text-gray-400 mt-2">{description}</p>}
        </div>
    );

    // Determine the current filter label for display
    const getCurrentFilterLabel = () => {
        if (selectedFilter === 'custom') {
            return `${customStartDate} to ${customEndDate}`;
        }
        return DATE_FILTERS.find(f => f.id === selectedFilter)?.label || 'Loading...';
    };

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
                        value={formatCurrency(reportData.revenue)}
                        icon={DollarSign}
                        colorClass="border-b-indigo-500 text-indigo-500"
                        description={`Generated from bills`}
                    />
                    <MetricCard
                        title="Bills Raised" 
                        value={reportData.billsRaised.toLocaleString()}
                        icon={List}
                        colorClass="border-b-green-500 text-green-500"
                        description={`Total sales bills in period`}
                    />
                    <MetricCard
                        title="Avg. Bill Value"
                        value={formatCurrency(reportData.averageBillValue)}
                        icon={DollarSign}
                        colorClass="border-b-amber-500 text-amber-500"
                        description={`Revenue / Bills Raised`}
                    />
                    <MetricCard
                        title="Items Volume"
                        value={reportData.volume.toLocaleString()}
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

                    {/* 🌟 START FIX: Mobile-First Chart Controls for better spacing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        
                        {/* Y-Axis Selector (Chart By) */}
                        <div className="flex flex-col gap-2">
                            {/* <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chart By:</span> */}
                            <div className="inline-flex rounded-full shadow-sm w-full"> {/* w-full applied here */}
                                <button
                                    onClick={() => setChartYAxis('revenue')}
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-l-full transition ${chartYAxis === 'revenue' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    Revenue
                                </button>
                                <button
                                    onClick={() => setChartYAxis('bills')}
                                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-r-full transition ${chartYAxis === 'bills' ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    Bills
                                </button>
                            </div>
                        </div>
                        
                        {/* View Type Selector (Group By) */}
                        <div className="flex flex-col gap-2">
                            {/* <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Group By:</span> */}
                            <div className="inline-flex rounded-full shadow-sm w-full"> {/* w-full applied here */}
                                {VIEW_TYPES.map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setViewType(type)}
                                        className={`flex-1 px-3 py-2 text-xs font-semibold transition ${
                                            viewType === type 
                                                ? 'bg-green-600 text-white' 
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        } ${type === 'Day' ? 'rounded-l-full' : type === 'Month' ? 'rounded-r-full' : ''}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* 🌟 END FIX */}
                    
                    {reportData.sortedChartData.length > 0 ? (
                        <SalesChart 
                            data={reportData.sortedChartData} 
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
                        
                        {reportData.topItems.length > 0 ? (
                            <div className="space-y-3">
                                {reportData.topItems.map((item, index) => (
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
                                <span className="font-extrabold text-2xl text-red-600 dark:text-red-400">{formatCurrency(reportData.totalCreditOutstanding)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Revenue (All Time):</span>
                                <span className="font-bold text-lg text-green-600 dark:text-green-400">{formatCurrency(reportData.totalAllTimeRevenue)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300">Total Bills Raised (All Time):</span> 
                                <span className="font-bold text-lg text-purple-600 dark:text-purple-400">{reportData.totalAllTimeBills.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Reports;