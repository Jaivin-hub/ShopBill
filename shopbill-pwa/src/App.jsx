import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users } from 'lucide-react';
import { io } from 'socket.io-client';
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

const UTILITY_NAV_ITEMS_CONFIG = [
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
    { id: 'profile', name: 'Profile', icon: User, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
];

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
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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

  const fetchNotificationHistory = useCallback(async () => {
    if (!currentUser) return;
    try {
        const response = await apiClient.get('/notifications/alerts');
        if (response.data && response.data.alerts) {
            setNotifications(response.data.alerts);
        }
    } catch (error) {
        console.error("Error fetching notification history:", error);
    }
  }, [currentUser]);

  // --- SOCKET CONNECTION & NOTIFICATION LISTENER ---
  useEffect(() => {
    if (!currentUser?.shopId) return;

    fetchNotificationHistory();

    // Initialize Socket with Auth Token
    socketRef.current = io("https://shopbill-3le1.onrender.com", {
    auth: { token: localStorage.getItem('userToken') },
    // Remove the transports line or ensure 'polling' is first
    transports: ['polling', 'websocket'], 
    withCredentials: true,
    reconnection: true,
});

    const socket = socketRef.current;

    socket.on('connect', () => {
        console.log("Connected to Real-time server");
        socket.emit('join_shop', currentUser.shopId);
    });

    socket.on('new_notification', (newAlert) => {
        showToast(newAlert.message, 'info');
        setNotifications(prev => {
            const exists = prev.some(n => (n._id === newAlert._id));
            if (exists) return prev;
            return [newAlert, ...prev];
        });
    });

    return () => {
        if (socket) {
            socket.disconnect();
            socketRef.current = null;
        }
    };
  }, [currentUser?.shopId, showToast, fetchNotificationHistory]);

  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setNotifications([]);
    setCurrentPage('dashboard');
    setIsViewingLogin(false);
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  const handleLoginSuccess = useCallback((user, token) => {
    const userWithNormalizedRole = { ...user, role: user.role.toLowerCase() }; 
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(userWithNormalizedRole));
    setCurrentUser(userWithNormalizedRole);
    setIsViewingLogin(false);
    setCurrentPage('dashboard');
    showToast('Welcome back!', 'success');
  }, [showToast]);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    if (token && userJson) {
      try {
        let user = JSON.parse(userJson);
        setCurrentUser({ ...user, role: user.role.toLowerCase() });
      } catch (e) { logout(); }
    }
    setIsLoadingAuth(false); 
  }, [logout]);

  const navItems = useMemo(() => {
    const standardNav = [
        { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'khata', name: 'Khata/Credit', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
        { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
    ];
    return userRole === USER_ROLES.SUPERADMIN ? SUPERADMIN_NAV_ITEMS : standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  const utilityNavItems = useMemo(() => {
    return UTILITY_NAV_ITEMS_CONFIG.filter(item => 
        userRole === USER_ROLES.SUPERADMIN ? (item.id === 'profile' || item.id === 'notifications') : item.roles.includes(userRole)
    );
  }, [userRole]);

  const renderContent = () => {
    if (isLoadingAuth) return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <Loader className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
    
    if (!currentUser) {
        return isViewingLogin ? 
            <Login onLogin={handleLoginSuccess} showToast={showToast} onBackToLanding={() => setIsViewingLogin(false)} /> : 
            <LandingPage onStartApp={() => setIsViewingLogin(true)} />;
    }
    
    const commonProps = { currentUser, userRole, showToast, apiClient, API, onLogout: logout, isDarkMode, toggleDarkMode, notifications, setNotifications };
    
    switch (currentPage) {
      case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard {...commonProps} /> : <Dashboard {...commonProps} />;
      case 'billing': return <BillingPOS {...commonProps} />;
      case 'khata': return <Ledger {...commonProps} />;
      case 'inventory': return <InventoryManager {...commonProps} />;
      case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport {...commonProps} /> : <Reports {...commonProps} />;
      case 'notifications': return <NotificationsPage notifications={notifications} setNotifications={setNotifications} />;
      case 'settings': return <SettingsPage {...commonProps} />; 
      case 'profile': return <Profile {...commonProps} />;
      default: return <Dashboard {...commonProps} />;
    }
  };

  const showAppUI = currentUser && !['resetPassword', 'staffSetPassword', 'checkout'].includes(currentPage);
  const displayRole = userRole?.charAt(0).toUpperCase() + userRole?.slice(1);

  return (
    <ApiProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-300">
        {showAppUI && (
          <Header companyName="Pocket POS" userRole={displayRole} setCurrentPage={setCurrentPage} currentPage={currentPage} notifications={notifications} />
        )}
        <div className="flex flex-1">
          {showAppUI && (
              <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-10">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                      <h2 className="text-2xl font-bold text-indigo-500 flex items-center"><Smartphone className="mr-2 w-6 h-6" /> Pocket POS</h2>
                  </div>
                  <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                      {navItems.map(item => (
                          <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center p-3 rounded-xl transition ${currentPage === item.id ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="w-5 h-5 mr-3" />{item.name}</button>
                      ))}
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                          {utilityNavItems.map(item => (
                              <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center p-3 rounded-xl transition ${currentPage === item.id ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}><item.icon className="w-5 h-5 mr-3" />{item.name}</button>
                          ))}
                      </div>
                  </nav>
                  <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                      <button onClick={logout} className="w-full flex items-center p-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"><LogOut className="w-5 h-5 mr-3" />Logout</button>
                  </div>
              </aside>
          )}
          <main className={`flex-1 transition-all ${showAppUI ? 'md:ml-64' : ''}`}>
              {renderContent()}
          </main>
        </div>
        {showAppUI && (
            <nav className="fixed bottom-0 inset-x-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden flex justify-around items-center px-2 z-30">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`flex flex-col items-center p-2 flex-1 ${currentPage === item.id ? 'text-indigo-500' : 'text-gray-500'}`}><item.icon className="w-5 h-5" /><span className="text-[10px] mt-1">{item.name}</span></button>
                ))}
            </nav>
        )}
      </div>
    </ApiProvider>
  );
};

export default App;