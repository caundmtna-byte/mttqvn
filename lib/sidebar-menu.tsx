import type { LucideIcon } from 'lucide-react';
import { Home as HomeIcon, Copyright, Layers, Flag, FilePenLine, LayoutGrid } from 'lucide-react';

export interface MenuItem {
  path: string;
  nameKey: string;
  descriptionKey?: string;
  icon: LucideIcon;
  gradient: string;
}

/** Menu sidebar và thẻ Trang chủ — Trang chủ, các module placeholder, Hệ thống, Bản quyền */
export const SIDEBAR_MENU: MenuItem[] = [
  {
    path: '/',
    nameKey: 'nav.home',
    descriptionKey: 'page.home.systemModuleDesc',
    icon: HomeIcon,
    gradient: 'bg-gradient-to-br from-primary/90 to-primary',
  },
  {
    path: '/mat-tran-to-quoc',
    nameKey: 'nav.matTranToQuoc',
    descriptionKey: 'page.home.placeholderModuleDesc',
    icon: Flag,
    gradient: 'bg-gradient-to-br from-rose-600 to-rose-900 dark:from-rose-500 dark:to-rose-800',
  },
  {
    path: '/quan-ly-viet-bai',
    nameKey: 'nav.quanLyVietBai',
    descriptionKey: 'page.home.placeholderModuleDesc',
    icon: FilePenLine,
    gradient: 'bg-gradient-to-br from-violet-600 to-violet-900 dark:from-violet-500 dark:to-violet-800',
  },
  {
    path: '/trang-thong-tin-khac',
    nameKey: 'nav.trangThongTinKhac',
    descriptionKey: 'page.home.placeholderModuleDesc',
    icon: LayoutGrid,
    gradient: 'bg-gradient-to-br from-teal-600 to-teal-900 dark:from-teal-500 dark:to-teal-800',
  },
  {
    path: '/he-thong',
    nameKey: 'nav.system',
    descriptionKey: 'page.home.systemModuleDesc',
    icon: Layers,
    gradient: 'bg-gradient-to-br from-slate-600 to-slate-800 dark:from-slate-500 dark:to-slate-700',
  },
  {
    path: '/thong-tin-ban-quyen',
    nameKey: 'nav.licenseInfo',
    descriptionKey: 'page.home.licenseInfoDesc',
    icon: Copyright,
    gradient: 'bg-gradient-to-br from-blue-600 to-blue-800',
  },
];
