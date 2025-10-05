// const API_BASE_URL = 'https://shopbill-3le1.onrender.com/api';
const API_BASE_URL = 'http://localhost:5000/api';

const API = {
    inventory : API_BASE_URL + '/inventory',
    customers : API_BASE_URL + '/customers',
    sales : API_BASE_URL + '/sales',
    // New Reporting Endpoints
    reportsSummary: API_BASE_URL + '/reports/summary',
    reportsChartData: API_BASE_URL + '/reports/chart-data',
}

export default API