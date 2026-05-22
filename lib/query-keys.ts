/**
 * Query keys tập trung — tránh lệch chuỗi khi invalidate / prefetch (TanStack Query + Supabase).
 */
/** Tham số fetch danh sách nhân viên (đồng bộ với getEmployees + useEmployees). */
export const EMPLOYEES_LIST_QUERY_PARAMS = {
  limit: 5000,
  offset: 0,
  orderBy: 'ten_tai_khoan',
  ascending: true,
} as const;

export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    /** Danh sách có limit/offset/order — giảm refetch và khớp cache mutation. */
    list: (params: {
      limit: number;
      offset: number;
      orderBy: string;
      ascending: boolean;
    }) => ['employees', 'list', params] as const,
    /** Prefix: invalidate mọi query `['employee', id]` */
    anyDetail: ['employee'] as const,
    detail: (id: string) => ['employee', id] as const,
  },
  departments: {
    all: ['departments'] as const,
  },
  /** Segment thứ 2 đổi khi schema fetch chức vụ đổi — tránh dùng cache persist cũ thiếu field. */
  positions: {
    all: ['positions', 'v2'] as const,
  },
  roles: {
    all: ['roles'] as const,
  },
  branches: {
    all: ['branches'] as const,
  },
  jobLevels: {
    all: ['job-levels'] as const,
  },
  thongTinToChuc: {
    singleton: ['thong-tin-to-chuc', 'singleton'] as const,
  },
  baiVietTheLoai: {
    all: ['bai-viet-the-loai'] as const,
  },
  baiVietThietLapKhac: {
    all: ['bai-viet-thiet-lap-khac'] as const,
  },
  mttqThietLap: {
    all: ['mttq-thiet-lap'] as const,
  },
  baiVietDanhSach: {
    all: ['bai-viet-danh-sach'] as const,
    detail: (id: string) => ['bai-viet-danh-sach', 'detail', id] as const,
    page: (args: {
      page: number;
      pageSize: number;
      search: string;
      scope: string;
      viewerNhanVienId: string | null;
      viewerPhongBanId: string | null;
      theLoaiIds: readonly string[];
      nguonDangIds: readonly string[];
      trangDangIds: readonly string[];
    }) => ['bai-viet-danh-sach', 'page', args] as const,
  },
  chuongTrinhNam: {
    all: ['chuong-trinh-nam'] as const,
    detail: (id: string) => ['chuong-trinh-nam', 'detail', id] as const,
  },
  congViecDanhSach: {
    all: ['cong-viec-danh-sach'] as const,
    detail: (id: string) => ['cong-viec-danh-sach', 'detail', id] as const,
    /** Invalidate mọi query theo chương trình: `queryKey` bắt đầu bằng prefix này, `exact: false`. */
    byChuongTrinhPrefix: ['cong-viec-danh-sach', 'by-chuong-trinh'] as const,
    byChuongTrinh: (chuongTrinhId: string) =>
      ['cong-viec-danh-sach', 'by-chuong-trinh', chuongTrinhId] as const,
    page: (args: {
      page: number;
      pageSize: number;
      search: string;
      listScope: string;
      viewerNhanVienId: string | null;
      trangThai: readonly string[];
      mucDo: readonly string[];
    }) => ['cong-viec-danh-sach', 'page', args] as const,
  },
  congViecBaoCao: {
    /** Prefix dùng để invalidate toàn bộ báo cáo công việc khi CRUD bảng nguồn. */
    all: ['cong-viec-bao-cao'] as const,
    kpi: (args: unknown) => ['cong-viec-bao-cao', 'kpi', args] as const,
    trend: (args: unknown, bucket: string) =>
      ['cong-viec-bao-cao', 'trend', bucket, args] as const,
    phanBoTrangThai: (args: unknown) =>
      ['cong-viec-bao-cao', 'phan-bo-trang-thai', args] as const,
    phanBoMucDo: (args: unknown) =>
      ['cong-viec-bao-cao', 'phan-bo-muc-do', args] as const,
    topTrachNhiem: (args: unknown, topN: number) =>
      ['cong-viec-bao-cao', 'top-trach-nhiem', topN, args] as const,
    topNguoiTao: (args: unknown, topN: number) =>
      ['cong-viec-bao-cao', 'top-nguoi-tao', topN, args] as const,
    lookup: (args: unknown, opts: unknown) =>
      ['cong-viec-bao-cao', 'lookup', opts, args] as const,
    filterOptions: (range: {
      p_start: string;
      p_end: string;
      p_viewer_id: number | null;
      p_viewer_phong_ban_id: number | null;
      p_view_all: boolean;
    }) => ['cong-viec-bao-cao', 'filter-options', range] as const,
  },
  mttqCanBo: {
    all: ['mttq-can-bo'] as const,
    /** Danh sách gọn cho báo cáo thống kê (select nhẹ hơn LIST). */
    stats: ['mttq-can-bo', 'stats'] as const,
    detail: (id: string) => ['mttq-can-bo', 'detail', id] as const,
  },
  mttqKhenThuong: {
    all: ['mttq-khen-thuong'] as const,
    chiTietFlatList: ['mttq-khen-thuong', 'chi-tiet-flat-list'] as const,
    detail: (id: string) => ['mttq-khen-thuong', 'detail', id] as const,
    /** Dòng khen thưởng gắn một cán bộ — dùng detail cán bộ + invalidate theo prefix `by-can-bo`. */
    byCanBo: (canBoId: string) => ['mttq-khen-thuong', 'by-can-bo', canBoId] as const,
    byCanBoPrefix: ['mttq-khen-thuong', 'by-can-bo'] as const,
  },
  mttqLopTapHuan: {
    all: ['mttq-lop-tap-huan'] as const,
    detail: (id: string) => ['mttq-lop-tap-huan', 'detail', id] as const,
    chiTietFlatList: ['mttq-lop-tap-huan', 'chi-tiet-flat-list'] as const,
    /** Dòng tập huấn (chi tiết phẳng) gắn một cán bộ — detail cán bộ + invalidate prefix `by-can-bo`. */
    byCanBo: (canBoId: string) => ['mttq-lop-tap-huan', 'by-can-bo', canBoId] as const,
    byCanBoPrefix: ['mttq-lop-tap-huan', 'by-can-bo'] as const,
  },
  mttqNhiemKy: {
    all: ['mttq-nhiem-ky'] as const,
    detail: (id: string) => ['mttq-nhiem-ky', 'detail', id] as const,
  },
  mttqKyHop: {
    all: ['mttq-ky-hop'] as const,
    detail: (id: string) => ['mttq-ky-hop', 'detail', id] as const,
    byNhiemKy: (nhiemKyId: string) => ['mttq-ky-hop', 'by-nhiem-ky', nhiemKyId] as const,
  },
  mttqDiemDanhUyVien: {
    byKyHop: (kyHopId: string) => ['mttq-diem-danh-uy-vien', 'by-ky-hop', kyHopId] as const,
    byNhiemKy: (nhiemKyId: string) => ['mttq-diem-danh-uy-vien', 'by-nhiem-ky', nhiemKyId] as const,
  },
  mttqUyVienUyBan: {
    all: ['mttq-uy-vien-uy-ban'] as const,
    stats: ['mttq-uy-vien-uy-ban', 'stats'] as const,
    detail: (id: string) => ['mttq-uy-vien-uy-ban', 'detail', id] as const,
    byNhiemKy: (nhiemKyId: string) => ['mttq-uy-vien-uy-ban', 'by-nhiem-ky', nhiemKyId] as const,
  },
  tinhThanh: {
    all: ['tinh-thanh'] as const,
  },
  xaPhuong: {
    all: ['xa-phuong'] as const,
    /** Danh sách toàn bộ xã/phường (tab xã, không lọc tỉnh). */
    listAll: ['xa-phuong', 'list-all'] as const,
    byTinh: (idTinhThanh: string) => ['xa-phuong', 'by-tinh', idTinhThanh] as const,
  },
  khoDanhSachKho: {
    all: ['kho-danh-sach-kho'] as const,
    detail: (id: string) => ['kho-danh-sach-kho', 'detail', id] as const,
  },
  khoDonViCuuTro: {
    all: ['kho-don-vi-cuu-tro'] as const,
    detail: (id: string) => ['kho-don-vi-cuu-tro', 'detail', id] as const,
  },
  khoDotCuuTro: {
    all: ['kho-dot-cuu-tro'] as const,
    detail: (id: string) => ['kho-dot-cuu-tro', 'detail', id] as const,
  },
  khoDanhMucHangHoa: {
    all: ['kho-danh-muc-hang-hoa'] as const,
    detail: (id: string) => ['kho-danh-muc-hang-hoa', 'detail', id] as const,
  },
  khoDanhSachHangHoa: {
    all: ['kho-danh-sach-hang-hoa'] as const,
    detail: (id: string) => ['kho-danh-sach-hang-hoa', 'detail', id] as const,
  },
  khoNhapXuatKho: {
    all: ['kho-nhap-xuat-kho'] as const,
    detail: (id: string) => ['kho-nhap-xuat-kho', 'detail', id] as const,
    /** Tab "Chi tiết" — danh sách phẳng dòng `kho_nhap_xuat_kho_ct`. */
    chiTietFlatList: ['kho-nhap-xuat-kho', 'chi-tiet-flat-list'] as const,
    /** Tồn kho hiện tại theo kho (dùng trong form xuất / chuyển kho). */
    tonKhoByKho: (khoId: string) => ['kho-nhap-xuat-kho', 'ton-kho-by-kho', khoId] as const,
  },
  luongThietLapNgach: {
    all: ['luong-thiet-lap-ngach'] as const,
    detail: (id: string) => ['luong-thiet-lap-ngach', 'detail', id] as const,
  },
  luongThietLapBac: {
    all: ['luong-thiet-lap-bac'] as const,
    byNgach: (ngachId: string) => ['luong-thiet-lap-bac', 'by-ngach', ngachId] as const,
  },
  luongThietLapCauHinh: {
    singleton: ['luong-thiet-lap-cau-hinh', 'singleton'] as const,
  },
} as const;
