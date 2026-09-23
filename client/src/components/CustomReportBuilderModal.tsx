import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Download, CheckSquare, Square, Eye, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

interface CustomReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomReportBuilderModal: React.FC<CustomReportBuilderModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addToast } = useSocket();

  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<string>('EMPLOYEES');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Fetch available modules and columns
  useEffect(() => {
    if (isOpen) {
      api.get('/reports/custom/modules')
        .then(res => {
          if (res.data.success) {
            setModules(res.data.data);
            if (res.data.data.length > 0) {
              const defaultMod = res.data.data[0];
              setSelectedModule(defaultMod.id);
              setSelectedColumns(defaultMod.availableColumns.map((c: any) => c.key));
            }
          }
        })
        .catch(err => {
          console.error(err);
        });
    }
  }, [isOpen]);

  // When module changes, select all columns of new module by default
  const handleModuleChange = (moduleId: string) => {
    setSelectedModule(moduleId);
    const mod = modules.find(m => m.id === moduleId);
    if (mod) {
      setSelectedColumns(mod.availableColumns.map((c: any) => c.key));
    }
    setPreviewRows([]);
  };

  const toggleColumn = (colKey: string) => {
    if (selectedColumns.includes(colKey)) {
      if (selectedColumns.length === 1) {
        addToast('Warning', 'At least one column must be selected', 'warning');
        return;
      }
      setSelectedColumns(selectedColumns.filter(k => k !== colKey));
    } else {
      setSelectedColumns([...selectedColumns, colKey]);
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    const mod = modules.find(m => m.id === selectedModule);
    if (!mod) return;
    if (selectAll) {
      setSelectedColumns(mod.availableColumns.map((c: any) => c.key));
    } else {
      setSelectedColumns([mod.availableColumns[0].key]);
    }
  };

  // Generate Preview
  const handlePreview = async () => {
    try {
      setLoadingPreview(true);
      const res = await api.post('/reports/custom/preview', {
        module: selectedModule,
        columns: selectedColumns
      });
      if (res.data.success) {
        setPreviewRows(res.data.data.preview);
        addToast('Preview Loaded', `Loaded ${res.data.data.totalRows} records`, 'success');
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to generate preview', 'danger');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Export CSV
  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const res = await api.post('/reports/custom/export', {
        module: selectedModule,
        columns: selectedColumns,
        filename: `nexus_${selectedModule.toLowerCase()}_report`
      }, {
        responseType: 'blob'
      });

      // Trigger browser download
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_${selectedModule.toLowerCase()}_report_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      addToast('Export Complete', 'Custom CSV report generated and downloaded.', 'success');
    } catch (err: any) {
      addToast('Error', 'Failed to download report', 'danger');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const activeModuleObj = modules.find(m => m.id === selectedModule);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Custom Enterprise Report Builder
              </h2>
              <p className="text-xs text-slate-500">
                Select datasets, choose custom column projections, preview live records, and export to CSV
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Module Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              1. Select Domain Module
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {modules.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => handleModuleChange(mod.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    selectedModule === mod.id
                      ? 'bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-500 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold block">{mod.id}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 block mt-0.5">
                    {mod.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Column Selection */}
          {activeModuleObj && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  2. Choose Column Fields ({selectedColumns.length} Selected)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => handleSelectAll(true)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <button
                    onClick={() => handleSelectAll(false)}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                {activeModuleObj.availableColumns.map((col: any) => {
                  const isChecked = selectedColumns.includes(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => toggleColumn(col.key)}
                      className={`p-2 rounded-lg border cursor-pointer select-none transition flex items-center gap-2 text-xs ${
                        isChecked
                          ? 'bg-white dark:bg-slate-900 border-indigo-400 text-slate-900 dark:text-white font-medium shadow-2xs'
                          : 'bg-transparent border-transparent text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className="line-clamp-1">{col.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions & Preview Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handlePreview}
              disabled={loadingPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition"
            >
              {loadingPreview ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Eye className="w-4 h-4 text-indigo-600" />
              )}
              <span>Fetch Live Preview</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Download Full CSV Export</span>
            </button>
          </div>

          {/* Live Data Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                Live Data Preview (Top {previewRows.length} Rows)
              </span>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold uppercase text-[10px]">
                    <tr>
                      {selectedColumns.map(colKey => {
                        const colMeta = activeModuleObj?.availableColumns.find((c: any) => c.key === colKey);
                        return (
                          <th key={colKey} className="py-2.5 px-4 whitespace-nowrap">
                            {colMeta?.label || colKey}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        {selectedColumns.map(colKey => (
                          <td key={colKey} className="py-2 px-4 whitespace-nowrap">
                            {String(row[colKey] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
