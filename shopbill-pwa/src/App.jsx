import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  ShoppingCart, CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, X, FileText, Truck, Sun, Moon, LayoutGrid, Store, ChevronDown, PlusCircle, Settings2, MessageCircle, MoreHorizontal
} from 'lucide-react';
import { io } from 'socket.io-client';

// Core Component Imports
import API, { SOCKET_URL, SOCKET_IO_CLIENT_BASE } from './config/api';
import apiClient from './lib/apiClient';
import { ApiProvider } from './contexts/ApiContext';
import { OfflineProvider } from './contexts/OfflineContext';
import PageRouteFallback from './components/PageRouteFallback';
import PageErrorBoundary from './components/PageErrorBoundary';
import { usePushNotifications } from './hooks/usePushNotifications';
import { onForegroundMessage, isPushSupported, ensureFcmServiceWorkerReady } from './lib/firebase';
import { playMessageSound, playPushSoundCategory, unlockAudio } from './utils/notificationSound';
import { requestPushFromGesture } from './utils/pushOnGesture';
import {
  primeSwipeHaptic,
  pulseSwipePageHaptic,
  registerPwaSwipeHapticWarmup,
  registerPwaSwipeHapticLifecycle,
} from './utils/swipeHaptic';
import { USER_ROLES } from './utils/constants';
import Header from './components/Header';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import SEO from './components/SEO';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import OutletManager from './components/OutletManager';
import OutletSelector from './components/OutletSelector';
import ResetPassword from './components/ResetPassword';
import StaffSetPassword from './components/StaffSetPassword';

// Lazy Load Heavy Components
const Dashboard = lazy(() => import('./components/Dashboard'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const BillingPOS = lazy(() => import('./components/BillingPOS'));
const Ledger = lazy(() => import('./components/Ledger'));
const Reports = lazy(() => import('./components/Reports'));
const SettingsPage = lazy(() => import('./components/Settings'));
const Profile = lazy(() => import('./components/Profile'));
const NotificationsPage = lazy(() => import('./components/NotificationsPage'));
const SalesActivityPage = lazy(() => import('./components/SalesActivityPage'));
const OffersManager = lazy(() => import('./components/OffersManager'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const SuperAdminDashboard = lazy(() => import('./components/superAdminDashboard'));
const SuperAdminSettings = lazy(() => import('./components/SuperAdminSettings'));
const SystemConfig = lazy(() => import('./components/SystemConfig'));
const GlobalReport = lazy(() => import('./components/GlobalReport'));
const Checkout = lazy(() => import('./components/Checkout'));
const TermsAndConditions = lazy(() => import('./components/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const SupportPage = lazy(() => import('./components/SupportPage'));
const AffiliatePage = lazy(() => import('./components/AffiliatePage'));
import MandateRestorePage from './components/MandateRestorePage';
import RenewSubscriptionPage from './components/RenewSubscriptionPage';
const SupplyChainManagement = lazy(() => import('./components/SupplyChainManagement'));
const PlanUpgrade = lazy(() => import('./components/PlanUpgrade'));
const StaffPermissionsManager = lazy(() => import('./components/StaffPermissionsManager'));
const ChangePasswordForm = lazy(() => import('./components/ChangePasswordForm'));
const Chat = lazy(() => import('./components/Chat'));

const UTILITY_NAV_ITEMS_CONFIG = [
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
  { id: 'staffPermissions', name: 'Team Management', icon: Users, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], priority: 1 },
  { id: 'offers', name: 'Offers', icon: FileText, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], priority: 2 },
  { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], priority: 3 },
    { id: 'profile', name: 'Profile', icon: User, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER] },
];

const SUPERADMIN_NAV_ITEMS = [
    { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'superadmin_users', name: 'Manage Shops', icon: Users, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'notifications', name: 'Notifications', icon: Bell, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'superadmin_systems', name: 'System Config', icon: Settings2, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'reports', name: 'Global Reports', icon: TrendingUp, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.SUPERADMIN] },
];

/** Grantable keys — must match server `GRANTABLE_ROLE_PAGE_PERMISSION_KEYS`. */
const STAFF_GRANTABLE_PAGE_KEYS = [
  'dashboard',
  'billing',
  'khata',
  'salesActivity',
  'inventory',
  'scm',
  'staffPermissions',
  'offers',
];

/** Always available to staff — not shown in Grant Permissions. */
const STAFF_COMMON_PAGE_KEYS = ['chat', 'notifications', 'profile', 'settings'];

const STAFF_PAGE_PERMISSION_KEYS = [...STAFF_GRANTABLE_PAGE_KEYS, ...STAFF_COMMON_PAGE_KEYS];

const normalizeStaffPagesFromServer = (raw) => {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const key of STAFF_GRANTABLE_PAGE_KEYS) {
    out[key] = typeof src[key] === 'boolean' ? src[key] : false;
  }
  for (const key of STAFF_COMMON_PAGE_KEYS) {
    out[key] = true;
  }
  return out;
};

