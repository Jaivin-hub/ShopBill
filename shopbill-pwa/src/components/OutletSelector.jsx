import React, { useState, useEffect, useRef } from 'react';
import { Store, ChevronDown, Check, Loader, AlertCircle } from 'lucide-react';
import API from '../config/api';

const OutletSelector = ({ apiClient, currentUser, currentOutletId, onOutletSwitch, showToast }) => {
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

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                <Loader className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="text-sm text-gray-400">Loading...</span>
            </div>
        );
    }

    if (outlets.length === 0) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
                aria-label="Select outlet"
                aria-expanded={isOpen}
            >
                <Store className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <span className="text-sm font-medium text-white max-w-[120px] truncate">
                    {currentOutlet?.name || 'Select Outlet'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 max-h-96 overflow-y-auto">
                        <div className="p-2">
                            {outlets.length === 0 ? (
                                <div className="p-4 text-center text-gray-400">
                                    <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                                    <p className="text-sm">No outlets available</p>
                                </div>
                            ) : (
                                outlets.map((outlet) => (
                                    <button
                                        key={outlet._id}
                                        onClick={() => handleSwitchOutlet(outlet._id)}
                                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                                            currentOutletId === outlet._id
                                                ? 'bg-indigo-600/20 text-indigo-400'
                                                : 'hover:bg-gray-700 text-white'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <Store className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                            <span className="text-sm font-medium truncate">{outlet.name}</span>
                                        </div>
                                        {currentOutletId === outlet._id && (
                                            <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" aria-hidden="true" />
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

