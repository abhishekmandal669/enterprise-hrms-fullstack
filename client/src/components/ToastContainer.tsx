import React from 'react';
import { useSocket } from '../context/SocketContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useSocket();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let Icon = Info;
        let borderClass = 'border-l-4 border-indigo-500';
        let iconColor = 'text-indigo-500';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderClass = 'border-l-4 border-emerald-500';
          iconColor = 'text-emerald-500';
        } else if (toast.type === 'warning') {
          Icon = AlertTriangle;
          borderClass = 'border-l-4 border-amber-500';
          iconColor = 'text-amber-500';
        } else if (toast.type === 'danger') {
          Icon = AlertCircle;
          borderClass = 'border-l-4 border-rose-500';
          iconColor = 'text-rose-500';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white dark:bg-slate-800 p-3.5 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 flex items-start gap-3 transition-all ${borderClass}`}
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              <strong className="block text-xs font-bold text-slate-900 dark:text-white">
                {toast.title}
              </strong>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-normal">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
