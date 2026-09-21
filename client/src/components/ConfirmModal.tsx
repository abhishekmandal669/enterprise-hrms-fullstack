import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20',
          icon: <AlertTriangle className="w-5 h-5" />,
        };
      case 'primary':
        return {
          iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800',
          confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20',
          icon: <Info className="w-5 h-5" />,
        };
      case 'danger':
      default:
        return {
          iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20',
          icon: <Trash2 className="w-5 h-5" />,
        };
    }
  };

  const styles = getVariantStyles();

  return createPortal(
    <div
      onClick={!isLoading ? onCancel : undefined}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 transform transition-all animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-2xl shrink-0 ${styles.iconBg}`}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              {title}
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {message}
            </p>
          </div>
          <button
            disabled={isLoading}
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-xl transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 ${styles.confirmBtn} disabled:opacity-50 cursor-pointer`}
          >
            {isLoading && (
              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
