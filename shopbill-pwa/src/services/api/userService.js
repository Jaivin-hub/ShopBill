// User/Plan API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const userService = {
  getPlan: async () => {
    const response = await apiClient.get(API.updatePlan);
    return response.data;
  },

  updatePlan: async (plan) => {
    const response = await apiClient.put(API.updatePlan, { plan });
    return response.data;
  },
};

