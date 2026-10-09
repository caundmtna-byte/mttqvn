import type { LucideIcon } from 'lucide-react';

export interface PlaceholderModuleDef {
  path: string;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
  color: string;
}

export interface PlaceholderGroupDef {
  groupTitleKey: string;
  modules: PlaceholderModuleDef[];
}

/**
 * Nhóm Nhà đại đoàn kết ĐÃ RA KHỎI danh sách này: các trang đó nay là module
 * thật (`features/nha-dai-doan-ket/**`), có route riêng trong `App.tsx` và thẻ
 * riêng trong `pages/dashboards/AnSinhXaHoiDashboard.tsx`. Giữ chúng ở đây nữa
 * sẽ sinh `<Route>` placeholder đè lên route thật.
 *
 * Mảng rỗng là đúng: nhóm `/cong-tac-xa-hoi` (Công tác xã hội) không còn màn hình "sắp có" nào.
 */
export const AN_SINH_PLACEHOLDER_GROUPS: PlaceholderGroupDef[] = [];

export function flattenPlaceholderModules(groups: PlaceholderGroupDef[]): PlaceholderModuleDef[] {
  return groups.flatMap((g) => g.modules);
}
