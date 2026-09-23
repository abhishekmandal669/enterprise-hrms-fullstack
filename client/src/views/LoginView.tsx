import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Lock, Mail, ArrowRight, Shield, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const { addToast } = useSocket();
  const [identifier, setIdentifier] = useState('admin@nexus.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password) {
      const msg = 'Please enter both your email/employee code and password.';
      setErrorMessage(msg);
      addToast('Validation Error', msg, 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(identifier.trim(), password);
      if (res.success) {
        setSuccessMessage('Authentication successful! Opening workspace...');
        addToast('Login Successful', 'Welcome to Nexus Enterprise HRMS.', 'success');
        setTimeout(() => {
          onSuccess();
        }, 400);
      } else {
        const msg = res.message || 'Invalid email, employee code, or password. Please verify your credentials.';
        setErrorMessage(msg);
        addToast('Authentication Failed', msg, 'danger');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Server connection error. Please ensure the backend is running.';
      setErrorMessage(msg);
      addToast('System Error', msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = async (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const res = await login(email, pass);
      if (res.success) {
        setSuccessMessage(`Authenticated successfully as ${email}`);
        addToast('Login Successful', `Welcome, authenticated as ${email}`, 'success');
        setTimeout(() => {
          onSuccess();
        }, 400);
      } else {
        const msg = res.message || `Demo account for ${email} could not be authenticated.`;
        setErrorMessage(msg);
        addToast('Authentication Failed', msg, 'danger');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Network error while attempting quick login.';
      setErrorMessage(msg);
      addToast('System Error', msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);
    if (!forgotEmail.trim()) {
      setForgotStatus({ type: 'error', message: 'Please enter your registered email address.' });
      return;
    }

    try {
      setIsForgotSubmitting(true);
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotStatus({
        type: 'success',
        message: 'Password reset instructions dispatched if account exists.'
      });
      addToast('Instructions Sent', 'If the account exists, password reset instructions were dispatched.', 'info');
      setTimeout(() => {
        setIsForgotOpen(false);
        setForgotStatus(null);
        setForgotEmail('');
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit password reset request.';
      setForgotStatus({ type: 'error', message: msg });
      addToast('Error', msg, 'danger');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-lg shadow-indigo-500/30">
            N
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Nexus Enterprise HRMS
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official Organization Portal & Operations Gateway
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-xl">
          
          {/* Prominent Inline Alert Message (Error) */}
          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-xs font-medium animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Authentication Error</span>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {/* Prominent Inline Alert Message (Success) */}
          {successMessage && (
            <div className="mb-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-xs font-medium animate-in fade-in slide-in-from-top-1">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Success</span>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Official Company Email, Account Email or Code
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="admin@nexus.com, email or emp code"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    setForgotStatus(null);
                  }}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
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
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none transition p-1 rounded-md"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick 1-Click Role Login Demo Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                QUICK ACCESS — DEMO ACCOUNTS
              </span>
              <span className="text-[10px] text-slate-400">Password: password123</span>
            </div>

            <div className="space-y-1.5">
              {/* Super Admin */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickFill('admin@nexus.com', 'password123')}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-600 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Vikramaditya Roy — Super Administrator</span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-purple-500 font-mono">admin@nexus.com</span>
              </button>

              {/* Engineering Manager */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickFill('manager@nexus.com', 'password123')}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Priya Narayanan — Engineering Manager</span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-amber-500 font-mono">manager@nexus.com</span>
              </button>

              {/* Senior Frontend Engineer */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleQuickFill('employee@nexus.com', 'password123')}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-between group cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rahul Sharma — Senior Frontend Engineer</span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-emerald-500 font-mono">employee@nexus.com</span>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-500">
            <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-700 dark:text-slate-300">Role-Scoped Dynamic Workspace</strong>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Each login automatically scopes permissions, dashboard metrics, and approval authorizations.
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && createPortal(
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Reset Password</h3>
            <p className="text-xs text-slate-500 mb-4">Enter your official company email to receive reset instructions.</p>

            {forgotStatus && (
              <div className={`mb-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                forgotStatus.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
              }`}>
                {forgotStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{forgotStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="text"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@nexus.internal or email"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isForgotSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Send Reset Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
