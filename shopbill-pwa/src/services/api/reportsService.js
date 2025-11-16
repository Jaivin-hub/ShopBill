// Reports API Service
import apiClient from '../../lib/apiClient';
import API from '../../config/api';

export const reportsService = {
  getSummary: async (startDate, endDate) => {
    const response = await apiClient.get(API.reportsSummary, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  getChartData: async (startDate, endDate, viewType = 'day') => {
    const response = await apiClient.get(API.reportsChartData, {
      params: { startDate, endDate, viewType },
    });
    return response.data;
  },
};

