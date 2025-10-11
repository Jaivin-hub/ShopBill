import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, Filter, ArrowRight, Calendar, TrendingUp } from 'lucide-react';

// You will need a simple Date Range Picker component. Since we are using standard components,
// I'll create a simplified mock component to manage the date state.
// In a real project, you would install a library like 'react-tailwindcss-datepicker' or build one.

// --- Mock Date Range Picker Component (Replace with a real library in production) ---

const DateRangeFilter = ({ dateRange, onDateRangeChange }) => {
    // This is a simple Tailwind-styled input pair for start and end dates.
    // In a real app, this would be a sophisticated picker component.
    return (
        <div className="flex items-center space-x-3 text-sm">
            <Calendar className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
        </div>
    );
};

// --- Main Sales Activity Component ---

const SalesActivityPage = ({ salesData, API, apiClient, showToast }) => {
    console.log('salesData//++',salesData)
    const [sales, setSales] = useState(salesData);
    const [isLoading, setIsLoading] = useState(false);
    
    const today = new Date().toISOString().split('T')[0]; // Default to today's date
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [dateRange, setDateRange] = useState({
        startDate: last7Days,
        endDate: today,
    });
    
    // In a real app, you would fetch all sales data here or when the component mounts.
    // For this example, we'll use the 'salesData' prop for mock data.
    
    // This effect is here in case you want to implement a fetch function when the date range changes
    // useEffect(() => {
    //     // fetchSalesByDateRange(dateRange.startDate, dateRange.endDate);
    // }, [dateRange]);


    // Filter the sales data based on the current date range
    const filteredSales = useMemo(() => {
        // Convert date strings to Date objects for comparison
        const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
        const end = dateRange.endDate ? new Date(dateRange.endDate) : null;

        // Normalize end date to include the entire day (up to 23:59:59)
        if (end) {
            end.setHours(23, 59, 59, 999);
        }

        if (!start || !end) {
            // If no range is selected, return all sales or handle as an error/default view
            return sales;
        }

        return sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= start && saleDate <= end;
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort newest first

    }, [sales, dateRange]);

    // Calculate Summary Metrics for the filtered range
    const summaryMetrics = useMemo(() => {
        const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalCredit = filteredSales
            .filter(s => s.paymentMethod === 'Credit' || s.paymentMethod === 'Mixed')
            .reduce((sum, sale) => sum + sale.amountCredited, 0);
        
        return {
            totalSalesCount: filteredSales.length,
            totalRevenue: totalAmount,
            totalCreditGiven: totalCredit,
        };
    }, [filteredSales]);


    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
            
            {/* Header and Filters Section */}
            <div className="pb-4 border-b border-gray-200 dark:border-gray-800 mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-4 flex items-center">
                    Sales Activity Report
                </h1>
                
                {/* Date Range Filter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                        <Filter className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" /> Filter by Date Range
                    </h2>
                    <DateRangeFilter 
                        dateRange={dateRange} 
                        onDateRangeChange={setDateRange} 
                    />
                </div>
            </div>

            {/* Sales Table */}
            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Sales Details ({filteredSales.length} {filteredSales.length === 1 ? 'Entry' : 'Entries'})
                </h2>
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Method</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Credit Due</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {filteredSales.map((sale) => (
                                <tr key={sale._id || sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                        {new Date(sale.timestamp).toLocaleDateString()}
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {new Date(sale.timestamp).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                        {sale.customerName || 'Walk-in Customer'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-right text-teal-600 dark:text-teal-400">
                                        ₹{sale.totalAmount.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            sale.paymentMethod === 'Credit' || sale.paymentMethod === 'Mixed'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                                : 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                        }`}>
                                            {sale.paymentMethod}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600 dark:text-red-400">
                                        {sale.amountCredited > 0 ? `₹${sale.amountCredited.toFixed(2)}` : '—'}
                                    </td>
                                </tr>
                            ))}
                            {filteredSales.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-lg text-gray-500 dark:text-gray-400">
                                        No sales records found for the selected date range.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SalesActivityPage;