import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ShoppingCart, CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, RefreshCw, X, FileText, Truck
} from 'lucide-react';
import { io } from 'socket.io-client';

// Component Imports
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
import TermsAndConditions from './components/TermsAndConditions';
import PrivacyPolicy from './components/PrivacyPolicy';
import SupportPage from './components/SupportPage';
import AffiliatePage from './components/AffiliatePage';
import SEO from './components/SEO';
import SupplyChainManagement from './components/SupplyChainManagement';
import PlanUpgrade from './components/PlanUpgrade';
import StaffPermissionsManager from './components/StaffPermissionsManager';
import ChangePasswordForm from './components/ChangePasswordForm';

// UpdatePrompt Component
const UpdatePrompt = () => {
  const [show, setShow] = useState(false);
  const [updateHandler, setUpdateHandler] = useState(null);

  useEffect(() => {
    const onUpdate = (e) => {
      setUpdateHandler(() => e.detail.updateHandler);
      setShow(true);
    };
    window.addEventListener('pwa-update-available', onUpdate);
    return () => window.removeEventListener('pwa-update-available', onUpdate);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-sm bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl border border-indigo-400 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="bg-indigo-500 p-4 rounded-full mb-4 shadow-inner">
            <RefreshCw className="w-8 h-8 animate-spin text-white" />
          </div>
          <h4 className="font-extrabold text-2xl leading-tight">System Update</h4>
          <p className="text-indigo-100 mt-2 text-sm">A new version is available. Update now to keep your data synced and secure.</p>
          <button
            onClick={() => updateHandler && updateHandler(true)}
            className="w-full mt-6 bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
          >
            Update & Reload Now
          </button>
        </div>
      </div>
    </div>
  );
};

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
  const [pageOrigin, setPageOrigin] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  const [isViewingLogin, setIsViewingLogin] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // --- THEME ENGINE STATE ---
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('themePreference');
    return saved !== null ? JSON.parse(saved) : true; // Default to dark
  });

  // Persist theme choice
  useEffect(() => {
    localStorage.setItem('themePreference', JSON.stringify(darkMode));
  }, [darkMode]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;

  const unreadCount = useMemo(() =>
    (notifications || []).filter(n => n && (n.isRead === false || n.isRead === undefined)).length
    , [notifications]);

  const handleViewAllSales = useCallback(() => setCurrentPage('salesActivity'), []);
  const handleViewAllCredit = useCallback(() => setCurrentPage('khata'), []);
  const handleViewAllInventory = useCallback(() => setCurrentPage('inventory'), []);

  const fetchNotificationHistory = useCallback(async () => {
    if (!currentUser?.shopId) return;
    try {
      const response = await apiClient.get(`${API.notificationalert}?t=${Date.now()}`);
      if (response.data && response.data.alerts) setNotifications(response.data.alerts);
    } catch (error) { console.error("Error fetching notifications:", error); }
  }, [currentUser, API.notificationalert]);

  useEffect(() => {
    if (!currentUser?.shopId) return;
    fetchNotificationHistory();
    socketRef.current = io("https://shopbill-3le1.onrender.com", {
      auth: { token: localStorage.getItem('userToken') },
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnection: true
    });
    const socket = socketRef.current;
    socket.on('connect', () => socket.emit('join_shop', String(currentUser.shopId)));
    socket.on('new_notification', (newAlert) => {
      setNotifications(prev => {
        if (prev.some(n => n._id === newAlert._id)) return prev;
        return [newAlert, ...prev];
      });
      showToast(newAlert.message, 'info');
    });
    return () => { if (socket) socket.disconnect(); };
  }, [currentUser?.shopId, fetchNotificationHistory, showToast]);

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
    const normalizedUser = { ...user, role: user.role.toLowerCase() };
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);
    setCurrentPage(normalizedUser.role === USER_ROLES.CASHIER ? 'billing' : 'dashboard');
  }, []);

  const handleRegistrationComplete = useCallback(() => {
    setCurrentPage('dashboard');
    setIsViewingLogin(true);
    showToast('Registration successful! Please sign in.', 'success');
  }, [showToast]);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    if (token && userJson && token !== 'undefined') {
      try {
        const user = JSON.parse(userJson);
        setCurrentUser({ ...user, role: user.role.toLowerCase() });
      } catch (e) { logout(); }
    }
    setIsLoadingAuth(false);
  }, [logout]);

  const navItems = useMemo(() => {
    if (userRole === USER_ROLES.SUPERADMIN) return SUPERADMIN_NAV_ITEMS;
    const standardNav = [
      { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
      { id: 'billing', name: 'Billing', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
      { id: 'khata', name: 'Ledger', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
      { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
      { id: 'scm', name: 'Supply Chain', icon: Truck, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
      { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER] },
    ];
    return standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  const utilityNavItems = useMemo(() =>
    UTILITY_NAV_ITEMS_CONFIG.filter(item => item.roles.includes(userRole))
    , [userRole]);

  const handleBackToOrigin = () => {
    setCurrentPage(pageOrigin || 'dashboard');
    setPageOrigin('dashboard');
  };

  const renderContent = () => {
    if (isLoadingAuth) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loader className="animate-spin text-indigo-500" /></div>;

    if (currentPage === 'staffSetPassword') return <StaffSetPassword />;
    if (currentPage === 'resetPassword') return <ResetPassword />;
    if (currentPage === 'terms') return <TermsAndConditions onBack={handleBackToOrigin} />;
    if (currentPage === 'policy') return <PrivacyPolicy onBack={handleBackToOrigin} />;
    if (currentPage === 'support') return <SupportPage onBack={handleBackToOrigin} />;
    if (currentPage === 'affiliate') return <AffiliatePage onBack={handleBackToOrigin} />;
    if (currentPage === 'planUpgrade') {
        return <PlanUpgrade 
          apiClient={apiClient} 
          showToast={showToast} 
          currentUser={currentUser} 
          onBack={handleBackToOrigin} 
          darkMode={darkMode} 
        />;
    }
    if (currentPage === 'staffPermissions') {
        return <StaffPermissionsManager 
          apiClient={apiClient} 
          showToast={showToast} 
          currentUser={currentUser} 
          onBack={handleBackToOrigin} 
          darkMode={darkMode} 
        />;
    }
    if (currentPage === 'passwordChange') {
        return <ChangePasswordForm 
          apiClient={apiClient} 
          showToast={showToast} 
          currentUser={currentUser} 
          onBack={handleBackToOrigin} 
          darkMode={darkMode} 
        />;
    }

    if (currentPage === 'checkout') {
      return (
        <Checkout
          currentUser={currentUser}
          userRole={userRole}
          showToast={showToast}
          apiClient={apiClient}
          API={API}
          plan={selectedPlan}
          onPaymentSuccess={handleRegistrationComplete}
          onBackToDashboard={() => setCurrentPage('dashboard')}
        />
      );
    }

    if (!currentUser) {
      return isViewingLogin ?
        <Login onLogin={handleLoginSuccess} showToast={showToast} onBackToLanding={() => setIsViewingLogin(false)} /> :
        <LandingPage
          onStartApp={() => setIsViewingLogin(true)}
          onSelectPlan={(p) => {
            setSelectedPlan(p);
            setCurrentPage('checkout');
          }}
          onViewTerms={() => { setPageOrigin('landing'); setCurrentPage('terms'); }}
          onViewPolicy={() => { setPageOrigin('landing'); setCurrentPage('policy'); }}
          onViewSupport={() => { setPageOrigin('landing'); setCurrentPage('support'); }}
          onViewAffiliate={() => { setPageOrigin('landing'); setCurrentPage('affiliate'); }}
        />
    }

    const commonProps = { darkMode, currentUser, userRole, showToast, apiClient, API, onLogout: logout, notifications, setNotifications, setCurrentPage, unreadCount, setPageOrigin };

    switch (currentPage) {
      case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard {...commonProps} /> : <Dashboard {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
      case 'billing': return <BillingPOS {...commonProps} />;
      case 'khata': return <Ledger {...commonProps} />;
      case 'inventory': return <InventoryManager {...commonProps} />;
      case 'scm': return <SupplyChainManagement {...commonProps} />;
      case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport {...commonProps} /> : <Reports {...commonProps} />;
      case 'notifications': return <NotificationsPage {...commonProps} />;
      case 'settings': return <SettingsPage {...commonProps} />;
      case 'profile': return <Profile {...commonProps} />;
      case 'superadmin_users': return <UserManagement {...commonProps} />;
      case 'superadmin_systems': return <SystemConfig {...commonProps} />;
      case 'salesActivity': return <SalesActivityPage {...commonProps} onBack={() => setCurrentPage('dashboard')} />;
      default: return <Dashboard {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
    }
  };

  const showAppUI = currentUser && !['resetPassword', 'staffSetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'].includes(currentPage);

  // Dynamic Background classes based on theme
  const containerBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const sidebarBg = darkMode ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200';
  const navText = darkMode ? 'text-gray-500 hover:bg-gray-900 hover:text-gray-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <ApiProvider>
      <SEO title={`${currentPage.toUpperCase()} | Pocket POS`} />
      <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${containerBg} ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}>
        <UpdatePrompt />
        
        {showAppUI && (
          <Header 
            companyName="Pocket POS" 
            userRole={userRole.toUpperCase()} 
            setCurrentPage={setCurrentPage} 
            currentPage={currentPage} 
            notifications={notifications} 
            unreadCount={unreadCount} 
            onLogout={logout} 
            apiClient={apiClient} 
            API={API} 
            utilityNavItems={utilityNavItems}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
          />
        )}

        <div className="flex flex-1 overflow-hidden relative">
          {showAppUI && (
            <aside className={`hidden md:flex flex-col w-64 border-r z-[30] fixed inset-y-0 left-0 transition-colors duration-300 ${sidebarBg}`}>
              <div className="p-8 font-black text-2xl tracking-tighter flex items-center gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/50">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <span className={darkMode ? 'text-white' : 'text-slate-900'}>POCKET</span> <span className="text-indigo-500">POS</span>
              </div>

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4 sidebar-scroll">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Main Menu</p>
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${currentPage === item.id
                      ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg shadow-indigo-950/50'
                      : `border border-transparent ${navText}`
                      }`}
                  >
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${currentPage === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-500'}`} />
                    <span className="text-sm font-bold tracking-tight">{item.name}</span>
                  </button>
                ))}

                <div className={`pt-6 mt-6 border-t space-y-1.5 ${darkMode ? 'border-gray-900' : 'border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Account</p>
                  {utilityNavItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentPage(item.id)}
                      className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative group ${currentPage === item.id
                        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20'
                        : `border border-transparent ${navText}`
                        }`}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span className="text-sm font-bold tracking-tight">{item.name}</span>
                      {item.id === 'notifications' && unreadCount > 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-rose-900/40">
                          {unreadCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="p-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center px-4 py-3 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all group border border-transparent"
                >
                  <LogOut className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                  <span className="text-sm font-bold">Logout</span>
                </button>
              </div>
            </aside>
          )}

          <main className={`flex-1 overflow-y-auto transition-all duration-300 ${containerBg} ${showAppUI ? 'md:ml-64 pt-16 md:pt-6 pb-24 md:pb-6' : 'w-full'}`}>
            <div className="max-w-7xl mx-auto min-h-full px-0 md:px-6">
              {renderContent()}
            </div>
          </main>
        </div>

        {showAppUI && (
          <nav className={`fixed bottom-0 inset-x-0 h-18 border-t md:hidden flex items-center justify-around z-[50] px-4 pb-safe shadow-[0_-15px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl ${darkMode ? 'bg-gray-950/90 border-gray-900' : 'bg-white/90 border-slate-200'}`}>
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-all relative ${currentPage === item.id
                  ? 'text-indigo-500'
                  : 'text-gray-600 hover:text-indigo-400'
                  }`}
              >
                {currentPage === item.id && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                )}
                <div className={`p-1.5 rounded-xl transition-all ${currentPage === item.id ? 'bg-indigo-500/10' : ''}`}>
                  <item.icon className={`w-7 h-7 ${currentPage === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
              </button>
            ))}
          </nav>
        )}
      </div>
    </ApiProvider>
  );
};

export default App;