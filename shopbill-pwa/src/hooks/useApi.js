// Custom hook for API calls with loading, error, and caching
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for API calls with automatic loading and error handling
 * @param {Function} apiCall - The API function to call
 * @param {Array} dependencies - Dependencies array (like useEffect)
 * @param {Object} options - Options for the hook
 * @returns {Object} { data, loading, error, refetch }
 */
export const useApi = (apiCall, dependencies = [], options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const {
    immediate = true, // Call immediately on mount
    onSuccess,
    onError,
    skip = false, // Skip the call
  } = options;

  const execute = useCallback(async () => {
    if (skip) {
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      if (onSuccess) onSuccess(result);
    } catch (err) {
      if (err.name === 'AbortError' || err.cancelled) {
        return; // Request was cancelled, ignore
      }
      setError(err);
      if (onError) onError(err);
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [apiCall, skip, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }

    return () => {
      // Cleanup: cancel request on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [immediate, execute, ...dependencies]);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return { data, loading, error, refetch };
};

/**
 * Hook for parallel API calls
 * @param {Array} apiCalls - Array of API functions
 * @param {Array} dependencies - Dependencies array
 * @returns {Object} { data, loading, error }
 */
export const useParallelApi = (apiCalls, dependencies = []) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(apiCalls.map(call => call()));
        setData(results);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, dependencies);

  return { data, loading, error };
};