const checkDeepLinkPath = () => {
    const params = new URLSearchParams(window.location.search || '');
    if (params.get('staffSetupToken')) return 'staffSetPassword';
    if (params.get('resetToken')) return 'resetPassword';
    const hashPath = (window.location.hash || '').replace(/^#/, '');
    let path = hashPath || window.location.pathname || '';
    if (path && !path.startsWith('/')) path = `/${path}`;
    if (path.startsWith('/staff-setup/')) {
        return 'staffSetPassword'; 
    }
    if (path.startsWith('/reset-password/')) {
        return 'resetPassword'; 
    }
    if (path === '/notifications' || path.startsWith('/notifications/')) {
        return 'notifications';
    }
    if (
        params.get('page') === 'mandateRestore' ||
        path === '/mandate-restore' ||
        path.startsWith('/mandate-restore/')
    ) {
        return 'mandateRestore';
    }
    if (
        params.get('page') === 'renewSubscription' ||
        path === '/renew-subscription' ||
        path.startsWith('/renew-subscription/')
    ) {
        return 'renewSubscription';
    }
    return null;
};

const App = () => {
  const [currentPage, setCurrentPage] = useState(checkDeepLinkPath() || 'dashboard');
  const [pageOrigin, setPageOrigin] = useState('dashboard');
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const [currentUser, setCurrentUser] = useState(() => {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
  });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [, setToast] = useState(null);
  const [isViewingLogin, setIsViewingLogin] = useState(false);
  const [mandateRestoreRequired, setMandateRestoreRequired] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showLowStockFilter, setShowLowStockFilter] = useState(false);
  const [scrollToPricing, setScrollToPricing] = useState(false);
  const socketRef = useRef(null);
  const currentUserRef = useRef(currentUser);
  const outletRestoredRef = useRef(false);
  const billingRefreshRef = useRef(null); // BillingPOS sets this to fetchRecentSales so we can refresh on new_sale
  const chatUnreadRefreshTimeoutRef = useRef(null);

  const [currentOutlet, setCurrentOutlet] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [currentOutletId, setCurrentOutletId] = useState(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const lastSelectedOutletId = localStorage.getItem('lastSelectedOutletId');
    return lastSelectedOutletId || user?.activeStoreId || null;
  });
  const [isChatSelected, setIsChatSelected] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' ? !window.matchMedia('(min-width: 768px)').matches : false
  );
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [hasModalOpen, setHasModalOpen] = useState(false);
  /** Bumped from Header “Add New” branch hub so OutletManager opens create modal after navigation */
  const [openCreateBranchSignal, setOpenCreateBranchSignal] = useState(0);
  const [slideDirection, setSlideDirection] = useState(null); // 'left' | 'right' for page swipe animation
  const touchStartRef = useRef({ x: 0, y: 0 });
  const pageSwipeSuppressUntilRef = useRef(0);
  const chatThreadOpenAtTouchStartRef = useRef(false);
  const wasChatThreadOpenRef = useRef(false);
  const mainScrollRef = useRef(null);
  const backStackRef = useRef([]); // stack of page ids for swipe-back (e.g. Profile → back → Dashboard; Settings → Child → back → Settings)

  // Deep links (staff-setup, reset-password): stable listeners; compare via ref to avoid effect churn on every page change.
  useEffect(() => {
    const handlePathChange = () => {
      const deepLinkPage = checkDeepLinkPath();
      if (deepLinkPage && deepLinkPage !== currentPageRef.current) {
        backStackRef.current = [];
        setCurrentPage(deepLinkPage);
      }
    };
    handlePathChange();
    window.addEventListener('popstate', handlePathChange);
    window.addEventListener('hashchange', handlePathChange);
    return () => {
      window.removeEventListener('popstate', handlePathChange);
      window.removeEventListener('hashchange', handlePathChange);
    };
  }, []);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('themePreference');
    return saved !== null ? JSON.parse(saved) : true;
  });

  currentUserRef.current = currentUser;
  useEffect(() => {
    localStorage.setItem('themePreference', JSON.stringify(darkMode));
  }, [darkMode]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const userRole = currentUser?.role?.toLowerCase() || USER_ROLES.CASHIER;
  const planUpper = currentUser?.plan?.toUpperCase();
  const isPremium = planUpper === 'PREMIUM';
  const hasSupplyChainAccess = planUpper === 'PREMIUM' || planUpper === 'PRO';
  const rolePagePermissions = useMemo(() => {
    if (userRole === USER_ROLES.OWNER || userRole === USER_ROLES.SUPERADMIN) return null;
    const serverPages = currentUser?.permissions?.pages;
    if (serverPages && typeof serverPages === 'object' && !Array.isArray(serverPages)) {
      return normalizeStaffPagesFromServer(serverPages);
    }
    /* No server map yet (stale session): deny all until GET /profile fills permissions.pages */
    return normalizeStaffPagesFromServer({});
  }, [userRole, currentUser?.permissions?.pages]);
  const canAccessPage = useCallback((pageId) => {
    if (userRole === USER_ROLES.OWNER || userRole === USER_ROLES.SUPERADMIN) return true;
    if (STAFF_COMMON_PAGE_KEYS.includes(pageId)) return true;
    if (pageId === 'reports' && userRole === USER_ROLES.MANAGER && currentUser?.permissions?.reports === true) {
      return true;
    }
    return rolePagePermissions?.[pageId] === true;
  }, [userRole, rolePagePermissions, currentUser?.permissions?.reports]);
  const mergeCurrentUserFields = useCallback((partial) => {
    if (!partial || typeof partial !== 'object') return;
    setCurrentUser((prev) => {
      const next = { ...(prev || {}), ...partial };
      localStorage.setItem('currentUser', JSON.stringify(next));
      return next;
    });
  }, []);

  usePushNotifications(
    !!currentUser,
    currentUser?._id || currentUser?.id,
    currentUser?.pushNotificationsEnabled
  );

  /** FCM SW plays OS notification; open clients get distinct synthetic sounds via postMessage. */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onSwMessage = (event) => {
      if (event?.data?.type === 'play-push-sound' && event.data.category) {
        playPushSoundCategory(event.data.category);
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
  }, []);

  // Calculate unread count - updates in real-time when notifications change via Socket.IO
  const unreadCount = useMemo(() => {
    const count = (notifications || []).filter(n => {
      // Count as unread if isRead is explicitly false or undefined
      return n && (n.isRead === false || n.isRead === undefined);
    }).length;
    return count;
  }, [notifications]);

  const requestAttendanceDecision = useCallback(() => Promise.resolve(true), []);

  // Navigate and push current page to back stack (so swipe-back can return). Use opts.replace to clear stack (e.g. logout, back-to-origin).
  const navigateTo = useCallback((page, opts) => {
    if (mandateRestoreRequired) {
      showToast('Complete payment mandate restore to access the app.', 'info');
      return;
    }
    const publicIds = new Set(['staffSetPassword', 'resetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate', 'mandateRestore', 'renewSubscription']);
    if (
      !publicIds.has(page) &&
      currentUser &&
      userRole !== USER_ROLES.OWNER &&
      userRole !== USER_ROLES.SUPERADMIN &&
      rolePagePermissions &&
      Object.prototype.hasOwnProperty.call(rolePagePermissions, page) &&
      !canAccessPage(page)
    ) {
      showToast('Access restricted by owner permissions.', 'info');
      return;
    }
    if (page === 'inventory' && opts?.lowStockSort) {
      setShowLowStockFilter(true);
    }
    if (opts?.replace) backStackRef.current = [];
    if (page !== currentPage) {
      if (!opts?.replace) backStackRef.current = [...backStackRef.current, currentPage];
      setCurrentPage(page);
    }
  }, [currentPage, currentUser, userRole, rolePagePermissions, canAccessPage, showToast, mandateRestoreRequired]);

  const handleViewAllSales = useCallback(() => navigateTo('salesActivity'), [navigateTo]);
  const handleViewAllCredit = useCallback(() => navigateTo('khata'), [navigateTo]);
  const handleViewAllInventory = useCallback(() => {
    navigateTo('inventory', { lowStockSort: true });
  }, [navigateTo]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const onServiceWorkerMessage = (event) => {
      const data = event?.data || {};
      if (data.type !== 'notification-click') return;
      const rawUrl = String(data.url || '').toLowerCase();
      if (rawUrl.includes('/chat')) {
        navigateTo('chat');
        return;
      }
      if (rawUrl.includes('/khata') || rawUrl.includes('/ledger')) {
        navigateTo('khata');
        return;
      }
      if (rawUrl.includes('/inventory')) {
        const notifType = String(data.notificationType || '').toLowerCase();
        navigateTo('inventory', { lowStockSort: notifType === 'inventory_low' });
        return;
      }
      if (String(data.notificationType || '').toLowerCase() === 'inventory_low') {
        navigateTo('inventory', { lowStockSort: true });
        return;
      }
      if (rawUrl.includes('/reports')) {
        navigateTo('reports');
        return;
      }
      if (rawUrl.includes('/scm') || rawUrl.includes('/supply')) {
        navigateTo('scm');
        return;
      }
      if (rawUrl.includes('/notification')) {
        navigateTo('notifications');
      }
    };
    navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
  }, [navigateTo]);

  useEffect(() => {
    if (!currentUser || !('serviceWorker' in navigator) || !navigator.serviceWorker.getRegistrations) return;
    navigator.serviceWorker.getRegistrations()
      .then((regs) => {
        console.log('[Push][App] Active service worker registrations:', regs.map(r => ({
          scope: r.scope,
          activeScript: r.active?.scriptURL || null,
          hasActive: Boolean(r.active),
          hasWaiting: Boolean(r.waiting),
          hasInstalling: Boolean(r.installing)
        })));
      })
      .catch((err) => console.warn('[Push][App] Failed to inspect service workers:', err?.message || err));
  }, [currentUser?._id]);

  const formatNotificationForRole = useCallback((notification) => {
    if (!notification) return notification;
    const role = String(currentUser?.role || '').toLowerCase();
    const isOwnerOrSuperadmin = role === 'owner' || role === 'superadmin';
    if (isOwnerOrSuperadmin) return notification;

    const message = typeof notification.message === 'string' ? notification.message : '';
    // Staff (manager/cashier) do not need outlet prefix like "[Outlet] ..."
    const messageWithoutOutletPrefix = message.replace(/^\[[^\]]+\]\s*/, '');
    return { ...notification, message: messageWithoutOutletPrefix };
  }, [currentUser?.role]);
  
  const fetchNotificationHistory = useCallback(async () => {
    if (!currentUser || !apiClient || !API) {
      return;
    }
    try {
      const response = await apiClient.get(API.notificationalert);
      
      if (response.data) {
        // API returns { count: number, alerts: array }
        const alerts = (response.data.alerts || []).filter((alert) => {
          const type = String(alert?.type || '').toLowerCase();
          const notificationType = String(alert?.notificationType || alert?.metadata?.notificationType || '').toLowerCase();
          const link = String(alert?.link || alert?.metadata?.link || '').toLowerCase();
          const hasChatMarker = Boolean(alert?.chatId || alert?.metadata?.chatId);
          if (type === 'chat_message' || notificationType === 'chat_message') return false;
          if (hasChatMarker) return false;
          if (link.includes('/chat')) return false;
          return true;
        });
        setNotifications(alerts.map(formatNotificationForRole));
      } else {
        setNotifications([]);
      }
    } catch (error) { 
      console.error("❌ Error fetching notifications:", error.response?.data || error.message);
      // Don't clear notifications on error - keep existing ones
      // Only set empty if we have no notifications at all
      // setNotifications([]);
    }
  }, [currentUser, apiClient, API, formatNotificationForRole]);

  const handleIncomingNotification = useCallback((incomingAlert) => {
    if (!incomingAlert) return;
    const incomingType = String(
      incomingAlert?.notificationType ||
      incomingAlert?.type ||
      incomingAlert?.metadata?.notificationType ||
      ''
    ).toLowerCase();
    const incomingLink = String(incomingAlert?.link || incomingAlert?.metadata?.link || '').toLowerCase();
    const hasChatMarker = Boolean(incomingAlert?.chatId || incomingAlert?.metadata?.chatId);
    // Chat events should update chat UI/unread only, not header notification feed.
    if (incomingType === 'chat_message') return;
    if (hasChatMarker || incomingLink.includes('/chat')) return;

    // Filter out notifications where current user is the actor.
    const actorIdStr = incomingAlert?.actorId != null ? String(incomingAlert.actorId) : null;
    const userIdStr = currentUser?._id != null ? String(currentUser._id) : (currentUser?.id != null ? String(currentUser.id) : null);
    if (actorIdStr && userIdStr && actorIdStr === userIdStr) return;

    const notificationWithReadStatus = formatNotificationForRole({
      ...incomingAlert,
      isRead: false
    });

    setNotifications(prev => {
      const exists = prev.some(n => {
        const nId = n._id || n.id;
        const alertId = notificationWithReadStatus._id || notificationWithReadStatus.id;
        return nId && alertId && nId.toString() === alertId.toString();
      });
      if (exists) return prev;
      return [notificationWithReadStatus, ...prev].slice(0, 50);
    });

    const soundCategory =
      notificationWithReadStatus?.soundCategory ||
      notificationWithReadStatus?.metadata?.soundCategory ||
      'default';
    playPushSoundCategory(soundCategory);

    if (notificationWithReadStatus?.message) {
      showToast(notificationWithReadStatus.message, 'info');
    }
  }, [currentUser, formatNotificationForRole, showToast]);

  // Fetch a single outlet by ID
  const fetchOutletById = useCallback(async (outletId) => {
    const userPlan = currentUser?.plan?.toUpperCase();
    const isUserPremium = userPlan === 'PREMIUM';
    if (!outletId || !isUserPremium) return null;
    try {
      const response = await apiClient.get(API.outletDetails(outletId));
      if (response.data?.success) {
        return response.data.data;
      }
    } catch (error) {
      if (error.cancelled || error.message?.includes('cancelled')) {
        return null;
      }
      // Silently handle 403 errors (user doesn't have premium or access)
      if (error.response?.status === 403) {
        return null;
      }
      console.error('Error fetching outlet by ID:', error);
    }
    return null;
  }, [apiClient, API, currentUser?.plan]);

  const fetchOutlets = useCallback(async () => {
    // Only fetch outlets for Premium plan owners
    const userPlan = currentUser?.plan?.toUpperCase();
    const isUserPremium = userPlan === 'PREMIUM';
    
    if (!currentUser || !isUserPremium) {
      setOutlets([]);
      outletRestoredRef.current = false;
      return;
    }
    
    try {
      const response = await apiClient.get(API.outlets);
      if (response.data?.success) {
        const outletsList = response.data.data || [];
        setOutlets(outletsList);
        
        if (!outletRestoredRef.current) {
          outletRestoredRef.current = true;
          const lastSelectedOutletId = localStorage.getItem('lastSelectedOutletId');
          const currentActiveId = currentUser.activeStoreId;
          
          let targetOutletId = lastSelectedOutletId || currentActiveId;
          let targetOutlet = outletsList.find(o => o._id === targetOutletId);
          
          if (!targetOutlet && outletsList.length > 0) {
            targetOutlet = outletsList[0];
            targetOutletId = targetOutlet._id;
          }
          
          if (targetOutlet) {
            if (targetOutletId !== currentActiveId) {
              try {
                const switchResponse = await apiClient.put(API.switchOutlet(targetOutletId));
                if (switchResponse.data?.success) {
                  setCurrentOutlet(switchResponse.data.data.outlet);
                  setCurrentOutletId(targetOutletId);
                  const updatedUser = { ...currentUser, activeStoreId: targetOutletId };
                  localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                  setCurrentUser(updatedUser);
                  localStorage.setItem('lastSelectedOutletId', targetOutletId);
                }
              } catch (error) {
                // Ignore cancellation errors
                if (error.cancelled || error.message?.includes('cancelled')) {
                  return;
                }
                console.error('Failed to restore last outlet:', error);
                setCurrentOutlet(targetOutlet);
                setCurrentOutletId(targetOutletId);
                localStorage.setItem('lastSelectedOutletId', targetOutletId);
              }
    } else {
              setCurrentOutlet(targetOutlet);
              setCurrentOutletId(targetOutletId);
              localStorage.setItem('lastSelectedOutletId', targetOutletId);
            }
          }
        } else if (currentOutletId) {
          // Keep object in sync with active id (needs fresh currentOutletId/currentOutlet from closure)
          const activeOutlet = outletsList.find(
            (o) => String(o._id) === String(currentOutletId)
          );
          if (activeOutlet) {
            const idMismatch =
              !currentOutlet ||
              String(currentOutlet._id) !== String(currentOutletId);
            if (idMismatch) {
              setCurrentOutlet(activeOutlet);
            }
          }
        }
      }
    } catch (error) {
      // Ignore cancellation errors (expected behavior for duplicate request prevention)
      if (error.cancelled || error.message?.includes('cancelled')) {
        return;
      }
      // Silently ignore 403 errors for non-Premium users (expected behavior)
      if (error.response?.status === 403) {
        setOutlets([]);
        outletRestoredRef.current = false;
        return;
      }
      // Only log unexpected errors
      console.error('Error fetching outlets:', error);
    }
  }, [currentUser, currentOutlet, currentOutletId, apiClient, API]);

  // Initial fetch outlets - only when user or premium status changes
  const hasFetchedOutletsRef = useRef(false);
  useEffect(() => {
    const userPlan = currentUser?.plan?.toUpperCase();
    const isUserPremium = userPlan === 'PREMIUM';
    
    if (currentUser && isUserPremium && !hasFetchedOutletsRef.current) {
      hasFetchedOutletsRef.current = true;
      fetchOutlets();
    } else if (!currentUser || !isUserPremium) {
      setOutlets([]);
      outletRestoredRef.current = false;
      hasFetchedOutletsRef.current = false;
    }
  }, [currentUser?.id, currentUser?.plan, fetchOutlets]);

  // Sync currentOutlet from outlets list when it's loaded
