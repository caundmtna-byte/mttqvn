import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { ViNguoiNgheo } from '../core/types';
import { getVnnColumnDisplayValue } from './column-display';
import type { VnnBarPoint, VnnGroupRow, VnnKpis, VnnNamPoint } from './aggregate-vnn-stats';

/**
 * Xuất báo cáo thống kê ra Excel. Số tiền ghi dạng SỐ THÔ để người nhận còn
 * cộng/lọc được; sheet chi tiết dùng chuỗi hiển thị như trên màn hình.
 */
export async function exportVnnThongKeReportToExcel(input: {
  kpis: VnnKpis;
  namRows: VnnNamPoint[];
  bars: { sheet: string; colLabel: string; rows: VnnBarPoint[] }[];
  xaPhuongRows: VnnGroupRow[];
  donViRows: VnnGroupRow[];
  chiTietRows: ViNguoiNgheo[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const add = (rows: object[], name: string) =>
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name);

  const COL_CHI_TIEU = 'Chỉ tiêu';
  const COL_GIA_TRI = 'Giá trị';
  const COL_SO_KHOAN = txt('viNguoiNgheoThongKe.table.colSoKhoan');
  const COL_SO_TIEN = txt('viNguoiNgheoThongKe.table.colSoTien');
  const COL_DA_NHAN = txt('viNguoiNgheoThongKe.table.colDaNhan');
  const k = input.kpis;

  add(
    [
      ['Ngày xuất', getTodayISODate()],
      [txt('viNguoiNgheoThongKe.kpi.tongSoKhoan'), k.tongSoKhoan],
      [txt('viNguoiNgheoThongKe.kpi.soNguoiNhan'), k.soNguoiNhan],
      [txt('viNguoiNgheoThongKe.kpi.tongSoTien'), k.tongSoTien],
      [txt('viNguoiNgheoThongKe.kpi.daNhan'), k.daNhan],
      [txt('viNguoiNgheoThongKe.kpi.dangKhaoSat'), k.dangKhaoSat],
      [txt('viNguoiNgheoThongKe.kpi.tyLeDaNhan'), `${k.tyLeDaNhan}%`],
    ].map(([a, b]) => ({ [COL_CHI_TIEU]: a, [COL_GIA_TRI]: b })),
    'Tổng quan',
  );

  add(
    input.namRows.map((r) => ({
      [txt('viNguoiNgheo.store.namCol')]: r.nam,
      [COL_SO_KHOAN]: r.soKhoan,
      [COL_SO_TIEN]: r.soTien,
    })),
    'Theo năm',
  );

  for (const b of input.bars) {
    add(
      b.rows.map((r) => ({ [b.colLabel]: r.label, [COL_SO_KHOAN]: r.soKhoan, [COL_SO_TIEN]: r.soTien })),
      b.sheet,
    );
  }

  const groupSheet = (rows: VnnGroupRow[], colLabel: string) =>
    rows.map((r) => ({
      [colLabel]: r.label,
      [COL_SO_KHOAN]: r.soKhoan,
      [COL_SO_TIEN]: r.soTien,
      [COL_DA_NHAN]: r.daNhan,
    }));
  add(groupSheet(input.xaPhuongRows, txt('viNguoiNgheoThongKe.table.colXaPhuong')), 'Theo xã phường');
  add(groupSheet(input.donViRows, txt('viNguoiNgheoThongKe.table.colDonVi')), 'Theo đơn vị hỗ trợ');

  const d = (item: ViNguoiNgheo, col: string) => getVnnColumnDisplayValue(item, col);
  add(
    input.chiTietRows.map((item) => ({
      [txt('viNguoiNgheo.store.noiDungCol')]: item.noi_dung_ho_tro,
      [txt('viNguoiNgheo.store.namCol')]: item.nam,
      [txt('viNguoiNgheo.store.linhVucCol')]: item.linh_vuc_ho_tro,
      [txt('viNguoiNgheo.store.nguonCol')]: item.nguon,
      [txt('viNguoiNgheo.store.nguonHoTroCol')]: item.nguon_ho_tro,
      [txt('viNguoiNgheo.store.nguoiNhanCol')]: item.ho_ten_nguoi_nhan,
      [txt('viNguoiNgheo.store.xaPhuongCol')]: d(item, 'ten_xa_phuong'),
      [txt('viNguoiNgheo.store.khoiXomCol')]: d(item, 'khoi_xom'),
      [txt('viNguoiNgheo.store.doiTuongCol')]: d(item, 'doi_tuong'),
      [txt('viNguoiNgheo.store.hinhThucCol')]: item.hinh_thuc_ho_tro,
      [COL_SO_TIEN]: item.so_tien ?? '',
      [txt('viNguoiNgheo.store.trangThaiCol')]: item.trang_thai,
      [txt('viNguoiNgheo.store.ngayTrangThaiCol')]: d(item, 'ngay_cap_nhat_trang_thai'),
      [txt('viNguoiNgheo.store.donViHoTroCol')]: d(item, 'ten_don_vi_ho_tro'),
      [txt('viNguoiNgheo.store.ghiChuCol')]: d(item, 'ghi_chu'),
    })),
    'Chi tiết',
  );

  XLSX.writeFile(wb, `${txt('viNguoiNgheoThongKe.exportFileName')}_${getTodayISODate()}.xlsx`);
}
