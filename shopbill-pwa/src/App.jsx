import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  ShoppingCart, CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, RefreshCw, X, FileText, Truck, Sun, Moon, LayoutGrid, Store, ChevronDown, PlusCircle, Settings2, MessageCircle, MoreHorizontal
} from 'lucide-react';
import { io } from 'socket.io-client';

// Core Component Imports
import API, { SOCKET_URL, SOCKET_IO_CLIENT_BASE } from './config/api';
import apiClient from './lib/apiClient';
import { ApiProvider } from './contexts/ApiContext';
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
const Chat = lazy(() => import('./components/Chat'));

/** Used to avoid reloading on first SW install: controllerchange also fires when the page gets its first controlling worker. */
const SW_CONTROLLER_URL_KEY = 'pocketpos_sw_controller_url';
const normalizeSwScriptUrl = (url) => (url || '').split('?')[0];

const UpdatePrompt = () => {
  const [show, setShow] = useState(false);
  const [registration, setRegistration] = useState(null);
  const updateHandlerRef = useRef(null);
  const pendingVersionRef = useRef(null);
  const checkIntervalRef = useRef(null);

  // Generate a stable version ID from service worker script URL
  const getVersionId = (sw) => {
    if (!sw) return null;
    // Use the script URL as version identifier (it includes hash in production)
    // Extract hash from URL if present, otherwise use full URL
    const url = sw.scriptURL || sw.scope || '';
    // Remove query params and get the base URL with hash
    const baseUrl = url.split('?')[0];
    return baseUrl;
  };

  // Check for waiting service worker and show update prompt
  const checkForUpdate = useCallback(async (forceCheck = false) => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      // Get current active version
      const currentVersion = reg.active ? getVersionId(reg.active) : null;
      if (currentVersion) {
        // Store current active version so we know what's already installed
        localStorage.setItem('pwa_current_version', currentVersion);
      }

      // Force update check by calling update()
      if (forceCheck) {
        try {
          await reg.update();
        } catch (err) {
          console.warn('Service worker update check failed:', err);
        }
      }

      // Check if there's a waiting worker
      if (reg.waiting) {
        const waitingVersionId = getVersionId(reg.waiting);
        if (!waitingVersionId) return;

        // Get the current active version
        const currentActiveVersion = getVersionId(reg.active);

        // Show update prompt whenever there's a waiting worker that's different from active
        // This ensures users are prompted for every new production build
        if (waitingVersionId !== currentActiveVersion) {
          pendingVersionRef.current = waitingVersionId;
          setRegistration(reg);
          setShow(true);
          return true; // Update available
        }
      }

      // Also check for installing worker (might become waiting soon)
      if (reg.installing) {
        reg.installing.addEventListener('statechange', () => {
          if (reg.installing?.state === 'installed' && reg.waiting) {
            checkForUpdate(false);
          }
        });
      }
    } catch (error) {
      console.error('Error checking for service worker update:', error);
    }

    return false;
  }, []);

  useEffect(() => {
    const onUpdate = async (e) => {
      const updateHandler = e.detail?.updateHandler;
      if (updateHandler) {
        updateHandlerRef.current = updateHandler;
      }
      // Check for waiting worker when update event fires
      await checkForUpdate(false);
    };

    // Listen for the update event
    window.addEventListener('pwa-update-available', onUpdate);

    // Initial check after a delay to ensure service worker is registered
    const initialCheck = setTimeout(() => {
      checkForUpdate(true); // Force update check on mount
    }, 2000);

    // Periodic update checks every 5 minutes for lower overhead.
    checkIntervalRef.current = setInterval(() => {
      checkForUpdate(true);
    }, 5 * 60 * 1000);

    // Check for updates when page becomes visible (user returns to tab/app)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Align stored URL with whoever is already controlling (e.g. after a reload or fast activation).
    try {
      const c = navigator.serviceWorker?.controller;
      if (c?.scriptURL) {
        sessionStorage.setItem(SW_CONTROLLER_URL_KEY, normalizeSwScriptUrl(c.scriptURL));
      }
    } catch {
      /* private mode */
    }

    // Reload only when the controlling worker *replaces* a previous one (real update), not on first claim.
    const handleControllerChange = () => {
      const c = navigator.serviceWorker.controller;
      if (!c?.scriptURL) return;
      const url = normalizeSwScriptUrl(c.scriptURL);
      let prev = null;
      try {
        prev = sessionStorage.getItem(SW_CONTROLLER_URL_KEY);
      } catch {
        /* private mode */
      }
      try {
        sessionStorage.setItem(SW_CONTROLLER_URL_KEY, url);
      } catch {
        /* private mode */
      }
      if (prev && prev !== url) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('pwa-update-available', onUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      clearTimeout(initialCheck);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [checkForUpdate]);

  const handleUpdate = async () => {
    try {
      if (registration && registration.waiting) {
        const versionId = pendingVersionRef.current || getVersionId(registration.waiting);
        // Tell the waiting worker to skipWaiting
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        // Hide the prompt immediately
        setShow(false);
        
        // Wait for the new service worker to activate
        let activated = false;
        const stateChangeHandler = (e) => {
          if (e.target.state === 'activated') {
            activated = true;
            registration.waiting.removeEventListener('statechange', stateChangeHandler);
            // Update current version in localStorage for tracking
            const newVersion = getVersionId(e.target);
            if (newVersion) {
              localStorage.setItem('pwa_current_version', newVersion);
            }
            // Clear all caches before reload
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              }).finally(() => {
                window.location.reload(true); // Force reload from server
              });
            } else {
              window.location.reload(true);
            }
          }
        };
        
        registration.waiting.addEventListener('statechange', stateChangeHandler);
        
        // Fallback reload if statechange doesn't fire within 2 seconds
        setTimeout(() => {
          if (!activated) {
            registration.waiting.removeEventListener('statechange', stateChangeHandler);
            // Update current version
            const newVersion = getVersionId(registration.waiting);
            if (newVersion) {
              localStorage.setItem('pwa_current_version', newVersion);
            }
            // Clear caches and reload
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
              }).finally(() => {
                window.location.reload(true);
              });
            } else {
              window.location.reload(true);
            }
          }
        }, 2000);
      } else if (updateHandlerRef.current) {
        // Use the update handler if available
        updateHandlerRef.current();
        setShow(false);
        // Reload after a short delay
        setTimeout(() => {
          window.location.reload(true);
        }, 500);
      }
    } catch (error) {
      console.error('Error during update:', error);
      // Fallback: just reload
      window.location.reload(true);
    }
  };

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-950/95 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
      // Prevent closing by clicking outside
      onClick={(e) => e.stopPropagation()}
    >
      <div 
        className="max-w-sm w-full bg-indigo-600 text-white p-6 rounded-2xl shadow-2xl border border-indigo-400 animate-in fade-in zoom-in duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="bg-indigo-500 p-4 rounded-full mb-4 shadow-inner">
            <RefreshCw className="w-8 h-8 animate-spin text-white" />
          </div>
          <h4 className="font-extrabold text-2xl leading-tight">System Update Required</h4>
          <p className="text-indigo-100 mt-2 text-sm">A new version is available. You must update to continue using the application.</p>
          <div className="w-full mt-6 space-y-3">
            <button
              onClick={handleUpdate}
              className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all active:scale-95 shadow-xl"
            >
              Update Now
            </button>
            <button
              onClick={async () => {
                // Clear all caches and reload
                if ('caches' in window) {
                  try {
                    const cacheNames = await caches.keys();
                    await Promise.all(cacheNames.map(name => caches.delete(name)));
                  } catch (err) {
                    console.error('Error clearing caches:', err);
                  }
                }
                // Force reload from server
                window.location.reload(true);
              }}
              className="w-full py-2 text-indigo-100 text-sm hover:text-white transition-colors underline"
            >
              Clear Cache & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

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
    { id: 'superadmin_systems', name: 'System Config', icon: Settings, roles: [USER_ROLES.SUPERADMIN] },
    { id: 'reports', name: 'Global Reports', icon: TrendingUp, roles: [USER_ROLES.SUPERADMIN] },
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
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [notifications, setNotifications] = useState([]);
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
  const [showStaffPunchPrompt, setShowStaffPunchPrompt] = useState(false);
  const [hasStaffPunchedIn, setHasStaffPunchedIn] = useState(false);
  const [hasResolvedAttendanceStatus, setHasResolvedAttendanceStatus] = useState(false);
  const [isPromptPunchingIn, setIsPromptPunchingIn] = useState(false);
  const pendingActionRef = useRef(null);
  const pendingAttendancePromptResolveRef = useRef(null);
  const isStaffUserRef = useRef(false);
  const hasStaffPunchedInRef = useRef(false);
  const hasResolvedAttendanceStatusRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });
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
  const isStaffUser = userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.CASHIER;
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

  useEffect(() => {
    isStaffUserRef.current = isStaffUser;
    hasStaffPunchedInRef.current = hasStaffPunchedIn;
    hasResolvedAttendanceStatusRef.current = hasResolvedAttendanceStatus;
  }, [isStaffUser, hasStaffPunchedIn, hasResolvedAttendanceStatus]);

  useEffect(() => {
    let cancelled = false;
    const syncAttendanceStatus = async () => {
      if (!isStaffUser || !currentUser || !apiClient || !API?.attendanceCurrent) {
        if (!cancelled) {
          setHasStaffPunchedIn(false);
          setHasResolvedAttendanceStatus(true);
        }
        return;
      }
      let requestCancelled = false;
      try {
        const response = await apiClient.get(API.attendanceCurrent, {
          headers: { 'x-skip-attendance-prompt': '1' }
        });
        const attendance = response?.data?.attendance;
        const isActive = !!attendance && attendance.status === 'active' && !attendance.punchOut;
        if (!cancelled) {
          setHasStaffPunchedIn(isActive);
          if (isActive) {
            setShowStaffPunchPrompt(false);
            if (pendingActionRef.current?.resolve) {
              pendingActionRef.current.resolve(pendingActionRef.current.config);
            }
            pendingActionRef.current = null;
            if (pendingAttendancePromptResolveRef.current) {
              pendingAttendancePromptResolveRef.current(true);
              pendingAttendancePromptResolveRef.current = null;
            }
          }
        }
      } catch (error) {
        const isRequestCancelled = error?.cancelled || error?.message?.includes?.('cancelled');
        if (isRequestCancelled) {
          requestCancelled = true;
          return;
        }
        if (!cancelled) {
          // Preserve previous status on transient API failures; avoid false re-prompt conflicts.
          console.warn('Attendance status sync failed, keeping previous punch-in state.');
        }
      } finally {
        if (!cancelled && !requestCancelled) {
          setHasResolvedAttendanceStatus(true);
        }
      }
    };
    syncAttendanceStatus();
    return () => {
      cancelled = true;
    };
  }, [isStaffUser, currentUser?._id, currentOutletId, apiClient, API]);

  useEffect(() => {
    if (!apiClient?.interceptors?.request) return undefined;
    const interceptorId = apiClient.interceptors.request.use((config) => {
      const method = String(config?.method || 'get').toLowerCase();
      const isMutation = ['post', 'put', 'patch', 'delete'].includes(method);
      if (!isMutation) return config;

      const url = String(config?.url || '').toLowerCase();
      const isAttendanceApi = url.includes('/attendance/');
      const isPushDeviceTokenApi = url.includes('/user/device-token');
      const isBypass = config?.headers?.['x-skip-attendance-prompt'] === '1';
      if (isAttendanceApi || isPushDeviceTokenApi || isBypass) return config;
      if (!isStaffUserRef.current || hasStaffPunchedInRef.current) return config;
      if (!hasResolvedAttendanceStatusRef.current) return config;

      return new Promise((resolve, reject) => {
        pendingActionRef.current = { resolve, reject, config };
        setShowStaffPunchPrompt(true);
      });
    });

    return () => {
      apiClient.interceptors.request.eject(interceptorId);
    };
  }, [apiClient]);

  // Navigate and push current page to back stack (so swipe-back can return). Use opts.replace to clear stack (e.g. logout, back-to-origin).
  const navigateTo = useCallback((page, opts) => {
    const publicIds = new Set(['staffSetPassword', 'resetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate']);
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
    if (opts?.replace) backStackRef.current = [];
    if (page !== currentPage) {
      if (!opts?.replace) backStackRef.current = [...backStackRef.current, currentPage];
      setCurrentPage(page);
    }
  }, [currentPage, currentUser, userRole, rolePagePermissions, canAccessPage, showToast]);

  const handleStaffPromptSkip = useCallback(() => {
    setShowStaffPunchPrompt(false);
    if (pendingActionRef.current?.resolve) {
      pendingActionRef.current.resolve(pendingActionRef.current.config);
    }
    pendingActionRef.current = null;
    if (pendingAttendancePromptResolveRef.current) {
      pendingAttendancePromptResolveRef.current(true);
      pendingAttendancePromptResolveRef.current = null;
    }
  }, []);

  const handleStaffPromptPunchIn = useCallback(async () => {
    if (!apiClient || !API?.attendancePunchIn || isPromptPunchingIn) return;
    try {
      setIsPromptPunchingIn(true);
      // Close immediately on tap for better UX.
      setShowStaffPunchPrompt(false);
      const now = new Date();
      const localDateString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const timezoneOffset = now.getTimezoneOffset();
      await apiClient.post(API.attendancePunchIn, {
        localDate: localDateString,
        timezoneOffset,
        clientTime: now.toISOString(),
      }, { headers: { 'x-skip-attendance-prompt': '1' } });
      showToast('Punched in successfully!', 'success');
      setHasStaffPunchedIn(true);
      setHasResolvedAttendanceStatus(true);
      setShowStaffPunchPrompt(false);
      if (pendingActionRef.current?.resolve) {
        pendingActionRef.current.resolve(pendingActionRef.current.config);
      }
      pendingActionRef.current = null;
      if (pendingAttendancePromptResolveRef.current) {
        pendingAttendancePromptResolveRef.current(true);
        pendingAttendancePromptResolveRef.current = null;
      }
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Unable to punch in now';
      showToast(message, 'error');
      setShowStaffPunchPrompt(true);
    } finally {
      setIsPromptPunchingIn(false);
    }
  }, [apiClient, API, isPromptPunchingIn, showToast]);

  const requestAttendanceDecision = useCallback(() => {
    const shouldPrompt = isStaffUserRef.current && !hasStaffPunchedInRef.current && hasResolvedAttendanceStatusRef.current;
    if (!shouldPrompt) return Promise.resolve(true);

    return new Promise((resolve) => {
      pendingAttendancePromptResolveRef.current = resolve;
      setShowStaffPunchPrompt(true);
    });
  }, []);

  useEffect(() => {
    setHasStaffPunchedIn(false);
    setHasResolvedAttendanceStatus(false);
    setShowStaffPunchPrompt(false);
    setIsPromptPunchingIn(false);
    if (pendingActionRef.current?.reject) {
      const err = new Error('Attendance prompt reset');
      err.cancelled = true;
      pendingActionRef.current.reject(err);
    }
    pendingActionRef.current = null;
    if (pendingAttendancePromptResolveRef.current) {
      pendingAttendancePromptResolveRef.current(false);
      pendingAttendancePromptResolveRef.current = null;
    }
  }, [currentUser?._id]);

  const handleViewAllSales = useCallback(() => navigateTo('salesActivity'), [navigateTo]);
  const handleViewAllCredit = useCallback(() => navigateTo('khata'), [navigateTo]);
  const [showLowStockFilter, setShowLowStockFilter] = useState(false);
  const handleViewAllInventory = useCallback(() => {
    setShowLowStockFilter(true);
    navigateTo('inventory');
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
        navigateTo('inventory');
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

  const handleProfileUpdated = useCallback((updatedData) => {
    if (!updatedData) return;
    const normalizedUpdate = updatedData?.user || updatedData?.data || updatedData;
    setCurrentUser((prevUser) => {
      const mergedUser = { ...(prevUser || {}), ...normalizedUpdate };
      localStorage.setItem('currentUser', JSON.stringify(mergedUser));
      return mergedUser;
    });
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

  useEffect(() => {
    // Check if we're on a public page that doesn't require auth
    const publicPages = ['staffSetPassword', 'resetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'];
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

    // Basic plan manager: footer only Dashboard, Inventory, Ledger, Billing (settings/profile/notifications in header)
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

  /** Notifications & Profile are in the header — omit from mobile footer / More menu for every role. */
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

  /** More sheet order: Team Management first when present; Settings last. */
  const sortMobileMoreMenuItems = (items) => {
    if (!items?.length) return items;
    const team = items.find((item) => item.id === 'staffPermissions');
    if (!team) return items;
    const rest = items.filter((item) => item.id !== 'staffPermissions');
    const settings = rest.find((item) => item.id === 'settings');
    const middle = rest.filter((item) => item.id !== 'settings');
    return settings ? [team, ...middle, settings] : [team, ...middle];
  };

  // Mobile footer: ≤5 destinations = all on bar (no More); >5 = 4 on bar + More (5 slots total)
  const mobileFooterPool = useMemo(() => {
    const seen = new Set();
    const pool = [];
    const add = (item) => {
      if (!item || seen.has(item.id) || MOBILE_FOOTER_EXCLUDED_PAGE_IDS.has(item.id)) return;
      seen.add(item.id);
      pool.push(item);
    };
    primaryNavItems.forEach(add);
    secondaryNavItems.forEach(add);
    if (userRole === USER_ROLES.OWNER && footerMoreMenuItems) {
      footerMoreMenuItems.forEach(add);
    } else {
      moreMenuUtilityItems.forEach(add);
    }
    return pool;
  }, [primaryNavItems, secondaryNavItems, footerMoreMenuItems, moreMenuUtilityItems, userRole]);

  const { mobileFooterTabs, mobileMoreItems } = useMemo(() => {
    const pool = mobileFooterPool;
    if (pool.length <= MOBILE_FOOTER_MAX_SLOTS) {
      return { mobileFooterTabs: pool, mobileMoreItems: [] };
    }
    const barTabCount = MOBILE_FOOTER_MAX_SLOTS - 1; // reserve one slot for More
    let bar = pool.slice(0, barTabCount);
    let more = pool.slice(barTabCount);
    const chatInMoreIdx = more.findIndex((item) => item.id === 'chat');
    if (chatInMoreIdx !== -1) {
      const chatItem = more[chatInMoreIdx];
      more = more.filter((_, i) => i !== chatInMoreIdx);
      const displaced = bar[bar.length - 1];
      bar = [...bar.slice(0, -1), chatItem];
      if (displaced) more = [displaced, ...more];
    }
    return { mobileFooterTabs: bar, mobileMoreItems: sortMobileMoreMenuItems(more) };
  }, [mobileFooterPool]);

  useEffect(() => {
    if (mobileMoreItems.length === 0) setShowMoreMenu(false);
  }, [mobileMoreItems.length]);

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

  const swipeablePageIds = useMemo(() => mobileFooterPool.map((item) => item.id), [mobileFooterPool]);

  const showAppUI = useMemo(
    () =>
      Boolean(currentUser) &&
      !['resetPassword', 'staffSetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'].includes(
        currentPage
      ),
    [currentUser, currentPage]
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
    primeSwipeHaptic();
    const t = e.touches?.[0];
    if (t) {
      touchStartRef.current = { x: t.clientX, y: t.clientY };
    }
  }, [isMobileViewport]);

  const handleTouchEnd = useCallback(
    (e) => {
      if (!isMobileViewport) return;
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
    },
    [isMobileViewport, canSwipeNavigate, handleSwipeNavigation]
  );

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
    if (!showAppUI || !isMobileViewport || currentPage === 'chat') return;
    const el = mainScrollRef.current;
    if (!el) return;

    const onStart = (e) => handleTouchStart(e);
    const onEnd = (e) => handleTouchEnd(e);

    const onCancel = (e) => handleTouchEnd(e);

    el.addEventListener('touchstart', onStart, { capture: true, passive: true });
    el.addEventListener('touchend', onEnd, { capture: true, passive: true });
    el.addEventListener('touchcancel', onCancel, { capture: true, passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart, true);
      el.removeEventListener('touchend', onEnd, true);
      el.removeEventListener('touchcancel', onCancel, true);
    };
  }, [showAppUI, isMobileViewport, currentPage, handleTouchStart, handleTouchEnd]);

  useEffect(() => {
    const publicPages = ['staffSetPassword', 'resetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'];
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
    
    if (isLoadingAuth) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loader className="animate-spin text-indigo-500" /></div>;
    if (currentPage === 'terms') return <TermsAndConditions onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} />;
    if (currentPage === 'policy') return <PrivacyPolicy onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} />;
    if (currentPage === 'support') return <SupportPage onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} />;
    if (currentPage === 'affiliate') return <AffiliatePage onBack={handleBackToOrigin} origin={pageOrigin} darkMode={darkMode} />;
    if (currentPage === 'planUpgrade') return <PlanUpgrade apiClient={apiClient} showToast={showToast} currentUser={currentUser} onBack={handleBackToOrigin} darkMode={darkMode} />;
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
                    setSelectedPlan(null);
                    setCurrentPage('checkout');
                    setIsViewingLogin(false);
          }}
          onBackToLandingNormal={() => setIsViewingLogin(false)} 
          darkMode={darkMode}
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
          darkMode={darkMode}
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
      <Suspense fallback={null}>
        {(() => {
          switch (currentPage) {
            case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard key={componentKey} {...commonProps} /> : <Dashboard key={componentKey} {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
            case 'billing': return <BillingPOS key={componentKey} {...commonProps} refreshRecentSalesRef={billingRefreshRef} />;
            case 'khata': return <Ledger key={componentKey} {...commonProps} onModalStateChange={setHasModalOpen} />;
            case 'inventory': return <InventoryManager key={componentKey} {...commonProps} initialSortOption={showLowStockFilter ? 'low-stock' : null} onSortOptionSet={() => setShowLowStockFilter(false)} />;
            case 'scm': return <SupplyChainManagement key={componentKey} {...commonProps} />;
            case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport key={componentKey} {...commonProps} /> : <Reports key={componentKey} {...commonProps} onOpenSalesHistory={handleViewAllSales} />;
            case 'notifications': return <NotificationsPage key={componentKey} {...commonProps} />;
            case 'settings': return <SettingsPage key={componentKey} {...commonProps} setDarkMode={setDarkMode} />;
            case 'profile': return <Profile key={componentKey} {...commonProps} currentOutletId={currentOutletId} onProfileUpdated={handleProfileUpdated} />;
            case 'superadmin_users': return <UserManagement key={componentKey} {...commonProps} />;
            case 'superadmin_systems': return <SystemConfig key={componentKey} {...commonProps} />;
            case 'outlets': return <OutletManager key={componentKey} {...commonProps} onOutletSwitch={handleOutletSwitch} currentOutletId={currentOutletId} onOutletsChange={fetchOutlets} openCreateBranchSignal={openCreateBranchSignal} />;
            case 'salesActivity': return <SalesActivityPage key={componentKey} {...commonProps} onBack={() => navigateTo('dashboard', { replace: true })} />;
            case 'offers': return <OffersManager key={componentKey} {...commonProps} />;
            case 'chat': return <Chat key={componentKey} {...commonProps} currentOutletId={currentOutletId} outlets={outlets} onChatSelectionChange={setIsChatSelected} onUnreadCountChange={setChatUnreadCount} onNavigateToStaffPermissions={canAccessPage('staffPermissions') ? () => navigateTo('staffPermissions') : undefined} />;
            default: return <Dashboard key={componentKey} {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
          }
        })()}
      </Suspense>
    );
  };

  // Reset chat selection state when leaving chat page
  useEffect(() => {
    if (currentPage !== 'chat') {
      setIsChatSelected(false);
    }
  }, [currentPage]);

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
      {/* Scrollbar styles are now handled globally in index.css */}
      <SEO title={`${currentPage.toUpperCase()} | Pocket POS`} />
      <div
        className={`h-dvh min-h-dvh max-h-dvh w-full min-w-0 flex flex-col overflow-hidden overflow-x-hidden overscroll-none transition-colors duration-300 ${containerBg} ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}
      >
        <UpdatePrompt />
        {showAppUI && showStaffPunchPrompt && isStaffUser && (
          <div className="fixed inset-0 z-[220] bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className={`w-full max-w-md rounded-2xl border p-5 ${darkMode ? 'bg-gray-950 border-gray-800' : 'bg-white border-slate-200 shadow-2xl'}`}>
              <h3 className="text-base font-black tracking-tight">Punch in before continuing?</h3>
              <p className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                You can punch in now, or skip and continue.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={handleStaffPromptSkip}
                  className={`py-2.5 rounded-xl text-xs font-black tracking-wider border transition-all ${
                    darkMode ? 'bg-gray-900 border-gray-700 text-gray-300 hover:bg-gray-800' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Skip
                </button>
                <button
                  onClick={handleStaffPromptPunchIn}
                  disabled={isPromptPunchingIn}
                  className="py-2.5 rounded-xl text-xs font-black tracking-wider bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isPromptPunchingIn ? <Loader className="w-4 h-4 animate-spin" /> : null}
                  {isPromptPunchingIn ? 'Punching...' : 'Punch In'}
                </button>
              </div>
            </div>
          </div>
        )}
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
              className={`app-mobile-tab-bar flex z-[50] border-t shadow-[0_-8px_20px_rgba(0,0,0,0.25)] overscroll-none ${darkMode ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200'}`}
            >
              <div className="app-mobile-tab-bar-inner px-1">
              {!showMoreMenu && mobileFooterTabs.map((item) => (
                <button key={item.id} type="button" onClick={() => navigateTo(item.id)} className={`touch-manipulation relative flex h-full min-w-0 max-w-[5.5rem] flex-1 items-center justify-center transition-colors ${currentPage === item.id ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}>
                  {currentPage === item.id && <span className="absolute top-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-indigo-500" aria-hidden />}
                  <div className={`relative rounded-lg p-1 ${currentPage === item.id ? 'bg-indigo-500/10' : ''}`}>
                    <item.icon className={`h-6 w-6 ${currentPage === item.id ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    {item.id === 'chat' && chatUnreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-inherit">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {mobileMoreItems.length > 0 && (
                <button 
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)} 
                  aria-label={showMoreMenu ? 'Close more menu' : 'More pages'}
                  className={`touch-manipulation relative flex h-full min-w-0 max-w-[5.5rem] flex-1 items-center justify-center transition-colors ${showMoreMenu || mobileMoreItems.some((item) => currentPage === item.id) ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}
                >
                  {(showMoreMenu || mobileMoreItems.some((item) => currentPage === item.id)) && <span className="absolute top-0 left-1/2 h-0.5 w-7 -translate-x-1/2 rounded-full bg-indigo-500" aria-hidden />}
                  <div className={`relative rounded-lg p-1 ${showMoreMenu || mobileMoreItems.some((item) => currentPage === item.id) ? 'bg-indigo-500/10' : ''}`}>
                    <MoreHorizontal className={`h-6 w-6 ${showMoreMenu || mobileMoreItems.some((item) => currentPage === item.id) ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                    {chatUnreadCount > 0 && mobileMoreItems.some(item => item.id === 'chat') && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-inherit">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
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
    </ApiProvider>
  );
};

export default App;