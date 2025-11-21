import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, DollarSign, Home, Package, Barcode, Loader, TrendingUp, AlertTriangle, X, Plus, Trash2, Edit, Settings, CheckCircle, User, ShoppingCart, Minus, LogOut, Bell, Smartphone, Shield, Users } from 'lucide-react';
import NotificationToast from './components/NotificationToast';
import InventoryManager from './components/InventoryManager';
import Dashboard from './components/Dashboard';
import API from './config/api';
import apiClient from './lib/apiClient';
import { ApiProvider } from './contexts/ApiContext';
import { USER_ROLES } from './utils/constants';
import BillingPOS from './components/BillingPOS';
import Header from './components/Header';
import Ledger from './components/Ledger';
import Reports from './components/Reports';
import SettingsPage from './components/Settings';
import Profile from './components/Profile';
import Login from './components/Login';
import NotificationsPage from './components/NotificationsPage';
import LandingPage from './components/LandingPage';
import ResetPassword from './components/ResetPassword';
import StaffSetPassword from './components/StaffSetPassword'; 
import SalesActivityPage from './components/SalesActivityPage'; 
import UserManagement from './components/UserManagement';
import SuperAdminDashboard from './components/superAdminDashboard';
import SystemConfig from './components/SystemConfig';
import GlobalReport from './components/GlobalReport';
import Checkout from './components/Checkout';

// --- UTILITY NAVIGATION ITEMS (New for Header/Utility area) ---
const UTILITY_NAV_ITEMS_CONFIG = [
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
    { id: 'profile', name: 'Profile', icon: User, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
];

// --- SUPERADMIN NAVIGATION CONFIG ---
const SUPERADMIN_NAV_ITEMS = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'superadmin_users', name: 'Manage Shops', icon: Users, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'superadmin_systems', name: 'System Config', icon: Settings, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'reports', name: 'Global Reports', icon: TrendingUp, roles: [USER_ROLES.SUPERADMIN] },
];
// --- END SUPERADMIN CONFIG ---

// Helper to check the URL for deep link routes on initial load
const checkDeepLinkPath = () => {
    const path = window.location.pathname;
    
    if (path.startsWith('/staff-setup/')) {
        return 'staffSetPassword'; 
    }
    
    if (path.startsWith('/reset-password/')) {
        return 'resetPassword'; 
    }
    
    return null; 
};

const App = () => {
  const [currentPage, setCurrentPage] = useState(checkDeepLinkPath() || 'dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const [isViewingLogin, setIsViewingLogin] = useState(false);

  // Handler passed to LandingPage for paid subscriptions
  const handleSelectPlan = useCallback((plan) => {
    setSelectedPlan(plan);
    setIsViewingLogin(true); // Redirects to the Login component
}, []);

  
  // Dark Mode State - Load from localStorage or default to false (light mode)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Toggle dark mode and save to localStorage
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  }, []);
  
  // Apply dark mode class to document root on mount and when it changes
  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
  }, [isDarkMode]);
  
  // Ensure dark mode is applied immediately on mount (sync with localStorage)
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    const savedDarkMode = saved ? JSON.parse(saved) : false;
    const html = document.documentElement;
    
    if (savedDarkMode) {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
  }, []); // Run only on mount
  
  // Normalized user role access
  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;

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

  // --- LOGIN HANDLER (called from Login.js) ---
  const handleLoginSuccess = useCallback((user, token, planToCheckout = null) => {
    const userWithNormalizedRole = { ...user, role: user.role.toLowerCase() }; 
    
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(userWithNormalizedRole));

    setCurrentUser(userWithNormalizedRole);
    setIsViewingLogin(false);
    
    // CRITICAL: If a plan was selected during sign-up, go to checkout, otherwise go to dashboard
    if (planToCheckout) {
        setCurrentPage('checkout');
        setSelectedPlan(planToCheckout); // Ensure state is retained
    } else {
        setCurrentPage('dashboard');
    }
    
    showToast('Welcome back!', 'success');
}, [showToast]);


  // --- INITIAL AUTH CHECK EFFECT (Runs once on mount) ---
useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    
    const deepLink = checkDeepLinkPath(); 

    if (token && userJson && token !== 'undefined' && token !== null) {
      try {
        let user = JSON.parse(userJson);
        // Normalize role on load
        user = { ...user, role: user.role.toLowerCase() };
        setCurrentUser(user);
        
        if (deepLink) {
            setCurrentPage('dashboard');
        } 

      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        logout();
      }
    } else if (deepLink) {
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

  // Action Functions (Simplified) - These are placeholders
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

  // Main Navigation Menu Items with Access Control
  const navItems = useMemo(() => {
    // 1. Define standard (non-superadmin) menu items
    const standardNav = [
        { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'khata', name: 'Khata/Credit', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
        { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
    ];

    // 2. Return Superadmin menu if applicable
    if (userRole === USER_ROLES.SUPERADMIN) {
        return SUPERADMIN_NAV_ITEMS;
    }

    // 3. Otherwise, filter standard menu by user role
    return standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  // Utility Navigation Items with Access Control (for Header/Sidebar)
  const utilityNavItems = useMemo(() => {
    // Superadmin has a different setup, only show Profile/Notifications
    if (userRole === USER_ROLES.SUPERADMIN) {
        return UTILITY_NAV_ITEMS_CONFIG.filter(item => 
            item.id === 'profile' || item.id === 'notifications'
        );
    }
    
    // Filter standard utility items
    return UTILITY_NAV_ITEMS_CONFIG.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  const renderContent = () => {
    
    if (isLoadingAuth) {
         return (
             <div className="flex flex-col items-center justify-center h-full min-h-screen p-8 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-950 transition-colors duration-300">
                <Loader className="w-10 h-10 animate-spin text-teal-400" />
                <p className='mt-3'>Checking authentication...</p>
             </div>
        );
    }
    
    if (currentPage === 'staffSetPassword') {
        return <StaffSetPassword />;
    }
    
    if (currentPage === 'resetPassword') {
        return <ResetPassword />;
    }

    // --- LANDING/LOGIN FLOW ---
    if (!currentUser) {
        if (isViewingLogin) {
            return <Login 
                onLogin={handleLoginSuccess} 
                showToast={showToast} 
                onBackToLanding={() => {
                    setIsViewingLogin(false);
                    setSelectedPlan(null); // Clear selected plan on back
                }} 
                // PASS THE PLAN TO LOGIN COMPONENT
                initialPlan={selectedPlan} 
            />;
        }
        return (
            <LandingPage 
                onStartApp={() => setIsViewingLogin(true)} 
                // PASS THE NEW HANDLER HERE
                onSelectPlan={handleSelectPlan} 
            />
        );
    }
    // --- END LANDING/LOGIN FLOW ---

    // --- CHECKOUT FLOW ---
    if (currentPage === 'checkout') {
        if (!selectedPlan) {
            // Should not happen, but ensure a fallback
            showToast('No plan selected. Redirecting to dashboard.', 'error');
            setCurrentPage('dashboard');
            return null;
        }
        return (
            <Checkout 
                plan={selectedPlan}
                onPaymentSuccess={(plan) => {
                    // This function is called after the payment simulation succeeds
                    showToast(`${plan} plan activated!`, 'success');
                    setCurrentPage('dashboard');
                    setSelectedPlan(null); // Clear the plan state
                    // In a real app, you'd also reload user data to reflect the new subscription status
                }}
                onBackToDashboard={() => {
                    setCurrentPage('dashboard');
                    setSelectedPlan(null); // Clear the plan state
                }}
            />
        );
    }
    // --- END CHECKOUT FLOW ---
    
    const commonProps = {
      currentUser, 
      addSale,
      updateCustomerCredit,
      userRole,
      showToast,
      apiClient, 
      API, 
      onLogout:logout,
      isDarkMode,
      toggleDarkMode,
    };
    
    switch (currentPage) {
      case 'dashboard':
        // Show SuperAdminDashboard for superadmin, regular Dashboard for others
        return userRole === USER_ROLES.SUPERADMIN ? (
            <SuperAdminDashboard {...commonProps} />
        ) : (
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
        // Only render InventoryManager if user is NOT Superadmin
        return userRole !== USER_ROLES.SUPERADMIN 
            ? <InventoryManager {...commonProps} />
            : <div className="p-8 text-center text-gray-400">Superadmin: Access to Inventory via system tools.</div>;
      case 'reports':
        // Show GlobalReport for superadmin, regular Reports for others
        return userRole === USER_ROLES.SUPERADMIN ? (
            <GlobalReport {...commonProps} />
        ) : (
            <Reports {...commonProps} />
        );
      case 'salesActivity':
        return <SalesActivityPage {...commonProps} />;
      case 'settings':
        return <SettingsPage {...commonProps} />; 
      case 'profile':
        return <Profile {...commonProps} />;
      case 'notifications':
        return <NotificationsPage {...commonProps} />;
        
      // --- NEW SUPERADMIN ROUTES ---
      case 'superadmin_users':
        return <UserManagement {...commonProps} />; 
      case 'superadmin_systems':
        return <SystemConfig {...commonProps} />; 
      // --- END NEW SUPERADMIN ROUTES ---
      default:
        // Default to Dashboard for all roles (SuperAdminDashboard for superadmin)
        return userRole === USER_ROLES.SUPERADMIN ? (
            <SuperAdminDashboard {...commonProps} />
        ) : (
            <Dashboard 
                {...commonProps}
                onViewAllSales={handleViewAllSales}
                onViewAllCredit={handleViewAllCredit}
                onViewAllInventory={handleViewAllInventory}
            />
        );
    }
  };

  // CRITICAL FIX: Exclude 'checkout' from showAppUI so it renders full-screen, without the sidebar/header.
  const showAppUI = currentUser && 
                    currentPage !== 'resetPassword' && 
                    currentPage !== 'staffSetPassword' &&
                    currentPage !== 'checkout'; 
  
  // Helper to correctly capitalize role for display
  const displayRole = userRole?.charAt(0).toUpperCase() + userRole?.slice(1);

  return (
    <ApiProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-300">
        
        {/* Desktop Header */}
        {showAppUI && (
            <Header
                companyName="Pocket POS"
                userRole={displayRole} 
                setCurrentPage={setCurrentPage}
                onLogout={logout}
                apiClient={apiClient}
                API={API}
                // CRITICAL: Passing these props for mobile header highlighting
                currentPage={currentPage}
                utilityNavItems={utilityNavItems}
            />
        )}
        
        {/* Desktop Sidebar */}
        {showAppUI && (
            <div className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full 
                 bg-white dark:bg-gray-900 shadow-2xl dark:shadow-indigo-900/10 z-10 
                 transition-colors duration-300 border-r border-gray-200 dark:border-gray-800"
            >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-2xl font-extrabold text-indigo-400">
                        <Smartphone className="inline-block w-6 h-6 mr-2 text-indigo-400" /> Pocket POS
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">
                        User: {displayRole}
                    </p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {/* Main Navigation Items */}
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
                    
                    {/* Utility Navigation Items for Desktop Sidebar */}
                    {utilityNavItems.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                            {utilityNavItems.map(item => (
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
                        </div>
                    )}
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
        {/* Adjust margin based on showAppUI state */}
        <main className={`flex-1 ${showAppUI ? 'md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0' : 'w-full pt-0'}`}>
            {renderContent()}
        </main>

        {/* Mobile Footer Navigation */}
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
    </ApiProvider>
  );
};

export default App;