import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Trash2, 
  Upload, 
  History, 
  ShieldCheck, 
  AlertCircle, 
  CornerDownRight, 
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { parseCurrencyFormula } from './acceptanceUtils';

interface DialogsProps {
  // Calculator
  isCalculatorOpen: boolean;
  setIsCalculatorOpen: (open: boolean) => void;
  activeCalculatorField?: string | null;
  calculatorFieldNameVN: string;
  calculatorInput: string;
  setCalculatorInput: (val: string) => void;
  calculatorUpdateFn: ((val: string) => void) | null;
  formatCurrency: (amount: number) => string;

  // Finalize (optional / deprecated)
  isFinalizeDialogOpen?: boolean;
  setIsFinalizeDialogOpen?: (open: boolean) => void;
  itemToFinalize?: any;
  onConfirmFinalize?: () => void;

  // Delete
  isDeleteDialogOpen: boolean;
  setIsDeleteDialogOpen: (open: boolean) => void;
  itemToDeleteId?: string | null;
  onConfirmDelete: () => void;

  // Bulk Delete
  isBulkDeleteDialogOpen: boolean;
  setIsBulkDeleteDialogOpen: (open: boolean) => void;
  selectedCount: number;
  onConfirmBulkDelete: () => void;

  // Final Delete (optional)
  isDeleteFinalDialogOpen?: boolean;
  setIsDeleteFinalDialogOpen?: (open: boolean) => void;
  itemFinalToDeleteId?: string | null;
  onConfirmDeleteFinal?: () => void;

  // History
  isHistoryDialogOpen: boolean;
  setIsHistoryDialogOpen: (open: boolean) => void;
  historyTargetRecord: any;

