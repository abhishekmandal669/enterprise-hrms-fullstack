import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  eventType: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead
}) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div onClick={onClose} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[99999]" />
      <div className="fixed top-0 right-0 bottom-0 w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-[99999] flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              {notifications.filter(n => !n.isRead).length} Unread
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
            >
              Mark All as Read
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No notifications at this time.
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border text-left transition ${
                  n.isRead
                    ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    : 'bg-indigo-50/40 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/80 text-slate-900 dark:text-slate-100'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <strong className="text-xs font-semibold">{n.title}</strong>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400 leading-normal">
                  {n.body}
                </p>
              </div>
            ))
          )}
        </div>

      </div>
    </>,
    document.body
  );
};
