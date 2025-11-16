// Staff API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const staffService = {
  getAll: async () => {
    const response = await apiClient.get(API.staff);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`${API.staff}/${id}`);
    return response.data;
  },

  create: async (staffData) => {
    const response = await apiClient.post(API.staff, staffData);
    return response.data;
  },

  update: async (id, staffData) => {
    const response = await apiClient.put(`${API.staff}/${id}`, staffData);
    return response.data;
  },

  toggleActive: async (id) => {
    const response = await apiClient.put(API.staffToggle(id));
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(API.staffDelete(id));
    return response.data;
  },

  activate: async (token, password) => {
    const response = await apiClient.post(API.activateStaff, { token, password });
    return response.data;
  },
};

