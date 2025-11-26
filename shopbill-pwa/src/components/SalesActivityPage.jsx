import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, AlertTriangle, Calendar, TrendingUp, ArrowRight, X, User, ArrowDownWideNarrow, Clock, CheckCircle } from 'lucide-react';
import API from '../config/api';

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
// -------------------------------------------------------------------

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

// --- Helper function to format relative time (Unchanged) ---
const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const seconds = Math.floor((now - past) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    return past.toLocaleDateString();
};

// --- Bill Modal Component (Unchanged) ---
const BillModal = ({ sale, onClose, isLoading }) => {
    // --- Loading and Initial Check ---
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

    // --- Data Processing ---
    const customerName = sale.customerName || sale.customerId?.name || 'Walk-in Customer';
    const isCredit = sale.amountCredited > 0;
    const paidAmount = sale.amountPaid !== undefined ? sale.amountPaid : (sale.totalAmount - sale.amountCredited);
    const saleDate = new Date(sale.timestamp).toLocaleDateString();
    const saleTime = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const billId = sale._id ? sale._id.substring(0, 8).toUpperCase() : 'N/A';


    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full transform transition-all overflow-hidden border border-gray-100 dark:border-gray-700">

                {/* Modal Header/Title Section */}
                <div className="p-6 bg-indigo-500/10 dark:bg-indigo-900/20 text-center border-b border-indigo-500/30 dark:border-indigo-700/50 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white transition-colors p-1 rounded-full bg-transparent hover:bg-indigo-100/50 dark:hover:bg-indigo-800/50"
                        aria-label="Close Bill"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center justify-center mb-2">
                        <IndianRupee className="w-8 h-4 text-indigo-600 dark:text-indigo-400 mr-1" />
                        <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">SALE RECEIPT</h3>
                    </div>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-1">
                        Transaction ID: <span className="font-semibold">{billId}</span>
                    </p>
                </div>

                {/* Bill Metadata */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="flex items-center text-gray-500 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-2" />
                            Date & Time
                        </span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{saleDate} at {saleTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center text-gray-500 dark:text-gray-400">
                            <User className="w-4 h-4 mr-2" />
                            Customer
                        </span>
                        <span className={`font-bold ${isCredit ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{customerName}</span>
                    </div>
                </div>


                {/* Modal Body (Item List) */}
                <div className="p-6 max-h-[60vh] overflow-y-auto border-b border-dashed border-gray-300 dark:border-gray-700">
                    <h4 className="font-bold text-lg text-gray-700 dark:text-gray-300 mb-3">Order Summary</h4>
                    <ul className="space-y-3">
                        {sale.items && sale.items.length > 0 ? (
                            sale.items.map((item, index) => (
                                <li key={index} className="flex justify-between items-start text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-b-0">
                                    <div className='flex flex-col'>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                            {(item.itemId?.name || item.name || 'Unknown Product')}
                                        </span>
                                        <span className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                                            {item.quantity} units @ ₹{item.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                        ₹{(item.quantity * item.price).toFixed(2)}
                                    </span>
                                </li>
                            ))
                        ) : (
                            <li className="text-gray-500 italic text-center">No item details available.</li>
                        )}
                    </ul>
                </div>

                {/* Totals Section */}
                <div className="p-6 space-y-3">
                    {/* Subtotal/Total */}
                    <div className="flex justify-between font-medium text-lg text-gray-700 dark:text-gray-300">
                        <span>SUBTOTAL</span>
                        <span>₹{sale.totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Grand Total - Highlighted */}
                    <div className="flex justify-between font-extrabold text-2xl text-indigo-700 dark:text-indigo-400 border-t border-dashed border-gray-400 dark:border-gray-600 pt-3">
                        <span>TOTAL AMOUNT</span>
                        <span>₹{sale.totalAmount.toFixed(2)}</span>
                    </div>

                    {/* Credit Status */}
                    {isCredit ? (
                        <div className="space-y-1 pt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex justify-between text-base font-semibold text-green-700 dark:text-green-400">
                                <span>Amount Paid</span>
                                <span>₹{paidAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-extrabold text-xl text-red-700 dark:text-red-400">
                                <span className='flex items-center'><AlertTriangle className='w-5 h-5 mr-2' />CREDIT DUE</span>
                                <span>₹{sale.amountCredited.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center pt-3 text-lg font-bold text-green-700 dark:text-green-400">
                            <CheckCircle className='w-6 h-6 mr-2' />
                            Payment Completed
                        </div>
                    )}
                </div>

                {/* Modal Footer (Action) */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 text-center border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors transform hover:scale-[1.01]"
                    >
                        Close Receipt
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Helper Component for Metric Card (Moved inside the main file) ---
const MetricCard = ({ title, value, icon: Icon, colorClass, valueSuffix = '' }) => (
    <div className="flex flex-col p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700/50 flex-1 min-w-[150px]">
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
            <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">
            {value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-lg font-normal ml-1">{valueSuffix}</span>
        </p>
    </div>
);


// --- Main Sales Activity Component ---

const SalesActivityPage = ({ salesData, apiClient, showToast }) => {
    // Component State
    const activeApiClient = apiClient;
    const [sales, setSales] = useState(salesData || []); // Initialize with provided data or empty array
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeControl, setActiveControl] = useState('none');
    const [sortOption, setSortOption] = useState('timeDesc');

    // Date Range Initialization
    const todayDate = new Date();
    const today = getLocalDateString(todayDate); 

    const sevenDaysAgoDate = new Date(todayDate);
    sevenDaysAgoDate.setDate(todayDate.getDate() - 7);
    const last7Days = getLocalDateString(sevenDaysAgoDate);

    const [dateRange, setDateRange] = useState({
        startDate: last7Days,
        endDate: today, 
    });


    // Effect to fetch sales data when dateRange changes
    useEffect(() => {
        // Only attempt API fetch if apiClient is configured AND salesData wasn't passed initially
        const isInitialLoadWithData = (salesData && salesData.length > 0 && !activeApiClient); 

        if (!activeApiClient || !API.sales || isInitialLoadWithData) {
            // If API client is missing or we are showing initial data, just exit.
            // setSales is already handled by useState initialization.
            if (!activeApiClient || !API.sales) {
                console.warn("API Client or Sales endpoint not available. Using provided salesData or empty array.");
            }
            return;
        }

        const fetchSales = async () => {
            setIsLoadingSales(true);
            try {
                // Construct query parameters for the date range
                const params = new URLSearchParams();
                if (dateRange.startDate) {
                    // Send start date as the beginning of that day in UTC
                    params.append('startDate', new Date(dateRange.startDate).toISOString());
                }
                if (dateRange.endDate) {
                    // Send end date as the end of that day (23:59:59.999) in UTC
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
    }, [dateRange, activeApiClient, showToast]); // Removed salesData as dependency to avoid re-fetching when parent provides initial data


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


    // Filter and Sort the sales data
    const filteredSales = useMemo(() => {
        let currentSales = Array.isArray(sales) ? [...sales] : [];

        // 1. Filtering based on Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            currentSales = currentSales.filter(sale => {
                const customerName = (sale.customerName || sale.customerId?.name || 'Walk-in Customer').toLowerCase();
                const saleId = sale._id ? sale._id.toLowerCase() : '';

                return customerName.includes(query) || saleId.includes(query);
            });
        }

        // 2. Apply sorting
        let sortedSales = currentSales;

        switch (sortOption) {
            case 'creditDesc':
                sortedSales.sort((a, b) => (b.amountCredited || 0) - (a.amountCredited || 0));
                break;
            case 'customerAsc':
                sortedSales.sort((a, b) => {
                    const nameA = (a.customerName || a.customerId?.name || 'Walk-in Customer').toUpperCase();
                    const nameB = (b.customerName || b.customerId?.name || 'Walk-in Customer').toUpperCase();
                    if (nameA < nameB) return -1;
                    if (nameA > nameB) return 1;
                    return 0;
                });
                break;
            case 'timeDesc':
            default:
                sortedSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                break;
        }

        return sortedSales;
    }, [sales, sortOption, searchQuery]); 

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

            {/* Header Section */}
            <div className="pb-4 mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center mb-4">
                    Sales Activity <TrendingUp className='w-7 h-7 ml-3 text-indigo-600 dark:text-indigo-400' />
                </h1>

                {/* Filters Controls - Date Range Filter */}
                <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800">
                    <DateRangeFilter
                        dateRange={dateRange}
                        onDateRangeChange={setDateRange}
                    />
                </div>
            </div>
            
            {/* --- Summary Metrics Section --- */}
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard
                    title="TOTAL SALES VALUE"
                    value={summaryMetrics.totalSalesValue}
                    icon={IndianRupee}
                    colorClass="text-indigo-600 dark:text-indigo-400"
                    valueSuffix={'₹'}
                />
                <MetricCard
                    title="TOTAL BILLS"
                    value={summaryMetrics.totalSalesCount}
                    icon={CheckCircle}
                    colorClass="text-teal-600 dark:text-teal-400"
                />
                <MetricCard
                    title="TOTAL CREDIT DUE"
                    value={summaryMetrics.totalCreditGiven}
                    icon={AlertTriangle}
                    colorClass="text-red-600 dark:text-red-400"
                    valueSuffix={'₹'}
                />
            </div>
            {/* ------------------------------- */}


            {/* Sales List Container */}
            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">

                {/* Integrated List Header, Search, and Sort Control */}
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-900 z-10 py-2 border-b dark:border-gray-800">

                    {/* Caption */}
                    <h2 className={`text-xl font-semibold text-gray-900 dark:text-white transition-opacity duration-200 ${activeControl !== 'none' ? 'hidden sm:block sm:opacity-50 sm:flex-shrink' : 'flex-shrink-0'}`}>
                        Sales History ({filteredSales.length} {filteredSales.length === 1 ? 'Entry' : 'Entries'})
                    </h2>

                    {/* Controls Container (Search/Sort) */}
                    <div className={`flex items-center space-x-3 transition-all duration-300 ease-in-out ${activeControl !== 'none' ? 'w-full sm:w-auto ml-0 sm:ml-auto' : 'ml-auto flex-shrink-0'}`}>

                        {/* Default Icons View */}
                        {activeControl === 'none' && (
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setActiveControl('search')}
                                    className="cursor-pointer p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors shadow-md"
                                    title="Search Sales"
                                    aria-label="Toggle Search"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setActiveControl('sort')}
                                    className="cursor-pointer p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700 transition-colors shadow-md"
                                    title="Sort Sales"
                                    aria-label="Toggle Sort Options"
                                >
                                    <ArrowDownWideNarrow className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Search Input View */}
                        {activeControl === 'search' && (
                            <div className="relative flex items-center flex-grow max-w-lg w-full">
                                <input
                                    type="text"
                                    placeholder="Search by name or ID..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-10 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 focus:border-indigo-500 transition-colors w-full"
                                />
                                <svg className="absolute left-2.5 w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                                </svg>
                                <button
                                    onClick={() => { setActiveControl('none'); setSearchQuery(''); }}
                                    className="cursor-pointer absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    title="Clear Search"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Sorting Dropdown View */}
                        {activeControl === 'sort' && (
                            <div className="flex items-center space-x-2 flex-grow max-w-lg w-full justify-end">
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
                                    className="cursor-pointer p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                                    title="Close Sort"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Loading/Empty State */}
                {isLoadingSales ? (
                    <div className="py-12 text-center text-lg text-indigo-400">
                        <svg className="animate-spin h-8 w-8 text-indigo-400 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading sales data...
                    </div>
                ) : filteredSales.length === 0 ? (
                    <div className="py-12 text-center text-lg text-gray-500">
                        <p>No sales records found for the current filter/search.</p>
                        <p className='text-sm mt-2'>Try adjusting the date range or clearing the search query.</p>
                    </div>
                ) : (
                    /* Sales List - Revised Item Design */
                    <div className="space-y-3">
                        {filteredSales.map((sale) => {
                            const key = sale._id;
                            const amountCreditedSafe = sale.amountCredited || 0;
                            const isCredit = amountCreditedSafe > 0;
                            const customerName = sale.customerName || sale.customerId?.name || 'Walk-in Customer';

                            return (
                                <div
                                    key={key}
                                    className="p-4 flex justify-between items-center rounded-xl shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-800 hover:border-indigo-600 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer text-sm"
                                    onClick={() => fetchSaleDetail(key)}
                                >
                                    {/* LEFT SIDE: Customer Name & ID/Time */}
                                    <div className="flex flex-col flex-grow truncate mr-4 min-w-[30%]">
                                        <span className={`font-bold truncate text-base ${isCredit ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>{customerName}</span>
                                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            <Clock className="w-3 h-3 mr-1" />
                                            <span>{formatTimeAgo(sale.timestamp)}</span>
                                            <span className='ml-3 hidden sm:inline font-mono'>ID: {key.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                    </div>

                                    {/* RIGHT SIDE: Amount & Status/Action */}
                                    <div className="flex items-center space-x-4 flex-shrink-0">
                                        {/* Amount and Credit Status */}
                                        <div className="flex flex-col items-end min-w-[100px] text-right">
                                            <div className={`font-extrabold flex items-center text-xl ${isCredit ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                                <IndianRupee className="w-5 h-5 mr-1 translate-y-[1px]" />
                                                {sale.totalAmount.toFixed(0)}
                                            </div>
                                            <div className={`text-xs mt-0.5 whitespace-nowrap font-medium ${isCredit ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                                {isCredit ? `Credit: ₹${amountCreditedSafe.toFixed(0)}` : 'Paid in Full'}
                                            </div>
                                        </div>

                                        {/* View Button */}
                                        <button
                                            className="cursor-pointer p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:text-white hover:bg-indigo-600 transition-colors flex-shrink-0 shadow-sm"
                                            title="View Bill Details"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                fetchSaleDetail(key);
                                            }}
                                        >
                                            <ArrowRight className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* BillModal component */}
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