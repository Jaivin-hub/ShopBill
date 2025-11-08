// src/components/UserManagement.js (Frontend - Staff Summary Final Redesign and Delete API Fix)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Plus, Trash2, Loader, MapPin, Building, Shield, Users, User, X, DollarSign, TrendingUp, TrendingDown, Minus, ArrowUpDown, Phone } from 'lucide-react';
import API from '../config/api';

// Define roles for staff count (for display purposes)
const STAFF_ROLES = {
    OWNER: 'owner',
    MANAGER: 'manager',
    CASHIER: 'cashier',
};
// Define available plans
const SHOP_PLANS = {
    BASIC: 'Basic',
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise',
};

// --- Utility Functions ---
const getPlanStyles = (plan) => {
    switch (plan) {
        case SHOP_PLANS.ENTERPRISE:
            return 'bg-purple-800/50 text-purple-300 border-purple-700';
        case SHOP_PLANS.PRO:
            return 'bg-indigo-800/50 text-indigo-300 border-indigo-700';
        case SHOP_PLANS.BASIC:
        default:
            return 'bg-gray-700/50 text-gray-300 border-gray-600';
    }
};

/**
 * 💥 FINAL: Clean Staff Summary - Managers and Cashiers only 💥
 */
const StaffPill = ({ count }) => {
    // The total now represents staff who are not the owner (Managers + Cashiers)
    const staffTotal = count.manager + count.cashier;
    return (
        <div className="flex items-center justify-center space-x-3 w-full">
            {/* Total Staff Count (Excluding Owner for better insight into staff size) */}
            {/* <div className="flex items-center justify-center p-2 text-xs font-semibold text-white bg-teal-600 rounded-full h-8 w-8 min-w-[32px]" title="Total Staff (M+C)">
                {staffTotal}
            </div> */}
            
            <div className="flex flex-col space-y-1 text-xs">
                <span className="flex items-center text-teal-400 bg-gray-800 px-2 py-0.5 rounded-full" title="Managers">
                    <Users className="w-3 h-3 mr-1" />{count.manager} M
                </span>
                <span className="flex items-center text-yellow-400 bg-gray-800 px-2 py-0.5 rounded-full" title="Cashiers">
                    <User className="w-3 h-3 mr-1" />{count.cashier} C
                </span>
            </div>
        </div>
    );
};

const PerformanceTrendIndicator = ({ performance }) => {
    const { metric, trend } = performance;
    
    let icon = Minus;
    let color = 'text-gray-400';
    let bgColor = 'bg-gray-800';

    if (trend === 'up') {
        icon = TrendingUp;
        color = 'text-green-400';
        bgColor = 'bg-green-900/40';
    } else if (trend === 'down') {
        icon = TrendingDown;
        color = 'text-red-400';
        bgColor = 'bg-red-900/40';
    }

    const IconComponent = icon;

    return (
        <div className={`flex items-center justify-center px-3 py-1 text-sm font-semibold rounded-lg ${bgColor} border border-gray-700/50`}>
            <IconComponent className={`w-4 h-4 mr-1 ${color}`} />
            <span className={`${color}`}>{metric}</span>
        </div>
    );
};


