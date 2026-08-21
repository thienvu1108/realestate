import React from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Save, Trash2 } from 'lucide-react';
import { getRowComputed, handleCostInputChange } from './acceptanceUtils';

interface DraftRowProps {
  draftRow: any;
  index: number;
  teams: any[];
  projects: any[];
  blocks: any[];
  monthsList: string[];
  findTeam?: (idOrCodeOrName: string) => any;
  findProject?: (idOrCodeOrName: string) => any;
  formatCurrency: (amount: number) => string;
  onUpdateField: (field: string, value: any) => void;
  onUpdateFields?: (fields: Record<string, any>) => void;
  onSaveDraft: (draftRow: any) => void;
  onRemoveDraft: (id: string) => void;
  onOpenCalculator: (fieldKey: string, fieldVNName: string, currentVal: string, onUpdate: (val: string) => void) => void;
}

export const AcceptanceDraftRow: React.FC<DraftRowProps> = React.memo(({
  draftRow,
  index,
  teams,
  projects,
  blocks,
  monthsList,
  findTeam,
  findProject,
  formatCurrency,
  onUpdateField,
  onUpdateFields,
  onSaveDraft,
  onRemoveDraft,
  onOpenCalculator
}) => {
  const comp = getRowComputed(draftRow);

  const selectedTeam = (findTeam
    ? (findTeam(draftRow.teamId) || findTeam(draftRow.teamCode) || findTeam(draftRow.teamName))
    : null) || (teams || []).find((t: any) => 
        t.id === draftRow.teamId || 
        (draftRow.teamCode && t.teamCode === draftRow.teamCode) || 
        (draftRow.teamName && t.name === draftRow.teamName) ||
        t.id === draftRow.teamCode
      );
  const currentDraftTeamId = selectedTeam?.id || draftRow.teamId || '';

  const selectedProj = (findProject
    ? (findProject(draftRow.projectId) || findProject(draftRow.projectName) || findProject(draftRow.projectCode))
    : null) || (projects || []).find((p: any) => 
        p.id === draftRow.projectId || 
        (draftRow.projectName && p.name === draftRow.projectName) || 
        (draftRow.projectName && p.projectCode === draftRow.projectName) ||
        p.id === draftRow.projectName
      );
  const currentDraftProjId = selectedProj?.id || draftRow.projectId || '';

  const renderCalcInput = (
    fieldKey: string,
    fieldLabel: string,
    value: string,
    placeholder: string = '0',
    className: string = ''
  ) => {
    return (
      <div className="relative group flex items-center min-w-[80px]">
        <Input
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => handleCostInputChange(e.target.value, (val) => onUpdateField(fieldKey, val))}
          className={`h-7 text-right font-mono text-[11px] font-bold pr-5 border-slate-200 focus:border-indigo-500 rounded bg-white ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onOpenCalculator(fieldKey, fieldLabel, value || '', (val) => onUpdateField(fieldKey, val))}
          className="absolute right-1 text-slate-400 hover:text-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity"
          title={`Mở máy tính cộng dồn (${fieldLabel})`}
        >
          <Calculator className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <TableRow className="bg-amber-50/50 hover:bg-amber-50/80 border-b-2 border-amber-300 transition-colors">
      {/* STT */}
      <TableCell className="text-center font-bold text-xs text-amber-700 bg-amber-100/60 sticky left-0 z-10">
        <div className="flex items-center justify-center gap-1">
          <span className="text-[10px] font-mono font-black">+{index + 1}</span>
        </div>
      </TableCell>

      {/* Col A: THÁNG */}
      <TableCell className="p-1 min-w-[110px]">
        <Select
          value={draftRow.month || 'Kì 1 - Tháng 8'}
          onValueChange={(val) => onUpdateField('month', val)}
        >
          <SelectTrigger className="h-7 text-[11px] font-bold border-slate-200 bg-white rounded">
            <SelectValue placeholder="Chọn tháng" />
          </SelectTrigger>
          <SelectContent className="max-h-56">
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
          value={currentDraftTeamId}
          onValueChange={(teamId) => {
            const tm = (teams || []).find((t: any) => t.id === teamId) || (findTeam ? findTeam(teamId) : null);
            if (tm) {
              const tmName = tm.name || '';
              const code = tm.teamCode || '';
              let gdkd = tmName;
              if (code && tmName.startsWith(code)) {
                gdkd = tmName.substring(code.length).trim();
              }
              if (onUpdateFields) {
                onUpdateFields({
                  teamId: tm.id,
                  teamCode: tm.teamCode || tm.name || '',
                  teamName: tm.name || tm.teamCode || '',
                  blockId: tm.blockId || '',
                  blockCode: tm.blockCode || '',
                  gdkdName: gdkd
                });
              } else {
                onUpdateField('teamId', tm.id);
                onUpdateField('teamCode', tm.teamCode || tm.name || '');
                onUpdateField('teamName', tm.name || tm.teamCode || '');
                onUpdateField('blockId', tm.blockId || '');
                onUpdateField('blockCode', tm.blockCode || '');
                onUpdateField('gdkdName', gdkd);
              }
            } else {
              onUpdateField('teamId', teamId);
            }
          }}
        >
          <SelectTrigger className="h-7 text-[11px] font-bold border-slate-200 bg-white rounded">
            <SelectValue placeholder="Chọn Team">
              {selectedTeam 
                ? (selectedTeam.teamCode ? `${selectedTeam.teamCode} - ${selectedTeam.name}` : selectedTeam.name)
                : (draftRow.teamName || draftRow.teamCode || undefined)}
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
          value={draftRow.gdkdName || ''}
          placeholder="GĐKD"
          onChange={(e) => onUpdateField('gdkdName', e.target.value)}
          className="h-7 text-xs font-semibold border-slate-200 rounded bg-white"
        />
      </TableCell>

      {/* Col D: NGƯỜI PHỤ TRÁCH */}
      <TableCell className="p-1 min-w-[110px]">
        <Input
          value={draftRow.implementerName || ''}
          placeholder="Phụ trách"
          onChange={(e) => onUpdateField('implementerName', e.target.value)}
          className="h-7 text-xs font-semibold border-slate-200 rounded bg-white"
        />
      </TableCell>

      {/* Col E: DỰ ÁN */}
      <TableCell className="p-1 min-w-[170px]">
        <Select
          value={currentDraftProjId}
          onValueChange={(projectId) => {
            const p = (projects || []).find((pr: any) => pr.id === projectId) || (findProject ? findProject(projectId) : null);
            if (p) {
              if (onUpdateFields) {
                onUpdateFields({
                  projectId: p.id,
                  projectName: p.name || '',
                  projectCode: p.projectCode || ''
                });
              } else {
                onUpdateField('projectId', p.id);
                onUpdateField('projectName', p.name || '');
                onUpdateField('projectCode', p.projectCode || '');
              }
            } else {
              onUpdateField('projectId', projectId);
            }
          }}
        >
          <SelectTrigger className="h-7 text-[11px] font-bold border-slate-200 bg-white rounded">
            <SelectValue placeholder="Chọn Dự án">
              {selectedProj 
                ? (selectedProj.projectCode ? `[${selectedProj.projectCode}] ${selectedProj.name}` : selectedProj.name)
                : (draftRow.projectName || undefined)}
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

      {/* Group 1: DIGITAL CHẠY (Chưa VAT) */}
      <TableCell className="p-1 bg-sky-50/30">
        {renderCalcInput('digitalFb', 'Digital FB', draftRow.digitalFb)}
      </TableCell>
      <TableCell className="p-1 bg-sky-50/30">
        {renderCalcInput('digitalZalo', 'Digital Zalo', draftRow.digitalZalo)}
      </TableCell>
      <TableCell className="p-1 bg-sky-50/30">
        {renderCalcInput('digitalTiktok', 'Digital Tiktok', draftRow.digitalTiktok)}
      </TableCell>
      <TableCell className="p-1 bg-sky-50/30">
        {renderCalcInput('digitalKhac', 'Digital Khác', draftRow.digitalKhac)}
      </TableCell>
      {/* Col J: TỔNG DIGITAL CHƯA VAT */}
      <TableCell className="p-1 text-right font-mono text-[11px] font-bold text-sky-950 bg-sky-100/50">
        {formatCurrency(comp.dTotalChuaVat).replace(' đ', '')}
      </TableCell>
      {/* Col K: DIGITAL CHẠY (SAU VAT) */}
      <TableCell className="p-1 text-right font-mono text-[11px] font-black text-sky-900 bg-sky-200/50">
        {formatCurrency(comp.dTotalSauVat).replace(' đ', '')}
      </TableCell>

      {/* Group 2: THẺ VISA CÔNG TY (Chưa VAT) */}
      <TableCell className="p-1 bg-emerald-50/30">
        {renderCalcInput('visaFb', 'Visa FB', draftRow.visaFb)}
      </TableCell>
      <TableCell className="p-1 bg-emerald-50/30">
        {renderCalcInput('visaZalo', 'Visa Zalo', draftRow.visaZalo)}
      </TableCell>
      <TableCell className="p-1 bg-emerald-50/30">
        {renderCalcInput('visaTiktok', 'Visa Tiktok', draftRow.visaTiktok)}
      </TableCell>
      <TableCell className="p-1 bg-emerald-50/30">
        {renderCalcInput('visaDangTin', 'Visa Đăng Tin', draftRow.visaDangTin)}
      </TableCell>
      {/* Col P: TỔNG VISA CHƯA VAT */}
      <TableCell className="p-1 text-right font-mono text-[11px] font-bold text-emerald-950 bg-emerald-100/50">
        {formatCurrency(comp.vTotalChuaVat).replace(' đ', '')}
      </TableCell>
      {/* Col Q: THẺ VISA CÔNG TY (SAU VAT) */}
      <TableCell className="p-1 text-right font-mono text-[11px] font-black text-indigo-900 bg-indigo-100/50">
        {formatCurrency(comp.vTotalSauVat).replace(' đ', '')}
      </TableCell>

      {/* Group 3: ĐĂNG TIN CÔNG TY */}
      <TableCell className="p-1 bg-indigo-50/30">
        {renderCalcInput('dangTinCtyChuaVat', 'Đăng tin CTY chưa VAT', draftRow.dangTinCtyChuaVat)}
      </TableCell>
      {/* Col S: ĐĂNG TIN CÔNG TY (SAU VAT 8%) */}
      <TableCell className="p-1 text-right font-mono text-[11px] font-black text-indigo-950 bg-indigo-100/60">
        {formatCurrency(comp.dtCtySauVat).replace(' đ', '')}
      </TableCell>

      {/* Group 4: CÁ NHÂN CHẠY NGOÀI */}
      <TableCell className="p-1 bg-amber-50/30">
        {renderCalcInput('caNhanFb', 'Cá nhân FB', draftRow.caNhanFb)}
      </TableCell>
      <TableCell className="p-1 bg-amber-50/30">
        {renderCalcInput('caNhanDangTin', 'Cá nhân Đăng tin', draftRow.caNhanDangTin)}
      </TableCell>
      <TableCell className="p-1 bg-amber-50/30">
        {renderCalcInput('caNhanZalo', 'Cá nhân Zalo', draftRow.caNhanZalo)}
      </TableCell>
      <TableCell className="p-1 bg-amber-50/30">
        {renderCalcInput('caNhanGoogle', 'Cá nhân Google', draftRow.caNhanGoogle)}
      </TableCell>
      <TableCell className="p-1 bg-amber-50/30">
        {renderCalcInput('caNhanTiktok', 'Cá nhân Tiktok', draftRow.caNhanTiktok)}
      </TableCell>
      {/* Col Y: CÁ NHÂN TỔNG */}
      <TableCell className="p-1 text-right font-mono text-[11px] font-extrabold text-amber-950 bg-amber-100/60">
        {formatCurrency(comp.cnTotal).replace(' đ', '')}
      </TableCell>

      {/* Col Z: TỔNG (K + Q + S + Y) */}
      <TableCell className="p-1 text-right font-mono text-xs font-black text-rose-900 bg-rose-100/70">
        {formatCurrency(comp.grandTotal).replace(' đ', '')}
      </TableCell>

      {/* Col AA: SỐ LEAD */}
      <TableCell className="p-1 bg-cyan-50/40">
        {renderCalcInput('caNhanNopTien', 'Số Lead', draftRow.caNhanNopTien)}
      </TableCell>

      {/* Col AB: TRẠNG THÁI */}
      <TableCell className="p-1 bg-yellow-50/40 min-w-[100px]">
        <Select
          value={draftRow.status || 'Đã nghiệm thu'}
          onValueChange={(val) => onUpdateField('status', val)}
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
      <TableCell className="p-1 bg-yellow-50/40 min-w-[120px]">
        <Input
          value={draftRow.notes || ''}
          placeholder="Ghi chú..."
          onChange={(e) => onUpdateField('notes', e.target.value)}
          className="h-7 text-xs font-medium border-yellow-200 rounded bg-white"
        />
      </TableCell>

      {/* THAO TÁC */}
      <TableCell className="p-1 text-center sticky right-0 z-20 bg-amber-50 shadow-l">
        <div className="flex items-center justify-center gap-1">
          <Button
            size="sm"
            onClick={() => onSaveDraft(draftRow)}
            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded flex items-center gap-1 shadow-sm"
          >
            <Save className="w-3 h-3" /> Lưu
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onRemoveDraft(draftRow.id)}
            className="h-7 px-2 text-rose-600 hover:bg-rose-100 rounded text-[10px]"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});
