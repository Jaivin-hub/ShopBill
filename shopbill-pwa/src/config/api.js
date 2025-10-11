// api.js

const API_BASE_URL = 'https://shopbill-3le1.onrender.com/api'
// const API_BASE_URL = 'http://localhost:5000/api';

const API = {
    // New Authentication Endpoints
    login: API_BASE_URL + '/auth/login',
    signup: API_BASE_URL + '/auth/signup',
    passwordchange: API_BASE_URL + '/auth/password/change',
    forgetpassword: API_BASE_URL + '/auth/forgot-password',
    resetpassword: API_BASE_URL + '/auth/reset-password',

    
    // Existing Business Endpoints
    inventory : API_BASE_URL + '/inventory',
    customers : API_BASE_URL + '/customers',
    sales : API_BASE_URL + '/sales',
    reportsSummary: API_BASE_URL + '/reports/summary',
    reportsChartData: API_BASE_URL + '/reports/chart-data',
    notificationalert: API_BASE_URL + '/notifications/alerts',
}

export default API