import type { LucideIcon } from 'lucide-react';
import {
  Home as HomeIcon,
  Copyright,
  Layers,
  Flag,
  FilePenLine,
  ClipboardList,
  Megaphone,
  UsersRound,
  LayoutGrid,
} from 'lucide-react';

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
    descriptionKey: 'page.home.matTranModuleDesc',
    icon: Flag,
    gradient: 'bg-gradient-to-br from-rose-600 to-rose-900 dark:from-rose-500 dark:to-rose-800',
  },
  {
    path: '/quan-ly-viet-bai',
    nameKey: 'nav.quanLyVietBai',
    descriptionKey: 'page.home.vietBaiModuleDesc',
    icon: FilePenLine,
    gradient: 'bg-gradient-to-br from-violet-600 to-violet-900 dark:from-violet-500 dark:to-violet-800',
  },
  {
    path: '/quan-ly-giao-viec',
    nameKey: 'nav.quanLyGiaoViec',
    descriptionKey: 'page.home.taskMgmtModuleDesc',
    icon: ClipboardList,
    gradient: 'bg-gradient-to-br from-amber-600 to-amber-900 dark:from-amber-500 dark:to-amber-800',
  },
  {
    path: '/phan-bien-xa-hoi',
    nameKey: 'nav.phanBienXaHoi',
    descriptionKey: 'page.home.phanBienModuleDesc',
    icon: Megaphone,
    gradient: 'bg-gradient-to-br from-orange-600 to-orange-900 dark:from-orange-500 dark:to-orange-800',
  },
  {
    path: '/dan-toc-ton-giao',
    nameKey: 'nav.danTocTonGiao',
    descriptionKey: 'page.home.danTocModuleDesc',
    icon: UsersRound,
    gradient: 'bg-gradient-to-br from-indigo-600 to-indigo-900 dark:from-indigo-500 dark:to-indigo-800',
  },
  {
    path: '/trang-thong-tin-khac',
    nameKey: 'nav.trangThongTinKhac',
    descriptionKey: 'page.home.trangThongTinKhacModuleDesc',
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
