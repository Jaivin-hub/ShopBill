import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, AlertTriangle, Calendar, ArrowRight, ArrowLeft, X, ArrowDownWideNarrow, Clock, CheckCircle, Printer } from 'lucide-react';
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
            <Calendar className="w-5 h-5 text-indigo-400" />
            <input
                type="date"
                value={dateRange.startDate || ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                className="p-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
            <span className="text-gray-400 font-medium">to</span>
            <input
                type="date"
                value={dateRange.endDate || ''}
                onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                className="p-2 border border-gray-700 rounded-lg bg-gray-800 text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
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
    const handlePrint = () => {
        window.print();
    };

    if (isLoading && !sale) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl max-w-lg w-full p-8 text-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg text-indigo-400 font-medium">Loading bill details...</p>
                    </div>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm">
            <style>{`
                @media print {
                    @page { margin: 5mm; }
                    body * { visibility: hidden; }
                    #printable-receipt, #printable-receipt * { visibility: visible; }
                    #printable-receipt { 
                        position: absolute; left: 0; top: 0; width: 100%;
                        background: white !important; color: black !important;
                    }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div id="printable-receipt" className="bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border border-gray-800">
                <div className="p-4 sm:p-6 bg-indigo-900/20 text-center border-b border-indigo-500/30 relative">
                    <button onClick={onClose} className="no-print absolute top-3 right-3 text-indigo-300 hover:text-white transition-colors p-1 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-center justify-center mb-1">
                        <IndianRupee className="w-6 h-6 text-indigo-400 mr-1" />
                        <h3 className="text-xl font-extrabold text-white">SALE RECEIPT</h3>
                    </div>
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">ID: {billId}</p>
                </div>

                <div className="p-4 border-b border-gray-800 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase text-gray-500 font-bold">Date & Time</span>
                        <span className="text-xs font-semibold text-gray-200">{saleDate} | {saleTime}</span>
                    </div>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase text-gray-500 font-bold">Customer</span>
                        <span className={`text-xs font-bold truncate ${isCredit ? 'text-red-400' : 'text-indigo-400'}`}>{customerName}</span>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-gray-950/30">
                    <h4 className="font-bold text-[10px] text-gray-500 uppercase tracking-widest mb-4">Items Summary</h4>
                    <ul className="space-y-4">
                        {sale.items?.map((item, index) => (
                            <li key={index} className="flex justify-between items-start text-sm pb-3 border-b border-gray-800 last:border-0">
                                <div className='flex flex-col pr-4'>
                                    <span className="font-bold text-gray-200">{item.itemId?.name || item.name || 'Product'}</span>
                                    <span className='text-[11px] text-gray-500'>{item.quantity} x ₹{item.price.toFixed(2)}</span>
                                </div>
                                <span className="font-bold text-white">₹{(item.quantity * item.price).toFixed(2)}</span>
                            </li>
                        )) || <li className="text-gray-500 italic text-center">No items listed.</li>}
                    </ul>
                </div>

                <div className="p-4 sm:p-6 space-y-2 bg-gray-900 border-t border-gray-800">
                    <div className="flex justify-between text-xs text-gray-500 font-bold">
                        <span>SUBTOTAL</span>
                        <span>₹{sale.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-gray-800">
                        <span className="text-xs font-black text-gray-400 uppercase">Grand Total</span>
                        <span className="text-2xl font-black text-indigo-400">₹{sale.totalAmount.toFixed(2)}</span>
                    </div>

                    {isCredit ? (
                        <div className="mt-3 p-3 bg-red-900/20 rounded-lg border border-red-900/50">
                            <div className="flex justify-between text-[10px] font-bold text-emerald-500"><span>Paid</span><span>₹{paidAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-sm font-black text-red-500"><span>CREDIT DUE</span><span>₹{sale.amountCredited.toFixed(2)}</span></div>
                        </div>
                    ) : (
                        <div className="text-center pt-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 mr-1" /> Payment Received
                        </div>
                    )}
                </div>

                <div className="no-print p-4 bg-gray-800/50 flex gap-3 border-t border-gray-800">
                    <button onClick={handlePrint} className="flex-1 flex items-center justify-center px-4 py-3 bg-white text-gray-900 font-bold rounded-lg hover:bg-gray-200 transition-all">
                        <Printer className="w-5 h-5 mr-2" /> Print
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const SalesActivityPage = ({ salesData, apiClient, showToast, userRole, onBack }) => {
    const [sales, setSales] = useState(salesData || []);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeControl, setActiveControl] = useState('none');
    const [sortOption, setSortOption] = useState('timeDesc');

    const [dateRange, setDateRange] = useState({
        startDate: getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 7))),
        endDate: getLocalDateString(new Date()),
    });

    useEffect(() => {
        if (!apiClient || !API.sales) return;

        const fetchSales = async () => {
            setIsLoadingSales(true);
            try {
                const params = new URLSearchParams();
                if (dateRange.startDate) params.append('startDate', new Date(dateRange.startDate).toISOString());
                if (dateRange.endDate) {
                    const end = new Date(dateRange.endDate);
                    end.setHours(23, 59, 59, 999);
                    params.append('endDate', end.toISOString());
                }
                const response = await apiClient.get(`${API.sales}?${params.toString()}`);
                setSales(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                showToast?.('Failed to load sales activity.', 'error');
                setSales([]);
            } finally {
                setIsLoadingSales(false);
            }
        };
        fetchSales();
    }, [dateRange, apiClient, showToast]);

    const fetchSaleDetail = async (saleId) => {
        if (!apiClient) return;
        setIsFetchingDetail(true);
        setSelectedSaleDetail(null);
        setIsModalOpen(true);
        try {
            const response = await apiClient.get(`${API.sales}/${saleId}`);
            setSelectedSaleDetail(response.data);
        } catch (error) {
            showToast?.('Failed to load bill details.', 'error');
            setIsModalOpen(false);
        } finally {
            setIsFetchingDetail(false);
        }
    };

    const filteredSales = useMemo(() => {
        let currentSales = Array.isArray(sales) ? [...sales] : [];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            currentSales = currentSales.filter(s => 
                (s.customerName || s.customerId?.name || 'Walk-in').toLowerCase().includes(q) || 
                s._id?.toLowerCase().includes(q)
            );
        }
        currentSales.sort((a, b) => {
            if (sortOption === 'creditDesc') return (b.amountCredited || 0) - (a.amountCredited || 0);
            if (sortOption === 'customerAsc') return (a.customerName || '').localeCompare(b.customerName || '');
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
        return currentSales;
    }, [sales, sortOption, searchQuery]);

    return (
        <main className="p-4 md:p-6 h-full flex flex-col bg-gray-950 text-gray-100 transition-colors duration-300">
            {/* Header Section */}
            <header className="mb-6 no-print">
                <div className="flex items-center mb-4">
                    <button onClick={onBack} className="p-2 mr-2 text-indigo-400 hover:bg-gray-900 rounded-lg transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-extrabold text-white tracking-tight">Sales Activity</h1>
                </div>
                <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 shadow-xl">
                    <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                </div>
            </header>

            {/* Content Table Area */}
            <div className="flex-grow overflow-hidden bg-gray-900 rounded-xl border border-gray-800 shadow-2xl flex flex-col no-print">
                <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-gray-800 bg-gray-900/50">
                    <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                        History <span className="text-indigo-400 ml-1">({filteredSales.length})</span>
                    </h2>
                    <div className="flex items-center space-x-2">
                        {activeControl === 'none' ? (
                            <div className="flex space-x-1">
                                <button onClick={() => setActiveControl('search')} className="p-2 text-indigo-400 hover:bg-gray-800 rounded-lg">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                </button>
                                <button onClick={() => setActiveControl('sort')} className="p-2 text-indigo-400 hover:bg-gray-800 rounded-lg">
                                    <ArrowDownWideNarrow className="w-5 h-5" />
                                </button>
                            </div>
                        ) : activeControl === 'search' ? (
                            <div className="relative flex items-center">
                                <input autoFocus type="text" placeholder="Search customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-3 pr-8 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-1 focus:ring-indigo-500 outline-none w-48 sm:w-64" />
                                <button onClick={() => { setActiveControl('none'); setSearchQuery(''); }} className="absolute right-2 text-gray-500"><X className="w-4 h-4" /></button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="py-1.5 px-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white outline-none">
                                    <option value="timeDesc">Newest</option>
                                    <option value="creditDesc">Credit</option>
                                    <option value="customerAsc">A-Z</option>
                                </select>
                                <button onClick={() => setActiveControl('none')} className="text-gray-500"><X className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                    {isLoadingSales ? (
                        <div className="py-20 text-center text-indigo-400">
                            <div className="animate-spin h-8 w-8 mx-auto border-2 border-indigo-500 border-t-transparent rounded-full mb-4"></div>
                            <p className="font-medium">Fetching Records...</p>
                        </div>
                    ) : filteredSales.length === 0 ? (
                        <div className="py-20 text-center text-gray-600 font-medium">No sales records found.</div>
                    ) : (
                        filteredSales.map((sale) => (
                            <div key={sale._id} onClick={() => fetchSaleDetail(sale._id)} className="group p-4 flex justify-between items-center bg-gray-900 border border-gray-800 rounded-xl hover:border-indigo-500/50 hover:bg-gray-800/40 transition-all cursor-pointer shadow-sm">
                                <div className="flex flex-col truncate mr-4">
                                    <span className={`font-bold text-base truncate ${sale.amountCredited > 0 ? 'text-red-400' : 'text-gray-100'}`}>
                                        {sale.customerName || sale.customerId?.name || 'Walk-in'}
                                    </span>
                                    <div className="flex items-center text-[11px] text-gray-500 mt-1 font-bold tracking-tighter">
                                        <Clock className="w-3 h-3 mr-1 text-indigo-500" />{formatTimeAgo(sale.timestamp)}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <div className={`font-black text-xl ${sale.amountCredited > 0 ? 'text-red-500' : 'text-indigo-400'}`}>
                                            ₹{sale.totalAmount.toFixed(0)}
                                        </div>
                                        <div className={`text-[10px] font-bold uppercase tracking-widest ${sale.amountCredited > 0 ? 'text-red-600/80' : 'text-emerald-500/80'}`}>
                                            {sale.amountCredited > 0 ? `Due: ₹${sale.amountCredited.toFixed(0)}` : 'Cleared'}
                                        </div>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-700 group-hover:text-indigo-400 transition-colors" />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            {isModalOpen && <BillModal sale={selectedSaleDetail} onClose={() => setIsModalOpen(false)} isLoading={isFetchingDetail} />}
        </main>
    );
};

export default SalesActivityPage;