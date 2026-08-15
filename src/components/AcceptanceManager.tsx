import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  Search, 
  ShieldCheck, 
  FileSpreadsheet, 
  Calculator,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc, 
  serverTimestamp, 
  writeBatch 
} from 'firebase/firestore';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

import { AcceptanceTableHeader } from './acceptance/AcceptanceTableHeader';
import { AcceptanceDraftRow } from './acceptance/AcceptanceDraftRow';
import { AcceptanceRow } from './acceptance/AcceptanceRow';
import { AcceptanceFooter } from './acceptance/AcceptanceFooter';
import { AcceptanceDialogs } from './acceptance/AcceptanceDialogs';
import { 
  parseCurrencyFormula, 
  getRowComputed, 
  getSortValue, 
  buildCostBreakdownsOfRecord 
} from './acceptance/acceptanceUtils';

export const AcceptanceManager = React.memo(({ 
  isAdmin, isSuperAdmin, isMod, isAccountant, user, teams = [], projects = [], regions = [], acceptances = [], finalAcceptances = [], teamMap = {}, projectMap = {}, 
  formatCurrency, getMarketingMonth, handleFirestoreError, formatCurrencyInput,
  isImportingAcceptances, setIsImportingAcceptances, isImportAcceptancesDialogOpen, setIsImportAcceptancesDialogOpen,
  handleImportAcceptancesCSV, uniqueTeams = [], blocks = []
}: any) => {

  const [acceptanceListView, setAcceptanceListView] = useState<'pending' | 'finalized'>('pending');
  const [acceptanceSearch, setAcceptanceSearch] = useState('');
  const [debouncedAcceptanceSearch, setDebouncedAcceptanceSearch] = useState('');
  const [acceptanceMonthFilter, setAcceptanceMonthFilter] = useState('all');
  const [acceptanceProjectFilter, setAcceptanceProjectFilter] = useState('all');
  const [acceptanceTeamFilter, setAcceptanceTeamFilter] = useState('all');
  const [acceptanceBlockFilter, setAcceptanceBlockFilter] = useState('all');
  const [acceptanceRegionFilter, setAcceptanceRegionFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<any>({ key: null, direction: null });

  // Multi-select state
  const [selectedAcceptanceIds, setSelectedAcceptanceIds] = useState<string[]>([]);

  // Draft rows for inline addition
  const [draftRows, setDraftRows] = useState<any[]>([]);

  // Editing row state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowState, setEditingRowState] = useState<any | null>(null);

  // Dialog states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [activeCalculatorField, setActiveCalculatorField] = useState<string | null>(null);
  const [calculatorFieldNameVN, setCalculatorFieldNameVN] = useState('');
  const [calculatorInput, setCalculatorInput] = useState('');
  const [calculatorUpdateFn, setCalculatorUpdateFn] = useState<((val: string) => void) | null>(null);

  const [isFinalizeDialogOpen, setIsFinalizeDialogOpen] = useState(false);
  const [itemToFinalize, setItemToFinalize] = useState<any>(null);
  const [isFinalizing, setIsFinalizing] = useState<string | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const [isDeleteFinalDialogOpen, setIsDeleteFinalDialogOpen] = useState(false);
  const [itemFinalToDeleteId, setItemFinalToDeleteId] = useState<string | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [historyTargetRecord, setHistoryTargetRecord] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAcceptanceSearch(acceptanceSearch);
    }, 250);
    return () => clearTimeout(handler);
  }, [acceptanceSearch]);

  // Unique months list with "Kì 1 - Tháng 8" & "Kì 2 - Tháng 8"
  const uniqueMonths = useMemo(() => {
    const set = new Set<string>();
    set.add('Kì 1 - Tháng 8');
    set.add('Kì 2 - Tháng 8');
    (acceptances || []).forEach((a: any) => { if (a.month) set.add(a.month); });
    (finalAcceptances || []).forEach((a: any) => { if (a.month) set.add(a.month); });

    return Array.from(set).sort((a, b) => {
      if (a === 'Kì 1 - Tháng 8') return -1;
      if (b === 'Kì 1 - Tháng 8') return 1;
      if (a === 'Kì 2 - Tháng 8') return -1;
      if (b === 'Kì 2 - Tháng 8') return 1;
      return b.localeCompare(a);
    });
  }, [acceptances, finalAcceptances]);

  // Filtered acceptances (pending)
  const filteredAcceptances = useMemo(() => {
    return (acceptances || []).filter((a: any) => {
      // Month match
      let matchesMonth = true;
      if (acceptanceMonthFilter !== 'all') {
        if (acceptanceMonthFilter === 'Kì 1 - Tháng 8') {
          matchesMonth = a.month === 'Kì 1 - Tháng 8' || a.month === 'Kỳ 1 - Tháng 8' || (a.month?.includes('8') && (a.month?.includes('1') || a.month?.includes('K1')));
        } else if (acceptanceMonthFilter === 'Kì 2 - Tháng 8') {
          matchesMonth = a.month === 'Kì 2 - Tháng 8' || a.month === 'Kỳ 2 - Tháng 8' || (a.month?.includes('8') && (a.month?.includes('2') || a.month?.includes('K2')));
        } else {
          matchesMonth = a.month === acceptanceMonthFilter;
        }
      }

      // Block match
      const tm = (teams || []).find((t: any) => t.id === a.teamId || t.teamCode === a.teamCode);
      const matchesBlock = acceptanceBlockFilter === 'all' || 
        a.blockId === acceptanceBlockFilter || 
        a.blockCode === acceptanceBlockFilter ||
        tm?.blockId === acceptanceBlockFilter ||
        tm?.blockCode === acceptanceBlockFilter;

      // Team match
      const matchesTeam = acceptanceTeamFilter === 'all' || a.teamId === acceptanceTeamFilter || a.teamCode === acceptanceTeamFilter;

      // Project match
      const matchesProject = acceptanceProjectFilter === 'all' || a.projectId === acceptanceProjectFilter || a.projectName === acceptanceProjectFilter;

      // Search term
      let matchesSearch = true;
      if (debouncedAcceptanceSearch) {
        const query = debouncedAcceptanceSearch.toLowerCase().trim();
        matchesSearch = (a.projectName || '').toLowerCase().includes(query) ||
          (a.teamName || '').toLowerCase().includes(query) ||
          (a.teamCode || '').toLowerCase().includes(query) ||
          (a.gdkdName || '').toLowerCase().includes(query) ||
          (a.implementerName || '').toLowerCase().includes(query) ||
          (a.month || '').toLowerCase().includes(query) ||
          (a.notes || '').toLowerCase().includes(query);
      }

      return matchesMonth && matchesBlock && matchesTeam && matchesProject && matchesSearch;
    }).sort((a: any, b: any) => {
      if (!sortConfig.key) return 0;
      const valA = getSortValue(a, sortConfig.key, teams, blocks);
      const valB = getSortValue(b, sortConfig.key, teams, blocks);
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.direction === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [acceptances, acceptanceMonthFilter, acceptanceBlockFilter, acceptanceTeamFilter, acceptanceProjectFilter, debouncedAcceptanceSearch, sortConfig, teams, blocks]);

  // Filtered final acceptances (finalized)
  const filteredFinalAcceptances = useMemo(() => {
    return (finalAcceptances || []).filter((a: any) => {
      let matchesMonth = true;
      if (acceptanceMonthFilter !== 'all') {
        if (acceptanceMonthFilter === 'Kì 1 - Tháng 8') {
          matchesMonth = a.month === 'Kì 1 - Tháng 8' || a.month === 'Kỳ 1 - Tháng 8' || (a.month?.includes('8') && (a.month?.includes('1') || a.month?.includes('K1')));
        } else if (acceptanceMonthFilter === 'Kì 2 - Tháng 8') {
          matchesMonth = a.month === 'Kì 2 - Tháng 8' || a.month === 'Kỳ 2 - Tháng 8' || (a.month?.includes('8') && (a.month?.includes('2') || a.month?.includes('K2')));
        } else {
          matchesMonth = a.month === acceptanceMonthFilter;
        }
      }

      const tm = (teams || []).find((t: any) => t.id === a.teamId || t.teamCode === a.teamCode);
      const matchesBlock = acceptanceBlockFilter === 'all' || 
        a.blockId === acceptanceBlockFilter || 
        a.blockCode === acceptanceBlockFilter ||
        tm?.blockId === acceptanceBlockFilter ||
        tm?.blockCode === acceptanceBlockFilter;

      const matchesTeam = acceptanceTeamFilter === 'all' || a.teamId === acceptanceTeamFilter || a.teamCode === acceptanceTeamFilter;
      const matchesProject = acceptanceProjectFilter === 'all' || a.projectId === acceptanceProjectFilter || a.projectName === acceptanceProjectFilter;

      let matchesSearch = true;
      if (debouncedAcceptanceSearch) {
        const query = debouncedAcceptanceSearch.toLowerCase().trim();
        matchesSearch = (a.projectName || '').toLowerCase().includes(query) ||
          (a.teamName || '').toLowerCase().includes(query) ||
          (a.teamCode || '').toLowerCase().includes(query) ||
          (a.gdkdName || '').toLowerCase().includes(query) ||
          (a.implementerName || '').toLowerCase().includes(query) ||
          (a.month || '').toLowerCase().includes(query) ||
          (a.notes || '').toLowerCase().includes(query);
      }

      return matchesMonth && matchesBlock && matchesTeam && matchesProject && matchesSearch;
    }).sort((a: any, b: any) => {
      if (!sortConfig.key) return 0;
      const valA = getSortValue(a, sortConfig.key, teams, blocks);
      const valB = getSortValue(b, sortConfig.key, teams, blocks);
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.direction === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [finalAcceptances, acceptanceMonthFilter, acceptanceBlockFilter, acceptanceTeamFilter, acceptanceProjectFilter, debouncedAcceptanceSearch, sortConfig, teams, blocks]);

  const displayedRecords = acceptanceListView === 'pending' ? filteredAcceptances : filteredFinalAcceptances;

  // Sorting handler
  const handleSort = (key: string) => {
    setSortConfig((prev: any) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return { key: null, direction: null };
      }
      return { key, direction: 'asc' };
    });
  };

  // Add empty draft row
  const handleAddDraftRow = () => {
    const newDraft = {
      id: `draft-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      month: acceptanceMonthFilter !== 'all' ? acceptanceMonthFilter : 'Kì 1 - Tháng 8',
      teamId: '',
      teamCode: '',
      gdkdName: '',
      implementerName: '',
      projectId: '',
      projectName: '',
      digitalFb: '',
      digitalZalo: '',
      digitalTiktok: '',
      digitalKhac: '',
      visaFb: '',
      visaZalo: '',
      visaTiktok: '',
      visaDangTin: '',
      dangTinCtyChuaVat: '',
      caNhanFb: '',
      caNhanDangTin: '',
      caNhanZalo: '',
      caNhanGoogle: '',
      caNhanTiktok: '',
      caNhanNopTien: '',
      status: 'Đã nghiệm thu',
      notes: ''
    };
    setDraftRows((prev) => [newDraft, ...prev]);
  };

  const handleUpdateDraftField = (index: number, field: string, value: any) => {
    setDraftRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveDraft = (id: string) => {
    setDraftRows((prev) => prev.filter((d) => d.id !== id));
  };

  // Save Draft to Firestore
  const handleSaveDraft = async (draftRow: any) => {
    if (!draftRow.teamId && !draftRow.teamCode) {
      toast.error('Vui lòng chọn Team cho dòng nghiệm thu!');
      return;
    }
    if (!draftRow.projectId && !draftRow.projectName) {
      toast.error('Vui lòng chọn Dự án cho dòng nghiệm thu!');
      return;
    }

    const comp = getRowComputed(draftRow);
    const tm = (teams || []).find((t: any) => t.id === draftRow.teamId || t.teamCode === draftRow.teamCode);
    const pr = (projects || []).find((p: any) => p.id === draftRow.projectId || p.name === draftRow.projectName);

    try {
      const payload: any = {
        month: draftRow.month || 'Kì 1 - Tháng 8',
        teamId: tm?.id || draftRow.teamId || '',
        teamName: tm?.name || draftRow.teamName || '',
        teamCode: tm?.teamCode || draftRow.teamCode || '',
        blockId: tm?.blockId || draftRow.blockId || '',
        blockCode: tm?.blockCode || draftRow.blockCode || '',
        blockName: tm?.blockName || draftRow.blockName || '',
        gdkdName: draftRow.gdkdName || '',
        implementerName: draftRow.implementerName || '',
        projectId: pr?.id || draftRow.projectId || '',
        projectName: pr?.name || draftRow.projectName || '',
        projectCode: pr?.projectCode || draftRow.projectCode || '',

        // Group 1: DIGITAL CHẠY (Chưa VAT)
        digitalFb: comp.dFb,
        digitalZalo: comp.dZalo,
        digitalTiktok: comp.dTiktok,
        digitalKhac: comp.dKhac,
        digitalTotalChuaVat: comp.dTotalChuaVat,
        digitalTotalSauVat: comp.dTotalSauVat, // Cột K

        // Group 2: THẺ VISA CÔNG TY (Chưa VAT)
        visaFb: comp.vFb,
        visaZalo: comp.vZalo,
        visaTiktok: comp.vTiktok,
        visaDangTin: comp.vDangTin,
        visaTotalChuaVat: comp.vTotalChuaVat,
        visaTotalSauVat: comp.vTotalSauVat, // Cột Q

        // Group 3: ĐĂNG TIN CÔNG TY
        dangTinCtyChuaVat: comp.dtCtyChuaVat,
        dangTinCtySauVat: comp.dtCtySauVat, // Cột S (8%)

        // Group 4: CÁ NHÂN CHẠY NGOÀI
        caNhanFb: comp.cnFb,
        caNhanDangTin: comp.cnDangTin,
        caNhanZalo: comp.cnZalo,
        caNhanGoogle: comp.cnGoogle,
        caNhanTiktok: comp.cnTiktok,
        caNhanTotal: comp.cnTotal, // Cột Y

        // Group 5: TỔNG (Cột Z = K + Q + S + Y)
        grandTotal: comp.grandTotal,
        totalCost: comp.grandTotal,
        afterAcceptanceCost: comp.grandTotal,

        // Group 6
        caNhanNopTien: comp.cnNopTien,
        status: draftRow.status || 'Đã nghiệm thu',
        notes: draftRow.notes || '',

        // Legacy compatibility
        fbDigitalChuaVat: comp.dFb,
        facebookCost: comp.dTotalSauVat,
        digitalCost: comp.dTotalSauVat,
        fbVisaCostChuaVat: comp.vFb,
        visaCost: comp.vTotalSauVat,
        dangTinCongTyChuaVat: comp.dtCtyChuaVat,
        postingCost: comp.dtCtySauVat,
        caNhanCost: comp.cnFb,
        otherCost: comp.cnTotal,
        dangTinCaNhanCost: comp.cnDangTin,
        zaloCost: comp.cnZalo,
        googleCost: comp.cnGoogle,
        tiktokCost: comp.cnTiktok,

        costBreakdowns: buildCostBreakdownsOfRecord(draftRow),
        createdAt: serverTimestamp(),
        createdBy: user?.email || '',
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        editHistory: [
          {
            action: 'CREATE',
            editorName: user?.displayName || user?.email || 'Người dùng',
            timestamp: new Date().toISOString(),
            changes: { 'Thêm mới': { old: '', new: 'Tạo bản ghi nghiệm thu' } }
          }
        ]
      };

      await addDoc(collection(db, 'acceptances'), payload);
      toast.success('Đã lưu bản ghi nghiệm thu thành công!');
      handleRemoveDraft(draftRow.id);
    } catch (err) {
      console.error('Error saving draft:', err);
      toast.error('Lỗi khi lưu bản ghi nghiệm thu');
    }
  };

  // Start Edit
  const handleStartEdit = (item: any) => {
    setEditingRowId(item.id);
    setEditingRowState({
      ...item,
      digitalFb: item.digitalFb ?? item.fbDigitalChuaVat ?? '',
      digitalZalo: item.digitalZalo ?? '',
      digitalTiktok: item.digitalTiktok ?? '',
      digitalKhac: item.digitalKhac ?? '',
      visaFb: item.visaFb ?? item.fbVisaCostChuaVat ?? '',
      visaZalo: item.visaZalo ?? '',
      visaTiktok: item.visaTiktok ?? '',
      visaDangTin: item.visaDangTin ?? '',
      dangTinCtyChuaVat: item.dangTinCtyChuaVat ?? item.dangTinCongTyChuaVat ?? '',
      caNhanFb: item.caNhanFb ?? item.caNhanCost ?? item.otherCost ?? '',
      caNhanDangTin: item.caNhanDangTin ?? item.dangTinCaNhanCost ?? '',
      caNhanZalo: item.caNhanZalo ?? item.zaloCost ?? '',
      caNhanGoogle: item.caNhanGoogle ?? item.googleCost ?? '',
      caNhanTiktok: item.caNhanTiktok ?? item.tiktokCost ?? '',
      caNhanNopTien: item.caNhanNopTien ?? item.personalPaidToCompany ?? '',
      status: item.status || 'Đã nghiệm thu',
      notes: item.notes || ''
    });
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingRowId || !editingRowState) return;
    const comp = getRowComputed(editingRowState);
    const tm = (teams || []).find((t: any) => t.id === editingRowState.teamId || t.teamCode === editingRowState.teamCode);
    const pr = (projects || []).find((p: any) => p.id === editingRowState.projectId || p.name === editingRowState.projectName);

    try {
      const oldItem = (acceptanceListView === 'pending' ? acceptances : finalAcceptances).find((a: any) => a.id === editingRowId);
      const oldHistory = Array.isArray(oldItem?.editHistory) ? oldItem.editHistory : [];

      const changesObj: any = {};
      if (oldItem?.month !== editingRowState.month) changesObj['Tháng'] = { old: oldItem?.month, new: editingRowState.month };
      if (oldItem?.totalCost !== comp.grandTotal) changesObj['Tổng chi phí'] = { old: oldItem?.totalCost, new: comp.grandTotal };

      const newHistoryEntry = {
        action: 'UPDATE',
        editorName: user?.displayName || user?.email || 'Người dùng',
        timestamp: new Date().toISOString(),
        changes: changesObj
      };

      const payload: any = {
        month: editingRowState.month || oldItem?.month || 'Kì 1 - Tháng 8',
        teamId: tm?.id || editingRowState.teamId || oldItem?.teamId || '',
        teamName: tm?.name || editingRowState.teamName || oldItem?.teamName || '',
        teamCode: tm?.teamCode || editingRowState.teamCode || oldItem?.teamCode || '',
        blockId: tm?.blockId || editingRowState.blockId || oldItem?.blockId || '',
        blockCode: tm?.blockCode || editingRowState.blockCode || oldItem?.blockCode || '',
        gdkdName: editingRowState.gdkdName || oldItem?.gdkdName || '',
        implementerName: editingRowState.implementerName || oldItem?.implementerName || '',
        projectId: pr?.id || editingRowState.projectId || oldItem?.projectId || '',
        projectName: pr?.name || editingRowState.projectName || oldItem?.projectName || '',
        projectCode: pr?.projectCode || editingRowState.projectCode || oldItem?.projectCode || '',

        // Group 1
        digitalFb: comp.dFb,
        digitalZalo: comp.dZalo,
        digitalTiktok: comp.dTiktok,
        digitalKhac: comp.dKhac,
        digitalTotalChuaVat: comp.dTotalChuaVat,
        digitalTotalSauVat: comp.dTotalSauVat, // Cột K

        // Group 2
        visaFb: comp.vFb,
        visaZalo: comp.vZalo,
        visaTiktok: comp.vTiktok,
        visaDangTin: comp.vDangTin,
        visaTotalChuaVat: comp.vTotalChuaVat,
        visaTotalSauVat: comp.vTotalSauVat, // Cột Q

        // Group 3
        dangTinCtyChuaVat: comp.dtCtyChuaVat,
        dangTinCtySauVat: comp.dtCtySauVat, // Cột S

        // Group 4
        caNhanFb: comp.cnFb,
        caNhanDangTin: comp.cnDangTin,
        caNhanZalo: comp.cnZalo,
        caNhanGoogle: comp.cnGoogle,
        caNhanTiktok: comp.cnTiktok,
        caNhanTotal: comp.cnTotal, // Cột Y

        // Group 5: Cột Z
        grandTotal: comp.grandTotal,
        totalCost: comp.grandTotal,
        afterAcceptanceCost: comp.grandTotal,

        // Group 6
        caNhanNopTien: comp.cnNopTien,
        status: editingRowState.status || 'Đã nghiệm thu',
        notes: editingRowState.notes || '',

        // Legacy compatibility
        fbDigitalChuaVat: comp.dFb,
        facebookCost: comp.dTotalSauVat,
        digitalCost: comp.dTotalSauVat,
        fbVisaCostChuaVat: comp.vFb,
        visaCost: comp.vTotalSauVat,
        dangTinCongTyChuaVat: comp.dtCtyChuaVat,
        postingCost: comp.dtCtySauVat,
        caNhanCost: comp.cnFb,
        otherCost: comp.cnTotal,
        dangTinCaNhanCost: comp.cnDangTin,
        zaloCost: comp.cnZalo,
        googleCost: comp.cnGoogle,
        tiktokCost: comp.cnTiktok,

        costBreakdowns: buildCostBreakdownsOfRecord(editingRowState),
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || '',
        editHistory: [...oldHistory, newHistoryEntry]
      };

      const coll = acceptanceListView === 'pending' ? 'acceptances' : 'finalAcceptances';
      await updateDoc(doc(db, coll, editingRowId), payload);
      toast.success('Đã cập nhật bản ghi nghiệm thu!');
      setEditingRowId(null);
      setEditingRowState(null);
    } catch (err) {
      console.error('Error updating acceptance:', err);
      toast.error('Lỗi khi cập nhật bản ghi');
    }
  };

  // Finalize
  const handleConfirmFinalize = async () => {
    if (!itemToFinalize) return;
    const toastId = toast.loading('Đang chốt số liệu nghiệm thu...');
    try {
      const comp = getRowComputed(itemToFinalize);
      const finalPayload = {
        ...itemToFinalize,
        originalAcceptanceId: itemToFinalize.id,
        status: 'Đã nghiệm thu',
        finalizedAt: serverTimestamp(),
        finalizedBy: user?.email || '',
        updatedAt: serverTimestamp()
      };
      delete finalPayload.id;

      await addDoc(collection(db, 'finalAcceptances'), finalPayload);
      await deleteDoc(doc(db, 'acceptances', itemToFinalize.id));

      toast.dismiss(toastId);
      toast.success('Đã chốt số liệu nghiệm thu thành công!');
      setIsFinalizeDialogOpen(false);
      setItemToFinalize(null);
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error finalizing:', err);
      toast.error('Lỗi khi chốt số liệu');
    }
  };

  // Delete single
  const handleConfirmDelete = async () => {
    if (!itemToDeleteId) return;
    try {
      await deleteDoc(doc(db, 'acceptances', itemToDeleteId));
      toast.success('Đã xóa bản ghi nghiệm thu');
      setIsDeleteDialogOpen(false);
      setItemToDeleteId(null);
    } catch (err) {
      console.error('Error deleting acceptance:', err);
      toast.error('Lỗi khi xóa bản ghi');
    }
  };

  // Bulk delete
  const handleConfirmBulkDelete = async () => {
    if (selectedAcceptanceIds.length === 0) return;
    const toastId = toast.loading(`Đang xóa ${selectedAcceptanceIds.length} bản ghi...`);
    try {
      const batch = writeBatch(db);
      const collName = acceptanceListView === 'pending' ? 'acceptances' : 'finalAcceptances';
      selectedAcceptanceIds.forEach((id) => {
        batch.delete(doc(db, collName, id));
      });
      await batch.commit();
      toast.dismiss(toastId);
      toast.success(`Đã xóa ${selectedAcceptanceIds.length} bản ghi thành công!`);
      setSelectedAcceptanceIds([]);
      setIsBulkDeleteDialogOpen(false);
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error bulk deleting:', err);
      toast.error('Lỗi khi xóa đồng loạt bản ghi');
    }
  };

  // Delete finalized
  const handleConfirmDeleteFinal = async () => {
    if (!itemFinalToDeleteId) return;
    try {
      await deleteDoc(doc(db, 'finalAcceptances', itemFinalToDeleteId));
      toast.success('Đã xóa bản ghi đã chốt');
      setIsDeleteFinalDialogOpen(false);
      setItemFinalToDeleteId(null);
    } catch (err) {
      console.error('Error deleting final acceptance:', err);
      toast.error('Lỗi khi xóa bản ghi');
    }
  };

  // Open Calculator
  const handleOpenCalculator = (
    fieldKey: string,
    fieldVNName: string,
    currentVal: string,
    onUpdate: (val: string) => void
  ) => {
    setActiveCalculatorField(fieldKey);
    setCalculatorFieldNameVN(fieldVNName);
    setCalculatorInput(currentVal || '');
    setCalculatorUpdateFn(() => onUpdate);
    setIsCalculatorOpen(true);
  };

  // Multi-value breakdown tooltip helper
  const renderBreakdownTooltip = (amount: number, breakdown: any, label: string) => {
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
        <Calculator className="w-3 h-3 text-indigo-500 hover:text-indigo-700 shrink-0" />
        <span className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block bg-slate-900 border border-slate-800 text-slate-100 p-3 rounded-xl shadow-2xl text-[10px] min-w-[220px] text-right z-[999] pointer-events-none font-sans font-medium scale-95 origin-bottom-right transition-all leading-relaxed whitespace-nowrap">
          <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 border-b border-slate-800 pb-1 mb-1 text-center font-sans flex items-center justify-center gap-1.5">
            <Calculator className="w-3 h-3 text-indigo-400" />
            <span>CHI TIẾT ({label})</span>
          </span>
          <span className="block space-y-1 max-h-36 overflow-y-auto pr-1">
            {items.map((sub: any, sidx: number) => (
              <span key={sidx} className="flex justify-between gap-4 text-[10px] items-center py-0.5">
                <span className="text-slate-400 truncate max-w-[130px] text-left">• {sub.label}</span>
                <span className="font-mono font-bold text-slate-100">{formatCurrency(sub.amount).replace(' đ', '')}</span>
              </span>
            ))}
          </span>
          <span className="border-t border-slate-800 pt-1 mt-1 flex justify-between gap-4 font-mono font-bold text-indigo-400">
            <span className="text-[9px] uppercase font-sans text-slate-400">Tổng cộng:</span>
            <span>{formatCurrency(amount).replace(' đ', '')}</span>
          </span>
        </span>
      </span>
    );
  };

  // Excel Export with exact screenshot columns
  const handleExportExcel = () => {
    if (displayedRecords.length === 0) {
      toast.error('Không có dữ liệu để xuất Excel');
      return;
    }

    const data = displayedRecords.map((a: any) => {
      const comp = getRowComputed(a);
      return {
        'THÁNG': a.month || '',
        'MÃ TEAM': a.teamCode || '',
        'GĐKD': a.gdkdName || '',
        'NGƯỜI PHỤ TRÁCH': a.implementerName || '',
        'DỰ ÁN': a.projectName || '',
        'DIGITAL - FB (Chưa VAT)': comp.dFb,
        'DIGITAL - ZALO (Chưa VAT)': comp.dZalo,
        'DIGITAL - TIKTOK (Chưa VAT)': comp.dTiktok,
        'DIGITAL - KHÁC (Chưa VAT)': comp.dKhac,
        'DIGITAL - TỔNG (Chưa VAT)': comp.dTotalChuaVat,
        'DIGITAL CHẠY (SAU VAT)': comp.dTotalSauVat,
        'VISA - FB (Chưa VAT)': comp.vFb,
        'VISA - ZALO (Chưa VAT)': comp.vZalo,
        'VISA - TIKTOK (Chưa VAT)': comp.vTiktok,
        'VISA - ĐĂNG TIN (Chưa VAT)': comp.vDangTin,
        'VISA - TỔNG (Chưa VAT)': comp.vTotalChuaVat,
        'THẺ VISA CÔNG TY (SAU VAT)': comp.vTotalSauVat,
        'ĐĂNG TIN CÔNG TY (Chưa VAT)': comp.dtCtyChuaVat,
        'ĐĂNG TIN CÔNG TY (SAU VAT 8%)': comp.dtCtySauVat,
        'CÁ NHÂN - FB': comp.cnFb,
        'CÁ NHÂN - ĐĂNG TIN': comp.cnDangTin,
        'CÁ NHÂN - ZALO': comp.cnZalo,
        'CÁ NHÂN - GOOGLE': comp.cnGoogle,
        'CÁ NHÂN - TIKTOK': comp.cnTiktok,
        'CÁ NHÂN - TỔNG': comp.cnTotal,
        'TỔNG CỘNG': comp.grandTotal,
        'CÁ NHÂN NỘP TIỀN QUA CÔNG TY': comp.cnNopTien,
        'TRẠNG THÁI': a.status || (acceptanceListView === 'pending' ? 'Trước nghiệm thu' : 'Đã nghiệm thu'),
        'GHI CHÚ': a.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Nghiệm thu MKT');
    XLSX.writeFile(workbook, `Bao_cao_Nghiem_thu_MKT_${acceptanceListView === 'pending' ? 'Chua_chot' : 'Da_chot'}_${format(new Date(), 'dd_MM_yyyy')}.xlsx`);
    toast.success('Đã xuất file Excel thành công');
  };

  // Excel Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImportingAcceptances(true);
    const toastId = toast.loading('Đang xử lý tệp Excel...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (json.length < 2) {
        toast.dismiss(toastId);
        toast.error('File Excel không có dữ liệu');
        setIsImportingAcceptances(false);
        return;
      }

      // Find header row
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(5, json.length); r++) {
        const rowStr = (json[r] || []).join(' ').toLowerCase();
        if (rowStr.includes('tháng') || rowStr.includes('team') || rowStr.includes('dự án') || rowStr.includes('digital')) {
          headerRowIndex = r;
          break;
        }
      }

      const headers: string[] = (json[headerRowIndex] || []).map((h: any) => String(h || '').trim().toLowerCase());
      const batch = writeBatch(db);
      let count = 0;

      for (let r = headerRowIndex + 1; r < json.length; r++) {
        const row = json[r];
        if (!row || row.length === 0 || !row.some((cell: any) => cell !== undefined && cell !== '')) continue;

        const getCol = (keywords: string[]) => {
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i];
            if (keywords.some(k => h.includes(k.toLowerCase()))) {
              return row[i];
            }
          }
          return undefined;
        };

        const month = String(getCol(['tháng', 'month']) || 'Kì 1 - Tháng 8').trim();
        const teamCode = String(getCol(['mã team', 'teamcode', 'team code', 'team']) || '').trim();
        const gdkdName = String(getCol(['gđkd', 'gdkd']) || '').trim();
        const implementerName = String(getCol(['người phụ trách', 'phụ trách', 'implementer']) || '').trim();
        const projectName = String(getCol(['dự án', 'project', 'tên dự án']) || '').trim();

        // Digital
        const dFb = parseCurrencyFormula(getCol(['digital - fb', 'digital fb', 'fb digital'])).total;
        const dZalo = parseCurrencyFormula(getCol(['digital - zalo', 'digital zalo'])).total;
        const dTiktok = parseCurrencyFormula(getCol(['digital - tiktok', 'digital tiktok'])).total;
        const dKhac = parseCurrencyFormula(getCol(['digital - khác', 'digital khác'])).total;

        // Visa
        const vFb = parseCurrencyFormula(getCol(['visa - fb', 'visa fb', 'fb visa'])).total;
        const vZalo = parseCurrencyFormula(getCol(['visa - zalo', 'visa zalo'])).total;
        const vTiktok = parseCurrencyFormula(getCol(['visa - tiktok', 'visa tiktok'])).total;
        const vDangTin = parseCurrencyFormula(getCol(['visa - đăng tin', 'visa đăng tin'])).total;

        // Đăng tin CTY
        const dtCtyChuaVat = parseCurrencyFormula(getCol(['đăng tin công ty (chưa vat)', 'đăng tin cty chưa vat', 'đăng tin cty'])).total;

        // Cá nhân
        const cnFb = parseCurrencyFormula(getCol(['cá nhân - fb', 'cá nhân fb'])).total;
        const cnDangTin = parseCurrencyFormula(getCol(['cá nhân - đăng tin', 'cá nhân đăng tin'])).total;
        const cnZalo = parseCurrencyFormula(getCol(['cá nhân - zalo', 'cá nhân zalo'])).total;
        const cnGoogle = parseCurrencyFormula(getCol(['cá nhân - google', 'cá nhân google'])).total;
        const cnTiktok = parseCurrencyFormula(getCol(['cá nhân - tiktok', 'cá nhân tiktok'])).total;

        const cnNopTien = parseCurrencyFormula(getCol(['nộp tiền', 'nộp qua công ty'])).total;
        const notes = String(getCol(['ghi chú', 'notes']) || '').trim();

        const tm = (teams || []).find((t: any) => t.teamCode === teamCode || t.name === teamCode);
        const pr = (projects || []).find((p: any) => p.name === projectName || p.projectCode === projectName);

        const compDraft = {
          digitalFb: dFb, digitalZalo: dZalo, digitalTiktok: dTiktok, digitalKhac: dKhac,
          visaFb: vFb, visaZalo: vZalo, visaTiktok: vTiktok, visaDangTin: vDangTin,
          dangTinCtyChuaVat: dtCtyChuaVat,
          caNhanFb: cnFb, caNhanDangTin: cnDangTin, caNhanZalo: cnZalo, caNhanGoogle: cnGoogle, caNhanTiktok: cnTiktok,
          caNhanNopTien: cnNopTien
        };
        const comp = getRowComputed(compDraft);

        const newDocRef = doc(collection(db, 'acceptances'));
        batch.set(newDocRef, {
          month,
          teamId: tm?.id || '',
          teamName: tm?.name || teamCode || '',
          teamCode: tm?.teamCode || teamCode || '',
          blockId: tm?.blockId || '',
          blockCode: tm?.blockCode || '',
          gdkdName: gdkdName || tm?.name || '',
          implementerName,
          projectId: pr?.id || '',
          projectName: pr?.name || projectName || '',
          projectCode: pr?.projectCode || '',

          digitalFb: comp.dFb,
          digitalZalo: comp.dZalo,
          digitalTiktok: comp.dTiktok,
          digitalKhac: comp.dKhac,
          digitalTotalChuaVat: comp.dTotalChuaVat,
          digitalTotalSauVat: comp.dTotalSauVat,

          visaFb: comp.vFb,
          visaZalo: comp.vZalo,
          visaTiktok: comp.vTiktok,
          visaDangTin: comp.vDangTin,
          visaTotalChuaVat: comp.vTotalChuaVat,
          visaTotalSauVat: comp.vTotalSauVat,

          dangTinCtyChuaVat: comp.dtCtyChuaVat,
          dangTinCtySauVat: comp.dtCtySauVat,

          caNhanFb: comp.cnFb,
          caNhanDangTin: comp.cnDangTin,
          caNhanZalo: comp.cnZalo,
          caNhanGoogle: comp.cnGoogle,
          caNhanTiktok: comp.cnTiktok,
          caNhanTotal: comp.cnTotal,

          grandTotal: comp.grandTotal,
          totalCost: comp.grandTotal,
          afterAcceptanceCost: comp.grandTotal,

          caNhanNopTien: comp.cnNopTien,
          status: 'Đã nghiệm thu',
          notes,

          // Legacy fields
          facebookCost: comp.dTotalSauVat,
          digitalCost: comp.dTotalSauVat,
          visaCost: comp.vTotalSauVat,
          postingCost: comp.dtCtySauVat,
          caNhanCost: comp.cnFb,
          otherCost: comp.cnTotal,
          dangTinCaNhanCost: comp.cnDangTin,
          zaloCost: comp.cnZalo,
          googleCost: comp.cnGoogle,
          tiktokCost: comp.cnTiktok,

          createdAt: serverTimestamp(),
          createdBy: user?.email || '',
          updatedAt: serverTimestamp(),
          updatedBy: user?.email || ''
        });

        count++;
      }

      await batch.commit();
      toast.dismiss(toastId);
      toast.success(`Đã nhập thành công ${count} bản ghi nghiệm thu!`);
      setIsImportAcceptancesDialogOpen(false);
      setIsImportingAcceptances(false);
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Error importing Excel:', err);
      toast.error('Lỗi khi đọc file Excel');
      setIsImportingAcceptances(false);
    }
  };

  // Mouse drag horizontal scrolling for table
  const tableContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const slider = tableContainerRef.current;
    if (!slider) return;
    let isDown = false;
    let startX: number;
    let scrollLeft: number;

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
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
      const walk = (x - startX) * 1.5;
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

  return (
    <div className="space-y-4">
      {/* 🌟 Header & Action Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2.5 rounded-2xl shadow-md shadow-indigo-100">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>Báo cáo Nghiệm thu Marketing</span>
              <Badge className="bg-indigo-50 text-indigo-700 border-none font-extrabold text-[10px] px-2 py-0.5">
                Chuẩn công thức VAT & Kỳ
              </Badge>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Tách Kì 1 - Kì 2 Tháng 8 | Tự động tính VAT 10% (FB, Tiktok, Khác) & 8% (Zalo, Đăng tin) | Tổng cột K+Q+S+Y
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Tab Switcher */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60">
            <button
              onClick={() => {
                setAcceptanceListView('pending');
                setSelectedAcceptanceIds([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                acceptanceListView === 'pending'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Chưa chốt ({filteredAcceptances.length})
            </button>
            <button
              onClick={() => {
                setAcceptanceListView('finalized');
                setSelectedAcceptanceIds([]);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                acceptanceListView === 'finalized'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đã chốt ({filteredFinalAcceptances.length})
            </button>
          </div>

          <Button
            onClick={handleAddDraftRow}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs h-9 px-3.5 rounded-2xl shadow-md shadow-indigo-100 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm dòng
          </Button>

          <Button
            variant="outline"
            onClick={handleExportExcel}
            className="border-slate-200 text-slate-700 hover:bg-slate-50 font-black text-xs h-9 px-3 rounded-2xl flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Xuất Excel
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsImportAcceptancesDialogOpen(true)}
            className="border-slate-200 text-indigo-600 hover:bg-indigo-50 font-black text-xs h-9 px-3 rounded-2xl flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Nhập Excel
          </Button>
        </div>
      </div>

      {/* 🔍 Filters Card */}
      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-4 pb-2 border-b border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Tìm kiếm</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <Input
                  placeholder="Tìm dự án, team, GĐKD..."
                  value={acceptanceSearch}
                  onChange={(e) => setAcceptanceSearch(e.target.value)}
                  className="pl-8 h-8 text-xs font-bold bg-slate-50 border-slate-200 rounded-xl"
                />
              </div>
            </div>

            {/* Filter Month */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Kỳ / Tháng</Label>
              <Select value={acceptanceMonthFilter} onValueChange={setAcceptanceMonthFilter}>
                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả tháng" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Tất cả kỳ / tháng</SelectItem>
                  {uniqueMonths.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Block */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Khối</Label>
              <Select value={acceptanceBlockFilter} onValueChange={setAcceptanceBlockFilter}>
                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả các khối" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Tất cả các khối</SelectItem>
                  {(blocks || []).map((b: any) => (
                    <SelectItem key={b.id || b.blockCode} value={b.id || b.blockCode}>
                      {b.name || b.blockCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Team */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Team</Label>
              <Select value={acceptanceTeamFilter} onValueChange={setAcceptanceTeamFilter}>
                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả Team" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Tất cả Team</SelectItem>
                  {(teams || []).map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.teamCode ? `${t.teamCode} - ${t.name}` : t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter Project */}
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Dự án</Label>
              <Select value={acceptanceProjectFilter} onValueChange={setAcceptanceProjectFilter}>
                <SelectTrigger className="h-8 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold">
                  <SelectValue placeholder="Tất cả Dự án" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Tất cả Dự án</SelectItem>
                  {(projects || []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Selection Notification Bar */}
          {selectedAcceptanceIds.length > 0 && (
            <div className="mt-3 bg-rose-50 border border-rose-100 py-2 px-4 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-900 font-extrabold text-xs">
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Đã chọn {selectedAcceptanceIds.length} dòng nghiệm thu</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAcceptanceIds([])}
                  className="h-7 rounded-xl font-bold text-[10px] bg-white border-rose-200 text-rose-700"
                >
                  Bỏ chọn
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  className="h-7 rounded-xl font-bold text-[10px] bg-rose-600 hover:bg-rose-700 text-white"
                >
                  Xóa {selectedAcceptanceIds.length} dòng đã chọn
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        {/* 📊 Main Data Table */}
        <CardContent className="p-0">
          <div
            ref={tableContainerRef}
            className="overflow-x-auto max-h-[72vh] cursor-grab border-b border-slate-200 select-none scrollbar-thin scrollbar-thumb-slate-300"
          >
            <Table className="w-full text-left border-collapse min-w-[2400px]">
              <AcceptanceTableHeader
                sortConfig={sortConfig}
                onSort={handleSort}
                selectedAcceptanceIds={selectedAcceptanceIds}
                onSelectAll={(checked) => {
                  if (checked) {
                    setSelectedAcceptanceIds(displayedRecords.map((r: any) => r.id));
                  } else {
                    setSelectedAcceptanceIds([]);
                  }
                }}
                isAllSelected={displayedRecords.length > 0 && selectedAcceptanceIds.length === displayedRecords.length}
              />

              <TableBody>
                {/* 1. Draft Rows for Inline Addition */}
                {draftRows.map((draft, idx) => (
                  <AcceptanceDraftRow
                    key={draft.id}
                    draftRow={draft}
                    index={idx}
                    teams={teams}
                    projects={projects}
                    blocks={blocks}
                    monthsList={uniqueMonths}
                    formatCurrency={formatCurrency}
                    onUpdateField={(field, val) => handleUpdateDraftField(idx, field, val)}
                    onSaveDraft={handleSaveDraft}
                    onRemoveDraft={handleRemoveDraft}
                    onOpenCalculator={handleOpenCalculator}
                  />
                ))}

                {/* 2. Main Data Records */}
                {displayedRecords.length === 0 && draftRows.length === 0 ? (
                  <tr>
                    <td colSpan={27} className="text-center py-16 text-slate-400 font-semibold text-xs bg-slate-50/50">
                      Không có bản ghi nghiệm thu nào phù hợp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  displayedRecords.map((item: any, idx: number) => (
                    <AcceptanceRow
                      key={item.id}
                      item={item}
                      index={idx}
                      isFinalizedView={acceptanceListView === 'finalized'}
                      isSelected={selectedAcceptanceIds.includes(item.id)}
                      isEditing={editingRowId === item.id}
                      editingState={editingRowState}
                      teams={teams}
                      projects={projects}
                      blocks={blocks}
                      monthsList={uniqueMonths}
                      formatCurrency={formatCurrency}
                      onSelectRow={(id, checked) => {
                        setSelectedAcceptanceIds(prev => 
                          checked ? [...prev, id] : prev.filter(x => x !== id)
                        );
                      }}
                      onStartEdit={handleStartEdit}
                      onCancelEdit={() => {
                        setEditingRowId(null);
                        setEditingRowState(null);
                      }}
                      onSaveEdit={handleSaveEdit}
                      onUpdateEditingField={(field, val) => {
                        setEditingRowState((prev: any) => ({ ...prev, [field]: val }));
                      }}
                      onOpenCalculator={handleOpenCalculator}
                      onFinalize={(acc) => {
                        setItemToFinalize(acc);
                        setIsFinalizeDialogOpen(true);
                      }}
                      onDelete={(id) => {
                        if (acceptanceListView === 'pending') {
                          setItemToDeleteId(id);
                          setIsDeleteDialogOpen(true);
                        } else {
                          setItemFinalToDeleteId(id);
                          setIsDeleteFinalDialogOpen(true);
                        }
                      }}
                      onOpenHistory={(acc) => {
                        setHistoryTargetRecord(acc);
                        setIsHistoryDialogOpen(true);
                      }}
                      renderBreakdownTooltip={renderBreakdownTooltip}
                    />
                  ))
                )}
              </TableBody>

              <AcceptanceFooter
                records={displayedRecords}
                formatCurrency={formatCurrency}
              />
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 💬 Dialogs (Calculator, Finalize, Delete, History, Import) */}
      <AcceptanceDialogs
        isCalculatorOpen={isCalculatorOpen}
        setIsCalculatorOpen={setIsCalculatorOpen}
        activeCalculatorField={activeCalculatorField}
        calculatorFieldNameVN={calculatorFieldNameVN}
        calculatorInput={calculatorInput}
        setCalculatorInput={setCalculatorInput}
        calculatorUpdateFn={calculatorUpdateFn}
        formatCurrency={formatCurrency}

        isFinalizeDialogOpen={isFinalizeDialogOpen}
        setIsFinalizeDialogOpen={setIsFinalizeDialogOpen}
        itemToFinalize={itemToFinalize}
        onConfirmFinalize={handleConfirmFinalize}

        isDeleteDialogOpen={isDeleteDialogOpen}
        setIsDeleteDialogOpen={setIsDeleteDialogOpen}
        itemToDeleteId={itemToDeleteId}
        onConfirmDelete={handleConfirmDelete}

        isBulkDeleteDialogOpen={isBulkDeleteDialogOpen}
        setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
        selectedCount={selectedAcceptanceIds.length}
        onConfirmBulkDelete={handleConfirmBulkDelete}

        isDeleteFinalDialogOpen={isDeleteFinalDialogOpen}
        setIsDeleteFinalDialogOpen={setIsDeleteFinalDialogOpen}
        itemFinalToDeleteId={itemFinalToDeleteId}
        onConfirmDeleteFinal={handleConfirmDeleteFinal}

        isHistoryDialogOpen={isHistoryDialogOpen}
        setIsHistoryDialogOpen={setIsHistoryDialogOpen}
        historyTargetRecord={historyTargetRecord}

        isImportAcceptancesDialogOpen={isImportAcceptancesDialogOpen}
        setIsImportAcceptancesDialogOpen={setIsImportAcceptancesDialogOpen}
        isImporting={isImportingAcceptances}
        onFileImport={handleFileImport}
      />
    </div>
  );
});
