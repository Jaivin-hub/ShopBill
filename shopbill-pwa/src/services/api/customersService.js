// Customers API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const customersService = {
  getAll: async () => {
    const response = await apiClient.get(API.customers);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${API.customers}/${id}`);
    return response.data;
  },

  create: async (customer) => {
    const response = await apiClient.post(API.customers, customer);
    return response.data;
  },

  update: async (id, customer) => {
    const response = await apiClient.put(`${API.customers}/${id}`, customer);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`${API.customers}/${id}`);
    return response.data;
  },

  updateCredit: async (id, amount) => {
    const response = await apiClient.put(`${API.customers}/${id}/credit`, { amount });
    return response.data;
  },
};

