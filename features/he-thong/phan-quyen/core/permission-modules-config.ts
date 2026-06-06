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

export const PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'admin', 'all'] as const;
export type PermissionActionType = (typeof PERMISSION_ACTIONS)[number];

/** Thứ tự submenu = thứ tự mục trong sidebar (sau Trang chủ), bỏ qua placeholder / bản quyền. */
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
        groupTitleKey: 'page.matTranDashboard.groupReliefWarehouse',
        modules: [
          { id: 'mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro', nameKey: 'page.matTranDashboard.reliefCampaign' },
          { id: 'mat-tran-to-quoc/kho-cuu-tro/hang-hoa', nameKey: 'page.matTranDashboard.reliefGoods' },
          { id: 'mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho', nameKey: 'page.matTranDashboard.reliefStockTransactions' },
          { id: 'mat-tran-to-quoc/kho-cuu-tro/ton-kho', nameKey: 'page.matTranDashboard.reliefInventory' },
          { id: 'mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho', nameKey: 'page.matTranDashboard.reliefWarehouseList' },
          { id: 'mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro', nameKey: 'page.matTranDashboard.reliefSupportUnits' },
          { id: 'mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro', nameKey: 'page.matTranDashboard.reliefSupportReport' },
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
