import React, { useState, useEffect, useRef } from 'react';
import { Store, ChevronDown, Check, Loader, AlertCircle } from 'lucide-react';
import API from '../config/api';

const OutletSelector = ({
    apiClient,
    currentUser,
    currentOutletId,
    onOutletSwitch,
    showToast,
    darkMode = true,
}) => {
    const [outlets, setOutlets] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentOutlet, setCurrentOutlet] = useState(null);
    const fetchingRef = useRef(false);

    const isPremium = currentUser?.plan === 'PREMIUM';

    useEffect(() => {
        if (isPremium && currentUser) {
            fetchOutlets();
        } else {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPremium, currentUser]); // Removed currentOutletId to prevent duplicate fetches

    const fetchOutlets = async () => {
        // Prevent duplicate requests using ref
        if (fetchingRef.current) return;
        
        fetchingRef.current = true;
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.outlets);
            if (response.data.success) {
                const outletsList = response.data.data || [];
                setOutlets(outletsList);
                
                // Find current outlet
                const active = outletsList.find(o => o._id === currentOutletId) || outletsList[0];
                setCurrentOutlet(active);
            }
        } catch (error) {
            // Ignore cancellation errors (expected behavior for duplicate request prevention)
            if (error.cancelled || error.message?.includes('cancelled')) {
                return; // Silently ignore cancelled requests
            }
            console.error('Failed to fetch outlets:', error);
            if (showToast) {
                showToast('Failed to load outlets.', 'error');
            }
        } finally {
            setIsLoading(false);
            fetchingRef.current = false;
        }
    };

    const handleSwitchOutlet = async (outletId) => {
        try {
            const response = await apiClient.put(API.switchOutlet(outletId));
            if (response.data.success) {
                if (onOutletSwitch) {
                    onOutletSwitch(response.data.data.outlet);
                }
                setIsOpen(false);
                // Update current outlet immediately without refetching (prevents duplicate request)
                const updatedOutlet = response.data.data.outlet;
                setCurrentOutlet(updatedOutlet);
                // Update outlets list with the new active outlet
                setOutlets(prev => prev.map(o => ({ ...o, isActive: o._id === outletId })));
                if (showToast) {
                    showToast('Outlet switched successfully!', 'success');
                }
            }
        } catch (error) {
            // Ignore cancellation errors (expected behavior for duplicate request prevention)
            if (error.cancelled || error.message?.includes('cancelled')) {
                return;
            }
            console.error('Switch outlet error:', error);
            if (showToast) {
                showToast('Failed to switch outlet.', 'error');
            }
        }
    };

    if (!isPremium) {
        return null; // Don't show selector for non-premium users
    }

    const labelMuted = darkMode ? 'text-gray-600' : 'text-slate-400';
    const triggerBase = darkMode
        ? 'bg-gray-800/90 hover:bg-gray-700 border-gray-700/80 text-white'
        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-900';
    const menuBase = darkMode
        ? 'bg-gray-800 border-gray-700 shadow-black/40'
        : 'bg-white border-slate-200 shadow-lg text-slate-900';
    const menuItemIdle = darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-slate-100 text-slate-900';
    const menuItemActive = darkMode
        ? 'bg-indigo-600/20 text-indigo-400'
        : 'bg-indigo-50 text-indigo-600';

    if (isLoading) {
        return (
            <div className="w-full space-y-1">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 ${labelMuted}`}>Active outlet</p>
                <div
                    className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 ${darkMode ? 'border-gray-800 bg-gray-800/50' : 'border-slate-200 bg-slate-50'}`}
                    aria-busy="true"
                >
                    <Loader className="h-4 w-4 shrink-0 animate-spin text-indigo-500" aria-hidden="true" />
                    <span className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>Loading outlets…</span>
                </div>
            </div>
        );
    }

    if (outlets.length === 0) {
        return null;
    }

    const chevronMuted = darkMode ? 'text-gray-400' : 'text-slate-500';

    return (
        <div className="relative w-full space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 ${labelMuted}`}>Active outlet</p>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${triggerBase}`}
                aria-label="Select outlet"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-600/15 ring-1 ring-indigo-500/20">
                    <Store className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                </div>
                <span className="min-w-0 flex-1 truncate text-xs font-bold tracking-tight">
                    {currentOutlet?.name || 'Select outlet'}
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${chevronMuted} ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        className={`absolute left-0 right-0 top-full z-50 mt-1 max-h-96 overflow-y-auto rounded-lg border shadow-xl custom-scrollbar ${menuBase}`}
                        role="listbox"
                        aria-label="Outlets"
                    >
                        <div className="p-1.5">
                            {outlets.length === 0 ? (
                                <div className={`p-4 text-center ${darkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                                    <AlertCircle className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
                                    <p className="text-sm">No outlets available</p>
                                </div>
                            ) : (
                                outlets.map((outlet) => (
                                    <button
                                        key={outlet._id}
                                        type="button"
                                        role="option"
                                        aria-selected={currentOutletId === outlet._id}
                                        onClick={() => handleSwitchOutlet(outlet._id)}
                                        className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                                            currentOutletId === outlet._id ? menuItemActive : menuItemIdle
                                        }`}
                                    >
                                        <div className="flex min-w-0 flex-1 items-center gap-2">
                                            <Store className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
                                            <span className="truncate text-xs font-semibold">{outlet.name}</span>
                                        </div>
                                        {currentOutletId === outlet._id && (
                                            <Check
                                                className={`h-3.5 w-3.5 shrink-0 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}
                                                aria-hidden="true"
                                            />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default OutletSelector;

