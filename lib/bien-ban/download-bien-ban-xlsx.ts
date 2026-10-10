import { getTodayISODate } from '@/lib/utils';
import {
  O_CHON,
  O_TRONG,
  QUOC_HIEU,
  TIEU_NGU,
  luaChonText,
  runsText,
  type BienBanCotBang,
  type BienBanModel,
} from './bien-ban-model';

/**
 * Dàn phẳng biên bản thành từng dòng văn bản (đối chiếu nội dung trong test).
 * Bảng dàn thành từng dòng, ô nối bằng ` | `. File Excel thật đi qua
 * `bienBanToSheet` — ô bảng nằm đúng cột.
 */
export function bienBanToRows(model: BienBanModel): string[] {
  const rows: string[] = [];
  for (const b of model.blocks) {
    switch (b.kind) {
      case 'quoc-hieu':
        rows.push(QUOC_HIEU, TIEU_NGU, '');
        break;
      case 'tieu-de':
        rows.push(...b.lines.map((l) => l.text), '');
        break;
      case 'doan':
        rows.push(runsText(b.runs));
        break;
      case 'lua-chon': {
        const opts = b.options.map((o) => `${o.checked ? O_CHON : O_TRONG} ${luaChonText(o)}`);
        if (b.layout === 'inline') rows.push(`${runsText(b.label)} ${opts.join('   ')}`);
        else if (b.layout === 'luoi') {
          rows.push(runsText(b.label));
          for (let i = 0; i < opts.length; i += 2) rows.push(`    ${opts.slice(i, i + 2).join('   ')}`);
        } else rows.push(runsText(b.label), ...opts.map((o) => `    ${o}`));
        break;
      }
      case 'chu-ky':
        rows.push('');
        if (b.diaDanhNgay) rows.push(b.diaDanhNgay);
        if (b.nhomDau) rows.push(b.nhomDau.text);
        rows.push(b.cols.map((c) => `${c.title.replace(/\n/g, ' ')} ${c.note}`).join('   |   '));
        {
          const names = b.cols.map((c) => c.hoTen?.trim() ?? '');
          if (names.some(Boolean)) rows.push(names.join('   |   '));
        }
        break;
      case 'bang':
        rows.push(b.cols.map((c) => c.title).join(' | '));
        for (const r of b.rows) rows.push(r.join(' | '));
        if (b.footer) rows.push(b.footer.cells.join(' | '));
        rows.push('');
        break;
      case 'ngat-trang':
        rows.push('');
        break;
      default:
        break;
    }
  }
  return rows;
}

/** Bề rộng (ký tự) cả trang khi chia cột Excel theo `widthPct` của bảng. */
const XLSX_TONG_RONG = 150;

export interface BienBanSheet {
  /** Mỗi dòng một hàng Excel; ô của bảng nằm đúng cột của nó. */
  aoa: string[][];
  /** Độ rộng cột (ký tự) theo bảng rộng nhất — không có bảng ⇒ rỗng. */
  colWidths: number[];
}

/**
 * Dàn biên bản thành bảng tính: văn bản ở cột A, khối `bang` mỗi ô một cột
 * (dòng tổng gộp `span` cột đầu ⇒ để trống các cột bị gộp), khối ký rải
 * đều theo bề ngang bảng. Danh sách nhiều cột mở ra dùng tiếp được.
 */
export function bienBanToSheet(model: BienBanModel): BienBanSheet {
  const bangRongNhat = model.blocks.reduce<BienBanCotBang[]>(
    (acc, b) => (b.kind === 'bang' && b.cols.length > acc.length ? b.cols : acc),
    [],
  );
  const soCot = Math.max(1, bangRongNhat.length);
  const aoa: string[][] = [];
  const dongTrai = (text: string) => aoa.push([text]);
  /** Ô `text` ở cột `col`, các cột trước để trống. */
  const dongTaiCot = (cells: { col: number; text: string }[]) => {
    const row: string[] = [];
    for (const c of cells) {
      while (row.length < c.col) row.push('');
      row[c.col] = c.text;
    }
    aoa.push(row);
  };

  for (const b of model.blocks) {
    switch (b.kind) {
      case 'bang': {
        aoa.push(b.cols.map((c) => c.title));
        for (const r of b.rows) aoa.push([...r]);
        if (b.footer) {
          const span = Math.max(1, b.footer.span ?? 1);
          const [dau, ...con] = b.footer.cells;
          aoa.push([dau ?? '', ...Array<string>(span - 1).fill(''), ...con]);
        }
        aoa.push([]);
        break;
      }
      case 'chu-ky': {
        aoa.push([]);
        if (b.diaDanhNgay) {
          dongTaiCot([{ col: Math.floor((soCot * 2) / 3), text: b.diaDanhNgay }]);
        }
        const n = Math.max(1, b.cols.length);
        const viTri = (i: number) => Math.floor(((i + 0.5) * soCot) / n - 0.5);
        const soDongTitle = Math.max(...b.cols.map((c) => c.title.split('\n').length));
        for (let d = 0; d < soDongTitle; d += 1) {
          dongTaiCot(b.cols.map((c, i) => ({ col: viTri(i), text: c.title.split('\n')[d] ?? '' })));
        }
        if (b.cols.some((c) => c.note)) {
          dongTaiCot(b.cols.map((c, i) => ({ col: viTri(i), text: c.note })));
        }
        aoa.push([], [], []);
        if (b.cols.some((c) => c.hoTen?.trim())) {
          dongTaiCot(b.cols.map((c, i) => ({ col: viTri(i), text: c.hoTen?.trim() ?? '' })));
        }
        break;
      }
      default:
        for (const line of bienBanToRows({ tieuDe: model.tieuDe, blocks: [b] })) dongTrai(line);
        break;
    }
  }

  const colWidths =
    bangRongNhat.length === 0
      ? []
      : doRongCotPct(bangRongNhat).map((pct) => Math.max(4, Math.round((pct * XLSX_TONG_RONG) / 100)));
  return { aoa, colWidths };
}

/** Độ rộng (%) — cột có `widthPct` giữ nguyên, phần còn lại chia đều. */
function doRongCotPct(cols: BienBanCotBang[]): number[] {
  const daDat = cols.reduce((sum, c) => sum + (c.widthPct ?? 0), 0);
  const conLai = cols.filter((c) => !c.widthPct).length;
  const deu = conLai > 0 ? Math.max(0, 100 - daDat) / conLai : 0;
  return cols.map((c) => c.widthPct ?? deu);
}

export async function downloadBienBanXlsx(model: BienBanModel, fileName: string): Promise<void> {
  const XLSX = await import('xlsx');
  const { aoa, colWidths } = bienBanToSheet(model);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (colWidths.length > 0) ws['!cols'] = colWidths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${fileName}_${getTodayISODate()}.xlsx`);
}
