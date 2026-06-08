import { getTodayISODate } from '@/lib/utils';
import {
  layoutNhapXuatKhoPhieuMetaPairs,
  type NhapXuatKhoPhieuDocumentModel,
} from './build-nhap-xuat-kho-phieu-document';

/** Xuất XLSX — UTF-8; font cell mặc định Excel (Calibri). */
export async function downloadNhapXuatKhoPhieuXlsx(
  model: NhapXuatKhoPhieuDocumentModel,
  fileName: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [];

  aoa.push([model.orgNameLine1]);
  if (model.orgNameLine2) aoa.push([model.orgNameLine2]);
  aoa.push([model.orgSubTitle.toUpperCase()]);
  if (model.address) aoa.push([model.address]);
  if (model.phone) aoa.push([`ĐT: ${model.phone}`]);
  aoa.push([
    `Mẫu số: 01-KCT · Số: ${model.soPhieu} · ${model.signedDateLabel}: ${model.signedDateValue}`,
  ]);
  aoa.push([]);
  aoa.push([model.docTitle]);
  aoa.push([`Ngày lập phiếu: ${model.ngayPhieu}`]);
  aoa.push([]);

  const metaPairs = layoutNhapXuatKhoPhieuMetaPairs(model.metaItems, {
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
    aoa.push([]);
    if (model.tongTien > 0) {
      aoa.push(['', '', '', '', '', 'Tổng cộng:', model.tongTienFormatted]);
      if (model.tongTienBangChu) {
        aoa.push([`Bằng chữ: ${model.tongTienBangChu}.`]);
      }
    }
  } else {
    aoa.push([model.emptyMessage]);
  }

  aoa.push([]);
  aoa.push([`Ghi chú: ${model.ghiChu}`]);
  aoa.push([]);
  aoa.push([
    model.footer.col1Label,
    model.footer.col2Label,
    model.footer.col3Label,
    model.footer.col4Label,
  ]);
  aoa.push(['(Ký, họ tên)', '(Ký, họ tên)', '(Ký, họ tên)', '(Ký, họ tên, đóng dấu)']);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Phieu');
  XLSX.writeFile(wb, `${fileName}_${getTodayISODate()}.xlsx`);
}
