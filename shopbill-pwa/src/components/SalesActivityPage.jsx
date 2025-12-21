import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, AlertTriangle, Calendar, TrendingUp, ArrowRight, X, User, ArrowDownWideNarrow, Clock, CheckCircle } from 'lucide-react';
import API from '../config/api';

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
    const saleDate = new Date(sale.timestamp).toLocaleDateString();
    const saleTime = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const billId = sale._id ? sale._id.substring(0, 8).toUpperCase() : 'N/A';

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full transform transition-all overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="p-6 bg-indigo-500/10 dark:bg-indigo-900/20 text-center border-b border-indigo-500/30 dark:border-indigo-700/50 relative">
                    <button onClick={onClose} className="absolute top-3 right-3 text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white transition-colors p-1 rounded-full bg-transparent hover:bg-indigo-100/50 dark:hover:bg-indigo-800/50">
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
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span className="flex items-center text-gray-500 dark:text-gray-400"><Clock className="w-4 h-4 mr-2" />Date & Time</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{saleDate} at {saleTime}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center text-gray-500 dark:text-gray-400"><User className="w-4 h-4 mr-2" />Customer</span>
                        <span className={`font-bold ${isCredit ? 'text-red-500 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{customerName}</span>
                    </div>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto border-b border-dashed border-gray-300 dark:border-gray-700">
                    <h4 className="font-bold text-lg text-gray-700 dark:text-gray-300 mb-3">Order Summary</h4>
                    <ul className="space-y-3">
                        {sale.items && sale.items.length > 0 ? (
                            sale.items.map((item, index) => (
                                <li key={index} className="flex justify-between items-start text-sm border-b border-gray-100 dark:border-gray-800 pb-2 last:border-b-0">
                                    <div className='flex flex-col'>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{(item.itemId?.name || item.name || 'Unknown Product')}</span>
                                        <span className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>{item.quantity} units @ ₹{item.price.toFixed(2)}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap">₹{(item.quantity * item.price).toFixed(2)}</span>
                                </li>
                            ))
                        ) : (
                            <li className="text-gray-500 italic text-center">No item details available.</li>
                        )}
                    </ul>
                </div>
                <div className="p-6 space-y-3">
                    <div className="flex justify-between font-medium text-lg text-gray-700 dark:text-gray-300"><span>SUBTOTAL</span><span>₹{sale.totalAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between font-extrabold text-2xl text-indigo-700 dark:text-indigo-400 border-t border-dashed border-gray-400 dark:border-gray-600 pt-3"><span>TOTAL AMOUNT</span><span>₹{sale.totalAmount.toFixed(2)}</span></div>
                    {isCredit ? (
                        <div className="space-y-1 pt-3 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex justify-between text-base font-semibold text-green-700 dark:text-green-400"><span>Amount Paid</span><span>₹{paidAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between font-extrabold text-xl text-red-700 dark:text-red-400"><span className='flex items-center'><AlertTriangle className='w-5 h-5 mr-2' />CREDIT DUE</span><span>₹{sale.amountCredited.toFixed(2)}</span></div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center pt-3 text-lg font-bold text-green-700 dark:text-green-400"><CheckCircle className='w-6 h-6 mr-2' />Payment Completed</div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 text-center border-t border-gray-200 dark:border-gray-700">
                    <button onClick={onClose} className="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors transform hover:scale-[1.01]">Close Receipt</button>
                </div>
            </div>
        </div>
    );
};

// --- UPDATED Metric Card for single row mobile support ---
const MetricCard = ({ title, value, icon: Icon, colorClass, valueSuffix = '' }) => (
    <div className="flex flex-col items-center justify-center p-2 sm:p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700/50 text-center">
        <div className="flex flex-col items-center mb-1">
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mb-1 ${colorClass}`} />
            <span className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">{title}</span>
        </div>
        <p className="text-sm sm:text-2xl font-extrabold text-gray-900 dark:text-white truncate w-full">
            {value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            <span className="text-[10px] sm:text-lg font-normal ml-0.5">{valueSuffix}</span>
        </p>
    </div>
);

