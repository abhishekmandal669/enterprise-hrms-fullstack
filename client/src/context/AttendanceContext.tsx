import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

export type PunchState = 'NOT_CLOCKED_IN' | 'WORKING' | 'ON_BREAK' | 'DONE';

interface AttendanceContextType {
  punchState: PunchState;
  workSeconds: number;
  breakSeconds: number;
  isLate: boolean;
  status: string;
  workMode: string;
  clockInTime: string | null;
  clockOutTime: string | null;
  punchLoading: boolean;
  formatTimer: (secs: number) => string;
  clockIn: (workMode?: 'OFFICE' | 'REMOTE', coords?: { latitude: number; longitude: number }) => Promise<void>;
  clockOut: () => Promise<void>;
  toggleBreak: () => Promise<void>;
  refreshPunch: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addToast, socket } = useSocket();

  const [punchState, setPunchState] = useState<PunchState>('NOT_CLOCKED_IN');
  const [workSeconds, setWorkSeconds] = useState(0);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [isLate, setIsLate] = useState(false);
  const [status, setStatus] = useState('NOT_CLOCKED_IN');
  const [workMode, setWorkMode] = useState<string>('OFFICE');
  const [clockInTime, setClockInTime] = useState<string | null>(null);
  const [clockOutTime, setClockOutTime] = useState<string | null>(null);
  const [punchLoading, setPunchLoading] = useState(false);

  // Sync punch status from backend
  const refreshPunch = useCallback(async () => {
    if (!user) {
      setPunchState('NOT_CLOCKED_IN');
      setWorkSeconds(0);
      setBreakSeconds(0);
      return;
    }

    try {
      const res = await api.get('/attendance/today');
      if (res.data.success) {
        const d = res.data.data;
        if (!d.isClockedIn && !d.clockOutTime) {
          setPunchState('NOT_CLOCKED_IN');
        } else if (d.clockOutTime) {
          setPunchState('DONE');
        } else if (d.isOnBreak) {
          setPunchState('ON_BREAK');
        } else {
          setPunchState('WORKING');
        }

        setIsLate(d.status === 'LATE');
        setStatus(d.status || 'NOT_CLOCKED_IN');
        setWorkMode(d.workMode || 'OFFICE');
        setClockInTime(d.clockInTime);
        setClockOutTime(d.clockOutTime);
        setWorkSeconds(d.elapsedSeconds || 0);
        setBreakSeconds(d.breakSeconds || 0);
      }
    } catch (err) {
      console.error('Failed to sync attendance state:', err);
    }
  }, [user]);

  useEffect(() => {
    refreshPunch();
  }, [refreshPunch]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => refreshPunch();
    socket.on('attendance:live_update', handleUpdate);
    return () => {
      socket.off('attendance:live_update', handleUpdate);
    };
  }, [socket, refreshPunch]);

  // Central Single Ticking Timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (punchState === 'WORKING') {
        setWorkSeconds(prev => prev + 1);
      } else if (punchState === 'ON_BREAK') {
        setBreakSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [punchState]);

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const clockIn = async (selectedWorkMode: 'OFFICE' | 'REMOTE' = 'OFFICE', coords?: { latitude: number; longitude: number }) => {
    try {
      setPunchLoading(true);
      const res = await api.post('/attendance/clock-in', {
        workMode: selectedWorkMode,
        latitude: coords?.latitude,
        longitude: coords?.longitude
      });
      if (res.data.success) {
        const isLateArrival = res.data.data.status === 'LATE';
        addToast(
          isLateArrival ? 'Clocked In (Late Arrival)' : 'Clocked In (On-Time)',
          res.data.message,
          isLateArrival ? 'warning' : 'success'
        );
        await refreshPunch();
      }
    } catch (err: any) {
      addToast('Punch Failed', err.response?.data?.message || 'Error clocking in', 'danger');
    } finally {
      setPunchLoading(false);
    }
  };

  const clockOut = async () => {
    try {
      setPunchLoading(true);
      const res = await api.post('/attendance/clock-out');
      if (res.data.success) {
        addToast('Clocked Out', 'Your daily timesheet has been updated.', 'info');
        await refreshPunch();
      }
    } catch (err: any) {
      addToast('Punch Failed', err.response?.data?.message || 'Error clocking out', 'danger');
    } finally {
      setPunchLoading(false);
    }
  };

  const toggleBreak = async () => {
    try {
      setPunchLoading(true);
      const res = await api.post('/attendance/break');
      if (res.data.success) {
        addToast(
          res.data.isOnBreak ? 'Break Started' : 'Break Ended',
          res.data.message,
          res.data.isOnBreak ? 'warning' : 'success'
        );
        await refreshPunch();
      }
    } catch (err: any) {
      addToast('Action Failed', err.response?.data?.message || 'Error updating break', 'danger');
    } finally {
      setPunchLoading(false);
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        punchState,
        workSeconds,
        breakSeconds,
        isLate,
        status,
        workMode,
        clockInTime,
        clockOutTime,
        punchLoading,
        formatTimer,
        clockIn,
        clockOut,
        toggleBreak,
        refreshPunch
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (!context) throw new Error('useAttendance must be used within AttendanceProvider');
  return context;
};
