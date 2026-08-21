import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Edit, 
  Trash2, 
  Save, 
  CheckCircle2, 
  History, 
  ShieldCheck 
} from 'lucide-react';
import { getRowComputed, handleCostInputChange } from './acceptanceUtils';

interface RowProps {
  item: any;
  index: number;
  isFinalizedView?: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingState: any;
  teams: any[];
  projects: any[];
  blocks: any[];
  monthsList: string[];
  teamMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  findTeam?: (idOrCodeOrName: string) => any;
  findProject?: (idOrCodeOrName: string) => any;
  formatCurrency: (amount: number) => string;
  onSelectRow: (id: string, checked: boolean) => void;
  onStartEdit: (item: any) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateEditingField: (field: string, value: any) => void;
  onUpdateEditingFields?: (fields: Record<string, any>) => void;
  onOpenCalculator: (fieldKey: string, fieldVNName: string, currentVal: string, onUpdate: (val: string) => void) => void;
  onFinalize?: (item: any) => void;
  onDelete: (id: string) => void;
  onOpenHistory: (item: any) => void;
  renderBreakdownTooltip: (amount: number, breakdown: any, label: string) => React.ReactNode;
}

export const AcceptanceRow: React.FC<RowProps> = React.memo(({
  item,
  index,
  isFinalizedView = false,
  isSelected,
  isEditing,
  editingState,
  teams,
  projects,
  blocks,
  monthsList,
  teamMap = {},
  projectMap = {},
  findTeam,
  findProject,
  formatCurrency,
  onSelectRow,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onUpdateEditingField,
  onUpdateEditingFields,
  onOpenCalculator,
  onDelete,
  onOpenHistory,
  renderBreakdownTooltip
}) => {
  // Helper to identify raw database IDs / hashes to prevent displaying IDs
  const isRawId = (val: string | undefined | null) => {
    if (!val) return false;
    const str = String(val).trim();
    if (str.startsWith('draft-')) return true;
    if ((teams || []).some((t: any) => t.id === str)) return true;
    if ((projects || []).some((p: any) => p.id === str)) return true;
    if (str.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(str) && !str.includes(' ') && !str.includes('.')) return true;
    return false;
  };

  // If in editing mode, compute from editingState
  if (isEditing && editingState) {
    const editComp = getRowComputed(editingState);

    // Resolve matching team for editingState
    const currentEditTeam = (findTeam 
      ? (findTeam(editingState.teamId) || findTeam(editingState.teamCode) || findTeam(editingState.teamName))
      : null) || (teams || []).find((t: any) => 
          t.id === editingState.teamId || 
          t.id === editingState.teamCode || 
          t.id === editingState.teamName ||
          (editingState.teamCode && t.teamCode === editingState.teamCode) || 
          (editingState.teamName && t.name === editingState.teamName)
        );
    const currentEditTeamId = currentEditTeam?.id || editingState.teamId || '';

    // Resolve matching project for editingState
    const currentEditProj = (findProject
      ? (findProject(editingState.projectId) || findProject(editingState.projectName) || findProject(editingState.projectCode))
      : null) || (projects || []).find((p: any) => 
          p.id === editingState.projectId || 
          p.id === editingState.projectName || 
          p.id === editingState.projectCode ||
          (editingState.projectName && p.name === editingState.projectName) || 
          (editingState.projectCode && p.projectCode === editingState.projectCode)
        );
    const currentEditProjId = currentEditProj?.id || editingState.projectId || '';

    const renderEditInput = (
      fieldKey: string,
      fieldLabel: string,
      val: string,
      placeholder: string = '0'
    ) => (
      <div className="relative group flex items-center min-w-[75px]">
        <Input
          value={val || ''}
          placeholder={placeholder}
          onChange={(e) => handleCostInputChange(e.target.value, (v) => onUpdateEditingField(fieldKey, v))}
          className="h-7 text-right font-mono text-[11px] font-bold pr-5 border-indigo-200 focus:border-indigo-500 rounded bg-white"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onOpenCalculator(fieldKey, fieldLabel, val || '', (v) => onUpdateEditingField(fieldKey, v))}
          className="absolute right-1 text-slate-400 hover:text-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity"
          title={`Mở máy tính (${fieldLabel})`}
        >
          <Calculator className="w-3 h-3" />
        </button>
      </div>
    );

    return (
      <TableRow className="bg-indigo-50/40 border-y-2 border-indigo-300">
        {/* STT */}
        <TableCell className="text-center font-bold text-xs text-indigo-700 bg-indigo-100/60 sticky left-0 z-10">
          <span className="font-mono">{index + 1}</span>
        </TableCell>

        {/* Col A: THÁNG */}
        <TableCell className="p-1 min-w-[110px]">
          <Select
            value={editingState.month || 'Kì 1 - Tháng 8'}
            onValueChange={(val) => onUpdateEditingField('month', val)}
          >
            <SelectTrigger className="h-7 text-[11px] font-bold border-indigo-200 bg-white rounded">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Kì 1 - Tháng 8">Kì 1 - Tháng 8</SelectItem>
              <SelectItem value="Kì 2 - Tháng 8">Kì 2 - Tháng 8</SelectItem>
              {monthsList
                .filter(m => m !== 'Kì 1 - Tháng 8' && m !== 'Kì 2 - Tháng 8')
                .map(m => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Col B: MÃ TEAM */}
        <TableCell className="p-1 min-w-[130px]">
          <Select
            value={currentEditTeamId}
            onValueChange={(teamId) => {
              const tm = (teams || []).find((t: any) => t.id === teamId) || (findTeam ? findTeam(teamId) : null);
              if (tm) {
                const tmName = tm.name || '';
                const code = tm.teamCode || '';
                let gdkd = tmName;
                if (code && tmName.startsWith(code)) {
                  gdkd = tmName.substring(code.length).trim();
                }
                if (onUpdateEditingFields) {
                  onUpdateEditingFields({
                    teamId: tm.id,
                    teamCode: tm.teamCode || tm.name || '',
                    teamName: tm.name || tm.teamCode || '',
                    blockId: tm.blockId || '',
                    blockCode: tm.blockCode || '',
                    gdkdName: (!editingState.gdkdName || editingState.gdkdName === '-') ? gdkd : editingState.gdkdName
                  });
                } else {
                  onUpdateEditingField('teamId', tm.id);
                  onUpdateEditingField('teamCode', tm.teamCode || tm.name || '');
                  onUpdateEditingField('teamName', tm.name || tm.teamCode || '');
                  onUpdateEditingField('blockId', tm.blockId || '');
                  onUpdateEditingField('blockCode', tm.blockCode || '');
                  if (!editingState.gdkdName || editingState.gdkdName === '-') {
                    onUpdateEditingField('gdkdName', gdkd);
                  }
                }
              } else {
                onUpdateEditingField('teamId', teamId);
              }
            }}
          >
            <SelectTrigger className="h-7 text-[11px] font-bold border-indigo-200 bg-white rounded">
              <SelectValue placeholder="Chọn Team">
                {currentEditTeam 
                  ? (currentEditTeam.teamCode ? `${currentEditTeam.teamCode} - ${currentEditTeam.name}` : currentEditTeam.name)
                  : (editingState.teamName || editingState.teamCode || undefined)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {(teams || []).map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.teamCode ? `${t.teamCode} - ${t.name}` : t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Col C: GĐKD */}
        <TableCell className="p-1 min-w-[120px]">
          <Input
            value={editingState.gdkdName || ''}
            onChange={(e) => onUpdateEditingField('gdkdName', e.target.value)}
            className="h-7 text-xs font-semibold border-indigo-200 rounded bg-white"
          />
        </TableCell>

        {/* Col D: NGƯỜI PHỤ TRÁCH */}
        <TableCell className="p-1 min-w-[110px]">
          <Input
            value={editingState.implementerName || ''}
            onChange={(e) => onUpdateEditingField('implementerName', e.target.value)}
            className="h-7 text-xs font-semibold border-indigo-200 rounded bg-white"
          />
        </TableCell>

        {/* Col E: DỰ ÁN */}
        <TableCell className="p-1 min-w-[170px]">
          <Select
            value={currentEditProjId}
            onValueChange={(projectId) => {
              const p = (projects || []).find((pr: any) => pr.id === projectId) || (findProject ? findProject(projectId) : null);
              if (p) {
                if (onUpdateEditingFields) {
                  onUpdateEditingFields({
                    projectId: p.id,
                    projectName: p.name || '',
                    projectCode: p.projectCode || ''
                  });
                } else {
                  onUpdateEditingField('projectId', p.id);
                  onUpdateEditingField('projectName', p.name || '');
                  onUpdateEditingField('projectCode', p.projectCode || '');
                }
              } else {
                onUpdateEditingField('projectId', projectId);
              }
            }}
          >
            <SelectTrigger className="h-7 text-[11px] font-bold border-indigo-200 bg-white rounded">
              <SelectValue placeholder="Chọn Dự án">
                {currentEditProj 
                  ? (currentEditProj.projectCode ? `[${currentEditProj.projectCode}] ${currentEditProj.name}` : currentEditProj.name)
                  : (editingState.projectName || undefined)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {(projects || []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.projectCode ? `[${p.projectCode}] ${p.name}` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Group 1: DIGITAL CHẠY */}
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalFb', 'Digital FB', editingState.digitalFb)}</TableCell>
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalZalo', 'Digital Zalo', editingState.digitalZalo)}</TableCell>
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalTiktok', 'Digital Tiktok', editingState.digitalTiktok)}</TableCell>
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalKhac', 'Digital Khác', editingState.digitalKhac)}</TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-bold text-sky-950 bg-sky-100/50">
          {formatCurrency(editComp.dTotalChuaVat).replace(' đ', '')}
        </TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-black text-sky-900 bg-sky-200/50">
          {formatCurrency(editComp.dTotalSauVat).replace(' đ', '')}
        </TableCell>

        {/* Group 2: THẺ VISA CÔNG TY */}
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaFb', 'Visa FB', editingState.visaFb)}</TableCell>
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaZalo', 'Visa Zalo', editingState.visaZalo)}</TableCell>
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaTiktok', 'Visa Tiktok', editingState.visaTiktok)}</TableCell>
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaDangTin', 'Visa Đăng tin', editingState.visaDangTin)}</TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-bold text-emerald-950 bg-emerald-100/50">
          {formatCurrency(editComp.vTotalChuaVat).replace(' đ', '')}
        </TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-black text-indigo-900 bg-indigo-100/50">
          {formatCurrency(editComp.vTotalSauVat).replace(' đ', '')}
        </TableCell>

        {/* Group 3: ĐĂNG TIN CÔNG TY */}
        <TableCell className="p-1 bg-indigo-50/40">{renderEditInput('dangTinCtyChuaVat', 'Đăng tin CTY chưa VAT', editingState.dangTinCtyChuaVat)}</TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-black text-indigo-950 bg-indigo-100/60">
          {formatCurrency(editComp.dtCtySauVat).replace(' đ', '')}
        </TableCell>

        {/* Group 4: CÁ NHÂN CHẠY NGOÀI */}
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanFb', 'Cá nhân FB', editingState.caNhanFb)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanDangTin', 'Cá nhân Đăng tin', editingState.caNhanDangTin)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanZalo', 'Cá nhân Zalo', editingState.caNhanZalo)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanGoogle', 'Cá nhân Google', editingState.caNhanGoogle)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanTiktok', 'Cá nhân Tiktok', editingState.caNhanTiktok)}</TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-extrabold text-amber-950 bg-amber-100/60">
          {formatCurrency(editComp.cnTotal).replace(' đ', '')}
        </TableCell>

        {/* Col Z: TỔNG (K + Q + S + Y) */}
        <TableCell className="p-1 text-right font-mono text-xs font-black text-rose-900 bg-rose-100/70">
          {formatCurrency(editComp.grandTotal).replace(' đ', '')}
        </TableCell>

        {/* Col AA: SỐ LEAD */}
        <TableCell className="p-1 bg-cyan-50/40">{renderEditInput('caNhanNopTien', 'Số Lead', editingState.caNhanNopTien)}</TableCell>

        {/* Col AB: TRẠNG THÁI */}
        <TableCell className="p-1 min-w-[100px]">
          <Select
            value={editingState.status || 'Đã nghiệm thu'}
            onValueChange={(val) => onUpdateEditingField('status', val)}
          >
            <SelectTrigger className="h-7 text-[10px] font-bold border-yellow-200 bg-white rounded">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Đã nghiệm thu">Đã nghiệm thu</SelectItem>
              <SelectItem value="Chưa nghiệm thu">Chưa nghiệm thu</SelectItem>
              <SelectItem value="Đang xử lý">Đang xử lý</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>

        {/* Col AC: GHI CHÚ */}
        <TableCell className="p-1 min-w-[120px]">
          <Input
            value={editingState.notes || ''}
            placeholder="Ghi chú..."
            onChange={(e) => onUpdateEditingField('notes', e.target.value)}
            className="h-7 text-xs font-medium border-yellow-200 rounded bg-white"
          />
        </TableCell>

        {/* THAO TÁC */}
        <TableCell className="p-1 text-center sticky right-0 z-20 bg-indigo-100 shadow-l">
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              onClick={onSaveEdit}
              className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded flex items-center gap-1 shadow-sm"
            >
              <Save className="w-3 h-3" /> Lưu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              className="h-7 px-2 text-slate-500 hover:bg-slate-200 rounded text-[10px]"
            >
              Hủy
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // Normal Read-only Row
  const comp = getRowComputed(item);

  // Exact resolution of team name and team code to avoid showing raw IDs
  const matchedTeam = (findTeam 
    ? (findTeam(item.teamId) || findTeam(item.teamCode) || findTeam(item.teamName))
    : null) || (teams || []).find((t: any) => 
        (t.id && (t.id === item.teamId || t.id === item.teamCode || t.id === item.teamName)) ||
        (t.teamCode && (t.teamCode === item.teamCode || t.teamCode === item.teamName || t.teamCode === item.teamId)) ||
        (t.name && (t.name === item.teamName || t.name === item.teamCode || t.name === item.teamId))
      );

  const rawTeamCode = item.teamCode || '';
  const rawTeamName = item.teamName || teamMap[item.teamId] || teamMap[item.teamCode] || '';

  const displayTeamCode = matchedTeam?.teamCode || 
    (!isRawId(rawTeamCode) && rawTeamCode ? rawTeamCode : '') || 
    matchedTeam?.name || 
    (!isRawId(rawTeamName) && rawTeamName ? rawTeamName : '') || 
    '-';

  const displayTeamName = matchedTeam?.name || 
    (!isRawId(rawTeamName) && rawTeamName ? rawTeamName : '') || 
    matchedTeam?.teamCode || 
    (displayTeamCode !== '-' ? displayTeamCode : '');

  // Exact resolution of project name to avoid showing raw IDs
  const matchedProject = (findProject
    ? (findProject(item.projectId) || findProject(item.projectName) || findProject(item.projectCode))
    : null) || (projects || []).find((p: any) => 
        (p.id && (p.id === item.projectId || p.id === item.projectName || p.id === item.projectCode)) ||
        (p.name && (p.name === item.projectName || p.name === item.projectId)) ||
        (p.projectCode && (p.projectCode === item.projectCode || p.projectCode === item.projectName))
      );

  const rawProjectName = item.projectName || projectMap[item.projectId] || projectMap[item.projectName] || '';
  const rawProjectCode = item.projectCode || '';

  const displayProjectName = matchedProject?.name || 
    (!isRawId(rawProjectName) && rawProjectName ? rawProjectName : '') || 
    (matchedProject?.projectCode ? `[${matchedProject.projectCode}]` : '') || 
    '-';

  const displayProjectCode = matchedProject?.projectCode || 
    (!isRawId(rawProjectCode) && rawProjectCode ? rawProjectCode : '');

  return (
    <TableRow className="hover:bg-slate-50/80 transition-colors group border-b border-slate-200">
      {/* STT & Checkbox */}
      <TableCell className="text-center font-bold text-xs text-slate-500 bg-slate-50/50 sticky left-0 z-10">
        <div className="flex items-center justify-center gap-2">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectRow(item.id, e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600"
          />
          <span className="font-mono text-[11px] text-slate-400">{index + 1}</span>
        </div>
      </TableCell>

      {/* Col A: THÁNG */}
      <TableCell className="font-extrabold text-xs text-slate-800 whitespace-nowrap">
        <Badge variant="outline" className="bg-slate-50 font-mono text-[11px] border-slate-200">
          {item.month || '-'}
        </Badge>
      </TableCell>

      {/* Col B: MÃ TEAM */}
      <TableCell className="text-center font-mono font-bold text-xs text-slate-700 whitespace-nowrap" title={displayTeamName ? `${displayTeamCode} - ${displayTeamName}` : displayTeamCode}>
        <Badge variant="outline" className="bg-slate-50 border-slate-200 text-slate-700 font-mono font-bold text-[11px] px-2 py-0.5 shadow-2xs">
          {displayTeamCode}
        </Badge>
      </TableCell>

      {/* Col C: GĐKD */}
      <TableCell className="font-semibold text-xs text-slate-700 whitespace-nowrap">
        {item.gdkdName || displayTeamName || '-'}
      </TableCell>

      {/* Col D: NGƯỜI PHỤ TRÁCH */}
      <TableCell className="font-medium text-xs text-slate-600 truncate max-w-[120px]" title={item.implementerName}>
        {item.implementerName || '-'}
      </TableCell>

      {/* Col E: DỰ ÁN */}
      <TableCell className="font-bold text-xs text-slate-800 min-w-[170px]" title={displayProjectName}>
        <div className="flex items-center gap-1.5">
          {displayProjectCode && (
            <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 bg-indigo-50/60 text-indigo-700 border-indigo-200 shrink-0 font-bold">
              {displayProjectCode}
            </Badge>
          )}
          <span className="truncate">{displayProjectName}</span>
        </div>
      </TableCell>

      {/* Group 1: DIGITAL CHẠY (Chưa VAT) */}
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-sky-50/20">
        {renderBreakdownTooltip(comp.dFb, item.costBreakdowns?.digitalFb || item.costBreakdowns?.fbDigital, 'FB Digital')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-sky-50/20">
        {renderBreakdownTooltip(comp.dZalo, item.costBreakdowns?.digitalZalo, 'Zalo Digital')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-sky-50/20">
        {renderBreakdownTooltip(comp.dTiktok, item.costBreakdowns?.digitalTiktok, 'Tiktok Digital')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-sky-50/20">
        {renderBreakdownTooltip(comp.dKhac, item.costBreakdowns?.digitalKhac, 'Khác Digital')}
      </TableCell>
      {/* Col J: TỔNG DIGITAL CHƯA VAT */}
      <TableCell className="text-right font-mono text-xs font-bold text-sky-950 bg-sky-100/40">
        {formatCurrency(comp.dTotalChuaVat).replace(' đ', '')}
      </TableCell>
      {/* Col K: DIGITAL CHẠY (SAU VAT) */}
      <TableCell className="text-right font-mono text-xs font-black text-sky-900 bg-sky-200/40">
        {formatCurrency(comp.dTotalSauVat).replace(' đ', '')}
      </TableCell>

      {/* Group 2: THẺ VISA CÔNG TY (Chưa VAT) */}
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-emerald-50/20">
        {renderBreakdownTooltip(comp.vFb, item.costBreakdowns?.visaFb || item.costBreakdowns?.fbVisa, 'FB Visa')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-emerald-50/20">
        {renderBreakdownTooltip(comp.vZalo, item.costBreakdowns?.visaZalo, 'Zalo Visa')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-emerald-50/20">
        {renderBreakdownTooltip(comp.vTiktok, item.costBreakdowns?.visaTiktok, 'Tiktok Visa')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-emerald-50/20">
        {renderBreakdownTooltip(comp.vDangTin, item.costBreakdowns?.visaDangTin, 'Đăng tin Visa')}
      </TableCell>
      {/* Col P: TỔNG VISA CHƯA VAT */}
      <TableCell className="text-right font-mono text-xs font-bold text-emerald-950 bg-emerald-100/40">
        {formatCurrency(comp.vTotalChuaVat).replace(' đ', '')}
      </TableCell>
      {/* Col Q: THẺ VISA CÔNG TY (SAU VAT) */}
      <TableCell className="text-right font-mono text-xs font-black text-indigo-900 bg-indigo-100/40">
        {formatCurrency(comp.vTotalSauVat).replace(' đ', '')}
      </TableCell>

      {/* Group 3: ĐĂNG TIN CÔNG TY */}
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-indigo-50/20">
        {renderBreakdownTooltip(comp.dtCtyChuaVat, item.costBreakdowns?.dangTinCtyChuaVat || item.costBreakdowns?.dangTinCongTy, 'Đăng tin CTY chưa VAT')}
      </TableCell>
      {/* Col S: ĐĂNG TIN CÔNG TY (SAU VAT 8%) */}
      <TableCell className="text-right font-mono text-xs font-black text-indigo-950 bg-indigo-100/50">
        {formatCurrency(comp.dtCtySauVat).replace(' đ', '')}
      </TableCell>

      {/* Group 4: CÁ NHÂN CHẠY NGOÀI */}
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-amber-50/20">
        {renderBreakdownTooltip(comp.cnFb, item.costBreakdowns?.caNhanFb || item.costBreakdowns?.caNhan, 'Cá nhân FB')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-amber-50/20">
        {renderBreakdownTooltip(comp.cnDangTin, item.costBreakdowns?.caNhanDangTin, 'Cá nhân Đăng tin')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-amber-50/20">
        {renderBreakdownTooltip(comp.cnZalo, item.costBreakdowns?.caNhanZalo || item.costBreakdowns?.zalo, 'Cá nhân Zalo')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-amber-50/20">
        {renderBreakdownTooltip(comp.cnGoogle, item.costBreakdowns?.caNhanGoogle || item.costBreakdowns?.google, 'Cá nhân Google')}
      </TableCell>
      <TableCell className="text-right font-mono text-xs text-slate-600 bg-amber-50/20">
        {renderBreakdownTooltip(comp.cnTiktok, item.costBreakdowns?.caNhanTiktok || item.costBreakdowns?.tiktok, 'Cá nhân Tiktok')}
      </TableCell>
      {/* Col Y: CÁ NHÂN TỔNG */}
      <TableCell className="text-right font-mono text-xs font-extrabold text-amber-950 bg-amber-100/50">
        {formatCurrency(comp.cnTotal).replace(' đ', '')}
      </TableCell>

      {/* Col Z: TỔNG (K + Q + S + Y) */}
      <TableCell className="text-right font-mono text-xs font-black text-rose-900 bg-rose-100/60">
        {formatCurrency(comp.grandTotal).replace(' đ', '')}
      </TableCell>

      {/* Col AA: SỐ LEAD */}
      <TableCell className="text-right font-mono text-xs font-bold text-cyan-950 bg-cyan-50/30">
        {renderBreakdownTooltip(comp.cnNopTien, item.costBreakdowns?.caNhanNopTien, 'Số Lead')}
      </TableCell>

      {/* Col AB: TRẠNG THÁI */}
      <TableCell className="text-center bg-yellow-50/30">
        <Badge
          className={`text-[10px] font-bold border-none ${
            item.status === 'Đã nghiệm thu'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {item.status || 'Đã nghiệm thu'}
        </Badge>
      </TableCell>

      {/* Col AC: GHI CHÚ */}
      <TableCell className="text-xs text-slate-500 max-w-[140px] truncate bg-yellow-50/30" title={item.notes}>
        {item.notes || '-'}
      </TableCell>

      {/* THAO TÁC */}
      <TableCell className="text-center sticky right-0 z-20 bg-white/95 backdrop-blur group-hover:bg-slate-50/95 shadow-l">
        <div className="flex items-center justify-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStartEdit(item)}
            className="h-6 w-6 p-0 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            title="Chỉnh sửa dòng"
          >
            <Edit className="w-3 h-3" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenHistory(item)}
            className="h-6 w-6 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            title="Lịch sử chỉnh sửa"
          >
            <History className="w-3 h-3" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(item.id)}
            className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
            title="Xóa bản ghi"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
