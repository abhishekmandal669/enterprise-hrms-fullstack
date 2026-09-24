import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import {
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
  Clock,
  ShieldCheck,
  Building2,
  KeyRound,
  X,
  Sparkles,
  Fingerprint,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import api from '../services/api';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, verify2FA } = useAuth();
  const { addToast } = useSocket();
  const { theme, toggleTheme } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  // 2FA Verification State
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [temp2FAToken, setTemp2FAToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  // Discrete Demo Credentials helper state (collapsed by default)
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStatus, setForgotStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  // Real-time digital clock display
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const isValidEmailSyntax = !identifier.includes('@') || /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(identifier.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!identifier.trim() || !password) {
      const msg = 'Please enter both your corporate email / employee ID and password.';
      setErrorMessage(msg);
      addToast('Validation Error', msg, 'warning');
      return;
    }

    if (identifier.includes('@') && !isValidEmailSyntax) {
      const msg = 'Please enter a valid email format (e.g. employee@company.com).';
      setErrorMessage(msg);
      addToast('Invalid Email', msg, 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(identifier.trim(), password, rememberMe);
      if (res.success) {
        if (res.require2FA && res.tempToken) {
          setTemp2FAToken(res.tempToken);
          setIs2FAModalOpen(true);
          setTwoFactorCode('');
          setTwoFactorError(null);
          addToast('2FA Required', res.message || 'Please enter your 6-digit verification code.', 'info');
          return;
        }

        setSuccessMessage('Authentication verified! Loading your workspace...');
        addToast('Login Successful', 'Welcome to Nexus Enterprise HRMS.', 'success');
        setTimeout(() => {
          onSuccess();
        }, 400);
      } else {
        const msg = res.message || 'Invalid credentials. Please verify your email or password.';
        setErrorMessage(msg);
        addToast('Authentication Failed', msg, 'danger');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to connect to authorization server. Please verify backend service.';
      setErrorMessage(msg);
      addToast('System Error', msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!temp2FAToken || !twoFactorCode.trim()) {
      setTwoFactorError('Please enter your 6-digit verification code.');
      return;
    }

    try {
      setIsVerifying2FA(true);
      setTwoFactorError(null);
      const res = await verify2FA(temp2FAToken, twoFactorCode.trim(), rememberMe);
      if (res.success) {
        setIs2FAModalOpen(false);
        setSuccessMessage('Two-Factor authentication verified! Loading workspace...');
        addToast('2FA Verified', 'Welcome to Nexus Enterprise HRMS.', 'success');
        setTimeout(() => {
          onSuccess();
        }, 400);
      } else {
        setTwoFactorError(res.message || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      setTwoFactorError(err.response?.data?.message || 'Verification failed. Try again.');
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleQuickFill = (email: string, pass: string) => {
    setIdentifier(email);
    setPassword(pass);
    setErrorMessage(null);
    addToast('Credentials Filled', `Filled credentials for ${email}`, 'info');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus(null);
    if (!forgotEmail.trim()) {
      setForgotStatus({ type: 'error', message: 'Please enter your registered corporate email address.' });
      return;
    }

    try {
      setIsForgotSubmitting(true);
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotStatus({
        type: 'success',
        message: 'Password recovery dispatch initiated. If the account exists, instructions have been sent.'
      });
      addToast('Instructions Dispatched', 'Password reset instructions dispatched to your inbox.', 'info');
      setTimeout(() => {
        setIsForgotOpen(false);
        setForgotStatus(null);
        setForgotEmail('');
      }, 2400);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to submit password reset request.';
      setForgotStatus({ type: 'error', message: msg });
      addToast('Error', msg, 'danger');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">
      
      {/* Top Navigation Bar */}
      <header className="w-full px-6 py-3.5 flex items-center justify-between z-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/25 border border-indigo-400/30">
            <span className="text-white font-extrabold text-base tracking-wider font-mono">N</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">NEXUS ENTERPRISE</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 tracking-wide uppercase">
                HRMS Core
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Workforce Operations & Governance Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Node Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">All Systems Operational</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
              {currentTime || '00:00:00'}
            </span>
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </header>

      {/* Main Split Architecture */}
      <main className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-61px)]">
        
        {/* LEFT COLUMN: Deep Luxury Dark Showcase (Fixed Deep Colors for 100% Razor-Sharp Contrast) */}
        <div className="hidden lg:flex lg:col-span-7 xl:col-span-7 flex-col justify-between p-10 xl:p-14 relative overflow-hidden bg-[#0A0D14] border-r border-slate-800 text-white">
          
          {/* Subtle Ambient Glows and Grid */}
          <div className="absolute top-1/4 -left-16 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />

          {/* Left Top: Badge & Punchy Corporate Copy */}
          <div className="relative z-10 space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Next-Gen Workforce Operating System</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-tight">
                Architected for high-performance{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-purple-400">
                  Global Enterprises.
                </span>
              </h1>
              <p className="text-sm xl:text-base text-slate-300 leading-relaxed font-normal">
                Seamlessly unify employee directory, geofenced biometric attendance, automated payroll cycles, multi-level hierarchy approvals, and operational governance in one command center.
              </p>
            </div>

            {/* Feature Highlights Grid - Razor Sharp High Contrast */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              
              {/* Feature 1 */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md hover:border-indigo-400/40 hover:bg-white/[0.08] transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Smart Biometrics</h3>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Geofenced real-time punches with instant live status synchronization via Socket.IO.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md hover:border-purple-400/40 hover:bg-white/[0.08] transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">SOC 2 & Audit Trail</h3>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Immutable audit trails, 256-bit AES encryption & role-based least privilege governance.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md hover:border-sky-400/40 hover:bg-white/[0.08] transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Automated Payroll</h3>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Instant salary slip computation with tax breakdowns, leave deductions, and one-click dispatch.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-md hover:border-emerald-400/40 hover:bg-white/[0.08] transition duration-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Hierarchical Approvals</h3>
                </div>
                <p className="text-xs text-slate-300 leading-normal">
                  Multi-tier workflow routing for leave requests, timesheet validations, and profile edits.
                </p>
              </div>

            </div>
          </div>

          {/* Left Bottom: Operational Statistics Strip */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10">
            <div className="grid grid-cols-3 gap-6 mb-4">
              <div>
                <p className="text-2xl xl:text-3xl font-black text-white font-mono">50,000+</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Active Personnel</p>
              </div>
              <div>
                <p className="text-2xl xl:text-3xl font-black text-emerald-400 font-mono">99.99%</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Uptime SLA</p>
              </div>
              <div>
                <p className="text-2xl xl:text-3xl font-black text-indigo-400 font-mono">&lt; 120ms</p>
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Sync Latency</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-white/10">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Deployed across 32 Global Enterprise Data Centers
              </span>
              <span className="font-mono text-[11px] text-slate-400">TLS 1.3 Certified</span>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Authentication Terminal (Clean & Crisp in Light & Dark Mode) */}
        <div className="col-span-1 lg:col-span-5 xl:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 xl:p-12 relative bg-white dark:bg-slate-900 transition-colors">
          
          <div className="w-full max-w-md space-y-6">
            
            {/* Form Title & Welcome Banner */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-400 text-[11px] font-semibold">
                  <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Secure Workspace Gateway</span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">IAM Portal</span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Sign in to your account
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Enter your registered corporate email or employee ID to continue.
              </p>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Authentication Error</span>
                  <span className="text-rose-700 dark:text-rose-300/90">{errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-500 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 p-0.5 cursor-pointer"
                  title="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Success Notification Alert */}
            {successMessage && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in slide-in-from-top-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Authorization Confirmed</span>
                  <span className="text-emerald-700 dark:text-emerald-300/90">{successMessage}</span>
                </div>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Field 1: Work Email / Code */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Official Email or Employee Code
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="e.g. name@nexus.com or EMP-101"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-500/40 focus:border-indigo-600 dark:focus:border-indigo-500 transition shadow-xs font-medium"
                  />
                </div>
                {identifier.includes('@') && !isValidEmailSyntax && (
                  <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>Please enter a valid email format (e.g. employee@company.com)</span>
                  </p>
                )}
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotOpen(true);
                      setForgotStatus(null);
                    }}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    onKeyUp={(e) => {
                      if (e.getModifierState) {
                        setIsCapsLockOn(e.getModifierState('CapsLock'));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.getModifierState) {
                        setIsCapsLockOn(e.getModifierState('CapsLock'));
                      }
                    }}
                    placeholder="Enter account password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-indigo-500/40 focus:border-indigo-600 dark:focus:border-indigo-500 transition shadow-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus:outline-none cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {isCapsLockOn && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800/50">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Caps Lock is ON</span>
                  </div>
                )}
              </div>

              {/* Remember Me Checkbox & Security Info */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 focus:ring-indigo-500 transition cursor-pointer"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Keep me signed in</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  <span>256-Bit SSL</span>
                </span>
              </div>

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Credentials & Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Discrete Demo Credentials Accordion (Clean & Unobtrusive) */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                className="w-full flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer py-1"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Looking for demo test accounts?</span>
                </span>
                {showDemoCredentials ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDemoCredentials && (
                <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 animate-in fade-in slide-in-from-top-1 text-xs">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    Click any role to autofill credentials (Password: <code className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">password123</code>):
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('admin@nexus.com', 'password123')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left text-[11px] text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
                    >
                      👑 Super Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('hr@nexus.com', 'password123')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left text-[11px] text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
                    >
                      💼 HR Director
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('manager@nexus.com', 'password123')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left text-[11px] text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
                    >
                      👨‍💼 Engineering Mgr
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('employee@nexus.com', 'password123')}
                      className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-left text-[11px] text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
                    >
                      💻 Senior Engineer
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Corporate Compliance & Security Badges */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>SOC-2 & ISO 27001 Certified</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => addToast('Support Desk', 'IT Helpdesk: it-support@nexus.internal or contact your System Administrator.', 'info')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                >
                  Help Desk
                </button>
                <span>•</span>
                <span className="text-slate-400">Nexus Enterprise © 2026</span>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Forgot Password Modal (Portaled) */}
      {isForgotOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 text-slate-900 dark:text-slate-100">
            
            <button
              type="button"
              onClick={() => setIsForgotOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reset Account Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Enterprise Self-Service Recovery</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Enter your registered corporate email address. If the account exists in the corporate directory, a secure recovery token will be dispatched to your inbox.
            </p>

            {forgotStatus && (
              <div className={`mb-4 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 ${
                forgotStatus.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              }`}>
                {forgotStatus.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 dark:text-emerald-400 mt-0.5" />
                )}
                <span>{forgotStatus.message}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Corporate Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. employee@nexus.com"
                    required
                    className="w-full pl-10 pr-3 py-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsForgotOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  {isForgotSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Dispatch Reset Link</span>
                </button>
              </div>
            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Two-Factor Authentication (2FA) Challenge Modal (Portaled) */}
      {is2FAModalOpen && createPortal(
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[99999] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 text-slate-900 dark:text-slate-100">
            
            <button
              type="button"
              onClick={() => {
                setIs2FAModalOpen(false);
                setTemp2FAToken(null);
                setTwoFactorCode('');
                setTwoFactorError(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Security Verification</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Two-Factor Authentication Required</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              To complete sign-in, enter your 6-digit authentication code or emergency backup code for this account.
            </p>

            {twoFactorError && (
              <div className="mb-4 p-3.5 rounded-xl text-xs font-medium flex items-start gap-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400 mt-0.5" />
                <span>{twoFactorError}</span>
              </div>
            )}

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setTwoFactorCode(val);
                      if (twoFactorError) setTwoFactorError(null);
                    }}
                    placeholder="••••••"
                    required
                    className="w-full text-center py-3 text-2xl font-mono tracking-[0.5em] font-black bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-1.5">
                  Code refreshes automatically every 30 seconds
                </p>
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIs2FAModalOpen(false);
                    setTemp2FAToken(null);
                    setTwoFactorCode('');
                    setTwoFactorError(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying2FA || twoFactorCode.length < 6}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-indigo-600/30"
                >
                  {isVerifying2FA && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Verify & Login</span>
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
