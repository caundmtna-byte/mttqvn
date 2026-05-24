import { getTodayISODate } from '@/lib/utils';
import {
  layoutTapHuanMetaPairs,
  type TapHuanInDanhSachDocumentModel,
} from './build-tap-huan-in-danh-sach-document';

/** Xuất XLSX — UTF-8; font cell mặc định Excel (Calibri). */
export async function downloadTapHuanListXlsx(
  model: TapHuanInDanhSachDocumentModel,
  fileName: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [];

  aoa.push([model.companyName.toUpperCase()]);
  if (model.address) aoa.push([model.address]);
  if (model.phone) aoa.push([`ĐT: ${model.phone}`]);
  aoa.push([]);
  aoa.push([model.documentTitle]);
  aoa.push([]);

  const metaPairs = layoutTapHuanMetaPairs(model.metaItems, {
    label: model.signedDateLabel,
    value: model.signedDateValue,
  });
  for (const pair of metaPairs) {
    const row: string[] = [];
    for (const item of pair) {
      row.push(`${item.label}: ${item.value}`);
    }
    aoa.push(row);
  }
  aoa.push([]);

  if (model.rows.length > 0) {
    const headers = Object.keys(model.rows[0]);
    aoa.push(headers);
    for (const r of model.rows) {
      aoa.push(headers.map((h) => r[h] ?? ''));
    }
  } else {
    aoa.push([model.emptyMessage]);
  }

  aoa.push([]);
  aoa.push([
    model.footer.nguoiTaoLabel,
    model.footer.nguoiKiemTraLabel,
    model.footer.nguoiPheDuyetLabel,
  ]);
  aoa.push([model.footer.nguoiTaoValue, '', '']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_sach');
  XLSX.writeFile(wb, `${fileName}_${getTodayISODate()}.xlsx`);
}
