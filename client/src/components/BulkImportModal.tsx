import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { X, UploadCloud, FileText, CheckCircle, AlertTriangle } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useSocket();
  const [csvText, setCsvText] = useState(`firstName,lastName,email,role,designation
Suresh,Raina,suresh.r@nexus.com,EMPLOYEE,Quality Assurance Lead
Meenakshi,Sundaram,meenakshi.s@nexus.com,EMPLOYEE,Cloud Infrastructure Engineer
Rohan,Verma,rohan.v@nexus.com,EMPLOYEE,Product Designer`);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleParseAndImport = async () => {
    try {
      setIsSubmitting(true);
      const lines = csvText.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length <= 1) {
        addToast('CSV Empty', 'Please provide CSV rows with headers.', 'warning');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          rowObj[h] = values[idx] || '';
        });
        rows.push(rowObj);
      }

      const res = await api.post('/admin/employees/bulk-import', { rows });

      if (res.data.success) {
        setImportResult(res.data);
        addToast('Bulk Import Complete', res.data.message, 'success');
        onSuccess();
      }
    } catch (err: any) {
      addToast('Import Failed', err.response?.data?.message || 'Failed to process bulk import.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bulk CSV Employee Onboarding</h3>
              <p className="text-xs text-slate-500">Atomic import with row validation and 72h invite generation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {importResult ? (
          /* Result Summary */
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>{importResult.importedCount} employees onboarded successfully!</strong>
                <p className="text-[11px] opacity-80">72-hour invite tokens generated for each employee.</p>
              </div>
            </div>

            {importResult.failedCount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{importResult.failedCount} rows failed validation:</span>
                </div>
                <div className="max-h-40 overflow-y-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs space-y-1">
                  {importResult.errors.map((e: any, idx: number) => (
                    <div key={idx} className="text-rose-600 dark:text-rose-400 text-[11px]">
                      Row #{e.row} ({e.email}): {e.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Close & Refresh Directory
              </button>
            </div>
          </div>
        ) : (
          /* CSV Textarea Editor */
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Paste CSV raw data with headers (or edit sample below):</span>
                <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">firstName,lastName,email,role,designation</span>
              </div>

              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 leading-relaxed"
              />

              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <FileText className="w-4 h-4" />
                <span>Rows with duplicate emails or missing designations will be safely caught in the validation report.</span>
              </div>
            </div>

            <div className="shrink-0 px-6 py-3.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParseAndImport}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 disabled:opacity-50"
              >
                {isSubmitting ? 'Validating & Importing...' : 'Validate & Import Employees'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
