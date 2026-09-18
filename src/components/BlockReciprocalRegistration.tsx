import React, { useState, useEffect, useMemo } from 'react';
import { 
  Receipt, CreditCard, Building2, Calendar, AlertCircle, 
  CheckCircle2, Clock, Trash2, Edit3, Plus, RefreshCw, 
  HelpCircle, ArrowRight, ShieldCheck, Sparkles, AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from '../firestore-proxy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface BlockReciprocalRegistrationProps {
  currentActiveBlock: any;
  user: any;
  userProfile: any;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isGDKhoi: boolean;
  isTroLyKhoi: boolean;
  isAssistant: boolean;
  isAccountant: boolean;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  currentMarketingPeriod: string;
  currentOpenBlockBudgetMonth: string;
  systemSettings: any;
  reciprocalBudgets: any[];
  blockBudgets: any[];
  budgets: any[];
  teams: any[];
  blocks: any[];
  allUsers: any[];
  formatCurrency: (val: number) => string;
  formatCurrencyInput: (val: string) => string;
  parseVal: (val: any) => number;
  safeFormat: (date: any, fmt?: string) => string;
  logAction: (action: string, entity: string, id?: string, data?: any) => Promise<void>;
  db: any;
}

export function BlockReciprocalRegistration({
  currentActiveBlock,
  user,
  userProfile,
  isAdmin,
  isSuperAdmin,
  isGDKhoi,
  isTroLyKhoi,
  isAssistant,
  isAccountant,
  canView,
  canCreate,
  canEdit,
  canDelete,
  currentMarketingPeriod,
  currentOpenBlockBudgetMonth,
  systemSettings,
  reciprocalBudgets,
  blockBudgets,
  budgets,
  teams,
  blocks,
  allUsers,
  formatCurrency,
  formatCurrencyInput,
  parseVal,
  safeFormat,
  logAction,
  db
}: BlockReciprocalRegistrationProps) {
  const hasViewPerm = canView ?? (isAdmin || isSuperAdmin || isGDKhoi || isTroLyKhoi || isAssistant || isAccountant);
  const hasCreatePerm = canCreate ?? (isAdmin || isSuperAdmin || isGDKhoi || isTroLyKhoi || isAssistant);
  const hasEditPerm = canEdit ?? (isAdmin || isSuperAdmin || isGDKhoi || isTroLyKhoi || isAssistant || isAccountant);
  const hasDeletePerm = canDelete ?? (isAdmin || isSuperAdmin || isGDKhoi || isTroLyKhoi || isAssistant);

  // Selected Month: Default to current marketing period (e.g. 2026-09)
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMarketingPeriod || '');
  const [companyCardBudgetInput, setCompanyCardBudgetInput] = useState<string>('');
  const [externalBudgetInput, setExternalBudgetInput] = useState<string>('');
  const [noteInput, setNoteInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<any | null>(null);

  // Sync selectedMonth when currentMarketingPeriod becomes available if not set
  useEffect(() => {
    if (!selectedMonth && currentMarketingPeriod) {
      setSelectedMonth(currentMarketingPeriod);
    }
  }, [currentMarketingPeriod, selectedMonth]);

  // Compute total block budget for currentActiveBlock in selectedMonth
  const totalBlockBudget = useMemo(() => {
    if (!currentActiveBlock || !selectedMonth) return 0;
    
    // 1. Direct block budgets
    const directSum = blockBudgets
      .filter(bb => 
        (bb.blockId === currentActiveBlock.id || bb.blockCode === currentActiveBlock.blockCode) && 
        bb.month === selectedMonth
      )
      .reduce((sum, bb) => sum + (bb.amount || 0), 0);

    if (directSum > 0) return directSum;

    // 2. Fallback to team budgets in this block
    const blockTeams = teams.filter(t => {
      if (t.blockId && t.blockId === currentActiveBlock.id) return true;
      if (t.blockCode && t.blockCode === currentActiveBlock.blockCode) return true;
      const prefix = currentActiveBlock.teamPrefix || '';
      if (prefix && t.teamCode && t.teamCode.toUpperCase().startsWith(prefix.toUpperCase())) return true;
      return false;
    });

    const blockTeamIds = new Set(blockTeams.map(t => t.id));
    const blockTeamNames = new Set(blockTeams.map(t => (t.name || '').toLowerCase().trim()));

    const teamSum = budgets
      .filter(b => 
        b.month === selectedMonth && 
        (blockTeamIds.has(b.teamId) || blockTeamNames.has((b.teamName || '').toLowerCase().trim()))
      )
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    return teamSum;
  }, [currentActiveBlock, selectedMonth, blockBudgets, budgets, teams]);

  // Existing reciprocal record for currentActiveBlock and selectedMonth
  const existingRecord = useMemo(() => {
    if (!currentActiveBlock || !selectedMonth) return null;
    return reciprocalBudgets.find(rb => 
      (rb.blockId === currentActiveBlock.id || rb.blockCode === currentActiveBlock.blockCode) &&
      rb.month === selectedMonth
    ) || null;
  }, [currentActiveBlock, selectedMonth, reciprocalBudgets]);

  // When existingRecord changes or month changes, populate fields if not manually editing
  useEffect(() => {
    if (existingRecord) {
      setEditingRecordId(existingRecord.id);
      setCompanyCardBudgetInput(existingRecord.companyCardBudget ? formatCurrencyInput(String(existingRecord.companyCardBudget)) : '0');
      setExternalBudgetInput(existingRecord.externalBudget ? formatCurrencyInput(String(existingRecord.externalBudget)) : '0');
      setNoteInput(existingRecord.note || '');
    } else {
      setEditingRecordId(null);
      setCompanyCardBudgetInput('');
      setExternalBudgetInput('');
      setNoteInput('');
    }
  }, [existingRecord, selectedMonth, formatCurrencyInput]);

  // Parsed numerical values
  const parsedCompanyCard = parseVal(companyCardBudgetInput);
  const parsedExternal = parseVal(externalBudgetInput);

  // Suggested external budget = Total Block Budget - Company Card Budget
  const suggestedExternal = Math.max(0, totalBlockBudget - parsedCompanyCard);

  // Check if company card exceeds total block budget
  const isCompanyCardExceeded = totalBlockBudget > 0 && parsedCompanyCard > totalBlockBudget;

  // Handle Apply Suggestion
  const handleApplySuggestedExternal = () => {
    setExternalBudgetInput(formatCurrencyInput(String(suggestedExternal)));
    toast.info(`Đã áp dụng gợi ý Ngân sách chạy ngoài: ${formatCurrency(suggestedExternal)}`);
  };

  // Recent reciprocal registration history for currentActiveBlock
  const blockHistory = useMemo(() => {
    if (!currentActiveBlock) return [];
    return reciprocalBudgets
      .filter(rb => rb.blockId === currentActiveBlock.id || rb.blockCode === currentActiveBlock.blockCode)
      .sort((a, b) => (b.month || '').localeCompare(a.month || ''));
  }, [currentActiveBlock, reciprocalBudgets]);

  // Block Director Info
  const blockDirector = useMemo(() => {
    if (!currentActiveBlock) return null;
    return allUsers.find(u => u.uid === currentActiveBlock.directorUid || u.id === currentActiveBlock.directorUid) || null;
  }, [currentActiveBlock, allUsers]);

  // Can user edit/register?
  const canRegister = isGDKhoi || isTroLyKhoi || isAssistant || isAdmin || isSuperAdmin || isAccountant;

  // Handle Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecordId && !hasEditPerm) {
      toast.error('Bạn không có quyền chỉnh sửa bản ghi đối ứng!');
      return;
    }
    if (!editingRecordId && !hasCreatePerm) {
      toast.error('Bạn không có quyền thêm mới bản ghi đối ứng!');
      return;
    }
    if (!canRegister) {
      toast.error('Bạn không có quyền thực hiện đăng ký đối ứng cho Khối!');
      return;
    }
    if (!currentActiveBlock) {
      toast.error('Vui lòng chọn Khối trước khi đăng ký!');
      return;
    }
    if (!selectedMonth) {
      toast.error('Vui lòng chọn Tháng đăng ký!');
      return;
    }
    if (isCompanyCardExceeded) {
      toast.error(`Ngân sách chạy qua thẻ (${formatCurrency(parsedCompanyCard)}) không được vượt quá Tổng ngân sách Khối (${formatCurrency(totalBlockBudget)})!`);
      return;
    }
    if (parsedCompanyCard < 0 || parsedExternal < 0) {
      toast.error('Ngân sách nhập vào không được âm!');
      return;
    }
    if (parsedCompanyCard === 0 && parsedExternal === 0 && totalBlockBudget > 0) {
      toast.error('Vui lòng nhập Ngân sách chạy qua thẻ hoặc Ngân sách chạy ngoài!');
      return;
    }

    setIsSubmitting(true);
    try {
      const directorName = blockDirector?.displayName || blockDirector?.email || currentActiveBlock.directorName || 'Chưa gán';
      const directorUid = currentActiveBlock.directorUid || '';

      const payload = {
        blockId: currentActiveBlock.id,
        blockCode: currentActiveBlock.blockCode,
        blockName: currentActiveBlock.name || currentActiveBlock.blockCode,
        directorUid,
        directorName,
        month: selectedMonth,
        totalBlockBudget,
        companyCardBudget: parsedCompanyCard,
        externalBudget: parsedExternal,
        note: noteInput.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.email || 'N/A',
        updatedByName: userProfile?.displayName || user?.displayName || user?.email || 'N/A'
      };

      if (editingRecordId) {
        // Update existing record
        await updateDoc(doc(db, 'reciprocal_budgets', editingRecordId), payload);
        await logAction('UPDATE_RECIPROCAL_BUDGET', 'reciprocal_budgets', editingRecordId, {
          blockCode: currentActiveBlock.blockCode,
          month: selectedMonth,
          totalBlockBudget,
          companyCardBudget: parsedCompanyCard,
          externalBudget: parsedExternal
        });
        toast.success(`Đã cập nhật Đăng ký đối ứng kỳ ${selectedMonth} thành công!`);
      } else {
        // Create new record
        const newDoc = await addDoc(collection(db, 'reciprocal_budgets'), {
          ...payload,
          approvedReciprocalBudget: 0,
          approvalStatus: 'pending',
          createdAt: serverTimestamp(),
          createdBy: user?.email || 'N/A',
          createdByName: userProfile?.displayName || user?.displayName || user?.email || 'N/A'
        });
        await logAction('CREATE_RECIPROCAL_BUDGET', 'reciprocal_budgets', newDoc.id, {
          blockCode: currentActiveBlock.blockCode,
          month: selectedMonth,
          totalBlockBudget,
          companyCardBudget: parsedCompanyCard,
          externalBudget: parsedExternal
        });
        toast.success(`Đã gửi Đăng ký đối ứng kỳ ${selectedMonth} thành công!`);
      }
    } catch (err: any) {
      console.error('Error saving reciprocal budget:', err);
      toast.error('Lỗi khi lưu đăng ký đối ứng: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteDoc(doc(db, 'reciprocal_budgets', recordToDelete.id));
      await logAction('DELETE_RECIPROCAL_BUDGET', 'reciprocal_budgets', recordToDelete.id, {
        blockCode: recordToDelete.blockCode,
        month: recordToDelete.month
      });
      toast.success(`Đã xóa bản ghi đối ứng kỳ ${recordToDelete.month}`);
      if (editingRecordId === recordToDelete.id) {
        setEditingRecordId(null);
        setCompanyCardBudgetInput('');
        setExternalBudgetInput('');
        setNoteInput('');
      }
    } catch (err: any) {
      console.error('Error deleting reciprocal budget:', err);
      toast.error('Lỗi khi xóa bản ghi: ' + (err.message || ''));
    } finally {
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  if (!hasViewPerm) {
    return (
      <Card className="border-none shadow-sm p-8 text-center bg-white rounded-3xl">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-black text-slate-800">Không có quyền truy cập</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bạn chưa được phân quyền xem mục <strong>Đăng ký đối ứng</strong>. Vui lòng liên hệ Quản trị viên để được cấp quyền <code className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-mono">reciprocal_budget.view</code>.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans">
      {/* Top Banner Guide */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-6 md:p-8 rounded-[28px] text-white shadow-xl shadow-amber-100/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider inline-flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" /> Quản Lý Đối Ứng Khối
              </span>
              {currentMarketingPeriod && (
                <Badge className="bg-white text-amber-900 border-none font-black text-[10px]">
                  Kỳ MKT hiện tại: {currentMarketingPeriod}
                </Badge>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Đăng ký Ngân sách Đối ứng - {currentActiveBlock ? `${currentActiveBlock.name || currentActiveBlock.blockCode}` : 'Chưa chọn Khối'}
            </h2>
            <p className="text-amber-100 text-xs sm:text-sm font-medium leading-relaxed">
              Kê khai phân bổ ngân sách chạy qua thẻ công ty và ngân sách chạy ngoài. Ngân sách đối ứng sẽ được tính toán và phê duyệt dựa trên nguồn ngân sách tự chạy ngoài.
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md p-4 rounded-2xl border border-white/20 min-w-[240px] text-right space-y-1 self-start md:self-center">
            <div className="text-[10px] uppercase font-black tracking-wider text-amber-100">
              Tổng Ngân sách Khối ({selectedMonth || 'Kỳ này'})
            </div>
            <div className="text-2xl font-black text-white">
              {formatCurrency(totalBlockBudget)}
            </div>
            <div className="text-[10px] text-amber-100 font-medium">
              Đồng bộ từ mục Ngân sách Khối
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Form, Right History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* FORM REGISTER: 5 Cols */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-slate-100 shadow-lg rounded-3xl overflow-hidden bg-white">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500 w-full" />
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-amber-600" />
                  {editingRecordId ? 'Cập Nhật Đăng Ký Đối Ứng' : 'Tạo Bản Đăng Ký Mới'}
                </CardTitle>
                {existingRecord && (
                  <Badge 
                    className={
                      existingRecord.approvedReciprocalBudget > 0
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold'
                        : 'bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold'
                    }
                  >
                    {existingRecord.approvedReciprocalBudget > 0 ? 'Đã duyệt' : 'Chờ Admin duyệt'}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 font-medium">
                Kê khai số liệu ngân sách đối ứng cho khối <strong>{currentActiveBlock?.name || currentActiveBlock?.blockCode}</strong>.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Month Picker */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" /> Tháng Đăng Ký <span className="text-rose-500">*</span>
                    </Label>
                    {selectedMonth === currentMarketingPeriod && (
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Kỳ MKT hiện tại
                      </span>
                    )}
                  </div>
                  <Input 
                    type="text"
                    placeholder="YYYY-MM (VD: 2026-09)"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value.trim())}
                    className="h-11 rounded-2xl border-slate-200 font-mono text-sm font-bold focus:ring-2 focus:ring-amber-500/20"
                    required
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    * Mặc định lấy theo Tháng của kì đăng ký MKT hiện tại ({currentMarketingPeriod})
                  </p>
                </div>

                {/* 2. Tổng Ngân sách Khối (Đồng bộ) */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                      Tổng Ngân sách Khối ({selectedMonth || 'N/A'})
                    </Label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      Tự động đồng bộ
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-950 font-mono">
                    {formatCurrency(totalBlockBudget)}
                  </div>
                  {totalBlockBudget === 0 ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Chưa có hạn mức Ngân sách Khối được đăng ký trong kỳ {selectedMonth}.</span>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500">
                      Dữ liệu được lấy từ mục Ngân sách Khối tương ứng của tháng {selectedMonth}.
                    </div>
                  )}
                </div>

                {/* 3. Ngân sách chạy qua thẻ công ty Mayhomes */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-500" /> Ngân sách qua thẻ Mayhomes <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">(Tự chạy hoặc Digital chạy)</span>
                  </Label>
                  <div className="relative">
                    <Input 
                      type="text"
                      placeholder="0"
                      value={companyCardBudgetInput}
                      onChange={(e) => {
                        const formatted = formatCurrencyInput(e.target.value);
                        setCompanyCardBudgetInput(formatted);
                        // Auto update suggested external budget if external was untouched or equal to previous diff
                        const newCard = parseVal(formatted);
                        if (totalBlockBudget > 0) {
                          const newDiff = Math.max(0, totalBlockBudget - newCard);
                          setExternalBudgetInput(formatCurrencyInput(String(newDiff)));
                        }
                      }}
                      className={`h-11 rounded-2xl border-slate-200 font-mono text-sm font-bold pr-12 focus:ring-2 ${
                        isCompanyCardExceeded 
                          ? 'border-rose-400 focus:ring-rose-200 bg-rose-50/50 text-rose-700' 
                          : 'focus:ring-amber-500/20'
                      }`}
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      VNĐ
                    </span>
                  </div>
                  {isCompanyCardExceeded ? (
                    <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Không được vượt quá Tổng ngân sách Khối ({formatCurrency(totalBlockBudget)})
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400">
                      Tối đa: {formatCurrency(totalBlockBudget)}
                    </p>
                  )}
                </div>

                {/* 4. Ngân sách chạy ngoài (Không dùng thẻ Mayhomes) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-emerald-500" /> Ngân sách chạy ngoài <span className="text-rose-500">*</span>
                    </Label>
                    {totalBlockBudget > 0 && (
                      <button
                        type="button"
                        onClick={handleApplySuggestedExternal}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" /> Gợi ý: {formatCurrency(suggestedExternal)}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input 
                      type="text"
                      placeholder="0"
                      value={externalBudgetInput}
                      onChange={(e) => setExternalBudgetInput(formatCurrencyInput(e.target.value))}
                      className="h-11 rounded-2xl border-slate-200 font-mono text-sm font-bold pr-12 focus:ring-2 focus:ring-amber-500/20"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      VNĐ
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Gợi ý = Tổng ngân sách Khối - Ngân sách chạy qua thẻ Mayhomes
                  </p>
                </div>

                {/* 5. GHI CHÚ QUY ĐỊNH BẮT BUỘC */}
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 space-y-1">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold leading-relaxed">
                      <strong>Ghi chú quan trọng:</strong> Ngân sách đối ứng sẽ dựa trên <u>ngân sách chạy ngoài</u> (Không bao gồm ngân sách chạy qua thẻ công ty Mayhomes).
                    </p>
                  </div>
                </div>

                {/* 6. Ghi chú thêm của Khối */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700">Ghi chú bổ sung (nếu có)</Label>
                  <textarea 
                    rows={2}
                    placeholder="Nhập nội dung giải trình hoặc đề xuất thêm..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                  />
                </div>

                {/* Approved Reciprocal Budget Info (if Admin has approved) */}
                {existingRecord && existingRecord.approvedReciprocalBudget > 0 && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        Ngân sách đối ứng ĐƯỢC DUYỆT:
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-900">
                        {formatCurrency(existingRecord.approvedReciprocalBudget)}
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white border-none font-bold text-xs py-1 px-3">
                      Đã được duyệt
                    </Badge>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || isCompanyCardExceeded}
                  className={`w-full h-12 rounded-2xl font-black text-sm text-white shadow-lg transition-all ${
                    isCompanyCardExceeded 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                      : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 active:scale-[0.98]'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Đang lưu dữ liệu...
                    </span>
                  ) : editingRecordId ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Cập Nhật Đăng Ký Đối Ứng Kỳ {selectedMonth}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4" /> Gửi Đăng Ký Đối Ứng Kỳ {selectedMonth}
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* HISTORY & RECENT RECORDS: 7 Cols */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-slate-100 shadow-lg rounded-3xl overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" /> Lịch Sử Đăng Ký Đối Ứng
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 font-bold ml-1">
                    {blockHistory.length} kỳ
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">
                  Các bản ghi đăng ký đối ứng của khối <strong>{currentActiveBlock?.name || currentActiveBlock?.blockCode}</strong> các tháng gần đây
                </CardDescription>
              </div>

              {/* Quick block director display */}
              <div className="text-right text-xs">
                <span className="text-slate-400 font-medium">Giám đốc Khối: </span>
                <strong className="text-slate-800 font-bold">
                  {blockDirector?.displayName || blockDirector?.email || currentActiveBlock?.directorName || 'Chưa gán'}
                </strong>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {blockHistory.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div className="text-slate-700 font-bold text-sm">
                    Chưa có bản ghi đăng ký đối ứng nào
                  </div>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hãy điền thông tin vào biểu mẫu bên trái để thực hiện đăng ký đối ứng cho khối trong kỳ hiện tại.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {blockHistory.map((item) => {
                    const isCurrent = item.month === currentMarketingPeriod;
                    const hasApproved = (item.approvedReciprocalBudget || 0) > 0;

                    return (
                      <div 
                        key={item.id} 
                        className={`p-5 transition-colors ${
                          item.month === selectedMonth ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-black font-mono text-slate-900 bg-slate-100 px-3 py-1 rounded-xl">
                              Tháng {item.month}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-amber-500 text-white border-none text-[9px] font-black">
                                Kỳ hiện tại
                              </Badge>
                            )}
                            <Badge 
                              className={
                                hasApproved
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold'
                                  : 'bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-bold'
                              }
                            >
                              {hasApproved ? 'Đã duyệt đối ứng' : 'Chờ Admin duyệt'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-1.5 self-end sm:self-auto">
                            {hasEditPerm && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedMonth(item.month);
                                  setEditingRecordId(item.id);
                                  setCompanyCardBudgetInput(formatCurrencyInput(String(item.companyCardBudget || 0)));
                                  setExternalBudgetInput(formatCurrencyInput(String(item.externalBudget || 0)));
                                  setNoteInput(item.note || '');
                                  toast.info(`Đang chỉnh sửa bản ghi kỳ ${item.month}`);
                                }}
                                className="h-8 text-xs font-bold text-amber-700 hover:bg-amber-100 rounded-xl"
                              >
                                <Edit3 className="w-3.5 h-3.5 mr-1" /> Sửa
                              </Button>
                            )}

                            {canRegister && hasDeletePerm && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRecordToDelete(item);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Xóa
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Metric stats grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-100">
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Tổng NS Khối
                            </div>
                            <div className="text-xs sm:text-sm font-black text-slate-800 font-mono mt-0.5">
                              {formatCurrency(item.totalBlockBudget || 0)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              NS Qua Thẻ C.Ty
                            </div>
                            <div className="text-xs sm:text-sm font-black text-indigo-700 font-mono mt-0.5">
                              {formatCurrency(item.companyCardBudget || 0)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              NS Chạy Ngoài
                            </div>
                            <div className="text-xs sm:text-sm font-black text-amber-700 font-mono mt-0.5">
                              {formatCurrency(item.externalBudget || 0)}
                            </div>
                          </div>

                          <div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                              Đối Ứng Được Duyệt
                            </div>
                            <div className="text-xs sm:text-sm font-black text-emerald-700 font-mono mt-0.5">
                              {hasApproved ? formatCurrency(item.approvedReciprocalBudget) : '— (Chờ duyệt)'}
                            </div>
                          </div>
                        </div>

                        {item.note && (
                          <p className="text-xs text-slate-500 italic mt-2.5 px-1">
                            Ghi chú: "{item.note}"
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 px-1">
                          <span>
                            Người đăng ký: <strong className="text-slate-600">{item.createdByName || item.createdBy || 'N/A'}</strong>
                          </span>
                          <span>
                            {safeFormat(item.updatedAt || item.createdAt, 'HH:mm dd/MM/yyyy')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Xác nhận xóa bản ghi đối ứng?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2 font-medium">
              Bạn có chắc chắn muốn xóa bản đăng ký đối ứng của khối <strong>{recordToDelete?.blockName || recordToDelete?.blockCode}</strong> trong kỳ <strong>{recordToDelete?.month}</strong>? Thao tác này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="rounded-xl text-xs font-bold h-10"
            >
              Hủy bỏ
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="rounded-xl text-xs font-black h-10 bg-rose-600 hover:bg-rose-700 text-white"
            >
              Xác nhận xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
