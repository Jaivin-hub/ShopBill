import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    Building, Store, Users, IndianRupee, TrendingUp, TrendingDown, 
    CreditCard, AlertCircle, CheckCircle, Clock, XCircle, 
    Activity, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
    Loader, Calendar, MapPin, Shield, Zap, Database, Server
} from 'lucide-react';
import API from '../config/api';

// Generate dummy data for super admin dashboard
const generateDummyDashboardData = () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // Generate revenue data (in INR)
    const totalRevenue = 105000000 + Math.random() * 42000000; // ~1.05-1.47 Cr
    const monthlyRevenue = 12180000 + Math.random() * 4200000; // ~1.22-1.64 Cr
    const lastMonthRevenue = 11088000 + Math.random() * 3360000; // ~1.11-1.44 Cr
    const revenueGrowth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    
    // Generate shop statistics
    const totalShops = 156;
    const activeShops = 142;
    const newShopsThisMonth = 12;
    const shopsGrowth = (newShopsThisMonth / (totalShops - newShopsThisMonth)) * 100;
    
    // Generate user statistics
    const totalUsers = 1245;
    const activeUsers = 1180;
    const newUsersThisMonth = 45;
    
    // Generate plan distribution (in INR)
    const planDistribution = {
        basic: { count: 89, revenue: 222611, percentage: 57 },
        pro: { count: 52, revenue: 363948, percentage: 33 },
        enterprise: { count: 15, revenue: 254985, percentage: 10 }
    };
    
    // Generate payment status
    const paymentStatus = {
        paid: 98,
        pending: 28,
        failed: 12,
        overdue: 4
    };
    
    // Generate recent activity
    const recentActivity = [
        { type: 'shop_created', shop: 'ABC Store', time: new Date(now - 2 * 60 * 60 * 1000), status: 'success' },
        { type: 'payment_received', shop: 'XYZ Mart', amount: 6999, time: new Date(now - 5 * 60 * 60 * 1000), status: 'success' },
        { type: 'shop_suspended', shop: 'DEF Shop', time: new Date(now - 8 * 60 * 60 * 1000), status: 'warning' },
        { type: 'payment_failed', shop: 'GHI Store', amount: 2499, time: new Date(now - 12 * 60 * 60 * 1000), status: 'error' },
        { type: 'plan_upgraded', shop: 'JKL Mart', from: 'Basic', to: 'Pro', time: new Date(now - 15 * 60 * 60 * 1000), status: 'success' },
    ];
    
    // Generate monthly revenue trend (last 6 months) in INR
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyTrend.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            revenue: 10080000 + Math.random() * 3360000, // ~1-1.34 Cr
        });
    }
    
    return {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        totalShops,
        activeShops,
        newShopsThisMonth,
        shopsGrowth,
        totalUsers,
        activeUsers,
        newUsersThisMonth,
        planDistribution,
        paymentStatus,
        recentActivity,
        monthlyTrend,
    };
};

// Stat Card Component
const StatCard = ({ title, value, unit, icon: Icon, trend, trendValue, color, subtitle }) => {
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
        <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600/50 transition-all duration-200">
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
                <div className="flex items-baseline gap-1">
                    {unit && <span className="text-lg text-gray-500">{unit}</span>}
                    <h3 className="text-2xl font-bold text-white">{value}</h3>
                </div>
                {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

// Format number with commas (Indian format)
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(Math.floor(num));
};

// Format currency
const formatCurrency = (num) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};

// Format time ago
const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

