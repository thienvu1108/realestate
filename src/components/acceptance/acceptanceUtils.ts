import { ComputedRowValues, ParsedFormulaResult } from './acceptanceTypes';

// Fast cache for formula parsing strings
const formulaCache = new Map<string, ParsedFormulaResult>();
const MAX_CACHE_SIZE = 1000;

export const parseCurrencyFormula = (input: any): ParsedFormulaResult => {
  if (input === undefined || input === null || input === '' || input === 0 || input === '0') {
    return { total: 0, items: [], displayString: '' };
  }

  if (typeof input === 'number') {
    if (isNaN(input)) return { total: 0, items: [], displayString: '' };
    return {
      total: input,
      items: [{ amount: input, label: 'Khoản chi' }],
      displayString: input.toLocaleString('vi-VN') + ' đ'
    };
  }

  const str = String(input).trim();
  if (!str || str === '0' || str === 'undefined' || str === 'null') {
    return { total: 0, items: [], displayString: '' };
  }

  if (formulaCache.has(str)) {
    return formulaCache.get(str)!;
  }

  // Fast path for simple numeric strings without formula characters
  if (/^-?[0-9.,\s]+$/.test(str)) {
    const cleanStr = str.replace(/[.,\s]/g, '');
    const num = cleanStr ? parseFloat(cleanStr) : 0;
    const res = {
      total: isNaN(num) ? 0 : num,
      items: [{ amount: isNaN(num) ? 0 : num, label: 'Khoản chi' }],
      displayString: num ? num.toLocaleString('vi-VN') + ' đ' : ''
    };
    if (formulaCache.size >= MAX_CACHE_SIZE) formulaCache.clear();
    formulaCache.set(str, res);
    return res;
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

  const res: ParsedFormulaResult = {
    total,
    items,
    displayString
  };

  if (formulaCache.size >= MAX_CACHE_SIZE) formulaCache.clear();
  formulaCache.set(str, res);
  return res;
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
      cnNapTienCty: 0,
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

  // Cột: Cá Nhân nạp tiền qua công ty (vị trí bên trái cột TỔNG và được cộng vào TỔNG)
  const cnNapTienCty = parseCurrencyFormula(row.caNhanNapTienQuaCty ?? row.caNhanNapTienCty ?? row.personalDepositViaCompany).total;

  // Cột Z: TỔNG = K + Q + S + Y + Cá nhân nạp tiền qua công ty
  const grandTotal = dTotalSauVat + vTotalSauVat + dtCtySauVat + cnTotal + cnNapTienCty;

  // Cột AA: Số Lead
  const cnNopTien = parseCurrencyFormula(row.caNhanNopTien ?? row.personalPaidToCompany).total;

  return {
    dFb, dZalo, dTiktok, dKhac, dTotalChuaVat, dTotalSauVat,
    vFb, vZalo, vTiktok, vDangTin, vTotalChuaVat, vTotalSauVat,
    dtCtyChuaVat, dtCtySauVat,
    cnFb, cnDangTin, cnZalo, cnGoogle, cnTiktok, cnTotal,
    cnNapTienCty,
    grandTotal,
    cnNopTien
  };
};

export const resolveBlockForTeam = (
  teamRef: any,
  blocks: any[] = [],
  teams: any[] = [],
  findTeam?: (ref: string) => any
): { block: any | null; blockName: string; blockCode: string; blockId: string } => {
  if (!teamRef) {
    return { block: null, blockName: '', blockCode: '', blockId: '' };
  }

  // 1. Locate team object
  let tm: any = null;
  if (typeof teamRef === 'object') {
    if (teamRef.id && (teamRef.name || teamRef.teamCode)) {
      tm = teamRef;
    } else {
      const tId = teamRef.teamId || teamRef.id;
      const tCode = (teamRef.teamCode || '').toLowerCase().trim();
      const tName = (teamRef.teamName || teamRef.name || '').toLowerCase().trim();

      if (findTeam) {
        tm = (tId && findTeam(tId)) || (tCode && findTeam(tCode)) || (tName && findTeam(tName)) || null;
      }
      if (!tm && teams && teams.length > 0) {
        tm = teams.find((t: any) => 
          (tId && (t.id === tId || t.teamCode === tId || t.name === tId)) ||
          (tCode && (t.teamCode?.toLowerCase().trim() === tCode || t.id?.toLowerCase().trim() === tCode)) ||
          (tName && (t.name?.toLowerCase().trim() === tName || t.id?.toLowerCase().trim() === tName))
        ) || null;
      }
    }
  } else if (typeof teamRef === 'string') {
    const s = teamRef.toLowerCase().trim();
    if (findTeam) tm = findTeam(s);
    if (!tm && teams && teams.length > 0) {
      tm = teams.find((t: any) => 
        t.id?.toLowerCase().trim() === s ||
        t.teamCode?.toLowerCase().trim() === s ||
        t.name?.toLowerCase().trim() === s
      ) || null;
    }
  }

  // 2. Direct block match on team or record
  const bId = tm?.blockId || (typeof teamRef === 'object' ? teamRef.blockId : '');
  const bCode = (tm?.blockCode || (typeof teamRef === 'object' ? teamRef.blockCode : '') || '').trim().toUpperCase();
  const bName = (tm?.blockName || (typeof teamRef === 'object' ? teamRef.blockName : '') || '').trim();

  let matchedBlock: any = null;

  if (bId) {
    matchedBlock = (blocks || []).find((b: any) => b.id === bId || b.blockCode?.toUpperCase() === String(bId).toUpperCase());
  }
  if (!matchedBlock && bCode) {
    matchedBlock = (blocks || []).find((b: any) => b.blockCode?.toUpperCase() === bCode || b.id === bCode);
  }
  if (!matchedBlock && bName) {
    matchedBlock = (blocks || []).find((b: any) => b.name?.toLowerCase() === bName.toLowerCase());
  }

  // 3. Match against block's configured teamPrefix / blockCode prefix
  if (!matchedBlock) {
    const teamCode = (tm?.teamCode || (typeof teamRef === 'object' ? teamRef.teamCode : '') || '').trim().toUpperCase();
    const teamName = (tm?.name || (typeof teamRef === 'object' ? teamRef.teamName : '') || '').trim();

    for (const blk of (blocks || [])) {
      if (!blk) continue;
      // Direct blockId/blockCode match
      if (tm?.blockId && (blk.id === tm.blockId || blk.blockCode === tm.blockId)) {
        matchedBlock = blk;
        break;
      }
      if (tm?.blockCode && (blk.blockCode === tm.blockCode || blk.id === tm.blockCode)) {
        matchedBlock = blk;
        break;
      }

      // Check configured teamPrefix or blockCode
      const rawPfx = blk.teamPrefix || blk.blockCode || '';
      if (rawPfx) {
        const prefixes = String(rawPfx)
          .split(/[,;/|\s]+/)
          .map(p => p.trim().toUpperCase())
          .map(p => p === 'MH' ? 'MAY' : p)
          .filter(Boolean);

        if (teamCode && prefixes.some(p => teamCode.startsWith(p))) {
          matchedBlock = blk;
          break;
        }
        if (teamName) {
          const normName = teamName.toUpperCase();
          if (prefixes.some(p => normName.startsWith(p))) {
            matchedBlock = blk;
            break;
          }
        }
      }
    }
  }

  if (matchedBlock) {
    const isId = /^[a-zA-Z0-9]{20}$/.test(matchedBlock.name || '');
    const displayName = (!matchedBlock.name || isId)
      ? (matchedBlock.blockCode ? `Khối ${matchedBlock.blockCode}` : 'Khối')
      : matchedBlock.name;

    return {
      block: matchedBlock,
      blockName: displayName,
      blockCode: matchedBlock.blockCode || '',
      blockId: matchedBlock.id || ''
    };
  }

  // Fallback if stored directly on item
  if (typeof teamRef === 'object' && (teamRef.blockName || teamRef.blockCode)) {
    return {
      block: null,
      blockName: teamRef.blockName || (teamRef.blockCode ? `Khối ${teamRef.blockCode}` : ''),
      blockCode: teamRef.blockCode || '',
      blockId: teamRef.blockId || ''
    };
  }

  return { block: null, blockName: '', blockCode: '', blockId: '' };
};

export const getSortValue = (item: any, key: string, teams: any[] = [], blocks: any[] = []) => {
  if (!item) return '';

  // Fast path for non-computed string/metadata fields to avoid expensive getRowComputed
  switch (key) {
    case 'month': return item.month || '';
    case 'blockName':
    case 'block': {
      const resolved = resolveBlockForTeam(item, blocks, teams);
      return resolved.blockName || item.blockName || item.blockCode || '';
    }
    case 'teamCode': return item.teamCode || '';
    case 'teamName': return item.teamName || '';
    case 'gdkdName': return item.gdkdName || '';
    case 'implementerName': return item.implementerName || '';
    case 'projectName': return item.projectName || '';
    case 'status': return item.status || '';
    case 'notes': return item.notes || '';
  }

  // Fast path for pre-stored numeric values
  if (typeof item[key] === 'number') return item[key];

  // Only calculate computed row values when strictly sorting by a computed column
  const comp = getRowComputed(item);
  switch (key) {
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

    // Cột: Cá Nhân nạp tiền qua công ty
    case 'caNhanNapTienQuaCty':
    case 'caNhanNapTienCty':
    case 'cnNapTienCty':
      return comp.cnNapTienCty;

    // Group 5 & 6
    case 'grandTotal': return comp.grandTotal;
    case 'caNhanNopTien': return comp.cnNopTien;
    default: return item[key] !== undefined ? item[key] : '';
  }
};

export const buildCostBreakdownsOfRecord = (rowState: any) => {
  const fields = [
    'digitalFb', 'digitalZalo', 'digitalTiktok', 'digitalKhac',
    'visaFb', 'visaZalo', 'visaTiktok', 'visaDangTin',
    'dangTinCtyChuaVat',
    'caNhanFb', 'caNhanDangTin', 'caNhanZalo', 'caNhanGoogle', 'caNhanTiktok',
    'caNhanNapTienQuaCty', 'caNhanNapTienCty',
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
