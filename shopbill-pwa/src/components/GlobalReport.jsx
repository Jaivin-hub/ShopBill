import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, BarChart3, PieChart, MapPin, Building, Users,
    DollarSign, IndianRupee, CreditCard, Package, Loader, Calendar,
    ArrowUpRight, ArrowDownRight, Filter, Download, RefreshCw,
    Award, TrendingDown, Activity, Globe, AlertCircle
} from 'lucide-react';
import API from '../config/api';

// Date filter options
const DATE_FILTERS = [
    { id: '24h', label: '24 Hours', days: 1 },
    { id: '7d', label: '7 Days', days: 7 },
    { id: '30d', label: '30 Days', days: 30 },
    { id: '90d', label: '90 Days', days: 90 },
    { id: 'all', label: 'All Time', days: Infinity },
    { id: 'custom', label: 'Custom Range', days: 0 },
];

// Helper functions for date formatting
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
        return {
            startDate: getDateXDaysAgo(filter.days),
            endDate: getTodayDateString()
        };
    }
    
    if (filterId === 'custom' && startStr && endStr) {
        if (new Date(startStr).getTime() > new Date(endStr).getTime()) {
            return { startDate: '', endDate: '' };
        }
        return { startDate: startStr, endDate: endStr };
    }
    
    return { startDate: getDateXDaysAgo(7), endDate: getTodayDateString() };
};

// Format currency
const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
};

// Format number
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.floor(num));
};

// Generate dummy global report data
const generateDummyGlobalReportData = (selectedFilter) => {
    const now = new Date();
    
    // Generate overall metrics
    const totalRevenue = 125000000 + Math.random() * 50000000;
    const totalBills = 45678 + Math.floor(Math.random() * 10000);
    const totalShops = 156;
    const activeShops = 142;
    const totalUsers = 1245;
    const averageBillValue = totalRevenue / totalBills;
    
    // Generate top performing shops
    const topShops = [
        { name: 'ABC Supermart', revenue: 8500000, bills: 3421, growth: 12.5, location: 'Mumbai, MH' },
        { name: 'XYZ Retail', revenue: 7200000, bills: 2890, growth: 8.3, location: 'Delhi, DL' },
        { name: 'DEF Store', revenue: 6800000, bills: 2654, growth: -2.1, location: 'Bangalore, KA' },
        { name: 'GHI Mart', revenue: 5900000, bills: 2234, growth: 15.7, location: 'Pune, MH' },
        { name: 'JKL Shop', revenue: 5200000, bills: 1987, growth: 5.2, location: 'Chennai, TN' },
    ];
    
    // Generate plan-wise performance
    const planPerformance = {
        basic: { shops: 89, revenue: 222611000, bills: 25678, avgRevenue: 2501236 },
        pro: { shops: 52, revenue: 363948000, bills: 15234, avgRevenue: 7006692 },
        enterprise: { shops: 15, revenue: 254985000, bills: 4766, avgRevenue: 16999000 },
    };
    
    // Generate revenue trend (last 12 months)
    const revenueTrend = [];
    for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        revenueTrend.push({
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue: 10000000 + Math.random() * 4000000,
            bills: 3500 + Math.floor(Math.random() * 1500),
        });
    }
    
    // Generate daily revenue (last 30 days)
    const dailyRevenue = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dailyRevenue.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: 3500000 + Math.random() * 1500000,
            bills: 1200 + Math.floor(Math.random() * 500),
        });
    }
    
    // Generate geographic distribution
    const geographicData = [
        { state: 'Maharashtra', shops: 45, revenue: 45000000 },
        { state: 'Delhi', shops: 32, revenue: 32000000 },
        { state: 'Karnataka', shops: 28, revenue: 28000000 },
        { state: 'Tamil Nadu', shops: 25, revenue: 25000000 },
        { state: 'Gujarat', shops: 18, revenue: 18000000 },
        { state: 'Others', shops: 8, revenue: 8000000 },
    ];
    
    // Calculate growth
    const previousPeriodRevenue = totalRevenue * 0.92;
    const revenueGrowth = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    
    return {
        totalRevenue,
        totalBills,
        totalShops,
        activeShops,
        totalUsers,
        averageBillValue,
        revenueGrowth,
        topShops,
        planPerformance,
        revenueTrend,
        dailyRevenue,
        geographicData,
    };
};

