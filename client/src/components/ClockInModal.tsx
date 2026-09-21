import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Building2, Home, CheckCircle2, ShieldCheck, Laptop, Clock, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { useAttendance } from '../context/AttendanceContext';

interface ClockInModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
}

export const ClockInModal: React.FC<ClockInModalProps> = ({ isOpen, onClose, userName }) => {
  const { clockIn, punchLoading } = useAttendance();
  const [selectedMode, setSelectedMode] = useState<'OFFICE' | 'REMOTE'>('OFFICE');

  if (!isOpen) return null;

  const handleConfirmClockIn = async () => {
    if (navigator.geolocation && selectedMode === 'OFFICE') {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          await clockIn(selectedMode, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          onClose();
        },
        async () => {
          await clockIn(selectedMode);
          onClose();
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      await clockIn(selectedMode);
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-950/75 backdrop-blur-md flex min-h-screen items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-indigo-500/20 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="shrink-0 relative p-6 sm:p-7 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50">
          <button
            onClick={onClose}
            disabled={punchLoading}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition focus:outline-hidden"
            aria-label="Close Modal"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-2.5">
            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Live Attendance Verification</span>
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Where are you working today?
          </h2>
          <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 leading-relaxed">
            Welcome, <strong className="text-white font-semibold">{userName || 'Team Member'}</strong>. Select your primary work mode to initiate your shift session.
          </p>
        </div>

        {/* Modal Body: Location Options */}
        <div className="p-6 sm:p-7 space-y-4 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* 1. Office Option Card */}
            <div
              onClick={() => setSelectedMode('OFFICE')}
              className={`relative cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 text-left group flex flex-col justify-between ${
                selectedMode === 'OFFICE'
                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-lg shadow-indigo-500/15 ring-2 ring-indigo-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`p-3 rounded-xl transition duration-200 ${
                    selectedMode === 'OFFICE'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-4 ring-indigo-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-105'
                  }`}>
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  {selectedMode === 'OFFICE' ? (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700" />
                  )}
                </div>

                <strong className="block text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Office (HQ On-Site)
                </strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Working physically inside corporate headquarters via enterprise high-speed network.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-100/60 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>HQ Geofence Verified</span>
              </div>
            </div>

            {/* 2. Work From Home Option Card */}
            <div
              onClick={() => setSelectedMode('REMOTE')}
              className={`relative cursor-pointer p-5 rounded-2xl border-2 transition-all duration-200 text-left group flex flex-col justify-between ${
                selectedMode === 'REMOTE'
                  ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between mb-3.5">
                  <div className={`p-3 rounded-xl transition duration-200 ${
                    selectedMode === 'REMOTE'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-4 ring-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-105'
                  }`}>
                    <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  {selectedMode === 'REMOTE' ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-700" />
                  )}
                </div>

                <strong className="block text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Work From Home
                </strong>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Remote session. Your live avatar will be visible in the WFH roster on the dashboard.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-100/60 dark:border-slate-800/80 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <Laptop className="w-3.5 h-3.5 shrink-0" />
                <span>Remote VPN Enabled</span>
              </div>
            </div>

          </div>

          {/* Policy Information Pill */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="leading-snug">
              <span className="font-semibold text-slate-900 dark:text-slate-100">Standard Shift Window:</span> 09:00 AM &ndash; 06:00 PM (15m grace period). Work hours are computed automatically.
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="shrink-0 p-6 sm:p-7 py-4 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-start sm:self-center">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>Mode: <strong className="text-slate-800 dark:text-slate-200 font-bold">{selectedMode === 'OFFICE' ? 'Office (HQ)' : 'Work From Home'}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={punchLoading}
              className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmClockIn}
              disabled={punchLoading}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition-all transform active:scale-95 disabled:opacity-50 ${
                selectedMode === 'REMOTE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 hover:shadow-emerald-600/40'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:shadow-indigo-600/40'
              }`}
            >
              {punchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Clocking In...</span>
                </>
              ) : (
                <>
                  <span>Confirm Clock In ({selectedMode === 'REMOTE' ? 'WFH' : 'Office'})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
