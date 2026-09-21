import api from './api';

export const reportsApi = {
  exportAttendanceCsv: async (params?: { startDate?: string; endDate?: string; departmentId?: string }) => {
    return api.get('/reports/attendance/export', {
      params,
      responseType: 'blob'
    });
  },

  exportLeavesCsv: async () => {
    return api.get('/reports/leaves/export', {
      responseType: 'blob'
    });
  },

  exportEmployeesCsv: async () => {
    return api.get('/reports/employees/export', {
      responseType: 'blob'
    });
  }
};

export default reportsApi;
