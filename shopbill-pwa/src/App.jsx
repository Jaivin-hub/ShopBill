import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, DollarSign, Home, Package, Barcode, Loader, TrendingUp, AlertTriangle, X, Plus, Trash2, Edit, Settings, CheckCircle, User, ShoppingCart, Minus } from 'lucide-react';
import axios from 'axios'; // Import Axios for API calls
import NotificationToast from './components/NotificationToast';
import InventoryManager from './components/InventoryManager';
import Dashboard from './components/Dashboard';
import API from '../src/config/api'
import BillingPOS from './components/BillingPOS';
import Header from './components/Header';
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import SettingsPage from './components/Settings'
import Profile from './components/Profile';
import Login from './components/Login';
import NotificationsPage from './components/NotificationsPage';
import LandingPage from './components/LandingPage'

// --- Configuration and Constants ---
const USER_ROLES = {
  OWNER: 'owner', // Can access all reports, inventory management, settings
  CASHIER: 'cashier', // Can only access BillingPOS and basic Khata view
};


// --- MOCK AUTH (Simulating a successful login for initial setup) ---
const mockAuth = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        user: {
          id: 'mern-user-12345',
          role: USER_ROLES.OWNER // Start with OWNER for full app access
        }
      });
    }, 300); // 300ms mock latency
  });
};
// --- END MOCK AUTH ---


const App = () => {
  // Use a sensible default for the current page
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingData, setLoadingData] = useState(false); // Initially false, check will happen after login
  const [toast, setToast] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode for a modern look
  
  // New state to manage the unauthenticated view: Landing Page vs Login
  const [isViewingLogin, setIsViewingLogin] = useState(false);

  // Data State
  const [inventory, setInventory] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);

  // Role based access logic
  const userRole = currentUser?.role || USER_ROLES.CASHIER; 

  /** Utility function to display a notification and auto-hide it. */
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000); // Hide after 3 seconds
    return () => clearTimeout(timer);
  }, []);

  // 2. Data Fetching (Uses Mock Axios to connect to simulated Express API)
  const loadInitialData = useCallback(async () => {
    if (!currentUser) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    showToast('Fetching latest shop data...', 'info');

    try {
      // Fetching all necessary data simultaneously
      const [invResponse, custResponse, salesResponse] = await Promise.all([
        axios.get(`${API.inventory}`),
        axios.get(`${API.customers}`),
        axios.get(`${API.sales}`),
      ]);

      setInventory(invResponse.data);
      setCustomers(custResponse.data);
      setSales(salesResponse.data);
      showToast('Shop data loaded successfully!', 'success');

    } catch (error) {
      console.error("Failed to load MERN data:", error);
      showToast('Error loading shop data from MERN API. Check server connection.', 'error');
    } finally {
      setLoadingData(false);
    }
  }, [currentUser, showToast]);


  // Dark and light mode setup
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

  // Load data once authentication is successful
  useEffect(() => {
    // Only attempt to load data if a user is set and auth is ready (which happens after successful login)
    if (currentUser) {
        setAuthReady(true);
        loadInitialData();
    }
  }, [currentUser, loadInitialData]);


  // 3. Action Functions (Using Mock Axios for POST/PUT requests to the API)
  const addSale = useCallback(async (saleData) => {
    try {
      await axios.post(`${API.sales}`, saleData);
      showToast('Sale successfully recorded!', 'success');
    } catch (error) {
      console.error('Failed to add sale:', error);
      showToast('Error recording sale.', 'error');
    }
    await loadInitialData(); 
  }, [loadInitialData, showToast]);

  const updateCustomerCredit = useCallback(async (customerId, amountChange) => {
    try {
      await axios.put(`${API.customers}/${customerId}/credit`, { amountChange });
      showToast('Customer Khata updated successfully!', 'success');
    } catch (error) {
      console.error('Failed to update credit:', error);
      showToast('Error updating customer credit.', 'error');
    }
    await loadInitialData(); 
  }, [loadInitialData, showToast]);

  // Navigation Menu Items with Access Control
  const navItems = useMemo(() => ([
    { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER] },
    { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.CASHIER] },
    { id: 'khata', name: 'Khata/Credit', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.CASHIER] },
    { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER] },
    { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.OWNER] },
  ].filter(item => item.roles.includes(userRole))), [userRole]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    // User is now authenticated, switch to main app view
    setIsViewingLogin(false); 
    setCurrentPage('dashboard');
  };

  // Determine current component to render
  const renderContent = () => {
    
    // --- 1. Unauthenticated Views (Landing Page or Login) ---
    if (!currentUser) {
            if (isViewingLogin) {
                // ADDED onBackToLanding PROP HERE
                return <Login onLogin={handleLoginSuccess} showToast={showToast} onBackToLanding={() => setIsViewingLogin(false)} />;
            }
            // Default unauthenticated view
            return <LandingPage onStartApp={() => setIsViewingLogin(true)} />;
        }
    
    // --- 2. Authenticated Loading View ---
    if (loadingData) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Loader className="w-10 h-10 animate-spin text-indigo-500" />
          <p className="mt-4 text-lg font-semibold">
            Loading Shop Data (via MERN API Mock)...
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            User Role: {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
          </p>
        </div>
      );
    }

    // --- 3. Main Application Views ---
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

  // The main layout wrapper
  return (
    // If not authenticated, the app is simply the full-screen renderContent output (Landing or Login)
    // If authenticated, we show the header/sidebar/mobile nav structure.
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col font-sans transition-colors duration-300">
        
        {/* Only show the App shell (Header/Sidebar) if the user is authenticated */}
        {currentUser && (
            <Header
                companyName="Pocket POS"
                userRole={userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                setCurrentPage={setCurrentPage}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
            />
        )}
        
        {currentUser && (
            <div className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-white dark:bg-gray-800 shadow-xl z-10 transition-colors duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">
                        <DollarSign className="inline-block w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" /> Pocket POS
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                        User: {userRole.charAt(0).toUpperCase() + userRole.slice(1)} | MERN-Ready
                    </p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            className={`w-full flex items-center p-3 rounded-xl font-medium transition duration-150 ${currentPage === item.id
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </button>
                    ))}
                </nav>
            </div>
        )}

        {/* Main Content Area - adjusts based on authentication status */}
        <main className={`flex-1 ${currentUser ? 'md:ml-64 pt-16 pb-16 md:pb-0' : 'w-full'}`}>
            {renderContent()}
        </main>

        {/* Mobile Navigation - Only shown if authenticated */}
        {currentUser && (
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl md:hidden z-30 transition-colors duration-300">
                <div className="flex justify-around items-center h-full px-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            className={`flex flex-col items-center justify-center p-1 transition duration-150 flex-1 min-w-0 ${currentPage === item.id
                                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-gray-500 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-300'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="text-xs mt-0.5 whitespace-nowrap truncate">{item.name.split('/')[0]}</span>
                        </button>
                    ))}
                </div>
            </nav>
        )}

      {/* Notification Toast */}
      <NotificationToast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  );
};

export default App;