import { exportToExcel } from '@/lib/utils';
import {
  O_CHON,
  O_TRONG,
  QUOC_HIEU,
  TIEU_NGU,
  luaChonText,
  runsText,
  type BienBanModel,
} from './bien-ban-model';

/**
 * Dàn phẳng biên bản thành từng dòng văn bản, mỗi dòng một hàng Excel.
 * Bảng (hiện vật…) dàn thành từng dòng, ô nối bằng ` | ` — file này để đối
 * chiếu / chép lại nội dung, không phải bảng tính.
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
        rows.push(b.cols.map((c) => `${c.title} ${c.note}`).join('   |   '));
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
      default:
        break;
    }
  }
  return rows;
}

export function downloadBienBanXlsx(model: BienBanModel, fileName: string): void {
  const col = model.tieuDe;
  exportToExcel(
    bienBanToRows(model).map((line) => ({ [col]: line })),
    fileName,
  );
}
