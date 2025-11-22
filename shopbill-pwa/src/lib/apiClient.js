// Centralized API Client with interceptors, caching, and performance optimizations
import axios from 'axios';

// Request cache to prevent duplicate calls
const requestCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds cache

// Active requests map to cancel duplicates
const activeRequests = new Map();

// Create axios instance with default config
// Note: If API endpoints use full URLs, axios will use them as-is and ignore baseURL
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://shopbill-3le1.onrender.com/api',
  timeout: 30000, // 30 second timeout (increased for slower connections)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and handle caching
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Generate cache key
    const cacheKey = `${config.method}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;
    
    // Check cache for GET requests
    if (config.method === 'get' && !config.forceRefresh) {
      const cached = requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Mark as cached - we'll return cached data without making request
        config.__fromCache = true;
        config.__cachedData = cached.data;
        // Cancel this request immediately since we have cache
        const cancelSource = axios.CancelToken.source();
        config.cancelToken = cancelSource.token;
        cancelSource.cancel('Using cached data');
        // Don't add to activeRequests since we're using cache
        config.__cacheKey = cacheKey;
        return config;
      }
    }

    // Cancel previous identical request if still pending
    if (activeRequests.has(cacheKey)) {
      activeRequests.get(cacheKey).cancel('Duplicate request cancelled');
    }

    // Create cancel token for this request
    const cancelToken = axios.CancelToken.source();
    config.cancelToken = cancelToken.token;
    activeRequests.set(cacheKey, cancelToken);

    // Store cache key in config for response interceptor
    config.__cacheKey = cacheKey;
    config.__cacheable = config.method === 'get' && !config.forceRefresh;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle caching and errors
apiClient.interceptors.response.use(
  (response) => {
    const config = response.config;
    
    // Handle cached responses - return cached data immediately
    if (config.__fromCache && config.__cachedData) {
      // Return cached response
      const cachedResponse = {
        ...response,
        data: config.__cachedData,
        fromCache: true,
      };
      
      // Remove from active requests
      if (config.__cacheKey) {
        activeRequests.delete(config.__cacheKey);
      }
      
      return cachedResponse;
    }
    
    // Cache successful GET responses
    if (config.__cacheable && config.__cacheKey) {
      requestCache.set(config.__cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }

    // Remove from active requests
    if (config.__cacheKey) {
      activeRequests.delete(config.__cacheKey);
    }

    return response;
  },
  (error) => {
    // Handle cached responses - if request was cancelled because we have cache
    if (error.config?.__fromCache && error.config?.__cachedData) {
      const cachedResponse = {
        data: error.config.__cachedData,
        fromCache: true,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      };
      
      // Remove from active requests
      if (error.config.__cacheKey) {
        activeRequests.delete(error.config.__cacheKey);
      }
      
      return Promise.resolve(cachedResponse);
    }

    // Handle cancelled requests (ignore if it was for cache)
    if (axios.isCancel(error) && !error.config?.__fromCache) {
      return Promise.reject({ cancelled: true, message: error.message });
    }
    
    // If cancelled for cache, return cached data
    if (axios.isCancel(error) && error.config?.__fromCache && error.config?.__cachedData) {
      return Promise.resolve({
        data: error.config.__cachedData,
        fromCache: true,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
      });
    }

    // Remove from active requests on error
    if (error.config?.__cacheKey) {
      activeRequests.delete(error.config.__cacheKey);
    }

    // Handle 401 - Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('userToken');
      localStorage.removeItem('currentUser');
      window.location.href = '/';
    }

    return Promise.reject(error);
  }
);

// Utility function to clear cache
export const clearCache = (pattern = null) => {
  if (!pattern) {
    requestCache.clear();
    return;
  }
  
  // Clear cache entries matching pattern
  for (const key of requestCache.keys()) {
    if (key.includes(pattern)) {
      requestCache.delete(key);
    }
  }
};

// Utility function to cancel all pending requests
export const cancelAllRequests = () => {
  activeRequests.forEach((cancelToken) => {
    cancelToken.cancel('All requests cancelled');
  });
  activeRequests.clear();
};

export default apiClient;

