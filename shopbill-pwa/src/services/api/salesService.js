// Sales API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const salesService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(API.sales, { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${API.sales}/${id}`);
    return response.data;
  },

  create: async (sale) => {
    const response = await apiClient.post(API.sales, sale);
    return response.data;
  },

  getByDateRange: async (startDate, endDate) => {
    const response = await apiClient.get(API.sales, {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

