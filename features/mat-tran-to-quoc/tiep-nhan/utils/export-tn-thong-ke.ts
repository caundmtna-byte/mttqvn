import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { TiepNhan } from '../core/types';
import { getTnColumnDisplayValue } from './column-display';
import type { TnKpis, TnNhomRow } from './aggregate-tn-stats';

const T = (k: string) => txt(`matTranTiepNhan.thongKe.${k}`);
const S = (k: string) => txt(`matTranTiepNhan.store.${k}`);

/** Cột của sheet Chi tiết — dùng lại cách hiển thị của tab Danh sách, riêng tiền ghi số thô. */
const CHI_TIET_TEXT: readonly (readonly [keyof TiepNhan, string])[] = [
  ['so_phieu', 'soPhieuCol'],
  ['ngay_tiep_nhan', 'ngayCol'],
  ['ten_nha_tai_tro', 'nhaTaiTroCol'],
  ['ten_chuong_trinh', 'chuongTrinhCol'],
  ['ten_don_vi_tiep_nhan', 'donViTiepNhanCol'],
  ['hinh_thuc', 'hinhThucCol'],
];

/**
 * Xuất thống kê tiếp nhận ra Excel. Số tiền ghi dạng SỐ THÔ để người nhận còn
 * cộng/lọc được trong Excel.
 */
export async function exportTnThongKeToExcel(input: {
  /** Ví dụ `2026-07-01 → 2026-09-30`; rỗng = toàn thời gian. */
  kyBaoCao: string;
  kpis: TnKpis;
  chuongTrinhRows: TnNhomRow[];
  nhaTaiTroRows: TnNhomRow[];
  donViRows: TnNhomRow[];
  chiTietRows: TiepNhan[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const COL_CHI_TIEU = T('export.colChiTieu');
  const COL_GIA_TRI = T('export.colGiaTri');
  const COL_SO_KHOAN = T('export.soKhoan');
  const COL_TIEN = T('export.tongTien');
  const COL_TONG = T('table.colGiaTri');
  const { kpis } = input;

  const summary = [
    { [COL_CHI_TIEU]: T('export.ngayXuat'), [COL_GIA_TRI]: getTodayISODate() },
    { [COL_CHI_TIEU]: T('export.kyBaoCao'), [COL_GIA_TRI]: input.kyBaoCao || T('export.toanThoiGian') },
    { [COL_CHI_TIEU]: T('kpi.soKhoan'), [COL_GIA_TRI]: kpis.soKhoan },
    { [COL_CHI_TIEU]: T('kpi.soNhaTaiTro'), [COL_GIA_TRI]: kpis.soNhaTaiTro },
    { [COL_CHI_TIEU]: T('kpi.tongGiaTri'), [COL_GIA_TRI]: kpis.tongGiaTri },
    { [COL_CHI_TIEU]: T('kpi.tongTien'), [COL_GIA_TRI]: kpis.tongTien },
    { [COL_CHI_TIEU]: T('kpi.chuyenKhoan'), [COL_GIA_TRI]: kpis.chuyenKhoan },
    { [COL_CHI_TIEU]: T('kpi.tienMat'), [COL_GIA_TRI]: kpis.tienMat },
    { [COL_CHI_TIEU]: T('kpi.hienVatGiayTo'), [COL_GIA_TRI]: kpis.hienVatGiayTo },
    { [COL_CHI_TIEU]: T('kpi.daBanGiao'), [COL_GIA_TRI]: kpis.daBanGiao },
    { [COL_CHI_TIEU]: T('export.tyLeBanGiao'), [COL_GIA_TRI]: `${kpis.tyLeBanGiao}%` },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), T('export.sheetTongQuan'));

  const nhomSheet = (rows: TnNhomRow[], colLabel: string) =>
    rows.map((r) => ({
      [colLabel]: r.label,
      [COL_SO_KHOAN]: r.soKhoan,
      [COL_TIEN]: r.tongTien,
      [COL_TONG]: r.tongGiaTri,
    }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(nhomSheet(input.chuongTrinhRows, S('chuongTrinhCol'))),
    T('export.sheetChuongTrinh'),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(nhomSheet(input.nhaTaiTroRows, S('nhaTaiTroCol'))),
    T('export.sheetNhaTaiTro'),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(nhomSheet(input.donViRows, S('donViTiepNhanCol'))),
    T('export.sheetDonVi'),
  );

  const chiTiet = input.chiTietRows.map((r) => ({
    ...Object.fromEntries(CHI_TIET_TEXT.map(([key, label]) => [S(label), getTnColumnDisplayValue(r, key)])),
    [S('soTienCol')]: r.so_tien,
    [S('giayToCoGiaCol')]: r.giay_to_co_gia_gia_tri ?? 0,
    [S('hienVatKhacCol')]: r.hien_vat_khac_gia_tri ?? 0,
    [S('phieuKhoCol')]: r.gia_tri_phieu_kho,
    [S('tongGiaTriCol')]: r.tong_gia_tri,
    [S('trangThaiCol')]: r.trang_thai,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chiTiet), T('export.sheetChiTiet'));

  XLSX.writeFile(wb, `${T('export.fileName')}_${getTodayISODate()}.xlsx`);
}
