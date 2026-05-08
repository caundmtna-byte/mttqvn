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
  positions: {
    all: ['positions'] as const,
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
    }) => ['bai-viet-danh-sach', 'page', args] as const,
  },
  congViecDanhSach: {
    all: ['cong-viec-danh-sach'] as const,
    detail: (id: string) => ['cong-viec-danh-sach', 'detail', id] as const,
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
    detail: (id: string) => ['mttq-can-bo', 'detail', id] as const,
  },
  mttqKhenThuong: {
    all: ['mttq-khen-thuong'] as const,
    detail: (id: string) => ['mttq-khen-thuong', 'detail', id] as const,
    /** Dòng khen thưởng gắn một cán bộ — dùng detail cán bộ + invalidate theo prefix `by-can-bo`. */
    byCanBo: (canBoId: string) => ['mttq-khen-thuong', 'by-can-bo', canBoId] as const,
    byCanBoPrefix: ['mttq-khen-thuong', 'by-can-bo'] as const,
  },
  mttqLopTapHuan: {
    all: ['mttq-lop-tap-huan'] as const,
    detail: (id: string) => ['mttq-lop-tap-huan', 'detail', id] as const,
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
} as const;
