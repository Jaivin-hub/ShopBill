import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users } from 'lucide-react';
import { io } from 'socket.io-client';
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

// --- UTILITY NAVIGATION ITEMS ---
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

const checkDeepLinkPath = () => {
    const path = window.location.pathname;
    if (path.startsWith('/staff-setup/')) return 'staffSetPassword'; 
    if (path.startsWith('/reset-password/')) return 'resetPassword'; 
    return null; 
};

const App = () => {
  const [currentPage, setCurrentPage] = useState(checkDeepLinkPath() || 'dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isViewingLogin, setIsViewingLogin] = useState(false);
  
  // --- NEW: Persistent Notification State ---
  const [notifications, setNotifications] = useState([]);

  const handleSelectPlan = useCallback((plan) => {
    setSelectedPlan(plan);
    setCurrentPage('checkout');
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newValue));
      return newValue;
    });
  }, []);
  
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

  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // --- NEW: Fetch Notification History from API ---
  const fetchNotificationHistory = useCallback(async () => {
    try {
        const response = await apiClient.get('/notifications/alerts');
        if (response.data && response.data.alerts) {
            setNotifications(response.data.alerts);
        }
    } catch (error) {
        console.error("Error fetching notification history:", error);
    }
  }, []);

  // --- UPDATED: GLOBAL SOCKET CONNECTION ---
  useEffect(() => {
    if (!currentUser?.shopId) return;

    // Load existing alerts first
    fetchNotificationHistory();

    // Connect to backend root
    const socket = io(`https://shopbill-1-frontend.onrender.com`);

    socket.emit('join_shop', currentUser.shopId);

    socket.on('new_notification', (newAlert) => {
        // Show immediate toast
        showToast(newAlert.message, 'info');
        // Add to persistent list for the Notifications Page
        setNotifications(prev => [newAlert, ...prev]);
    });

    return () => {
        socket.off('new_notification');
        socket.disconnect();
    };
  }, [currentUser?.shopId, showToast, fetchNotificationHistory]);

  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentPage('dashboard');
    setIsViewingLogin(false);
    showToast('Logged out successfully.', 'info');
    setIsLoadingAuth(false);
  }, [showToast]);

  const handleLoginSuccess = useCallback((user, token, planToCheckout = null) => {
    const userWithNormalizedRole = { ...user, role: user.role.toLowerCase() }; 
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(userWithNormalizedRole));
    setCurrentUser(userWithNormalizedRole);
    setIsViewingLogin(false);
    if (planToCheckout) {
        showToast('Account created successfully! Your plan is now active.', 'success');
        setSelectedPlan(null);
    } else {
        showToast('Welcome back!', 'success');
    }
    setCurrentPage('dashboard');
  }, [showToast]);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    const deepLink = checkDeepLinkPath(); 

    if (token && userJson && token !== 'undefined' && token !== null) {
      try {
        let user = JSON.parse(userJson);
        user = { ...user, role: user.role.toLowerCase() };
        setCurrentUser(user);
        if (deepLink) setCurrentPage('dashboard');
      } catch (error) {
        console.error("Error parsing user data:", error);
        logout();
      }
    } else if (deepLink) {
        setCurrentPage(deepLink);
    }
    setIsLoadingAuth(false); 
  }, [logout]);

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

  const handleViewAllSales = useCallback(() => setCurrentPage('salesActivity'), []);
  const handleViewAllCredit = useCallback(() => setCurrentPage('khata'), []);
  const handleViewAllInventory = useCallback(() => setCurrentPage('inventory'), []);

  const navItems = useMemo(() => {
    const standardNav = [
        { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'khata', name: 'Khata/Credit', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
        { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
    ];
    if (userRole === USER_ROLES.SUPERADMIN) return SUPERADMIN_NAV_ITEMS;
    return standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  const utilityNavItems = useMemo(() => {
    if (userRole === USER_ROLES.SUPERADMIN) {
        return UTILITY_NAV_ITEMS_CONFIG.filter(item => item.id === 'profile' || item.id === 'notifications');
    }
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
    if (currentPage === 'staffSetPassword') return <StaffSetPassword />;
    if (currentPage === 'resetPassword') return <ResetPassword />;

    if (currentPage === 'checkout') {
        if (!selectedPlan) {
            showToast('No plan selected. Redirecting to landing page.', 'error');
            setCurrentPage('dashboard');
            setIsViewingLogin(false);
            return null;
        }
        return (
            <Checkout 
                plan={selectedPlan}
                onPaymentSuccess={(data) => {
                    showToast(data.message || 'Account created successfully! Please login to continue.', 'success');
                    setCurrentPage('dashboard');
                    setSelectedPlan(null);
                    setIsViewingLogin(true);
                }}
                onBackToDashboard={() => {
                    setCurrentPage('dashboard');
                    setSelectedPlan(null);
                    if (!currentUser) setIsViewingLogin(false);
                }}
            />
        );
    }

    if (!currentUser) {
        if (isViewingLogin) {
            return <Login 
                onLogin={handleLoginSuccess} 
                showToast={showToast} 
                onBackToLanding={() => {
                    setIsViewingLogin(false);
                    setSelectedPlan(null); 
                    setCurrentPage('dashboard'); 
                    setTimeout(() => { window.location.href = '#pricing'; }, 100);
                }} 
                initialPlan={null} 
            />;
        }
        return <LandingPage onStartApp={() => { setIsViewingLogin(true); setCurrentPage('dashboard'); }} onSelectPlan={handleSelectPlan} />;
    }
    
    // Updated: Pass notifications state to sub-components
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
        notifications,
        setNotifications
    };
    
    switch (currentPage) {
      case 'dashboard':
        return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard {...commonProps} /> : <Dashboard {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
      case 'billing': return <BillingPOS {...commonProps} />;
      case 'khata': return <Ledger {...commonProps} />;
      case 'inventory': return userRole !== USER_ROLES.SUPERADMIN ? <InventoryManager {...commonProps} /> : <div className="p-8 text-center text-gray-400">Superadmin: Access to Inventory via system tools.</div>;
      case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport {...commonProps} /> : <Reports {...commonProps} />;
      case 'salesActivity': return <SalesActivityPage {...commonProps} />;
      case 'settings': return <SettingsPage {...commonProps} />; 
      case 'profile': return <Profile {...commonProps} />;
      case 'notifications': return <NotificationsPage notifications={notifications} setNotifications={setNotifications} />;
      case 'superadmin_users': return <UserManagement {...commonProps} />; 
      case 'superadmin_systems': return <SystemConfig {...commonProps} />; 
      default:
        return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard {...commonProps} /> : <Dashboard {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
    }
  };

  const showAppUI = currentUser && currentPage !== 'resetPassword' && currentPage !== 'staffSetPassword' && currentPage !== 'checkout'; 
  const displayRole = userRole?.charAt(0).toUpperCase() + userRole?.slice(1);

  return (
    <ApiProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-300">
        {showAppUI && <Header companyName="Pocket POS" userRole={displayRole} setCurrentPage={setCurrentPage} onLogout={logout} apiClient={apiClient} API={API} currentPage={currentPage} utilityNavItems={utilityNavItems} notifications={notifications} />}
        {showAppUI && (
            <div className="hidden md:flex flex-col w-64 fixed top-0 left-0 h-full bg-white dark:bg-gray-900 shadow-2xl dark:shadow-indigo-900/10 z-10 transition-colors duration-300 border-r border-gray-200 dark:border-gray-800">
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <h2 className="text-2xl font-extrabold text-indigo-400"><Smartphone className="inline-block w-6 h-6 mr-2 text-indigo-400" /> Pocket POS</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">User: {displayRole}</p>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`cursor-pointer w-full flex items-center p-3 rounded-xl font-medium transition duration-150 ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="w-5 h-5 mr-3" />{item.name}</button>
                    ))}
                    {utilityNavItems.length > 0 && (
                        <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                            {utilityNavItems.map(item => (
                                <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`cursor-pointer w-full flex items-center p-3 rounded-xl font-medium transition duration-150 ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="w-5 h-5 mr-3" />{item.name}</button>
                            ))}
                        </div>
                    )}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                    <button onClick={logout} className="cursor-pointer w-full flex items-center p-3 rounded-xl font-medium transition duration-150 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20"><LogOut className="w-5 h-5 mr-3" />Logout</button>
                </div>
            </div>
        )}
        <main className={`flex-1 ${showAppUI ? 'md:ml-64 pt-16 md:pt-0 pb-16 md:pb-0' : 'w-full pt-0'}`}>{renderContent()}</main>
        {showAppUI && (
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-2xl md:hidden z-30 transition-colors duration-300">
                <div className="flex justify-around items-center h-full px-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`flex flex-col items-center justify-center p-1 transition duration-150 flex-1 min-w-0 ${currentPage === item.id ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-300'}`}><item.icon className="w-5 h-5" /><span className="text-xs mt-0.5 whitespace-nowrap truncate">{item.name.split('/')[0]}</span></button>
                    ))}
                </div>
            </nav>
        )}
        <NotificationToast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      </div>
    </ApiProvider>
  );
};

export default App;