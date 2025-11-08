// src/components/UserManagement.js (API Integrated)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Store, Plus, Trash2, Edit, Loader, MapPin, Building, Shield, Users, User, X, DollarSign, TrendingUp, TrendingDown, Minus, ArrowUpDown } from 'lucide-react';
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

// --- MOCK DATA (Retained for structure/defaults) ---
// This mock is now ONLY used for default structure when mapping API data.
const MOCK_SHOPS = [
    // ... (Your previous mock data is largely replaced by API calls)
];
// --- End Mock Data ---


// --- Utility Functions (Kept the same) ---
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

const StaffPill = ({ count }) => {
    // ... (StaffPill implementation remains the same)
    const total = count.owner + count.manager + count.cashier;
    return (
        <div className="flex flex-col items-center justify-center p-2 text-xs font-medium text-gray-400 bg-gray-800 rounded-lg w-full">
            <p className="text-xl font-extrabold text-white">{total}</p>
            <p className="text-gray-500">Total Staff</p>
            <div className="flex space-x-2 mt-2">
                <span className="flex items-center text-xs text-indigo-400" title="Owners">
                    <Shield className="w-3 h-3 mr-1" />{count.owner}
                </span>
                <span className="flex items-center text-xs text-teal-400" title="Managers">
                    <Users className="w-3 h-3 mr-1" />{count.manager}
                </span>
                <span className="flex items-center text-xs text-yellow-400" title="Cashiers">
                    <User className="w-3 h-3 mr-1" />{count.cashier}
                </span>
            </div>
        </div>
    );
};

