import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  pageSize: number;
  totalEntries: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  pageSize,
  totalEntries,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const startEntry = totalEntries > 0 ? (validCurrentPage - 1) * pageSize + 1 : 0;
  const endEntry = Math.min(validCurrentPage * pageSize, totalEntries);

  // Dynamic 5 numbered page buttons with boundary protection
  const maxButtons = 5;
  const pageNumbers: number[] = [];
  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    if (validCurrentPage <= 3) {
      pageNumbers.push(1, 2, 3, 4, 5);
    } else if (validCurrentPage >= totalPages - 2) {
      for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      for (let i = validCurrentPage - 2; i <= validCurrentPage + 2; i++) pageNumbers.push(i);
    }
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs ${className}`}>
      {/* Left: Entry Counter & Configurable Rows-Per-Page Selector (10, 25, 50, 100) */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-slate-500 dark:text-slate-400 font-medium">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num">{startEntry}</span> to{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num">{endEntry}</span> of{' '}
          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num">{totalEntries}</span> entries
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
          <span className="text-[10px] font-semibold text-slate-400 pl-1.5 pr-0.5">Rows:</span>
          {pageSizeOptions.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => {
                onPageSizeChange(sz);
                onPageChange(1);
              }}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-lg transition ${
                pageSize === sz
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Chevrons & Numbered Page Navigation */}
      <div className="flex items-center gap-1 self-end sm:self-auto">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageNumbers.map((pNum) => (
          <button
            key={pNum}
            type="button"
            onClick={() => onPageChange(pNum)}
            className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition font-mono-num ${
              validCurrentPage === pNum
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {pNum}
          </button>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
