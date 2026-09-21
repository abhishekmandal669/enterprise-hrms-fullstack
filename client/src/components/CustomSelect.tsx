import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  sublabel?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  value: string | number;
  onChange: (value: any) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  menuClassName?: string;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  align?: 'left' | 'right';
  placement?: 'auto' | 'top' | 'bottom';
  renderCustomOption?: (option: SelectOption) => React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
  menuClassName = '',
  size = 'md',
  icon,
  searchable,
  searchPlaceholder = 'Search...',
  id,
  align = 'left',
  placement = 'auto',
  renderCustomOption
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [computedPlacement, setComputedPlacement] = useState<'top' | 'bottom'>('bottom');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-flip: calculate space above and below trigger
  const updatePlacement = () => {
    if (!containerRef.current) return;
    if (placement === 'top' || placement === 'bottom') {
      setComputedPlacement(placement);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // If less than 240px space below and more space above, flip upwards!
    if (spaceBelow < 250 && spaceAbove > spaceBelow) {
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

  // Auto-enable search if more than 6 options unless explicitly turned off
  const isSearchable = searchable !== undefined ? searchable : options.length > 6;

  // Selected Option
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Filtered Options based on search
  const filteredOptions = options.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && isSearchable) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    if (isOpen) {
      const idx = filteredOptions.findIndex((opt) => String(opt.value) === String(value));
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
  }, [isOpen, isSearchable]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          const opt = filteredOptions[focusedIndex];
          if (!opt.disabled) {
            onChange(opt.value);
            setIsOpen(false);
            setSearchQuery('');
          }
        }
        break;
      default:
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const itemEl = listRef.current.children[focusedIndex] as HTMLElement;
      if (itemEl) {
        itemEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Size styling - sleek, not bulky!
  const sizeClasses = {
    sm: 'py-1.5 px-2.5 text-xs rounded-xl min-h-[32px]',
    md: 'py-2 px-3 text-xs rounded-xl min-h-[38px]',
    lg: 'py-2.5 px-3.5 text-sm rounded-xl min-h-[44px]'
  }[size];

  return (
    <div
      ref={containerRef}
      className="relative w-full text-left"
      onKeyDown={handleKeyDown}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`
          w-full flex items-center justify-between gap-2 transition-all font-medium select-none
          border text-slate-800 dark:text-slate-100
          ${sizeClasses}
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
        {/* Left icon + Label */}
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {icon && <span className="shrink-0 text-slate-400 dark:text-slate-500">{icon}</span>}
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              {selectedOption.icon && (
                <span className="shrink-0">{selectedOption.icon}</span>
              )}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${selectedOption.badgeColor || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 truncate">{placeholder}</span>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-500 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute min-w-[200px] w-full z-[100]
            ${
              computedPlacement === 'top'
                ? 'bottom-full mb-1.5 origin-bottom animate-in fade-in slide-in-from-bottom-2 duration-150'
                : 'top-full mt-1.5 origin-top animate-in fade-in slide-in-from-top-2 duration-150'
            }
            bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl
            shadow-xl shadow-slate-900/10 dark:shadow-black/50 overflow-hidden
            backdrop-blur-md
            ${align === 'right' ? 'right-0' : 'left-0'}
            ${menuClassName}
          `}
        >
          {/* Search Bar */}
          {isSearchable && (
            <div className="p-2 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFocusedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500/30"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto p-1.5 space-y-0.5"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const isFocused = idx === focusedIndex;

                if (renderCustomOption) {
                  return (
                    <div
                      key={String(opt.value)}
                      onClick={() => {
                        if (!opt.disabled) {
                          onChange(opt.value);
                          setIsOpen(false);
                          setSearchQuery('');
                        }
                      }}
                      onMouseEnter={() => setFocusedIndex(idx)}
                    >
                      {renderCustomOption(opt)}
                    </div>
                  );
                }

                return (
                  <div
                    key={String(opt.value)}
                    onClick={() => {
                      if (!opt.disabled) {
                        onChange(opt.value);
                        setIsOpen(false);
                        setSearchQuery('');
                      }
                    }}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`
                      px-3 py-2 text-xs rounded-xl transition flex items-center justify-between gap-2 cursor-pointer select-none
                      ${
                        opt.disabled
                          ? 'opacity-40 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                          : isFocused
                          ? 'bg-slate-100/90 dark:bg-slate-800 text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
                      {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{opt.label}</span>
                          {opt.badge && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold shrink-0 ${opt.badgeColor || 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.sublabel && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5 font-normal">
                            {opt.sublabel}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