const PerformanceTrendIndicator = ({ performance }) => {
    // ... (PerformanceTrendIndicator implementation remains the same)
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
    // Initial state set to an empty array to be populated by API
    const [shops, setShops] = useState([]); 
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingShop, setEditingShop] = useState(null); 
    
    // --- State for Search and Sorting ---
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState({ key: 'name', direction: 'ascending' });


    // --- 💥 API Integration: Data Fetching (GET All Shops) 💥 ---
    /**
     * Maps the backend 'User' (Owner) object to the frontend 'Shop' object structure.
     */
    const mapUserToShop = (user) => ({
        // Map required fields from the User model:
        id: user._id, // Use MongoDB ID as the shop ID
        name: user.email.split('@')[0] || user._id, // Mock name from email for now
        location: user.location || 'N/A', // Assuming a 'location' field is added or derived
        status: user.isActive !== false ? 'Active' : 'Inactive', // Map isActive to status
        plan: user.plan || SHOP_PLANS.BASIC, // Assuming a 'plan' field is added or defaults
        
        // Mock fields not yet supported by the backend:
        staffCount: { owner: 1, manager: 0, cashier: 0 }, 
        performanceTrend: { metric: "N/A", trend: 'flat' }, 
        apiEndpoint: `/api/superadmin/shops/${user._id}`,
    });

    const fetchShops = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await apiClient.get(API.superadminShops);
            if (response.data.success) {
                // Map the array of User objects to the expected Shop object structure
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
        // Only fetch if the user is a Superadmin (a simple check, better handled by backend auth)
        if (currentUser && currentUser.role === 'superadmin') {
            fetchShops();
        } else if (currentUser) {
            // Fallback for non-superadmin users viewing this component
            setShops([]); 
            showToast('Access Denied: Only Superadmin can view shop list.', 'warning');
        }
    }, [fetchShops, currentUser]);

    // --- Sorting Logic (Remains the same) ---
    const handleSort = (key) => {
        setSortBy(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending',
        }));
    };

    // --- Memoized Filtered and Sorted Shops (Remains the same) ---
    const filteredAndSortedShops = useMemo(() => {
        let filtered = shops.filter(shop => 
            shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            shop.location.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => {
            const aValue = a[sortBy.key];
            const bValue = b[sortBy.key];

            if (aValue < bValue) {
                return sortBy.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortBy.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }, [shops, searchTerm, sortBy]);


    // --- 💥 API Integration: Delete Shop (DELETE) 💥 ---
    const handleDeleteShop = async (shopId, shopName) => {
        if (!window.confirm(`Are you sure you want to DELETE the shop and all its data for: ${shopName}? This action cannot be undone.`)) {
            return;
        }

        setIsLoading(true);
        try {
            // Note: The backend route to DELETE a shop needs to be implemented in superadminRoutes.js
            const response = await apiClient.delete(API.superadminShopDetails(shopId));
            
            if (response.data.success) {
                setShops(prev => prev.filter(s => s.id !== shopId));
                showToast(`Shop ${shopName} deleted successfully.`, 'success');
            } else {
                 showToast(response.data.message || `Failed to delete shop ${shopName}.`, 'error');
            }
        } catch (error) {
            console.error('Delete Shop Error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to delete shop due to a server error.';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // --- 💥 API Integration: Save Shop (POST/PUT) 💥 ---
    const handleSaveShop = async (shopData) => {
        setIsLoading(true);
        try {
            let response;
            if (shopData.id) {
                // UPDATE (PUT)
                // Note: The backend route to UPDATE a shop needs to be implemented in superadminRoutes.js
                response = await apiClient.put(API.superadminShopDetails(shopData.id), {
                    // Only send fields that can be updated in the User model by Superadmin
                    location: shopData.location,
                    plan: shopData.plan,
                    isActive: shopData.status === 'Active' // Map status back to isActive boolean
                });
            } else {
                // ADD (POST)
                // Note: The backend route to CREATE a shop needs to be implemented in superadminRoutes.js
                response = await apiClient.post(API.superadminShops, {
                    email: `${shopData.name.replace(/\s/g, '').toLowerCase()}@mockshop.com`, // Superadmin POST requires initial owner email
                    location: shopData.location,
                    plan: shopData.plan,
                    // No password needed, as the Superadmin flow creates the account, 
                    // and the owner will set the password later (or a temp one is provided).
                });
            }

            if (response.data.success) {
                // Re-fetch the list to get the most accurate, updated data from the server
                fetchShops(); 
                showToast(`Shop ${shopData.name} saved successfully.`, 'success');
                setIsModalOpen(false);
                setEditingShop(null);
            } else {
                 showToast(response.data.message || `Failed to save shop ${shopData.name}.`, 'error');
            }

        } catch (error) {
            console.error('Save Shop Error:', error);
            const errorMessage = error.response?.data?.error || 'Failed to save shop due to a server error.';
            showToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    // --- Shop Modal Component (Updated to use isActive for Status mapping) ---
    const ShopModal = ({ shop, onClose, onSave }) => {
        // Map the boolean isActive (implied by status) back to the modal's status field
        const initialStatus = shop?.status || 'Active';

        const [formData, setFormData] = useState({
            name: shop?.name || '',
            location: shop?.location || '',
            status: initialStatus,
            plan: shop?.plan || SHOP_PLANS.BASIC,
        });

        const handleChange = (e) => {
            const { name, value } = e.target;
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            // Pass the data back to the parent handler
            const payload = shop ? { ...shop, ...formData } : formData;
            onSave(payload);
        };

        const title = shop ? `Edit Shop: ${shop.name}` : 'Register New Shop';

        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <form onSubmit={handleSubmit} className="bg-gray-800 w-full max-w-md rounded-xl shadow-2xl border border-indigo-700">
                    {/* Header/Body/Footer JSX remains the same, using formData */}
                    <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-indigo-900/40 rounded-t-xl">
                        <h3 className="text-xl font-bold text-indigo-300 flex items-center">
                            {shop ? <Edit className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                            {title}
                        </h3>
                        <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Shop Name {shop ? ' (Owner Email)' : ''}</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                // Allow name to be edited only if adding new shop (for creating the email)
                                disabled={!!shop} 
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-700/50"
                                placeholder={shop ? 'Cannot change shop name/ID' : 'e.g., NewShopName'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Location / City</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                required
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Plan</label>
                            <select
                                name="plan"
                                value={formData.plan}
                                onChange={handleChange}
                                required
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {Object.values(SHOP_PLANS).map(plan => (
                                    <option key={plan} value={plan}>{plan}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                required
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="Suspended">Suspended</option>
                            </select>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-700">
                        <button 
                            type="submit"
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-extrabold text-lg shadow-xl hover:bg-indigo-700 transition"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader className="w-5 h-5 inline mr-2 animate-spin" /> : (shop ? 'Save Shop Details' : 'Register Shop')}
                        </button>
                    </div>
                </form>
            </div>
        );
    };

    // --- Component Render (Remains the same) ---
    const SortIcon = ({ columnKey }) => {
        if (sortBy.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 text-gray-600" />;
        return <ArrowUpDown className={`w-3 h-3 ml-1 ${sortBy.direction === 'ascending' ? 'rotate-180 text-indigo-400' : 'text-indigo-400'}`} />;
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-gray-950 transition-colors duration-300">
            {/* Header */}
            <div className="pb-4 border-b border-gray-800 flex justify-between items-center">
                <h1 className="text-3xl font-extrabold text-white flex items-center">
                    <Building className="w-7 h-7 mr-3 text-indigo-400" /> Shop Management
                </h1>
                {/* <button
                    onClick={handleAddShop}
                    className="flex items-center bg-teal-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-teal-700 transition shadow-lg"
                    disabled={isLoading}
                >
                    <Plus className="w-5 h-5 mr-2" /> Register New Shop
                </button> */}
            </div>
            
            {/* Search Bar */}
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
                                        className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-700/50 transition duration-150"
                                        onClick={() => handleSort('plan')}
                                    >
                                        <div className="flex justify-center items-center">Plan <SortIcon columnKey="plan" /></div>
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Staff Summary</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Performance (30D)</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-gray-900 divide-y divide-gray-800">
                                {filteredAndSortedShops.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="py-8 text-center text-gray-400">
                                            {searchTerm ? 'No shops found matching your criteria.' : 'No shops registered or failed to load from API.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAndSortedShops.map((shop) => (
                                        <tr key={shop.id} className="hover:bg-gray-850 transition duration-150">
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
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <div className="flex justify-center space-x-2">
                                                    <button 
                                                        className="text-indigo-400 hover:text-white hover:bg-indigo-600/50 p-2 rounded-full transition-colors"
                                                        title="Edit Shop"
                                                        onClick={() => handleEditShop(shop)}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        className="text-red-400 hover:text-white hover:bg-red-600/50 p-2 rounded-full transition-colors"
                                                        title="Delete Shop"
                                                        onClick={() => handleDeleteShop(shop.id, shop.name)}
                                                        disabled={shop.status === 'Active'}
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
            
            {isModalOpen && (
                <ShopModal 
                    shop={editingShop} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={handleSaveShop}
                />
            )}
        </div>
    );
};

export default UserManagement;