// Inventory API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const inventoryService = {
  getAll: async (forceRefresh = false) => {
    const response = await apiClient.get(API.inventory, { forceRefresh });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${API.inventory}/${id}`);
    return response.data;
  },

  create: async (item) => {
    const response = await apiClient.post(API.inventory, item);
    return response.data;
  },

  update: async (id, item) => {
    const response = await apiClient.put(`${API.inventory}/${id}`, item);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`${API.inventory}/${id}`);
    return response.data;
  },

  bulkCreate: async (items) => {
    const response = await apiClient.post(`${API.inventory}/bulk`, { items });
    return response.data;
  },
};

