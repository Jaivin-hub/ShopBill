import React, { useState, useMemo, useEffect } from 'react';
import { 
    IndianRupee, AlertTriangle, Calendar, ArrowLeft, X, Clock, 
    Search, User, Activity, ExternalLink, ArrowUpRight, Receipt, Printer
} from 'lucide-react';
import API from '../config/api';

const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- REFINED DATE FILTER ---
const DateRangeFilter = ({ dateRange, onDateRangeChange, darkMode }) => {
    const bgClass = darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-300 shadow-sm';
    const inputBg = darkMode ? 'bg-gray-900/50' : 'bg-slate-100';
    const textColor = darkMode ? 'text-white' : 'text-black';

    return (
        <div className={`flex items-center gap-1 border rounded-xl p-1 w-full md:w-auto overflow-x-auto ${bgClass}`}>
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg flex-1 md:flex-none ${inputBg}`}>
                <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                <input
                    type="date"
                    value={dateRange.startDate || ''}
                    onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                    /* Added text-[16px] and md:text-[10px] to prevent mobile zoom while keeping desktop design */
                    className={`bg-transparent font-bold text-[16px] md:text-[10px] focus:outline-none w-full ${textColor}`}
                />
            </div>
            <span className="text-gray-400 font-black text-[9px] px-0.5">/</span>
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg flex-1 md:flex-none ${inputBg}`}>
                <input
                    type="date"
                    value={dateRange.endDate || ''}
                    onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                    /* Added text-[16px] and md:text-[10px] to prevent mobile zoom */
                    className={`bg-transparent font-bold text-[16px] md:text-[10px] focus:outline-none w-full ${textColor}`}
                />
            </div>
        </div>
    );
};