useEffect(() => {
    const userPlan = currentUser?.plan?.toUpperCase();
    const isUserPremium = userPlan === 'PREMIUM';
    
    if (currentUser && isUserPremium && currentOutletId && !currentOutlet && outlets.length > 0) {
      const foundOutlet = outlets.find(o => o._id === currentOutletId);
      if (foundOutlet) {
        setCurrentOutlet(foundOutlet);
      } else if (apiClient && API) {
        // Only fetch individually if not in list
        fetchOutletById(currentOutletId).then(outlet => {
          if (outlet) {
            setCurrentOutlet(outlet);
          }
        });
      }
    }
  }, [outlets, currentOutletId, currentOutlet, currentUser?.plan, apiClient, API, fetchOutletById]);

  useEffect(() => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
      const scrollableContainers = document.querySelectorAll('main [class*="overflow"], main [class*="scroll"]');
      scrollableContainers.forEach(container => {
        if (container.scrollTop > 0) {
          container.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        }
      });
    });
  }, [currentPage, currentOutletId]);

  // Function to fetch and update chat unread count
  const updateChatUnreadCount = useCallback(async () => {
    if (!currentUser) return;
    const userPlan = currentUser.plan?.toUpperCase();
    const hasChatAccess = userPlan === 'PRO' || userPlan === 'PREMIUM';
    if (!hasChatAccess) return;

    try {
      const response = await apiClient.get(API.chatList);
      if (response.data?.success) {
        const raw = response.data.data;
        const fetchedChats = Array.isArray(raw) ? raw : [];
        const totalUnread = fetchedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setChatUnreadCount(totalUnread);
      }
    } catch (error) {
      if (error?.cancelled) return; // Duplicate request cancelled, ignore
      console.error('Failed to fetch chat unread count:', error);
    }
  }, [currentUser, apiClient, API]);

  useEffect(() => {
    if (!currentUser) return;

    socketRef.current = io(SOCKET_URL, {
      ...SOCKET_IO_CLIENT_BASE,
      auth: { token: localStorage.getItem('userToken') },
    });
    const socket = socketRef.current;
    
    const handleConnect = () => {
      const userId = currentUser._id ?? currentUser.id;
      // Store room must be the Store document id (same as emitAlert storeId). Never use staff user id or owner shopId token here.
      const storeRoom = currentOutletId || currentUser.activeStoreId || null;
      if (storeRoom) {
        socket.emit('join_shop', String(storeRoom));
      } else {
        console.warn('[Socket] No store id for join_shop; user-targeted notifications still work if JWT auth succeeded.');
      }
      if (userId) {
        socket.emit('join_user', String(userId));
      }
      fetchNotificationHistory();
      updateChatUnreadCount();
    };
    
    const handleNewNotification = (newAlert) => {
      handleIncomingNotification(newAlert);
    };
    
    const handleNewMessage = (data) => {
      const me = currentUserRef.current;
      const raw = data?.message?.senderId;
      const senderId =
        raw != null
          ? String(raw._id ?? raw.id ?? raw)
          : null;
      const myId = me?._id ?? me?.id;
      const isFromOthers = Boolean(senderId && myId != null && senderId !== String(myId));
      if (isFromOthers) playMessageSound();
      // Debounce unread refresh to avoid burst API calls during rapid incoming messages.
      if (chatUnreadRefreshTimeoutRef.current) {
        clearTimeout(chatUnreadRefreshTimeoutRef.current);
      }
      chatUnreadRefreshTimeoutRef.current = setTimeout(() => {
        updateChatUnreadCount();
      }, 800);
    };
    
    const handleNewSale = () => {
      if (billingRefreshRef.current) billingRefreshRef.current();
    };
    const onConnectError = (err) => {
      console.warn('[Socket] connect_error:', err?.message || err);
    };
    const onDisconnect = (reason) => {
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    };
    socket.on('connect', handleConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);
    socket.on('new_notification', handleNewNotification);
    socket.on('new_message', handleNewMessage);
    socket.on('new_sale', handleNewSale);
    
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('connect_error', onConnectError);
        socket.off('disconnect', onDisconnect);
        socket.off('new_notification', handleNewNotification);
        socket.off('new_message', handleNewMessage);
        socket.off('new_sale', handleNewSale);
        socket.disconnect();
      }
      if (chatUnreadRefreshTimeoutRef.current) {
        clearTimeout(chatUnreadRefreshTimeoutRef.current);
        chatUnreadRefreshTimeoutRef.current = null;
      }
    };
  }, [currentUser, currentUser?.activeStoreId, currentOutletId, fetchNotificationHistory, handleIncomingNotification, updateChatUnreadCount]);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    let unsubscribe = () => {};

    (async () => {
      try {
        if (!(await isPushSupported()) || cancelled) return;
        await ensureFcmServiceWorkerReady();
        if (cancelled) return;
        unsubscribe = onForegroundMessage((payload) => {
          const data = payload?.data || {};
          const notification = payload?.notification || {};
          const fallbackId = `fcm-${Date.now()}`;
          const notifType = data.notificationType || data.type || (data.chatId ? 'chat_message' : '');
          const inferredSound =
            notifType === 'chat_message' || data.type === 'chat_message'
              ? 'chat'
              : String(notifType).startsWith('attendance_')
                ? 'attendance'
                : ['ledger_payment', 'ledger_credit', 'credit_sale', 'credit_limit_updated', 'customer_added'].includes(String(notifType))
                  ? 'ledger'
                  : ['inventory_low', 'credit_exceeded'].includes(String(notifType))
                    ? 'alert'
                    : 'default';
          const soundCategory = data.soundCategory || inferredSound;
          const synthesizedAlert = {
            _id: data.notificationId || data.messageId || fallbackId,
            id: data.notificationId || data.messageId || fallbackId,
            type: data.notificationType || data.type || 'info',
            category: data.category || 'Info',
            title: notification.title || data.title || 'Pocket POS',
            message: notification.body || data.body || data.message || 'New notification',
            createdAt: new Date().toISOString(),
            actorId: data.actorId || data.senderId || null,
            soundCategory,
            metadata: { ...data, soundCategory },
          };
          handleIncomingNotification(synthesizedAlert);
        });
      } catch (e) {
        console.warn('[Push][App] Foreground FCM listener failed:', e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser, handleIncomingNotification]);

  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('push_token_registered');
    setMandateRestoreRequired(false);
    setCurrentUser(null);
    setCurrentOutletId(null);
    setCurrentOutlet(null);
    setOutlets([]);
    setNotifications([]);
    backStackRef.current = [];
    setCurrentPage('dashboard');
    setIsViewingLogin(false);
    outletRestoredRef.current = false;
  }, []); 

  const handleLoginSuccess = useCallback(async (user, token) => {
    const uid = user._id ?? user.id;
    const normalizedUser = {
      ...user,
      _id: uid,
      id: user.id ?? user._id ?? uid,
      role: user.role.toLowerCase(),
      permissions: (() => {
        const r = String(user.role || '').toLowerCase();
        const perms = user.permissions || {};
        if (r === 'owner' || r === 'superadmin') return perms;
        return { ...perms, pages: normalizeStaffPagesFromServer(perms.pages || {}) };
      })(),
    };
    localStorage.setItem('userToken', token);
    localStorage.setItem('currentUser', JSON.stringify(normalizedUser));
    setCurrentUser(normalizedUser);
    const lastSelectedOutletId = localStorage.getItem('lastSelectedOutletId');
    const outletId = lastSelectedOutletId || normalizedUser.activeStoreId || null;
    setCurrentOutletId(outletId);
    
    // If we have an outlet ID and user is premium, fetch the outlet immediately
    if (outletId && normalizedUser.plan?.toLowerCase() === 'premium') {
      try {
        const outlet = await apiClient.get(API.outletDetails(outletId));
        if (outlet.data?.success && outlet.data.data) {
          setCurrentOutlet(outlet.data.data);
        }
    } catch (error) {
        // Silently fail - fetchOutlets will handle it
        console.error('Failed to fetch outlet on login:', error);
      }
    }
    
    backStackRef.current = [];
    setCurrentPage('dashboard'); // All roles start at dashboard now
    setIsViewingLogin(false);
    // Replace the current history slot so edge-swipe / system back does not restore a pre-login bfcache snapshot.
    try {
      window.history.replaceState(
        { pocketposApp: true, pocketposAuthed: true, at: Date.now() },
        '',
        window.location.href
      );
    } catch {
      /* ignore */
    }
    unlockAudio(); // Unlock audio for message sounds (user gesture from login)
    // iOS Safari / installed PWA: notification permission must run in the same user-gesture chain as login tap.
    requestPushFromGesture().catch(() => {});
  }, [apiClient, API]);

  // bfcache can restore an older JS snapshot after system back; re-sync session from storage.
  useEffect(() => {
    const onPageShow = (e) => {
      if (!e.persisted) return;
      const token = localStorage.getItem('userToken');
      const raw = localStorage.getItem('currentUser');
      if (!token || token === 'undefined' || !raw) return;
      try {
        const stored = JSON.parse(raw);
        if (!(stored && (stored.id || stored._id))) return;
        setCurrentUser(stored);
        setIsViewingLogin(false);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const handleOutletSwitch = useCallback((outlet) => {
    if (outlet) {
      setCurrentOutlet(outlet);
      setCurrentOutletId(outlet._id);
      const updatedUser = { ...currentUser, activeStoreId: outlet._id };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      localStorage.setItem('lastSelectedOutletId', outlet._id);
      setCurrentUser(updatedUser);
    }
  }, [currentUser]);

  const PROFILE_USER_PATCH_KEYS = [
    'name', 'email', 'phone', 'shopName', 'taxId', 'address',
    'profileImageUrl', 'currency', 'timezone', 'businessType',
    'plan', 'planEndDate', 'subscriptionStatus',
  ];

  const handleProfileUpdated = useCallback((updatedData) => {
    if (!updatedData) return;
    const normalizedUpdate = updatedData?.user || updatedData?.data || updatedData;
    const patch = {};
    PROFILE_USER_PATCH_KEYS.forEach((key) => {
      if (normalizedUpdate[key] !== undefined && normalizedUpdate[key] !== null) {
        patch[key] = normalizedUpdate[key];
      }
    });
    setCurrentUser((prevUser) => {
      const mergedUser = { ...(prevUser || {}), ...patch };
      localStorage.setItem('currentUser', JSON.stringify(mergedUser));
      return mergedUser;
    });
    try {
      window.dispatchEvent(new CustomEvent('pocketpos:refresh-billing-alert'));
    } catch {
      /* ignore */
    }
    // Keep active outlet label in sync after business-name edits from Profile.
    if (normalizedUpdate.shopName) {
      setCurrentOutlet((prevOutlet) => (
        prevOutlet ? { ...prevOutlet, name: normalizedUpdate.shopName } : prevOutlet
      ));
      setOutlets((prevOutlets) => {
        if (!Array.isArray(prevOutlets)) return prevOutlets;
        return prevOutlets.map((outlet) => (
          outlet?._id === currentOutletId || (!currentOutletId && prevOutlets.length === 1)
            ? { ...outlet, name: normalizedUpdate.shopName }
            : outlet
        ));
      });
    }
  }, [currentOutletId]);

  const handleRegistrationComplete = useCallback(() => {
    backStackRef.current = [];
    setCurrentPage('dashboard');
    setIsViewingLogin(true);
    showToast('Registration successful! Please sign in.', 'success');
  }, [showToast]);

  const openPublicPage = useCallback((page, { fromLogin = false } = {}) => {
    backStackRef.current = [];
    setPageOrigin(fromLogin ? 'login' : 'landing');
    setIsViewingLogin(false);
    setCurrentPage(page);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('page', page);
      window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
    } catch (_) { /* ignore */ }
  }, []);

  useEffect(() => {
    // Check if we're on a public page that doesn't require auth
    const publicPages = ['staffSetPassword', 'resetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate', 'mandateRestore', 'renewSubscription'];
    const isPublicPage = publicPages.includes(currentPage);
    
    // Don't check auth for public pages
    if (isPublicPage) {
      setIsLoadingAuth(false);
      return;
    }
    
    // If no user is logged in, skip logout (we're on login/landing flow - don't flip isViewingLogin)
    if (!currentUser) {
      setIsLoadingAuth(false);
      return;
    }
    
    const token = localStorage.getItem('userToken');
    if (!token || token === 'undefined') {
      logout();
    }
    setIsLoadingAuth(false);
  }, [logout, currentPage, currentUser]);

  const refreshBillingGate = useCallback(async () => {
    if (!currentUser || !apiClient || !API?.currentPlan) return;
    const role = String(currentUser?.role || '').toLowerCase();
    if (role === USER_ROLES.SUPERADMIN) return;
    try {
      const res = await apiClient.get(API.currentPlan);
      if (res.data?.mandateRestoreRequired) {
        setMandateRestoreRequired(true);
        return;
      }
      setMandateRestoreRequired(false);
      if (res.data?.success && res.data.accessAllowed === false) {
        const msg =
          res.data.billingAlert?.message ||
          'Your paid access period has ended. Restart your subscription from the login page to use your existing store again.';
        try {
          sessionStorage.setItem('loginBanner', msg);
          sessionStorage.setItem('loginBannerType', 'expired');
        } catch (_) { /* ignore */ }
        showToast(msg, 'error');
        logout();
      }
    } catch (err) {
      if (err.response?.data?.mandateRestoreRequired) {
        setMandateRestoreRequired(true);
      }
    }
  }, [currentUser, apiClient, logout, showToast]);

  // Halted → stay logged in on mandate gate; expired → logout
  useEffect(() => {
    const role = String(currentUser?.role || '').toLowerCase();
    if (!currentUser || role === USER_ROLES.SUPERADMIN || !apiClient || !API?.currentPlan) return undefined;

    refreshBillingGate();
    const intervalId = setInterval(refreshBillingGate, 15 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshBillingGate();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [currentUser, apiClient, refreshBillingGate]);

  useEffect(() => {
    if (currentUser && !mandateRestoreRequired) {
      refreshBillingGate();
    }
  }, [currentPage, currentUser, mandateRestoreRequired, refreshBillingGate]);

  const handleSubscriptionAccessEnded = useCallback(() => {
    const msg =
      'Your paid access period has ended. Restart your subscription from the login page to use your existing store again.';
    try {
      sessionStorage.setItem('loginBanner', msg);
      sessionStorage.setItem('loginBannerType', 'expired');
    } catch (_) { /* ignore */ }
    showToast(msg, 'error');
    logout();
  }, [logout, showToast]);

  const handleMandateAccessRestored = useCallback(async () => {
    if (!apiClient || !API?.currentPlan) return;
    try {
      const res = await apiClient.get(API.currentPlan);
      if (!res.data?.mandateRestoreRequired) {
        setMandateRestoreRequired(false);
        setCurrentPage('dashboard');
        showToast('Store access restored.', 'success');
      }
    } catch (_) {
      await refreshBillingGate();
    }
  }, [apiClient, refreshBillingGate, showToast]);

  // Sync current user from server (role, plan, page permissions) so staff pick up Team Management changes
  useEffect(() => {
    const syncUserFromProfile = async () => {
      const cu = currentUserRef.current;
      if (!cu || !apiClient || !API?.profile) return;
      try {
        const response = await apiClient.get(API.profile);
        if (response.data?.success && response.data?.user) {
          const serverUser = response.data.user;
          const serverRole = String(serverUser.role ?? cu.role ?? '').toLowerCase();
          const mergedPermissions = serverUser.permissions || cu.permissions || {};
          let updatedUser = {
            ...cu,
            role: serverRole,
            plan: serverUser.plan ?? cu.plan,
            shopName: serverUser.shopName ?? cu.shopName,
            id: serverUser.id ?? cu.id,
            _id: serverUser.id ?? cu._id,
            activeStoreId: serverUser.activeStoreId ?? cu.activeStoreId,
            shopId: serverUser.shopId ?? cu.shopId,
            permissions:
              serverRole !== USER_ROLES.OWNER && serverRole !== USER_ROLES.SUPERADMIN
                ? {
                    ...mergedPermissions,
                    pages: normalizeStaffPagesFromServer(mergedPermissions.pages || {}),
                  }
                : mergedPermissions,
          };
          if (updatedUser.role !== 'owner' && updatedUser.role !== 'superadmin') {
            try {
              const planRes = await apiClient.get(API.currentPlan);
              if (planRes.data?.success && planRes.data?.plan) {
                updatedUser = { ...updatedUser, plan: planRes.data.plan };
              }
            } catch { /* ignore */ }
          }
          const roleChanged = (cu.role || '').toLowerCase() !== (updatedUser.role || '').toLowerCase();
          const permissionsChanged = JSON.stringify(updatedUser.permissions || {}) !== JSON.stringify(cu.permissions || {});
          const storeCtxChanged =
            String(updatedUser.activeStoreId || '') !== String(cu.activeStoreId || '') ||
            String(updatedUser.shopId || '') !== String(cu.shopId || '');
          if (
            roleChanged ||
            updatedUser.plan !== cu.plan ||
            updatedUser.shopName !== cu.shopName ||
            permissionsChanged ||
            storeCtxChanged
          ) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
          }
        }
      } catch (error) {
        console.error('Failed to sync user profile:', error);
      }
    };

    if (currentUser?.id && apiClient) {
      syncUserFromProfile();
    }

    const syncStaffOnResume = () => {
      const cu = currentUserRef.current;
      const role = (cu?.role || '').toLowerCase();
      if (cu?.id && apiClient && (role === 'manager' || role === 'cashier')) {
        syncUserFromProfile();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') syncStaffOnResume();
    };
    window.addEventListener('focus', syncStaffOnResume);
    document.addEventListener('visibilitychange', onVisibility);
    const periodicStaffSync = setInterval(() => {
      const cu = currentUserRef.current;
      const role = (cu?.role || '').toLowerCase();
      if (document.visibilityState === 'visible' && cu?.id && apiClient && (role === 'manager' || role === 'cashier')) {
        syncUserFromProfile();
      }
    }, 45000);
    return () => {
      window.removeEventListener('focus', syncStaffOnResume);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(periodicStaffSync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Login: full sync; staff also refresh on focus so outlet role permissions apply without re-login

  const navItems = useMemo(() => {
    if (userRole === USER_ROLES.SUPERADMIN) return SUPERADMIN_NAV_ITEMS;
    const userPlan = currentUser?.plan?.toUpperCase();
    const ownerChatAllowed = userPlan === 'PRO' || userPlan === 'PREMIUM';
    const includeChatNav =
      userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.CASHIER
        ? canAccessPage('chat')
        : ownerChatAllowed;
    const standardNav = [
      { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 1, manager: 1, cashier: 1 } },
      { id: 'billing', name: 'Billing', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: null, manager: 2, cashier: 1 } },
      { id: 'khata', name: 'Ledger', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 2, manager: 3, cashier: 2 } },
      { id: 'inventory', name: 'Stock', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], displayOrder: { owner: null, manager: 4, cashier: null } },
      ...(hasSupplyChainAccess ? [{ id: 'scm', name: 'Supply Chain', icon: Truck, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], displayOrder: { owner: null, manager: null, cashier: null } }] : []),
      { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 4, manager: null, cashier: null } },
      ...(includeChatNav ? [{ id: 'chat', name: 'Messages', icon: MessageCircle, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 3, manager: null, cashier: null } }] : []),
    ];
    return standardNav.filter(item => item.roles.includes(userRole) && canAccessPage(item.id));
  }, [userRole, hasSupplyChainAccess, currentUser?.plan, canAccessPage]);

  // Split nav items into primary (footer) and secondary (more menu) based on role and plan
  const { primaryNavItems, secondaryNavItems } = useMemo(() => {
    const filtered = navItems.filter(item => item.roles.includes(userRole));
    const userPlan = currentUser?.plan?.toUpperCase();
    const isBasicManager = userRole === USER_ROLES.MANAGER && userPlan !== 'PREMIUM' && userPlan !== 'PRO';

    // For superadmin, all items go to primary (no "more" menu needed)
    if (userRole === USER_ROLES.SUPERADMIN) {
      return { primaryNavItems: filtered, secondaryNavItems: [] };
    }

    // Basic plan manager: footer only Dashboard, Inventory, Ledger, Billing (settings in mobile footer; profile/notifications in header)
    const rolePrimaryMenuIds = {
      [USER_ROLES.OWNER]: ['dashboard', 'khata', 'chat', 'reports'], // Dashboard, Ledger, Messages, Reports
      [USER_ROLES.MANAGER]: isBasicManager
        ? ['dashboard', 'inventory', 'khata', 'chat', ...(canAccessPage('reports') ? ['reports'] : [])]
        : ['dashboard', 'inventory', 'scm', 'khata', 'chat'],
      [USER_ROLES.CASHIER]: ['dashboard', 'billing', 'khata', 'chat'], // Dashboard, Billing, Ledger, Messages
    };

    // Define role-specific secondary menu order (for More menu)
    const roleSecondaryMenuOrder = {
      [USER_ROLES.OWNER]: ['scm', 'inventory', 'billing'], // Supply Chain, Inventory, Billing
      [USER_ROLES.MANAGER]: [],
      [USER_ROLES.CASHIER]: [],
    };

    const primaryMenuIds = rolePrimaryMenuIds[userRole] || [];
    
    // Get primary items in the specified order
    const primary = primaryMenuIds
      .map(id => filtered.find(item => item.id === id))
      .filter(Boolean); // Remove undefined items (e.g., if chat is not available)
    
    // Secondary items: Everything else
    const primaryIds = primary.map(item => item.id);
    const secondary = filtered.filter(item => !primaryIds.includes(item.id));
    
    // Sort secondary items by role-specific order
    const secondaryOrder = roleSecondaryMenuOrder[userRole] || [];
    const sortedSecondary = secondaryOrder
      .map(id => secondary.find(item => item.id === id))
      .filter(Boolean)
      .concat(secondary.filter(item => !secondaryOrder.includes(item.id)));
    
    return { primaryNavItems: primary, secondaryNavItems: sortedSecondary };
  }, [navItems, userRole, currentUser?.plan, canAccessPage]);

  const utilityNavItems = useMemo(() => {
    const filtered = UTILITY_NAV_ITEMS_CONFIG.filter(item => item.roles.includes(userRole) && canAccessPage(item.id));
    return filtered.sort((a, b) => {
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  }, [userRole, canAccessPage]);

  /** Notifications & Profile are in the header — omit from mobile footer / More menu. Settings is mobile-footer only (not in header). */
  const MOBILE_FOOTER_EXCLUDED_PAGE_IDS = new Set(['notifications', 'profile']);

  // Footer More menu utility rows (no notifications/profile); Settings always last
  const moreMenuUtilityItems = useMemo(() => {
    const items = UTILITY_NAV_ITEMS_CONFIG.filter(
      (item) =>
        item.roles.includes(userRole) &&
        canAccessPage(item.id) &&
        !MOBILE_FOOTER_EXCLUDED_PAGE_IDS.has(item.id)
    );
    return items.sort((a, b) => {
      if (a.id === 'settings') return 1;
      if (b.id === 'settings') return -1;
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  }, [userRole, canAccessPage]);

  // Owner footer More menu: Team management, offers, supply chain, inventory, billing, settings
  const footerMoreMenuItems = useMemo(() => {
    if (userRole !== USER_ROLES.OWNER) return null;
    const order = ['staffPermissions', 'offers', 'scm', 'inventory', 'billing', 'settings'];
    const utility = moreMenuUtilityItems; // Team Management, Settings (no notifications/profile)
    const secondary = secondaryNavItems;  // e.g. scm, inventory, billing
    const byId = new Map();
    utility.forEach(item => byId.set(item.id, item));
    secondary.forEach(item => byId.set(item.id, item));
    return order.map(id => byId.get(id)).filter(Boolean);
  }, [userRole, moreMenuUtilityItems, secondaryNavItems]);

  /** Max icons on the mobile footer bar, including the More button when overflow exists. */
  const MOBILE_FOOTER_MAX_SLOTS = 5;

  const FOOTER_LEFT_PINNED_TAB_ID = 'dashboard';
  const FOOTER_CENTER_PINNED_TAB_ID = 'chat';
  const hasFooterCenterChat = navItems.some((item) => item.id === FOOTER_CENTER_PINNED_TAB_ID);

  /** Dashboard + slot-2 flank + Messages fixed in footer; slot 4 is dynamic. */
  const FOOTER_RESERVED_TAB_ID_SET = useMemo(() => {
    const ids = new Set([FOOTER_LEFT_PINNED_TAB_ID]);
    if (hasFooterCenterChat) ids.add(FOOTER_CENTER_PINNED_TAB_ID);
    return ids;
  }, [hasFooterCenterChat]);

  /** Swipe order: footer bar pages first, then More-menu pages (owner: Team → Offers → SCM → …). */
  const swipeNavOrderedItems = useMemo(() => {
    const seen = new Set();
    const items = [];
    const add = (item) => {
      if (!item || seen.has(item.id) || MOBILE_FOOTER_EXCLUDED_PAGE_IDS.has(item.id)) return;
      seen.add(item.id);
      items.push(item);
    };
    primaryNavItems.forEach(add);
    if (userRole === USER_ROLES.OWNER && footerMoreMenuItems?.length) {
      footerMoreMenuItems.forEach(add);
    } else {
      secondaryNavItems.forEach(add);
      moreMenuUtilityItems.forEach(add);
    }
    return items;
  }, [primaryNavItems, secondaryNavItems, footerMoreMenuItems, moreMenuUtilityItems, userRole]);

  /**
   * Footer: [Dashboard][fixed #2][Messages][dynamic #4][More]
   * Slots 1–3 stay fixed; only slot 4 updates while swiping (Reports → Team → …).
   */
  const {
    footerLeftPinnedTab,
    footerSlot2Fixed,
    footerSlot3Messages,
    footerSlot4Dynamic,
    mobileFooterCompactRow,
    mobileMoreItems,
    showMobileMoreFooter,
    useSuperadminMobileFooter,
  } = useMemo(() => {
    const ordered = swipeNavOrderedItems;

    /** Superadmin: pin Dashboard + Settings in footer; overflow goes to More */
    if (userRole === USER_ROLES.SUPERADMIN) {
      const pinnedStart = ordered.find((item) => item.id === 'dashboard') || null;
      const pinnedEnd = ordered.find((item) => item.id === 'settings') || null;
      const middle = ordered.filter((item) => item.id !== 'dashboard' && item.id !== 'settings');
      const slotsForMiddle = MOBILE_FOOTER_MAX_SLOTS - 2 - 1;
      const showMore = middle.length > slotsForMiddle;
      const middleInBar = showMore ? middle.slice(0, slotsForMiddle) : middle;
      const moreItems = showMore ? middle.slice(slotsForMiddle) : [];
      const barTabs = [pinnedStart, ...middleInBar, pinnedEnd].filter(Boolean);
      return {
        footerLeftPinnedTab: null,
        footerSlot2Fixed: null,
        footerSlot3Messages: null,
        footerSlot4Dynamic: null,
        mobileFooterCompactRow: barTabs,
        mobileMoreItems: moreItems,
        showMobileMoreFooter: showMore,
        useSuperadminMobileFooter: true,
      };
    }

    const isReserved = (id) => FOOTER_RESERVED_TAB_ID_SET.has(id);
    const leftPinned =
      ordered.find((item) => item.id === FOOTER_LEFT_PINNED_TAB_ID) || null;
    const messagesTab = hasFooterCenterChat
      ? ordered.find((item) => item.id === FOOTER_CENTER_PINNED_TAB_ID) || null
      : null;

    const primaryFlankItems = primaryNavItems.filter((item) => !isReserved(item.id));
    const slot2Fixed = primaryFlankItems[0] || null;
    const slot2Id = slot2Fixed?.id;

    const slot4Candidates = ordered.filter((item) => {
      if (item.id === FOOTER_LEFT_PINNED_TAB_ID) return false;
      if (slot2Id && item.id === slot2Id) return false;
      if (item.id === FOOTER_CENTER_PINNED_TAB_ID) return false;
      return true;
    });

    const defaultSlot4 =
      primaryFlankItems.length > 1
        ? primaryFlankItems[primaryFlankItems.length - 1]
        : slot4Candidates[0] || null;

    const currentItem = ordered.find((item) => item.id === currentPage) || null;
    const slot4Dynamic =
      currentItem && slot4Candidates.some((c) => c.id === currentItem.id)
        ? currentItem
        : defaultSlot4;

    const visibleIds = new Set([FOOTER_LEFT_PINNED_TAB_ID]);
    if (slot2Id) visibleIds.add(slot2Id);
    if (messagesTab) visibleIds.add(messagesTab.id);
    if (slot4Dynamic) visibleIds.add(slot4Dynamic.id);

    const moreItems = ordered.filter(
      (item) => !visibleIds.has(item.id) && !isReserved(item.id)
    );

    const compactRow = [leftPinned, slot2Fixed, messagesTab, slot4Dynamic].filter(Boolean);

    return {
      footerLeftPinnedTab: leftPinned,
      footerSlot2Fixed: slot2Fixed,
      footerSlot3Messages: messagesTab,
      footerSlot4Dynamic: slot4Dynamic,
      mobileFooterCompactRow: compactRow,
      mobileMoreItems: moreItems,
      showMobileMoreFooter: ordered.length > MOBILE_FOOTER_MAX_SLOTS,
      useSuperadminMobileFooter: false,
    };
  }, [
    swipeNavOrderedItems,
    primaryNavItems,
    currentPage,
    hasFooterCenterChat,
    FOOTER_RESERVED_TAB_ID_SET,
    userRole,
  ]);

  const mobileFooterSlotCount = useMemo(() => {
    if (showMobileMoreFooter) return MOBILE_FOOTER_MAX_SLOTS;
    return mobileFooterCompactRow.length || MOBILE_FOOTER_MAX_SLOTS;
  }, [showMobileMoreFooter, mobileFooterCompactRow.length]);

  const renderFooterTabButton = (item, { pinned = false, center = false, slotKey = 'tab' } = {}) => {
    if (!item) return <span key={`footer-gap-${slotKey}`} className="block min-w-0" aria-hidden />;
    const isActive = currentPage === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => navigateTo(item.id)}
        className={`app-mobile-tab-btn${pinned ? ' app-mobile-footer-pinned' : ''}${center ? ' app-mobile-footer-center' : ''} touch-manipulation flex h-full w-full items-center justify-center transition-colors ${isActive ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}
      >
        {isActive && <span className="app-mobile-tab-active-indicator" aria-hidden />}
        <div className={`relative rounded-lg p-1 ${isActive ? 'bg-indigo-500/10' : ''}`}>
          <item.icon className={`h-6 w-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
          {item.id === 'chat' && chatUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-inherit">
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </span>
          )}
        </div>
      </button>
    );
  };

  useEffect(() => {
    if (!showMobileMoreFooter) setShowMoreMenu(false);
  }, [showMobileMoreFooter]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => {
      const mobile = !mq.matches;
      setIsMobileViewport(mobile);
      if (!mobile) setShowMoreMenu(false);
    };
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const swipeablePageIds = useMemo(
    () => swipeNavOrderedItems.map((item) => item.id),
    [swipeNavOrderedItems]
  );

  const showAppUI = useMemo(
    () =>
      Boolean(currentUser) &&
      !mandateRestoreRequired &&
      !['resetPassword', 'staffSetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate', 'mandateRestore', 'renewSubscription'].includes(
        currentPage
      ),
    [currentUser, currentPage, mandateRestoreRequired]
  );

  const canSwipeNavigate = useCallback(
    (direction) => {
      if (direction === 'right') {
        if (backStackRef.current.length > 0) return true;
        const idx = swipeablePageIds.indexOf(currentPage);
        return idx > 0;
      }
      const idx = swipeablePageIds.indexOf(currentPage);
      return idx !== -1 && idx < swipeablePageIds.length - 1;
    },
    [swipeablePageIds, currentPage]
  );

  const handleSwipeNavigation = useCallback((direction) => {
    setShowMoreMenu(false);
    // Swipe right = back: prefer back stack (Profile → Dashboard, Settings child → Settings), else previous tab
    if (direction === 'right') {
      if (backStackRef.current.length > 0) {
        const backPage = backStackRef.current[backStackRef.current.length - 1];
        backStackRef.current = backStackRef.current.slice(0, -1);
        setSlideDirection('right');
        setCurrentPage(backPage);
        setTimeout(() => setSlideDirection(null), 320);
        return;
      }
      const idx = swipeablePageIds.indexOf(currentPage);
      if (idx > 0) {
        const prevId = swipeablePageIds[idx - 1];
        setSlideDirection('right');
        setCurrentPage(prevId);
        setTimeout(() => setSlideDirection(null), 320);
      }
      return;
    }
    // Swipe left = next tab only when on a tab
    const idx = swipeablePageIds.indexOf(currentPage);
    if (idx === -1) return;
    if (idx < swipeablePageIds.length - 1) {
      const nextId = swipeablePageIds[idx + 1];
      setSlideDirection('left');
      setCurrentPage(nextId);
      setTimeout(() => setSlideDirection(null), 320);
    }
  }, [swipeablePageIds, currentPage]);

  const handleTouchStart = useCallback((e) => {
    if (!isMobileViewport) return;
    chatThreadOpenAtTouchStartRef.current = isChatSelected;
    if (isChatSelected || (currentPage === 'chat' && Date.now() < pageSwipeSuppressUntilRef.current)) {
      return;
    }
    primeSwipeHaptic();
    const t = e.touches?.[0];
    if (t) {
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    }
  }, [isMobileViewport, isChatSelected, currentPage]);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!isMobileViewport) return;
      if (
        isChatSelected
        || chatThreadOpenAtTouchStartRef.current
        || Date.now() < pageSwipeSuppressUntilRef.current
      ) {
        chatThreadOpenAtTouchStartRef.current = false;
        return;
      }
      const t = e.changedTouches?.[0];
      if (!t) return;
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 50) return;
      const direction = dx < 0 ? 'left' : 'right';
      if (canSwipeNavigate(direction)) {
        // iOS: must run in same touchend turn, before setState
        pulseSwipePageHaptic();
      }
      handleSwipeNavigation(direction);
      chatThreadOpenAtTouchStartRef.current = false;
    },
    [isMobileViewport, isChatSelected, canSwipeNavigate, handleSwipeNavigation]
  );

  const suppressPageSwipeAfterChatThread = useCallback(() => {
    pageSwipeSuppressUntilRef.current = Date.now() + 480;
    chatThreadOpenAtTouchStartRef.current = false;
  }, []);

  /** Unlock swipe tick audio in installed PWA / iOS (first tap + after resume from background). */
  useEffect(() => {
    if (!showAppUI) return;
    const offWarmup = registerPwaSwipeHapticWarmup();
    const offLifecycle = registerPwaSwipeHapticLifecycle();
    return () => {
      offWarmup();
      offLifecycle();
    };
  }, [showAppUI]);

  /** Native passive listeners on main — reliable in installed PWA (full scroll area, iOS standalone). */
  useEffect(() => {
    if (!showAppUI || !isMobileViewport) return;
    const el = mainScrollRef.current;
    if (!el) return;

    const onStart = (e) => handleTouchStart(e);
    const onEnd = (e) => handleTouchEnd(e);

    const onCancel = (e) => handleTouchEnd(e);

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onCancel, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onCancel);
    };
  }, [showAppUI, isMobileViewport, currentPage, isChatSelected, handleTouchStart, handleTouchEnd]);

  useEffect(() => {
    const publicPages = ['staffSetPassword', 'resetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate', 'mandateRestore', 'renewSubscription'];
    if (publicPages.includes(currentPage)) return;
    if (!currentUser || userRole === USER_ROLES.OWNER || userRole === USER_ROLES.SUPERADMIN) return;
    if (!canAccessPage(currentPage)) {
      navigateTo('dashboard', { replace: true });
      showToast('Access restricted by owner permissions.', 'info');
    }
  }, [currentUser, userRole, currentPage, canAccessPage, navigateTo, showToast]);

  const handleBackToOrigin = () => {
    navigateTo(pageOrigin || 'dashboard', { replace: true });
    setPageOrigin('dashboard');
  };

  const renderContent = () => {
    // Render public pages immediately, even during auth loading
    if (currentPage === 'staffSetPassword') return <StaffSetPassword />;
    if (currentPage === 'resetPassword') return <ResetPassword />;
    if (currentPage === 'mandateRestore') {
      const token = new URLSearchParams(window.location.search || '').get('token') || '';
      return (
        <MandateRestorePage
          onBack={(dest) => {
            if (dest === 'login') {
              setIsViewingLogin(true);
              navigateTo('dashboard', { replace: true });
            } else {
              setPageOrigin(dest === 'support' ? 'landing' : 'landing');
              navigateTo(dest === 'support' ? 'support' : 'dashboard', { replace: true });
            }
          }}
          origin={pageOrigin}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          checkoutToken={token}
        />
      );
    }
    if (currentPage === 'renewSubscription') {
      const renewToken = new URLSearchParams(window.location.search || '').get('token') || '';
      return (
        <RenewSubscriptionPage
          checkoutToken={renewToken}
          onBack={(dest) => {
            if (dest === 'login') {
              setIsViewingLogin(true);
              navigateTo('dashboard', { replace: true });
            } else if (dest === 'mandateRestore') {
              setPageOrigin('login');
              navigateTo('mandateRestore', { replace: true });
            } else {
              setPageOrigin(dest === 'support' ? 'landing' : 'landing');
              navigateTo(dest === 'support' ? 'support' : 'dashboard', { replace: true });
            }
          }}
          origin={pageOrigin}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      );
    }

    if (isLoadingAuth) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loader className="animate-spin text-indigo-500" /></div>;
    if (currentPage === 'terms') return <TermsAndConditions onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} setDarkMode={setDarkMode} />;
    if (currentPage === 'policy') return <PrivacyPolicy onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} setDarkMode={setDarkMode} />;
    if (currentPage === 'support') return <SupportPage onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} setDarkMode={setDarkMode} />;
    if (currentPage === 'affiliate') return <AffiliatePage onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} setDarkMode={setDarkMode} />;
    if (currentPage === 'planUpgrade') {
      return (
        <PlanUpgrade
          apiClient={apiClient}
          showToast={showToast}
          currentUser={currentUser}
          onBack={handleBackToOrigin}
          darkMode={darkMode}
          onSubscriptionAccessEnded={handleSubscriptionAccessEnded}
        />
      );
    }
    if (currentPage === 'staffPermissions') {
      if (userRole !== USER_ROLES.OWNER && !canAccessPage('staffPermissions')) {
        return (
          <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
            <p className={`text-sm font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Team Management is not available for your role.</p>
          </div>
        );
      }
      return (
        <StaffPermissionsManager
          apiClient={apiClient}
          showToast={showToast}
          currentUser={currentUser}
          darkMode={darkMode}
          canAccessTeamManagement={userRole === USER_ROLES.OWNER || canAccessPage('staffPermissions')}
          onModalStateChange={setHasModalOpen}
          onUpgradePlan={() => { setPageOrigin('staffPermissions'); setCurrentPage('planUpgrade'); }}
          onOpenRolePermissions={() => { localStorage.setItem('settings_target_view', 'rolePermissions'); setPageOrigin('staffPermissions'); setCurrentPage('settings'); }}
        />
      );
    }
    if (currentPage === 'passwordChange') return <ChangePasswordForm apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={handleBackToOrigin} onLogout={logout} darkMode={darkMode} />;

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
          onBackToLogin={() => { setIsViewingLogin(true); backStackRef.current = []; setCurrentPage('dashboard'); }}
          onBackToPlans={() => { setIsViewingLogin(false); backStackRef.current = []; setCurrentPage('dashboard'); }}
          setCurrentPage={setCurrentPage}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      );
    }

    if (currentUser && mandateRestoreRequired && !isLoadingAuth) {
      return (
        <MandateRestorePage
          gateMode
          apiClient={apiClient}
          currentUser={currentUser}
          userRole={userRole}
          onAccessRestored={handleMandateAccessRestored}
          onLogout={logout}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
      );
    }

    if (!currentUser) {
      return isViewingLogin ?
        <Login 
                onLogin={handleLoginSuccess} 
                showToast={showToast} 
          setCurrentPage={setCurrentPage}
          setPageOrigin={setPageOrigin}
          onOpenRenewSubscription={() => openPublicPage('renewSubscription', { fromLogin: true })}
          onOpenMandateRestore={() => openPublicPage('mandateRestore', { fromLogin: true })}
          onLeaveLogin={() => setIsViewingLogin(false)}
                onBackToLanding={() => {
                    setSelectedPlan(null);
                    setCurrentPage('checkout');
                    setIsViewingLogin(false);
          }}
          onBackToLandingNormal={() => setIsViewingLogin(false)} 
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        /> :
            <LandingPage 
          onStartApp={() => {
            setIsViewingLogin(true);
            setScrollToPricing(false);
          }}
          scrollToPricing={scrollToPricing}
          onRenewSubscription={() => openPublicPage('renewSubscription')}
          onSelectPlan={(p) => {
            setSelectedPlan(p);
            setCurrentPage('checkout');
          }}
          onViewTerms={() => { setPageOrigin('landing'); setCurrentPage('terms'); }}
          onViewPolicy={() => { setPageOrigin('landing'); setCurrentPage('policy'); }}
          onViewSupport={() => { setPageOrigin('landing'); setCurrentPage('support'); }}
          onViewAffiliate={() => { setPageOrigin('landing'); setCurrentPage('affiliate'); }}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
    }
    
    const commonProps = {
      darkMode,
      currentUser,
      userRole,
      showToast,
      apiClient,
      API,
      onLogout: logout,
      notifications,
      setNotifications,
      setCurrentPage: navigateTo,
      unreadCount,
      setPageOrigin,
      currentOutlet,
      currentOutletId,
      onOutletSwitch: handleOutletSwitch,
      requestAttendanceDecision,
      onUserFieldsUpdated: mergeCurrentUserFields,
      canAccessPage,
    };

    const componentKey = `${currentPage}-${currentOutletId}`;

    return (
      <PageErrorBoundary darkMode={darkMode} key={`err-${componentKey}`}>
      <Suspense fallback={<PageRouteFallback page={currentPage} darkMode={darkMode} userRole={userRole} />}>
        {(() => {
          switch (currentPage) {
            case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard key={componentKey} {...commonProps} /> : <Dashboard key={componentKey} {...commonProps} currentPage={currentPage} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
            case 'billing': return <BillingPOS key={componentKey} {...commonProps} refreshRecentSalesRef={billingRefreshRef} />;
            case 'khata': return <Ledger key={componentKey} {...commonProps} onModalStateChange={setHasModalOpen} />;
            case 'inventory': return <InventoryManager key={componentKey} {...commonProps} initialSortOption={showLowStockFilter ? 'low-stock' : null} onSortOptionSet={() => setShowLowStockFilter(false)} onModalStateChange={setHasModalOpen} />;
            case 'scm': return <SupplyChainManagement key={componentKey} {...commonProps} onModalStateChange={setHasModalOpen} />;
            case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport key={componentKey} {...commonProps} /> : <Reports key={componentKey} {...commonProps} onOpenSalesHistory={handleViewAllSales} />;
            case 'notifications': return <NotificationsPage key={componentKey} {...commonProps} />;
            case 'settings':
              return userRole === USER_ROLES.SUPERADMIN
                ? <SuperAdminSettings key={componentKey} {...commonProps} setDarkMode={setDarkMode} />
                : <SettingsPage key={componentKey} {...commonProps} setDarkMode={setDarkMode} />;
            case 'profile': return <Profile key={componentKey} {...commonProps} currentOutletId={currentOutletId} onProfileUpdated={handleProfileUpdated} />;
            case 'superadmin_users': return <UserManagement key={componentKey} {...commonProps} />;
            case 'superadmin_systems': return <SystemConfig key={componentKey} {...commonProps} />;
            case 'outlets': return <OutletManager key={componentKey} {...commonProps} onOutletSwitch={handleOutletSwitch} currentOutletId={currentOutletId} onOutletsChange={fetchOutlets} openCreateBranchSignal={openCreateBranchSignal} />;
            case 'salesActivity': return <SalesActivityPage key={componentKey} {...commonProps} onBack={() => navigateTo('dashboard', { replace: true })} />;
            case 'offers': return <OffersManager key={componentKey} {...commonProps} />;
            case 'chat': return <Chat key={componentKey} {...commonProps} currentOutletId={currentOutletId} outlets={outlets} onModalStateChange={setHasModalOpen} onChatSelectionChange={setIsChatSelected} onThreadSwipeConsumed={suppressPageSwipeAfterChatThread} onUnreadCountChange={setChatUnreadCount} onNavigateToStaffPermissions={canAccessPage('staffPermissions') ? () => navigateTo('staffPermissions') : undefined} />;
            default: return <Dashboard key={componentKey} {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
          }
        })()}
      </Suspense>
      </PageErrorBoundary>
    );
  };

  // Reset chat selection state when leaving chat page
  useEffect(() => {
    if (currentPage !== 'chat') {
      setIsChatSelected(false);
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentPage === 'chat' && wasChatThreadOpenRef.current && !isChatSelected) {
      pageSwipeSuppressUntilRef.current = Date.now() + 480;
    }
    wasChatThreadOpenRef.current = currentPage === 'chat' && isChatSelected;
  }, [currentPage, isChatSelected]);

  // Typography mode: keep Dashboard styling as-is; normalize other pages.
  useEffect(() => {
    const className = 'app-non-dashboard';
    if (currentPage !== 'dashboard') {
      document.body.classList.add(className);
    } else {
      document.body.classList.remove(className);
    }
    return () => document.body.classList.remove(className);
  }, [currentPage]);

  const containerBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const sidebarBg = darkMode ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200';
  const navText = darkMode ? 'text-gray-500 hover:bg-gray-900 hover:text-gray-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <ApiProvider>
      <OfflineProvider isAuthenticated={Boolean(currentUser)}>
      {/* Scrollbar styles are now handled globally in index.css */}
      <SEO title={`${currentPage.toUpperCase()} | Pocket POS`} />
      <div
        data-theme={darkMode ? 'dark' : 'light'}
        className={`h-dvh min-h-dvh max-h-dvh w-full min-w-0 flex flex-col overflow-hidden overflow-x-hidden overscroll-none transition-colors duration-300 ${containerBg} ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}
      >
        <PwaUpdatePrompt />
        {showAppUI && !isChatSelected && (
            <Header
                companyName="Pocket POS"
            userRole={userRole.toUpperCase()} 
                setCurrentPage={navigateTo}
            currentPage={currentPage} 
            notifications={notifications} 
            unreadCount={unreadCount} 
                onLogout={logout}
                apiClient={apiClient}
                API={API}
                utilityNavItems={utilityNavItems}
            darkMode={darkMode}
            setDarkMode={setDarkMode}
            currentUser={currentUser}
            currentOutlet={currentOutlet}
            currentOutletId={currentOutletId}
            onOutletSwitch={handleOutletSwitch}
            showToast={showToast}
            hasModalOpen={hasModalOpen}
            outlets={outlets}
    onOpenAddBranchFromHub={() => {
              setOpenCreateBranchSignal((n) => n + 1);
              navigateTo('outlets');
            }}
            canAccessPage={canAccessPage}
          />
        )}
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
        {showAppUI && (
            <aside className={`hidden md:flex flex-col w-64 border-r z-[30] fixed inset-y-0 left-0 transition-colors duration-300 ${sidebarBg}`}>
              <div className="p-8 flex items-start gap-2">
                <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-900/50 shrink-0">
                  <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="font-black text-2xl tracking-tighter leading-tight">
                    <span className={darkMode ? 'text-white' : 'text-slate-900'}>POCKET</span> <span className="text-indigo-500">POS</span>
                  </div>
                  {(() => {
                    const listName = outlets?.find((o) => String(o._id) === String(currentOutletId))?.name;
                    const outletObjMatchesId =
                      currentOutlet &&
                      currentOutletId &&
                      String(currentOutlet._id) === String(currentOutletId);
                    const outletName = (
                      (outletObjMatchesId ? currentOutlet?.name : null) ||
                      listName ||
                      ''
                    ).trim();
                    const sidebarLabel = (isPremium && userRole === USER_ROLES.OWNER && outletName)
                      ? outletName
                      : (currentUser?.shopName || '').trim();
                    if (!sidebarLabel) return null;
                    return (
                      <p className={`header-outlet-subline text-[9px] font-black truncate ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} title={sidebarLabel}>
                        {sidebarLabel}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {isPremium && userRole === USER_ROLES.OWNER && (
                <div className="mb-4 flex flex-col gap-1.5 px-4">
                  <OutletSelector
                    apiClient={apiClient}
                    currentUser={currentUser}
                    currentOutletId={currentOutletId}
                    onOutletSwitch={handleOutletSwitch}
                    showToast={showToast}
                    darkMode={darkMode}
                  />
                  <button
                    type="button"
                    onClick={() => navigateTo('outlets')}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-bold tracking-tight transition-colors border ${
                      currentPage === 'outlets'
                        ? 'bg-indigo-600 text-white border-indigo-500/30 shadow-lg shadow-indigo-900/20'
                        : darkMode
                        ? 'bg-gray-800/90 text-gray-300 hover:bg-gray-700 border-gray-700/80'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                    }`}
                  >
                    Manage outlets
                  </button>
                </div>
              )}

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4 sidebar-scroll">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Main Menu</p>
                {/* Primary menu items (shown first) */}
                {primaryNavItems.map(item => (
                  <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : `border border-transparent ${navText}`}`}>
                    <item.icon className={`w-5 h-5 mr-3 transition-colors ${currentPage === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-500'}`} />
                    <span className="text-sm font-bold tracking-tight">{item.name}</span>
                    {item.id === 'chat' && chatUnreadCount > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-rose-900/40">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </button>
                ))}
                {/* Secondary menu items (shown after primary, if any) */}
                {secondaryNavItems.length > 0 && (
                  <>
                    {secondaryNavItems.map(item => (
                      <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : `border border-transparent ${navText}`}`}>
                        <item.icon className={`w-5 h-5 mr-3 transition-colors ${currentPage === item.id ? 'text-indigo-400' : 'group-hover:text-indigo-500'}`} />
                        <span className="text-sm font-bold tracking-tight">{item.name}</span>
                        {item.id === 'chat' && chatUnreadCount > 0 && (
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-rose-900/40">
                            {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                          </span>
                        )}
                      </button>
                    ))}
                  </>
                )}
                <div className={`pt-6 mt-6 border-t space-y-1.5 ${darkMode ? 'border-gray-900' : 'border-slate-100'}`}>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Account</p>
                            {utilityNavItems.map(item => (
                    <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative group ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : `border border-transparent ${navText}`}`}>
                                    <item.icon className="w-5 h-5 mr-3" />
                      <span className="text-sm font-bold tracking-tight">{item.name}</span>
                      {item.id === 'notifications' && unreadCount > 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-rose-900/40">
                          {unreadCount > 99 ? '99+' : unreadCount > 9 ? '9+' : unreadCount}
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
          <main
            ref={mainScrollRef}
            className={`flex-1 min-h-0 min-w-0 flex flex-col transition-all duration-300 overscroll-none ${containerBg} app-main-scroll ${showAppUI ? (isChatSelected ? 'md:ml-64 overflow-x-hidden overflow-y-hidden' : (currentPage === 'chat' ? 'md:ml-64 pt-[var(--app-mobile-header-offset)] max-md:pb-[var(--app-mobile-footer-bar)] md:pt-6 md:pb-6 overflow-x-hidden overflow-y-hidden' : 'md:ml-64 pt-[var(--app-mobile-header-offset)] max-md:pb-[var(--app-mobile-footer-bar)] md:pt-6 md:pb-6 overflow-x-hidden overflow-y-auto')) : 'w-full overflow-y-auto overflow-x-hidden custom-scrollbar'}`}
          >
            <div
              className={`${currentPage === 'chat' && isChatSelected ? 'h-full min-h-0 flex-1 overflow-hidden' : (currentPage === 'chat' ? 'h-full min-h-0 flex-1 overflow-hidden' : `max-w-7xl mx-auto w-full ${showAppUI ? 'flex-1 min-h-0 flex flex-col' : 'min-h-0'}`)} ${currentPage === 'chat' ? 'px-0' : 'px-0 md:px-6'} ${showAppUI ? 'overflow-x-hidden' : ''}`}
            >
              <div
                className={`${
                  slideDirection === 'left'
                    ? 'page-slide-from-right'
                    : slideDirection === 'right'
                      ? 'page-slide-from-left'
                      : ''
                } ${
                  showAppUI && currentPage === 'chat'
                    ? 'h-full flex-1 min-h-0 flex flex-col'
                    : showAppUI && currentPage !== 'chat' && !isChatSelected
                      ? 'h-full flex-1 min-h-0 flex flex-col'
                      : ''
                }`}
              >
                {renderContent()}
              </div>
            </div>
        </main>
        </div>
        {showAppUI && !isChatSelected && isMobileViewport && (
          <>
            <nav
              aria-label="Main navigation"
              className={`app-mobile-tab-bar flex z-[50] border-t shadow-[0_-8px_20px_rgba(0,0,0,0.25)] overscroll-none ${hasModalOpen ? 'pointer-events-none' : ''} ${darkMode ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200'}`}
            >
              {hasModalOpen && (
                <div
                  className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md"
                  style={{ WebkitBackdropFilter: 'blur(12px)' }}
                  aria-hidden
                />
              )}
              <div
                className={`app-mobile-tab-bar-inner px-2 relative ${hasModalOpen ? 'opacity-30' : ''}`}
                style={{
                  gridTemplateColumns: `repeat(${
                    Math.max(
                      !showMoreMenu ? mobileFooterSlotCount : mobileMoreItems.length > 0 ? 1 : 0,
                      1
                    )
                  }, minmax(0, 1fr))`,
                }}
              >
              {!showMoreMenu && mobileFooterSlotCount > 0 && (
                useSuperadminMobileFooter ? (
                  mobileFooterCompactRow.map((item) =>
                    renderFooterTabButton(item, { slotKey: item.id })
                  )
                ) : (
                  <>
                    {renderFooterTabButton(footerLeftPinnedTab, { pinned: true, slotKey: 'dash' })}
                    {renderFooterTabButton(footerSlot2Fixed, { pinned: true, slotKey: 's2' })}
                    {hasFooterCenterChat &&
                      renderFooterTabButton(footerSlot3Messages, {
                        pinned: true,
                        center: true,
                        slotKey: 'chat',
                      })}
                    {renderFooterTabButton(footerSlot4Dynamic, { slotKey: 's4' })}
                  </>
                )
              )}
              {showMobileMoreFooter && (
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  aria-label={showMoreMenu ? 'Close more menu' : 'More pages'}
                  className={`app-mobile-tab-btn touch-manipulation flex h-full w-full items-center justify-center transition-colors ${showMoreMenu ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}
                >
                  {showMoreMenu && (
                    <span className="app-mobile-tab-active-indicator" aria-hidden />
                  )}
                  <div className={`relative rounded-lg p-1 ${showMoreMenu ? 'bg-indigo-500/10' : ''}`}>
                    <MoreHorizontal className={`h-6 w-6 ${showMoreMenu ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  </div>
                </button>
              )}
              </div>
            </nav>

            {/* More Menu Modal */}
            {showMoreMenu && (
              <div className="app-mobile-more-menu fixed inset-0 z-[60]" onClick={() => setShowMoreMenu(false)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div 
                  className={`fixed bottom-0 left-0 right-0 rounded-t-2xl rounded-b-none border-t border-l border-r shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[100dvh] overflow-y-auto custom-scrollbar pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}
                  style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>More Options</h3>
                      <button onClick={() => setShowMoreMenu(false)} className="p-2 hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div className="px-2 pt-2 pb-2">
                    {/* Owner: Team management, Inventory, Billing, [Supply Chain], Settings. Others: utility then secondary */}
                    {mobileMoreItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            navigateTo(item.id);
                            setShowMoreMenu(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 last:mb-0 relative ${
                            currentPage === item.id
                              ? darkMode ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                              : darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-sm font-bold">{item.name}</span>
                          {item.id === 'chat' && chatUnreadCount > 0 && (
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-lg shadow-rose-900/40">
                              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </OfflineProvider>
    </ApiProvider>
  );
};

export default App;