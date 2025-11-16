// Superadmin API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const superadminService = {
  // Shops
  getShops: async () => {
    const response = await apiClient.get(API.superadminShops);
    return response.data;
  },

  getShopDetails: async (id) => {
    const response = await apiClient.get(API.superadminShopDetails(id));
    return response.data;
  },

  createShop: async (shopData) => {
    const response = await apiClient.post(API.superadminShops, shopData);
    return response.data;
  },

  updateShop: async (id, shopData) => {
    const response = await apiClient.put(API.superadminShopDetails(id), shopData);
    return response.data;
  },

  deleteShop: async (id) => {
    const response = await apiClient.delete(API.superadminShopDetails(id));
    return response.data;
  },

  // Payments
  getShopPayments: async (id) => {
    const response = await apiClient.get(API.superadminShopPayments(id));
    return response.data;
  },

  getShopPaymentStatus: async (id) => {
    const response = await apiClient.get(API.superadminShopPaymentStatus(id));
    return response.data;
  },

  // Config
  getConfig: async () => {
    const response = await apiClient.get(API.superadminConfig);
    return response.data;
  },

  updateConfig: async (config) => {
    const response = await apiClient.put(API.superadminConfig, config);
    return response.data;
  },

  // Dashboard
  getDashboard: async () => {
    const response = await apiClient.get(API.superadminDashboard);
    return response.data;
  },

  // Reports
  getReports: async (startDate, endDate) => {
    const response = await apiClient.get(API.superadminReports, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

