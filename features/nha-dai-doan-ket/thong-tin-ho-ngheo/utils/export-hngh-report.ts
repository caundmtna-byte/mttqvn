import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { HnghBarPoint, HnghKpis, HnghXaPhuongRow } from './aggregate-hngh-stats';

/**
 * Xuất báo cáo thống kê hộ nghèo ra Excel — chỉ số đã tổng hợp.
 *
 * Cố ý KHÔNG có sheet chi tiết từng hộ: danh sách hộ kèm số căn cước / tài khoản
 * đã có nút Xuất ở tab Danh sách, gác theo đúng cột người dùng chọn.
 */
export async function exportHnghThongKeReportToExcel(input: {
  kpis: HnghKpis;
  doiTuongRows: HnghBarPoint[];
  trangThaiRows: HnghBarPoint[];
  tonGiaoRows: HnghBarPoint[];
  danTocRows: HnghBarPoint[];
  xaPhuongRows: HnghXaPhuongRow[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const COL_CHI_TIEU = 'Chỉ tiêu';
  const COL_GIA_TRI = 'Giá trị';
  const COL_SO_HO = txt('hoNgheoThongKe.table.colSoHo');

  const summary = [
    { [COL_CHI_TIEU]: 'Ngày xuất', [COL_GIA_TRI]: getTodayISODate() },
    { [COL_CHI_TIEU]: txt('hoNgheoThongKe.kpi.tongSoHo'), [COL_GIA_TRI]: input.kpis.tongSoHo },
    { [COL_CHI_TIEU]: txt('hoNgheoThongKe.kpi.dangKhoKhan'), [COL_GIA_TRI]: input.kpis.dangKhoKhan },
    { [COL_CHI_TIEU]: txt('hoNgheoThongKe.kpi.hetKhoKhan'), [COL_GIA_TRI]: input.kpis.hetKhoKhan },
    {
      [COL_CHI_TIEU]: txt('hoNgheoThongKe.kpi.tyLeHetKhoKhan'),
      [COL_GIA_TRI]: `${input.kpis.tyLeHetKhoKhan}%`,
    },
    { [COL_CHI_TIEU]: txt('hoNgheoThongKe.kpi.coTonGiao'), [COL_GIA_TRI]: input.kpis.coTonGiao },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Tổng quan');

  const barSheet = (rows: HnghBarPoint[], colLabel: string) =>
    rows.map((r) => ({ [colLabel]: r.label, [COL_SO_HO]: r.soHo }));

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.doiTuongRows, txt('hoNgheo.store.doiTuongCol'))),
    'Theo đối tượng',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.trangThaiRows, txt('hoNgheo.store.trangThaiCol'))),
    'Theo trạng thái',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.tonGiaoRows, txt('hoNgheo.store.tonGiaoCol'))),
    'Theo tôn giáo',
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(barSheet(input.danTocRows, txt('hoNgheo.store.danTocCol'))),
    'Theo dân tộc',
  );

  const xaSheet = input.xaPhuongRows.map((r) => ({
    [txt('hoNgheoThongKe.table.colXaPhuong')]: r.label,
    [txt('hoNgheoThongKe.table.colTongSoHo')]: r.tongSoHo,
    'Hộ nghèo': r.hoNgheo,
    'Cận nghèo': r.canNgheo,
    'Khó khăn': r.khoKhan,
    [txt('hoNgheoThongKe.kpi.dangKhoKhan')]: r.dangKhoKhan,
    [txt('hoNgheoThongKe.kpi.hetKhoKhan')]: r.hetKhoKhan,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(xaSheet), 'Theo xã phường');

  XLSX.writeFile(wb, `${txt('hoNgheoThongKe.exportFileName')}_${getTodayISODate()}.xlsx`);
}