  // Import
  isImportAcceptancesDialogOpen: boolean;
  setIsImportAcceptancesDialogOpen: (open: boolean) => void;
  isImporting: boolean;
  onFileImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AcceptanceDialogs: React.FC<DialogsProps> = ({
  isCalculatorOpen,
  setIsCalculatorOpen,
  calculatorFieldNameVN,
  calculatorInput,
  setCalculatorInput,
  calculatorUpdateFn,
  formatCurrency,

  isFinalizeDialogOpen = false,
  setIsFinalizeDialogOpen = (_open?: boolean) => {},
  itemToFinalize = null,
  onConfirmFinalize = () => {},

  isDeleteDialogOpen,
  setIsDeleteDialogOpen,
  onConfirmDelete,

  isBulkDeleteDialogOpen,
  setIsBulkDeleteDialogOpen,
  selectedCount,
  onConfirmBulkDelete,

  isDeleteFinalDialogOpen = false,
  setIsDeleteFinalDialogOpen = (_open?: boolean) => {},
  onConfirmDeleteFinal = () => {},

  isHistoryDialogOpen,
  setIsHistoryDialogOpen,
  historyTargetRecord,

  isImportAcceptancesDialogOpen,
  setIsImportAcceptancesDialogOpen,
  isImporting,
  onFileImport
}) => {
  const parsedCalc = parseCurrencyFormula(calculatorInput);

  return (
    <>
      {/* 📊 1. Multi-Value Sum Calculator Dialog */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Máy tính cộng dồn khoản chi
                </h3>
                <p className="text-xs font-semibold text-indigo-600">
                  {calculatorFieldNameVN || 'Trường dữ liệu'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                Nhập công thức cộng dồn hoặc nhiều khoản chi
              </Label>
              <Input
                value={calculatorInput}
                onChange={(e) => setCalculatorInput(e.target.value)}
                placeholder="Ví dụ: 10m + 5.5m + 200k hoặc 500.000 + 1.200.000"
                className="font-mono text-sm bg-white font-bold h-10 border-slate-200"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 font-medium">
                Hỗ trợ viết tắt: <span className="font-bold text-slate-700">k</span> (nghìn), <span className="font-bold text-slate-700">m</span> (triệu), phân cách bằng dấu <span className="font-bold text-slate-700">+</span>
              </p>
            </div>

            {parsedCalc.items.length > 0 && (
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3 space-y-2">
                <div className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">
                  Chi tiết các khoản phân rã ({parsedCalc.items.length} khoản):
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {parsedCalc.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-indigo-50 text-xs">
                      <span className="text-slate-600 font-medium truncate max-w-[180px]">
                        • {it.label}
                      </span>
                      <span className="font-mono font-bold text-indigo-700">
                        {formatCurrency(it.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-indigo-100 flex justify-between items-center font-black">
                  <span className="text-xs text-indigo-950 uppercase">Tổng cộng:</span>
                  <span className="text-base font-mono text-indigo-700">
                    {formatCurrency(parsedCalc.total)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsCalculatorOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Đóng
              </Button>
              <Button
                onClick={() => {
                  if (calculatorUpdateFn) {
                    calculatorUpdateFn(calculatorInput);
                  }
                  setIsCalculatorOpen(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-indigo-100"
              >
                Áp dụng kết quả
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔒 2. Finalize Acceptance Confirmation Dialog */}
      <Dialog open={isFinalizeDialogOpen} onOpenChange={setIsFinalizeDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Chốt số liệu nghiệm thu
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Dòng nghiệm thu của <span className="font-bold text-slate-800">{itemToFinalize?.teamName}</span> - Dự án <span className="font-bold text-slate-800">{itemToFinalize?.projectName}</span> sẽ được chuyển vào danh sách Đã chốt số liệu.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsFinalizeDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={onConfirmFinalize}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-emerald-100"
              >
                Xác nhận chốt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🗑️ 3. Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Xác nhận xóa bản ghi
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa bản ghi nghiệm thu này không?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={onConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-rose-100"
              >
                Xác nhận xóa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🗑️ 4. Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Xóa đồng loạt ({selectedCount} dòng)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Bạn có chắc chắn muốn xóa toàn bộ <span className="font-bold text-rose-600">{selectedCount}</span> bản ghi đã chọn không?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsBulkDeleteDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={onConfirmBulkDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-rose-100"
              >
                Xóa ngay
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🗑️ 5. Final Delete Dialog */}
      <Dialog open={isDeleteFinalDialogOpen} onOpenChange={setIsDeleteFinalDialogOpen}>
        <DialogContent className="max-w-sm rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-800">
                Xóa bản ghi Đã chốt
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Bạn có chắc chắn muốn xóa bản ghi đã chốt số liệu này không?
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteFinalDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Hủy
              </Button>
              <Button
                onClick={onConfirmDeleteFinal}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs px-5 shadow-md shadow-rose-100"
              >
                Xóa vĩnh viễn
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📜 6. History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Lịch sử cập nhật & chỉnh sửa
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  {historyTargetRecord?.teamName || historyTargetRecord?.teamCode} - {historyTargetRecord?.projectName} ({historyTargetRecord?.month})
                </p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {(!historyTargetRecord?.editHistory || historyTargetRecord.editHistory.length === 0) ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  Chưa có lịch sử thay đổi nào được ghi nhận cho bản ghi này.
                </div>
              ) : (
                historyTargetRecord.editHistory.map((hist: any, hIdx: number) => (
                  <div key={hIdx} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">
                        {hist.editorName || hist.editorEmail || 'Người dùng'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {hist.timestamp ? new Date(hist.timestamp).toLocaleString('vi-VN') : ''}
                      </span>
                    </div>
                    {hist.action && (
                      <Badge variant="outline" className="text-[9px] font-bold">
                        {hist.action}
                      </Badge>
                    )}
                    {hist.changes && Object.keys(hist.changes).length > 0 && (
                      <div className="space-y-1 pt-1">
                        {Object.entries(hist.changes).map(([k, v]: [string, any], cIdx) => (
                          <div key={cIdx} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <CornerDownRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{k}:</span>
                            <span className="line-through text-slate-400">{String(v.old || '0')}</span>
                            <span>→</span>
                            <span className="font-bold text-indigo-600">{String(v.new || '0')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => setIsHistoryDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 📥 7. Import Excel Dialog */}
      <Dialog open={isImportAcceptancesDialogOpen} onOpenChange={setIsImportAcceptancesDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 bg-white border-none shadow-2xl">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800">
                  Nhập dữ liệu Nghiệm thu (Excel)
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  Hỗ trợ định dạng chuẩn các cột theo cấu trúc bảng Nghiệm thu
                </p>
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 transition-colors rounded-2xl p-6 text-center bg-slate-50/50">
              <input
                type="file"
                id="excel-file-input"
                accept=".xlsx, .xls, .csv"
                onChange={onFileImport}
                disabled={isImporting}
                className="hidden"
              />
              <label htmlFor="excel-file-input" className="cursor-pointer block space-y-2">
                <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  {isImporting ? 'Đang đọc và xử lý file...' : 'Nhấp để tải lên tệp Excel (.xlsx, .csv)'}
                </div>
                <div className="text-[10px] text-slate-400">
                  Cột A: Tháng | Cột B: Mã Team | Cột C: GĐKD | Cột E: Dự án...
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsImportAcceptancesDialogOpen(false)}
                className="rounded-xl font-bold text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
