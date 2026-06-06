/**
 * Các mục điều hướng nhanh cho Command Palette (Cmd/Ctrl+K).
 * `nameKey` tra qua `txt()` — giữ đồng bộ với nhãn sidebar / dashboard.
 */
export interface CommandPaletteEntry {
  path: string;
  nameKey: string;
  /** Key nhóm (hiển thị section trong palette) — `nav.commandPalette.group*` */
  groupKey: string;
}

export const COMMAND_PALETTE_ENTRIES: readonly CommandPaletteEntry[] = [
  { path: '/', nameKey: 'nav.home', groupKey: 'nav.commandPalette.groupGeneral' },
  { path: '/mat-tran-to-quoc', nameKey: 'nav.matTranToQuoc', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan', nameKey: 'page.matTranDashboard.trainingList', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong', nameKey: 'page.matTranDashboard.rewardList', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky', nameKey: 'page.matTranDashboard.term', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop', nameKey: 'page.matTranDashboard.session', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien', nameKey: 'page.matTranDashboard.committeeMembers', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien', nameKey: 'page.matTranDashboard.committeeMemberStatsReport', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro', nameKey: 'page.matTranDashboard.reliefCampaign', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/hang-hoa', nameKey: 'page.matTranDashboard.reliefGoods', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho', nameKey: 'page.matTranDashboard.reliefStockTransactions', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/ton-kho', nameKey: 'page.matTranDashboard.reliefInventory', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho', nameKey: 'page.matTranDashboard.reliefWarehouseList', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro', nameKey: 'page.matTranDashboard.reliefSupportUnits', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro', nameKey: 'page.matTranDashboard.reliefSupportReport', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo', nameKey: 'page.matTranDashboard.officerList', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo', nameKey: 'page.matTranDashboard.officerStatsReport', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat', nameKey: 'page.matTranDashboard.setupSettings', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong', nameKey: 'page.matTranDashboard.salaryIncreaseList', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/mat-tran-to-quoc/quan-ly-luong/thiet-lap-luong', nameKey: 'page.matTranDashboard.salarySetup', groupKey: 'nav.commandPalette.groupMatTranToQuoc' },
  { path: '/quan-ly-viet-bai', nameKey: 'nav.quanLyVietBai', groupKey: 'nav.commandPalette.groupArticleMgmt' },
  { path: '/quan-ly-viet-bai/bai-viet', nameKey: 'page.articleDashboard.articles', groupKey: 'nav.commandPalette.groupArticleMgmt' },
  { path: '/quan-ly-viet-bai/nhuan-but-viet-bai', nameKey: 'page.articleDashboard.commission', groupKey: 'nav.commandPalette.groupArticleMgmt' },
  { path: '/quan-ly-viet-bai/bc-thong-ke-bai-viet', nameKey: 'page.articleDashboard.statsReport', groupKey: 'nav.commandPalette.groupArticleMgmt' },
  { path: '/quan-ly-viet-bai/thiet-lap-bai-viet', nameKey: 'page.articleDashboard.settings', groupKey: 'nav.commandPalette.groupArticleMgmt' },
  { path: '/quan-ly-giao-viec', nameKey: 'nav.quanLyGiaoViec', groupKey: 'nav.commandPalette.groupTaskMgmt' },
  { path: '/quan-ly-giao-viec/chuong-trinh-nam', nameKey: 'page.taskDashboard.yearProgram', groupKey: 'nav.commandPalette.groupTaskMgmt' },
  { path: '/quan-ly-giao-viec/cong-viec', nameKey: 'page.taskDashboard.tasks', groupKey: 'nav.commandPalette.groupTaskMgmt' },
  { path: '/quan-ly-giao-viec/bao-cao-cong-viec', nameKey: 'page.taskDashboard.taskReport', groupKey: 'nav.commandPalette.groupTaskMgmt' },
  { path: '/phan-bien-xa-hoi', nameKey: 'nav.phanBienXaHoi', groupKey: 'nav.commandPalette.groupGeneral' },
  { path: '/dan-toc-ton-giao', nameKey: 'nav.danTocTonGiao', groupKey: 'nav.commandPalette.groupGeneral' },
  { path: '/trang-thong-tin-khac', nameKey: 'nav.trangThongTinKhac', groupKey: 'nav.commandPalette.groupGeneral' },
  { path: '/thong-tin-ban-quyen', nameKey: 'nav.licenseInfo', groupKey: 'nav.commandPalette.groupGeneral' },
  { path: '/he-thong', nameKey: 'nav.system', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/nhan-vien', nameKey: 'page.systemDashboard.employee', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/phong-ban', nameKey: 'page.systemDashboard.department', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/chuc-vu', nameKey: 'page.systemDashboard.position', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/thong-tin-to-chuc', nameKey: 'page.systemDashboard.companyInfo', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/phan-quyen', nameKey: 'page.systemDashboard.permission', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/danh-sach-tinh-thanh', nameKey: 'page.systemDashboard.provinceList', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/ho-so', nameKey: 'nav.profile', groupKey: 'nav.commandPalette.groupAccount' },
  { path: '/thong-bao', nameKey: 'nav.notification', groupKey: 'nav.commandPalette.groupAccount' },
] as const;
