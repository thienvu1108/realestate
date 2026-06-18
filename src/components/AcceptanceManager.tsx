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
  CheckSquare, FileText, AlertCircle, RefreshCw, X, ChevronRight, PlusCircle
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
  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [acceptanceToFinalize, setAcceptanceToFinalize] = useState<any>(null);

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
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [acceptances, debouncedAcceptanceSearch, acceptanceMonthFilter, acceptanceProjectFilter, acceptanceTeamFilter, acceptanceCategoryFilter, acceptanceBlockFilter, sortConfig]);

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
      let aVal = a[sortConfig.key] || '';
      let bVal = b[sortConfig.key] || '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [finalAcceptances, debouncedAcceptanceSearch, acceptanceMonthFilter, acceptanceProjectFilter, acceptanceTeamFilter, acceptanceCategoryFilter, sortConfig]);

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

      const fbDigitalChuaVatNum = parseFloat(draftRow.fbDigital.replace(/\./g, '')) || 0;
      const digitalCostNum = Math.round(fbDigitalChuaVatNum * 1.10);

      const caNhanNum = parseFloat(draftRow.caNhan.replace(/\./g, '')) || 0;

      const fbVisaChuaVatNum = parseFloat(draftRow.fbVisa.replace(/\./g, '')) || 0;
      const visaCostNum = Math.round(fbVisaChuaVatNum * 1.10);

      const dangTinCaNhanNum = parseFloat(draftRow.dangTinCaNhan.replace(/\./g, '')) || 0;

      const dangTinCongTyChuaVatNum = parseFloat(draftRow.dangTinCongTy.replace(/\./g, '')) || 0;
      const dangTinCongTyCostNum = Math.round(dangTinCongTyChuaVatNum * 1.08);

      const zaloNum = parseFloat(draftRow.zalo.replace(/\./g, '')) || 0;
      const googleNum = parseFloat(draftRow.google.replace(/\./g, '')) || 0;
      const tiktokNum = parseFloat(draftRow.tiktok.replace(/\./g, '')) || 0;

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
      fbDigital: formatCurrencyInput(String(acc.fbDigitalChuaVat !== undefined ? acc.fbDigitalChuaVat : Math.round((acc.facebookCost || 0) / 1.1))),
      caNhan: formatCurrencyInput(String(acc.caNhanCost !== undefined ? acc.caNhanCost : (acc.otherCost || 0))),
      fbVisa: formatCurrencyInput(String(acc.fbVisaCostChuaVat !== undefined ? acc.fbVisaCostChuaVat : Math.round((acc.visaCost || 0) / 1.1))),
      dangTinCaNhan: formatCurrencyInput(String(acc.dangTinCaNhanCost || 0)),
      dangTinCongTy: formatCurrencyInput(String(acc.dangTinCongTyChuaVat !== undefined ? acc.dangTinCongTyChuaVat : Math.round((acc.postingCost || 0) / 1.08))),
      zalo: formatCurrencyInput(String(acc.zaloCost || 0)),
      google: formatCurrencyInput(String(acc.googleCost || 0)),
      tiktok: formatCurrencyInput(String(acc.tiktokCost || 0)),
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

      const fbDigitalChuaVatNum = parseFloat(editingRowState.fbDigital.replace(/\./g, '')) || 0;
      const digitalCostNum = Math.round(fbDigitalChuaVatNum * 1.10);

      const caNhanNum = parseFloat(editingRowState.caNhan.replace(/\./g, '')) || 0;

      const fbVisaChuaVatNum = parseFloat(editingRowState.fbVisa.replace(/\./g, '')) || 0;
      const visaCostNum = Math.round(fbVisaChuaVatNum * 1.10);

      const dangTinCaNhanNum = parseFloat(editingRowState.dangTinCaNhan.replace(/\./g, '')) || 0;

      const dangTinCongTyChuaVatNum = parseFloat(editingRowState.dangTinCongTy.replace(/\./g, '')) || 0;
      const dangTinCongTyCostNum = Math.round(dangTinCongTyChuaVatNum * 1.08);

      const zaloNum = parseFloat(editingRowState.zalo.replace(/\./g, '')) || 0;
      const googleNum = parseFloat(editingRowState.google.replace(/\./g, '')) || 0;
      const tiktokNum = parseFloat(editingRowState.tiktok.replace(/\./g, '')) || 0;

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
      await deleteDoc(doc(db, 'finalAcceptances', id));
      toast.success('Đã xóa bản ghi thực tế', { id: toastId });
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
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest font-sans">
                Nghiệm thu ({filteredAcceptances.length} bản ghi)
              </h2>
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
                    <TableHead className="w-32 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Khối</TableHead>
                    <TableHead className="w-56 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Team</TableHead>
                    <TableHead className="w-28 text-center text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Mã Team</TableHead>
                    <TableHead className="w-40 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">GĐKD</TableHead>
                    <TableHead className="w-40 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Người Phụ trách</TableHead>
                    <TableHead className="w-56 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Dự án</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">FB Digital (Chưa VAT)</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Digital (VAT 10%)/Thực chi</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Cá nhân</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">FB Visa Trực Chạy (C.VAT)</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Visa Trực Chạy (10%)</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Đăng Tin C.Nhân</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Đăng Tin C.Ty (C.VAT)</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Đăng Tin C.Ty (8%)</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Zalo</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Google / Native</TableHead>
                    <TableHead className="w-36 text-right text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Tiktok</TableHead>
                    <TableHead className="w-40 text-right text-[10px] font-black bg-indigo-50/40 text-indigo-800 uppercase sticky top-0 z-20 border-b border-indigo-200 font-bold">Tổng tiền</TableHead>
                    <TableHead className="w-32 text-center text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Tháng</TableHead>
                    <TableHead className="w-56 text-[10px] font-black text-slate-600 uppercase sticky top-0 bg-slate-100 z-20 border-b border-slate-200">Ghi chú</TableHead>
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

                    const fbDigitalChuaVatVal = parseFloat(draft.fbDigital.replace(/\./g, '')) || 0;
                    const digitalCostVal = Math.round(fbDigitalChuaVatVal * 1.10);

                    const caNhanVal = parseFloat(draft.caNhan.replace(/\./g, '')) || 0;

                    const fbVisaChuaVatVal = parseFloat(draft.fbVisa.replace(/\./g, '')) || 0;
                    const visaCostVal = Math.round(fbVisaChuaVatVal * 1.10);

                    const dangTinCaNhanVal = parseFloat(draft.dangTinCaNhan.replace(/\./g, '')) || 0;

                    const dangTinCongTyChuaVatVal = parseFloat(draft.dangTinCongTy.replace(/\./g, '')) || 0;
                    const dangTinCongTyCostVal = Math.round(dangTinCongTyChuaVatVal * 1.08);

                    const zaloVal = parseFloat(draft.zalo.replace(/\./g, '')) || 0;
                    const googleVal = parseFloat(draft.google.replace(/\./g, '')) || 0;
                    const tiktokVal = parseFloat(draft.tiktok.replace(/\./g, '')) || 0;

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
                        <TableCell className="text-center p-1 text-xs font-bold font-mono text-slate-600">
                          {teamCode || '-'}
                        </TableCell>
                        <TableCell className="p-1 truncate max-w-[150px] text-xs font-bold text-slate-600 text-left" title={gdkdName}>
                          {gdkdName || '-'}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="Người phụ trách..."
                            className="h-8 px-2 text-[10px] bg-white border border-slate-200"
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
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.fbDigital}
                            onChange={(e) => updateDraftField('fbDigital', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-bold text-xs text-indigo-700">
                          {formatCurrency(digitalCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.caNhan}
                            onChange={(e) => updateDraftField('caNhan', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.fbVisa}
                            onChange={(e) => updateDraftField('fbVisa', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-bold text-xs text-indigo-700">
                          {formatCurrency(visaCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.dangTinCaNhan}
                            onChange={(e) => updateDraftField('dangTinCaNhan', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.dangTinCongTy}
                            onChange={(e) => updateDraftField('dangTinCongTy', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1 text-right font-mono font-bold text-xs text-indigo-700">
                          {formatCurrency(dangTinCongTyCostVal).replace(' đ', '')}
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.zalo}
                            onChange={(e) => updateDraftField('zalo', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.google}
                            onChange={(e) => updateDraftField('google', formatCurrencyInput(e.target.value))}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <Input
                            placeholder="0"
                            className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-slate-200"
                            value={draft.tiktok}
                            onChange={(e) => updateDraftField('tiktok', formatCurrencyInput(e.target.value))}
                          />
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

                        const fbDigitalChuaVatVal = parseFloat(editingRowState.fbDigital.replace(/\./g, '')) || 0;
                        const digitalCostVal = Math.round(fbDigitalChuaVatVal * 1.10);

                        const caNhanVal = parseFloat(editingRowState.caNhan.replace(/\./g, '')) || 0;

                        const fbVisaChuaVatVal = parseFloat(editingRowState.fbVisa.replace(/\./g, '')) || 0;
                        const visaCostVal = Math.round(fbVisaChuaVatVal * 1.10);

                        const dangTinCaNhanVal = parseFloat(editingRowState.dangTinCaNhan.replace(/\./g, '')) || 0;

                        const dangTinCongTyChuaVatVal = parseFloat(editingRowState.dangTinCongTy.replace(/\./g, '')) || 0;
                        const dangTinCongTyCostVal = Math.round(dangTinCongTyChuaVatVal * 1.08);

                        const zaloVal = parseFloat(editingRowState.zalo.replace(/\./g, '')) || 0;
                        const googleVal = parseFloat(editingRowState.google.replace(/\./g, '')) || 0;
                        const tiktokVal = parseFloat(editingRowState.tiktok.replace(/\./g, '')) || 0;

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
                            <TableCell className="text-center p-1 text-xs font-bold font-mono text-slate-800">
                              {teamCode || '-'}
                            </TableCell>
                            <TableCell className="p-1 truncate max-w-[150px] text-xs font-bold text-slate-850 text-left" title={gdkdName}>
                              {gdkdName || '-'}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="Người phụ trách..."
                                className="h-8 px-2 text-[10px] bg-white border border-amber-300"
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
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.fbDigital}
                                onChange={(e) => updateEditingField('fbDigital', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-bold text-xs text-amber-800">
                              {formatCurrency(digitalCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.caNhan}
                                onChange={(e) => updateEditingField('caNhan', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.fbVisa}
                                onChange={(e) => updateEditingField('fbVisa', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-bold text-xs text-amber-800">
                              {formatCurrency(visaCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.dangTinCaNhan}
                                onChange={(e) => updateEditingField('dangTinCaNhan', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.dangTinCongTy}
                                onChange={(e) => updateEditingField('dangTinCongTy', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1 text-right font-mono font-bold text-xs text-amber-800">
                              {formatCurrency(dangTinCongTyCostVal).replace(' đ', '')}
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.zalo}
                                onChange={(e) => updateEditingField('zalo', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.google}
                                onChange={(e) => updateEditingField('google', formatCurrencyInput(e.target.value))}
                              />
                            </TableCell>
                            <TableCell className="p-1">
                              <Input
                                placeholder="0"
                                className="h-8 px-2 text-[10px] font-mono font-bold text-right bg-white border border-amber-300"
                                value={editingRowState.tiktok}
                                onChange={(e) => updateEditingField('tiktok', formatCurrencyInput(e.target.value))}
                              />
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
                            {item.blockName || item.blockCode || 'N/A'}
                          </TableCell>
                          {/* 3. TEAM */}
                          <TableCell className="font-extrabold text-[11px] text-slate-900 truncate max-w-[150px]" title={item.teamName}>
                            {item.teamName}
                          </TableCell>
                          {/* 4. MÃ TEAM */}
                          <TableCell className="text-center font-bold font-mono text-xs text-slate-650">
                            {item.teamCode || '-'}
                          </TableCell>
                          {/* 5. GĐKD */}
                          <TableCell className="font-bold text-xs text-slate-600">
                            {item.gdkdName || '-'}
                          </TableCell>
                          {/* 6. Người Phụ trách */}
                          <TableCell className="font-semibold text-xs text-slate-600">
                            {item.implementerName || '-'}
                          </TableCell>
                          {/* 7. DỰ ÁN */}
                          <TableCell className="font-black text-xs text-slate-700 truncate max-w-[150px]" title={item.projectName}>
                            {item.projectName}
                          </TableCell>
                          {/* 8. FB DIGITAL (Chưa VAT) */}
                          <TableCell className="text-right font-mono text-xs text-slate-500 font-medium">
                            {formatCurrency(fbChuaVat).replace(' đ', '')}
                          </TableCell>
                          {/* 9. DIGITAL (VAT 10%) */}
                          <TableCell className="text-right font-mono text-xs font-black text-slate-900">
                            {formatCurrency(item.facebookCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 10. CÁ NHÂN */}
                          <TableCell className="text-right font-mono text-xs text-slate-600">
                            {formatCurrency(caNhan).replace(' đ', '')}
                          </TableCell>
                          {/* 11. FB VISA TỰ CHẠY (Chưa VAT) */}
                          <TableCell className="text-right font-mono text-xs text-slate-500">
                            {formatCurrency(visaChuaVat).replace(' đ', '')}
                          </TableCell>
                          {/* 12. TỰ CHẠY VISA (VAT 10%) */}
                          <TableCell className="text-right font-mono text-xs font-black text-indigo-800">
                            {formatCurrency(item.visaCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 13. ĐĂNG TIN CÁ NHÂN */}
                          <TableCell className="text-right font-mono text-xs text-slate-600">
                            {formatCurrency(item.dangTinCaNhanCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 14. ĐĂNG TIN CÔNG TY (Chưa VAT) */}
                          <TableCell className="text-right font-mono text-xs text-slate-500">
                            {formatCurrency(dangTinChuaVat).replace(' đ', '')}
                          </TableCell>
                          {/* 15. ĐĂNG TIN CÔNG TY (VAT 10%) */}
                          <TableCell className="text-right font-mono text-xs font-bold text-slate-900">
                            {formatCurrency(item.postingCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 16. ZALO */}
                          <TableCell className="text-right font-mono text-xs text-slate-700">
                            {formatCurrency(item.zaloCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 17. GOOGLE */}
                          <TableCell className="text-right font-mono text-xs text-slate-700">
                            {formatCurrency(item.googleCost || 0).replace(' đ', '')}
                          </TableCell>
                          {/* 18. TIKTOK */}
                          <TableCell className="text-right font-mono text-xs text-slate-700">
                            {formatCurrency(item.tiktokCost || 0).replace(' đ', '')}
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
