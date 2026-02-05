import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import {
  ShoppingCart, CreditCard, Home, Package, Barcode, Loader, TrendingUp, User, Settings, LogOut, Bell, Smartphone, Users, RefreshCw, X, FileText, Truck, Sun, Moon, LayoutGrid, Store, ChevronDown, PlusCircle, Settings2, MessageCircle, MoreHorizontal
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
import OutletManager from './components/OutletManager';
import OutletSelector from './components/OutletSelector';

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
const Chat = lazy(() => import('./components/Chat'));

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

        // Get the last updated version from localStorage
        const lastUpdatedVersion = localStorage.getItem('pwa_updated_version');
        const currentActiveVersion = localStorage.getItem('pwa_current_version');

        // Only show update prompt if:
        // 1. This is a NEW version (different from what we've already updated to)
        // 2. The waiting version is different from the current active version
        const isNewVersion = waitingVersionId !== lastUpdatedVersion && 
                             waitingVersionId !== currentActiveVersion;

        if (isNewVersion) {
          console.log(`📢 New update available: ${waitingVersionId} (current: ${currentActiveVersion}, last updated: ${lastUpdatedVersion})`);
          pendingVersionRef.current = waitingVersionId;
          setRegistration(reg);
          setShow(true);
          return true; // Update available
        } else {
          console.log(`✅ Update already handled for version: ${waitingVersionId}`);
          // If this version was already updated, activate it silently
          if (waitingVersionId === lastUpdatedVersion && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
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

    // Periodic update checks every 1 minute (more frequent for forced updates)
    checkIntervalRef.current = setInterval(() => {
      checkForUpdate(true);
    }, 60 * 1000); // 1 minute

    // Check for updates when page becomes visible (user returns to tab/app)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate(true);
      }
    };

    // Check for updates when window gains focus
    const handleFocus = () => {
      checkForUpdate(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Listen for service worker controller change (new SW activated)
    const handleControllerChange = () => {
      // Reload if a new service worker took control
      if (navigator.serviceWorker.controller) {
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      window.removeEventListener('pwa-update-available', onUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
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
        
        // Mark this version as updated BEFORE activating
        // This ensures we don't show the prompt again for this version
        if (versionId) {
          localStorage.setItem('pwa_updated_version', versionId);
          console.log(`✅ Marked version ${versionId} as updated`);
        }
        
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
            // Update current version in localStorage
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
        const versionId = pendingVersionRef.current;
        if (versionId) {
          localStorage.setItem('pwa_updated_version', versionId);
        }
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
  { id: 'staffPermissions', name: 'Team Management', icon: Users, roles: [USER_ROLES.OWNER], priority: 1 },
  { id: 'settings', name: 'Settings', icon: Settings, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], priority: 2 },
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
  const [pageOrigin, setPageOrigin] = useState('dashboard');

  // Watch for URL changes to handle deep links (e.g., staff-setup, reset-password)
  useEffect(() => {
    const handlePathChange = () => {
      const deepLinkPage = checkDeepLinkPath();
      if (deepLinkPage && deepLinkPage !== currentPage) {
        setCurrentPage(deepLinkPage);
      }
    };
    
    // Check immediately on mount
    handlePathChange();
    
    // Listen for popstate events (browser back/forward)
    window.addEventListener('popstate', handlePathChange);
    
    return () => {
      window.removeEventListener('popstate', handlePathChange);
    };
  }, [currentPage]);
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
  const outletRestoredRef = useRef(false);

  const [currentOutlet, setCurrentOutlet] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [currentOutletId, setCurrentOutletId] = useState(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const lastSelectedOutletId = localStorage.getItem('lastSelectedOutletId');
    return lastSelectedOutletId || user?.activeStoreId || null;
  });
  const [isChatSelected, setIsChatSelected] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [hasModalOpen, setHasModalOpen] = useState(false);

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

  // Calculate unread count - updates in real-time when notifications change via Socket.IO
  const unreadCount = useMemo(() => {
    const count = (notifications || []).filter(n => {
      // Count as unread if isRead is explicitly false or undefined
      return n && (n.isRead === false || n.isRead === undefined);
    }).length;
    return count;
  }, [notifications]);

  const handleViewAllSales = useCallback(() => setCurrentPage('salesActivity'), []);
  const handleViewAllCredit = useCallback(() => setCurrentPage('khata'), []);
  const [showLowStockFilter, setShowLowStockFilter] = useState(false);
  const handleViewAllInventory = useCallback(() => {
    setShowLowStockFilter(true);
    setCurrentPage('inventory');
  }, []);

  const fetchNotificationHistory = useCallback(async () => {
    if (!currentUser || !apiClient || !API) {
      console.log('⚠️ Cannot fetch notifications: missing currentUser, apiClient, or API');
      return;
    }
    try {
      const response = await apiClient.get(`${API.notificationalert}?t=${Date.now()}`);
      console.log('📬 Notification API response:', response.data);
      
      if (response.data) {
        // API returns { count: number, alerts: array }
        const alerts = response.data.alerts || [];
        setNotifications(alerts);
        const unreadCount = alerts.filter(a => !a.isRead).length;
        console.log(`📬 Fetched ${alerts.length} notifications (${unreadCount} unread)`);
      } else {
        console.warn('⚠️ Notification API returned no data');
        setNotifications([]);
      }
    } catch (error) { 
      console.error("❌ Error fetching notifications:", error.response?.data || error.message);
      // Don't clear notifications on error - keep existing ones
      // Only set empty if we have no notifications at all
      // setNotifications([]);
    }
  }, [currentUser, apiClient, API]);

  // Fetch a single outlet by ID
  const fetchOutletById = useCallback(async (outletId) => {
    if (!outletId || !isPremium) return null;
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
  }, [apiClient, API, isPremium]);

  const fetchOutlets = useCallback(async () => {
    if (!currentUser || !isPremium) {
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
        } else {
          if (!currentOutlet && currentOutletId) {
            const activeOutlet = outletsList.find(o => o._id === currentOutletId);
            if (activeOutlet) {
              setCurrentOutlet(activeOutlet);
            } else {
              // If outlet not found in list, fetch it individually
              const fetchedOutlet = await fetchOutletById(currentOutletId);
              if (fetchedOutlet) {
                setCurrentOutlet(fetchedOutlet);
              }
            }
          }
        }
      }
    } catch (error) {
      // Ignore cancellation errors (expected behavior for duplicate request prevention)
      if (error.cancelled || error.message?.includes('cancelled')) {
        return;
      }
      console.error('Error fetching outlets:', error);
    }
  }, [currentUser, isPremium, currentOutlet, currentOutletId, fetchOutletById, apiClient, API]);

  useEffect(() => {
    if (currentUser && isPremium) {
      fetchOutlets();
    } else {
      setOutlets([]);
      outletRestoredRef.current = false;
    }
  }, [currentUser, isPremium, fetchOutlets]);

  // Ensure outlet is fetched if we have ID but not the outlet object
  useEffect(() => {
    if (currentUser && isPremium && currentOutletId && !currentOutlet) {
      fetchOutletById(currentOutletId).then(outlet => {
        if (outlet) {
          setCurrentOutlet(outlet);
        }
      });
    }
  }, [currentUser, isPremium, currentOutletId, currentOutlet, fetchOutletById]);

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
        const fetchedChats = response.data.data || [];
        const totalUnread = fetchedChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
        setChatUnreadCount(totalUnread);
      }
    } catch (error) {
      // Silently fail - chat might not be accessible
      console.error('Failed to fetch chat unread count:', error);
    }
  }, [currentUser, apiClient, API]);

  useEffect(() => {
    if (!currentUser) return;
    
    // Initial fetch of notifications
    fetchNotificationHistory();
    
    socketRef.current = io("https://shopbill-3le1.onrender.com", {
      auth: { token: localStorage.getItem('userToken') },
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnection: true
    });
    const socket = socketRef.current;
    
    const handleConnect = () => {
      const roomId = currentOutletId || currentUser.storeId || currentUser._id || 'default';
      socket.emit('join_shop', String(roomId));
      
      // Join user-specific room for notifications (backup, already joined on connection)
      if (currentUser._id) {
        socket.emit('join_user', String(currentUser._id));
      }
      
      // Fetch notifications and chat unread count after connection
      fetchNotificationHistory();
      updateChatUnreadCount();
    };
    
    const handleNewNotification = (newAlert) => {
      console.log('📬 New notification received:', newAlert);
      
      // Filter out notifications where the current user is the actor
      // Users don't need to see notifications about their own actions
      if (newAlert.actorId && currentUser && newAlert.actorId.toString() === currentUser._id.toString()) {
        console.log('🚫 Filtered out notification (user is actor)');
        return; // Don't add notification if user is the actor
      }
      
      // Ensure isRead is explicitly set to false for new notifications
      const notificationWithReadStatus = {
        ...newAlert,
        isRead: false // Explicitly mark as unread for real-time notifications
      };
      
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => {
          const nId = n._id || n.id;
          const alertId = notificationWithReadStatus._id || notificationWithReadStatus.id;
          return nId && alertId && nId.toString() === alertId.toString();
        });
        
        if (exists) {
          console.log('📬 Notification already exists, skipping');
          return prev;
        }
        
        console.log('✅ Adding new notification to list (unread)');
        // Add new notification at the beginning with isRead: false
        const updated = [notificationWithReadStatus, ...prev];
        // Limit to last 50 notifications to prevent memory issues
        return updated.slice(0, 50);
      });
      
      // Show toast notification
      if (newAlert.message) {
        showToast(newAlert.message, 'info');
      }
    };
    
    const handleNewMessage = (data) => {
      // Update chat unread count when a new message arrives
      updateChatUnreadCount();
    };
    
    socket.on('connect', handleConnect);
    socket.on('new_notification', handleNewNotification);
    socket.on('new_message', handleNewMessage);
    
    // If already connected, trigger initial fetch
    if (socket.connected) {
      handleConnect();
    }
    
    // Periodic notification refresh (every 30 seconds)
    const notificationInterval = setInterval(() => {
      fetchNotificationHistory();
    }, 30000);
    
    // Refresh notifications when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser) {
        fetchNotificationHistory();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('new_notification', handleNewNotification);
        socket.off('new_message', handleNewMessage);
        socket.disconnect();
      }
      clearInterval(notificationInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, currentOutletId, fetchNotificationHistory, showToast, updateChatUnreadCount]);

  const logout = useCallback(() => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setCurrentOutletId(null);
    setCurrentOutlet(null);
    setOutlets([]);
    setNotifications([]);
    setCurrentPage('dashboard');
    setIsViewingLogin(false);
    outletRestoredRef.current = false;
  }, []);

  const handleLoginSuccess = useCallback(async (user, token) => {
    const normalizedUser = { ...user, role: user.role.toLowerCase() };
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
    
    setCurrentPage('dashboard'); // All roles start at dashboard now
  }, [apiClient, API]);

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

  const handleRegistrationComplete = useCallback(() => {
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
    
    const token = localStorage.getItem('userToken');
    if (!token || token === 'undefined') {
      logout();
    }
    setIsLoadingAuth(false);
  }, [logout, currentPage]);

  // Fetch effective plan for staff members to ensure chat access is correct
  useEffect(() => {
    const fetchEffectivePlan = async () => {
      if (!currentUser) return;
      
      // For staff members, fetch the effective plan (owner's plan)
      if (currentUser.role !== 'owner' && currentUser.role !== 'superadmin') {
        try {
          const response = await apiClient.get(API.currentPlan);
          if (response.data?.success && response.data?.plan) {
            const effectivePlan = response.data.plan.toUpperCase();
            // Update currentUser with effective plan if it's different
            if (currentUser.plan?.toUpperCase() !== effectivePlan) {
              const updatedUser = { ...currentUser, plan: effectivePlan };
              localStorage.setItem('currentUser', JSON.stringify(updatedUser));
              setCurrentUser(updatedUser);
            }
          }
        } catch (error) {
          console.error('Failed to fetch effective plan:', error);
        }
      }
    };

    if (currentUser && apiClient) {
      fetchEffectivePlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]); // Only run when user ID changes (after login)

  const navItems = useMemo(() => {
    if (userRole === USER_ROLES.SUPERADMIN) return SUPERADMIN_NAV_ITEMS;
    const userPlan = currentUser?.plan?.toUpperCase();
    const hasChatAccess = userPlan === 'PRO' || userPlan === 'PREMIUM';
    const standardNav = [
      { id: 'dashboard', name: 'Dashboard', icon: Home, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 1, manager: 1, cashier: 1 } },
      { id: 'billing', name: 'Billing', icon: Barcode, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: null, manager: 2, cashier: 1 } },
      { id: 'khata', name: 'Ledger', icon: CreditCard, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 2, manager: 3, cashier: 2 } },
      { id: 'inventory', name: 'Inventory', icon: Package, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], displayOrder: { owner: null, manager: 4, cashier: null } },
      ...(isPremium ? [{ id: 'scm', name: 'Supply Chain', icon: Truck, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER], displayOrder: { owner: null, manager: null, cashier: null } }] : []),
      { id: 'reports', name: 'Reports', icon: TrendingUp, roles: [USER_ROLES.OWNER], displayOrder: { owner: 4, manager: null, cashier: null } },
      ...(hasChatAccess ? [{ id: 'chat', name: 'Messages', icon: MessageCircle, roles: [USER_ROLES.OWNER, USER_ROLES.MANAGER, USER_ROLES.CASHIER], displayOrder: { owner: 3, manager: null, cashier: null } }] : []),
    ];
    return standardNav.filter(item => item.roles.includes(userRole));
  }, [userRole, isPremium, currentUser]);

  // Split nav items into primary (footer) and secondary (more menu) based on role
  const { primaryNavItems, secondaryNavItems } = useMemo(() => {
    const filtered = navItems.filter(item => item.roles.includes(userRole));
    
    // Define role-specific primary menu items (displayed first)
    const rolePrimaryMenuIds = {
      [USER_ROLES.OWNER]: ['dashboard', 'khata', 'chat', 'reports'], // Dashboard, Ledger, Messages, Reports
      [USER_ROLES.MANAGER]: ['dashboard', 'inventory', 'scm', 'khata', 'chat'], // Dashboard, Inventory, Supply Chain, Ledger, Messages
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
  }, [navItems, userRole]);

  const utilityNavItems = useMemo(() => {
    const filtered = UTILITY_NAV_ITEMS_CONFIG.filter(item => item.roles.includes(userRole));
    // Sort by priority (lower number = higher priority), then by name
    return filtered.sort((a, b) => {
      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return a.name.localeCompare(b.name);
    });
  }, [userRole]);

  const handleBackToOrigin = () => {
    setCurrentPage(pageOrigin || 'dashboard');
    setPageOrigin('dashboard');
  };

  const renderContent = () => {
    // Render public pages immediately, even during auth loading
    if (currentPage === 'staffSetPassword') return <StaffSetPassword />;
    if (currentPage === 'resetPassword') return <ResetPassword />;
    
    if (isLoadingAuth) return <div className="h-screen flex items-center justify-center bg-gray-950"><Loader className="animate-spin text-indigo-500" /></div>;
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
      setCurrentPage, 
      unreadCount, 
      setPageOrigin, 
      currentOutlet,
      currentOutletId,
      onOutletSwitch: handleOutletSwitch
    };

    const componentKey = `${currentPage}-${currentOutletId}`;

    return (
      <Suspense fallback={null}>
        {(() => {
          switch (currentPage) {
            case 'dashboard': return userRole === USER_ROLES.SUPERADMIN ? <SuperAdminDashboard key={componentKey} {...commonProps} /> : <Dashboard key={componentKey} {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
            case 'billing': return <BillingPOS key={componentKey} {...commonProps} />;
            case 'khata': return <Ledger key={componentKey} {...commonProps} onModalStateChange={setHasModalOpen} />;
            case 'inventory': return <InventoryManager key={componentKey} {...commonProps} initialSortOption={showLowStockFilter ? 'low-stock' : null} onSortOptionSet={() => setShowLowStockFilter(false)} />;
            case 'scm': return <SupplyChainManagement key={componentKey} {...commonProps} />;
            case 'reports': return userRole === USER_ROLES.SUPERADMIN ? <GlobalReport key={componentKey} {...commonProps} /> : <Reports key={componentKey} {...commonProps} />;
            case 'notifications': return <NotificationsPage key={componentKey} {...commonProps} />;
            case 'settings': return <SettingsPage key={componentKey} {...commonProps} />;
            case 'profile': return <Profile key={componentKey} {...commonProps} />;
            case 'superadmin_users': return <UserManagement key={componentKey} {...commonProps} />;
            case 'superadmin_systems': return <SystemConfig key={componentKey} {...commonProps} />;
            case 'outlets': return <OutletManager key={componentKey} {...commonProps} onOutletSwitch={handleOutletSwitch} currentOutletId={currentOutletId} />;
            case 'salesActivity': return <SalesActivityPage key={componentKey} {...commonProps} onBack={() => setCurrentPage('dashboard')} />;
            case 'chat': return <Chat key={componentKey} {...commonProps} currentOutletId={currentOutletId} outlets={outlets} onChatSelectionChange={setIsChatSelected} onUnreadCountChange={setChatUnreadCount} onNavigateToStaffPermissions={() => setCurrentPage('staffPermissions')} />;
            default: return <Dashboard key={componentKey} {...commonProps} onViewAllSales={handleViewAllSales} onViewAllCredit={handleViewAllCredit} onViewAllInventory={handleViewAllInventory} />;
          }
        })()}
      </Suspense>
    );
  };

  const showAppUI = currentUser && !['resetPassword', 'staffSetPassword', 'checkout', 'terms', 'policy', 'support', 'affiliate'].includes(currentPage);
  
  // Reset chat selection state when leaving chat page
  useEffect(() => {
    if (currentPage !== 'chat') {
      setIsChatSelected(false);
    }
  }, [currentPage]);
  
  const containerBg = darkMode ? 'bg-gray-950' : 'bg-slate-50';
  const sidebarBg = darkMode ? 'bg-gray-950 border-gray-900' : 'bg-white border-slate-200';
  const navText = darkMode ? 'text-gray-500 hover:bg-gray-900 hover:text-gray-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900';

  return (
    <ApiProvider>
      {/* Scrollbar styles are now handled globally in index.css */}
      <SEO title={`${currentPage.toUpperCase()} | Pocket POS`} />
      <div className={`h-screen w-full flex flex-col overflow-hidden transition-colors duration-300 ${containerBg} ${darkMode ? 'text-gray-200' : 'text-slate-900'}`}>
        <UpdatePrompt />
        {showAppUI && !isChatSelected && (
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
            currentUser={currentUser}
            currentOutlet={currentOutlet}
            currentOutletId={currentOutletId}
            onOutletSwitch={handleOutletSwitch}
            showToast={showToast}
            hasModalOpen={hasModalOpen}
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

              {isPremium && userRole === USER_ROLES.OWNER && (
                <div className="px-4 mb-4">
                  <OutletSelector
                    apiClient={apiClient}
                    currentUser={currentUser}
                    currentOutletId={currentOutletId}
                    onOutletSwitch={handleOutletSwitch}
                    showToast={showToast}
                  />
                  <button
                    onClick={() => setCurrentPage('outlets')}
                    className={`w-full mt-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      currentPage === 'outlets'
                        ? 'bg-indigo-600 text-white'
                        : darkMode
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Manage Outlets
                  </button>
                </div>
              )}

              <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto pt-4 sidebar-scroll">
                <p className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 mb-2 ${darkMode ? 'text-gray-600' : 'text-slate-400'}`}>Main Menu</p>
                {/* Primary menu items (shown first) */}
                {primaryNavItems.map(item => (
                  <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : `border border-transparent ${navText}`}`}>
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
                      <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : `border border-transparent ${navText}`}`}>
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
                    <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 relative group ${currentPage === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' : `border border-transparent ${navText}`}`}>
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
          <main className={`flex-1 transition-all duration-300 ${containerBg} ${showAppUI ? (isChatSelected ? 'md:ml-64 overflow-hidden' : (currentPage === 'chat' ? 'md:ml-64 overflow-hidden' : 'md:ml-64 pt-16 md:pt-6 pb-24 md:pb-6 overflow-y-auto custom-scrollbar')) : 'w-full overflow-y-auto custom-scrollbar'}`}>
            <div className={`${currentPage === 'chat' && isChatSelected ? 'h-full' : (currentPage === 'chat' ? 'h-full' : 'max-w-7xl mx-auto min-h-full')} ${currentPage === 'chat' ? 'px-0' : 'px-0 md:px-6'}`}>
              {renderContent()}
            </div>
          </main>
        </div>
        {showAppUI && !isChatSelected && (
          <>
            <nav className={`fixed bottom-0 inset-x-0 h-18 border-t md:hidden flex items-center justify-around z-[50] px-2 pb-safe shadow-[0_-15px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl ${darkMode ? 'bg-gray-950/90 border-gray-900' : 'bg-white/90 border-slate-200'}`}>
              {!showMoreMenu && primaryNavItems.map(item => (
                <button key={item.id} onClick={() => setCurrentPage(item.id)} className={`flex flex-col items-center justify-center py-2 px-2 transition-all relative flex-1 ${currentPage === item.id ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}>
                  {currentPage === item.id && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />}
                  <div className={`p-1.5 rounded-xl transition-all relative ${currentPage === item.id ? 'bg-indigo-500/10' : ''}`}>
                    <item.icon className={`w-7 h-7 ${currentPage === item.id ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                    {item.id === 'chat' && chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full ring-2 ring-inherit bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {secondaryNavItems.length > 0 && (
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)} 
                  className={`flex flex-col items-center justify-center py-2 px-2 transition-all relative ${showMoreMenu ? 'flex-1' : 'flex-1'} ${showMoreMenu || secondaryNavItems.some(item => currentPage === item.id) || utilityNavItems.some(item => (item.id === 'settings' || item.id === 'staffPermissions') && currentPage === item.id) ? 'text-indigo-500' : 'text-gray-600 hover:text-indigo-400'}`}
                >
                  {(showMoreMenu || secondaryNavItems.some(item => currentPage === item.id) || utilityNavItems.some(item => (item.id === 'settings' || item.id === 'staffPermissions') && currentPage === item.id)) && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.8)]" />}
                  <div className={`p-1.5 rounded-xl transition-all relative ${showMoreMenu || secondaryNavItems.some(item => currentPage === item.id) || utilityNavItems.some(item => (item.id === 'settings' || item.id === 'staffPermissions') && currentPage === item.id) ? 'bg-indigo-500/10' : ''}`}>
                    <MoreHorizontal className={`w-7 h-7 ${showMoreMenu || secondaryNavItems.some(item => currentPage === item.id) || utilityNavItems.some(item => item.id === 'settings' && currentPage === item.id) ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                    {chatUnreadCount > 0 && secondaryNavItems.some(item => item.id === 'chat') && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full ring-2 ring-inherit bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </nav>

            {/* More Menu Modal */}
            {showMoreMenu && (
              <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setShowMoreMenu(false)}>
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                <div 
                  className={`fixed bottom-0 left-0 right-0 rounded-t-2xl rounded-b-none border-t border-l border-r shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[100vh] overflow-y-auto custom-scrollbar ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}
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
                  <div className="px-2 pt-2 pb-4 pb-safe">
                    {/* Team Management first (for owners) */}
                    {utilityNavItems.filter(item => item.id === 'staffPermissions').map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentPage(item.id);
                          setShowMoreMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 last:mb-0 ${
                          currentPage === item.id
                            ? darkMode ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm font-bold">{item.name}</span>
                      </button>
                    ))}
                    {/* Secondary nav items (Supply Chain, Inventory, Billing for owners) */}
                    {secondaryNavItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentPage(item.id);
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
                    {/* Settings last */}
                    {utilityNavItems.filter(item => item.id === 'settings').map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentPage(item.id);
                          setShowMoreMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 last:mb-0 ${
                          currentPage === item.id
                            ? darkMode ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                            : darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm font-bold">{item.name}</span>
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