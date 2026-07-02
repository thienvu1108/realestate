import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  writeBatch, 
  serverTimestamp 
} from '../firestore-proxy';
import { 
  Trash2, Edit2, Upload, FileSpreadsheet, Check, ShieldCheck, 
  ChevronDown, Search, ArrowUpDown, Filter, Plus, FileDown, 
  CheckSquare, FileText, AlertCircle, RefreshCw, X, ChevronRight, PlusCircle,
  Calculator
} from 'lucide-react';
import { format } from 'date-fns';

// UI components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogTitle, 
} from "@/components/ui/dialog";

// Define general operations enum matching App.tsx helper
enum OperationType {
  LIST = 'LIST',
  WRITE = 'WRITE',
  DELETE = 'DELETE'
}

const getSortValue = (item: any, key: string, teams: any[] = [], blocks: any[] = []) => {
  if (!item) return '';
  switch (key) {
    case 'blockName': {
      const teamObj = (teams || []).find((t: any) => t.id === item.teamId || t.name === item.teamName || (item.teamCode && t.teamCode === item.teamCode));
      if (teamObj) {
        const blk = (blocks || []).find((b: any) => b.id === teamObj.blockId || b.blockCode === teamObj.blockCode);
        if (blk) return blk.name || blk.blockCode || '';
      }
      return item.blockName || item.blockCode || '';
    }
    case 'teamName':
      return item.teamName || '';
    case 'teamCode':
      return item.teamCode || '';
    case 'gdkdName':
      return item.gdkdName || '';
    case 'implementerName':
      return item.implementerName || '';
    case 'projectName':
      return item.projectName || '';
    case 'fbDigitalChuaVat':
      return item.fbDigitalChuaVat !== undefined ? item.fbDigitalChuaVat : Math.round((item.facebookCost || 0) / 1.1);
    case 'facebookCost':
      return item.facebookCost || 0;
    case 'caNhanCost':
      return item.caNhanCost !== undefined ? item.caNhanCost : (item.otherCost || 0);
    case 'fbVisaCostChuaVat':
      return item.fbVisaCostChuaVat !== undefined ? item.fbVisaCostChuaVat : Math.round((item.visaCost || 0) / 1.1);
    case 'visaCost':
      return item.visaCost || 0;
    case 'dangTinCaNhanCost':
      return item.dangTinCaNhanCost || 0;
    case 'dangTinCongTyChuaVat':
      return item.dangTinCongTyChuaVat !== undefined ? item.dangTinCongTyChuaVat : Math.round((item.postingCost || 0) / 1.08);
    case 'postingCost':
      return item.postingCost || 0;
    case 'zaloCost':
      return item.zaloCost || 0;
    case 'googleCost':
      return item.googleCost || 0;
    case 'tiktokCost':
      return item.tiktokCost || 0;
    case 'totalCost':
      return item.totalCost || item.afterAcceptanceCost || 0;
    case 'month':
      return item.month || '';
    case 'notes':
      return item.notes || '';
    default:
      return item[key] !== undefined ? item[key] : '';
  }
};

// --- EXCEL-STYLE MATH MULTI-VALUE PARSER & CHANNELS AUDITOR ENGINE ---
export const parseCurrencyFormula = (input: string | number | undefined | null): { total: number; items: { amount: number; label: string }[]; displayString: string } => {
  if (input === undefined || input === null) return { total: 0, items: [], displayString: '' };
  if (typeof input === 'number') {
    return {
      total: input,
      items: [{ amount: input, label: 'Khoản chi' }],
      displayString: input.toLocaleString('vi-VN') + ' đ'
    };
  }
  const str = String(input).trim();
  if (!str) return { total: 0, items: [], displayString: '' };

  const parts = str.split(/[+\n;]/);
  const items: { amount: number; label: string }[] = [];
  let total = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const numRegex = /(-?[0-9.,]+)\s*([kKmM]?)/;
    const match = trimmed.match(numRegex);

    if (match) {
      let numStr = match[1].replace(/[.,]/g, '');
      let val = parseFloat(numStr) || 0;

      const unit = match[2].toLowerCase();
      if (unit === 'k') {
        val *= 1000;
      } else if (unit === 'm') {
        val *= 1000000;
      }

      let label = trimmed.replace(match[0], '').trim();
      label = label.replace(/^\s*[()]\s*/, '').replace(/\s*[()]\s*$/, '').trim();

      items.push({
        amount: val,
        label: label || 'Khoản chi'
      });
      total += val;
    }
  }

  const displayString = items
    .map(itm => `${itm.amount.toLocaleString('vi-VN')} đ${itm.label !== 'Khoản chi' ? ` (${itm.label})` : ''}`)
    .join(' + ');

  return {
    total,
    items,
    displayString
  };
};

const handleCostInputChange = (value: string, updateFn: (val: string) => void) => {
  const hasFormulaChar = /[+;\nKkMm()a-zA-Z]/.test(value) && !/^\d+$/.test(value.replace(/[.\s]/g, ''));
  if (hasFormulaChar) {
    updateFn(value);
  } else {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    updateFn(formatted);
  }
};

const buildCostBreakdownsOfRecord = (rowState: any) => {
  const fields = ['fbDigital', 'caNhan', 'fbVisa', 'dangTinCaNhan', 'dangTinCongTy', 'zalo', 'google', 'tiktok'];
  const breakdowns: any = {};
  for (const field of fields) {
    const val = rowState[field] || '';
    const parsed = parseCurrencyFormula(val);
    if (parsed.items.length > 0) {
      breakdowns[field] = {
        rawInput: val,
        total: parsed.total,
        items: parsed.items
      };
    }
  }
  return breakdowns;
};

const SortableHeader = ({ sortKey, currentSort, onSort, align = 'left', className = '', children }: any) => {
  const isSorted = currentSort.key === sortKey;
  const isAsc = currentSort.direction === 'asc';
  
  let alignClass = 'text-left';
  let flexClass = 'justify-start';
  if (align === 'center') {
    alignClass = 'text-center';
    flexClass = 'justify-center';
  } else if (align === 'right') {
    alignClass = 'text-right';
    flexClass = 'justify-end';
  }

  return (
    <TableHead 
      className={`cursor-pointer hover:bg-slate-200/60 transition-colors select-none group border-b border-slate-200 ${alignClass} ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1 ${flexClass}`}>
        <span className="truncate">{children}</span>
        <ArrowUpDown 
          className={`w-3 h-3 shrink-0 transition-opacity ${
            isSorted 
              ? 'text-indigo-600 font-bold opacity-100' 
              : 'text-slate-400 opacity-20 group-hover:opacity-100'
          }`} 
        />
      </div>
    </TableHead>
  );
};

