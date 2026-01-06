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
const DateRangeFilter = ({ dateRange, onDateRangeChange }) => {
    return (
        <div className="flex items-center gap-1 bg-gray-950 border border-gray-800 rounded-xl p-1 shadow-inner w-full md:w-auto overflow-x-auto">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-900/50 flex-1 md:flex-none">
                <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                <input
                    type="date"
                    value={dateRange.startDate || ''}
                    onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value })}
                    className="bg-transparent text-white font-bold text-[10px] focus:outline-none uppercase w-full"
                />
            </div>
            <span className="text-gray-700 font-black text-[9px] px-0.5">/</span>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-gray-900/50 flex-1 md:flex-none">
                <input
                    type="date"
                    value={dateRange.endDate || ''}
                    onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value })}
                    className="bg-transparent text-white font-bold text-[10px] focus:outline-none uppercase w-full"
                />
            </div>
        </div>
    );
};

// --- UPDATED BILL MODAL WITH CREDIT/PAID BREAKDOWN ---
const BillModal = ({ sale, onClose, isLoading }) => {
    if (isLoading && !sale) return (
        <div className="fixed inset-0 bg-gray-950/90 flex items-center justify-center z-[300] backdrop-blur-md">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (!sale) return null;

    const saleDate = new Date(sale.timestamp).toLocaleDateString('en-GB'); // DD/MM/YYYY
    const saleTime = new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const customerName = sale.customerName || sale.customerId?.name || 'Walk-in';
    const amountPaid = sale.totalAmount - (sale.amountCredited || 0);
    const billId = sale._id ? sale._id.slice(-8).toUpperCase() : 'N/A';

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[300] backdrop-blur-xl animate-in fade-in duration-200">
            <div className="rounded-3xl border border-gray-800 w-full max-w-sm overflow-hidden transform animate-in zoom-in-95 shadow-2xl">
                
                {/* Header */}
                <div className="p-6 pb-2 relative">
                    <button onClick={onClose} className="absolute right-6 top-6 text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-indigo-400">
                            <IndianRupee className="w-5 h-5" />
                            <h2 className="text-lg font-black uppercase tracking-wider text-white">Sale Receipt</h2>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 tracking-[0.2em]">ID: {billId}</p>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-800/50 space-y-6">
                    {/* Date & Customer Info */}
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Date & Time</p>
                            <p className="text-xs font-black text-white">{saleDate} | {saleTime}</p>
                        </div>
                        <div className="text-right space-y-1">
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Customer</p>
                            <p className="text-xs font-black text-rose-500 uppercase">{customerName}</p>
                        </div>
                    </div>

                    {/* Items Summary */}
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-800/50 pb-2">Items Summary</p>
                        <div className="space-y-5">
                            {sale.items?.map((item, i) => (
                                <div key={i} className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-gray-100 uppercase">{item.itemId?.name || item.name || 'Item'}</span>
                                        <span className="text-[10px] font-bold text-gray-500 tabular-nums">
                                            {item.quantity} × ₹{(item.price || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <span className="text-sm font-black text-white tabular-nums">
                                        ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Calculations */}
                    <div className="pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Subtotal</span>
                            <span className="text-xs font-black text-gray-400 tabular-nums">₹{sale.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-800 pt-3">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                            <span className="text-2xl font-black text-indigo-400 tabular-nums italic">₹{sale.totalAmount.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Status Box (Paid vs Credit) */}
                    <div className={`p-4 rounded-2xl border ${sale.amountCredited > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                        <div className="flex justify-between items-center mb-1">
                            <span className={`text-[10px] font-black uppercase ${sale.amountCredited > 0 ? 'text-emerald-500' : 'text-emerald-500'}`}>Paid</span>
                            <span className="text-[10px] font-black text-emerald-500 tabular-nums">₹{amountPaid.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Credit Due</span>
                            <span className="text-[10px] font-black text-rose-500 tabular-nums">₹{(sale.amountCredited || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 pt-2 flex gap-3">
                    <button onClick={() => window.print()} className="flex-1 py-4 bg-white text-black text-xs font-black uppercase rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button onClick={onClose} className="flex-1 py-4 bg-indigo-600 text-white text-xs font-black uppercase rounded-2xl active:scale-95 transition-all">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const SalesActivityPage = ({ salesData, apiClient, showToast, onBack }) => {
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

    return (
        <main className="min-h-screen bg-gray-950 text-gray-200">
            {/* --- RESPONSIVE STICKY HEADER --- */}
            <header className="sticky top-0 z-[100] bg-gray-950/95 backdrop-blur-md border-b border-gray-800/60 px-4 md:px-6 py-4">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={onBack} className="p-2 bg-gray-900 border border-gray-800 text-gray-400 rounded-xl">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-base md:text-lg font-black text-white uppercase tracking-tighter leading-none">Sales <span className="text-indigo-500">History</span></h1>
                                <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                                    Active Ledger
                                </p>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                            <input 
                                type="text"
                                placeholder="SEARCH CLIENT..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white w-full outline-none focus:border-indigo-500/50 transition-all"
                            />
                        </div>
                        <div className="md:hidden">
                            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
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
                            className="group flex items-center justify-between p-4 bg-gray-900/30 border border-gray-800/40 rounded-2xl hover:bg-gray-900/60 transition-all cursor-pointer active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${sale.amountCredited > 0 ? 'bg-rose-500/5 border-rose-500/20 text-rose-500' : 'bg-indigo-500/5 border-indigo-500/20 text-indigo-500'}`}>
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[12px] font-black text-gray-100 uppercase tracking-tight truncate leading-tight">
                                        {sale.customerName || sale.customerId?.name || 'Walk-in'}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[9px] font-bold text-gray-600 tabular-nums">
                                            {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                        <span className="w-1 h-1 bg-gray-800 rounded-full" />
                                        <span className="text-[9px] font-bold text-gray-600 uppercase">
                                            {sale.items?.length || 0} Items
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 ml-2">
                                <div className="text-right">
                                    <p className="text-[14px] font-black text-white tabular-nums leading-tight">
                                        ₹{sale.totalAmount.toLocaleString()}
                                    </p>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${sale.amountCredited > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {sale.amountCredited > 0 ? `DUE: ₹${sale.amountCredited}` : 'CLEARED'}
                                    </span>
                                </div>
                                <ArrowUpRight className="w-4 h-4 text-gray-700 group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
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
                />
            )}
        </main>
    );
};

export default SalesActivityPage;