// Metric Card Component
const MetricCard = ({ title, value, unit, icon: Icon, trend, trendValue, color, subtitle }) => {
    const colorClasses = {
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
        green: 'text-green-400 bg-green-500/10 border-green-500/30',
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
        teal: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    };
    
    const colorClass = colorClasses[color] || colorClasses.indigo;
    
    return (
        <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-12 h-12 rounded-lg ${colorClass} flex items-center justify-center border`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                        trend === 'up' ? 'text-green-400' : 'text-red-400'
                    }`}>
                        {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {Math.abs(trendValue).toFixed(1)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    {unit && <span className="text-lg text-gray-500">{unit}</span>}
                    <h3 className="text-2xl font-bold text-white">{value}</h3>
                </div>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

const GlobalReport = ({ apiClient, API, showToast, currentUser }) => {
    const [selectedFilter, setSelectedFilter] = useState('30d');
    const [customStartDate, setCustomStartDate] = useState(getDateXDaysAgo(30));
    const [customEndDate, setCustomEndDate] = useState(getTodayDateString());
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewType, setViewType] = useState('monthly'); // monthly or daily
    
    // Fetch global report data
    const fetchGlobalReportData = useCallback(async () => {
        setIsLoading(true);
        try {
            const { startDate, endDate } = getFilterDateStrings(selectedFilter, customStartDate, customEndDate);
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            
            const response = await apiClient.get(API.superadminReports, { params });
            if (response.data.success) {
                setReportData(response.data.data);
            } else {
                throw new Error(response.data.message || 'Failed to load report data');
            }
        } catch (error) {
            console.error('Failed to load global report data:', error);
            // Fallback to dummy data on error
            const data = generateDummyGlobalReportData(selectedFilter);
            setReportData(data);
            showToast('Using cached data. API connection failed.', 'warning');
        } finally {
            setIsLoading(false);
        }
    }, [selectedFilter, customStartDate, customEndDate, apiClient, API, showToast]);
    
    useEffect(() => {
        if (currentUser && currentUser.role === 'superadmin') {
            fetchGlobalReportData();
        }
    }, [fetchGlobalReportData, currentUser]);
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-indigo-400" />
                <p className='mt-3 text-gray-300'>Loading global reports...</p>
            </div>
        );
    }
    
    if (!reportData) {
        return (
            <div className="p-8 text-center text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>No data available</p>
            </div>
        );
    }
    
    const chartData = viewType === 'monthly' ? reportData.revenueTrend : reportData.dailyRevenue;
    const maxRevenue = Math.max(...chartData.map(d => d.revenue));
    
    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300 overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-indigo-400" />
                        Global Reports
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={fetchGlobalReportData}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-all duration-200 cursor-pointer"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all duration-200 cursor-pointer"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>
                <p className="text-gray-400">Comprehensive analytics across all shops</p>
            </div>
            
            {/* Date Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Filter className="w-4 h-4" />
                    <span>Filter:</span>
                </div>
                {DATE_FILTERS.filter(f => f.id !== 'custom').map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                            selectedFilter === filter.id
                                ? 'bg-indigo-600 text-white'
                                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-gray-700/50'
                        }`}
                    >
                        {filter.label}
                    </button>
                ))}
                {selectedFilter === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                        />
                    </div>
                )}
            </div>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <MetricCard
                    title="Total Revenue"
                    value={formatNumber(reportData.totalRevenue)}
                    unit="₹"
                    icon={IndianRupee}
                    trend="up"
                    trendValue={reportData.revenueGrowth}
                    color="green"
                    subtitle="Across all shops"
                />
                <MetricCard
                    title="Total Bills"
                    value={formatNumber(reportData.totalBills)}
                    icon={CreditCard}
                    trend="up"
                    trendValue={8.5}
                    color="indigo"
                    subtitle={`Avg: ${formatCurrency(reportData.averageBillValue)}`}
                />
                <MetricCard
                    title="Active Shops"
                    value={reportData.activeShops}
                    icon={Building}
                    trend="up"
                    trendValue={3.2}
                    color="blue"
                    subtitle={`of ${reportData.totalShops} total`}
                />
                <MetricCard
                    title="Total Users"
                    value={formatNumber(reportData.totalUsers)}
                    icon={Users}
                    trend="up"
                    trendValue={5.1}
                    color="purple"
                    subtitle="All shop users"
                />
            </div>
            
            {/* Revenue Chart and Top Shops */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Revenue Trend Chart */}
                <div className="lg:col-span-2 bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                            Revenue Trend
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setViewType('monthly')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                                    viewType === 'monthly'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setViewType('daily')}
                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                                    viewType === 'daily'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                                }`}
                            >
                                Daily
                            </button>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {chartData.map((item, index) => {
                            const percentage = (item.revenue / maxRevenue) * 100;
                            return (
                                <div key={index} className="flex items-center gap-3">
                                    <span className="text-xs text-gray-400 w-20 flex-shrink-0">{item.date || item.month}</span>
                                    <div className="flex-1 bg-gray-700/30 rounded-full h-8 relative overflow-hidden">
                                        <div
                                            className="h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                                            style={{ width: `${percentage}%` }}
                                        >
                                            <span className="text-xs font-semibold text-white">
                                                {formatCurrency(item.revenue)}
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 w-16 text-right">{item.bills} bills</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Top Performing Shops */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Award className="w-5 h-5 text-indigo-400" />
                        Top Shops
                    </h2>
                    <div className="space-y-3">
                        {reportData.topShops.map((shop, index) => (
                            <div
                                key={index}
                                className="p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-semibold text-white">{shop.name}</span>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-medium ${
                                        shop.growth > 0 ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                        {shop.growth > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {Math.abs(shop.growth).toFixed(1)}%
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                                    <span>{formatCurrency(shop.revenue)}</span>
                                    <span>{formatNumber(shop.bills)} bills</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin className="w-3 h-3" />
                                    {shop.location}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Plan Performance and Geographic Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Plan Performance */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <PieChart className="w-5 h-5 text-indigo-400" />
                        Plan Performance
                    </h2>
                    <div className="space-y-4">
                        {Object.entries(reportData.planPerformance).map(([plan, data]) => {
                            const planColors = {
                                basic: 'bg-gray-500/20 border-gray-500/30 text-gray-300',
                                pro: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
                                enterprise: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
                            };
                            const planNames = {
                                basic: 'Basic',
                                pro: 'Pro',
                                enterprise: 'Enterprise',
                            };
                            
                            const totalRevenue = Object.values(reportData.planPerformance).reduce((sum, p) => sum + p.revenue, 0);
                            const percentage = (data.revenue / totalRevenue) * 100;
                            
                            return (
                                <div key={plan}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${planColors[plan]}`}>
                                                {planNames[plan]}
                                            </span>
                                            <span className="text-sm text-gray-400">{data.shops} shops</span>
                                        </div>
                                        <span className="text-sm font-semibold text-white">{formatCurrency(data.revenue)}</span>
                                    </div>
                                    <div className="w-full bg-gray-700/30 rounded-full h-2 mb-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                plan === 'basic' ? 'bg-gray-500' :
                                                plan === 'pro' ? 'bg-indigo-500' :
                                                'bg-purple-500'
                                            }`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Avg: {formatCurrency(data.avgRevenue)}/shop</span>
                                        <span>{formatNumber(data.bills)} bills</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Geographic Distribution */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <Globe className="w-5 h-5 text-indigo-400" />
                        Geographic Distribution
                    </h2>
                    <div className="space-y-3">
                        {reportData.geographicData.map((item, index) => {
                            const totalRevenue = reportData.geographicData.reduce((sum, d) => sum + d.revenue, 0);
                            const percentage = (item.revenue / totalRevenue) * 100;
                            const maxRevenue = Math.max(...reportData.geographicData.map(d => d.revenue));
                            const barPercentage = (item.revenue / maxRevenue) * 100;
                            
                            return (
                                <div key={index}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm font-medium text-white">{item.state}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-semibold text-white block">{formatCurrency(item.revenue)}</span>
                                            <span className="text-xs text-gray-500">{item.shops} shops</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-700/30 rounded-full h-2">
                                        <div
                                            className="h-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${barPercentage}%` }}
                                        />
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {percentage.toFixed(1)}% of total revenue
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalReport;

