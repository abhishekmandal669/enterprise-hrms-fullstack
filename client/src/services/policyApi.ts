import api from './api';
import { Shift, Holiday, GeofenceConfig } from '../types';

export const policyApi = {
  // Shifts
  getShifts: async () => {
    const res = await api.get<{ success: boolean; data: Shift[] }>('/policies/shifts');
    return res.data;
  },
  createShift: async (data: Partial<Shift>) => {
    const res = await api.post<{ success: boolean; message: string; data: Shift }>('/policies/shifts', data);
    return res.data;
  },
  updateShift: async (id: string, data: Partial<Shift>) => {
    const res = await api.put<{ success: boolean; message: string; data: Shift }>(`/policies/shifts/${id}`, data);
    return res.data;
  },
  deleteShift: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/policies/shifts/${id}`);
    return res.data;
  },

  // Holidays
  getHolidays: async () => {
    const res = await api.get<{ success: boolean; data: Holiday[] }>('/holidays');
    return res.data;
  },
  createHoliday: async (data: Partial<Holiday>) => {
    const res = await api.post<{ success: boolean; message: string; data: Holiday }>('/holidays', data);
    return res.data;
  },
  deleteHoliday: async (id: string) => {
    const res = await api.delete<{ success: boolean; message: string }>(`/holidays/${id}`);
    return res.data;
  },

  // Geofence
  getGeofence: async () => {
    const res = await api.get<{ success: boolean; data: GeofenceConfig }>('/policies/geofence');
    return res.data;
  },
  updateGeofence: async (data: Partial<GeofenceConfig>) => {
    const res = await api.put<{ success: boolean; message: string; data: GeofenceConfig }>('/policies/geofence', data);
    return res.data;
  },

  // Leave policies
  getLeavePolicies: async () => {
    const res = await api.get<{ success: boolean; data: any[] }>('/policies/leave-policies');
    return res.data;
  },
  updateLeavePolicy: async (id: string, data: any) => {
    const res = await api.put<{ success: boolean; message: string; data: any }>(`/policies/leave-policies/${id}`, data);
    return res.data;
  }
};

export default policyApi;
