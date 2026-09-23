import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'danger' | 'info';
}

interface UrgentBroadcast {
  id: string;
  title: string;
  content: string;
  priority: string;
  author: string;
  time: string;
}

interface SocketContextType {
  socket: Socket | null;
  toasts: Toast[];
  urgentNotice: UrgentBroadcast | null;
  addToast: (title: string, message: string, type?: 'success' | 'warning' | 'danger' | 'info') => void;
  removeToast: (id: string) => void;
  clearUrgentNotice: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [urgentNotice, setUrgentNotice] = useState<UrgentBroadcast | null>(null);

  const playAudioChime = (type: string = 'info') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'danger' || type === 'urgent') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      } else {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
      }

      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio context might be restricted before user interaction
    }
  };

  const addToast = (title: string, message: string, type: 'success' | 'warning' | 'danger' | 'info' = 'info') => {
    playAudioChime(type);
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: Toast = { id, title, message, type };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const clearUrgentNotice = () => {
    setUrgentNotice(null);
    addToast('Notice Acknowledged', 'Official corporate notice acknowledged.', 'success');
  };

  useEffect(() => {
    if (!token) return;

    const socketEndpoint = import.meta.env.VITE_SOCKET_URL || undefined;
    const s = socketEndpoint
      ? io(socketEndpoint, { auth: { token }, query: { token } })
      : io({ auth: { token }, query: { token } });

    s.on('connect', () => {
      console.log('⚡ Connected to Nexus WebSocket Server');
    });

    s.on('notification:new', (data) => {
      addToast(data.title, data.message, 'info');
    });

    s.on('notification:alert', (data) => {
      addToast(data.title, data.message, 'warning');
    });

    s.on('broadcast:urgent_modal', (data) => {
      setUrgentNotice(data);
      addToast('🚨 URGENT NOTICE', data.title, 'danger');
    });

    s.on('broadcast:new', (data) => {
      addToast('📢 Corporate Announcement', data.title, 'info');
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token, user?.role]);

  return (
    <SocketContext.Provider value={{ socket, toasts, urgentNotice, addToast, removeToast, clearUrgentNotice }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
