import React, {useMemo} from 'react'
import StatCard from './StatCard';
import {DollarSign, CreditCard, Users, Package, AlertTriangle, List} from 'lucide-react'; 

const USER_ROLES = {
  OWNER: 'owner', // Can access all reports, inventory management, settings
  CASHIER: 'cashier', // Can only access BillingPOS and basic Khata view
};

const Dashboard = ({ inventory, sales, customers, userRole }) => {
  const isOwner = userRole === USER_ROLES.OWNER;
  
  // Calculate Today's Report
  const today = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySales = sales.filter(s => new Date(s.timestamp) > startOfDay);

    const totalSales = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCreditGiven = todaySales
      .filter(s => s.paymentMethod === 'Credit')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    return { totalSales, totalCreditGiven };
  }, [sales]);

  // Calculate Khata/Credit Summary
  const totalOutstandingCredit = useMemo(() => {
    return customers.reduce((sum, cust) => sum + cust.outstandingCredit, 0);
  }, [customers]);

  // Inventory Alerts
  const lowStockAlerts = useMemo(() => {
    return inventory.filter(item => (item.quantity || 0) <= (item.reorderLevel || 0)).slice(0, 5);
  }, [inventory]);

  // Get the most recent 5 sales
  const recentSales = useMemo(() => {
    return sales
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5); 
  }, [sales]);

  // Utility to format time
  const formatTimeAgo = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
  };
  
  if (!isOwner) {
    return (
      <div className="p-4 md:p-8 text-center h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Access Denied</h2>
        <p className="text-gray-500 dark:text-gray-400">You do not have permission to view the main dashboard. Please proceed to the Billing screen.</p>
      </div>
    );
  }

  return (
    // 🌟 FIX: Use h-full and flex-col to enable inner scrolling
    <div className="p-4 md:p-8 h-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        
        {/* FIXED HEADER SECTION (Caption and Description) */}
        {/* We keep the horizontal padding applied by the parent div, but remove the sticky classes. */}
        <div className="pb-4 border-b border-gray-200 dark:border-gray-800">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Owner's Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Quick overview of your shop's health.</p>
        </div>

        {/* 🌟 SCROLLABLE CONTENT AREA */}
        <div className="flex-grow overflow-y-auto pt-4">

            {/* Today's Report - Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Today's Total Sales" value={today.totalSales.toFixed(2)} unit="₹" icon={DollarSign} colorClass="text-green-600" />
                <StatCard title="Today's New Credit" value={today.totalCreditGiven.toFixed(2)} unit="₹" icon={CreditCard} colorClass="text-yellow-600" />
                <StatCard title="Total Credit Outstanding" value={totalOutstandingCredit.toFixed(2)} unit="₹" icon={Users} colorClass="text-red-600" />
            </div>

            {/* Main Content: 3-column layout for detailed views */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
                {/* Inventory Health Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col transition-colors duration-300">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center mb-5 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <Package className="w-5 h-5 mr-2 text-indigo-500" /> Inventory Alerts ({lowStockAlerts.length})
                </h2>
                <div className="flex-grow">
                    {lowStockAlerts.length > 0 ? (
                    <ul className="space-y-3 pt-2">
                        {lowStockAlerts.map((item) => (
                        <li key={item._id || item.id} className="flex justify-between items-center text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
                            <span className="font-medium text-red-800 dark:text-red-300 truncate">{item.name}</span>
                            <span className="text-red-600 dark:text-red-400 text-xs font-semibold whitespace-nowrap">Stock: {item.quantity} (Reorder: {item.reorderLevel})</span>
                        </li>
                        ))}
                    </ul>
                    ) : (
                    <p className="text-gray-500 dark:text-gray-400 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center text-sm font-medium">All inventory levels look great!</p>
                    )}
                </div>
                </div>

                {/* Khata (Credit) Status Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col transition-colors duration-300">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center mb-5 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <Users className="w-5 h-5 mr-2 text-blue-500" /> Top Credit Holders
                </h2>
                <div className="flex-grow">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700 pt-2">
                    {customers.length > 0 ? (
                        customers
                        .filter(cust => cust.outstandingCredit > 0)
                        .sort((a, b) => b.outstandingCredit - a.outstandingCredit)
                        .slice(0, 5)
                        .map((cust) => (
                            <li key={cust._id || cust.id} className="py-3 flex justify-between items-center text-sm">
                            <span className="truncate w-1/2 font-medium text-gray-700 dark:text-gray-300">{cust.name}</span>
                            <span className={`font-bold text-lg whitespace-nowrap ${cust.outstandingCredit > 1000 ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-300'}`}>
                                ₹{cust.outstandingCredit.toFixed(2)}
                            </span>
                            </li>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center font-medium">No customers currently owe credit.</p>
                    )}
                    </ul>
                </div>
                </div>
                
                {/* Recent Sales Activity Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col transition-colors duration-300">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center mb-5 border-b border-gray-100 dark:border-gray-700 pb-3">
                    <List className="w-5 h-5 mr-2 text-green-500" /> Recent Sales Activity
                </h2>
                <div className="flex-grow">
                    <ul className="divide-y divide-gray-100 dark:divide-gray-700 pt-2">
                    {recentSales.length > 0 ? (
                        recentSales.map((sale) => (
                        <li key={sale._id || sale.id} className="py-3 flex justify-between items-center text-sm">
                            <div className="flex items-center space-x-3">
                            <span className="font-bold text-gray-800 dark:text-gray-200 text-base">₹{sale.totalAmount.toFixed(2)}</span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    sale.paymentMethod === 'Credit' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 
                                    sale.paymentMethod === 'Cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 
                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                }`}>
                                {sale.paymentMethod}
                            </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatTimeAgo(sale.timestamp)}
                            </span>
                        </li>
                        ))
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center font-medium">No sales recorded yet.</p>
                    )}
                    </ul>
                </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard