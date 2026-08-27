import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  History,
  Loader2
} from 'lucide-react';
import { getRowComputed, handleCostInputChange } from './acceptanceUtils';
import { AcceptanceSearchableSelect, SearchableItem } from './AcceptanceSearchableSelect';

interface RowProps {
  item: any;
  index: number;
  isFinalizedView?: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingState?: any;
  teams: any[];
  projects: any[];
  blocks: any[];
  monthsList: string[];
  teamMap?: Record<string, string>;
  projectMap?: Record<string, string>;
  teamIdSet?: Set<string>;
  projectIdSet?: Set<string>;
  teamItems?: SearchableItem[];
  projectItems?: SearchableItem[];
  findTeam?: (idOrCodeOrName: string) => any;
  findProject?: (idOrCodeOrName: string) => any;
  formatCurrency: (amount: number) => string;
  onSelectRow: (id: string, checked: boolean) => void;
  onStartEdit: (item: any) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, updatedState: any) => Promise<void> | void;
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
  editingState: propEditingState,
  teams,
  projects,
  blocks,
  monthsList,
  teamMap = {},
  projectMap = {},
  teamIdSet,
  projectIdSet,
  teamItems: propTeamItems,
  projectItems: propProjectItems,
  findTeam,
  findProject,
  formatCurrency,
  onSelectRow,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onOpenCalculator,
  onDelete,
  onOpenHistory,
  renderBreakdownTooltip
}) => {
  // Local edit state to ensure typing inside edit row is 100% instant and doesn't re-render parent/other rows
  const [localEditState, setLocalEditState] = useState<any>(() => {
    return propEditingState || item;
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSaveEdit(item.id, localEditState);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isEditing) {
      setLocalEditState(propEditingState || {
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
        caNhanNapTienQuaCty: item.caNhanNapTienQuaCty ?? item.caNhanNapTienCty ?? '',
        caNhanNopTien: item.caNhanNopTien ?? item.personalPaidToCompany ?? '',
        status: item.status || 'Đã nghiệm thu',
        notes: item.notes || ''
      });
    }
  }, [isEditing, propEditingState, item]);

  // Fast O(1) Raw database ID check
  const isRawId = useCallback((val: string | undefined | null) => {
    if (!val) return false;
    const str = String(val).trim();
    if (str.startsWith('draft-')) return true;
    if (teamIdSet && teamIdSet.has(str)) return true;
    if (projectIdSet && projectIdSet.has(str)) return true;
    if (str.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(str) && !str.includes(' ') && !str.includes('.')) return true;
    return false;
  }, [teamIdSet, projectIdSet]);

  const teamItems = useMemo(() => {
    if (propTeamItems) return propTeamItems;
    return (teams || []).map((t: any) => {
      const code = t.teamCode || '';
      const name = t.name || '';
      const label = code ? `${code} - ${name}` : name;
      return {
        value: t.id,
        label,
        code,
        subLabel: t.blockCode ? `Khối: ${t.blockCode}` : (t.blockName ? `Khối: ${t.blockName}` : ''),
        searchString: `${code} ${name} ${t.blockCode || ''} ${t.blockName || ''} ${t.id}`.toLowerCase(),
        rawItem: t
      };
    });
  }, [propTeamItems, teams]);

  const projectItems = useMemo(() => {
    if (propProjectItems) return propProjectItems;
    return (projects || []).map((p: any) => {
      const code = p.projectCode || '';
      const name = p.name || '';
      const label = code ? `[${code}] ${name}` : name;
      return {
        value: p.id,
        label,
        code,
        subLabel: p.region ? `Khu vực: ${p.region}` : (p.type ? `Loại: ${p.type}` : ''),
        searchString: `${code} ${name} ${p.region || ''} ${p.type || ''} ${p.id}`.toLowerCase(),
        rawItem: p
      };
    });
  }, [propProjectItems, projects]);

  const handleUpdateEditField = (fieldKey: string, val: any) => {
    setLocalEditState((prev: any) => ({
      ...prev,
      [fieldKey]: val
    }));
  };

  const handleUpdateEditFields = (fieldsObj: Record<string, any>) => {
    setLocalEditState((prev: any) => ({
      ...prev,
      ...fieldsObj
    }));
  };

  // 1. EDITING MODE RENDER
  if (isEditing && localEditState) {
    const editComp = getRowComputed(localEditState);

    const currentEditTeam = (findTeam 
      ? (findTeam(localEditState.teamId) || findTeam(localEditState.teamCode) || findTeam(localEditState.teamName))
      : null) || (teams || []).find((t: any) => 
          t.id === localEditState.teamId || 
          t.id === localEditState.teamCode || 
          t.id === localEditState.teamName ||
          (localEditState.teamCode && t.teamCode === localEditState.teamCode) || 
          (localEditState.teamName && t.name === localEditState.teamName)
        );
    const currentEditTeamId = currentEditTeam?.id || localEditState.teamId || '';

    const currentEditProj = (findProject
      ? (findProject(localEditState.projectId) || findProject(localEditState.projectName) || findProject(localEditState.projectCode))
      : null) || (projects || []).find((p: any) => 
          p.id === localEditState.projectId || 
          p.id === localEditState.projectName || 
          p.id === localEditState.projectCode ||
          (localEditState.projectName && p.name === localEditState.projectName) || 
          (localEditState.projectCode && p.projectCode === localEditState.projectCode)
        );
    const currentEditProjId = currentEditProj?.id || localEditState.projectId || '';

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
          onChange={(e) => handleCostInputChange(e.target.value, (v) => handleUpdateEditField(fieldKey, v))}
          className="h-7 text-right font-mono text-[11px] font-bold pr-5 border-indigo-200 focus:border-indigo-500 rounded bg-white"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onOpenCalculator(fieldKey, fieldLabel, val || '', (v) => handleUpdateEditField(fieldKey, v))}
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
            value={localEditState.month || 'Kì 1 - Tháng 8'}
            onValueChange={(val) => handleUpdateEditField('month', val)}
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
        <TableCell className="p-1 min-w-[140px]">
          <AcceptanceSearchableSelect
            value={currentEditTeamId}
            items={teamItems}
            placeholder="Chọn Team"
            searchPlaceholder="Tìm kiếm Team, mã Team..."
            triggerClassName="h-7 text-[11px] font-bold border-indigo-200 bg-white rounded"
            triggerDisplay={
              currentEditTeam ? (
                <span className="truncate text-slate-800 font-bold">
                  {currentEditTeam.teamCode ? `${currentEditTeam.teamCode} - ${currentEditTeam.name}` : currentEditTeam.name}
                </span>
              ) : undefined
            }
            onValueChange={(teamId, rawTm) => {
              const tm = rawTm || (teams || []).find((t: any) => t.id === teamId) || (findTeam ? findTeam(teamId) : null);
              if (tm) {
                const tmName = tm.name || '';
                const code = tm.teamCode || '';
                let gdkd = tmName;
                if (code && tmName.startsWith(code)) {
                  gdkd = tmName.substring(code.length).trim();
                }
                handleUpdateEditFields({
                  teamId: tm.id,
                  teamCode: tm.teamCode || tm.name || '',
                  teamName: tm.name || tm.teamCode || '',
                  blockId: tm.blockId || '',
                  blockCode: tm.blockCode || '',
                  gdkdName: (!localEditState.gdkdName || localEditState.gdkdName === '-') ? gdkd : localEditState.gdkdName
                });
              } else {
                handleUpdateEditField('teamId', teamId);
              }
            }}
          />
        </TableCell>

        {/* Col C: GĐKD */}
        <TableCell className="p-1 min-w-[120px]">
          <Input
            value={localEditState.gdkdName || ''}
            onChange={(e) => handleUpdateEditField('gdkdName', e.target.value)}
            className="h-7 text-xs font-semibold border-indigo-200 rounded bg-white"
          />
        </TableCell>

        {/* Col D: NGƯỜI PHỤ TRÁCH */}
        <TableCell className="p-1 min-w-[110px]">
          <Input
            value={localEditState.implementerName || ''}
            onChange={(e) => handleUpdateEditField('implementerName', e.target.value)}
            className="h-7 text-xs font-semibold border-indigo-200 rounded bg-white"
          />
        </TableCell>

        {/* Col E: DỰ ÁN */}
        <TableCell className="p-1 min-w-[180px]">
          <AcceptanceSearchableSelect
            value={currentEditProjId}
            items={projectItems}
            placeholder="Chọn Dự án"
            searchPlaceholder="Tìm kiếm dự án, mã dự án..."
            triggerClassName="h-7 text-[11px] font-bold border-indigo-200 bg-white rounded"
            triggerDisplay={
              currentEditProj ? (
                <span className="truncate text-slate-800 font-bold">
                  {currentEditProj.projectCode ? `[${currentEditProj.projectCode}] ${currentEditProj.name}` : currentEditProj.name}
                </span>
              ) : undefined
            }
            onValueChange={(projectId, rawP) => {
              const p = rawP || (projects || []).find((pr: any) => pr.id === projectId) || (findProject ? findProject(projectId) : null);
              if (p) {
                handleUpdateEditFields({
                  projectId: p.id,
                  projectName: p.name || '',
                  projectCode: p.projectCode || ''
                });
              } else {
                handleUpdateEditField('projectId', projectId);
              }
            }}
          />
        </TableCell>

        {/* Group 1: DIGITAL */}
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalFb', 'Digital FB', localEditState.digitalFb)}</TableCell>
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalZalo', 'Digital Zalo', localEditState.digitalZalo)}</TableCell>
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalTiktok', 'Digital Tiktok', localEditState.digitalTiktok)}</TableCell>
        <TableCell className="p-1 bg-sky-50/40">{renderEditInput('digitalKhac', 'Digital Khác', localEditState.digitalKhac)}</TableCell>

        {/* Col J: TỔNG DIGITAL CHƯA VAT */}
        <TableCell className="p-1 text-right font-mono text-[11px] font-bold text-sky-950 bg-sky-100/50">
          {formatCurrency(editComp.dTotalChuaVat).replace(' đ', '')}
        </TableCell>

        {/* Col K: DIGITAL CHẠY (SAU VAT) */}
        <TableCell className="p-1 text-right font-mono text-[11px] font-black text-sky-900 bg-sky-200/50">
          {formatCurrency(editComp.dTotalSauVat).replace(' đ', '')}
        </TableCell>

        {/* Group 2: VISA CÔNG TY */}
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaFb', 'Visa FB', localEditState.visaFb)}</TableCell>
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaZalo', 'Visa Zalo', localEditState.visaZalo)}</TableCell>
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaTiktok', 'Visa Tiktok', localEditState.visaTiktok)}</TableCell>
        <TableCell className="p-1 bg-emerald-50/40">{renderEditInput('visaDangTin', 'Visa Đăng Tin', localEditState.visaDangTin)}</TableCell>

        {/* Col P: TỔNG VISA CHƯA VAT */}
        <TableCell className="p-1 text-right font-mono text-[11px] font-bold text-emerald-950 bg-emerald-100/50">
          {formatCurrency(editComp.vTotalChuaVat).replace(' đ', '')}
        </TableCell>

        {/* Col Q: THẺ VISA CÔNG TY (SAU VAT) */}
        <TableCell className="p-1 text-right font-mono text-[11px] font-black text-indigo-900 bg-indigo-100/50">
          {formatCurrency(editComp.vTotalSauVat).replace(' đ', '')}
        </TableCell>

        {/* Group 3: ĐĂNG TIN CÔNG TY */}
        <TableCell className="p-1 bg-indigo-50/40">{renderEditInput('dangTinCtyChuaVat', 'Đăng tin CTY chưa VAT', localEditState.dangTinCtyChuaVat)}</TableCell>
        <TableCell className="p-1 text-right font-mono text-[11px] font-black text-indigo-950 bg-indigo-100/60">
          {formatCurrency(editComp.dtCtySauVat).replace(' đ', '')}
        </TableCell>

        {/* Group 4: CÁ NHÂN */}
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanFb', 'Cá nhân FB', localEditState.caNhanFb)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanDangTin', 'Cá nhân Đăng tin', localEditState.caNhanDangTin)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanZalo', 'Cá nhân Zalo', localEditState.caNhanZalo)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanGoogle', 'Cá nhân Google', localEditState.caNhanGoogle)}</TableCell>
        <TableCell className="p-1 bg-amber-50/40">{renderEditInput('caNhanTiktok', 'Cá nhân Tiktok', localEditState.caNhanTiktok)}</TableCell>

        {/* Col Y: CÁ NHÂN TỔNG */}
        <TableCell className="p-1 text-right font-mono text-[11px] font-extrabold text-amber-950 bg-amber-100/60">
          {formatCurrency(editComp.cnTotal).replace(' đ', '')}
        </TableCell>

        {/* Cột: CÁ NHÂN NẠP TIỀN QUA CÔNG TY */}
        <TableCell className="p-1 bg-violet-50/40">{renderEditInput('caNhanNapTienQuaCty', 'Cá nhân nạp tiền qua CTY', localEditState.caNhanNapTienQuaCty)}</TableCell>

        {/* Col Z: TỔNG */}
        <TableCell className="p-1 text-right font-mono text-xs font-black text-rose-900 bg-rose-100/70">
          {formatCurrency(editComp.grandTotal).replace(' đ', '')}
        </TableCell>

        {/* Col AA: SỐ LEAD */}
        <TableCell className="p-1 bg-cyan-50/40">{renderEditInput('caNhanNopTien', 'Số Lead', localEditState.caNhanNopTien)}</TableCell>

        {/* Col AB: TRẠNG THÁI */}
        <TableCell className="p-1 min-w-[100px]">
          <Select
            value={localEditState.status || 'Đã nghiệm thu'}
            onValueChange={(val) => handleUpdateEditField('status', val)}
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
            value={localEditState.notes || ''}
            placeholder="Ghi chú..."
            onChange={(e) => handleUpdateEditField('notes', e.target.value)}
            className="h-7 text-xs font-medium border-yellow-200 rounded bg-white"
          />
        </TableCell>

        {/* THAO TÁC */}
        <TableCell className="p-1 text-center sticky right-0 z-20 bg-indigo-100 shadow-l">
          <div className="flex items-center justify-center gap-1">
            <Button
              size="sm"
              disabled={isSaving}
              onClick={handleSave}
              className="h-7 px-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-[10px] rounded flex items-center gap-1 shadow-sm transition-all"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Lưu...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" /> Lưu
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={isSaving}
              onClick={onCancelEdit}
              className="h-7 px-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50 rounded text-[10px]"
            >
              Hủy
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // 2. NORMAL READ-ONLY ROW
  const comp = getRowComputed(item);

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
    matchedProject?.projectCode || 
    '-';

  const displayProjectCode = matchedProject?.projectCode || 
    (!isRawId(rawProjectCode) && rawProjectCode ? rawProjectCode : '') || 
    '';

  return (
    <TableRow
      className={`hover:bg-indigo-50/25 transition-colors group ${
        isSelected ? 'bg-indigo-50/60' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
      }`}
    >
      {/* STT / Select */}
      <TableCell className="text-center font-medium text-xs text-slate-500 sticky left-0 z-10 bg-inherit shadow-r">
        <div className="flex items-center justify-center gap-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onSelectRow(item.id, e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
          />
          <span className="font-mono text-slate-400 font-semibold">{index + 1}</span>
        </div>
      </TableCell>

      {/* Col A: THÁNG */}
      <TableCell className="font-bold text-xs text-slate-800 whitespace-nowrap">
        <Badge variant="outline" className="bg-slate-100/80 text-slate-700 border-slate-200 font-bold text-[11px] px-1.5 py-0.5">
          {item.month || '-'}
        </Badge>
      </TableCell>

      {/* Col B: MÃ TEAM */}
      <TableCell className="font-mono font-bold text-xs text-indigo-700 whitespace-nowrap">
        <Badge variant="outline" className="bg-indigo-50/70 text-indigo-700 border-indigo-200 font-mono font-extrabold text-[11px] px-1.5 py-0.5" title={displayTeamName}>
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

      {/* Cột: CÁ NHÂN NẠP TIỀN QUA CÔNG TY */}
      <TableCell className="text-right font-mono text-xs font-bold text-violet-950 bg-violet-50/30">
        {renderBreakdownTooltip(comp.cnNapTienCty, item.costBreakdowns?.caNhanNapTienQuaCty || item.costBreakdowns?.caNhanNapTienCty, 'Cá nhân nạp qua Cty')}
      </TableCell>

      {/* Col Z: TỔNG (K + Q + S + Y + CÁ NHÂN NẠP TIỀN QUA CÔNG TY) */}
      <TableCell className="text-right font-mono text-xs font-black text-rose-900 bg-rose-100/60">
        {formatCurrency(comp.grandTotal).replace(' đ', '')}
      </TableCell>

      {/* Col AA: SỐ LEAD */}
      <TableCell className="text-right font-mono text-xs font-bold text-cyan-950 bg-cyan-50/30">
        {(comp.cnNopTien || 0).toLocaleString('vi-VN')}
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