const SalesActivityPage = ({ salesData, apiClient, showToast, userRole }) => {
    const activeApiClient = apiClient;
    const [sales, setSales] = useState(salesData || []);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeControl, setActiveControl] = useState('none');
    const [sortOption, setSortOption] = useState('timeDesc');

    const todayDate = new Date();
    const today = getLocalDateString(todayDate);
    const sevenDaysAgoDate = new Date(todayDate);
    sevenDaysAgoDate.setDate(todayDate.getDate() - 7);
    const last7Days = getLocalDateString(sevenDaysAgoDate);

    const [dateRange, setDateRange] = useState({
        startDate: last7Days,
        endDate: today,
    });

    useEffect(() => {
        const isInitialLoadWithData = (salesData && salesData.length > 0 && !activeApiClient);
        if (!activeApiClient || !API.sales || isInitialLoadWithData) return;

        const fetchSales = async () => {
            setIsLoadingSales(true);
            try {
                const params = new URLSearchParams();
                if (dateRange.startDate) params.append('startDate', new Date(dateRange.startDate).toISOString());
                if (dateRange.endDate) {
                    const endDate = new Date(dateRange.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    params.append('endDate', endDate.toISOString());
                }
                const response = await activeApiClient.get(`${API.sales}?${params.toString()}`);
                if (response.data && Array.isArray(response.data)) setSales(response.data);
                else setSales([]);
            } catch (error) {
                showToast && showToast('Failed to load sales activity.', 'error');
                setSales([]);
            } finally {
                setIsLoadingSales(false);
            }
        };
        fetchSales();
    }, [dateRange, activeApiClient, showToast]);

    const fetchSaleDetail = async (saleId) => {
        if (!activeApiClient || !API.sales) return;
        setIsFetchingDetail(true);
        setSelectedSaleDetail(null);
        setIsModalOpen(true);
        try {
            const response = await activeApiClient.get(`${API.sales}/${saleId}`);
            if (response.data) setSelectedSaleDetail(response.data);
        } catch (error) {
            showToast && showToast('Failed to load bill details.', 'error');
        } finally {
            setIsFetchingDetail(false);
        }
    };

    const filteredSales = useMemo(() => {
        let currentSales = Array.isArray(sales) ? [...sales] : [];
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            currentSales = currentSales.filter(sale => {
                const customerName = (sale.customerName || sale.customerId?.name || 'Walk-in Customer').toLowerCase();
                return customerName.includes(query) || (sale._id && sale._id.toLowerCase().includes(query));
            });
        }
        switch (sortOption) {
            case 'creditDesc': currentSales.sort((a, b) => (b.amountCredited || 0) - (a.amountCredited || 0)); break;
            case 'customerAsc': currentSales.sort((a, b) => (a.customerName || '').localeCompare(b.customerName || '')); break;
            case 'timeDesc': default: currentSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); break;
        }
        return currentSales;
    }, [sales, sortOption, searchQuery]);

    const summaryMetrics = useMemo(() => {
        return {
            totalSalesCount: filteredSales.length,
            totalSalesValue: filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0),
            totalCreditGiven: filteredSales.reduce((sum, sale) => sum + (sale.amountCredited || 0), 0),
        };
    }, [filteredSales]);

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-100 dark:bg-gray-950 transition-colors duration-300">
            <div className="pb-4 mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center mb-4">
                    Sales Activity
                </h1>
                <div className="p-4 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-800">
                    <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                </div>
            </div>

            {/* --- FIXED METRICS: 3 Columns on Mobile --- */}
            {userRole === 'owner' && (
            <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4 px-1">
                <MetricCard
                    title="Sales"
                    value={summaryMetrics.totalSalesValue}
                    icon={IndianRupee}
                    colorClass="text-indigo-600 dark:text-indigo-400"
                    valueSuffix="₹"
                />
                <MetricCard
                    title="Bills"
                    value={summaryMetrics.totalSalesCount}
                    icon={CheckCircle}
                    colorClass="text-teal-600 dark:text-teal-400"
                />
                <MetricCard
                    title="Credit"
                    value={summaryMetrics.totalCreditGiven}
                    icon={AlertTriangle}
                    colorClass="text-red-600 dark:text-red-400"
                    valueSuffix="₹"
                />
            </div>
            )}

            <div className="flex-grow overflow-y-auto bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-900 z-10 py-2 border-b dark:border-gray-800">
                    <h2 className={`text-xl font-semibold text-gray-900 dark:text-white transition-opacity duration-200 ${activeControl !== 'none' ? 'hidden sm:block sm:opacity-50 sm:flex-shrink' : 'flex-shrink-0'}`}>
                        Sales History ({filteredSales.length})
                    </h2>
                    <div className={`flex items-center space-x-3 transition-all duration-300 ${activeControl !== 'none' ? 'w-full sm:w-auto ml-0 sm:ml-auto' : 'ml-auto flex-shrink-0'}`}>
                        {activeControl === 'none' && (
                            <div className="flex space-x-3">
                                <button onClick={() => setActiveControl('search')} className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700 shadow-md"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></button>
                                <button onClick={() => setActiveControl('sort')} className="p-2 rounded-full text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-gray-700 shadow-md"><ArrowDownWideNarrow className="w-5 h-5" /></button>
                            </div>
                        )}
                        {activeControl === 'search' && (
                            <div className="relative flex items-center flex-grow max-w-lg w-full">
                                <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-10 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 w-full" />
                                <button onClick={() => { setActiveControl('none'); setSearchQuery(''); }} className="absolute right-2 p-1 text-gray-400"><X className="w-4 h-4" /></button>
                            </div>
                        )}
                        {activeControl === 'sort' && (
                            <div className="flex items-center space-x-2 flex-grow max-w-lg w-full justify-end">
                                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="p-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-indigo-500 min-w-[150px]">
                                    <option value="timeDesc">Newest</option>
                                    <option value="creditDesc">Credit Due</option>
                                    <option value="customerAsc">Customer (A-Z)</option>
                                </select>
                                <button onClick={() => setActiveControl('none')} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                </div>

                {isLoadingSales ? (
                    <div className="py-12 text-center text-indigo-400"><svg className="animate-spin h-8 w-8 mx-auto mb-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Loading...</div>
                ) : filteredSales.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">No records found.</div>
                ) : (
                    <div className="space-y-3">
                        {filteredSales.map((sale) => (
                            <div key={sale._id} className="p-4 flex justify-between items-center rounded-xl shadow-md border border-gray-200 dark:border-gray-800 hover:border-indigo-600 transition-all cursor-pointer text-sm" onClick={() => fetchSaleDetail(sale._id)}>
                                <div className="flex flex-col flex-grow truncate mr-4">
                                    <span className={`font-bold truncate text-base ${sale.amountCredited > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{sale.customerName || sale.customerId?.name || 'Walk-in'}</span>
                                    <div className="flex items-center text-xs text-gray-500 mt-0.5"><Clock className="w-3 h-3 mr-1" />{formatTimeAgo(sale.timestamp)}</div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <div className={`font-extrabold text-xl ${sale.amountCredited > 0 ? 'text-red-500' : 'text-indigo-600'}`}>₹{sale.totalAmount.toFixed(0)}</div>
                                        <div className={`text-[10px] font-medium ${sale.amountCredited > 0 ? 'text-red-500' : 'text-green-600'}`}>{sale.amountCredited > 0 ? `Credit: ₹${sale.amountCredited.toFixed(0)}` : 'Paid'}</div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-indigo-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {isModalOpen && <BillModal sale={selectedSaleDetail} onClose={() => setIsModalOpen(false)} isLoading={isFetchingDetail} />}
        </div>
    );
};

export default SalesActivityPage;