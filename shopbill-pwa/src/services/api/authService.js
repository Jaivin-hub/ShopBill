// Authentication API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const authService = {
  login: async (identifier, password) => {
    const response = await apiClient.post(API.login, { identifier, password });
    return response.data;
  },

  signup: async (email, password, phone) => {
    const response = await apiClient.post(API.signup, { email, password, phone });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.put(API.passwordchange, {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post(API.forgetpassword, { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await apiClient.post(API.resetpassword, { token, newPassword });
    return response.data;
  },

  sync: async (userId) => {
    const response = await apiClient.post(API.sync, { userId });
    return response.data;
  },

  uploadToCloud: async (driveType) => {
    const response = await apiClient.post(API.uploadcloud, { driveType });
    return response.data;
  },
};

