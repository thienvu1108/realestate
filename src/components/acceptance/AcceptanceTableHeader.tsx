import React from 'react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';

interface HeaderProps {
  sortConfig: { key: string | null; direction: 'asc' | 'desc' | null };
  onSort: (key: string) => void;
  selectedAcceptanceIds: string[];
  onSelectAll: (checked: boolean) => void;
  isAllSelected: boolean;
}

export const AcceptanceTableHeader: React.FC<HeaderProps> = ({
  sortConfig,
  onSort,
  selectedAcceptanceIds,
  onSelectAll,
  isAllSelected
}) => {
  const isSorted = (key: string) => sortConfig.key === key;
  const isAsc = (key: string) => sortConfig.key === key && sortConfig.direction === 'asc';

  const renderSortableCell = (
    key: string,
    label: React.ReactNode,
    className: string = '',
    rowSpan: number = 2,
    colSpan: number = 1
  ) => {
    return (
      <TableHead
        rowSpan={rowSpan}
        colSpan={colSpan}
        onClick={() => onSort(key)}
        className={`cursor-pointer hover:opacity-90 select-none border-b border-r transition-colors ${className}`}
      >
        <div className="flex items-center justify-between gap-1 w-full h-full">
          <div className="flex-1 text-center font-extrabold">{label}</div>
          <ArrowUpDown
            className={`w-3 h-3 shrink-0 transition-opacity ${
              isSorted(key) ? 'text-indigo-600 font-bold opacity-100' : 'text-slate-400 opacity-25 hover:opacity-100'
            }`}
          />
        </div>
      </TableHead>
    );
  };

  return (
    <TableHeader className="sticky top-0 z-20 bg-white shadow-sm border-b-2 border-slate-300 select-none">
      {/* Row 1: Group Headers & Master Columns */}
      <TableRow className="border-b border-slate-300">
        {/* STT & Multi-select */}
        <TableHead rowSpan={2} className="w-16 text-center font-black bg-slate-100 text-slate-800 border-r border-slate-300 px-2 py-2 text-[11px] sticky left-0 z-30">
          <div className="flex flex-col items-center justify-center gap-1">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              className="rounded border-slate-400 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer accent-indigo-600"
              title="Chọn tất cả"
            />
            <span className="text-[10px] font-bold">STT</span>
          </div>
        </TableHead>

        {/* Col A: THÁNG */}
        {renderSortableCell('month', 'THÁNG', 'w-28 bg-slate-100 text-slate-900 border-slate-300 text-[11px]')}

        {/* Col B: MÃ TEAM */}
        {renderSortableCell('teamCode', 'MÃ TEAM', 'w-24 bg-slate-100 text-slate-900 border-slate-300 text-[11px]')}

        {/* Col C: GĐKD */}
        {renderSortableCell('gdkdName', 'GĐKD', 'min-w-[130px] bg-slate-100 text-slate-900 border-slate-300 text-[11px]')}

        {/* Col D: NGƯỜI PHỤ TRÁCH */}
        {renderSortableCell('implementerName', 'NGƯỜI PHỤ TRÁCH', 'min-w-[120px] bg-slate-100 text-slate-900 border-slate-300 text-[11px]')}

        {/* Col E: DỰ ÁN */}
        {renderSortableCell('projectName', 'DỰ ÁN', 'min-w-[170px] bg-slate-100 text-slate-900 border-slate-300 text-[11px]')}

        {/* GROUP 1: DIGITAL CHẠY (Chưa VAT) - Col F, G, H, I, J */}
        <TableHead colSpan={5} className="text-center font-black uppercase bg-sky-100/90 text-sky-950 border-b border-r border-sky-300 py-1.5 text-[11px] tracking-wide">
          DIGITAL CHẠY (Chưa VAT)
        </TableHead>

        {/* Col K: DIGITAL CHẠY (SAU VAT) */}
        <TableHead rowSpan={2} onClick={() => onSort('digitalTotalSauVat')} className="cursor-pointer hover:bg-sky-300/80 text-center font-black uppercase bg-sky-200 text-sky-950 border-b border-r border-sky-300 px-2 py-1 min-w-[130px] text-[10px]">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 font-black">
              <span>DIGITAL CHẠY (SAU VAT)</span>
              <ArrowUpDown className="w-3 h-3 text-sky-800" />
            </div>
            <div className="text-[8px] font-semibold text-sky-800 tracking-tight lowercase">
              Zalo + Đăng tin 8% / Còn lại 10%
            </div>
          </div>
        </TableHead>

        {/* GROUP 2: THẺ VISA CÔNG TY (Chưa VAT) - Col L, M, N, O, P */}
        <TableHead colSpan={5} className="text-center font-black uppercase bg-emerald-50/90 text-emerald-950 border-b border-r border-emerald-300 py-1.5 text-[11px] tracking-wide">
          THẺ VISA CÔNG TY (Chưa VAT)
        </TableHead>

        {/* Col Q: THẺ VISA CÔNG TY (SAU VAT) */}
        <TableHead rowSpan={2} onClick={() => onSort('visaTotalSauVat')} className="cursor-pointer hover:bg-indigo-200 text-center font-black uppercase bg-indigo-100/90 text-indigo-950 border-b border-r border-indigo-300 px-2 py-1 min-w-[135px] text-[10px]">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center gap-1 font-black">
              <span>THẺ VISA CÔNG TY (SAU VAT)</span>
              <ArrowUpDown className="w-3 h-3 text-indigo-800" />
            </div>
            <div className="text-[8px] font-semibold text-indigo-800 tracking-tight lowercase">
              Zalo + Đăng tin 8% / Còn lại 10%
            </div>
          </div>
        </TableHead>

        {/* GROUP 3: ĐĂNG TIN CÔNG TY - Col R, S */}
        {renderSortableCell('dangTinCtyChuaVat', 'ĐĂNG TIN CÔNG TY (Chưa VAT)', 'bg-indigo-50/90 text-indigo-950 border-indigo-200 min-w-[115px] text-[10px]')}
        {renderSortableCell('dangTinCtySauVat', 'ĐĂNG TIN CÔNG TY (SAU VAT 8%)', 'bg-indigo-100 text-indigo-950 border-indigo-300 min-w-[120px] text-[10px]')}

        {/* GROUP 4: CÁ NHÂN CHẠY NGOÀI (TẤT CẢ LẤY SỐ TRƯỚC VAT) - Col T, U, V, W, X, Y */}
        <TableHead colSpan={6} className="text-center font-black uppercase bg-amber-100/90 text-amber-950 border-b border-r border-amber-300 py-1.5 text-[11px] tracking-wide">
          CÁ NHÂN CHẠY NGOÀI (TẤT CẢ LẤY SỐ TRƯỚC VAT)
        </TableHead>

        {/* Col Z: TỔNG (Pink / Light Red Highlight) */}
        <TableHead rowSpan={2} onClick={() => onSort('grandTotal')} className="cursor-pointer hover:bg-rose-200 text-center font-black uppercase bg-rose-100 text-rose-900 border-b border-r border-rose-300 px-3 py-1 min-w-[125px] text-xs">
          <div className="flex items-center justify-center gap-1 font-black">
            <span>TỔNG</span>
            <ArrowUpDown className="w-3.5 h-3.5 text-rose-700" />
          </div>
        </TableHead>

        {/* Col AA: CÁ NHÂN NỘP TIỀN QUA CÔNG TY */}
        {renderSortableCell('caNhanNopTien', 'CÁ NHÂN NỘP TIỀN QUA CÔNG TY', 'bg-cyan-100/90 text-cyan-950 border-cyan-300 min-w-[125px] text-[10px]')}

        {/* Col AB: TRẠNG THÁI */}
        {renderSortableCell('status', 'TRẠNG THÁI', 'bg-yellow-100/90 text-yellow-950 border-yellow-300 min-w-[105px] text-[10px]')}

        {/* Col AC: GHI CHÚ */}
        {renderSortableCell('notes', 'GHI CHÚ', 'bg-yellow-100/90 text-yellow-950 border-yellow-300 min-w-[140px] text-[10px]')}

        {/* THAO TÁC */}
        <TableHead rowSpan={2} className="w-32 text-center font-black uppercase sticky right-0 top-0 bg-slate-100 z-30 border-b border-slate-300 shadow-l text-[10px] text-slate-800">
          THAO TÁC
        </TableHead>
      </TableRow>

      {/* Row 2: Sub-column Headers */}
      <TableRow className="border-b-2 border-slate-300 text-[10px] font-bold">
        {/* Under Group 1: DIGITAL CHẠY (Chưa VAT) */}
        <TableHead onClick={() => onSort('digitalFb')} className="cursor-pointer text-right bg-sky-50 text-sky-900 border-r border-sky-200 min-w-[85px] py-1">FACEBOOK</TableHead>
        <TableHead onClick={() => onSort('digitalZalo')} className="cursor-pointer text-right bg-sky-50 text-sky-900 border-r border-sky-200 min-w-[85px] py-1">ZALO</TableHead>
        <TableHead onClick={() => onSort('digitalTiktok')} className="cursor-pointer text-right bg-sky-50 text-sky-900 border-r border-sky-200 min-w-[85px] py-1">TIKTOK</TableHead>
        <TableHead onClick={() => onSort('digitalKhac')} className="cursor-pointer text-right bg-sky-50 text-sky-900 border-r border-sky-200 min-w-[85px] py-1">KHÁC</TableHead>
        <TableHead onClick={() => onSort('digitalTotalChuaVat')} className="cursor-pointer text-right bg-sky-100/90 text-sky-950 font-extrabold border-r border-sky-300 min-w-[95px] py-1">TỔNG</TableHead>

        {/* Under Group 2: THẺ VISA CÔNG TY (Chưa VAT) */}
        <TableHead onClick={() => onSort('visaFb')} className="cursor-pointer text-right bg-emerald-50/60 text-emerald-900 border-r border-emerald-200 min-w-[85px] py-1">FACEBOOK</TableHead>
        <TableHead onClick={() => onSort('visaZalo')} className="cursor-pointer text-right bg-emerald-50/60 text-emerald-900 border-r border-emerald-200 min-w-[85px] py-1">ZALO</TableHead>
        <TableHead onClick={() => onSort('visaTiktok')} className="cursor-pointer text-right bg-emerald-50/60 text-emerald-900 border-r border-emerald-200 min-w-[85px] py-1">TIKTOK</TableHead>
        <TableHead onClick={() => onSort('visaDangTin')} className="cursor-pointer text-right bg-emerald-50/60 text-emerald-900 border-r border-emerald-200 min-w-[85px] py-1">ĐĂNG TIN</TableHead>
        <TableHead onClick={() => onSort('visaTotalChuaVat')} className="cursor-pointer text-right bg-emerald-100/80 text-emerald-950 font-extrabold border-r border-emerald-300 min-w-[95px] py-1">TỔNG</TableHead>

        {/* Under Group 4: CÁ NHÂN CHẠY NGOÀI */}
        <TableHead onClick={() => onSort('caNhanFb')} className="cursor-pointer text-right bg-amber-50/70 text-amber-900 border-r border-amber-200 min-w-[85px] py-1">FACEBOOK</TableHead>
        <TableHead onClick={() => onSort('caNhanDangTin')} className="cursor-pointer text-right bg-amber-50/70 text-amber-900 border-r border-amber-200 min-w-[85px] py-1">ĐĂNG TIN</TableHead>
        <TableHead onClick={() => onSort('caNhanZalo')} className="cursor-pointer text-right bg-amber-50/70 text-amber-900 border-r border-amber-200 min-w-[85px] py-1">ZALO</TableHead>
        <TableHead onClick={() => onSort('caNhanGoogle')} className="cursor-pointer text-right bg-amber-50/70 text-amber-900 border-r border-amber-200 min-w-[85px] py-1">GOOGLE</TableHead>
        <TableHead onClick={() => onSort('caNhanTiktok')} className="cursor-pointer text-right bg-amber-50/70 text-amber-900 border-r border-amber-200 min-w-[85px] py-1">TIKTOK</TableHead>
        <TableHead onClick={() => onSort('caNhanTotal')} className="cursor-pointer text-right bg-amber-100/90 text-amber-950 font-extrabold border-r border-amber-300 min-w-[95px] py-1">TỔNG</TableHead>
      </TableRow>
    </TableHeader>
  );
};
