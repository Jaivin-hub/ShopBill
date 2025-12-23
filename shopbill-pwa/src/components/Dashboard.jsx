import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatCard from './StatCard';
import { IndianRupee, CreditCard, Users, Package, AlertTriangle, List, Loader, ArrowRight } from 'lucide-react';

const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CASHIER: 'cashier',
};

// UPDATED: Fixed to Permanent Dark Theme
const Dashboard = ({ userRole, apiClient, API, showToast, onViewAllSales, onViewAllInventory, onViewAllCredit, onViewSaleDetails }) => {
  const hasAccess = userRole === USER_ROLES.OWNER || userRole === USER_ROLES.MANAGER;
  const isOwner = userRole === USER_ROLES.OWNER;

  // 1. Data States
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. Data Fetching Function
  const fetchDashboardData = useCallback(async () => {
    console.log('this fetchDashboardData function is invoking')
    setIsLoading(true);
    try {
      const [invResponse, custResponse, salesResponse] = await Promise.all([
        apiClient.get(API.inventory),
        apiClient.get(API.customers),
        apiClient.get(API.sales),
      ]);

      setInventory(invResponse.data);
      setCustomers(custResponse.data);
      setSales(salesResponse.data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      showToast('Error loading dashboard data. Please check server connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [apiClient, API.inventory, API.customers, API.sales, showToast]);

  // 3. Initial Data Loading Effect
  useEffect(() => {
    if (hasAccess) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAccess,fetchDashboardData]);


  // --- DATA CALCULATIONS ---

  const today = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todaySales = sales.filter(s => new Date(s.timestamp) > startOfDay);

    const totalSales = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalCreditGiven = todaySales
      .filter(s => s.paymentMethod === 'Credit' || s.paymentMethod === 'Mixed')
      .reduce((sum, sale) => sum + sale.amountCredited, 0);

    return { totalSales, totalCreditGiven };
  }, [sales]);

  const customersWithCredit = useMemo(() => {
    return customers.filter(cust => cust.outstandingCredit > 0);
  }, [customers]);

  const totalOutstandingCredit = useMemo(() => {
    return customers.reduce((sum, cust) => sum + cust.outstandingCredit, 0);
  }, [customers]);

  const topCreditHolders = useMemo(() => {
    return customersWithCredit
      .sort((a, b) => b.outstandingCredit - a.outstandingCredit)
      .slice(0, 5);
  }, [customersWithCredit]);

  const allLowStockAlerts = useMemo(() => {
    return inventory.filter(item => (item.quantity || 0) <= (item.reorderLevel || 0));
  }, [inventory]);

  const lowStockAlerts = useMemo(() => {
    return allLowStockAlerts.slice(0, 5);
  }, [allLowStockAlerts]);

  const recentSales = useMemo(() => {
    return sales
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
  }, [sales]);

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


  // --- RENDER LOGIC ---

  if (!hasAccess) {
    return (
      <div className="p-4 md:p-8 text-center h-full flex flex-col items-center justify-center bg-gray-950">
        <AlertTriangle className="w-12 h-12 text-indigo-400 mb-4" />
        <h2 className="text-xl font-semibold text-white">Access Denied</h2>
        <p className="text-gray-400">You do not have permission to view the main dashboard. Please proceed to the Billing screen.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950">
        <Loader className="w-10 h-10 animate-spin text-teal-400" />
        <p className='mt-3'>Loading dashboard summary data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white transition-colors duration-300"> 
      
      <div className="p-4 md:p-8 flex-shrink-0"> 
        <h1 className="text-3xl font-extrabold text-white mb-2">Owner's Dashboard</h1>
        <p className="text-gray-400">Quick overview of your shop's health.</p>
      </div>

      <div className="flex-grow overflow-y-auto px-4 md:px-8 pb-8"> 

        {/* Today's Report - Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Today's Total Sales"
            value={today.totalSales.toFixed(2)}
            unit="₹"
            icon={IndianRupee}
            colorClass="text-teal-400"
            bgColor="bg-gray-900"
          />
          <StatCard
            title="Today's New Credit Given"
            value={today.totalCreditGiven.toFixed(2)}
            unit="₹"
            icon={CreditCard}
            colorClass="text-indigo-400"
            bgColor="bg-gray-900"
          />
          <StatCard
            title="Total Credit Outstanding"
            value={totalOutstandingCredit.toFixed(2)}
            unit="₹"
            icon={Users}
            colorClass="text-red-400"
            bgColor="bg-gray-900"
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Inventory Health Card */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg shadow-indigo-900/20 border border-gray-800 flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-gray-800 pb-3">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Package className="w-5 h-5 mr-2 text-teal-400" /> Inventory Alerts
              </h2>
              {allLowStockAlerts.length > 0 && (
                <button
                  onClick={onViewAllInventory}
                  className="cursor-pointer flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors duration-150 p-1 rounded-md -mr-1"
                >
                  {allLowStockAlerts.length > 1 ? 'View All' : 'View'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>

            <div className="flex-grow">
              {lowStockAlerts.length > 0 ? (
                <ul className="space-y-3 pt-2">
                  {lowStockAlerts.map((item) => (
                    <li key={item._id || item.id} className="flex justify-between items-center text-sm p-3 bg-red-900/40 rounded-lg border border-red-700 shadow-sm">
                      <span className="font-medium text-red-300 truncate">{item.name}</span>
                      <span className="text-red-400 text-xs font-semibold whitespace-nowrap">Stock: {item.quantity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400 text-sm p-4 bg-green-900/20 rounded-lg border border-green-700 text-center font-medium">All inventory levels look great!</p>
              )}
            </div>
          </div>

          {/* Khata (Credit) Status Card */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg shadow-indigo-900/20 border border-gray-800 flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-gray-800 pb-3">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-400" /> Top Credit Holders
              </h2>
              {customersWithCredit.length > 0 && (
                <button
                  onClick={onViewAllCredit}
                  className="cursor-pointer flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors duration-150 p-1 rounded-md -mr-1"
                >
                  {customersWithCredit.length > 1 ? 'View All' : 'View'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>

            <div className="flex-grow">
              <ul className="divide-y divide-gray-800 pt-2">
                {topCreditHolders.length > 0 ? (
                  topCreditHolders.map((cust) => (
                    <li key={cust._id || cust.id} className="py-3 flex justify-between items-center text-sm">
                      <span className="truncate w-1/2 font-medium text-gray-300">{cust.name}</span>
                      <span className={`font-bold text-lg whitespace-nowrap ${cust.outstandingCredit > 1000 ? 'text-red-400' : 'text-yellow-400'}`}>
                        ₹{cust.outstandingCredit.toFixed(2)}
                      </span>
                    </li>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm p-4 bg-indigo-900/20 rounded-lg border border-indigo-700 text-center font-medium">No customers currently owe credit.</p>
                )}
              </ul>
            </div>
          </div>

          {/* Recent Sales Activity Card */}
          <div className="bg-gray-900 p-6 rounded-xl shadow-lg shadow-indigo-900/20 border border-gray-800 flex flex-col">
            <div className="flex justify-between items-center mb-5 border-b border-gray-800 pb-3">
              <h2 className="text-xl font-semibold text-white flex items-center">
                <List className="w-5 h-5 mr-2 text-teal-400" /> Recent Sales Activity
              </h2>
              {sales.length > 0 && (
                <button
                  onClick={onViewAllSales}
                  className="cursor-pointer flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors duration-150 p-1 rounded-md -mr-1"
                >
                  {sales.length > 1 ? 'View All' : 'View'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              )}
            </div>

            <div className="flex-grow">
              <ul className="divide-y divide-gray-800 pt-2">
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => {
                    let paymentDisplay = sale.paymentMethod;
                    let colorClass = 'bg-gray-700 text-gray-400 border border-gray-600';

                    if (sale.paymentMethod === 'Credit') {
                      paymentDisplay = `Due`;
                      colorClass = 'bg-red-900/40 text-red-300 border border-red-700';
                    } else if (sale.paymentMethod === 'UPI' || sale.paymentMethod === 'Cash') {
                      paymentDisplay = 'Paid';
                      colorClass = 'bg-green-900/40 text-green-300 border border-green-700';
                    }

                    return (
                      <li key={sale._id || sale.id} className="py-3 flex justify-between items-center text-sm">
                        <div className="flex flex-grow justify-between items-center">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-teal-400 text-base">₹{sale.totalAmount.toFixed(2)}</span>
                            {sale.paymentMethod === 'Mixed' ? (
                              <>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-green-900/40 text-green-300 border border-green-700">
                                  Paid: ₹{sale.amountPaid.toFixed(0)}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-900/40 text-red-300 border border-red-700">
                                  Due: ₹{sale.amountCredited.toFixed(0)}
                                </span>
                              </>
                            ) : (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${colorClass}`}>
                                {paymentDisplay}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTimeAgo(sale.timestamp)}
                            </span>
                            {onViewSaleDetails && (
                              <button
                                onClick={() => onViewSaleDetails(sale)}
                                className="p-1 rounded-full text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors duration-200"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-sm p-4 bg-gray-800 rounded-lg border border-gray-700 text-center font-medium">No sales recorded yet.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;