// --- RESTORED BILL MODAL ---
const BillModal = ({ sale, onClose, isLoading, darkMode }) => {
    if (isLoading && !sale) return (
        <div className={`fixed inset-0 flex items-center justify-center z-[300] backdrop-blur-md ${darkMode ? 'bg-gray-950/90' : 'bg-white/80'}`}>
            <div className="w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
    );
    if (!sale) return null;

    const isCredit = sale.amountCredited > 0;
    const customerName = sale.customerName || sale.customerId?.name || 'Standard Client';
    
    const modalBg = darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200 shadow-2xl';
    const headerBg = darkMode ? 'bg-gray-950/50' : 'bg-slate-50';
    const textColor = darkMode ? 'text-white' : 'text-slate-900';
    const secondaryText = darkMode ? 'text-gray-400' : 'text-slate-500';

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[300] backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`${modalBg} rounded-xl border w-full max-w-md overflow-hidden transform animate-in zoom-in-95 shadow-2xl`}>
                {/* Header */}
                <div className={`p-5 border-b flex justify-between items-center ${headerBg} ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                            <span className="text-[10px] font-black text-indigo-500  tracking-[0.15em]">Invoice Summary</span>
                        </div>
                        <h3 className={`text-base font-bold tabular-nums tracking-tight ${textColor}`}>
                            #{sale._id.slice(-12).toUpperCase()}
                        </h3>
                    </div>
                    <button 
                        onClick={onClose} 
                        className={`p-2 rounded-lg transition-all ${darkMode ? 'hover:bg-gray-800 text-gray-500' : 'hover:bg-slate-200 text-slate-400'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 max-h-[50vh] overflow-y-auto custom-scroll">
                    <div className={`flex flex-col gap-1 p-3.5 rounded-lg border ${darkMode ? 'bg-gray-950/50 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
                        <span className={`text-[9px] font-bold  tracking-widest ${secondaryText}`}>Billed To</span>
                        <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            <span className={`text-sm font-bold ${textColor}`}>{customerName}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <span className={`text-[9px] font-bold  tracking-widest px-1 ${secondaryText}`}>Line Items</span>
                        <div className={`rounded-lg border overflow-hidden ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                            {sale.items?.map((item, i) => (
                                <div key={i} className={`flex justify-between items-center p-3 text-xs border-b last:border-0 ${darkMode ? 'border-gray-800 bg-gray-900/20' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${textColor}`}>{item.name || 'General Item'}</span>
                                        <span className={`text-[10px] font-medium ${secondaryText}`}>Qty: {item.quantity} × ₹{item.price?.toLocaleString()}</span>
                                    </div>
                                    <span className={`font-bold tabular-nums ${textColor}`}>
                                        ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t space-y-4 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex justify-between items-center">
                        <div className="space-y-0.5">
                            <p className={`text-[10px] font-bold  tracking-widest ${secondaryText}`}>Grand Total</p>
                            <p className={`text-2xl font-black tabular-nums tracking-tighter ${textColor}`}>₹{sale.totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2.5 py-1 rounded text-[9px] font-black  tracking-tight border ${isCredit ? 'border-rose-500/20 text-rose-500 bg-rose-500/5' : 'border-emerald-500/20 text-emerald-600 bg-emerald-500/5'}`}>
                                {isCredit ? 'Payment Pending' : 'Fully Paid'}
                            </span>
                            {isCredit && (
                                <span className="text-[10px] font-bold text-rose-500">Balance: ₹{sale.amountCredited.toLocaleString()}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button 
                            onClick={() => window.print()} 
                            className="flex-1 py-3 bg-indigo-600 text-white text-[11px] font-bold  tracking-wider rounded-lg hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                        >
                            <Printer className="w-4 h-4" /> Print Receipt
                        </button>
                        <button 
                            onClick={onClose} 
                            className={`flex-1 py-3 text-[11px] font-bold  tracking-wider rounded-lg border transition-all active:scale-[0.98] ${darkMode ? 'bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SalesActivityPage = ({ salesData, apiClient, showToast, onBack, darkMode }) => {
    const [sales, setSales] = useState(salesData || []);
    const [isLoadingSales, setIsLoadingSales] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    const [dateRange, setDateRange] = useState({
        startDate: getLocalDateString(new Date(new Date().setDate(new Date().getDate() - 7))),
        endDate: getLocalDateString(new Date()),
    });

    useEffect(() => {
        if (!apiClient) return;
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
                showToast?.('Sync failed', 'error');
            } finally {
                setIsLoadingSales(false);
            }
        };
        fetchSales();
    }, [dateRange, apiClient]);

    const fetchSaleDetail = async (saleId) => {
        setIsFetchingDetail(true);
        setSelectedSaleDetail(null);
        setIsModalOpen(true);
        try {
            const response = await apiClient.get(`${API.sales}/${saleId}`);
            setSelectedSaleDetail(response.data);
        } catch (error) {
            showToast?.('Retrieval failed', 'error');
            setIsModalOpen(false);
        } finally {
            setIsFetchingDetail(false);
        }
    };

    const filteredSales = useMemo(() => {
        let list = Array.isArray(sales) ? [...sales] : [];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s => 
                (s.customerName || s.customerId?.name || 'Walk-in').toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [sales, searchQuery]);

    const mainBg = darkMode ? 'bg-gray-950 text-gray-200' : 'bg-slate-50 text-black';
    const cardBg = darkMode ? 'bg-gray-900/30 border-gray-800/40 hover:bg-gray-900/60' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm';

    return (
        <main className={`min-h-screen transition-colors duration-300 ${mainBg}`}>
            {/* --- RESPONSIVE STICKY HEADER --- */}
            <header className={`sticky top-0 z-[100] backdrop-blur-md border-b px-4 md:px-6 py-4 transition-colors ${darkMode ? 'bg-gray-950/95 border-gray-800/60' : 'bg-white/95 border-slate-200'}`}>
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className={`p-2 border rounded-xl transition-all ${darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className={`text-2xl md:text-lg font-black  tracking-tighter ${darkMode ? 'text-white' : 'text-slate-950'}`}>
                                    Sales <span className="text-indigo-600">History</span>
                                </h1>
                                <p className={`text-[9px] font-black  tracking-widest leading-none mt-1 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Detailed log of all completed sales</p>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} darkMode={darkMode} />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="search client..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                /* FIXED: text-[16px] prevents mobile zoom. md:text-[10px] keeps it tiny on larger screens */
                                className={`border rounded-xl pl-10 pr-4 py-2.5 text-[16px] md:text-[10px] font-black tracking-widest w-full outline-none focus:border-indigo-500 transition-all ${darkMode ? 'bg-gray-950 border-gray-800 text-white' : 'bg-white border-slate-300 text-black'}`}
                            />
                        </div>
                        <div className="md:hidden">
                            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} darkMode={darkMode} />
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                <div className="space-y-2">
                    {isLoadingSales ? (
                        <div className="py-20 flex justify-center">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredSales.map((sale) => (
                        <div 
                            key={sale._id} 
                            onClick={() => fetchSaleDetail(sale._id)}
                            className={`group flex items-center justify-between p-4 border rounded-2xl transition-all cursor-pointer active:scale-[0.98] ${cardBg}`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${sale.amountCredited > 0 ? 'bg-rose-500/5 border-rose-500/20 text-rose-600' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-600'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className={`text-[12px] font-black  tracking-tight truncate leading-tight ${darkMode ? 'text-gray-100' : 'text-slate-900'}`}>
                                        {sale.customerName || sale.customerId?.name || 'Walk-in'}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[9px] font-bold tabular-nums ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                                            {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-slate-200'}`} />
                                        <span className={`text-[9px] font-bold  ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>
                                            {sale.items?.length || 0} Items
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 ml-2">
                                <div className="text-right">
                                    <p className={`text-[14px] font-black tabular-nums leading-tight ${darkMode ? 'text-white' : 'text-black'}`}>
                                        ₹{sale.totalAmount.toLocaleString()}
                                    </p>
                                    <span className={`text-[8px] font-black  tracking-widest ${sale.amountCredited > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                        {sale.amountCredited > 0 ? `DUE: ₹${sale.amountCredited}` : 'CLEARED'}
                                    </span>
                                </div>
                                <ArrowUpRight className={`w-4 h-4 transition-all ${darkMode ? 'text-gray-700 group-hover:text-indigo-400' : 'text-slate-300 group-hover:text-indigo-600'} group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <BillModal 
                    sale={selectedSaleDetail} 
                    onClose={() => setIsModalOpen(false)} 
                    isLoading={isFetchingDetail} 
                    darkMode={darkMode}
                />
            )}
        </main>
    );
};

export default SalesActivityPage;