import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, DollarSign, Home, Package, Barcode, Loader, TrendingUp, AlertTriangle, X, Plus, Trash2, Edit, Settings, CheckCircle, User, ShoppingCart, Minus, LogOut } from 'lucide-react';
import axios from 'axios';
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
import ResetPassword from './components/ResetPassword';
import StaffSetPassword from './components/StaffSetPassword'; // <-- NEW IMPORT

// NOTE: Assuming you have a component named SalesActivityPage.jsx for the full sales list.
import SalesActivityPage from './components/SalesActivityPage'; 


// --- Configuration and Constants ---
const USER_ROLES = {
  OWNER: 'owner', // Changed to match backend PascalCase
  MANAGER: 'Manager', // Added Manager role
  CASHIER: 'Cashier', // Changed to match backend PascalCase
};

// --- AXIOS INSTANCE WITH AUTH INTERCEPTOR (Remains Global) ---
const apiClient = axios.create();

apiClient.interceptors.request.use(
  (config) => {
    // CRITICAL: Interceptor reads token from localStorage on EVERY request creation
    const token = localStorage.getItem('userToken');

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

// Helper to check the URL for deep link routes on initial load
const checkDeepLinkPath = () => {
    const path = window.location.pathname;
    
    // Check for Staff Activation Link
    if (path.startsWith('/staff-setup/')) {
        return 'staffSetPassword'; // <-- Must match the state name in App.js
    }
    
    // Check for Password Reset Link
    if (path.startsWith('/reset-password/')) {
        return 'resetPassword'; // <-- Must match the state name in App.js
    }
    
    return null; 
};

const App = () => {
  // FIX: Use the updated checkDeepLinkPath function
  const [currentPage, setCurrentPage] = useState(checkDeepLinkPath() || 'dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  
  const [isViewingLogin, setIsViewingLogin] = useState(false);
  
  // FIX: Use the updated USER_ROLES constant
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
    setCurrentPage('dashboard');
    setIsViewingLogin(false);
    setIsLoadingAuth(false);
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  // --- LOGIN HANDLER ---
  const handleLoginSuccess = useCallback((user, token) => {
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));

    setCurrentUser(user);
    setIsViewingLogin(false);
    setCurrentPage('dashboard');
    showToast('Welcome back!', 'success');
    
  }, [showToast]);


  // --- INITIAL AUTH CHECK EFFECT (Runs once on mount) ---
useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    
    // 1. Check for a deep link path first
    const deepLink = checkDeepLinkPath(); // 'staffSetPassword' or 'resetPassword' or null

    if (token && userJson && token !== 'undefined' && token !== null) {
      try {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
        
        // 2. If the user is logged in, DO NOT display the deep link page.
        //    Instead, force a redirect to the dashboard.
        if (deepLink) {
            setCurrentPage('dashboard');
        } else {
            // Otherwise, keep the current page or default to dashboard
            // if the initial page state was set by checkDeepLinkPath() (which shouldn't happen here)
            // No action needed here, as the initial state is already 'dashboard' if no deep link was found.
        }

      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        logout();
      }
    } else if (deepLink) {
        // 3. CRITICAL: If NOT logged in but on a deep link, KEEP the deep link page active.
        setCurrentPage(deepLink);
    }
    
    setIsLoadingAuth(false); 
}, [logout]);


  // --- Dark Mode Enforcement Effect ---
  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('dark');
    html.style.colorScheme = 'dark'; 
  }, []); 

  // Action Functions (Simplified)
  const addSale = useCallback(async (saleData) => {
    try {
      showToast('Sale successfully recorded!', 'success');
    } catch (error) {
      showToast('Error recording sale.', 'error');
    }
  }, [showToast]);

  const updateCustomerCredit = useCallback(async (customerId, amountChange) => {
    try {
      showToast('Customer Khata updated successfully!', 'success');
    } catch (error) {
      showToast('Error updating customer credit.', 'error');
    }
  }, [showToast]);

  // --- NAVIGATION HANDLERS ---
  const handleViewAllSales = useCallback(() => {
    setCurrentPage('salesActivity');
  }, []);

  const handleViewAllCredit = useCallback(() => {
    setCurrentPage('khata'); 
  }, []);

  const handleViewAllInventory = useCallback(() => {
    setCurrentPage('inventory'); 
  }, []);
  // --- END NAVIGATION HANDLERS ---


  // Navigation Menu Items with Access Control
  const navItems = useMemo(() => ([
    // FIX: Updated roles to use PascalCase constants
    { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
    { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
    { id: 'khata', name: 'Khata/Credit', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
    { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
    { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
  ].filter(item => item.roles.includes(userRole))), [userRole]);

  const renderContent = () => {
    
    if (isLoadingAuth) {
         return (
             <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-400 bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-teal-400" />
                <p className='mt-3'>Checking authentication...</p>
             </div>
        );
    }
    
    // NEW LOGIC: Handle the Staff Set Password deep link
    if (currentPage === 'staffSetPassword') {
        return <StaffSetPassword />;
    }
    
    // Existing Logic: Handle the Password Reset deep link
    if (currentPage === 'resetPassword') {
        return <ResetPassword />;
    }

    if (!currentUser) {
            if (isViewingLogin) {
                return <Login 
                    onLogin={handleLoginSuccess} 
                    showToast={showToast} 
                    onBackToLanding={() => setIsViewingLogin(false)} 
                />;
            }
            return <LandingPage onStartApp={() => setIsViewingLogin(true)} />;
    }
    
    const commonProps = {
      currentUser, 
      addSale,
      updateCustomerCredit,
      userRole,
      showToast,
      apiClient, 
      API, 
      onLogout:logout,
    };
    
    switch (currentPage) {
      case 'dashboard':
        return (
            <Dashboard 
                {...commonProps} 
                onViewAllSales={handleViewAllSales}
                onViewAllCredit={handleViewAllCredit}
                onViewAllInventory={handleViewAllInventory}
            />
        );
      case 'billing':
        return <BillingPOS {...commonProps} />;
      case 'khata':
        return <Ledger {...commonProps} />;
      case 'inventory':
        return <InventoryManager {...commonProps} />;
      case 'reports':
        return <Reports {...commonProps} />;
      case 'salesActivity':
        return <SalesActivityPage {...commonProps} />;
      case 'settings':
        return <SettingsPage {...commonProps} />; 
      case 'profile':
        return <Profile {...commonProps} />;
      case 'notifications':
        return <NotificationsPage {...commonProps} />;  
      default:
        return <Dashboard 
            {...commonProps}
            onViewAllSales={handleViewAllSales}
            onViewAllCredit={handleViewAllCredit}
            onViewAllInventory={handleViewAllInventory}
        />;
    }
  };

  // Determine if we should show the full app UI (Header/Sidebar/FooterNav)
  const showAppUI = currentUser && 
                    currentPage !== 'resetPassword' && 
                    currentPage !== 'staffSetPassword'; // <-- EXCLUDE new page

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-300">
        
        {showAppUI && (
            <Header
                companyName="Pocket POS"
                // FIX: Use optional chaining before calling charAt in case role is null
                userRole={userRole?.charAt(0).toUpperCase() + userRole?.slice(1)} 
                setCurrentPage={setCurrentPage}
                onLogout={logout}
                apiClient={apiClient}
                API={API}
            />
        )}
        
        {showAppUI && (
            <div className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full 
                 bg-white dark:bg-gray-900 shadow-2xl shadow-indigo-900/10 z-10 
                 transition-colors duration-300 border-r border-gray-200 dark:border-gray-800"
            >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
                        <DollarSign className="inline-block w-6 h-6 mr-2 text-teal-600 dark:text-teal-400" /> Pocket POS
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                        User: {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}
                    </p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            className={`w-full flex items-center p-3 rounded-xl font-medium transition duration-150 ${currentPage === item.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.name}
                        </button>
                    ))}
                </nav>
                
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <button
                        onClick={logout}
                        className="w-full flex items-center p-3 rounded-xl font-medium transition duration-150 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        Logout
                    </button>
                </div>

            </div>
        )}

        {/* Main Content Area */}
        <main className={`flex-1 ${showAppUI ? 'md:ml-64 pt-16 pb-16 md:pb-0' : 'w-full'}`}>
            {renderContent()}
        </main>

        {showAppUI && (
            <nav className="fixed bottom-0 left-0 right-0 h-16 
                 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 
                 shadow-2xl md:hidden z-30 transition-colors duration-300"
            >
                <div className="flex justify-around items-center h-full px-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setCurrentPage(item.id)}
                            className={`flex flex-col items-center justify-center p-1 transition duration-150 flex-1 min-w-0 ${currentPage === item.id
                                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-300'
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