const UserManagement = ({ apiClient, API, showToast, currentUser }) => { 
    const [shops, setShops] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState({ key: 'name', direction: 'ascending' });

    // --- Data Fetching Logic ---
    const mapUserToShop = (user) => ({
        id: user._id, 
        name: user.email.split('@')[0] || user._id, 
        location: user.location || 'N/A', 
        status: user.isActive !== false ? 'Active' : 'Inactive', 
        plan: user.plan || SHOP_PLANS.BASIC, 
        phone: user.phone || 'N/A',
        // Owner is always 1 by design, this count is for display logic
        staffCount: { owner: 1, manager: 0, cashier: 0 }, 
        performanceTrend: { metric: "N/A", trend: 'flat' }, 
        apiEndpoint: `/api/superadmin/shops/${user._id}`,
    });

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminShops);
            if (response.data.success) {
                const mappedShops = response.data.data.map(mapUserToShop);
                setShops(mappedShops);
                showToast(`Loaded ${mappedShops.length} shops successfully.`, 'success');
            } else {
                showToast(response.data.message || 'Failed to load shops.', 'error');
            }
        } catch (error) {
            console.error('Fetch Shops Error:', error);
            const errorMessage = error.response?.data?.error || 'Could not connect to the Superadmin API.';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [apiClient, showToast]); 

    useEffect(() => {
        if (currentUser && currentUser.role === 'superadmin') {
            fetchShops();
        } else if (currentUser) {
            setShops([]); 
            showToast('Access Denied: Only Superadmin can view shop list.', 'warning');
        }
    }, [fetchShops, currentUser]);

    // --- Sorting and Filtering Logic (Omitted for brevity) ---
    const handleSort = (key) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    const filteredAndSortedShops = useMemo(() => {
        let filtered = shops.filter(shop => 
            shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.location.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const aValue = a[sortBy.key] || '';
            const bValue = b[sortBy.key] || '';

            if (aValue < bValue) {
                return sortBy.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortBy.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [shops, searchTerm, sortBy]);


    // --- 💥 API Integration: Delete Shop (DELETE) FIX 💥 ---
    const handleDeleteShop = async (shopId, shopName) => {
        console.log(`[DELETE] Attempting to delete shop: ${shopName} (ID: ${shopId})`);

        // IMPORTANT: Use a custom modal instead of window.confirm in production
        if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE the shop and all its data for: ${shopName}? This action cannot be undone.`)) {
            console.log('[DELETE] Deletion cancelled by user.');
            return;
        }

        setIsLoading(true);
        try {
            // FIX: Ensure API.superadminShopDetails is called as a function to get the full URL
            const deleteUrl = API.superadminShopDetails(shopId); 
            const response = await apiClient.delete(deleteUrl);
            
            if (response.data.success) {
                setShops(prev => prev.filter(s => s.id !== shopId));
                showToast(`Shop ${shopName} deleted successfully.`, 'success'); // SUCCESS TOAST ADDED
            } else {
                 showToast(response.data.message || `Failed to delete shop ${shopName}.`, 'error'); // ERROR TOAST ADDED
            }
        } catch (error) {
            console.error('Delete Shop Error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete shop due to a network or server error.';
            showToast(errorMessage, 'error'); // ERROR TOAST ADDED
        } finally {
            setIsLoading(false);
        }
    };

    // --- Component Render ---
    const SortIcon = ({ columnKey }) => {
        if (sortBy.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600" />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortBy.direction === 'ascending' ? 'rotate-180 text-indigo-400' : 'text-indigo-400'}`} />;
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-950 transition-colors duration-300">
            {/* Header / Search Bar */}
            <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-white flex items-center">
                    <Building className="w-7 h-7 mr-3 text-indigo-400" /> Shop Management
                </h1>
            </div>
            
            <div className="pt-4 pb-6">
                <input
                    type="text"
                    placeholder="Search by Shop Name or Location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                />
            </div>

            {/* Table */}
            <div className="flex-grow overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-400">
                        <Loader className="w-10 h-10 animate-spin text-teal-400" />
                        <p className='mt-3'>Loading shop list...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl shadow-2xl border border-gray-800">
                        <table className="min-w-full divide-y divide-gray-800">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition duration-150"
                                        onClick={() => handleSort('name')}
                                    >
                                        <div className="flex items-center">Shop Name <SortIcon columnKey="name" /></div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-700/50 transition duration-150"
                                        onClick={() => handleSort('location')}
                                    >
                                        <div className="flex items-center">Location <SortIcon columnKey="location" /></div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider hidden sm:table-cell cursor-pointer hover:bg-gray-700/50 transition duration-150"
                                        onClick={() => handleSort('phone')}
                                    >
                                        <div className="flex items-center">Phone <SortIcon columnKey="phone" /></div>
                                    </th>
                                    <th 
                                        className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition duration-150"
                                        onClick={() => handleSort('plan')}
                                    >
                                        <div className="flex justify-center items-center">Plan <SortIcon columnKey="plan" /></div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Staff Summary
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Performance (30D)
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900 divide-y divide-gray-800">
                                {filteredAndSortedShops.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="py-8 text-center text-gray-400">
                                            {searchTerm ? 'No shops found matching your criteria.' : 'No shops registered or failed to load from API.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedShops.map((shop) => (
                                        <tr key={shop.id} className="hover:bg-gray-850 transition duration-150">
                                            {/* Data Cells (omitted for brevity) */}
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Store className="w-5 h-5 mr-3 text-indigo-400" />
                                                    <p className="text-sm font-medium text-white">{shop.name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                                <div className="flex items-center text-sm text-gray-400">
                                                    <MapPin className="w-4 h-4 mr-1 text-gray-500" /> {shop.location}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                                                <div className="flex items-center text-sm text-gray-400">
                                                    <Phone className="w-4 h-4 mr-1 text-gray-500" /> {shop.phone}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span 
                                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getPlanStyles(shop.plan)}`}
                                                >
                                                    <DollarSign className='w-3 h-3 mr-1 mt-0.5' /> {shop.plan.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <StaffPill count={shop.staffCount} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <PerformanceTrendIndicator performance={shop.performanceTrend} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span 
                                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        shop.status === 'Active' ? 'bg-green-800/50 text-green-300' : 
                                                        shop.status === 'Suspended' ? 'bg-red-800/50 text-red-300' : 'bg-yellow-800/50 text-yellow-300'
                                                    }`}
                                                >
                                                    {shop.status}
                                                </span>
                                            </td>
                                            {/* Action Column */}
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center space-x-2">
                                                    <button 
                                                        className="text-red-400 hover:text-white hover:bg-red-600/50 p-2 rounded-full transition-colors"
                                                        title="Delete Shop"
                                                        onClick={() => {
                                                            console.log(`[CLICK] Delete button clicked for ${shop.name}.`);
                                                            handleDeleteShop(shop.id, shop.name);
                                                        }}
                                                        // TEMPORARILY REMOVED DISABLED: to ensure you can test the delete API call
                                                        // Re-add this check if you want to prevent deletion of Active shops:
                                                        // disabled={shop.status === 'Active'}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagement;