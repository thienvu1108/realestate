import React from 'react';
import { TableFooter, TableRow, TableCell } from '@/components/ui/table';
import { getRowComputed } from './acceptanceUtils';

interface FooterProps {
  records: any[];
  formatCurrency: (amount: number) => string;
}

export const AcceptanceFooter: React.FC<FooterProps> = React.memo(({ records, formatCurrency }) => {
  const totals = React.useMemo(() => {
    return (records || []).reduce((acc, item) => {
      const comp = getRowComputed(item);
      return {
        dFb: acc.dFb + comp.dFb,
        dZalo: acc.dZalo + comp.dZalo,
        dTiktok: acc.dTiktok + comp.dTiktok,
        dKhac: acc.dKhac + comp.dKhac,
        dTotalChuaVat: acc.dTotalChuaVat + comp.dTotalChuaVat,
        dTotalSauVat: acc.dTotalSauVat + comp.dTotalSauVat,

        vFb: acc.vFb + comp.vFb,
        vZalo: acc.vZalo + comp.vZalo,
        vTiktok: acc.vTiktok + comp.vTiktok,
        vDangTin: acc.vDangTin + comp.vDangTin,
        vTotalChuaVat: acc.vTotalChuaVat + comp.vTotalChuaVat,
        vTotalSauVat: acc.vTotalSauVat + comp.vTotalSauVat,

        dtCtyChuaVat: acc.dtCtyChuaVat + comp.dtCtyChuaVat,
        dtCtySauVat: acc.dtCtySauVat + comp.dtCtySauVat,

        cnFb: acc.cnFb + comp.cnFb,
        cnDangTin: acc.cnDangTin + comp.cnDangTin,
        cnZalo: acc.cnZalo + comp.cnZalo,
        cnGoogle: acc.cnGoogle + comp.cnGoogle,
        cnTiktok: acc.cnTiktok + comp.cnTiktok,
        cnTotal: acc.cnTotal + comp.cnTotal,

        grandTotal: acc.grandTotal + comp.grandTotal,
        cnNopTien: acc.cnNopTien + comp.cnNopTien
      };
    }, {
      dFb: 0, dZalo: 0, dTiktok: 0, dKhac: 0, dTotalChuaVat: 0, dTotalSauVat: 0,
      vFb: 0, vZalo: 0, vTiktok: 0, vDangTin: 0, vTotalChuaVat: 0, vTotalSauVat: 0,
      dtCtyChuaVat: 0, dtCtySauVat: 0,
      cnFb: 0, cnDangTin: 0, cnZalo: 0, cnGoogle: 0, cnTiktok: 0, cnTotal: 0,
      grandTotal: 0, cnNopTien: 0
    });
  }, [records]);

  const fmt = (val: number) => formatCurrency(val).replace(' đ', '');

  return (
    <TableFooter className="bg-slate-100 font-black border-t-2 border-slate-300 z-10 sticky bottom-0">
      <TableRow className="border-t border-slate-300 text-[11px]">
        {/* Col STT + A..E */}
        <TableCell colSpan={6} className="text-right font-black text-slate-900 text-xs px-3 bg-slate-100 sticky left-0 z-20">
          TỔNG CỘNG ({records.length} dòng):
        </TableCell>

        {/* Group 1: DIGITAL CHẠY (Chưa VAT) */}
        <TableCell className="text-right font-mono text-xs font-bold text-sky-900 bg-sky-50/50">{fmt(totals.dFb)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-sky-900 bg-sky-50/50">{fmt(totals.dZalo)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-sky-900 bg-sky-50/50">{fmt(totals.dTiktok)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-sky-900 bg-sky-50/50">{fmt(totals.dKhac)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-black text-sky-950 bg-sky-100/70">{fmt(totals.dTotalChuaVat)}</TableCell>
        {/* Col K: DIGITAL CHẠY (SAU VAT) */}
        <TableCell className="text-right font-mono text-xs font-black text-sky-950 bg-sky-200/80">{fmt(totals.dTotalSauVat)}</TableCell>

        {/* Group 2: THẺ VISA CÔNG TY (Chưa VAT) */}
        <TableCell className="text-right font-mono text-xs font-bold text-emerald-900 bg-emerald-50/50">{fmt(totals.vFb)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-emerald-900 bg-emerald-50/50">{fmt(totals.vZalo)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-emerald-900 bg-emerald-50/50">{fmt(totals.vTiktok)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-emerald-900 bg-emerald-50/50">{fmt(totals.vDangTin)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-black text-emerald-950 bg-emerald-100/70">{fmt(totals.vTotalChuaVat)}</TableCell>
        {/* Col Q: THẺ VISA CÔNG TY (SAU VAT) */}
        <TableCell className="text-right font-mono text-xs font-black text-indigo-950 bg-indigo-100/80">{fmt(totals.vTotalSauVat)}</TableCell>

        {/* Group 3: ĐĂNG TIN CÔNG TY */}
        <TableCell className="text-right font-mono text-xs font-bold text-indigo-900 bg-indigo-50/50">{fmt(totals.dtCtyChuaVat)}</TableCell>
        {/* Col S: ĐĂNG TIN CÔNG TY (SAU VAT 8%) */}
        <TableCell className="text-right font-mono text-xs font-black text-indigo-950 bg-indigo-100/80">{fmt(totals.dtCtySauVat)}</TableCell>

        {/* Group 4: CÁ NHÂN CHẠY NGOÀI */}
        <TableCell className="text-right font-mono text-xs font-bold text-amber-900 bg-amber-50/50">{fmt(totals.cnFb)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-amber-900 bg-amber-50/50">{fmt(totals.cnDangTin)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-amber-900 bg-amber-50/50">{fmt(totals.cnZalo)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-amber-900 bg-amber-50/50">{fmt(totals.cnGoogle)}</TableCell>
        <TableCell className="text-right font-mono text-xs font-bold text-amber-900 bg-amber-50/50">{fmt(totals.cnTiktok)}</TableCell>
        {/* Col Y: CÁ NHÂN TỔNG */}
        <TableCell className="text-right font-mono text-xs font-black text-amber-950 bg-amber-100/80">{fmt(totals.cnTotal)}</TableCell>

        {/* Col Z: TỔNG (K + Q + S + Y) */}
        <TableCell className="text-right font-mono text-xs font-black text-rose-900 bg-rose-100">{fmt(totals.grandTotal)}</TableCell>

        {/* Col AA: SỐ LEAD */}
        <TableCell className="text-right font-mono text-xs font-black text-cyan-950 bg-cyan-100/70">{(totals.cnNopTien || 0).toLocaleString('vi-VN')}</TableCell>

        {/* Col AB, AC, Actions */}
        <TableCell colSpan={2} className="bg-slate-100"></TableCell>
        <TableCell className="sticky right-0 bg-slate-100 shadow-l"></TableCell>
      </TableRow>
    </TableFooter>
  );
});
