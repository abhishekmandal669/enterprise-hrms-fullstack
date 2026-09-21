import React, { useState } from 'react';
import { X, Calendar, Clock, Video, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: any;
  onSuccess: () => void;
}

export const ScheduleInterviewModal: React.FC<ScheduleInterviewModalProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess
}) => {
  const { addToast } = useSocket();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    interviewType: 'TECHNICAL',
    scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    scheduledTime: '14:30',
    durationMinutes: 45,
    meetingLink: 'https://meet.google.com/lex-interview-round'
  });

  if (!isOpen || !application) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const fullScheduledAt = `${formData.scheduledDate}T${formData.scheduledTime}:00Z`;

      const res = await api.post('/recruitment/interviews', {
        applicationId: application.id,
        interviewType: formData.interviewType,
        scheduledAt: fullScheduledAt,
        durationMinutes: formData.durationMinutes,
        meetingLink: formData.meetingLink
      });

      if (res.data.success) {
        addToast('Interview Scheduled', `Round confirmed for ${application.candidate?.fullName}`, 'success');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to schedule interview', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Schedule Interview Round
            </h3>
            <p className="text-xs text-slate-500">
              Candidate: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{application.candidate?.fullName}</span> ({application.job?.title})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Interview Type / Round
            </label>
            <select
              value={formData.interviewType}
              onChange={e => setFormData({ ...formData, interviewType: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SCREENING">Initial HR Screening</option>
              <option value="TECHNICAL">Technical Architecture & Coding</option>
              <option value="MANAGERIAL">Managerial & Behavioral Fit</option>
              <option value="EXECUTIVE">Executive / Culture Round</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                Date
              </label>
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                Time (IST)
              </label>
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={e => setFormData({ ...formData, scheduledTime: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Duration (Minutes)
              </label>
              <select
                value={formData.durationMinutes}
                onChange={e => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                <Video className="w-3.5 h-3.5 inline mr-1 text-indigo-600" />
                Meeting Link
              </label>
              <input
                type="url"
                value={formData.meetingLink}
                onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm transition disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm & Send Calendar Invite</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
