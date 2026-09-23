import React from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../context/SocketContext';
import { Megaphone, AlertCircle } from 'lucide-react';

export const UrgentModal: React.FC = () => {
  const { urgentNotice, clearUrgentNotice } = useSocket();

  if (!urgentNotice) return null;

  try {
    const stored = JSON.parse(localStorage.getItem('nexus_acknowledged_urgents') || localStorage.getItem('lexvera_acknowledged_urgents') || '[]');
    if (urgentNotice.id && stored.includes(urgentNotice.id)) {
      return null;
    }
  } catch (e) {}

  const handleAcknowledge = () => {
    if (urgentNotice?.id) {
      try {
        const stored = JSON.parse(localStorage.getItem('nexus_acknowledged_urgents') || localStorage.getItem('lexvera_acknowledged_urgents') || '[]');
        if (!stored.includes(urgentNotice.id)) {
          stored.push(urgentNotice.id);
          localStorage.setItem('nexus_acknowledged_urgents', JSON.stringify(stored));
        }
      } catch (e) {}
    }
    clearUrgentNotice();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Top Warning Banner */}
        <div className="shrink-0 bg-rose-600 text-white text-center py-2 px-4 text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>OFFICIAL URGENT CORPORATE NOTICE FROM HR</span>
        </div>

        <div className="p-6 text-center flex-1 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
            <Megaphone className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {urgentNotice.title}
          </h2>

          <div className="flex items-center justify-center gap-2 my-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
              HIGH PRIORITY
            </span>
            <span className="text-xs text-slate-400">
              Published by {urgentNotice.author || 'HR Operations'}
            </span>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-left">
            {urgentNotice.content}
          </p>

          <button
            onClick={handleAcknowledge}
            className="w-full mt-6 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-indigo-500/20 transition"
          >
            I Have Acknowledged This Notice
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
