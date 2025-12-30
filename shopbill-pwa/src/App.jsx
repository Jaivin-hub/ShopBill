import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, RefreshCw, X, FileText } from 'lucide-react';
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
import NotificationToast from './components/NotificationToast';
import TermsAndConditions from './components/TermsAndConditions';
import PrivacyPolicy from './components/PrivacyPolicy';
import SupportPage from './components/SupportPage';
import AffiliatePage from './components/AffiliatePage';

// --- NEW COMPONENT: PWA Update Popup ---
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
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[9998] flex items-center justify-center p-4">
      <div className="w-full max-sm bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl border border-indigo-400 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="bg-indigo-500 p-4 rounded-full mb-4 shadow-inner">
            <RefreshCw className="w-8 h-8 animate-spin text-white" />
          </div>
          
          <h4 className="font-extrabold text-2xl leading-tight">System Update</h4>
          <p className="text-indigo-100 mt-2 text-sm">
            A critical update is available for Pocket POS. Please update to continue using the app securely.
          </p>
          
          <button 
            onClick={() => updateHandler && updateHandler(true)}
            className="w-full mt-6 bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
          >
            Update & Reload Now
          </button>
          
          <p className="text-[10px] text-indigo-300 mt-4 uppercase tracking-widest font-semibold">
            Pocket POS Version Sync
          </p>
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
  const [pageOrigin, setPageOrigin] = useState(null); // Tracks where user came from ('landing' or 'settings')
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  const [isViewingLogin, setIsViewingLogin] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;

  const unreadCount = useMemo(() => {
    return (notifications || []).filter(n => 
        n && (n.isRead === false || n.isRead === undefined)
    ).length;
  }, [notifications]);

  const fetchNotificationHistory = useCallback(async () => {
    if (!currentUser) return;
    try {
        const response = await apiClient.get(`${API.notificationalert}?t=${Date.now()}`);
        if (response.data && response.data.alerts) {
            setNotifications(response.data.alerts);
        }
    } catch (error) {
        console.error("Error fetching notification history:", error);
    }
  }, [currentUser]);

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
    socket.on('connect', () => {
        socket.emit('join_shop', String(currentUser.shopId));
    });
    socket.on('new_notification', (newAlert) => {
        setNotifications(prev => {
            const exists = prev.some(n => (n._id === newAlert._id));
            if (exists) return prev;
            return [newAlert, ...prev];
        });
        showToast(newAlert.message, 'info');
    });
    socket.on('resolve_notification', (data) => {
        setNotifications(prev => prev.filter(n => n.metadata?.itemId !== data.itemId));
    });
    return () => { if (socket) socket.disconnect(); };
  }, [currentUser?.shopId, showToast, fetchNotificationHistory]);

  const handleSelectPlan = useCallback((plan) => {
    setSelectedPlan(plan);
    setCurrentPage('checkout');
  }, []);

  const handleViewAllSales = useCallback(() => setCurrentPage('salesActivity'), []);
  const handleViewAllCredit = useCallback(() => setCurrentPage('khata'), []);
  const handleViewAllInventory = useCallback(() => setCurrentPage('inventory'), []);

  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setNotifications([]);
    setCurrentPage('dashboard');
    setPageOrigin(null);
    setIsViewingLogin(false);
    showToast('Logged out successfully.', 'info');
  }, [showToast]);

  const handleLoginSuccess = useCallback((user, token, planToCheckout = null) => {
    const userWithNormalizedRole = { ...user, role: user.role.toLowerCase() }; 
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(userWithNormalizedRole));
    setCurrentUser(userWithNormalizedRole);
    setIsViewingLogin(false);
    
    if (userWithNormalizedRole.role === USER_ROLES.CASHIER) {
        setCurrentPage('billing');
    } else {
        setCurrentPage('dashboard');
    }

    if (planToCheckout) {
        showToast('Account created successfully!', 'success');
        setSelectedPlan(null);
    } else {
        showToast('Welcome back!', 'success');
    }
  }, [showToast]);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    const deepLink = checkDeepLinkPath();

    if (token && userJson && token !== 'undefined') {
      try {
        let user = JSON.parse(userJson);
        const normalizedUser = { ...user, role: user.role.toLowerCase() };
        setCurrentUser(normalizedUser);
        
        if (deepLink) {
            setCurrentPage('dashboard');
        } else if (normalizedUser.role === USER_ROLES.CASHIER && currentPage === 'dashboard') {
            setCurrentPage('billing');
        }
      } catch (e) { logout(); }
    } else if (deepLink) {
        setCurrentPage(deepLink);
    }
    setIsLoadingAuth(false); 
  }, [logout]);

  const navItems = useMemo(() => {
    const standardNav = [
        { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
        { id: 'billing', name: 'Billing/POS', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'khata', name: 'Ledger', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
        { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] },
        { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER] }, 
    ];
    
    if (userRole === USER_ROLES.SUPERADMIN) return SUPERADMIN_NAV_ITEMS;
    return standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole]);

  const utilityNavItems = useMemo(() => {
    return UTILITY_NAV_ITEMS_CONFIG.filter(item => 
        userRole === USER_ROLES.SUPERADMIN ? (item.id === 'profile' || item.id === 'notifications') : item.roles.includes(userRole)
    );
  }, [userRole]);

  const renderContent = () => {
    if (isLoadingAuth) return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950">
        <Loader className="w-10 h-10 animate-spin text-teal-400" />
        <p className='mt-3 text-gray-400'>Checking authentication...</p>
      </div>
    );

    if (currentPage === 'staffSetPassword') return <StaffSetPassword />;
    if (currentPage === 'resetPassword') return <ResetPassword />;
    
    // Page redirection logic based on origin
    const handleDynamicBack = (target) => {
        // If the target passed by component is 'settings', go to settings. Otherwise go to dashboard.
        if (target === 'settings') {
            setCurrentPage('settings');
        } else {
            setCurrentPage('dashboard');
        }
    };

    if (currentPage === 'terms') return <TermsAndConditions onBack={() => handleDynamicBack(pageOrigin)} />;
    if (currentPage === 'policy') return <PrivacyPolicy onBack={() => handleDynamicBack(pageOrigin)} />;
    if (currentPage === 'support') return <SupportPage onBack={handleDynamicBack} origin={pageOrigin} />;
    if (currentPage === 'affiliate') return <AffiliatePage onBack={handleDynamicBack} origin={pageOrigin} />;

    if (currentPage === 'checkout') {
        if (!selectedPlan) {
            setCurrentPage('dashboard');
            return null;
        }
        return <Checkout plan={selectedPlan} onPaymentSuccess={(data) => {
            showToast(data.message || 'Account created successfully!', 'success');
            setCurrentPage('dashboard');
            setSelectedPlan(null);
            setIsViewingLogin(true);
        }} onBackToDashboard={() => {
            setCurrentPage('dashboard');
            setSelectedPlan(null);
        }} />;
    }
    
    if (!currentUser) {
        return isViewingLogin ? 
            <Login onLogin={handleLoginSuccess} showToast={showToast} onBackToLanding={() => {
                setIsViewingLogin(false);
                setSelectedPlan(null);
                setCurrentPage('dashboard');
                setTimeout(() => { window.location.href = '#pricing'; }, 100);
            }} /> : 
            <LandingPage 
                onStartApp={() => { setIsViewingLogin(true); setCurrentPage('dashboard'); }} 
                onSelectPlan={handleSelectPlan} 
                onViewTerms={() => { setPageOrigin('landing'); setCurrentPage('terms'); }} 
                onViewPolicy={() => { setPageOrigin('landing'); setCurrentPage('policy'); }}
                onViewSupport={() => { setPageOrigin('landing'); setCurrentPage('support'); }}
                onViewAffiliate={() => { setPageOrigin('landing'); setCurrentPage('affiliate'); }}
            />;
    }
    
    const commonProps = { currentUser, userRole, showToast, apiClient, API, onLogout: logout, notifications, setNotifications, setCurrentPage, pageOrigin, setPageOrigin };
    
    switch (currentPage) {
      case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? 
        <SuperAdminDashboard {...commonProps} /> : 
        <Dashboard {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
      case 'billing': return <BillingPOS {...commonProps} />;
      case 'khata': return <Ledger {...commonProps} />;
      case 'inventory': return userRole !== USER_ROLES.SUPERADMIN ? <InventoryManager {...commonProps} /> : <div className="p-8 text-center text-gray-400">Superadmin Access via Tools</div>;
      case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport {...commonProps} /> : <Reports {...commonProps} />;
      case 'notifications': return <NotificationsPage {...commonProps} />;
      case 'settings': return <SettingsPage {...commonProps} />; 
      case 'profile': return <Profile {...commonProps} />;
      case 'salesActivity': return <SalesActivityPage {...commonProps} onBack={() => setCurrentPage('dashboard')} />;
      case 'superadmin_users': return <UserManagement {...commonProps} />;
      case 'superadmin_systems': return <SystemConfig {...commonProps} />;
      default: return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard {...commonProps} /> : <Dashboard {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
    }
  };

  const showAppUI = currentUser && !['resetPassword', 'staffSetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'].includes(currentPage);
  const displayRole = userRole?.charAt(0).toUpperCase() + userRole?.slice(1);

  return (
    <ApiProvider>
      <div className="h-screen w-full bg-gray-950 flex flex-col font-sans transition-colors duration-300 overflow-hidden">
        <UpdatePrompt />
        
        {showAppUI && (
          <div className="fixed top-0 left-0 right-0 z-[40]">
            <Header companyName="Pocket POS" userRole={displayRole} setCurrentPage={setCurrentPage} currentPage={currentPage} notifications={notifications} onLogout={logout} apiClient={apiClient} API={API} utilityNavItems={utilityNavItems} />
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          {showAppUI && (
              <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-gray-900 border-r border-gray-800 z-[30] shadow-2xl transition-colors duration-300">
                  <div className="p-6 border-b border-gray-800">
                      <h2 className="text-2xl font-extrabold text-indigo-400 flex items-center cursor-pointer" onClick={() => setCurrentPage(userRole === USER_ROLES.CASHIER ? 'billing' : 'dashboard')}><Smartphone className="mr-2 w-6 h-6" /> Pocket POS</h2>
                      <p className="text-xs text-gray-500 mt-1">User: {displayRole}</p>
                  </div>
                  <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                      {navItems.map(item => (
                          <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center p-3 rounded-xl transition font-medium ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800'}`}><item.icon className="w-5 h-5 mr-3" />{item.name}</button>
                      ))}
                      <div className="pt-4 border-t border-gray-800 space-y-2">
                          {utilityNavItems.map(item => (
                              <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center p-3 rounded-xl transition font-medium relative ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-300 hover:bg-gray-800'}`}>
                                <item.icon className="w-5 h-5 mr-3" />
                                {item.name}
                                {item.id === 'notifications' && unreadCount > 0 && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full ring-2 ring-gray-900 bg-red-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                              </button>
                          ))}
                      </div>
                  </nav>
                  <div className="p-4 border-t border-gray-800">
                      <button onClick={logout} className="w-full flex items-center p-3 rounded-xl text-red-400 hover:bg-red-900/20 font-medium"><LogOut className="w-5 h-5 mr-3" />Logout</button>
                  </div>
              </aside>
          )}

          <main className={`flex-1 overflow-y-auto ${showAppUI ? 'md:ml-64 mt-16 pb-16 md:pb-0' : 'w-full'}`}>
              {renderContent()}
          </main>
        </div>

        {showAppUI && (
            <nav className="fixed bottom-0 inset-x-0 h-16 bg-gray-900 border-t border-gray-800 md:hidden flex justify-around items-center px-1 z-[40] shadow-2xl">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`flex flex-col items-center justify-center p-1 transition flex-1 min-w-0 ${currentPage === item.id ? 'text-indigo-400 font-bold' : 'text-gray-400'}`}><item.icon className="w-5 h-5" /><span className="text-[10px] mt-0.5 truncate">{item.name.split('/')[0]}</span></button>
                ))}
            </nav>
        )}
        
        <NotificationToast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      </div>
    </ApiProvider>
  );
};

export default App;