import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import { khoDonViCuuTroLoaiLabel } from '../core/loai';
import type {
  DonViCuuTroKpis,
  DonViCuuTroNhomRow,
  DonViCuuTroThongKeRow,
} from './aggregate-don-vi-cuu-tro-stats';
import type { KhoDonViCuuTroLoai } from '../core/types';

const T = (k: string) => txt(`matTranDonViCuuTro.thongKe.${k}`);

/**
 * Xuất thống kê đơn vị hỗ trợ ra Excel. Số tiền ghi dạng SỐ THÔ để người nhận
 * còn cộng/lọc được trong Excel.
 */
export async function exportDonViCuuTroThongKeToExcel(input: {
  /** Ví dụ `2026-07-01 → 2026-09-30`; rỗng = toàn thời gian. */
  kyBaoCao: string;
  kpis: DonViCuuTroKpis;
  loaiRows: (DonViCuuTroNhomRow & { key: KhoDonViCuuTroLoai })[];
  gioiThieuRows: DonViCuuTroNhomRow[];
  chiTietRows: DonViCuuTroThongKeRow[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const COL_CHI_TIEU = T('export.colChiTieu');
  const COL_GIA_TRI = T('export.colGiaTri');
  const COL_SO_DON_VI = T('table.colSoDonVi');
  const COL_CO_UNG_HO = T('kpi.donViCoUngHo');
  const COL_TONG = T('export.tong');
  const { kpis } = input;

  const summary = [
    { [COL_CHI_TIEU]: T('export.ngayXuat'), [COL_GIA_TRI]: getTodayISODate() },
    { [COL_CHI_TIEU]: T('export.kyBaoCao'), [COL_GIA_TRI]: input.kyBaoCao || T('export.toanThoiGian') },
    { [COL_CHI_TIEU]: T('kpi.tongDonVi'), [COL_GIA_TRI]: kpis.tongDonVi },
    { [COL_CHI_TIEU]: T('kpi.donViCoUngHo'), [COL_GIA_TRI]: kpis.donViCoUngHo },
    { [COL_CHI_TIEU]: T('kpi.tyLeCoUngHo'), [COL_GIA_TRI]: `${kpis.tyLeCoUngHo}%` },
    { [COL_CHI_TIEU]: T('kpi.tongUngHo'), [COL_GIA_TRI]: kpis.tongUngHo },
    { [COL_CHI_TIEU]: T('export.tienMat'), [COL_GIA_TRI]: kpis.tongTienMat },
    { [COL_CHI_TIEU]: T('export.hienVat'), [COL_GIA_TRI]: kpis.tongHienVat },
    { [COL_CHI_TIEU]: T('kpi.soLuot'), [COL_GIA_TRI]: kpis.soLuot },
    { [COL_CHI_TIEU]: T('kpi.binhQuan'), [COL_GIA_TRI]: kpis.binhQuan },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), T('export.sheetTongQuan'));

  const nhomSheet = (rows: DonViCuuTroNhomRow[], colLabel: string, label: (r: DonViCuuTroNhomRow) => string) =>
    rows.map((r) => ({
      [colLabel]: label(r),
      [COL_SO_DON_VI]: r.soDonVi,
      [COL_CO_UNG_HO]: r.donViCoUngHo,
      [COL_TONG]: r.tong,
    }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      nhomSheet(input.loaiRows, txt('matTranDonViCuuTro.store.loaiCol'), (r) =>
        khoDonViCuuTroLoaiLabel(r.key as KhoDonViCuuTroLoai),
      ),
    ),
    T('export.sheetTheoLoai'),
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(nhomSheet(input.gioiThieuRows, T('table.colGioiThieu'), (r) => r.key)),
    T('export.sheetTheoGioiThieu'),
  );

  const chiTiet = input.chiTietRows.map((r) => ({
    [txt('matTranDonViCuuTro.store.ttCol')]: r.row.tt,
    [txt('matTranDonViCuuTro.store.loaiCol')]: r.row.loai_label,
    [txt('matTranDonViCuuTro.store.tenCol')]: r.row.ten,
    [txt('matTranDonViCuuTro.store.donViGioiThieuCol')]: r.row.don_vi_gioi_thieu_label,
    [T('kpi.soLuot')]: r.soLuot,
    [T('export.tienMat')]: r.tienMat,
    [T('export.hienVat')]: r.hienVat,
    [COL_TONG]: r.tong,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chiTiet), T('export.sheetChiTiet'));

  XLSX.writeFile(wb, `${T('export.fileName')}_${getTodayISODate()}.xlsx`);
}
