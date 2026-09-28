/**
 * Chuỗi của TAB Thống kê trong module Thông tin hộ nghèo.
 *
 * Namespace riêng như `nhaDaiDoanKetThongKe`. Quyền xem và tiêu đề trang do
 * tab Danh sách lo, nên ở đây không có `noViewPermission` / `title`.
 */
export const hoNgheoThongKe = {
  listLoadErrorHint: 'Không tải được dữ liệu thống kê. Thử tải lại.',
  exportFileName: 'Thong_Ke_Ho_Ngheo',
  kpi: {
    tongSoHo: 'Tổng số hộ',
    dangKhoKhan: 'Đang khó khăn',
    hetKhoKhan: 'Hết khó khăn',
    tyLeHetKhoKhan: 'Tỷ lệ hết khó khăn',
    coTonGiao: 'Hộ có tôn giáo',
  },
  chart: {
    doiTuongTitle: 'Theo đối tượng',
    trangThaiTitle: 'Theo trạng thái',
    tonGiaoTitle: 'Theo tôn giáo',
    danTocTitle: 'Theo dân tộc',
    soHo: 'Số hộ',
  },
  table: {
    theoXaPhuongTitle: 'Theo xã phường',
    colXaPhuong: 'Xã phường',
    colSoHo: 'Số hộ',
    colTongSoHo: 'Tổng số hộ',
    khongGanXa: 'Chưa gán xã phường',
    empty: 'Chưa có dữ liệu',
  },
  khongXacDinh: 'Chưa xác định',
  noExportData: 'Không có dữ liệu để xuất.',
};
