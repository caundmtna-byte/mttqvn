/** Chuỗi module Hoa hồng viết bài — prefix `articleCommission` trong STRINGS */
export const articleCommission = {
  tabMine: 'Của tôi',
  tabAll: 'Tất cả',
  filterTheLoai: 'Thể loại',
  filterAuthor: 'Người viết',
  /** Khoảng thời gian không giới hạn (bổ sung trên DateRangePicker chung với BC thống kê). */
  presetAll: 'Toàn bộ',
  kpiTotal: 'Tổng hoa hồng',
  kpiArticles: 'Số bài',
  kpiAvg: 'Trung bình / bài',
  kpiTopAuthor: 'Tác giả dẫn đầu',
  kpiTopAuthorEmpty: '—',
  chartTrend: 'Hoa hồng theo tháng',
  chartByTheLoai: 'Theo thể loại',
  chartByAuthor: 'Theo người viết',
  chartOtherSlice: 'Khác',
  tableByAuthor: 'Chi tiết theo người viết',
  tableByTheLoai: 'Chi tiết theo thể loại',
  tableColLabel: 'Đối tượng',
  tableColValue: 'Hoa hồng (lượt)',
  noData: 'Không có dữ liệu',
  noDataHint: 'Thử đổi bộ lọc hoặc khoảng thời gian.',
  loading: 'Đang tải…',
  allTabNoPermission: 'Bạn không có quyền xem thống kê toàn bộ.',
  axisAmount: 'Số tiền (VNĐ)',
  axisCount: 'Số bài',
  goToArticles: 'Mở danh sách bài viết',
  /** Nhãn cạnh DateRangePicker (lọc theo ngày đăng bài). */
  dateByPublished: 'Ngày đăng bài',
  /** Placeholder DateRangePicker (theo ngày đăng bài, khác BC thống kê). */
  dateRangePlaceholder: 'Khoảng thời gian',
} as const;
