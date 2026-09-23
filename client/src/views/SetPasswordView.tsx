import React, { useState } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Lock, CheckCircle, ShieldCheck } from 'lucide-react';

interface SetPasswordViewProps {
  token: string;
  onSuccess: () => void;
}

export const SetPasswordView: React.FC<SetPasswordViewProps> = ({ token, onSuccess }) => {
  const { addToast } = useSocket();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      addToast('Validation', 'Password must be at least 8 characters long.', 'warning');
      return;
    }
    if (password !== confirmPassword) {
      addToast('Validation', 'Passwords do not match.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/auth/set-password', {
        token,
        password
      });

      if (res.data.success) {
        setActivated(true);
        addToast('Account Activated', res.data.message, 'success');
      }
    } catch (err: any) {
      addToast('Activation Failed', err.response?.data?.message || 'Invalid or expired invite token.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-8 shadow-xl">
        
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mx-auto mb-3 shadow-md shadow-indigo-500/30">
            N
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Welcome to Nexus Enterprise</h2>
          <p className="text-xs text-slate-500 mt-1">Set your password to activate your company account</p>
        </div>

        {activated ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Successfully Activated!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your corporate account is now <strong>ACTIVE</strong>. You can now login using your credentials.
              </p>
            </div>
            <button
              onClick={onSuccess}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition"
            >
              Proceed to Dashboard Login &rarr;
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password (Min 8 Characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Activating Account...' : 'Set Password & Activate'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
