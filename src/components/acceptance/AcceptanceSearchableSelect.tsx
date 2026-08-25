import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Check } from 'lucide-react';

export interface SearchableItem {
  value: string;
  label: string;
  subLabel?: string;
  code?: string;
  searchString?: string;
  rawItem?: any;
}

interface AcceptanceSearchableSelectProps {
  value: string;
  onValueChange: (value: string, rawItem?: any) => void;
  items: SearchableItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  triggerClassName?: string;
  triggerDisplay?: string | React.ReactNode;
  contentClassName?: string;
  disabled?: boolean;
}

export const AcceptanceSearchableSelect: React.FC<AcceptanceSearchableSelectProps> = React.memo(({
  value,
  onValueChange,
  items = [],
  placeholder = 'Chọn mục...',
  searchPlaceholder = 'Tìm kiếm nhanh...',
  emptyMessage = 'Không tìm thấy kết quả phù hợp',
  triggerClassName = 'h-7 text-[11px] font-bold border-slate-200 bg-white rounded',
  triggerDisplay,
  contentClassName = 'max-h-72 w-[280px] sm:w-[320px]',
  disabled = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => {
      if (item.searchString) {
        return item.searchString.includes(q);
      }
      const labelMatch = (item.label || '').toLowerCase().includes(q);
      const subMatch = (item.subLabel || '').toLowerCase().includes(q);
      const codeMatch = (item.code || '').toLowerCase().includes(q);
      const valueMatch = (item.value || '').toLowerCase().includes(q);
      return labelMatch || subMatch || codeMatch || valueMatch;
    });
  }, [items, searchTerm]);

  const currentItem = useMemo(() => {
    return items.find((i) => i.value === value);
  }, [items, value]);

  const displayNode = triggerDisplay || (currentItem ? currentItem.label : undefined);

  return (
    <Select
      value={value ? String(value) : ''}
      onValueChange={(val) => {
        const matched = items.find((i) => i.value === val);
        onValueChange(val, matched?.rawItem);
      }}
      open={isOpen}
      onOpenChange={setIsOpen}
      disabled={disabled}
    >
      <SelectTrigger className={`w-full overflow-hidden flex items-center justify-between text-left ${triggerClassName}`}>
        <SelectValue placeholder={placeholder}>
          <span className="truncate block text-left flex-1 font-bold text-slate-800">
            {displayNode || placeholder}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={`${contentClassName} p-0 overflow-hidden shadow-xl border border-slate-200 rounded-xl`}>
        {/* 🔍 Search box inside dropdown */}
        <div 
          className="p-2 sticky top-0 bg-white z-20 border-b border-slate-100 shadow-xs"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 h-8 text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-lg outline-none transition-all placeholder:text-slate-400 text-slate-800"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span>Tìm thấy {filteredItems.length} kết quả</span>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-indigo-600 hover:underline font-bold"
              >
                Hiện tất cả
              </button>
            </div>
          )}
        </div>

        {/* 📋 List of searchable items */}
        <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
          {filteredItems.map((item) => {
            const isSelected = item.value === value;
            return (
              <SelectItem
                key={item.value}
                value={item.value}
                className={`text-xs rounded-lg py-1.5 px-2 cursor-pointer transition-colors ${
                  isSelected ? 'bg-indigo-50/80 font-bold text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex flex-col items-start gap-0.5 text-left w-full pr-2">
                  <div className="flex items-center gap-1.5 w-full">
                    {item.code && (
                      <span className="font-mono text-[10px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200/60 shrink-0">
                        {item.code}
                      </span>
                    )}
                    <span className="font-bold truncate text-slate-800 flex-1">
                      {item.label}
                    </span>
                  </div>
                  {item.subLabel && item.subLabel !== item.label && (
                    <span className="text-[10px] text-slate-400 font-medium truncate pl-0.5">
                      {item.subLabel}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="py-6 px-3 text-center">
              <p className="text-xs text-slate-500 font-medium">{emptyMessage}</p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    inputRef.current?.focus();
                  }}
                  className="mt-2 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              )}
            </div>
          )}
        </div>
      </SelectContent>
    </Select>
  );
});
