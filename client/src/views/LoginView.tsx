import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Lock, Mail, ArrowRight, Shield } from 'lucide-react';
import api from '../services/api';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const { addToast } = useSocket();
  const [identifier, setIdentifier] = useState('vikramaditya.roy@lexvera.internal');
  const [password, setPassword] = useState('password123');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      addToast('Validation', 'Please enter email/code and password.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(identifier, password);
      if (res.success) {
        addToast('Login Successful', 'Welcome to Lexvera Enterprise HRMS.', 'success');
        onSuccess();
      } else {
        addToast('Authentication Failed', res.message || 'Invalid credentials.', 'danger');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    login(email, pass).then(res => {
      if (res.success) {
        addToast('Logged In', `Authenticated as ${email}`, 'success');
        onSuccess();
      }
    });
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/forgot-password', { email: forgotEmail });
      addToast('Instructions Sent', 'If the account exists, password reset instructions were dispatched.', 'info');
      setIsForgotOpen(false);
    } catch (err) {
      addToast('Error', 'Failed to submit reset request.', 'danger');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-lg shadow-indigo-500/30">
            L
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Lexvera Enterprise HRMS
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official Organization Portal & Operations Gateway
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-7 shadow-xl">
          
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
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@lexvera.internal, email or LEX-101"
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
                  onClick={() => setIsForgotOpen(true)}
                  className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition flex items-center justify-center gap-1.5"
            >
              <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Role Login Demo Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Quick Access — Demo Accounts
              </span>
              <span className="text-[10px] text-slate-400">Password: password123</span>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                onClick={() => handleQuickFill('vikramaditya.roy@lexvera.internal', 'password123')}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-600 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Vikramaditya Roy — Super Administrator</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">vikramaditya.roy@lexvera.internal</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('priya.narayanan@lexvera.internal', 'password123')}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-200 hover:text-amber-600 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Priya Narayanan — Engineering Manager</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">priya.narayanan@lexvera.internal</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('rahul.sharma@lexvera.internal', 'password123')}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-700 dark:text-slate-200 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-xl transition flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Rahul Sharma — Senior Frontend Engineer</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">rahul.sharma@lexvera.internal</span>
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5 text-[11px] text-slate-500">
            <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <strong>Role-Scoped Dynamic Workspace</strong>
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

            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <input
                type="text"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@lexvera.internal or email"
                required
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
                >
                  Send Reset Link
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
