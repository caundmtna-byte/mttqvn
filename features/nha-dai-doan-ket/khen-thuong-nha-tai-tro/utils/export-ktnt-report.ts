import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { KhenThuongNhaTaiTro } from '../core/types';
import { getKtntColumnDisplayValue } from './column-display';
import type { KtntBarPoint, KtntGroupRow, KtntKpis, KtntNamPoint } from './aggregate-ktnt-stats';

const T = (k: string) => txt(`khenThuongNhaTaiTroThongKe.${k}`);
const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);

/** Cột của sheet chi tiết — [khoá cột, khoá nhãn]. */
const CHI_TIET_COLS: readonly (readonly [string, string])[] = [
  ['ngay_khen', 'ngayKhenCol'],
  ['so_quyet_dinh', 'soQuyetDinhCol'],
  ['noi_dung_khen', 'noiDungCol'],
  ['cap_khen', 'capKhenCol'],
  ['don_vi_khen', 'donViKhenCol'],
  ['ten_xa_phuong', 'xaPhuongCol'],
  ['ten_nha_tai_tro', 'nhaTaiTroCol'],
  ['loai_nha_tai_tro', 'loaiNhaTaiTroCol'],
  ['so_khoan_ho_tro', 'soKhoanCol'],
  ['so_nguoi_duoc_ho_tro', 'soNguoiCol'],
  ['trang_thai', 'trangThaiCol'],
  ['ho_va_ten_nguoi_duyet', 'nguoiDuyetCol'],
  ['ghi_chu', 'ghiChuCol'],
];

/** Số tiền ghi dạng SỐ THÔ để người nhận còn cộng/lọc được trong Excel. */
export async function exportKtntThongKeReportToExcel(input: {
  kpis: KtntKpis;
  namRows: KtntNamPoint[];
  bars: { sheet: string; colLabel: string; rows: KtntBarPoint[] }[];
  topNhaTaiTro: KtntGroupRow[];
  chiTietRows: KhenThuongNhaTaiTro[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const add = (rows: object[], name: string) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);
  const SO_QD = T('table.colSoQuyetDinh');
  const k = input.kpis;

  add(
    [
      ['Ngày xuất', getTodayISODate()],
      [T('kpi.tongQuyetDinh'), k.tongQuyetDinh],
      [T('kpi.daDuyet'), k.daDuyet],
      [T('kpi.choDuyet'), k.choDuyet],
      [T('kpi.tyLeDuyet'), `${k.tyLeDuyet}%`],
      [T('kpi.soNhaTaiTro'), k.soNhaTaiTro],
      [T('kpi.tongGiaTri'), k.tongGiaTri],
    ].map(([a, b]) => ({ 'Chỉ tiêu': a, 'Giá trị': b })),
    'Tổng quan',
  );
  add(
    input.namRows.map((r) => ({ Năm: r.nam, [SO_QD]: r.soQuyetDinh, [T('kpi.daDuyet')]: r.daDuyet })),
    'Theo năm',
  );
  for (const b of input.bars) {
    add(b.rows.map((r) => ({ [b.colLabel]: r.label, [SO_QD]: r.soQuyetDinh })), b.sheet);
  }
  add(
    input.topNhaTaiTro.map((r) => ({
      [T('table.colNhaTaiTro')]: r.label,
      [SO_QD]: r.soQuyetDinh,
      [T('table.colGiaTri')]: r.giaTri,
    })),
    'Theo nhà tài trợ',
  );
  add(
    input.chiTietRows.map((item) => ({
      ...Object.fromEntries(CHI_TIET_COLS.map(([col, label]) => [L(label), getKtntColumnDisplayValue(item, col)])),
      [L('tongTienHoTroCol')]: item.tong_tien_ho_tro,
      [L('giaTriKhacCol')]: item.gia_tri_dong_gop_khac ?? '',
      [L('tongGiaTriCol')]: item.tong_gia_tri,
    })),
    'Chi tiết',
  );

  XLSX.writeFile(wb, `${T('exportFileName')}_${getTodayISODate()}.xlsx`);
}
