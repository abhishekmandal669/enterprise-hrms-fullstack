import React, { useState } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Lock, CheckCircle, ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface SetPasswordViewProps {
  token: string;
  onSuccess: () => void;
}

export const SetPasswordView: React.FC<SetPasswordViewProps> = ({ token, onSuccess }) => {
  const { addToast } = useSocket();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters long.';
      setErrorMessage(msg);
      addToast('Validation', msg, 'warning');
      return;
    }
    if (password !== confirmPassword) {
      const msg = 'Passwords do not match. Please verify.';
      setErrorMessage(msg);
      addToast('Validation', msg, 'warning');
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
        addToast('Account Activated', res.data.message || 'Your password has been successfully configured.', 'success');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid or expired invite token. Please request a new invite.';
      setErrorMessage(msg);
      addToast('Activation Failed', msg, 'danger');
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

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

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
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition cursor-pointer"
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (() => {
                const hasLength = password.length >= 8;
                const hasUpper = /[A-Z]/.test(password);
                const hasNumber = /[0-9]/.test(password);
                const hasSpecial = /[^A-Za-z0-9]/.test(password);
                const score = [hasLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
                const strengthColor = score <= 1 ? 'bg-rose-500' : score === 2 ? 'bg-amber-500' : score === 3 ? 'bg-blue-500' : 'bg-emerald-500';
                const strengthText = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';

                return (
                  <div className="mt-2 space-y-1.5 animate-in fade-in">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Security Strength:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{strengthText}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
                      <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(score / 4) * 100}%` }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                      <span className={hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                        {hasLength ? '✓' : '○'} 8+ characters
                      </span>
                      <span className={hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                        {hasUpper ? '✓' : '○'} 1 uppercase letter
                      </span>
                      <span className={hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                        {hasNumber ? '✓' : '○'} 1 number (0-9)
                      </span>
                      <span className={hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-slate-400'}>
                        {hasSpecial ? '✓' : '○'} 1 symbol (!@#$)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition p-1 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <p className={`mt-1 text-[11px] font-medium ${password === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                  {password === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || password.length < 8 || password !== confirmPassword}
                className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition cursor-pointer"
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
