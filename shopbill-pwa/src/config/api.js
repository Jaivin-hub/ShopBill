// api.js - API Endpoints Configuration

// Use environment variable if available, otherwise fallback to production
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://server.pocketpos.io/api';

const API = {
    // New Authentication Endpoints
    login: API_BASE_URL + '/auth/login',
    signup: API_BASE_URL + '/auth/signup',
    passwordchange: API_BASE_URL + '/auth/password/change',
    forgetpassword: API_BASE_URL + '/auth/forgot-password',
    resetpassword: API_BASE_URL + '/auth/reset-password',
    sync: API_BASE_URL + '/auth/data/sync',
    uploadcloud: API_BASE_URL + '/auth/data/upload-to-cloud',
    currentPlan: API_BASE_URL + '/auth/current-plan',
    profile: API_BASE_URL + '/auth/profile',

    // Staff Management Endpoints
    staff: API_BASE_URL + '/staff', // GET, POST
    staffToggle: (id) => `${API_BASE_URL}/staff/${id}/toggle`, // PUT (for active status)
    staffDelete: (id) => `${API_BASE_URL}/staff/${id}`, // DELETE
    activateStaff: API_BASE_URL + '/auth/activate',
    staffRoleUpdate: (id) => `${API_BASE_URL}/staff/${id}/role`,
    
    // Attendance/Punch In-Out Endpoints
    attendancePunchIn: API_BASE_URL + '/attendance/punch-in', // POST
    attendancePunchOut: API_BASE_URL + '/attendance/punch-out', // POST
    attendanceBreakStart: API_BASE_URL + '/attendance/break-start', // POST
    attendanceBreakEnd: API_BASE_URL + '/attendance/break-end', // POST
    attendanceCurrent: API_BASE_URL + '/attendance/current', // GET
    attendanceMyRecords: API_BASE_URL + '/attendance/my-records', // GET
    attendanceStaff: (staffId) => `${API_BASE_URL}/attendance/staff/${staffId}`, // GET
    attendanceAll: API_BASE_URL + '/attendance/all', // GET
    attendanceActiveStatus: API_BASE_URL + '/attendance/active-status', // GET

    // Existing Business Endpoints
    inventory: API_BASE_URL + '/inventory',
    customers: API_BASE_URL + '/customers',
    sales: API_BASE_URL + '/sales',
    reportsSummary: API_BASE_URL + '/reports/summary',
    reportsChartData: API_BASE_URL + '/reports/chart-data',
    notificationalert: API_BASE_URL + '/notifications/alerts',
    notificationreadall: API_BASE_URL + '/notifications/read-all',

    // 🚛 NEW: SUPPLY CHAIN MANAGEMENT (SCM) ENDPOINTS 🚛
    scmSuppliers: API_BASE_URL + '/scm/suppliers',    // GET (All Suppliers), POST (Add Supplier)
    scmPurchases: API_BASE_URL + '/scm/purchases',    // GET (Purchase History), POST (Record Purchase & Update Stock)
    // ------------------------------------------

    // 💥 NEW: SUPERADMIN MANAGEMENT ENDPOINTS 💥
    superadminShops: API_BASE_URL + '/superadmin/shops',           // GET (All Shops), POST (Create Shop/Owner)
    superadminShopDetails: (id) => `${API_BASE_URL}/superadmin/shops/${id}`, // GET (Single Shop), PUT (Update Shop), DELETE (Delete Shop)
    superadminConfig: API_BASE_URL + '/superadmin/config',         // GET (System Config), PUT (Update Config)
    superadminDashboard: API_BASE_URL + '/superadmin/dashboard',   // GET (Dashboard Stats)
    superadminReports: API_BASE_URL + '/superadmin/reports',        // GET (Global Reports)
    superadminShopPayments: (id) => `${API_BASE_URL}/superadmin/shops/${id}/payments`, // GET (Payment History)
    superadminShopPaymentStatus: (id) => `${API_BASE_URL}/superadmin/shops/${id}/payment-status`, // GET (Payment Status)
    superadminRecentActivity: API_BASE_URL + '/superadmin/recent-activity', // GET (Recent Activities)
    // ------------------------------------------
    
    // Plan Management (Owner only)
    updatePlan: API_BASE_URL + '/user/plan', // GET (Get current plan), PUT (Update subscription plan)
    // ------------------------------------------
    
    // Payment Routes
    createSubscription: API_BASE_URL + '/payment/create-subscription', // POST (Creates a recurring subscription mandate)
    verifySubscription: API_BASE_URL + '/payment/verify-subscription', // POST (Verifies the mandate setup signature)
    cancelSubscription: API_BASE_URL + '/payment/cancel-subscription', // POST (Cancels the active subscription)
    upgradePlan: API_BASE_URL + '/payment/upgrade-plan', // POST (Cancels old, creates new mandate)
    verifyPlanChange: API_BASE_URL + '/payment/verify-plan-change', // POST (Verifies new mandate and updates user)
    // ------------------------------------------
    
    // Outlet Management Routes (Premium users only)
    outlets: API_BASE_URL + '/outlets', // GET (List all outlets), POST (Create outlet)
    outletDetails: (id) => `${API_BASE_URL}/outlets/${id}`, // GET (Get outlet), PUT (Update outlet), DELETE (Delete outlet)
    switchOutlet: (id) => `${API_BASE_URL}/outlets/${id}/switch`, // PUT (Switch active outlet)
    // ------------------------------------------
    
    // 💬 Chat System Routes (PRO/PREMIUM users only)
    chatList: API_BASE_URL + '/chat/chats', // GET (List all chats)
    chatUsers: API_BASE_URL + '/chat/users', // GET (Get available users to chat with)
    createChat: API_BASE_URL + '/chat/create', // POST (Create new chat)
    chatMessages: (chatId) => `${API_BASE_URL}/chat/${chatId}/messages`, // GET (Get messages for a chat)
    sendMessage: (chatId) => `${API_BASE_URL}/chat/${chatId}/message`, // POST (Send a message)
    deleteChat: (chatId) => `${API_BASE_URL}/chat/${chatId}`, // DELETE (Delete a custom chat group)
    // ------------------------------------------
}

export default API;