export const AcceptanceManager = React.memo(({ 
  isAdmin, isSuperAdmin, isMod, isAccountant, user, teams = [], projects = [], acceptances = [], finalAcceptances = [], teamMap = {}, projectMap = {}, 
  formatCurrency, getMarketingMonth, handleFirestoreError, formatCurrencyInput,
  isImportingAcceptances, setIsImportingAcceptances, isImportAcceptancesDialogOpen, setIsImportAcceptancesDialogOpen,
  handleImportAcceptancesCSV, uniqueTeams = [], blocks = []
}: any) => {

  const [acceptanceSearch, setAcceptanceSearch] = useState('');
  const [debouncedAcceptanceSearch, setDebouncedAcceptanceSearch] = useState('');
  const [acceptanceMonthFilter, setAcceptanceMonthFilter] = useState('all');
  const [acceptanceProjectFilter, setAcceptanceProjectFilter] = useState('all');
  const [acceptanceTeamFilter, setAcceptanceTeamFilter] = useState('all');
  const [acceptanceCategoryFilter, setAcceptanceCategoryFilter] = useState('all');
  const [acceptanceBlockFilter, setAcceptanceBlockFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<any>({ key: null, direction: null });

  const [acceptanceListView, setAcceptanceListView] = useState<'pending' | 'finalized'>('pending');
  const processingFinalizeRef = useRef<Record<string, boolean>>({});
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [acceptanceToFinalize, setAcceptanceToFinalize] = useState<any>(null);

  // State hooks for Multi-Value Sum dialog calculator
  const [activeCalculatorField, setActiveCalculatorField] = useState<string | null>(null);
  const [calculatorFieldNameVN, setCalculatorFieldNameVN] = useState('');
  const [calculatorInput, setCalculatorInput] = useState('');
  const [calculatorUpdateFn, setCalculatorUpdateFn] = useState<((val: string) => void) | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const handleOpenCalculator = (fieldKey: string, fieldVNName: string, currentVal: string, onUpdate: (val: string) => void) => {
    setActiveCalculatorField(fieldKey);
    setCalculatorFieldNameVN(fieldVNName);
    setCalculatorInput(currentVal || '');
    setCalculatorUpdateFn(() => onUpdate);
    setIsCalculatorOpen(true);
  };

  const RenderValueWithBreakdown = (amount: number, breakdown: any, label: string) => {
    const formattedAmount = formatCurrency(amount).replace(' đ', '');
    const items = breakdown?.items || [];
    
    if (items.length <= 1) {
      return <span>{formattedAmount}</span>;
    }
    
    return (
      <span className="relative group/tooltip inline-flex items-center justify-end gap-1 cursor-help">
        <span className="font-semibold text-indigo-700 underline decoration-indigo-400 decoration-dashed underline-offset-2 hover:text-indigo-900 transition-colors">
          {formattedAmount}
        </span>
        <Calculator className="w-3 h-3 text-indigo-500 hover:text-indigo-700 flex-shrink-0" />
        
        {/* Absolute tooltip container */}
        <span className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-lg shadow-2xl text-[10px] min-w-[210px] text-right z-[999] pointer-events-none font-sans font-medium scale-95 origin-bottom-right transition-all leading-relaxed whitespace-nowrap">
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1.5 mb-1.5 text-center font-sans flex items-center justify-center gap-1.5">
            <Calculator className="w-3 h-3 text-indigo-400" />
            <span>TRA SOÁT CHI TIẾT ({label})</span>
          </span>
          <span className="block space-y-1 max-h-36 overflow-y-auto pr-1">
            {items.map((sub: any, sidx: number) => (
              <span key={sidx} className="flex justify-between gap-4 text-[10px] items-center py-0.5">
                <span className="text-slate-400 truncate max-w-[125px] text-left">• {sub.label}</span>
                <span className="font-mono font-bold text-slate-100">
                  {formatCurrency(sub.amount).replace(' đ', '')}
                </span>
              </span>
            ))}
          </span>
          <span className="border-t border-slate-800 pt-1.5 mt-1.5 flex justify-between gap-4 font-mono font-bold text-indigo-400">
            <span className="text-[9px] uppercase font-sans text-slate-400">Tổng cộng (SUM):</span>
            <span className="font-bold">{formatCurrency(amount).replace(' đ', '')}</span>
          </span>
        </span>
      </span>
    );
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Implement mouse-drag horizontal scroll for best UX
  useEffect(() => {
    const slider = tableContainerRef.current;
    if (!slider) return;

    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Skip dragging on interactive tags
      if (target.closest('input, select, button, a, [role="button"], label, svg')) return;
      isDown = true;
      slider.classList.add('cursor-grabbing');
      slider.classList.remove('cursor-grab');
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      slider.classList.remove('cursor-grabbing');
      slider.classList.add('cursor-grab');
    };

    const handleMouseUp = () => {
      isDown = false;
      slider.classList.remove('cursor-grabbing');
      slider.classList.add('cursor-grab');
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 1.5; // Scroll speed multiplier
      slider.scrollLeft = scrollLeft - walk;
    };

    slider.addEventListener('mousedown', handleMouseDown);
    slider.addEventListener('mouseleave', handleMouseLeave);
    slider.addEventListener('mouseup', handleMouseUp);
    slider.addEventListener('mousemove', handleMouseMove);

    return () => {
      slider.removeEventListener('mousedown', handleMouseDown);
      slider.removeEventListener('mouseleave', handleMouseLeave);
      slider.removeEventListener('mouseup', handleMouseUp);
      slider.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Helper helper to support debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAcceptanceSearch(acceptanceSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [acceptanceSearch]);

  const getGDKDName = (team: any) => {
    if (!team) return '';
    const teamNameStr = team.name || '';
    const code = team.teamCode || '';
    if (code && teamNameStr.startsWith(code)) {
      return teamNameStr.substring(code.length).trim();
    }
    const parts = teamNameStr.split(' ');
    if (parts.length > 1) {
      return parts.slice(1).join(' ');
    }
    return teamNameStr;
  };

  const getBlockName = (team: any) => {
    if (!team) return '';
    const block = (blocks || []).find((b: any) => b.id === team.blockId || b.blockCode === team.blockCode);
    return block?.name || team.blockCode || 'N/A';
  };

  // Inline searchable dropdown
  const InlineSearchableSelect = ({ value, onValueChange, items, placeholder, searchPlaceholder }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    const selectedItem = items.find((item: any) => item.value === value);
    const filteredItems = items.filter((item: any) => 
      (item.label || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="relative w-full min-w-[150px]" ref={containerRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full h-8 px-2 text-[10px] font-bold text-left border rounded border-slate-200 bg-white hover:border-slate-300 focus:outline-none flex justify-between items-center"
        >
          <span className="truncate">{selectedItem ? selectedItem.label : placeholder}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0 ml-1" />
        </button>
        {isOpen && (
          <div className="absolute z-50 left-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded shadow-lg min-w-[200px] left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0">
            <div className="p-1 sticky top-0 bg-white border-b border-slate-100">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-7 px-2 text-[10px] border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="py-1">
              {filteredItems.length === 0 ? (
                <div className="px-2 py-1.5 text-[10px] text-slate-400 italic">Không tìm thấy</div>
              ) : (
                filteredItems.map((item: any) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      onValueChange(item.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-2 py-1.5 text-[10px] font-medium text-left hover:bg-slate-50 transition-colors block truncate ${
                      item.value === value ? 'bg-indigo-50 text-indigo-600 font-extrabold' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Draft rows state (Excel-style inline creation)
  const createEmptyDraft = () => ({
    id: Math.random().toString(36).substring(7),
    block: '',
    teamId: '',
    teamCode: '',
    gdkdName: '',
    implementerName: '',
    projectId: '',
    fbDigital: '',
    caNhan: '',
    fbVisa: '',
    dangTinCaNhan: '',
    dangTinCongTy: '',
    zalo: '',
    google: '',
    tiktok: '',
    month: getMarketingMonth ? getMarketingMonth(new Date()) : new Date().toISOString().substring(0, 7),
    notes: ''
  });

  const [draftRows, setDraftRows] = useState<any[]>([createEmptyDraft()]);

  // Inline editing row states for existing records
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowState, setEditingRowState] = useState<any>(null);

  const [selectedAcceptanceIds, setSelectedAcceptanceIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [acceptanceToDelete, setAcceptanceToDelete] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isDeleteFinalDialogOpen, setIsDeleteFinalDialogOpen] = useState(false);
  const [finalAcceptanceToDelete, setFinalAcceptanceToDelete] = useState<string | null>(null);
  const [isDeletingAcceptance, setIsDeletingAcceptance] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null);

  // Unique list of months for filters
  const uniqueMonths = useMemo(() => {
    const list = new Set<string>();
    acceptances.forEach((a: any) => { if (a.month) list.add(a.month); });
    finalAcceptances.forEach((a: any) => { if (a.month) list.add(a.month); });
    return Array.from(list).sort().reverse();
  }, [acceptances, finalAcceptances]);

  const handleSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAcceptances = useMemo(() => {
    const filtered = acceptances.filter((a: any) => {
      const searchStr = (debouncedAcceptanceSearch || '').toLowerCase();
      const matchesSearch = 
        (a.projectName || '').toLowerCase().includes(searchStr) ||
        (a.teamName || '').toLowerCase().includes(searchStr) ||
        (a.teamCode || '').toLowerCase().includes(searchStr);
      const matchesMonth = acceptanceMonthFilter === 'all' || a.month === acceptanceMonthFilter;
      const projectNameFromMap = projectMap[acceptanceProjectFilter];
      const projectFilterStr = (acceptanceProjectFilter || '').toLowerCase();
      const matchesProject = acceptanceProjectFilter === 'all' || 
                            (a.projectId && String(a.projectId).trim() === String(acceptanceProjectFilter).trim()) || 
                            (projectNameFromMap && a.projectName && String(a.projectName).toLowerCase().trim() === String(projectNameFromMap).toLowerCase().trim()) ||
                            (a.projectName && String(a.projectName).toLowerCase().trim() === projectFilterStr.trim());
      const teamNameFromMap = teamMap[acceptanceTeamFilter];
      const teamFilterStr = (acceptanceTeamFilter || '').toLowerCase();
      const matchesTeam = acceptanceTeamFilter === 'all' || 
                         (a.teamId && String(a.teamId).trim() === String(acceptanceTeamFilter).trim()) || 
                         (teamNameFromMap && a.teamName && String(a.teamName).toLowerCase().trim() === String(teamNameFromMap).toLowerCase().trim()) ||
                         (a.teamName && String(a.teamName).toLowerCase().trim() === teamFilterStr.trim());
      
      const matchesCategory = acceptanceCategoryFilter === 'all' || 
                             (acceptanceCategoryFilter === 'digital' && (a.digitalCost > 0)) ||
                             (acceptanceCategoryFilter === 'visa' && (a.visaCost > 0)) ||
                             (acceptanceCategoryFilter === 'crm' && (a.crmCost > 0));

      const matchesBlock = acceptanceBlockFilter === 'all' || 
                           (a.blockId && String(a.blockId).trim() === String(acceptanceBlockFilter).trim()) ||
                           (a.blockCode && String(a.blockCode).trim().toLowerCase() === String(acceptanceBlockFilter).trim().toLowerCase()) ||
                           (a.blockName && String(a.blockName).trim().toLowerCase() === String(acceptanceBlockFilter).trim().toLowerCase()) ||
                           (a.blockName && String(a.blockName).trim() === String(acceptanceBlockFilter).trim());
                             
      const isPending = a.status !== 'Đã nghiệm thu';
      return matchesSearch && matchesMonth && matchesProject && matchesTeam && matchesCategory && matchesBlock && isPending;
    });

    if (!sortConfig.key || !sortConfig.direction) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = getSortValue(a, sortConfig.key, teams, blocks);
      let bVal = getSortValue(b, sortConfig.key, teams, blocks);
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [acceptances, debouncedAcceptanceSearch, acceptanceMonthFilter, acceptanceProjectFilter, acceptanceTeamFilter, acceptanceCategoryFilter, acceptanceBlockFilter, sortConfig, teams, blocks]);

  const filteredFinalAcceptances = useMemo(() => {
    const filtered = (finalAcceptances || []).filter((a: any) => {
      const searchStr = (debouncedAcceptanceSearch || '').toLowerCase();
      const matchesSearch = 
        (a.projectName || '').toLowerCase().includes(searchStr) ||
        (a.teamName || '').toLowerCase().includes(searchStr) ||
        (a.teamCode || '').toLowerCase().includes(searchStr);
      const matchesMonth = acceptanceMonthFilter === 'all' || a.month === acceptanceMonthFilter;
      const projectNameFromMap = projectMap[acceptanceProjectFilter];
      const projectFilterStr = (acceptanceProjectFilter || '').toLowerCase();
      const matchesProject = acceptanceProjectFilter === 'all' || 
                            (a.projectId && String(a.projectId).trim() === String(acceptanceProjectFilter).trim()) || 
                            (projectNameFromMap && a.projectName && String(a.projectName).toLowerCase().trim() === String(projectNameFromMap).toLowerCase().trim()) ||
                            (a.projectName && String(a.projectName).toLowerCase().trim() === projectFilterStr.trim());
      const teamNameFromMap = teamMap[acceptanceTeamFilter];
      const teamFilterStr = (acceptanceTeamFilter || '').toLowerCase();
      const matchesTeam = acceptanceTeamFilter === 'all' || 
                         (a.teamId && String(a.teamId).trim() === String(acceptanceTeamFilter).trim()) || 
                         (teamNameFromMap && a.teamName && String(a.teamName).toLowerCase().trim() === String(teamNameFromMap).toLowerCase().trim()) ||
                         (a.teamName && String(a.teamName).toLowerCase().trim() === teamFilterStr.trim());
      
      const matchesCategory = acceptanceCategoryFilter === 'all' || 
                             (acceptanceCategoryFilter === 'digital' && (a.digitalCost > 0)) ||
                             (acceptanceCategoryFilter === 'visa' && (a.visaCost > 0)) ||
                             (acceptanceCategoryFilter === 'crm' && (a.crmCost > 0));

      return matchesSearch && matchesMonth && matchesProject && matchesTeam && matchesCategory;
    });

    if (!sortConfig.key || !sortConfig.direction) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = getSortValue(a, sortConfig.key, teams, blocks);
      let bVal = getSortValue(b, sortConfig.key, teams, blocks);
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [finalAcceptances, debouncedAcceptanceSearch, acceptanceMonthFilter, acceptanceProjectFilter, acceptanceTeamFilter, acceptanceCategoryFilter, sortConfig, teams, blocks]);

  // Aggregate stats calculations of column totals
  const calculatedPendingTotals = useMemo(() => {
    return filteredAcceptances.reduce((acc, item) => {
      const fbDigitalChuaVat = item.fbDigitalChuaVat !== undefined ? item.fbDigitalChuaVat : Math.round((item.facebookCost || 0) / 1.1);
      const digitalCost = item.facebookCost || 0;
      const caNhan = item.caNhanCost !== undefined ? item.caNhanCost : (item.otherCost || 0);
      const fbVisaChuaVat = item.fbVisaCostChuaVat !== undefined ? item.fbVisaCostChuaVat : Math.round((item.visaCost || 0) / 1.1);
      const visaCost = item.visaCost || 0;
      const dangTinCaNhan = item.dangTinCaNhanCost || 0;
      const dangTinCongTyChuaVat = item.dangTinCongTyChuaVat !== undefined ? item.dangTinCongTyChuaVat : Math.round((item.postingCost || 0) / 1.08);
      const dangTinCongTyCost = item.postingCost || 0;
      const zalo = item.zaloCost || 0;
      const google = item.googleCost || 0;
      const tiktok = item.tiktokCost || 0;
      const total = item.totalCost || 0;

      return {
        fbChuaVat: acc.fbChuaVat + fbDigitalChuaVat,
        digitalCost: acc.digitalCost + digitalCost,
        caNhan: acc.caNhan + caNhan,
        visaChuaVat: acc.visaChuaVat + fbVisaChuaVat,
        visaCost: acc.visaCost + visaCost,
        dangTinCaNhan: acc.dangTinCaNhan + dangTinCaNhan,
        dangTinCongTyChuaVat: acc.dangTinCongTyChuaVat + dangTinCongTyChuaVat,
        dangTinCongTyCost: acc.dangTinCongTyCost + dangTinCongTyCost,
        zalo: acc.zalo + zalo,
        google: acc.google + google,
        tiktok: acc.tiktok + tiktok,
        total: acc.total + total
      };
    }, {
      fbChuaVat: 0, digitalCost: 0, caNhan: 0, visaChuaVat: 0, visaCost: 0,
      dangTinCaNhan: 0, dangTinCongTyChuaVat: 0, dangTinCongTyCost: 0,
      zalo: 0, google: 0, tiktok: 0, total: 0
    });
  }, [filteredAcceptances]);

  const calculatedFinalTotals = useMemo(() => {
    return filteredFinalAcceptances.reduce((acc, item) => {
      const fbDigitalChuaVat = item.fbDigitalChuaVat !== undefined ? item.fbDigitalChuaVat : Math.round((item.facebookCost || 0) / 1.1);
      const digitalCost = item.facebookCost || 0;
      const caNhan = item.caNhanCost !== undefined ? item.caNhanCost : (item.otherCost || 0);
      const fbVisaChuaVat = item.fbVisaCostChuaVat !== undefined ? item.fbVisaCostChuaVat : Math.round((item.visaCost || 0) / 1.1);
      const visaCost = item.visaCost || 0;
      const dangTinCaNhan = item.dangTinCaNhanCost || 0;
      const dangTinCongTyChuaVat = item.dangTinCongTyChuaVat !== undefined ? item.dangTinCongTyChuaVat : Math.round((item.postingCost || 0) / 1.08);
      const dangTinCongTyCost = item.customPostingCost || item.postingCost || 0;
      const zalo = item.zaloCost || 0;
      const google = item.googleCost || 0;
      const tiktok = item.tiktokCost || 0;
      const total = item.totalActualCost || item.afterAcceptanceCost || item.totalCost || 0;

      return {
        fbChuaVat: acc.fbChuaVat + fbDigitalChuaVat,
        digitalCost: acc.digitalCost + digitalCost,
        caNhan: acc.caNhan + caNhan,
        visaChuaVat: acc.visaChuaVat + fbVisaChuaVat,
        visaCost: acc.visaCost + visaCost,
        dangTinCaNhan: acc.dangTinCaNhan + dangTinCaNhan,
        dangTinCongTyChuaVat: acc.dangTinCongTyChuaVat + dangTinCongTyChuaVat,
        dangTinCongTyCost: acc.dangTinCongTyCost + dangTinCongTyCost,
        zalo: acc.zalo + zalo,
        google: acc.google + google,
        tiktok: acc.tiktok + tiktok,
        total: acc.total + total
      };
    }, {
      fbChuaVat: 0, digitalCost: 0, caNhan: 0, visaChuaVat: 0, visaCost: 0,
      dangTinCaNhan: 0, dangTinCongTyChuaVat: 0, dangTinCongTyCost: 0,
      zalo: 0, google: 0, tiktok: 0, total: 0
    });
  }, [filteredFinalAcceptances]);

  // Handle Save Draft Row
  const handleConfirmSaveDraft = async (draftRow: any) => {
    if (!draftRow.teamId) {
      toast.error("Vui lòng chọn TEAM trong dòng!");
      return;
    }
    if (!draftRow.projectId) {
      toast.error("Vui lòng chọn DỰ ÁN trong dòng!");
      return;
    }
    if (!draftRow.month) {
      toast.error("Vui lòng chọn THÁNG trong dòng!");
      return;
    }

    const toastId = toast.loading('Đang khởi tạo bản ghi dữ liệu...');
    try {
      const selectedTeam = teams.find((t: any) => t.id === draftRow.teamId);
      const selectedProj = projects.find((p: any) => p.id === draftRow.projectId);
      const selectedBlock = (blocks || []).find((b: any) => b.id === selectedTeam?.blockId || b.blockCode === selectedTeam?.blockCode);

      const fbDigitalChuaVatNum = parseCurrencyFormula(draftRow.fbDigital).total;
      const digitalCostNum = Math.round(fbDigitalChuaVatNum * 1.10);

      const caNhanNum = parseCurrencyFormula(draftRow.caNhan).total;

      const fbVisaChuaVatNum = parseCurrencyFormula(draftRow.fbVisa).total;
      const visaCostNum = Math.round(fbVisaChuaVatNum * 1.10);

      const dangTinCaNhanNum = parseCurrencyFormula(draftRow.dangTinCaNhan).total;

      const dangTinCongTyChuaVatNum = parseCurrencyFormula(draftRow.dangTinCongTy).total;
      const dangTinCongTyCostNum = Math.round(dangTinCongTyChuaVatNum * 1.08);

      const zaloNum = parseCurrencyFormula(draftRow.zalo).total;
      const googleNum = parseCurrencyFormula(draftRow.google).total;
      const tiktokNum = parseCurrencyFormula(draftRow.tiktok).total;

      const totalCostNum = digitalCostNum + caNhanNum + visaCostNum + dangTinCaNhanNum + dangTinCongTyCostNum + zaloNum + googleNum + tiktokNum;

      const payload: any = {
        month: draftRow.month,
        teamId: draftRow.teamId,
        teamName: selectedTeam?.name || '',
        teamCode: selectedTeam?.teamCode || '',
        blockId: selectedTeam?.blockId || '',
        blockCode: selectedTeam?.blockCode || '',
        blockName: selectedBlock?.name || selectedTeam?.blockCode || 'N/A',
        gdkdName: getGDKDName(selectedTeam),
        implementerName: draftRow.implementerName || '',
        projectId: draftRow.projectId,
        projectName: selectedProj?.name || '',
        projectCode: selectedProj?.projectCode || '',
        
        fbDigitalChuaVat: fbDigitalChuaVatNum,
        facebookCost: digitalCostNum,
        tiktokCost: tiktokNum,
        zaloCost: zaloNum,
        googleCost: googleNum,
        postingCost: dangTinCongTyCostNum,
        visaCost: visaCostNum,
        digitalCost: digitalCostNum,
        otherCost: caNhanNum,
        
        fbVisaCostChuaVat: fbVisaChuaVatNum,
        dangTinCaNhanCost: dangTinCaNhanNum,
        dangTinCongTyChuaVat: dangTinCongTyChuaVatNum,
        caNhanCost: caNhanNum,

        totalCost: totalCostNum,
        beforeAcceptanceCost: totalCostNum,
        afterAcceptanceCost: totalCostNum,
        status: 'Trước nghiệm thu',
        notes: draftRow.notes || '',
        
        breakdown: {
          facebook: [{ account: draftRow.implementerName || 'Mặc định', amount: fbDigitalChuaVatNum, tax: digitalCostNum - fbDigitalChuaVatNum }],
          visa: [{ account: draftRow.implementerName || 'Mặc định', amount: fbVisaChuaVatNum, tax: visaCostNum - fbVisaChuaVatNum }],
          posting: [{ account: draftRow.implementerName || 'Mặc định', amount: dangTinCongTyChuaVatNum, tax: dangTinCongTyCostNum - dangTinCongTyChuaVatNum }],
          zalo: [{ account: draftRow.implementerName || 'Mặc định', amount: zaloNum, tax: 0 }],
          google: [{ account: draftRow.implementerName || 'Mặc định', amount: googleNum, tax: 0 }],
          tiktok: [{ account: draftRow.implementerName || 'Mặc định', amount: tiktokNum, tax: 0 }]
        },

        costBreakdowns: buildCostBreakdownsOfRecord(draftRow),

        createdAt: serverTimestamp(),
        createdBy: user?.email || '',
        createdByUid: user?.uid || '',
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        updatedByUid: user?.uid || ''
      };

      await addDoc(collection(db, 'acceptances'), payload);
      toast.success("Tạo và lưu bản ghi dữ liệu thành công!", { id: toastId });
      
      setDraftRows(prev => {
        const remaining = prev.filter(r => r.id !== draftRow.id);
        return remaining.length === 0 ? [createEmptyDraft()] : remaining;
      });
    } catch (error: any) {
      console.error(error);
      handleFirestoreError(error, OperationType.WRITE, 'acceptances');
      toast.error("Lỗi khi tạo dữ liệu!", { id: toastId });
    }
  };

  // Sửa existing record inline
  const handleStartEditRow = (acc: any) => {
    setEditingRowId(acc.id);
    setEditingRowState({
      id: acc.id,
      block: acc.blockName || '',
      teamId: acc.teamId || '',
      teamCode: acc.teamCode || '',
      gdkdName: acc.gdkdName || '',
      implementerName: acc.implementerName || '',
      projectId: acc.projectId || '',
      fbDigital: acc.costBreakdowns?.fbDigital?.rawInput || formatCurrencyInput(String(acc.fbDigitalChuaVat !== undefined ? acc.fbDigitalChuaVat : Math.round((acc.facebookCost || 0) / 1.1))),
      caNhan: acc.costBreakdowns?.caNhan?.rawInput || formatCurrencyInput(String(acc.caNhanCost !== undefined ? acc.caNhanCost : (acc.otherCost || 0))),
      fbVisa: acc.costBreakdowns?.fbVisa?.rawInput || formatCurrencyInput(String(acc.fbVisaCostChuaVat !== undefined ? acc.fbVisaCostChuaVat : Math.round((acc.visaCost || 0) / 1.1))),
      dangTinCaNhan: acc.costBreakdowns?.dangTinCaNhan?.rawInput || formatCurrencyInput(String(acc.dangTinCaNhanCost || 0)),
      dangTinCongTy: acc.costBreakdowns?.dangTinCongTy?.rawInput || formatCurrencyInput(String(acc.dangTinCongTyChuaVat !== undefined ? acc.dangTinCongTyChuaVat : Math.round((acc.postingCost || 0) / 1.08))),
      zalo: acc.costBreakdowns?.zalo?.rawInput || formatCurrencyInput(String(acc.zaloCost || 0)),
      google: acc.costBreakdowns?.google?.rawInput || formatCurrencyInput(String(acc.googleCost || 0)),
      tiktok: acc.costBreakdowns?.tiktok?.rawInput || formatCurrencyInput(String(acc.tiktokCost || 0)),
      month: acc.month || '',
      notes: acc.notes || ''
    });
  };

  const handleSaveEditingRow = async () => {
    if (!editingRowState.teamId) {
      toast.error("Vui lòng chọn TEAM!");
      return;
    }
    if (!editingRowState.projectId) {
      toast.error("Vui lòng chọn DỰ ÁN!");
      return;
    }
    if (!editingRowState.month) {
      toast.error("Vui lòng chọn THÁNG!");
      return;
    }

    const toastId = toast.loading('Đang cập nhật bản ghi...');
    try {
      const selectedTeam = teams.find((t: any) => t.id === editingRowState.teamId);
      const selectedProj = projects.find((p: any) => p.id === editingRowState.projectId);
      const selectedBlock = (blocks || []).find((b: any) => b.id === selectedTeam?.blockId || b.blockCode === selectedTeam?.blockCode);

      const fbDigitalChuaVatNum = parseCurrencyFormula(editingRowState.fbDigital).total;
      const digitalCostNum = Math.round(fbDigitalChuaVatNum * 1.10);

      const caNhanNum = parseCurrencyFormula(editingRowState.caNhan).total;

      const fbVisaChuaVatNum = parseCurrencyFormula(editingRowState.fbVisa).total;
      const visaCostNum = Math.round(fbVisaChuaVatNum * 1.10);

      const dangTinCaNhanNum = parseCurrencyFormula(editingRowState.dangTinCaNhan).total;

      const dangTinCongTyChuaVatNum = parseCurrencyFormula(editingRowState.dangTinCongTy).total;
      const dangTinCongTyCostNum = Math.round(dangTinCongTyChuaVatNum * 1.08);

      const zaloNum = parseCurrencyFormula(editingRowState.zalo).total;
      const googleNum = parseCurrencyFormula(editingRowState.google).total;
      const tiktokNum = parseCurrencyFormula(editingRowState.tiktok).total;

      const totalCostNum = digitalCostNum + caNhanNum + visaCostNum + dangTinCaNhanNum + dangTinCongTyCostNum + zaloNum + googleNum + tiktokNum;

      const payload = {
        month: editingRowState.month,
        teamId: editingRowState.teamId,
        teamName: selectedTeam?.name || '',
        teamCode: selectedTeam?.teamCode || '',
        blockId: selectedTeam?.blockId || '',
        blockCode: selectedTeam?.blockCode || '',
        blockName: selectedBlock?.name || selectedTeam?.blockCode || 'N/A',
        gdkdName: getGDKDName(selectedTeam),
        implementerName: editingRowState.implementerName || '',
        projectId: editingRowState.projectId,
        projectName: selectedProj?.name || '',
        projectCode: selectedProj?.projectCode || '',
        
        fbDigitalChuaVat: fbDigitalChuaVatNum,
        facebookCost: digitalCostNum,
        tiktokCost: tiktokNum,
        zaloCost: zaloNum,
        googleCost: googleNum,
        postingCost: dangTinCongTyCostNum,
        visaCost: visaCostNum,
        digitalCost: digitalCostNum,
        otherCost: caNhanNum,
        
        fbVisaCostChuaVat: fbVisaChuaVatNum,
        dangTinCaNhanCost: dangTinCaNhanNum,
        dangTinCongTyChuaVat: dangTinCongTyChuaVatNum,
        caNhanCost: caNhanNum,

        totalCost: totalCostNum,
        beforeAcceptanceCost: totalCostNum,
        afterAcceptanceCost: totalCostNum,
        notes: editingRowState.notes || '',
        
        breakdown: {
          facebook: [{ account: editingRowState.implementerName || 'Mặc định', amount: fbDigitalChuaVatNum, tax: digitalCostNum - fbDigitalChuaVatNum }],
          visa: [{ account: editingRowState.implementerName || 'Mặc định', amount: fbVisaChuaVatNum, tax: visaCostNum - fbVisaChuaVatNum }],
          posting: [{ account: editingRowState.implementerName || 'Mặc định', amount: dangTinCongTyChuaVatNum, tax: dangTinCongTyCostNum - dangTinCongTyChuaVatNum }],
          zalo: [{ account: editingRowState.implementerName || 'Mặc định', amount: zaloNum, tax: 0 }],
          google: [{ account: editingRowState.implementerName || 'Mặc định', amount: googleNum, tax: 0 }],
          tiktok: [{ account: editingRowState.implementerName || 'Mặc định', amount: tiktokNum, tax: 0 }]
        },

        costBreakdowns: buildCostBreakdownsOfRecord(editingRowState),

        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        updatedByUid: user?.uid || ''
      };

      await updateDoc(doc(db, 'acceptances', editingRowId), payload);
      toast.success("Cập nhật bản ghi thành công!", { id: toastId });
      setEditingRowId(null);
      setEditingRowState(null);
    } catch (err: any) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'acceptances');
      toast.error("Lỗi khi cập nhật dữ liệu!", { id: toastId });
    }
  };

  const handleDeleteAcceptance = async (id: string) => {
    if (!id) return;
    setIsDeletingAcceptance(true);
    const toastId = toast.loading('Đang xóa bản ghi...');
    try {
      await deleteDoc(doc(db, 'acceptances', id));
      toast.success('Xóa bản ghi thành công', { id: toastId });
      setIsDeleteDialogOpen(false);
      setAcceptanceToDelete(null);
    } catch (error: any) {
      console.error("Delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'acceptances');
      toast.error('Không thể xóa. Vui lòng kiểm tra quyền hạn của Admin.', { id: toastId });
    } finally {
      setIsDeletingAcceptance(false);
    }
  };

  const handleBulkDeleteAcceptances = async () => {
    if (selectedAcceptanceIds.length === 0) return;
    setIsDeletingAcceptance(true);
    const toastId = toast.loading(`Đang xóa ${selectedAcceptanceIds.length} bản ghi...`);
    try {
      const batch = writeBatch(db);
      selectedAcceptanceIds.forEach(id => {
        batch.delete(doc(db, 'acceptances', id));
      });
      await batch.commit();
      const count = selectedAcceptanceIds.length;
      setSelectedAcceptanceIds([]);
      toast.success(`Đã xóa thành công ${count} bản ghi`, { id: toastId });
      setIsBulkDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Bulk delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'acceptances');
      toast.error('Không thể xóa hàng loạt. Vui lòng kiểm tra quyền hạn.', { id: toastId });
    } finally {
      setIsDeletingAcceptance(false);
    }
  };

  const handleDeleteFinalAcceptance = async (id: string) => {
    if (!id) return;
    setIsDeletingAcceptance(true);
    const toastId = toast.loading('Đang xóa bản ghi thực tế...');
    try {
      const targetFa = (finalAcceptances || []).find((fa: any) => fa.id === id);
      const originalAcceptanceId = targetFa?.originalAcceptanceId;

      await deleteDoc(doc(db, 'finalAcceptances', id));

      if (originalAcceptanceId) {
        try {
          await updateDoc(doc(db, 'acceptances', originalAcceptanceId), {
            status: 'Trước nghiệm thu',
            updatedAt: serverTimestamp(),
            updatedBy: user?.email || '',
            updatedByUid: user?.uid || ''
          });
        } catch (e) {
          console.warn("Could not find or update original acceptance:", originalAcceptanceId, e);
        }
      }

      toast.success('Đã xóa bản ghi thực tế và khôi phục trạng thái chưa nghiệm thu', { id: toastId });
      setIsDeleteFinalDialogOpen(false);
      setFinalAcceptanceToDelete(null);
    } catch (error: any) {
      console.error("Final delete error:", error);
      handleFirestoreError(error, OperationType.DELETE, 'finalAcceptances');
      toast.error('Lỗi khi xóa bản ghi thực tế.', { id: toastId });
    } finally {
      setIsDeletingAcceptance(false);
    }
  };

  const handleExportAcceptances = () => {
    const dataToExport = acceptanceListView === 'pending' ? filteredAcceptances : filteredFinalAcceptances;
    
    if (dataToExport.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const data = dataToExport.map((a: any) => {
      const fbChuaVat = a.fbDigitalChuaVat !== undefined ? a.fbDigitalChuaVat : Math.round((a.facebookCost || 0) / 1.1);
      const visaChuaVat = a.fbVisaCostChuaVat !== undefined ? a.fbVisaCostChuaVat : Math.round((a.visaCost || 0) / 1.1);
      const dangTinChuaVat = a.dangTinCongTyChuaVat !== undefined ? a.dangTinCongTyChuaVat : Math.round((a.postingCost || 0) / 1.08);
      const caNhan = a.caNhanCost !== undefined ? a.caNhanCost : (a.otherCost || 0);

      return {
        'Tháng': a.month,
        'Khối': a.blockName || a.blockCode || '',
        'Team': a.teamName,
        'Mã Team': a.teamCode || '',
        'GĐKD': a.gdkdName || '',
        'Người Phụ trách': a.implementerName || '',
        'Dự án': a.projectName,
        'Mã dự án': a.projectCode,
        'FB Digital (Chưa VAT)': fbChuaVat,
        'Digital (VAT 10%)': a.facebookCost || 0,
        'Cá nhân': caNhan,
        'FB Visa Tự Chạy (Chưa VAT)': visaChuaVat,
        'Tự Chạy Visa (VAT 10%)': a.visaCost || 0,
        'Đăng Tin Cá Nhân': a.dangTinCaNhanCost || 0,
        'Đăng Tin Công Ty (Chưa VAT)': dangTinChuaVat,
        'Đăng Tin Công Ty (VAT 10%)': a.postingCost || 0,
        'Zalo': a.zaloCost || 0,
        'Google Ads': a.googleCost || 0,
        'Tiktok Ads': a.tiktokCost || 0,
        'Tổng cộng': a.totalCost || 0,
        'Trạng thái': a.status,
        'Ghi chú': a.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nghiệm thu');
    XLSX.writeFile(workbook, `Bao_cao_NT_${acceptanceListView === 'pending' ? 'Chưa_chốt' : 'Đã_chốt'}_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    toast.success('Đã xuất file Excel thành công');
  };

  const handleFinalizeAcceptance = async (acc: any) => {
    if (!acc) return;
    if (processingFinalizeRef.current[acc.id]) {
      console.log("Already finalizing this record:", acc.id);
      return;
    }
    processingFinalizeRef.current[acc.id] = true;
    
    setIsFinalizing(acc.id);
    const toastId = toast.loading('Đang xử lý chốt số liệu quyết toán...');
    try {
      const finalPayload = {
        originalAcceptanceId: acc.id,
        month: acc.month || '',
        teamId: acc.teamId || '',
        teamName: acc.teamName || '',
        teamCode: acc.teamCode || '',
        blockName: acc.blockName || '',
        blockCode: acc.blockCode || '',
        gdkdName: acc.gdkdName || '',
        implementerName: acc.implementerName || '',
        projectId: acc.projectId || '',
        projectName: acc.projectName || '',
        projectCode: acc.projectCode || '',
        fbDigitalChuaVat: acc.fbDigitalChuaVat || 0,
        facebookCost: acc.facebookCost || 0,
        tiktokCost: acc.tiktokCost || 0,
        zaloCost: acc.zaloCost || 0,
        googleCost: acc.googleCost || 0,
        postingCost: acc.postingCost || 0,
        visaCost: acc.visaCost || 0,
        digitalCost: acc.digitalCost || 0,
        otherCost: acc.otherCost || 0,
        fbVisaCostChuaVat: acc.fbVisaCostChuaVat || 0,
        dangTinCaNhanCost: acc.dangTinCaNhanCost || 0,
        dangTinCongTyChuaVat: acc.dangTinCongTyChuaVat || 0,
        caNhanCost: acc.caNhanCost || 0,
        totalActualCost: acc.totalCost || 0,
        beforeAcceptanceCost: acc.totalCost || 0,
        finalizedAt: serverTimestamp(),
        finalizedBy: user?.email || '',
        finalizedByUid: user?.uid || '',
        status: 'Đã nghiệm thu',
        notes: acc.notes || ''
      };
      
      await addDoc(collection(db, 'finalAcceptances'), finalPayload);
      
      await updateDoc(doc(db, 'acceptances', acc.id), {
        status: 'Đã nghiệm thu',
        finalizedAt: serverTimestamp(),
        finalizedBy: user?.email || '',
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        updatedByUid: user?.uid || ''
      });
      
      setIsFinalizeDialogOpen(false);
      setAcceptanceToFinalize(null);
      
      toast.success('Đã chốt số liệu và quyết toán thành công!', { id: toastId });
    } catch (error: any) {
      console.error("Finalize error:", error);
      handleFirestoreError(error, OperationType.WRITE, 'finalAcceptances');
      toast.error('Lỗi khi chốt số liệu. Vui lòng thử lại.', { id: toastId });
    } finally {
      setIsFinalizing(null);
      delete processingFinalizeRef.current[acc.id];
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-indigo-600" />
            Báo cáo Nghiệm thu (Báo cáo NT)
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
            Hệ thống nhập trực tiếp chi phí nghiệm thu, tự động đồng bộ và tính thuế VAT
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setDraftRows(prev => [...prev, createEmptyDraft()])}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-10 px-4 rounded-xl shadow-lg shadow-indigo-100 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Thêm dòng mới
          </Button>

          <Button 
            variant="outline" 
            onClick={handleExportAcceptances}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs h-10 px-4 rounded-xl flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" /> Xuất Excel
          </Button>

          <Button 
            variant="outline"
            onClick={() => setIsImportAcceptancesDialogOpen(true)}
            className="border-slate-200 text-indigo-600 hover:bg-indigo-50 font-black text-xs h-10 px-4 rounded-xl flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Nhập Excel (Import)
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <CardHeader className="pb-4 space-y-4 border-b border-slate-50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest font-sans">
                  Nghiệm thu ({acceptanceListView === 'pending' ? filteredAcceptances.length : filteredFinalAcceptances.length} bản ghi)
                </h2>
              </div>
              
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setAcceptanceListView('pending');
                    setSelectedAcceptanceIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                    acceptanceListView === 'pending'
                      ? 'bg-white text-indigo-700 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                >
                  Chưa nghiệm thu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAcceptanceListView('finalized');
                    setSelectedAcceptanceIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
                    acceptanceListView === 'finalized'
                      ? 'bg-white text-indigo-700 shadow-sm font-black'
                      : 'text-slate-500 hover:text-slate-800 font-bold'
                  }`}
                >
                  Đã nghiệm thu
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Tìm dự án, ô, team..."
                  value={acceptanceSearch}
                  onChange={(e) => setAcceptanceSearch(e.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-none rounded-2xl text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {selectedAcceptanceIds.length > 0 && (
            <div className="bg-rose-50 border border-rose-100 py-3 px-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Đã chọn {selectedAcceptanceIds.length} bản ghi nghiệm thu</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="h-8 rounded-xl font-black text-[10px] uppercase border-rose-200 text-rose-700 hover:bg-rose-100 bg-white"
                  onClick={() => setSelectedAcceptanceIds([])}
                >
                  Bỏ chọn
                </Button>
                <Button
                  size="sm"
                  type="button"
                  className="h-8 rounded-xl font-black text-[10px] uppercase bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md shadow-rose-100"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa {selectedAcceptanceIds.length} dòng</span>
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Lọc Tháng</Label>
              <Select value={acceptanceMonthFilter} onValueChange={setAcceptanceMonthFilter}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả tháng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả tháng</SelectItem>
                  {uniqueMonths.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Lọc Khối</Label>
              <Select value={acceptanceBlockFilter} onValueChange={setAcceptanceBlockFilter}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả các khối" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả các khối</SelectItem>
                  {(blocks || []).map((b: any) => (
                    <SelectItem key={b.id || b.blockCode} value={b.id || b.blockCode}>
                      {b.name || b.blockCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Lọc Dự án</Label>
              <InlineSearchableSelect
                value={acceptanceProjectFilter}
                onValueChange={setAcceptanceProjectFilter}
                items={[
                  { value: 'all', label: 'Tất cả dự án' },
                  ...projects.map((p: any) => ({ value: p.id, label: p.name }))
                ]}
                placeholder="Chọn dự án..."
                searchPlaceholder="Tìm kiếm dự án..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Lọc Team</Label>
              <InlineSearchableSelect
                value={acceptanceTeamFilter}
                onValueChange={setAcceptanceTeamFilter}
                items={[
                  { value: 'all', label: 'Tất cả team' },
                  ...teams.map((t: any) => ({ value: t.id, label: `${t.name} (${t.teamCode || 'N/A'})` }))
                ]}
                placeholder="Chọn team..."
                searchPlaceholder="Tìm kiếm team..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Lọc Loại chi phí</Label>
              <Select value={acceptanceCategoryFilter} onValueChange={setAcceptanceCategoryFilter}>
                <SelectTrigger className="h-9 bg-white border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả các loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả chi phí</SelectItem>
                  <SelectItem value="digital">Facebook/Digital cost</SelectItem>
                  <SelectItem value="visa">Tự chạy thẻ Visa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="px-4 py-2 bg-indigo-50/40 border-b border-indigo-100/60 flex items-center justify-between text-[11px] font-medium text-indigo-750 font-sans">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-505 animate-pulse bg-indigo-600"></span>
              <span><strong>Mẹo cuộn dữ liệu:</strong> Nhấn giữ chuột trái kéo sang hai bên để trượt ngang, hoặc giữ phím <strong>Shift</strong> + cuộn chuột.</span>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full uppercase">Kéo chuột trượt ngang</span>
          </div>

          <div 
            ref={tableContainerRef} 
            className="overflow-auto max-h-[600px] w-full custom-scrollbar cursor-grab active:cursor-grabbing select-none"
          >
            <div className="inline-block min-w-full align-middle select-text">
              <Table className="min-w-[1800px] border-collapse text-left">
                <TableHeader className="sticky top-0 z-25 bg-slate-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                  <TableRow>
                    <TableHead className="w-16 text-center text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">
                      <div className="flex items-center justify-center gap-2">
                        <input 
                          type="checkbox" 
                          checked={filteredAcceptances.length > 0 && selectedAcceptanceIds.length === filteredAcceptances.length} 
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAcceptanceIds(filteredAcceptances.map((a: any) => a.id));
                            } else {
                              setSelectedAcceptanceIds([]);
                            }
                          }} 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer accent-indigo-600"
                        />
                        <span>STT</span>
                      </div>
                    </TableHead>
                    <SortableHeader sortKey="blockName" currentSort={sortConfig} onSort={handleSort} className="w-24 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Khối</SortableHeader>
                    <SortableHeader sortKey="teamName" currentSort={sortConfig} onSort={handleSort} className="w-36 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Team</SortableHeader>
                    <SortableHeader sortKey="teamCode" currentSort={sortConfig} onSort={handleSort} align="center" className="min-w-[100px] text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Mã Team</SortableHeader>
                    <SortableHeader sortKey="gdkdName" currentSort={sortConfig} onSort={handleSort} className="min-w-[140px] text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">GĐKD</SortableHeader>
                    <SortableHeader sortKey="implementerName" currentSort={sortConfig} onSort={handleSort} className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Người Phụ trách</SortableHeader>
                    <SortableHeader sortKey="projectName" currentSort={sortConfig} onSort={handleSort} className="min-w-[200px] text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Dự án</SortableHeader>
                    <SortableHeader sortKey="fbDigitalChuaVat" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">FB Digital (Chưa VAT)</SortableHeader>
                    <SortableHeader sortKey="facebookCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Digital (VAT 10%)/Thực chi</SortableHeader>
                    <SortableHeader sortKey="caNhanCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Cá nhân</SortableHeader>
                    <SortableHeader sortKey="fbVisaCostChuaVat" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">FB Visa Trực Chạy (C.VAT)</SortableHeader>
                    <SortableHeader sortKey="visaCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Visa Trực Chạy (10%)</SortableHeader>
                    <SortableHeader sortKey="dangTinCaNhanCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Đăng Tin C.Nhân</SortableHeader>
                    <SortableHeader sortKey="dangTinCongTyChuaVat" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Đăng Tin C.Ty (C.VAT)</SortableHeader>
                    <SortableHeader sortKey="postingCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Đăng Tin C.Ty (8%)</SortableHeader>
                    <SortableHeader sortKey="zaloCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-25">Zalo</SortableHeader>
                    <SortableHeader sortKey="googleCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Google / Native</SortableHeader>
                    <SortableHeader sortKey="tiktokCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-28 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Tiktok</SortableHeader>
                    <SortableHeader sortKey="totalCost" currentSort={sortConfig} onSort={handleSort} align="right" className="w-32 text-[10px] font-black bg-indigo-50/40 text-indigo-800 uppercase sticky top-0 z-20 border-b border-indigo-200 font-bold">Tổng tiền</SortableHeader>
                    <SortableHeader sortKey="month" currentSort={sortConfig} onSort={handleSort} align="center" className="w-32 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Tháng</SortableHeader>
                    <SortableHeader sortKey="notes" currentSort={sortConfig} onSort={handleSort} className="w-56 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20">Ghi chú</SortableHeader>
                    <TableHead className="w-44 text-center text-[10px] font-black text-slate-600 uppercase sticky right-0 top-0 bg-slate-100 z-30 border-b border-slate-200 shadow-l">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 bg-white">
                  
                  {/* Rendering active draft rows for inline adding */}
                  {acceptanceListView === 'pending' && draftRows.map((draft, idx) => {
                    const selectedTeam = teams.find((t: any) => t.id === draft.teamId);
                    const selectedProj = projects.find((p: any) => p.id === draft.projectId);
                    const blockName = getBlockName(selectedTeam) || 'Chưa chọn';
                    const teamCode = selectedTeam?.teamCode || '';
                    const gdkdName = getGDKDName(selectedTeam);

                    const fbDigitalChuaVatVal = parseCurrencyFormula(draft.fbDigital).total;
                    const digitalCostVal = Math.round(fbDigitalChuaVatVal * 1.10);

                    const caNhanVal = parseCurrencyFormula(draft.caNhan).total;

                    const fbVisaChuaVatVal = parseCurrencyFormula(draft.fbVisa).total;
                    const visaCostVal = Math.round(fbVisaChuaVatVal * 1.10);

                    const dangTinCaNhanVal = parseCurrencyFormula(draft.dangTinCaNhan).total;

                    const dangTinCongTyChuaVatVal = parseCurrencyFormula(draft.dangTinCongTy).total;
                    const dangTinCongTyCostVal = Math.round(dangTinCongTyChuaVatVal * 1.08);

                    const zaloVal = parseCurrencyFormula(draft.zalo).total;
                    const googleVal = parseCurrencyFormula(draft.google).total;
                    const tiktokVal = parseCurrencyFormula(draft.tiktok).total;

                    const totalCostVal = digitalCostVal + caNhanVal + visaCostVal + dangTinCaNhanVal + dangTinCongTyCostVal + zaloVal + googleVal + tiktokVal;

                    const updateDraftField = (field: string, val: any) => {
                      setDraftRows(prev => prev.map(r => r.id === draft.id ? { ...r, [field]: val } : r));
                    };

                    return (
                      <TableRow key={draft.id} className="bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors border-b border-indigo-100">
                        <TableCell className="text-center font-bold font-mono text-xs text-indigo-700 px-1">
                          Draft
                        </TableCell>
                        <TableCell className="p-1">
                          <span className="text-[10px] font-black uppercase text-slate-500 bg-white px-2 py-1 rounded border border-slate-200 block truncate max-w-[120px]" title={blockName}>
                            {blockName}
                          </span>
                        </TableCell>
                        <TableCell className="p-1">
                          <InlineSearchableSelect
                            value={draft.teamId}
                            onValueChange={(val: string) => updateDraftField('teamId', val)}
                            items={teams.map((t: any) => ({ value: t.id, label: `${t.name} (${t.teamCode || 'N/A'})` }))}
                            placeholder="Chọn team..."
                            searchPlaceholder="Tìm kiếm..."
                          />
                        </TableCell>
                        <TableCell className="text-center p-1 text-xs font-bold font-mono text-slate-600 whitespace-nowrap min-w-[100px]">
                          {teamCode || '-'}
                        </TableCell>
                        <TableCell className="p-1 whitespace-nowrap min-w-[140px] text-xs font-bold text-slate-600 text-left" title={gdkdName}>
                          {gdkdName || '-'}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="Người phụ trách..."
                            className="h-8 px-2 text-[10px] bg-white border border-slate-200 max-w-[110px]"
                            value={draft.implementerName}
                            onChange={(e) => updateDraftField('implementerName', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <InlineSearchableSelect
                            value={draft.projectId}
                            onValueChange={(val: string) => updateDraftField('projectId', val)}
                            items={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.projectCode || ''})` }))}
                            placeholder="Chọn dự án..."
                            searchPlaceholder="Tìm dự án..."
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.fbDigital}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('fbDigital', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('fbDigital', 'FB Digital (Chưa VAT)', draft.fbDigital, (val) => updateDraftField('fbDigital', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-bold text-xs text-indigo-700">
                          {formatCurrency(digitalCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.caNhan}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('caNhan', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('caNhan', 'Cá nhân', draft.caNhan, (val) => updateDraftField('caNhan', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.fbVisa}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('fbVisa', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('fbVisa', 'FB Visa (Chưa VAT)', draft.fbVisa, (val) => updateDraftField('fbVisa', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-bold text-xs text-indigo-700">
                          {formatCurrency(visaCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.dangTinCaNhan}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('dangTinCaNhan', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('dangTinCaNhan', 'Đăng tin cá nhân', draft.dangTinCaNhan, (val) => updateDraftField('dangTinCaNhan', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.dangTinCongTy}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('dangTinCongTy', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('dangTinCongTy', 'Đăng tin công ty (Chưa VAT)', draft.dangTinCongTy, (val) => updateDraftField('dangTinCongTy', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-bold text-xs text-indigo-700">
                          {formatCurrency(dangTinCongTyCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.zalo}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('zalo', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('zalo', 'Zalo', draft.zalo, (val) => updateDraftField('zalo', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.google}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('google', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('google', 'Google', draft.google, (val) => updateDraftField('google', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1">
                          <div className="relative group/input">
                            <Input
                              placeholder="0"
                              className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                              value={draft.tiktok}
                              onChange={(e) => handleCostInputChange(e.target.value, (val) => updateDraftField('tiktok', val))}
                            />
                            <button
                              type="button"
                              onClick={() => handleOpenCalculator('tiktok', 'Tiktok', draft.tiktok, (val) => updateDraftField('tiktok', val))}
                              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-opacity"
                              title="Tự động tính tổng nhiều chi phí (Sum)"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-black text-xs text-emerald-700 bg-emerald-50/40">
                          {formatCurrency(totalCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            type="month"
                            className="h-8 px-1 text-[10px] bg-white border border-slate-200 w-24 font-bold"
                            value={draft.month}
                            onChange={(e) => updateDraftField('month', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="Ghi chú..."
                            className="h-8 px-2 text-[10px] bg-white border border-slate-200"
                            value={draft.notes}
                            onChange={(e) => updateDraftField('notes', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-1 sticky right-0 bg-white/95 text-center shadow-l min-w-[124px] backdrop-blur-sm z-20">
                          <div className="flex justify-center gap-1">
                            <Button
                              size="sm"
                              className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] px-2.5 rounded uppercase"
                              onClick={() => handleConfirmSaveDraft(draft)}
                            >
                              Xác nhận
                            </Button>
                            {draftRows.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold text-[9px] px-1.5 rounded uppercase"
                                onClick={() => setDraftRows(prev => prev.filter(r => r.id !== draft.id))}
                              >
                                Xóa
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Rendering standard filtered records */}
                  {((acceptanceListView === 'pending' ? filteredAcceptances : filteredFinalAcceptances).length === 0 && (acceptanceListView === 'pending' ? draftRows.length === 0 : true)) ? (
                    <TableRow>
                      <TableCell colSpan={22} className="text-center py-10 text-slate-400 italic font-medium">
                        Không tìm thấy bản ghi nghiệm thu nào phù hợp với bộ lọc
                      </TableCell>
                    </TableRow>
                  ) : (
                    (acceptanceListView === 'pending' ? filteredAcceptances : filteredFinalAcceptances).map((item: any, index: number) => {
                      const isRowEditing = editingRowId === item.id;

                      if (isRowEditing && editingRowState) {
                        const selectedTeam = teams.find((t: any) => t.id === editingRowState.teamId);
                        const selectedProj = projects.find((p: any) => p.id === editingRowState.projectId);
                        const blockName = getBlockName(selectedTeam) || 'Chưa chọn';
                        const teamCode = selectedTeam?.teamCode || '';
                        const gdkdName = getGDKDName(selectedTeam);

                        const fbDigitalChuaVatVal = parseCurrencyFormula(editingRowState.fbDigital).total;
                        const digitalCostVal = Math.round(fbDigitalChuaVatVal * 1.10);

                        const caNhanVal = parseCurrencyFormula(editingRowState.caNhan).total;

                        const fbVisaChuaVatVal = parseCurrencyFormula(editingRowState.fbVisa).total;
                        const visaCostVal = Math.round(fbVisaChuaVatVal * 1.10);

                        const dangTinCaNhanVal = parseCurrencyFormula(editingRowState.dangTinCaNhan).total;

                        const dangTinCongTyChuaVatVal = parseCurrencyFormula(editingRowState.dangTinCongTy).total;
                        const dangTinCongTyCostVal = Math.round(dangTinCongTyChuaVatVal * 1.08);

                        const zaloVal = parseCurrencyFormula(editingRowState.zalo).total;
                        const googleVal = parseCurrencyFormula(editingRowState.google).total;
                        const tiktokVal = parseCurrencyFormula(editingRowState.tiktok).total;

                        const totalCostVal = digitalCostVal + caNhanVal + visaCostVal + dangTinCaNhanVal + dangTinCongTyCostVal + zaloVal + googleVal + tiktokVal;

                        const updateEditingField = (field: string, val: any) => {
                          setEditingRowState((prev: any) => ({ ...prev, [field]: val }));
                        };

                        return (
                          <TableRow key={item.id} className="bg-amber-50/50 hover:bg-amber-50 border-b border-amber-200">
                            <TableCell className="text-center font-bold font-mono text-xs text-amber-700 px-1">
                              Sửa-{index + 1}
                            </TableCell>
                            <TableCell className="p-1">
                              <span className="text-[10px] font-black uppercase text-amber-800 bg-white px-2 py-1 rounded border border-amber-200 block truncate max-w-[120px]" title={blockName}>
                                {blockName}
                              </span>
                            </TableCell>
                            <TableCell className="p-1">
                              <InlineSearchableSelect
                                value={editingRowState.teamId}
                                onValueChange={(val: string) => updateEditingField('teamId', val)}
                                items={teams.map((t: any) => ({ value: t.id, label: `${t.name} (${t.teamCode || 'N/A'})` }))}
                                placeholder="Chọn team..."
                                searchPlaceholder="Tìm kiếm..."
                              />
                            </TableCell>
                            <TableCell className="text-center p-1 text-xs font-bold font-mono text-slate-800 whitespace-nowrap min-w-[100px]">
                              {teamCode || '-'}
                            </TableCell>
                            <TableCell className="p-1 whitespace-nowrap min-w-[140px] text-xs font-bold text-slate-850 text-left" title={gdkdName}>
                              {gdkdName || '-'}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="Người phụ trách..."
                                className="h-8 px-2 text-[10px] bg-white border border-amber-300 max-w-[110px]"
                                value={editingRowState.implementerName}
                                onChange={(e) => updateEditingField('implementerName', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <InlineSearchableSelect
                                value={editingRowState.projectId}
                                onValueChange={(val: string) => updateEditingField('projectId', val)}
                                items={projects.map((p: any) => ({ value: p.id, label: `${p.name} (${p.projectCode || ''})` }))}
                                placeholder="Chọn dự án..."
                                searchPlaceholder="Tìm dự án..."
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.fbDigital}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('fbDigital', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('fbDigital', 'FB Digital (Chưa VAT)', editingRowState.fbDigital, (val) => updateEditingField('fbDigital', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-bold text-xs text-amber-800">
                              {formatCurrency(digitalCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.caNhan}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('caNhan', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('caNhan', 'Cá nhân', editingRowState.caNhan, (val) => updateEditingField('caNhan', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.fbVisa}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('fbVisa', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('fbVisa', 'FB Visa (Chưa VAT)', editingRowState.fbVisa, (val) => updateEditingField('fbVisa', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-bold text-xs text-amber-800">
                              {formatCurrency(visaCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.dangTinCaNhan}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('dangTinCaNhan', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('dangTinCaNhan', 'Đăng tin cá nhân', editingRowState.dangTinCaNhan, (val) => updateEditingField('dangTinCaNhan', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.dangTinCongTy}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('dangTinCongTy', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('dangTinCongTy', 'Đăng tin công ty (Chưa VAT)', editingRowState.dangTinCongTy, (val) => updateEditingField('dangTinCongTy', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-bold text-xs text-amber-800">
                              {formatCurrency(dangTinCongTyCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.zalo}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('zalo', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('zalo', 'Zalo', editingRowState.zalo, (val) => updateEditingField('zalo', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.google}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('google', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('google', 'Google', editingRowState.google, (val) => updateEditingField('google', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1">
                              <div className="relative group/input">
                                <Input
                                  placeholder="0"
                                  className="h-8 pl-1 pr-5 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                  value={editingRowState.tiktok}
                                  onChange={(e) => handleCostInputChange(e.target.value, (val) => updateEditingField('tiktok', val))}
                                />
                                <button
                                  type="button"
                                  onClick={() => handleOpenCalculator('tiktok', 'Tiktok', editingRowState.tiktok, (val) => updateEditingField('tiktok', val))}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/input:opacity-100 focus/input:opacity-100 p-0.5 text-slate-400 hover:text-amber-600 rounded transition-opacity"
                                  title="Tự động tính tổng nhiều chi phí (Sum)"
                                >
                                  <Calculator className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-black text-xs text-amber-900 bg-amber-100/40">
                              {formatCurrency(totalCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                type="month"
                                className="h-8 px-1 text-[10px] bg-white border border-amber-300 w-24 font-bold"
                                value={editingRowState.month}
                                onChange={(e) => updateEditingField('month', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="Ghi chú..."
                                className="h-8 px-2 text-[10px] bg-white border border-amber-300"
                                value={editingRowState.notes}
                                onChange={(e) => updateEditingField('notes', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="p-1 sticky right-0 bg-white/95 text-center shadow-l min-w-[124px] backdrop-blur-sm z-20">
                              <div className="flex justify-center gap-1">
                                <Button
                                  size="sm"
                                  className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2.5 rounded uppercase"
                                  onClick={handleSaveEditingRow}
                                >
                                  Lưu
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-bold text-[9px] px-1.5 rounded uppercase"
                                  onClick={() => {
                                    setEditingRowId(null);
                                    setEditingRowState(null);
                                  }}
                                >
                                  Hủy
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      // Normal display row
                      const fbChuaVat = item.fbDigitalChuaVat !== undefined ? item.fbDigitalChuaVat : Math.round((item.facebookCost || 0) / 1.1);
                      const visaChuaVat = item.fbVisaCostChuaVat !== undefined ? item.fbVisaCostChuaVat : Math.round((item.visaCost || 0) / 1.1);
                      const dangTinChuaVat = item.dangTinCongTyChuaVat !== undefined ? item.dangTinCongTyChuaVat : Math.round((item.postingCost || 0) / 1.08);
                      const caNhan = item.caNhanCost !== undefined ? item.caNhanCost : (item.otherCost || 0);

                      return (
                        <TableRow key={item.id} className="hover:bg-slate-50 transition-colors group">
                          {/* 1. STT */}
                          <TableCell className="text-center font-bold font-mono text-xs text-slate-400 px-2 bg-slate-50/50">
                            <div className="flex items-center justify-center gap-2.5">
                              <input 
                                type="checkbox" 
                                checked={selectedAcceptanceIds.includes(item.id)} 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAcceptanceIds(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedAcceptanceIds(prev => prev.filter(id => id !== item.id));
                                  }
                                }} 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4.5 h-4.5 cursor-pointer accent-indigo-600"
                              />
                              <span>{index + 1}</span>
                            </div>
                          </TableCell>
                          {/* 2. KHỐI */}
                          <TableCell className="font-bold text-[10px] text-slate-500 uppercase">
                            {(() => {
                              const teamObj = (teams || []).find((t: any) => t.id === item.teamId || t.name === item.teamName || (item.teamCode && t.teamCode === item.teamCode));
                              if (teamObj) {
                                const blk = (blocks || []).find((b: any) => b.id === teamObj.blockId || b.blockCode === teamObj.blockCode);
                                if (blk) return blk.name || blk.blockCode || 'N/A';
                              }
                              return item.blockName || item.blockCode || 'N/A';
                            })()}
                          </TableCell>
                          {/* 3. TEAM */}
                          <TableCell className="font-extrabold text-[11px] text-slate-900 truncate max-w-[130px]" title={item.teamName}>
                            {item.teamName}
                          </TableCell>
                          {/* 4. MÃ TEAM */}
                          <TableCell className="text-center font-bold font-mono text-xs text-slate-650 whitespace-nowrap min-w-[100px]">
                            {item.teamCode || '-'}
                          </TableCell>
                          {/* 5. GĐKD */}
                          <TableCell className="font-bold text-xs text-slate-600 whitespace-nowrap min-w-[140px]">
                            {item.gdkdName || '-'}
                          </TableCell>
                          {/* 6. Người Phụ trách */}
                          <TableCell className="font-semibold text-xs text-slate-600 truncate max-w-[110px]" title={item.implementerName}>
                            {item.implementerName || '-'}
                          </TableCell>
                          {/* 7. DỰ ÁN */}
                          <TableCell className="font-black text-xs text-slate-800 min-w-[200px] break-words whitespace-normal" title={item.projectName}>
                            {item.projectName}
                          </TableCell>
                          {/* 8. FB DIGITAL (Chưa VAT) */}
                          <TableCell className="text-right font-mono text-xs text-slate-500 font-medium">
                            {RenderValueWithBreakdown(fbChuaVat, item.costBreakdowns?.fbDigital, 'FB Digital CHƯA VAT')}
                          </TableCell>
                          {/* 9. DIGITAL (VAT 10%) */}
                          <TableCell className="text-right font-mono text-xs font-black text-slate-900">
                            {RenderValueWithBreakdown(
                              item.facebookCost || 0,
                              item.costBreakdowns?.fbDigital ? { 
                                ...item.costBreakdowns.fbDigital, 
                                items: item.costBreakdowns.fbDigital.items.map((it: any) => ({ ...it, amount: Math.round(it.amount * 1.10) })) 
                              } : null,
                              'FB Digital ĐÃ VAT'
                            )}
                          </TableCell>
                          {/* 10. CÁ NHÂN */}
                          <TableCell className="text-right font-mono text-xs text-slate-600">
                            {RenderValueWithBreakdown(caNhan, item.costBreakdowns?.caNhan, 'Cá nhân')}
                          </TableCell>
                          {/* 11. FB VISA TỰ CHẠY (Chưa VAT) */}
                          <TableCell className="text-right font-mono text-xs text-slate-500">
                            {RenderValueWithBreakdown(visaChuaVat, item.costBreakdowns?.fbVisa, 'FB Visa CHƯA VAT')}
                          </TableCell>
                          {/* 12. TỰ CHẠY VISA (VAT 10%) */}
                          <TableCell className="text-right font-mono text-xs font-black text-indigo-800">
                            {RenderValueWithBreakdown(
                              item.visaCost || 0,
                              item.costBreakdowns?.fbVisa ? { 
                                ...item.costBreakdowns.fbVisa, 
                                items: item.costBreakdowns.fbVisa.items.map((it: any) => ({ ...it, amount: Math.round(it.amount * 1.10) })) 
                              } : null,
                              'FB Visa ĐÃ VAT'
                            )}
                          </TableCell>
                          {/* 13. ĐĂNG TIN CÁ NHÂN */}
                          <TableCell className="text-right font-mono text-xs text-slate-600">
                            {RenderValueWithBreakdown(item.dangTinCaNhanCost || 0, item.costBreakdowns?.dangTinCaNhan, 'Đăng tin cá nhân')}
                          </TableCell>
                          {/* 14. ĐĂNG TIN CÔNG TY (Chưa VAT) */}
                          <TableCell className="text-right font-mono text-xs text-slate-500">
                            {RenderValueWithBreakdown(dangTinChuaVat, item.costBreakdowns?.dangTinCongTy, 'Đăng tin công ty CHƯA VAT')}
                          </TableCell>
                          {/* 15. ĐĂNG TIN CÔNG TY (VAT 10%) */}
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                            {RenderValueWithBreakdown(
                              item.postingCost || 0,
                              item.costBreakdowns?.dangTinCongTy ? { 
                                ...item.costBreakdowns.dangTinCongTy, 
                                items: item.costBreakdowns.dangTinCongTy.items.map((it: any) => ({ ...it, amount: Math.round(it.amount * 1.08) })) 
                              } : null,
                              'Đăng tin công ty ĐÃ VAT'
                            )}
                          </TableCell>
                          {/* 16. ZALO */}
                          <TableCell className="text-right font-mono text-xs text-slate-700">
                            {RenderValueWithBreakdown(item.zaloCost || 0, item.costBreakdowns?.zalo, 'Zalo')}
                          </TableCell>
                          {/* 17. GOOGLE */}
                          <TableCell className="text-right font-mono text-xs text-slate-700">
                            {RenderValueWithBreakdown(item.googleCost || 0, item.costBreakdowns?.google, 'Google')}
                          </TableCell>
                          {/* 18. TIKTOK */}
                          <TableCell className="text-right font-mono text-xs text-slate-700">
                            {RenderValueWithBreakdown(item.tiktokCost || 0, item.costBreakdowns?.tiktok, 'Tiktok')}
                          </TableCell>
                          {/* 19. TỔNG TIỀN */}
                          <TableCell className="text-right font-mono text-xs font-black bg-indigo-50/10 text-emerald-800 font-extrabold">
                            {formatCurrency(item.totalCost || item.afterAcceptanceCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 20. THÁNG */}
                          <TableCell className="text-center font-bold text-xs text-slate-500">
                            {item.month || '-'}
                          </TableCell>
                          {/* 21. Ghi chú */}
                          <TableCell className="text-xs text-slate-500 italic max-w-[200px] truncate" title={item.notes}>
                            {item.notes || '-'}
                          </TableCell>
                          {/* Action cell */}
                          <TableCell className="p-1 sticky right-0 bg-white/95 text-center shadow-l min-w-[130px] group-hover:bg-slate-50/95 duration-100 backdrop-blur-sm z-20">
                            <div className="flex justify-center gap-1">
                              {item.status !== 'Đã nghiệm thu' ? (
                                <>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleStartEditRow(item)}
                                    className="h-8 w-8 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-full"
                                    title="Sửa bản ghi này"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  {(isAdmin || isSuperAdmin || isMod) && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setAcceptanceToFinalize(item);
                                        setIsFinalizeDialogOpen(true);
                                      }}
                                      className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2 rounded uppercase"
                                      title="Xác nhận & ghi nhận chi phí"
                                    >
                                      Xác nhận
                                    </Button>
                                  )}
                                </>
                              ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-none font-black text-[9px] uppercase tracking-wider py-1 px-2.5 rounded-lg flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Đã ghi nhận CP
                                </Badge>
                              )}
                              
                              {(isAdmin || isSuperAdmin) && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    if (acceptanceListView === 'pending') {
                                      setAcceptanceToDelete(item.id);
                                      setIsDeleteDialogOpen(true);
                                    } else {
                                      setFinalAcceptanceToDelete(item.id);
                                      setIsDeleteFinalDialogOpen(true);
                                    }
                                  }}
                                  className="h-8 w-8 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-full"
                                  title="Xóa bản ghi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>

                {/* Table general totals row */}
                <TableFooter className="bg-slate-100/50 font-black border-t-2 border-slate-200 z-10 sticky bottom-0">
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-black text-slate-900 text-xs px-4">
                      TỔNG CỘNG ({acceptanceListView === 'pending' ? filteredAcceptances.length : filteredFinalAcceptances.length} dòng):
                    </TableCell>
                    {/* 8. FB Digital Chua VAT */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.fbChuaVat : calculatedFinalTotals.fbChuaVat).replace(' đ', '')}
                    </TableCell>
                    {/* 9. Digital VAT 10% */}
                    <TableCell className="text-right font-mono text-xs font-black text-indigo-750 bg-indigo-50/10">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.digitalCost : calculatedFinalTotals.digitalCost).replace(' đ', '')}
                    </TableCell>
                    {/* 10. Cá nhân */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.caNhan : calculatedFinalTotals.caNhan).replace(' đ', '')}
                    </TableCell>
                    {/* 11. FB Visa Chua VAT */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.visaChuaVat : calculatedFinalTotals.visaChuaVat).replace(' đ', '')}
                    </TableCell>
                    {/* 12. Visa VAT 10% */}
                    <TableCell className="text-right font-mono text-xs font-black text-indigo-750 bg-indigo-50/10">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.visaCost : calculatedFinalTotals.visaCost).replace(' đ', '')}
                    </TableCell>
                    {/* 13. Đăng tin cá nhân */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.dangTinCaNhan : calculatedFinalTotals.dangTinCaNhan).replace(' đ', '')}
                    </TableCell>
                    {/* 14. Đăng tin công ty Chua VAT */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.dangTinCongTyChuaVat : calculatedFinalTotals.dangTinCongTyChuaVat).replace(' đ', '')}
                    </TableCell>
                    {/* 15. Đăng tin công ty VAT 10% */}
                    <TableCell className="text-right font-mono text-xs font-black text-indigo-750 bg-indigo-50/10">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.dangTinCongTyCost : calculatedFinalTotals.dangTinCongTyCost).replace(' đ', '')}
                    </TableCell>
                    {/* 16. Zalo */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.zalo : calculatedFinalTotals.zalo).replace(' đ', '')}
                    </TableCell>
                    {/* 17. Google */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.google : calculatedFinalTotals.google).replace(' đ', '')}
                    </TableCell>
                    {/* 18. Tiktok */}
                    <TableCell className="text-right font-mono text-xs font-black text-slate-900 bg-slate-100/30">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.tiktok : calculatedFinalTotals.tiktok).replace(' đ', '')}
                    </TableCell>
                    {/* 19. Tổng tiền */}
                    <TableCell className="text-right font-mono text-xs font-black bg-emerald-50 text-emerald-800">
                      {formatCurrency(acceptanceListView === 'pending' ? calculatedPendingTotals.total : calculatedFinalTotals.total).replace(' đ', '')}
                    </TableCell>
                    {/* Rest of padding cells */}
                    <TableCell colSpan={2} className="bg-slate-100/30"></TableCell>
                    <TableCell className="sticky right-0 bg-slate-100/70 shadow-l"></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📊 Interactive Multi-Value Sum Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCalculatorOpen(false);
          setActiveCalculatorField(null);
          setCalculatorUpdateFn(null);
        }
      }}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Phân rã chi phí / Tự động SUM
                </h3>
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  Cột: {calculatorFieldNameVN}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                Nhập công thức hoặc chuỗi giá trị cộng dồn:
              </label>
              <textarea
                value={calculatorInput}
                onChange={(e) => setCalculatorInput(e.target.value)}
                rows={3}
                className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-normal"
                placeholder="Ví dụ:&#10;10m + 1.25m + 300k&#10;Hoặc line-by-line:&#10;10.000.000&#10;5.500.000 (Tên nhãn)&#10;300.000; 1.200.000"
              />
              <p className="text-[9.5px] font-semibold text-slate-400 leading-relaxed italic">
                * Hỗ trợ viết nhãn kèm theo trong ngoặc: <strong>10m (Phí setup) + 500k (Banner)</strong>. Hệ thống tự động bóc tách số và tính tổng. Hỗ trợ đơn vị viết tắt: m (triệu), k (nghìn).
              </p>
            </div>

            {/* Live Traceability Results */}
            {(() => {
              const { total, items } = parseCurrencyFormula(calculatorInput);
              return (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Bảng tra soát chi tiết học được (SUM):
                    </span>
                    <span className="font-mono text-sm font-black text-indigo-650 font-bold">
                      {formatCurrency(total).replace(' đ', '')}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {items.length === 0 ? (
                      <div className="text-center py-4 text-[11px] font-bold text-slate-400">
                        Chưa có giá trị hợp lệ. Hãy bắt đầu gõ công thức ở trên!
                      </div>
                    ) : (
                      items.map((sub: any, sidx: number) => (
                        <div key={sidx} className="flex justify-between items-center text-[10.5px]">
                          <span className="text-slate-500 font-medium truncate max-w-[200px]">
                            {sidx + 1}. {sub.label || 'Mục nhỏ'}
                          </span>
                          <span className="font-mono font-bold text-slate-850">
                            {formatCurrency(sub.amount).replace(' đ', '')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase rounded-xl"
                onClick={() => {
                  if (activeCalculatorField && calculatorUpdateFn) {
                    calculatorUpdateFn(calculatorInput);
                  }
                  setIsCalculatorOpen(false);
                  setActiveCalculatorField(null);
                  setCalculatorUpdateFn(null);
                }}
              >
                Áp dụng & Ghi nhận
              </Button>
              <Button
                variant="ghost"
                type="button"
                className="h-10 text-slate-550 hover:text-slate-800 font-bold text-[11px] uppercase rounded-xl border border-slate-200 px-4"
                onClick={() => {
                  setIsCalculatorOpen(false);
                  setActiveCalculatorField(null);
                  setCalculatorUpdateFn(null);
                }}
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* dialog warning/confirmations */}
      <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Ghi nhận chi phí nghiệm thu?</h3>
              <p className="text-xs font-bold text-slate-500 italic px-4 leading-relaxed">
                Hành động này sẽ xác nhận nghiệm thu và chính thức ghi nhận chi phí này vào báo cáo.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl font-black text-xs" 
                onClick={() => {
                  setIsFinalizeDialogOpen(false);
                  setAcceptanceToFinalize(null);
                }} 
                disabled={isFinalizing !== null}
              >
                HỦY BỎ
              </Button>
              <Button 
                className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-100" 
                onClick={() => acceptanceToFinalize && handleFinalizeAcceptance(acceptanceToFinalize)}
                disabled={isFinalizing !== null}
              >
                {isFinalizing !== null ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                GHI NHẬN CHI PHÍ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Xóa các bản nghiệm thu?</h3>
              <p className="text-xs font-bold text-slate-500 italic px-4 leading-relaxed">
                Bạn có chắc chắn muốn xóa {selectedAcceptanceIds.length} bản ghi nghiệm thu đã chọn khỏi hệ thống? Phục hồi dữ liệu sẽ không khả thi.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl font-black text-xs" 
                onClick={() => {
                  setIsBulkDeleteDialogOpen(false);
                }} 
                disabled={isDeletingAcceptance}
              >
                HỦY
              </Button>
              <Button 
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-100" 
                onClick={handleBulkDeleteAcceptances}
                disabled={isDeletingAcceptance}
              >
                {isDeletingAcceptance ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                XÓA NGAY
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Xóa bản nghiệm thu?</h3>
              <p className="text-xs font-bold text-slate-500 italic px-4 leading-relaxed">
                Bạn có chắc chắn muốn xóa bản ghi nghiệm thu chưa chốt này khỏi hệ thống?
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl font-black text-xs" 
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setAcceptanceToDelete(null);
                }} 
                disabled={isDeletingAcceptance}
              >
                HỦY
              </Button>
              <Button 
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-100" 
                onClick={() => acceptanceToDelete && handleDeleteAcceptance(acceptanceToDelete)}
                disabled={isDeletingAcceptance}
              >
                {isDeletingAcceptance ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                XÓA NGAY
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteFinalDialogOpen} onOpenChange={setIsDeleteFinalDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Xóa quyết toán đã chốt?</h3>
              <p className="text-xs font-bold text-slate-500 italic px-4 leading-relaxed">
                Hành động này sẽ hủy và xóa bản ghi quyết toán đã chốt này.
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-11 rounded-xl font-black text-xs" 
                onClick={() => {
                  setIsDeleteFinalDialogOpen(false);
                  setFinalAcceptanceToDelete(null);
                }} 
                disabled={isDeletingAcceptance}
              >
                HỦY
              </Button>
              <Button 
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-100" 
                onClick={() => finalAcceptanceToDelete && handleDeleteFinalAcceptance(finalAcceptanceToDelete)}
                disabled={isDeletingAcceptance}
              >
                {isDeletingAcceptance ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                XÓA QUYẾT TOÁN
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isImportAcceptancesDialogOpen} onOpenChange={setIsImportAcceptancesDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-6">
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                Nhập dữ liệu Excel mkt
              </DialogTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Import file nghiệm thu</p>
            </div>
            
            <div className="p-10 border-2 border-dashed border-indigo-100 rounded-3xl bg-slate-50/50 text-center hover:bg-slate-50 transition-all group relative">
              <input type="file" id="file-upload-acceptance-restored" className="hidden" onChange={handleImportAcceptancesCSV} />
              <label htmlFor="file-upload-acceptance-restored" className="cursor-pointer space-y-4 block">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-md group-hover:scale-105 transition-transform">
                  <Upload className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <p className="font-extrabold text-sm text-slate-800">Chọn file từ máy tính</p>
                  <p className="text-[10px] text-slate-400 mt-1">Hỗ trợ định dạng .xlsx, .csv</p>
                </div>
              </label>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setIsImportAcceptancesDialogOpen(false)} className="rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-500 h-10 px-6">
                Đóng
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});
