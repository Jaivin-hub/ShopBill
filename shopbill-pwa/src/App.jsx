import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, RefreshCw, X, FileText, Truck } from 'lucide-react';
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
import TermsAndConditions from './components/TermsAndConditions';
import PrivacyPolicy from './components/PrivacyPolicy';
import SupportPage from './components/SupportPage';
import AffiliatePage from './components/AffiliatePage';
import SEO from './components/SEO';
import SupplyChainManagement from './components/SupplyChainManagement';

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
    <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl border border-indigo-400 animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="bg-indigo-500 p-4 rounded-full mb-4 shadow-inner">
            <RefreshCw className="w-8 h-8 animate-spin text-white" />
          </div>
          <h4 className="font-extrabold text-2xl leading-tight">System Update</h4>
          <p className="text-indigo-100 mt-2 text-sm">A critical update is available. Please update to continue securely.</p>
          <button 
            onClick={() => updateHandler && updateHandler(true)}
            className="w-full mt-6 bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-xl"
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
  const [pageOrigin, setPageOrigin] = useState(null);
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

  const seoConfig = useMemo(() => {
    if (!currentUser) return { title: 'Pocket POS - Retail Management' };
    return { title: `${currentPage.toUpperCase()} | Pocket POS` };
  }, [currentPage, currentUser]);

  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;

  const unreadCount = useMemo(() => 
    notifications.filter(n => n && (n.isRead === false)).length
  , [notifications]);

  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentPage('dashboard');
    showToast('Logged out.', 'info');
  }, [showToast]);

  const handleLoginSuccess = useCallback((user, token) => {
    const normalizedUser = { ...user, role: user.role.toLowerCase() };
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);
    setCurrentPage(normalizedUser.role === USER_ROLES.CASHIER ? 'billing' : 'dashboard');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const userJson = localStorage.getItem('currentUser');
    if (token && userJson) {
      try { setCurrentUser(JSON.parse(userJson)); } catch (e) { logout(); }
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

  const renderContent = () => {
    if (isLoadingAuth) return <div className="h-screen flex items-center justify-center"><Loader className="animate-spin text-indigo-500" /></div>;
    if (!currentUser) return isViewingLogin ? <Login onLogin={handleLoginSuccess} /> : <LandingPage onStartApp={() => setIsViewingLogin(true)} />;

    const commonProps = { currentUser, userRole, showToast, apiClient, API, onLogout: logout, notifications, setNotifications, setCurrentPage };

    switch (currentPage) {
      case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard {...commonProps} /> : <Dashboard {...commonProps} />;
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
      default: return <Dashboard {...commonProps} />;
    }
  };

  const showAppUI = currentUser && !['resetPassword', 'staffSetPassword', 'checkout'].includes(currentPage);

  return (
    <ApiProvider>
      <SEO {...seoConfig} />
      <div className="h-screen w-full bg-gray-950 flex flex-col overflow-hidden text-gray-200">
        <UpdatePrompt />
        {showAppUI && <Header companyName="Pocket POS" userRole={userRole} setCurrentPage={setCurrentPage} currentPage={currentPage} notifications={notifications} onLogout={logout} apiClient={apiClient} API={API} utilityNavItems={utilityNavItems} />}

        <div className="flex flex-1 overflow-hidden relative">
          {/* DESKTOP SIDEBAR */}
          {showAppUI && (
            <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 z-30">
              <div className="p-6 font-black text-indigo-500 text-xl tracking-tighter">POCKET POS</div>
              <nav className="flex-1 px-4 space-y-1">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center p-3 rounded-xl transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>
                    <item.icon className="w-5 h-5 mr-3" /> <span className="text-sm font-bold">{item.name}</span>
                  </button>
                ))}
                <div className="pt-4 mt-4 border-t border-gray-800">
                  {utilityNavItems.map(item => (
                    <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center p-3 rounded-xl transition-all ${currentPage === item.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                      <item.icon className="w-5 h-5 mr-3" /> <span className="text-sm font-bold">{item.name}</span>
                    </button>
                  ))}
                </div>
              </nav>
              <div className="p-4 border-t border-gray-800">
                <button onClick={logout} className="w-full flex items-center p-3 text-red-400 hover:bg-red-950/20 rounded-xl"><LogOut className="w-5 h-5 mr-3" /> <span className="text-sm font-bold">Logout</span></button>
              </div>
            </aside>
          )}

          {/* MAIN CONTENT AREA */}
          <main className={`flex-1 overflow-y-auto bg-gray-950 ${showAppUI ? 'pt-16 pb-20 md:pb-0' : 'w-full'}`}>
            <div className="max-w-7xl mx-auto min-h-full">
              {renderContent()}
            </div>
          </main>
        </div>

        {/* MOBILE BOTTOM NAV - Arranged for 6 items */}
        {showAppUI && (
          <nav className="fixed bottom-0 inset-x-0 h-16 bg-gray-900 border-t border-gray-800 md:hidden flex items-center justify-around z-50 px-1 shadow-2xl">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`flex flex-col items-center justify-center flex-1 transition-all ${currentPage === item.id ? 'text-indigo-500' : 'text-gray-500'}`}>
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] mt-1 font-bold uppercase tracking-tighter truncate w-full text-center">
                  {item.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </nav>
        )}
      </div>
    </ApiProvider>
  );
};

export default App;