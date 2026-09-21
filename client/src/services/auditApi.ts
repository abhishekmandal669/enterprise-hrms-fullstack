import api from './api';
import { AuditLogItem } from '../types';

export const auditApi = {
  getLogs: async (params?: { page?: number; limit?: number; action?: string; actorId?: string }) => {
    const res = await api.get<{
      success: boolean;
      data: {
        logs: AuditLogItem[];
        pagination: { total: number; page: number; limit: number; totalPages: number };
      };
    }>('/audit-logs', { params });
    return res.data;
  }
};

export default auditApi;
