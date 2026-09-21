import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { X, Megaphone, Send, ShieldAlert } from 'lucide-react';

interface CreateBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateBroadcastModal: React.FC<CreateBroadcastModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useSocket();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [targetType, setTargetType] = useState('ALL');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      addToast('Validation', 'Please provide headline and broadcast message.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/broadcasts', {
        title,
        content,
        priority,
        targetType
      });

      if (res.data.success) {
        addToast('Announcement Dispatched', 'Broadcast message sent successfully.', 'success');
        onSuccess();
        onClose();
        setTitle('');
        setContent('');
        setPriority('NORMAL');
      }
    } catch (err: any) {
      addToast('Dispatch Failed', err.response?.data?.message || 'Failed to dispatch broadcast.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold shadow-inner">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Publish Corporate Announcement</h3>
              <p className="text-xs text-indigo-200/70">Dispatches real-time WebSocket broadcast & in-app notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition focus:outline-hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 space-y-5 flex-1 overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Announcement Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Company All-Hands & Performance Appraisal Schedule"
                required
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              />
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="NORMAL">Normal Notice</option>
                <option value="HIGH">High Priority Notice</option>
                <option value="URGENT">🚨 Urgent (Forces Screen Modal)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              >
                <option value="ALL">All Organization (Global Staff)</option>
                <option value="ENGINEERING">Engineering Department</option>
                <option value="SALES">Sales & Business Development</option>
                <option value="HR">HR & Operations</option>
              </select>
            </div>
          </div>

          {priority === 'URGENT' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Urgent announcements trigger an immediate popup dialog for all logged-in personnel.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
              Broadcast Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the complete corporate communication details..."
              required
              className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 leading-relaxed font-sans"
            />
          </div>

          </div>

          <div className="shrink-0 px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Announcement'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
};