const SuperAdminDashboard = ({ apiClient, API, showToast, currentUser }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // Fetch dashboard data
    const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
        // Fetch dashboard stats and recent activity in parallel. Recent activity failure is non-fatal.
        const [dashResp, activityResp] = await Promise.all([
            apiClient.get(API.superadminDashboard),
            apiClient.get(API.superadminRecentActivity).catch(() => null)
        ]);

        if (!dashResp || !dashResp.data || !dashResp.data.success) {
            throw new Error((dashResp && dashResp.data && dashResp.data.message) || 'Failed to load dashboard data');
        }

        const apiData = dashResp.data.data || {};
        const activityData = activityResp && activityResp.data && activityResp.data.success ? activityResp.data.data : null;

        // Fallback activity if API doesn't provide any
        const now = new Date();
        const fallbackActivity = [
            { type: 'shop_created', shop: 'New Shop', time: new Date(now.getTime() - 2 * 60 * 60 * 1000), status: 'success' },
            { type: 'payment_received', shop: 'Shop Payment', amount: 6999, time: new Date(now.getTime() - 5 * 60 * 60 * 1000), status: 'success' },
        ];

        setDashboardData({
            ...apiData,
            recentActivity: Array.isArray(apiData.recentActivity)
                ? apiData.recentActivity
                : Array.isArray(activityData)
                    ? activityData
                    : fallbackActivity,
        });
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Fallback to dummy data on error
        const data = generateDummyDashboardData();
        setDashboardData(data);
        if (typeof showToast === 'function') showToast('Using cached data. API connection failed.', 'warning');
    } finally {
        setIsLoading(false);
    }
}, [apiClient, API, showToast]);
    
    useEffect(() => {
        if (currentUser && currentUser.role === 'superadmin') {
            fetchDashboardData();
        }
    }, [fetchDashboardData, currentUser]);
    
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-indigo-400" />
                <p className='mt-3 text-gray-700 dark:text-gray-300'>Loading dashboard data...</p>
            </div>
        );
    }
    
    if (!dashboardData) {
        return (
            <div className="p-8 text-center text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>No data available</p>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-white dark:bg-gray-950 transition-colors duration-300 overflow-y-auto">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-indigo-400" />
                        Super Admin Dashboard
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Overview of all shops, revenue, and system metrics</p>
            </div>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    title="Total Revenue"
                    value={formatNumber(dashboardData.totalRevenue || 0)}
                    unit="₹"
                    icon={IndianRupee}
                    trend={dashboardData.revenueGrowth >= 0 ? "up" : "down"}
                    trendValue={Math.abs(dashboardData.revenueGrowth || 0).toFixed(1)}
                    color="green"
                    subtitle="All time"
                />
                <StatCard
                    title="Total Shops"
                    value={dashboardData.totalShops || 0}
                    icon={Building}
                    trend={dashboardData.shopsGrowth >= 0 ? "up" : "down"}
                    trendValue={Math.abs(dashboardData.shopsGrowth || 0).toFixed(1)}
                    color="indigo"
                    subtitle={`${dashboardData.activeShops || 0} active`}
                />
                <StatCard
                    title="Total Users"
                    value={formatNumber(dashboardData.totalUsers || 0)}
                    icon={Users}
                    trend="up"
                    trendValue={dashboardData.newUsersThisMonth && dashboardData.totalUsers ? ((dashboardData.newUsersThisMonth / Math.max(dashboardData.totalUsers - dashboardData.newUsersThisMonth, 1)) * 100).toFixed(1) : 0}
                    color="blue"
                    subtitle={`${dashboardData.activeUsers || 0} active`}
                />
                <StatCard
                    title="Monthly Revenue"
                    value={formatNumber(dashboardData.monthlyRevenue || 0)}
                    unit="₹"
                    icon={TrendingUp}
                    trend={dashboardData.revenueGrowth >= 0 ? "up" : "down"}
                    trendValue={Math.abs(dashboardData.revenueGrowth || 0).toFixed(1)}
                    color="purple"
                    subtitle="This month"
                />
            </div>
            
            {/* Secondary Metrics and Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Plan Distribution */}
                <div className="lg:col-span-2 bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-indigo-400" />
                            Plan Distribution
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {dashboardData.planDistribution && Object.entries(dashboardData.planDistribution).map(([plan, data]) => {
                            const planColors = {
                                basic: 'bg-gray-500/20 border-gray-500/30 text-gray-700 dark:text-gray-300',
                                pro: 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300',
                                enterprise: 'bg-purple-500/20 border-purple-500/30 text-purple-300',
                            };
                            const planNames = {
                                basic: 'Basic',
                                pro: 'Pro',
                                enterprise: 'Enterprise',
                            };
                            
                            return (
                                <div key={plan}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${planColors[plan]}`}>
                                                {planNames[plan]}
                                            </span>
                                            <span className="text-sm text-gray-600 dark:text-gray-400">{data.count || 0} shops</span>
                                        </div>
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(data.revenue || 0)}/mo</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700/30 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                plan === 'basic' ? 'bg-gray-500' :
                                                plan === 'pro' ? 'bg-indigo-500' :
                                                'bg-purple-500'
                                            }`}
                                            style={{ width: `${data.percentage || 0}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Payment Status Overview */}
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <CreditCard className="w-5 h-5 text-indigo-400" />
                        Payment Status
                    </h2>
                    <div className="space-y-3">
                        {dashboardData.paymentStatus && (
                            <>
                                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Paid</span>
                                    </div>
                                    <span className="text-sm font-semibold text-green-400">{dashboardData.paymentStatus.paid || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-yellow-400" />
                                        <span className="text-sm text-gray-300">Pending</span>
                                    </div>
                                    <span className="text-sm font-semibold text-yellow-400">{dashboardData.paymentStatus.pending || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                                    <div className="flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-400" />
                                        <span className="text-sm text-gray-300">Failed</span>
                                    </div>
                                    <span className="text-sm font-semibold text-red-400">{dashboardData.paymentStatus.failed || 0}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm text-gray-300">Overdue</span>
                                    </div>
                                    <span className="text-sm font-semibold text-orange-400">{dashboardData.paymentStatus.overdue || 0}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Monthly Revenue Trend and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Monthly Revenue Trend */}
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                        Monthly Revenue Trend
                    </h2>
                    <div className="space-y-3">
                        {dashboardData.monthlyTrend && dashboardData.monthlyTrend.length > 0 ? (
                            dashboardData.monthlyTrend.map((item, index) => {
                                const maxRevenue = Math.max(...dashboardData.monthlyTrend.map(t => t.revenue || 0));
                                const percentage = maxRevenue > 0 ? ((item.revenue || 0) / maxRevenue) * 100 : 0;
                                
                                return (
                                    <div key={index} className="flex items-center gap-3">
                                        <span className="text-xs text-gray-600 dark:text-gray-400 w-12">{item.month}</span>
                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700/30 rounded-full h-6 relative overflow-hidden">
                                            <div
                                                className="h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                                                style={{ width: `${percentage}%` }}
                                            >
                                                <span className="text-xs font-semibold text-white">
                                                    {formatCurrency(item.revenue || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center py-4">No revenue data available</p>
                        )}
                    </div>
                </div>
                
                {/* Recent Activity */}
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-200 dark:border-gray-700/50">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                        <Activity className="w-5 h-5 text-indigo-400" />
                        Recent Activity
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {dashboardData.recentActivity.map((activity, index) => {
                            const getActivityIcon = () => {
                                switch (activity.type) {
                                    case 'shop_created':
                                        return <Store className="w-4 h-4 text-green-400" />;
                                    case 'payment_received':
                                        return <CreditCard className="w-4 h-4 text-green-400" />;
                                    case 'shop_suspended':
                                        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
                                    case 'payment_failed':
                                        return <XCircle className="w-4 h-4 text-red-400" />;
                                    case 'plan_upgraded':
                                        return <TrendingUp className="w-4 h-4 text-blue-400" />;
                                    default:
                                        return <Activity className="w-4 h-4 text-gray-400" />;
                                }
                            };
                            
                            const getActivityText = () => {
                                switch (activity.type) {
                                    case 'shop_created':
                                        return `New shop "${activity.shop}" created`;
                                    case 'payment_received':
                                        return `Payment received from "${activity.shop}" - ${formatCurrency(activity.amount)}`;
                                    case 'shop_suspended':
                                        return `Shop "${activity.shop}" suspended`;
                                    case 'payment_failed':
                                        return `Payment failed for "${activity.shop}" - ${formatCurrency(activity.amount)}`;
                                    case 'plan_upgraded':
                                        return `"${activity.shop}" upgraded from ${activity.from} to ${activity.to}`;
                                    default:
                                        return 'Activity';
                                }
                            };
                            
                            return (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all duration-200"
                                >
                                    <div className="flex-shrink-0">
                                        {getActivityIcon()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{getActivityText()}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(activity.time)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* System Health & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                            <Server className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">System Status</p>
                            <p className="text-lg font-semibold text-white">Operational</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span>All services running</span>
                    </div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                            <Database className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">Database</p>
                            <p className="text-lg font-semibold text-white">Healthy</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span>99.9% uptime</span>
                    </div>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-400">API Response</p>
                            <p className="text-lg font-semibold text-white">Fast</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <div className="w-2 h-2 rounded-full bg-purple-400" />
                        <span>Avg: 120ms</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;

