/**
 * Ma trận phân quyền: submenu (cấp sidebar), nhóm và trang con — khớp
 * `lib/sidebar-menu.tsx` + các dashboard `pages/dashboards/*Dashboard.tsx`.
 * Nhãn module/nhóm dùng chung key với dashboard (`page.*Dashboard.*`) để luôn đồng bộ với app.
 */

export interface PermissionModuleItem {
  id: string;
  nameKey: string;
  /** Key lưu `var_phan_quyen.module_key` (ngắn). Mặc định = segment sau `/` cuối của `id`. */
  storageKey?: string;
}

export interface PermissionModuleGroup {
  groupTitleKey: string;
  modules: PermissionModuleItem[];
}

export interface PermissionFunction {
  id: string;
  nameKey: string;
  color: string;
  groups: PermissionModuleGroup[];
}

/**
 * Cột hành động của ma trận phân quyền.
 *
 * `approve` (= `phe_duyet` dưới DB) có mặt ở đây vì quyền **Duyệt** đã tách
 * khỏi quyền **Sửa**: nút đưa quyết định khen thưởng sang "Đã ban hành" nay
 * đòi `approve`. Thiếu cột này thì cơ quan không có cách nào bỏ tích Duyệt cho
 * chức vụ chuyên nhập liệu — và tệ hơn, nút "chọn tất cả" của ma trận sẽ ghi
 * đè mất token `phe_duyet` đang có trong dữ liệu.
 */
export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'admin', 'all'] as const;
export type PermissionActionType = (typeof PERMISSION_ACTIONS)[number];

