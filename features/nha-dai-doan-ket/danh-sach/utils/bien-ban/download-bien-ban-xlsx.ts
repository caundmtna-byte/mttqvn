import { exportToExcel } from '@/lib/utils';
import { O_CHON, O_TRONG, QUOC_HIEU, TIEU_NGU, runsText, type BienBanModel } from './bien-ban-model';

/**
 * Dàn phẳng biên bản thành từng dòng văn bản, mỗi dòng một hàng Excel.
 * Biên bản không có bảng số liệu — file này để đối chiếu / chép lại nội dung.
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
        const opts = b.options.map((o) => `${o.checked ? O_CHON : O_TRONG} ${o.label}`);
        if (b.layout === 'inline') rows.push(`${runsText(b.label)} ${opts.join('   ')}`);
        else rows.push(runsText(b.label), ...opts.map((o) => `    ${o}`));
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
