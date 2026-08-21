import { ComputedRowValues } from './acceptanceTypes';

// --- EXCEL-STYLE MATH MULTI-VALUE PARSER & CHANNELS AUDITOR ENGINE ---
export const parseCurrencyFormula = (input: string | number | undefined | null): { total: number; items: { amount: number; label: string }[]; displayString: string } => {
  if (input === undefined || input === null || input === '' || input === 0) {
    return { total: 0, items: [], displayString: '' };
  }
  
  if (typeof input === 'number') {
    if (isNaN(input) || input === 0) return { total: 0, items: [], displayString: '' };
    return {
      total: input,
      items: [{ amount: input, label: 'Khoản chi' }],
      displayString: input.toLocaleString('vi-VN') + ' đ'
    };
  }

  const str = String(input).trim();
  if (!str || str === '0') return { total: 0, items: [], displayString: '' };

  // Fast path for simple numeric strings without formula characters
  if (/^-?[\d.,\s]+$/.test(str)) {
    const num = parseFloat(str.replace(/[.,\s]/g, '')) || 0;
    return {
      total: num,
      items: [{ amount: num, label: 'Khoản chi' }],
      displayString: num ? num.toLocaleString('vi-VN') + ' đ' : ''
    };
  }

  const parts = str.split(/[+\n;]/);
  const items: { amount: number; label: string }[] = [];
  let total = 0;

  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (!trimmed) continue;

    const numRegex = /(-?[0-9.,]+)\s*([kKmM]?)/;
    const match = trimmed.match(numRegex);

    if (match) {
      const numStr = match[1].replace(/[.,]/g, '');
      let val = parseFloat(numStr) || 0;

      const unit = (match[2] || '').toLowerCase();
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

export const handleCostInputChange = (value: string, updateFn: (val: string) => void) => {
  const hasFormulaChar = /[+;\nKkMm()a-zA-Z]/.test(value) && !/^\d+$/.test(value.replace(/[.\s]/g, ''));
  if (hasFormulaChar) {
    updateFn(value);
  } else {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    updateFn(formatted);
  }
};

// Row calculation logic matching exact formula specification
export const getRowComputed = (row: any): ComputedRowValues => {
  if (!row) {
    return {
      dFb: 0, dZalo: 0, dTiktok: 0, dKhac: 0, dTotalChuaVat: 0, dTotalSauVat: 0,
      vFb: 0, vZalo: 0, vTiktok: 0, vDangTin: 0, vTotalChuaVat: 0, vTotalSauVat: 0,
      dtCtyChuaVat: 0, dtCtySauVat: 0,
      cnFb: 0, cnDangTin: 0, cnZalo: 0, cnGoogle: 0, cnTiktok: 0, cnTotal: 0,
      grandTotal: 0, cnNopTien: 0
    };
  }

  // Digital chạy (Chưa VAT)
  const dFb = parseCurrencyFormula(row.digitalFb ?? row.fbDigital ?? row.fbDigitalChuaVat).total;
  const dZalo = parseCurrencyFormula(row.digitalZalo).total;
  const dTiktok = parseCurrencyFormula(row.digitalTiktok).total;
  const dKhac = parseCurrencyFormula(row.digitalKhac).total;
  const dTotalChuaVat = dFb + dZalo + dTiktok + dKhac;
  // Cột K: Digital chạy sau VAT (Facebook, Tiktok, Khác 10%, Zalo 8%)
  const dTotalSauVat = Math.round(dFb * 1.10 + dZalo * 1.08 + dTiktok * 1.10 + dKhac * 1.10);

  // Thẻ visa công ty (Chưa VAT)
  const vFb = parseCurrencyFormula(row.visaFb ?? row.fbVisa ?? row.fbVisaCostChuaVat).total;
  const vZalo = parseCurrencyFormula(row.visaZalo).total;
  const vTiktok = parseCurrencyFormula(row.visaTiktok).total;
  const vDangTin = parseCurrencyFormula(row.visaDangTin).total;
  const vTotalChuaVat = vFb + vZalo + vTiktok + vDangTin;
  // Cột Q: Thẻ visa sau VAT (Facebook, Tiktok 10%, Zalo, Đăng tin 8%)
  const vTotalSauVat = Math.round(vFb * 1.10 + vZalo * 1.08 + vTiktok * 1.10 + vDangTin * 1.08);

  // Đăng tin công ty
  const dtCtyChuaVat = parseCurrencyFormula(row.dangTinCtyChuaVat ?? row.dangTinCongTy ?? row.dangTinCongTyChuaVat).total;
  // Cột S: Đăng tin sau VAT 8%
  const dtCtySauVat = Math.round(dtCtyChuaVat * 1.08);

  // Cá nhân chạy ngoài (Tất cả lấy số trước VAT)
  const cnFb = parseCurrencyFormula(row.caNhanFb ?? row.caNhan ?? row.caNhanCost ?? row.otherCost).total;
  const cnDangTin = parseCurrencyFormula(row.caNhanDangTin ?? row.dangTinCaNhanCost).total;
  const cnZalo = parseCurrencyFormula(row.caNhanZalo ?? row.zaloCost).total;
  const cnGoogle = parseCurrencyFormula(row.caNhanGoogle ?? row.googleCost).total;
  const cnTiktok = parseCurrencyFormula(row.caNhanTiktok ?? row.tiktokCost).total;
  // Cột Y: Cá nhân chạy ngoài tổng
  const cnTotal = cnFb + cnDangTin + cnZalo + cnGoogle + cnTiktok;

  // Cột Z: TỔNG = K + Q + S + Y
  const grandTotal = dTotalSauVat + vTotalSauVat + dtCtySauVat + cnTotal;

  // Cột AA: Số Lead
  const cnNopTien = parseCurrencyFormula(row.caNhanNopTien ?? row.personalPaidToCompany).total;

  return {
    dFb, dZalo, dTiktok, dKhac, dTotalChuaVat, dTotalSauVat,
    vFb, vZalo, vTiktok, vDangTin, vTotalChuaVat, vTotalSauVat,
    dtCtyChuaVat, dtCtySauVat,
    cnFb, cnDangTin, cnZalo, cnGoogle, cnTiktok, cnTotal,
    grandTotal,
    cnNopTien
  };
};

export const getSortValue = (item: any, key: string, teams: any[] = [], blocks: any[] = []) => {
  if (!item) return '';
  const comp = getRowComputed(item);
  switch (key) {
    case 'blockName': {
      const teamObj = (teams || []).find((t: any) => t.id === item.teamId || t.name === item.teamName || (item.teamCode && t.teamCode === item.teamCode));
      if (teamObj) {
        const blk = (blocks || []).find((b: any) => b.id === teamObj.blockId || b.blockCode === teamObj.blockCode);
        if (blk) return blk.name || blk.blockCode || '';
      }
      return item.blockName || item.blockCode || '';
    }
    case 'month': return item.month || '';
    case 'teamCode': return item.teamCode || '';
    case 'teamName': return item.teamName || '';
    case 'gdkdName': return item.gdkdName || '';
    case 'implementerName': return item.implementerName || '';
    case 'projectName': return item.projectName || '';
    
    // Group 1
    case 'digitalFb': return comp.dFb;
    case 'digitalZalo': return comp.dZalo;
    case 'digitalTiktok': return comp.dTiktok;
    case 'digitalKhac': return comp.dKhac;
    case 'digitalTotalChuaVat': return comp.dTotalChuaVat;
    case 'digitalTotalSauVat': return comp.dTotalSauVat;

    // Group 2
    case 'visaFb': return comp.vFb;
    case 'visaZalo': return comp.vZalo;
    case 'visaTiktok': return comp.vTiktok;
    case 'visaDangTin': return comp.vDangTin;
    case 'visaTotalChuaVat': return comp.vTotalChuaVat;
    case 'visaTotalSauVat': return comp.vTotalSauVat;

    // Group 3
    case 'dangTinCtyChuaVat': return comp.dtCtyChuaVat;
    case 'dangTinCtySauVat': return comp.dtCtySauVat;

    // Group 4
    case 'caNhanFb': return comp.cnFb;
    case 'caNhanDangTin': return comp.cnDangTin;
    case 'caNhanZalo': return comp.cnZalo;
    case 'caNhanGoogle': return comp.cnGoogle;
    case 'caNhanTiktok': return comp.cnTiktok;
    case 'caNhanTotal': return comp.cnTotal;

    // Group 5 & 6
    case 'grandTotal': return comp.grandTotal;
    case 'caNhanNopTien': return comp.cnNopTien;
    case 'status': return item.status || '';
    case 'notes': return item.notes || '';
    default: return item[key] !== undefined ? item[key] : '';
  }
};

export const buildCostBreakdownsOfRecord = (rowState: any) => {
  const fields = [
    'digitalFb', 'digitalZalo', 'digitalTiktok', 'digitalKhac',
    'visaFb', 'visaZalo', 'visaTiktok', 'visaDangTin',
    'dangTinCtyChuaVat',
    'caNhanFb', 'caNhanDangTin', 'caNhanZalo', 'caNhanGoogle', 'caNhanTiktok',
    'caNhanNopTien'
  ];
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
