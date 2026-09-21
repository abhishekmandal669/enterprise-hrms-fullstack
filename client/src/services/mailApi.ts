import api from './api';

export interface MailDirectoryUser {
  id: string;
  firstName: string;
  lastName: string;
  officialEmail?: string;
  email: string;
  role: string;
  designation: string;
  avatarUrl?: string;
  department?: {
    name: string;
    code: string;
  };
}

export interface EmailAttachment {
  id?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface InternalEmailItem {
  id: string;
  recipientRecordId?: string;
  threadId: string;
  subject: string;
  snippet: string;
  body: string;
  category: 'GENERAL' | 'ANNOUNCEMENT' | 'LEAVE' | 'ATTENDANCE' | 'TIMESHEET' | 'POLICY';
  isSystemEmail: boolean;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    officialEmail?: string;
    email?: string;
    role: string;
    designation: string;
    avatarUrl?: string;
  };
  recipients?: Array<{
    id: string;
    recipientType: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      officialEmail?: string;
    };
  }>;
  recipientType?: string;
  isRead?: boolean;
  readAt?: string;
  isStarred?: boolean;
  attachments?: EmailAttachment[];
  createdAt: string;
  type?: 'RECEIVED' | 'SENT';
}

export interface SendMailPayload {
  toUserIds: string[];
  ccUserIds?: string[];
  bccUserIds?: string[];
  subject: string;
  body: string;
  category?: 'GENERAL' | 'ANNOUNCEMENT' | 'LEAVE' | 'ATTENDANCE' | 'TIMESHEET' | 'POLICY';
  threadId?: string;
  attachments?: EmailAttachment[];
}

export const mailApi = {
  getUnreadCount: async (): Promise<number> => {
    const res = await api.get('/mail/unread-count');
    return res.data?.data?.unreadCount || 0;
  },

  getDirectory: async (search: string = ''): Promise<MailDirectoryUser[]> => {
    const res = await api.get('/mail/directory', { params: { search } });
    return res.data?.data || [];
  },

  getInbox: async (params?: { category?: string; search?: string; unread?: boolean; page?: number }): Promise<{
    emails: InternalEmailItem[];
    pagination: { total: number; page: number; totalPages: number };
  }> => {
    const res = await api.get('/mail/inbox', { params });
    return {
      emails: res.data?.data || [],
      pagination: res.data?.pagination || { total: 0, page: 1, totalPages: 1 }
    };
  },

  getSent: async (params?: { search?: string; page?: number }): Promise<{
    emails: InternalEmailItem[];
    pagination: { total: number; page: number; totalPages: number };
  }> => {
    const res = await api.get('/mail/sent', { params });
    return {
      emails: res.data?.data || [],
      pagination: res.data?.pagination || { total: 0, page: 1, totalPages: 1 }
    };
  },

  getStarred: async (): Promise<InternalEmailItem[]> => {
    const res = await api.get('/mail/starred');
    return res.data?.data || [];
  },

  getDrafts: async (): Promise<InternalEmailItem[]> => {
    const res = await api.get('/mail/drafts');
    return res.data?.data || [];
  },

  getTrash: async (): Promise<InternalEmailItem[]> => {
    const res = await api.get('/mail/trash');
    return res.data?.data || [];
  },

  getEmailById: async (id: string): Promise<InternalEmailItem> => {
    const res = await api.get(`/mail/${id}`);
    return res.data?.data;
  },

  sendEmail: async (payload: SendMailPayload): Promise<any> => {
    const res = await api.post('/mail/send', payload);
    return res.data;
  },

  saveDraft: async (payload: { draftId?: string; subject: string; body: string }): Promise<any> => {
    const res = await api.post('/mail/draft', payload);
    return res.data;
  },

  toggleStar: async (id: string): Promise<boolean> => {
    const res = await api.patch(`/mail/${id}/star`);
    return res.data?.isStarred;
  },

  toggleTrash: async (id: string): Promise<string> => {
    const res = await api.patch(`/mail/${id}/trash`);
    return res.data?.message;
  },

  markRead: async (id: string, isRead: boolean): Promise<boolean> => {
    const res = await api.patch(`/mail/${id}/read`, { isRead });
    return res.data?.isRead;
  },

  deletePermanently: async (id: string): Promise<string> => {
    const res = await api.delete(`/mail/${id}`);
    return res.data?.message;
  }
};
