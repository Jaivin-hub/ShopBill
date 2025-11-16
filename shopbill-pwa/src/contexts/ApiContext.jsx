// API Context for providing apiClient and services throughout the app
import React, { createContext, useContext } from 'react';
import apiClient, { clearCache, cancelAllRequests } from '../lib/apiClient';
import * as apiServices from '../services/api';

const ApiContext = createContext(null);

export const ApiProvider = ({ children }) => {
  const value = {
    apiClient,
    services: apiServices,
    clearCache,
    cancelAllRequests,
  };

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApiContext = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error('useApiContext must be used within ApiProvider');
  }
  return context;
};

