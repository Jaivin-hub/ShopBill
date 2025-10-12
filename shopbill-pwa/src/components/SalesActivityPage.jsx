import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, Calendar, TrendingUp, Eye, X, User, ArrowDownWideNarrow, Clock } from 'lucide-react'; 
import API from '../config/api';


// --- Date Range Picker Component (Simplified) ---

const DateRangeFilter = ({ dateRange, onDateRangeChange }) => {
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

// --- Helper function to format relative time ---
const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} days ago`;
    
    return past.toLocaleDateString();
};


// --- Bill Modal Component ---
const BillModal = ({ sale, onClose, isLoading }) => {
    if (!sale && isLoading) {
        return (
             <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full transform transition-all overflow-hidden p-8 text-center">
                    <p className="text-lg text-indigo-600 dark:text-indigo-400">Loading bill details...</p>
                </div>
            </div>
        );
    }

    if (!sale) return null;

    const customerName = sale.customerName || sale.customerId?.name || 'Walk-in Customer'; 
    const isCredit = sale.amountCredited > 0;
    const paidAmount = sale.amountPaid !== undefined ? sale.amountPaid : (sale.totalAmount - sale.amountCredited); 
    
    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full transform transition-all overflow-hidden">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Sale Bill (ID: {sale._id ? sale._id.substring(0, 8) : 'N/A'})</h3>
                    <button 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close Bill"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Modal Body (Item List) */}
                <div className="p-5 max-h-[70vh] overflow-y-auto">
                    <div className="mb-4 space-y-1">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Customer: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{customerName}</span></p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Time: {new Date(sale.timestamp).toLocaleString()}</p>
                    </div>

                    <h4 className="font-semibold text-gray-700 dark:text-gray-200 mb-2 border-t pt-3 border-gray-200 dark:border-gray-700">Products Purchased:</h4>
                    <ul className="space-y-2 pb-3">
                        {sale.items && sale.items.length > 0 ? (
                            sale.items.map((item, index) => (
                                <li key={index} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                                    <span className="truncate pr-2">
                                        {item.quantity} x {(item.itemId?.name || item.name || 'Product')}
                                        <span className='ml-2 text-gray-400 dark:text-gray-500'>(@ ₹{item.price.toFixed(2)} each)</span>
                                    </span>
                                    <span className="font-medium whitespace-nowrap">₹{(item.quantity * item.price).toFixed(2)}</span>
                                </li>
                            ))
                        ) : (
                            <li className="text-gray-500 italic">No item details available.</li>
                        )}
                    </ul>

                    {/* Totals Section */}
                    <div className="mt-4 space-y-2 border-t border-gray-300 dark:border-gray-700 pt-3">
                        <div className="flex justify-between font-medium text-base text-gray-800 dark:text-gray-100">
                            <span>SUBTOTAL</span>
                            <span>₹{sale.totalAmount.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex justify-between font-bold text-xl text-indigo-600 dark:text-indigo-400 border-t border-dashed border-gray-300 dark:border-gray-700 pt-2">
                            <span>GRAND TOTAL</span>
                            <span>₹{sale.totalAmount.toFixed(2)}</span>
                        </div>
                        
                        {isCredit && (
                            <div className="space-y-1 pt-2">
                                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                                    <span>Amount Paid</span>
                                    <span>₹{paidAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between font-semibold text-base text-red-600 dark:text-red-400">
                                    <span>Credit Due</span>
                                    <span>₹{sale.amountCredited.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-5 bg-gray-50 dark:bg-gray-700 text-right">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Sales Activity Component ---

const SalesActivityPage = ({ salesData, apiClient, showToast }) => {
    
    // MOCK API Client Structure (Needed for standalone runnability)
    const mockApiClient = {
        get: async (endpoint) => {
            console.warn(`[MOCK API] GET ${endpoint}`);
            // Mock data structure matching the expected format
            const baseData = [
                { _id: 'sale_a123', timestamp: Date.now() - 3600000, totalAmount: 550.00, amountCredited: 0, customerName: 'Rajesh Sharma', amountPaid: 550.00 },
                { _id: 'sale_b456', timestamp: Date.now() - 10800000, totalAmount: 1200.50, amountCredited: 200.00, customerName: 'Priya Singh', amountPaid: 1000.50 },
                { _id: 'sale_c789', timestamp: Date.now() - 86400000, totalAmount: 75.25, amountCredited: 0, customerName: 'Walk-in Customer', amountPaid: 75.25 },
                { _id: 'sale_d012', timestamp: Date.now() - 172800000, totalAmount: 3450.00, amountCredited: 1500.00, customerName: 'Akash Patel', amountPaid: 1950.00 },
                { _id: 'sale_e345', timestamp: Date.now() - 259200000, totalAmount: 150.00, amountCredited: 0, customerName: 'Rajesh Sharma', amountPaid: 150.00 },
                { _id: 'sale_f678', timestamp: Date.now() - 360000000, totalAmount: 880.00, amountCredited: 880.00, customerName: 'Zoya Khan', amountPaid: 0.00 },
            ];

            if (endpoint.includes(API.sales) && !endpoint.includes('/sale_')) {
                return { data: baseData };
            } else if (endpoint.includes('/sale_a123')) {
                 return {
                    data: {
                        _id: 'sale_a123', timestamp: Date.now() - 3600000, totalAmount: 550.00, amountCredited: 0, customerName: 'Rajesh Sharma', amountPaid: 550.00,
                        items: [
                            { name: 'T-Shirt (Blue)', quantity: 2, price: 200.00 },
                            { name: 'Jeans (Black)', quantity: 1, price: 150.00 },
                        ]
                    }
                };
            }
             return { data: baseData.find(s => endpoint.includes(s._id)) || {} };
        }
    };
    
    const activeApiClient = apiClient || mockApiClient;
    
    const [sales, setSales] = useState(salesData || []); 
    const [isLoadingSales, setIsLoadingSales] = useState(false); 
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    const [searchQuery, setSearchQuery] = useState(''); 
    // State to toggle between showing no controls, the search bar, or the sort dropdown
    // 'none': shows icons. 'search': shows search bar. 'sort': shows sort dropdown.
    const [activeControl, setActiveControl] = useState('none'); 
    
    // Default date range state
    const today = new Date().toISOString().split('T')[0]; 
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [dateRange, setDateRange] = useState({
        startDate: last7Days,
        endDate: today,
    });

    // State for sorting option, default to newest first
    const [sortOption, setSortOption] = useState('timeDesc'); 
    
    
    // Effect to fetch sales data when component mounts or dateRange changes
    useEffect(() => {
        if (!activeApiClient || !API.sales) {
            console.warn("API Client or Sales endpoint not available. Using provided salesData or empty array.");
            if (!salesData) setSales([]);
            return;
        }

        const fetchSales = async () => {
            setIsLoadingSales(true);
            try {
                // Construct query parameters for the date range
                const params = new URLSearchParams();
                if (dateRange.startDate) {
                    params.append('startDate', new Date(dateRange.startDate).toISOString());
                }
                if (dateRange.endDate) {
                    const endDate = new Date(dateRange.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    params.append('endDate', endDate.toISOString());
                }

                const endpoint = `${API.sales}?${params.toString()}`;
                const response = await activeApiClient.get(endpoint);
                
                if (response.data && Array.isArray(response.data)) {
                    setSales(response.data); 
                } else {
                    console.error('Invalid sales data format received:', response.data);
                    setSales([]);
                }
            } catch (error) {
                console.error('Error fetching sales list:', error);
                showToast && showToast('Failed to load sales activity.', 'error');
                setSales([]);
            } finally {
                setIsLoadingSales(false);
            }
        };

        fetchSales();
    }, [dateRange, activeApiClient, showToast]); 
    
    
    // Function to fetch full sale details when 'View' is clicked
    const fetchSaleDetail = async (saleId) => {
        
        if (!activeApiClient || !API.sales) {
            showToast && showToast('API client is not configured.', 'error');
            return;
        }

        setIsFetchingDetail(true);
        setSelectedSaleDetail(null);
        setIsModalOpen(true);
        try {
            const endpoint = `${API.sales}/${saleId}`; 
            const response = await activeApiClient.get(endpoint);
            
            if (response.data) {
                setSelectedSaleDetail(response.data);
            } else {
                throw new Error('No data returned.');
            }
        } catch (error) {
            console.error('Error fetching sale details:', error);
            showToast && showToast('Failed to load bill details.', 'error');
            setSelectedSaleDetail(null);
        } finally {
            setIsFetchingDetail(false);
        }
    };


    // Filter and Sort the sales data based on the current date range and sort option
    const filteredSales = useMemo(() => {
        let currentSales = Array.isArray(sales) ? [...sales] : [];

        // 1. Filtering based on Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            currentSales = currentSales.filter(sale => {
                // Check against customer name (or fallback) and sale ID
                const customerName = (sale.customerName || sale.customerId?.name || 'Walk-in Customer').toLowerCase();
                const saleId = sale._id ? sale._id.toLowerCase() : '';
                
                return customerName.includes(query) || saleId.includes(query);
            });
        }

        // 2. Apply sorting based on the selected option
        let sortedSales = currentSales;

        switch (sortOption) {
            case 'creditDesc':
                // Sort by amountCredited (highest credit first)
                sortedSales.sort((a, b) => (b.amountCredited || 0) - (a.amountCredited || 0));
                break;
            case 'customerAsc':
                // Sort by customer name alphabetically (A-Z)
                sortedSales.sort((a, b) => {
                    // Use customerName or fallback to 'Walk-in Customer'
                    const nameA = (a.customerName || a.customerId?.name || 'Walk-in Customer').toUpperCase();
                    const nameB = (b.customerName || b.customerId?.name || 'Walk-in Customer').toUpperCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                });
                break;
            case 'timeDesc':
            default:
                // Sort by timestamp descending (Newest first)
                sortedSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
        }
        
        return sortedSales;
    }, [sales, sortOption, searchQuery]); // Added searchQuery as dependency

    // Calculate Summary Metrics for the filtered range
    const summaryMetrics = useMemo(() => {
        const totalSalesValue = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
        const totalCredit = filteredSales.reduce((sum, sale) => sum + (sale.amountCredited || 0), 0);
        
        return {
            totalSalesCount: filteredSales.length,
            totalSalesValue: totalSalesValue,
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
                
                {/* Filters Controls - Date Range Filter remains */}
                <div className="flex flex-col gap-4">
                    {/* Date Range Filter */}
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800">
                        {/* <h2 className="text-base font-semibold text-gray-900 dark:text-white flex items-center mb-3">
                            <Calendar className="w-5 h-5 mr-2 text-teal-600 dark:text-teal-400" /> Date Range
                        </h2> */}
                        <DateRangeFilter 
                            dateRange={dateRange} 
                            onDateRangeChange={setDateRange} 
                        />
                    </div>
                </div>
            </div>

            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8">
                {/* Total Sales Count */}
                <div className="bg-white dark:bg-gray-900 p-3 sm:p-5 rounded-xl shadow border border-gray-200 dark:border-gray-800">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Total Transactions</p>
                    <div className="flex items-center mt-1">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-indigo-500" />
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{summaryMetrics.totalSalesCount}</span>
                    </div>
                </div>

                {/* Gross Sales Value */}
                <div className="bg-white dark:bg-gray-900 p-3 sm:p-5 rounded-xl shadow border border-gray-200 dark:border-gray-800">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Gross Sales Value</p>
                    <div className="flex items-center mt-1">
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-teal-500" />
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{summaryMetrics.totalSalesValue.toFixed(2)}</span>
                    </div>
                </div>

                {/* Total Credit Given */}
                <div className="bg-white dark:bg-gray-900 p-3 sm:p-5 rounded-xl shadow border border-gray-200 dark:border-gray-800">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Credit Given</p>
                    <div className="flex items-center mt-1">
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 text-red-500" />
                        <span className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{summaryMetrics.totalCreditGiven.toFixed(2)}</span>
                    </div>
                </div>
            </div>


            {/* Sales List */}
            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                
                {/* Integrated List Header, Search, and Sort Control (Expanded/Collapsed) */}
                <div className="flex justify-between items-center mb-4">
                    
                    {/* Caption - Hides on small screens when a control is active */}
                    <h2 className={`text-xl font-semibold text-gray-900 dark:text-white transition-opacity duration-200 ${activeControl !== 'none' ? 'hidden sm:block sm:opacity-50 sm:flex-shrink' : 'flex-shrink-0'}`}>
                        Sales History ({filteredSales.length} {filteredSales.length === 1 ? 'Entry' : 'Entries'})
                    </h2>

                    {/* Controls Container */}
                    <div className={`flex items-center space-x-3 transition-all duration-300 ease-in-out ${activeControl !== 'none' ? 'w-full sm:w-auto ml-0 sm:ml-auto' : 'ml-auto flex-shrink-0'}`}>
                        
                        {/* Default Icons View (Shows only if activeControl is 'none') */}
                        {activeControl === 'none' && (
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setActiveControl('search')}
                                    className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors shadow-md"
                                    title="Search Sales"
                                    aria-label="Toggle Search"
                                >
                                    {/* Search Icon (SVG) */}
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setActiveControl('sort')}
                                    className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors shadow-md"
                                    title="Sort Sales"
                                    aria-label="Toggle Sort Options"
                                >
                                    <ArrowDownWideNarrow className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Search Input View (Shows only if activeControl is 'search') */}
                        {activeControl === 'search' && (
                            <div className="relative flex items-center flex-grow max-w-lg w-full">
                                <input
                                    type="text"
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-10 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 transition-colors w-full"
                                />
                                {/* Search Icon */}
                                <svg className="absolute left-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                                <button
                                    onClick={() => { setActiveControl('none'); setSearchQuery(''); }}
                                    className="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Clear Search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                        
                        {/* Sorting Dropdown View (Shows only if activeControl is 'sort') */}
                        {activeControl === 'sort' && (
                            <div className="flex items-center space-x-2 flex-grow max-w-lg w-full justify-end">
                                {/* Sort Icon for visual context */}
                                <ArrowDownWideNarrow className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 hidden sm:block" />
                                <select
                                    value={sortOption}
                                    onChange={(e) => setSortOption(e.target.value)}
                                    className="p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 transition-colors flex-grow min-w-[150px]"
                                    aria-label="Sort Sales By"
                                >
                                    <option value="timeDesc">Newest</option>
                                    <option value="creditDesc">Credit Due (High to Low)</option>
                                    <option value="customerAsc">Customer Name (A-Z)</option>
                                </select>
                                <button
                                    onClick={() => setActiveControl('none')}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                                    title="Close Sort"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                
                {isLoadingSales ? (
                     <div className="py-12 text-center text-lg text-indigo-600 dark:text-indigo-400">
                        <svg className="animate-spin h-8 w-8 text-indigo-600 dark:text-indigo-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading sales data...
                    </div>
                ) : filteredSales.length === 0 ? (
                         <div className="py-12 text-center text-lg text-gray-500 dark:text-gray-400">
                            No sales records found for the current filter/search.
                        </div>
                ) : (
                    /* List Container */
                    <div className="space-y-3">
                        {filteredSales.map((sale) => {
                            const key = sale._id; 
                            const amountCreditedSafe = sale.amountCredited || 0;
                            const isCredit = amountCreditedSafe > 0;
                            const amountPaid = sale.amountPaid !== undefined ? sale.amountPaid : (sale.totalAmount - amountCreditedSafe);
                            const customerName = sale.customerName || sale.customerId?.name || 'Walk-in Customer';

                            return (
                                <div 
                                    key={key} 
                                    // UPDATED: Removed border-l-4 and added border border-transparent for a subtle hover outline
                                    className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl shadow-lg transition-all duration-200 border border-transparent hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                    onClick={() => fetchSaleDetail(key)}
                                >
                                    {/* TOP ROW: Customer Name and Time Ago */}
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center">
                                            <User className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0" />
                                            <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate max-w-[calc(100vw-200px)] sm:max-w-none">
                                                {customerName}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                                            <Clock className="w-3 h-3"/>
                                            <span>{formatTimeAgo(sale.timestamp)}</span>
                                        </div>
                                    </div>

                                    {/* BOTTOM ROW: Amount, Badges, and View Action */}
                                    <div className="flex justify-between items-center">
                                        
                                        {/* Amount */}
                                        <div className={`text-2xl font-extrabold flex items-center ${isCredit ? 'text-red-600 dark:text-red-400' : 'text-teal-600 dark:text-teal-400'}`}>
                                            <IndianRupee className="w-5 h-5 mr-1 translate-y-[1px]"/>
                                            {sale.totalAmount.toFixed(2)}
                                        </div>
                                        
                                        {/* Financial Status Badges */}
                                        <div className="flex items-center space-x-2 text-xs">
                                            {isCredit ? (
                                                <>
                                                    <span className="font-semibold px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 whitespace-nowrap">
                                                        Due: ₹{amountCreditedSafe.toFixed(0)}
                                                    </span>
                                                    {amountPaid > 0 && (
                                                        <span className="font-semibold px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 whitespace-nowrap">
                                                            Paid: ₹{amountPaid.toFixed(0)}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="font-semibold px-3 py-1 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 whitespace-nowrap">
                                                    Payment Complete
                                                </span>
                                            )}
                                        </div>

                                        {/* View Button */}
                                        <button
                                            // Since the entire div is clickable, this button is less prominent
                                            // but serves as a clear visual anchor for the action.
                                            className="p-1 rounded-full text-indigo-500 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                                            title="View Bill Details"
                                            onClick={(e) => {
                                                // Prevent the outer div click event from triggering twice
                                                e.stopPropagation(); 
                                                fetchSaleDetail(key);
                                            }}
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Bill Modal */}
            {isModalOpen && (
                <BillModal 
                    sale={selectedSaleDetail} 
                    onClose={() => setIsModalOpen(false)}
                    isLoading={isFetchingDetail}
                />
            )}
        </div>
    );
};

export default SalesActivityPage;
