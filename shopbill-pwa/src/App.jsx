import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, DollarSign, Home, Package, Barcode, Loader, TrendingUp, AlertTriangle, X, Plus, Trash2, Edit, Settings, CheckCircle, User, ShoppingCart, Minus, LogOut } from 'lucide-react';
import axios from 'axios';
import NotificationToast from './components/NotificationToast';
import InventoryManager from './components/InventoryManager';
import Dashboard from './components/Dashboard';
import API from '../src/config/api'
import BillingPOS from './components/BillingPOS';
import Header from './components/Header'; // Ensure this import is correct
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import SettingsPage from './components/Settings'
import Profile from './components/Profile';
import Login from './components/Login';
import NotificationsPage from './components/NotificationsPage';
import LandingPage from './components/LandingPage'

// --- Configuration and Constants ---
const USER_ROLES = {
  OWNER: 'owner',
  CASHIER: 'cashier',
};

// --- AXIOS INSTANCE WITH AUTH INTERCEPTOR ---
const apiClient = axios.create();

apiClient.interceptors.request.use(
  (config) => {
    // CRITICAL: Interceptor reads token from localStorage on EVERY request creation
    const token = localStorage.getItem('userToken');
    // console.log("token---===--", token); // Keep this for debugging if needed

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// --- END AXIOS CONFIG ---

const App = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Tracks initial auth check
  const [isLoadingData, setIsLoadingData] = useState(false); // Tracks data fetching
  const [dataLoadedInitial, setDataLoadedInitial] = useState(false); // New flag to prevent uncontrolled calls
  const [toast, setToast] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isViewingLogin, setIsViewingLogin] = useState(false);

  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);

  const userRole = currentUser?.role || USER_ROLES.CASHIER;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // --- LOGOUT HANDLER ---
  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setInventory([]);
    setCustomers([]);
    setSales([]);
    setCurrentPage('dashboard');
    setIsViewingLogin(false);
    setIsLoadingAuth(false);
    setIsLoadingData(false);
    setDataLoadedInitial(false); // Reset data flag on logout
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  // --- DATA FETCHING ---
  const loadInitialData = useCallback(async (tokenOverride = null) => {
    const currentToken = tokenOverride || localStorage.getItem('userToken');
    
    if (!currentToken || isLoadingData) {
        return;
    }

    setIsLoadingData(true);
    showToast('Fetching latest shop data...', 'info');

    const config = tokenOverride ? {
        headers: { Authorization: `Bearer ${tokenOverride}` }
    } : {};

    try {
      const [invResponse, custResponse, salesResponse] = await Promise.all([
        apiClient.get(`${API.inventory}`, config),
        apiClient.get(`${API.customers}`, config),
        apiClient.get(`${API.sales}`, config),
      ]);

      setInventory(invResponse.data);
      setCustomers(custResponse.data);
      setSales(salesResponse.data);
      setDataLoadedInitial(true); // Set flag after successful load
      showToast('Shop data loaded successfully!', 'success');

    } catch (error) {
      console.error("Failed to load MERN data:", error);
      
      if (error.response && error.response.status === 401) {
          showToast('Session expired. Please log in again.', 'error');
          logout();
      } else {
          showToast('Error loading shop data from MERN API. Check server connection.', 'error');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [showToast, logout, isLoadingData]);


  // --- LOGIN HANDLER ---
  const handleLoginSuccess = useCallback((user, token) => {
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));

    setCurrentUser(user);
    setIsViewingLogin(false);
    setCurrentPage('dashboard');
    showToast('Welcome back!', 'success');
    
    // Explicit call for new login session
    loadInitialData(token);
  }, [showToast, loadInitialData]);


  // --- 1. INITIAL AUTH CHECK EFFECT (Runs once on mount) ---
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    
    if (token && userJson && token !== 'undefined') {
      try {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        logout();
      }
    }
    
    setIsLoadingAuth(false);
  }, [logout]);


  // 🐛 FIX: DATA LOADING EFFECT (Runs only once after a user is set for persistence)
  useEffect(() => {
    // Load data ONLY if a user is set AND we haven't loaded data yet AND auth is complete
    if (currentUser && !isLoadingAuth && !dataLoadedInitial) {
        loadInitialData();
    }
  }, [currentUser, isLoadingAuth, dataLoadedInitial, loadInitialData]);


  // --- Dark Mode Effect ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  // 3. Action Functions (stubs)
  const addSale = useCallback(async (saleData) => {
    try {
      // await apiClient.post(`${API.sales}`, saleData); // Use apiClient in real code
      showToast('Sale successfully recorded!', 'success');
      // Force refresh data after sale
      await loadInitialData(); 
    } catch (error) {
      showToast('Error recording sale.', 'error');
    }
  }, [loadInitialData, showToast]);

  const updateCustomerCredit = useCallback(async (customerId, amountChange) => {
    try {
      // await apiClient.put(`${API.customers}/${customerId}/credit`, { amountChange }); // Use apiClient in real code
      showToast('Customer Khata updated successfully!', 'success');
      // Force refresh data after credit update
      await loadInitialData(); 
    } catch (error) {
      showToast('Error updating customer credit.', 'error');
    }
  }, [loadInitialData, showToast]);

  // Navigation Menu Items with Access Control
  const navItems = useMemo(() => ([
    { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.CASHIER] },
    { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.CASHIER] },
    { id: 'khata', name: 'Khata/Credit', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.CASHIER] },
    { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER] },
    { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.OWNER] },
    // Removed explicit 'logout' item here
  ].filter(item => item.roles.includes(userRole))), [userRole]);

  const renderContent = () => {
    
    if (isLoadingAuth) {
         return (
             // Updated Loader styling for dark theme
             <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-teal-400" />
                <p className='mt-3'>Checking authentication...</p>
             </div>
        );
    }
    
    if (!currentUser) {
            if (isViewingLogin) {
                return <Login 
                    onLogin={handleLoginSuccess} 
                    showToast={showToast} 
                    onBackToLanding={() => setIsViewingLogin(false)} 
                    apiUrl={API.login}
                />;
            }
            return <LandingPage onStartApp={() => setIsViewingLogin(true)} />;
        }
    
    if (isLoadingData) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
          <Loader className="w-10 h-10 animate-spin text-teal-400" />
          <p className='mt-3'>Loading shop data...</p>
        </div>
      );
    }

    const commonProps = {
      inventory,
      customers,
      sales,
      currentUser, 
      addSale,
      updateCustomerCredit,
      userRole,
      showToast,
      refreshData: loadInitialData,
      customerApiUrl: API.customers
    };

    // The logout logic is now exclusively in the Header component's onLogout prop
    
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard {...commonProps} />;
      case 'billing':
        return <BillingPOS {...commonProps} />;
      case 'khata':
        return <Ledger {...commonProps} />;
      case 'inventory':
        return <InventoryManager {...commonProps} />;
      case 'reports':
        return <Reports {...commonProps} />;
      case 'settings':
        return <SettingsPage {...commonProps} />;
      case 'profile':
        return <Profile {...commonProps} />;
      case 'notifications':
        return <NotificationsPage />;  
      default:
        return <Dashboard {...commonProps} />;
    }
  };

  return (
    // Main App Container - Updated to darkest background
    <div className="min-h-screen bg-gray-950 flex flex-col font-sans transition-colors duration-300">
        
        {currentUser && (
            <Header
                companyName="Pocket POS"
                userRole={userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                setCurrentPage={setCurrentPage}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
                onLogout={logout} 
            />
        )}
        
        {currentUser && (
            // Desktop Sidebar - Updated to dark theme
            <div className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-gray-900 shadow-2xl shadow-indigo-900/10 z-10 transition-colors duration-300 border-r border-gray-800">
                <div className="p-6 border-b border-gray-800">
                    {/* Header Text/Logo - Using Teal accent */}
                    <h2 className="text-2xl font-extrabold text-teal-400">
                        <DollarSign className="inline-block w-6 h-6 mr-2 text-teal-400" /> Pocket POS
                    </h2>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                        User: {userRole.charAt(0).toUpperCase() + userRole.slice(1)} | MERN-Ready
                    </p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            className={`w-full flex items-center p-3 rounded-xl font-medium transition duration-150 ${currentPage === item.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' // Active: Indigo
                                : 'text-gray-300 hover:bg-gray-800' // Inactive: Dark hover
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </button>
                    ))}
                </nav>
                
                {/* Dedicated Logout Button for Desktop Sidebar - Updated to dark theme */}
                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={logout}
                        className="w-full flex items-center p-3 rounded-xl font-medium transition duration-150 text-red-400 hover:bg-red-900/20"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>

            </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${currentUser ? 'md:ml-64 pt-16 pb-16 md:pb-0' : 'w-full'}`}>
            {renderContent()}
        </main>

        {currentUser && (
            // Mobile Navigation Bar - Updated to dark theme
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-900 border-t border-gray-800 shadow-2xl md:hidden z-30 transition-colors duration-300">
                <div className="flex justify-around items-center h-full px-1">
                    {/* Filter out 'logout' item since it's now in the header */}
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            className={`flex flex-col items-center justify-center p-1 transition duration-150 flex-1 min-w-0 ${currentPage === item.id
                                ? 'text-indigo-400 font-bold' // Active: Indigo
                                : 'text-gray-400 hover:text-indigo-300' // Inactive: Dark text with light hover
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-xs mt-0.5 whitespace-nowrap truncate">{item.name.split('/')[0]}</span>
                        </button>
                    ))}
                </div>
            </nav>
        )}

      <NotificationToast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

export default App;