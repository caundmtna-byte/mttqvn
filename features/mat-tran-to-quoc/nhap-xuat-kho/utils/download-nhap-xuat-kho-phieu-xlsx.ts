import { getTodayISODate } from '@/lib/utils';
import type { NhapXuatKhoPhieuDocumentModel } from './build-nhap-xuat-kho-phieu-document';

/** Xuất XLSX — UTF-8; font cell mặc định Excel (Calibri). */
export async function downloadNhapXuatKhoPhieuXlsx(
  model: NhapXuatKhoPhieuDocumentModel,
  fileName: string,
): Promise<void> {
  const XLSX = await import('xlsx');
  const aoa: (string | number)[][] = [];

  aoa.push([
    `${model.donViLabel}: ${model.donViValue}`,
    '',
    `${model.soPhieuLabel}: ${model.soPhieu}`,
  ]);
  aoa.push([
    `${model.diaChiLabel}: ${model.diaChiValue}`,
    model.docTitle,
    `${model.mauSoLabel}: ${model.mauSo}`,
  ]);
  aoa.push([
    `${model.boPhanLabel}: ${model.boPhanValue}`,
    `${model.ngayLapPhieuLabel}: ${model.ngayPhieu}`,
    model.thongTu,
  ]);
  aoa.push([]);

  for (const line of model.infoLines) {
    aoa.push([`${line.label}: ${line.value}`]);
  }
  aoa.push([]);

  if (model.rows.length > 0) {
    const headers = model.columnHeaders;
    aoa.push(headers);
    aoa.push(model.columnCodes);
    for (const r of model.rows) {
      aoa.push(headers.map((h) => r[h] ?? ''));
    }
    if (model.showCongRow) {
      aoa.push(['', '', '', '', model.congLabel, model.congValue, '']);
    }
    aoa.push([]);
    if (model.tongTienBangChu) {
      aoa.push([`${model.tongTienBangChuLabel}: ${model.tongTienBangChu}.`]);
    }
  } else {
    aoa.push([model.emptyMessage]);
  }

  aoa.push([]);
  aoa.push([`${model.chungTuGocLabel}: ${model.chungTuGoc}`]);
  aoa.push([model.signatureDateLine]);
  if (model.ghiChuNoiBo) {
    aoa.push([`Ghi chú nội bộ: ${model.ghiChuNoiBo}`]);
  }
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
