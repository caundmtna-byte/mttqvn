import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { NhaDaiDoanKet } from '@/features/nha-dai-doan-ket/danh-sach/core/types';
import { getNddkColumnDisplayValue } from '@/features/nha-dai-doan-ket/danh-sach/utils/column-display';
import type {
  NddkBarPoint,
  NddkKpis,
  NddkNamPoint,
  NddkXaPhuongRow,
} from './aggregate-nddk-stats';

/**
 * Xuất báo cáo thống kê ra Excel.
 *
 * Số tiền ghi dạng SỐ THÔ (không định dạng tiền tệ) để người nhận còn cộng/lọc
 * được trong Excel; sheet chi tiết mới dùng chuỗi hiển thị như trên màn hình.
 */
export async function exportNddkThongKeReportToExcel(input: {
  kpis: NddkKpis;
  namRows: NddkNamPoint[];
  trangThaiRows: NddkBarPoint[];
  nguonRows: NddkBarPoint[];
  nguonHoTroRows: NddkBarPoint[];
  loaiHinhRows: NddkBarPoint[];
  doiTuongRows: NddkBarPoint[];
  xaPhuongRows: NddkXaPhuongRow[];
  chiTietRows: NhaDaiDoanKet[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const COL_CHI_TIEU = 'Chỉ tiêu';
  const COL_GIA_TRI = 'Giá trị';
  const COL_SO_NHA = txt('nhaDaiDoanKetThongKe.table.colSoNha');
  const COL_SO_TIEN = txt('nhaDaiDoanKetThongKe.table.colSoTien');

  const summary = [
    { [COL_CHI_TIEU]: 'Ngày xuất', [COL_GIA_TRI]: getTodayISODate() },
    { [COL_CHI_TIEU]: txt('nhaDaiDoanKetThongKe.kpi.tongSoNha'), [COL_GIA_TRI]: input.kpis.tongSoNha },
    { [COL_CHI_TIEU]: txt('nhaDaiDoanKetThongKe.kpi.tongSoTien'), [COL_GIA_TRI]: input.kpis.tongSoTien },
    { [COL_CHI_TIEU]: txt('nhaDaiDoanKetThongKe.kpi.daBanGiao'), [COL_GIA_TRI]: input.kpis.daBanGiao },
    { [COL_CHI_TIEU]: txt('nhaDaiDoanKetThongKe.kpi.dangThucHien'), [COL_GIA_TRI]: input.kpis.dangThucHien },
    { [COL_CHI_TIEU]: txt('nhaDaiDoanKetThongKe.kpi.tyLeBanGiao'), [COL_GIA_TRI]: `${input.kpis.tyLeBanGiao}%` },
    { [COL_CHI_TIEU]: txt('nhaDaiDoanKetThongKe.kpi.binhQuan'), [COL_GIA_TRI]: input.kpis.binhQuanMoiNha },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Tổng quan');

  const namSheet = input.namRows.map((r) => ({
    [txt('nhaDaiDoanKet.store.namCol')]: r.nam,
    [COL_SO_NHA]: r.soNha,
    [COL_SO_TIEN]: r.soTien,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(namSheet), 'Theo năm');

  const barSheet = (rows: NddkBarPoint[], colLabel: string) =>
    rows.map((r) => ({ [colLabel]: r.label, [COL_SO_NHA]: r.soNha, [COL_SO_TIEN]: r.soTien }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([
      ...barSheet(input.trangThaiRows, txt('nhaDaiDoanKet.store.trangThaiCol')),
    ]),
    'Theo trạng thái',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.nguonRows, txt('nhaDaiDoanKet.store.nguonCol'))),
    'Theo nguồn',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      barSheet(input.nguonHoTroRows, txt('nhaDaiDoanKet.store.nguonHoTroCol')),
    ),
    'Theo nguồn hỗ trợ',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.loaiHinhRows, txt('nhaDaiDoanKet.store.loaiHinhCol'))),
    'Theo loại hình',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.doiTuongRows, txt('nhaDaiDoanKet.store.doiTuongCol'))),
    'Theo đối tượng',
  );

  const xaSheet = input.xaPhuongRows.map((r) => ({
    [txt('nhaDaiDoanKetThongKe.table.colXaPhuong')]: r.label,
    [COL_SO_NHA]: r.soNha,
    [COL_SO_TIEN]: r.soTien,
    [txt('nhaDaiDoanKetThongKe.table.colDaBanGiao')]: r.daBanGiao,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(xaSheet), 'Theo xã phường');

  const chiTiet = input.chiTietRows.map((item) => ({
    [txt('nhaDaiDoanKet.store.namCol')]: item.nam,
    [txt('nhaDaiDoanKet.store.chuHoCol')]: item.ho_ten_chu_ho,
    [txt('nhaDaiDoanKet.store.xaPhuongCol')]: getNddkColumnDisplayValue(item, 'ten_xa_phuong'),
    [txt('nhaDaiDoanKet.store.khoiXomCol')]: getNddkColumnDisplayValue(item, 'khoi_xom'),
    [txt('nhaDaiDoanKet.store.doiTuongCol')]: getNddkColumnDisplayValue(item, 'doi_tuong'),
    [txt('nhaDaiDoanKet.store.loaiHinhCol')]: item.loai_hinh_ho_tro,
    [txt('nhaDaiDoanKet.store.nguonCol')]: item.nguon,
    [txt('nhaDaiDoanKet.store.nguonHoTroCol')]: item.nguon_ho_tro,
    [COL_SO_TIEN]: item.so_tien ?? '',
    [txt('nhaDaiDoanKet.store.trangThaiCol')]: item.trang_thai,
    [txt('nhaDaiDoanKet.store.ngayTrangThaiCol')]: getNddkColumnDisplayValue(
      item,
      'ngay_cap_nhat_trang_thai',
    ),
    [txt('nhaDaiDoanKet.store.noiDungCol')]: item.noi_dung_ho_tro,
    [txt('nhaDaiDoanKet.store.ghiChuCol')]: getNddkColumnDisplayValue(item, 'ghi_chu'),
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(chiTiet), 'Chi tiết');

  XLSX.writeFile(wb, `${txt('nhaDaiDoanKetThongKe.exportFileName')}_${getTodayISODate()}.xlsx`);
}
