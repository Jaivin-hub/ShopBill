import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  ShoppingCart, CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, RefreshCw, X, FileText, Truck, Sun, Moon, LayoutGrid, Store, ChevronDown, PlusCircle, Settings2
} from 'lucide-react';
import { io } from 'socket.io-client';

// Core Component Imports
import API from './config/api';
import apiClient from './lib/apiClient';
import { ApiProvider } from './contexts/ApiContext';
import { USER_ROLES } from './utils/constants';
import Header from './components/Header';
import SEO from './components/SEO';
import Login from './components/Login';
import LandingPage from './components/LandingPage';

// Lazy Load Heavy Components
const Dashboard = lazy(() => import('./components/Dashboard'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const BillingPOS = lazy(() => import('./components/BillingPOS'));
const Ledger = lazy(() => import('./components/Ledger'));
const Reports = lazy(() => import('./components/Reports'));
const SettingsPage = lazy(() => import('./components/Settings'));
const Profile = lazy(() => import('./components/Profile'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const StaffSetPassword = lazy(() => import('./components/StaffSetPassword'));
const SalesActivityPage = lazy(() => import('./components/SalesActivityPage'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const SuperAdminDashboard = lazy(() => import('./components/superAdminDashboard'));
const SystemConfig = lazy(() => import('./components/SystemConfig'));
const GlobalReport = lazy(() => import('./components/GlobalReport'));
const Checkout = lazy(() => import('./components/Checkout'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const AffiliatePage = lazy(() => import('./components/AffiliatePage'));
const SupplyChainManagement = lazy(() => import('./components/SupplyChainManagement'));
const PlanUpgrade = lazy(() => import('./components/PlanUpgrade'));
const StaffPermissionsManager = lazy(() => import('./components/StaffPermissionsManager'));
const ChangePasswordForm = lazy(() => import('./components/ChangePasswordForm'));

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
      <div className="max-sm bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl border border-indigo-400 animate-in fade-in zoom-in duration-300">
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
  const [currentUser, setCurrentUser] = useState(() => {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [toast, setToast] = useState(null);
  const [isViewingLogin, setIsViewingLogin] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [scrollToPricing, setScrollToPricing] = useState(false);
  const socketRef = useRef(null);

  // Multi-Store States
  const [activeStore, setActiveStore] = useState("Main Outlet");
  const [isStorePanelOpen, setIsStorePanelOpen] = useState(false);
  const stores = ["Main Outlet", "Branch - Kochi", "Branch - Aluva"]; // Mock data, replace with API sync later

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('themePreference');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('themePreference', JSON.stringify(darkMode));
  }, [darkMode]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;
  const isPremium = currentUser?.plan?.toLowerCase() === 'premium';

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
    if (!token || token === 'undefined') {
      logout();
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
      ...(isPremium ? [{ id: 'scm', name: 'Supply Chain', icon: Truck, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER] }] : []),
      { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER] },
    ];
    return standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole, isPremium]);

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
    if (currentPage === 'planUpgrade') return <PlanUpgrade apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={handleBackToOrigin} darkMode={darkMode} />;
    if (currentPage === 'staffPermissions') return <StaffPermissionsManager apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={handleBackToOrigin} darkMode={darkMode} />;
    if (currentPage === 'passwordChange') return <ChangePasswordForm apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={handleBackToOrigin} darkMode={darkMode} />;

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
        <Login 
          onLogin={handleLoginSuccess} 
          showToast={showToast} 
          setCurrentPage={setCurrentPage} 
          onBackToLanding={() => {
            setIsViewingLogin(false);
            setScrollToPricing(true);
          }}
          onBackToLandingNormal={() => setIsViewingLogin(false)} 
        /> :
        <LandingPage
          onStartApp={() => {
            setIsViewingLogin(true);
            setScrollToPricing(false);
          }}
          scrollToPricing={scrollToPricing}
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

    const commonProps = { darkMode, currentUser, userRole, showToast, apiClient, API, onLogout: logout, notifications, setNotifications, setCurrentPage, unreadCount, setPageOrigin, activeStore };

    return (
      <Suspense>
        {(() => {
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
        })()}
      </Suspense>
    );
  };

  const showAppUI = currentUser && !['resetPassword', 'staffSetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'].includes(currentPage);
  const containerBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const sidebarBg = darkMode ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200';
  const navText = darkMode ? 'text-gray-500 hover:bg-gray-900 hover:text-gray-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <ApiProvider>
      <style>{`
        .sidebar-scroll::-webkit-scrollbar { width: 5px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { 
          background: ${darkMode ? '#1e1b4b' : '#e2e8f0'}; 
          border-radius: 10px; 
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { 
          background: #6366f1; 
        }
      `}</style>
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
            activeStore={activeStore}
            setActiveStore={setActiveStore}
            stores={stores}
            isPremium={isPremium}
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

              {/* PREMIUM STORE SWITCHER FOR DESKTOP */}
              {isPremium && (
                <div className="px-4 mb-4">
                  <button 
                    onClick={() => setIsStorePanelOpen(!isStorePanelOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      darkMode ? 'bg-indigo-600/5 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Store size={18} />
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Active Hub</p>
                        <p className="text-sm font-bold truncate max-w-[100px]">{activeStore}</p>
                      </div>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isStorePanelOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isStorePanelOpen && (
                    <div className={`mt-2 p-1.5 rounded-2xl border animate-in slide-in-from-top-2 duration-200 ${darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-xl'}`}>
                      <p className={`text-[9px] font-black px-3 py-2 uppercase tracking-[0.2em] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>Select Outlet</p>
                      <div className="space-y-1">
                        {stores.map(store => (
                          <button
                            key={store}
                            onClick={() => { setActiveStore(store); setIsStorePanelOpen(false); }}
                            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              activeStore === store 
                              ? 'bg-indigo-600 text-white shadow-lg' 
                              : darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-50 text-slate-500'
                            }`}
                          >
                            <Store size={14} className="mr-2 opacity-70" />
                            {store}
                          </button>
                        ))}
                      </div>
                      
                      <div className={`mt-2 pt-2 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <button 
                          onClick={() => { setCurrentPage('settings'); localStorage.setItem('settings_target_view', 'storeControl'); setIsStorePanelOpen(false); }}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-black transition-all ${darkMode ? 'text-indigo-400 hover:bg-slate-800' : 'text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          <Settings2 size={14} className="mr-2" />
                          MANAGE ALL
                        </button>
                        <button 
                          onClick={() => { showToast('Redirecting to Store Setup...', 'info'); setIsStorePanelOpen(false); }}
                          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-black transition-all ${darkMode ? 'text-emerald-400 hover:bg-slate-800' : 'text-emerald-600 hover:bg-emerald-50'}`}
                        >
                          <PlusCircle size={14} className="mr-2" />
                          ADD NEW STORE
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4 sidebar-scroll">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Main Menu</p>
                {navItems.map(item => (
                  <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : `border border-transparent ${navText}`}`}>
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${currentPage === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-500'}`} />
                    <span className="text-sm font-bold tracking-tight">{item.name}</span>
                  </button>
                ))}
                <div className={`pt-6 mt-6 border-t space-y-1.5 ${darkMode ? 'border-gray-900' : 'border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Account</p>
                  {utilityNavItems.map(item => (
                    <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative group ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : `border border-transparent ${navText}`}`}>
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
              <div className="p-4 space-y-2 border-t border-inherit">
                <button 
                  onClick={() => setDarkMode(!darkMode)} 
                  className={`w-full flex items-center px-4 py-3 rounded-xl transition-all border border-transparent ${navText}`}
                >
                  {darkMode ? <Sun className="w-5 h-5 mr-3 text-amber-400" /> : <Moon className="w-5 h-5 mr-3 text-indigo-600" />}
                  <span className="text-sm font-bold">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </button>
                
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
              <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`flex flex-col items-center justify-center py-2 px-1 transition-all relative ${currentPage === item.id ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}>
                {currentPage === item.id && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />}
                <div className={`p-1.5 rounded-xl transition-all ${currentPage === item.id ? 'bg-indigo-500/10' : ''}`}><item.icon className={`w-7 h-7 ${currentPage === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} /></div>
              </button>
            ))}
          </nav>
        )}
      </div>
    </ApiProvider>
  );
};

export default App;