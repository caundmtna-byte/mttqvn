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
  { path: '/thong-tin-ban-quyen', nameKey: 'nav.licenseInfo', groupKey: 'nav.commandPalette.groupGeneral' },
  { path: '/he-thong', nameKey: 'nav.system', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/nhan-vien', nameKey: 'page.systemDashboard.employee', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/phong-ban', nameKey: 'page.systemDashboard.department', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/chuc-vu', nameKey: 'page.systemDashboard.position', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/thong-tin-cong-ty', nameKey: 'page.systemDashboard.companyInfo', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/he-thong/phan-quyen', nameKey: 'page.systemDashboard.permission', groupKey: 'nav.commandPalette.groupSystem' },
  { path: '/ho-so', nameKey: 'nav.profile', groupKey: 'nav.commandPalette.groupAccount' },
  { path: '/thong-bao', nameKey: 'nav.notification', groupKey: 'nav.commandPalette.groupAccount' },
] as const;
