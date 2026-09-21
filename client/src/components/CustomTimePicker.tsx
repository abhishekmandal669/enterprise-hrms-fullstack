import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';

export interface CustomTimePickerProps {
  value: string; // "HH:mm" (e.g. "09:30")
  onChange: (val: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placement?: 'auto' | 'top' | 'bottom';
  id?: string;
}

const COMMON_PRESETS = [
  '09:00', '09:30', '10:00', '10:30',
  '13:00', '13:30', '14:00', '17:00',
  '18:00', '18:30', '19:00', '20:00'
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value = '09:30',
  onChange,
  disabled = false,
  className = '',
  placement = 'auto',
  id
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [computedPlacement, setComputedPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const hoursColRef = useRef<HTMLDivElement>(null);
  const minutesColRef = useRef<HTMLDivElement>(null);

  const [currentH, currentM] = (value && value.includes(':') ? value.split(':') : ['09', '30']).map(s => s.trim().padStart(2, '0'));

  // Calculate space above/below to auto-flip
  const updatePlacement = () => {
    if (!containerRef.current) return;
    if (placement === 'top' || placement === 'bottom') {
      setComputedPlacement(placement);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < 260 && spaceAbove > spaceBelow) {
      setComputedPlacement('top');
    } else {
      setComputedPlacement('bottom');
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePlacement();
      window.addEventListener('resize', updatePlacement);
      window.addEventListener('scroll', updatePlacement, true);
    }
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen, placement]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active hour & minute into view when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const activeHourEl = hoursColRef.current?.querySelector('[data-active="true"]') as HTMLElement;
        activeHourEl?.scrollIntoView({ block: 'center' });

        const activeMinEl = minutesColRef.current?.querySelector('[data-active="true"]') as HTMLElement;
        activeMinEl?.scrollIntoView({ block: 'center' });
      }, 50);
    }
  }, [isOpen]);

  const handleSelectHour = (h: string) => {
    onChange(`${h}:${currentM}`);
  };

  const handleSelectMinute = (m: string) => {
    onChange(`${currentH}:${m}`);
  };

  const handleSelectPreset = (preset: string) => {
    onChange(preset);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full text-left" id={id}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`
          w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-mono rounded-xl border transition-all select-none
          text-slate-800 dark:text-slate-100 font-semibold
          ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              : isOpen
              ? 'bg-white dark:bg-slate-800 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs'
              : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100/90 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
          }
          ${className}
        `}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="tracking-wider text-xs">{value || '09:30'}</span>
        </div>
        <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700/60">
          24h
        </span>
      </button>

      {/* Floating Modern TimePicker Panel */}
      {isOpen && (
        <div
          className={`
            absolute left-0 min-w-[280px] z-[120]
            ${
              computedPlacement === 'top'
                ? 'bottom-full mb-1.5 origin-bottom animate-in fade-in slide-in-from-bottom-2 duration-150'
                : 'top-full mt-1.5 origin-top animate-in fade-in slide-in-from-top-2 duration-150'
            }
            bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl
            shadow-xl shadow-slate-900/15 dark:shadow-black/60 overflow-hidden backdrop-blur-md p-3
          `}
        >
          {/* Header & Quick Shift Presets */}
          <div className="pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Quick Shift Presets
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {currentH}:{currentM}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {COMMON_PRESETS.map((p) => {
                const isSelected = value === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`
                      py-1 px-1.5 text-[11px] font-mono font-bold rounded-lg border transition text-center
                      ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                      }
                    `}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hour & Minute Column Selectors */}
          <div className="grid grid-cols-2 gap-2 text-center">
            {/* Hours Column */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Hours (HH)
              </span>
              <div
                ref={hoursColRef}
                className="max-h-40 overflow-y-auto space-y-1 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                {HOURS.map((h) => {
                  const isSelected = currentH === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-active={isSelected}
                      onClick={() => handleSelectHour(h)}
                      className={`
                        w-full py-1 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1
                        ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                        }
                      `}
                    >
                      <span>{h}</span>
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Minutes (MM)
              </span>
              <div
                ref={minutesColRef}
                className="max-h-40 overflow-y-auto space-y-1 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                {MINUTES.map((m) => {
                  const isSelected = currentM === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-active={isSelected}
                      onClick={() => handleSelectMinute(m)}
                      className={`
                        w-full py-1 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1
                        ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60'
                        }
                      `}
                    >
                      <span>{m}</span>
                      {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Done Button */}
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Selected: <strong className="text-slate-800 dark:text-slate-200 font-mono font-bold">{currentH}:{currentM}</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
