import React from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ShieldCheck } from 'lucide-react';

interface ModernLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export const ModernLoader: React.FC<ModernLoaderProps> = ({
  message = 'Loading Nexus Workspace...',
  subMessage = 'Synchronizing real-time enterprise session & permissions',
  fullScreen = false
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center text-center p-8 select-none">
      {/* Visual Ring Spinner with Brand Core */}
      <div className="relative w-20 h-20 flex items-center justify-center mb-6">
        {/* Outer ambient glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo-600/30 via-violet-600/20 to-cyan-400/30 blur-xl animate-pulse" />

        {/* Outer rotating ring */}
        <div className="absolute inset-0 rounded-full border-[3px] border-indigo-500/20 border-t-indigo-600 dark:border-indigo-400/20 dark:border-t-indigo-400 animate-spin" />

        {/* Inner reverse rotating ring */}
        <div className="absolute inset-2 rounded-full border-[2.5px] border-violet-500/20 border-b-violet-500 dark:border-violet-400/20 dark:border-b-violet-400 animate-spin [animation-direction:reverse] [animation-duration:1.2s]" />

        {/* Core Brand Emblem */}
        <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-500/30">
          N
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-slate-900 animate-ping" />
        </div>
      </div>

      {/* Brand Label */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
          Nexus Enterprise
        </span>
        <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
      </div>

      {/* Primary Message */}
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
        {message}
      </h3>

      {/* Subtitle */}
      {subMessage && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
          {subMessage}
        </p>
      )}

      {/* Security Assurance Tag */}
      <div className="mt-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[10.5px] text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-3 h-3 text-emerald-500" />
        <span>TLS 1.3 End-to-End Encrypted Session</span>
      </div>
    </div>
  );

  if (fullScreen) {
    return createPortal(
      <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-opacity">
        <div className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-indigo-500/10 backdrop-blur-xl">
          {content}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="w-full py-12 flex items-center justify-center">
      {content}
    </div>
  );
};