/** Thứ tự submenu = thứ tự mục trong sidebar (sau Trang chủ), bỏ qua placeholder. */
export const PERMISSION_FUNCTIONS: PermissionFunction[] = [
  {
    id: 'mat-tran-to-quoc',
    nameKey: 'nav.matTranToQuoc',
    color: 'rose',
    groups: [
      {
        groupTitleKey: 'page.matTranDashboard.groupTrainingReward',
        modules: [
          { id: 'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan', nameKey: 'page.matTranDashboard.trainingList' },
          { id: 'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong', nameKey: 'page.matTranDashboard.rewardList' },
        ],
      },
      {
        groupTitleKey: 'page.matTranDashboard.groupCommittee',
        modules: [
          { id: 'mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky', nameKey: 'page.matTranDashboard.term' },
          { id: 'mat-tran-to-quoc/uy-vien-uy-ban/ky-hop', nameKey: 'page.matTranDashboard.session' },
          { id: 'mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien', nameKey: 'page.matTranDashboard.committeeMembers' },
          { id: 'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien', nameKey: 'page.matTranDashboard.committeeMemberStatsReport' },
        ],
      },
      {
        groupTitleKey: 'page.matTranDashboard.groupOtherSettings',
        modules: [
          { id: 'mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo', nameKey: 'page.matTranDashboard.officerList' },
          { id: 'mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo', nameKey: 'page.matTranDashboard.officerStatsReport' },
          { id: 'mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat', nameKey: 'page.matTranDashboard.setupSettings' },
        ],
      },
      {
        groupTitleKey: 'page.matTranDashboard.groupSalaryManagement',
        modules: [
          { id: 'mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong', nameKey: 'page.matTranDashboard.salaryIncreaseList' },
          { id: 'mat-tran-to-quoc/quan-ly-luong/thiet-lap-luong', nameKey: 'page.matTranDashboard.salarySetup' },
        ],
      },
    ],
  },
  {
    id: 'quan-ly-viet-bai',
    nameKey: 'nav.quanLyVietBai',
    color: 'violet',
    groups: [
      {
        groupTitleKey: 'page.articleDashboard.groupMain',
        modules: [
          { id: 'quan-ly-viet-bai/bai-viet', nameKey: 'page.articleDashboard.articles' },
          { id: 'quan-ly-viet-bai/nhuan-but-viet-bai', nameKey: 'page.articleDashboard.commission' },
          { id: 'quan-ly-viet-bai/bc-thong-ke-bai-viet', nameKey: 'page.articleDashboard.statsReport' },
          { id: 'quan-ly-viet-bai/thiet-lap-bai-viet', nameKey: 'page.articleDashboard.settings' },
        ],
      },
    ],
  },
  {
    id: 'quan-ly-giao-viec',
    nameKey: 'nav.quanLyGiaoViec',
    color: 'amber',
    groups: [
      {
        groupTitleKey: 'page.taskDashboard.groupMain',
        modules: [
          { id: 'quan-ly-giao-viec/cong-viec', nameKey: 'page.taskDashboard.tasks' },
          { id: 'quan-ly-giao-viec/bao-cao-cong-viec', nameKey: 'page.taskDashboard.taskReport' },
        ],
      },
    ],
  },
  {
    id: 'phan-bien-xa-hoi',
    nameKey: 'nav.phanBienXaHoi',
    color: 'orange',
    groups: [
      {
        groupTitleKey: 'page.phanBienXaHoiDashboard.groupMain',
        modules: [
          {
            id: 'phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi',
            nameKey: 'page.phanBienXaHoiDashboard.thucHien',
          },
          {
            id: 'phan-bien-xa-hoi/thiet-lap-danh-muc',
            nameKey: 'page.phanBienXaHoiDashboard.thietLapDanhMuc',
          },
          {
            id: 'phan-bien-xa-hoi/thong-ke-phan-bien-xa-hoi',
            nameKey: 'page.phanBienXaHoiDashboard.thongKe',
          },
        ],
      },
    ],
  },
  {
    id: 'trang-thong-tin-khac',
    nameKey: 'nav.trangThongTinKhac',
    color: 'teal',
    groups: [
      {
        groupTitleKey: 'page.externalLinksDashboard.groupMain',
        modules: [
          { id: 'trang-thong-tin-khac/tin-tuc-mttq', nameKey: 'page.externalLinksDashboard.mttqNews' },
          { id: 'trang-thong-tin-khac/zalo-oa', nameKey: 'page.externalLinksDashboard.zaloOa' },
          { id: 'trang-thong-tin-khac/mat-tran-so', nameKey: 'page.externalLinksDashboard.matTranSo' },
          { id: 'trang-thong-tin-khac/quan-ly-van-ban', nameKey: 'page.externalLinksDashboard.quanLyVanBan' },
          { id: 'trang-thong-tin-khac/lich-cong-tac-ban-tt', nameKey: 'page.externalLinksDashboard.lichCongTacBanTt' },
          { id: 'trang-thong-tin-khac/so-tay-dang-vien', nameKey: 'page.externalLinksDashboard.soTayDangVien' },
          { id: 'trang-thong-tin-khac/thu-tuc-hanh-chinh-dang', nameKey: 'page.externalLinksDashboard.thuTucHanhChinhDang' },
        ],
      },
    ],
  },
  {
    id: 'cong-tac-xa-hoi',
    nameKey: 'nav.anSinhXaHoi',
    color: 'pink',
    groups: [
      {
        /**
         * Đường dẫn đổi ngày 2026-10-04 (xem `lib/duong-dan-nghia-tinh.ts`) nhưng `storageKey`
         * GIỮ khoá cũ: đó là `module_key` trong `var_phan_quyen` và tham số
         * `fn_co_quyen(...)` của RLS các bảng kho / tiếp nhận. Đổi khoá = phải đổi DB.
         */
        groupTitleKey: 'page.matTranDashboard.groupReliefWarehouse',
        modules: [
          { id: 'cong-tac-xa-hoi/chuong-trinh-van-dong', nameKey: 'page.matTranDashboard.reliefCampaign', storageKey: 'dot-cuu-tro' },
          { id: 'cong-tac-xa-hoi/tiep-nhan-tien', nameKey: 'page.matTranDashboard.tiepNhan', storageKey: 'tiep-nhan' },
          { id: 'cong-tac-xa-hoi/danh-muc-hang-hoa', nameKey: 'page.matTranDashboard.reliefGoods', storageKey: 'hang-hoa' },
          { id: 'cong-tac-xa-hoi/tiep-nhan-phan-bo-hang', nameKey: 'page.matTranDashboard.reliefStockTransactions', storageKey: 'nhap-xuat-kho' },
          { id: 'cong-tac-xa-hoi/ton-kho', nameKey: 'page.matTranDashboard.reliefInventory', storageKey: 'ton-kho' },
          { id: 'cong-tac-xa-hoi/danh-sach-kho', nameKey: 'page.matTranDashboard.reliefWarehouseList', storageKey: 'danh-sach-kho' },
          { id: 'cong-tac-xa-hoi/nha-tai-tro', nameKey: 'page.matTranDashboard.reliefSupportUnits', storageKey: 'don-vi-cuu-tro' },
          { id: 'cong-tac-xa-hoi/bao-cao-tiep-nhan-phan-bo', nameKey: 'page.matTranDashboard.reliefSupportReport', storageKey: 'bao-cao-ho-tro' },
        ],
      },
      {
        /**
         * `storageKey` khai TƯỜNG MINH: đó là `module_key` lưu DB và tham số
         * `fn_co_quyen(...)` trong RLS (`nddk_nha_dai_doan_ket`, `vnn_chuong_trinh`,
         * `hngh_thong_tin_ho_ngheo`, `ktnt_…`) — đường dẫn đổi được, khoá thì không.
         */
        groupTitleKey: 'page.anSinhXaHoiDashboard.groupHoTroKhenThuong',
        modules: [
          {
            id: 'cong-tac-xa-hoi/khen-thuong-nha-tai-tro',
            nameKey: 'page.anSinhXaHoiDashboard.khenThuongNhaTaiTro',
            storageKey: 'khen-thuong-nha-tai-tro',
          },
          {
            id: 'cong-tac-xa-hoi/nha-dai-doan-ket',
            nameKey: 'page.anSinhXaHoiDashboard.danhSachNhaDaiDoanKet',
            storageKey: 'nha-dai-doan-ket',
          },
          {
            id: 'cong-tac-xa-hoi/chuong-trinh-ho-tro',
            nameKey: 'page.anSinhXaHoiDashboard.viNguoiNgheo',
            storageKey: 'vi-nguoi-ngheo',
          },
          {
            id: 'cong-tac-xa-hoi/doi-tuong-ho-tro',
            nameKey: 'page.anSinhXaHoiDashboard.thongTinHoNgheo',
            storageKey: 'thong-tin-ho-ngheo',
          },
        ],
      },
    ],
  },
  {
    id: 'dan-toc-ton-giao',
    nameKey: 'nav.danTocTonGiao',
    color: 'indigo',
    groups: [
      {
        groupTitleKey: 'page.danTocTonGiaoDashboard.groupThamHoi',
        modules: [
          {
            id: 'dan-toc-ton-giao/tham-hoi/dip-tham-hoi',
            nameKey: 'page.danTocTonGiaoDashboard.dipThamHoi',
          },
          {
            id: 'dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc',
            nameKey: 'page.danTocTonGiaoDashboard.thamHoiToChuc',
          },
          {
            id: 'dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan',
            nameKey: 'page.danTocTonGiaoDashboard.thamHoiCaNhan',
          },
          {
            id: 'dan-toc-ton-giao/tham-hoi/thong-ke-tham-hoi',
            nameKey: 'page.danTocTonGiaoDashboard.thongKeThamHoi',
          },
        ],
      },
      {
        groupTitleKey: 'page.danTocTonGiaoDashboard.groupThongTin',
        modules: [
          {
            id: 'dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong',
            nameKey: 'page.danTocTonGiaoDashboard.thongTinToChucQuanTrong',
          },
          {
            id: 'dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu',
            nameKey: 'page.danTocTonGiaoDashboard.thongTinCaNhanTieuBieu',
          },
          {
            id: 'dan-toc-ton-giao/thong-tin/thong-ke-to-chuc-ca-nhan',
            nameKey: 'page.danTocTonGiaoDashboard.thongKeToChucCaNhan',
          },
        ],
      },
    ],
  },
  {
    id: 'he-thong',
    nameKey: 'nav.system',
    color: 'slate',
    groups: [
      {
        groupTitleKey: 'page.systemDashboard.orgChartGroup',
        modules: [
          { id: 'he-thong/phong-ban', nameKey: 'page.systemDashboard.department' },
          /** Route vẫn `/quan-ly-giao-viec/chuong-trinh-nam` — `module_id` đầy đủ khớp `APP_RESOURCE_TO_MODULE.annualPrograms`. */
          { id: 'quan-ly-giao-viec/chuong-trinh-nam', nameKey: 'page.taskDashboard.yearProgram' },
          { id: 'he-thong/chuc-vu', nameKey: 'page.systemDashboard.position' },
          { id: 'he-thong/nhan-vien', nameKey: 'page.systemDashboard.employee' },
        ],
      },
      {
        groupTitleKey: 'page.systemDashboard.securityGroup',
        modules: [
          { id: 'he-thong/thong-tin-to-chuc', nameKey: 'page.systemDashboard.companyInfo' },
          { id: 'he-thong/phan-quyen', nameKey: 'page.systemDashboard.permission' },
          { id: 'he-thong/danh-sach-tinh-thanh', nameKey: 'page.systemDashboard.provinceList' },
        ],
      },
    ],
  },
];

export function getAllPermissionModules(): { id: string; nameKey: string }[] {
  const list: { id: string; nameKey: string }[] = [];
  PERMISSION_FUNCTIONS.forEach((fn) => {
    fn.groups.forEach((gr) => {
      gr.modules.forEach((m) => list.push({ id: m.id, nameKey: m.nameKey }));
    });
  });
  return list;
}
