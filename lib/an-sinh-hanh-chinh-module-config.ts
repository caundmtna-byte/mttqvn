import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Hammer,
  Package,
  ArrowLeftRight,
  Coins,
  Settings,
  Car,
  History,
} from 'lucide-react';

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
 * Hai nhóm Quỹ (Vì người nghèo, Cứu trợ) ĐÃ RA KHỎI danh sách này: tám trang đó
 * nay là module thật (`features/quy/**`), có route riêng trong `App.tsx` và thẻ
 * riêng trong `pages/dashboards/AnSinhXaHoiDashboard.tsx`. Giữ chúng ở đây nữa
 * sẽ sinh `<Route>` placeholder đè lên route thật.
 */
export const AN_SINH_PLACEHOLDER_GROUPS: PlaceholderGroupDef[] = [
  {
    groupTitleKey: 'page.anSinhXaHoiDashboard.groupNhaDaiDoanKet',
    modules: [
      {
        path: '/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach',
        titleKey: 'page.anSinhXaHoiDashboard.danhSachNhaDaiDoanKet',
        descKey: 'page.anSinhXaHoiDashboard.danhSachNhaDaiDoanKetDesc',
        icon: Home,
        color: 'bg-emerald-500',
      },
      {
        path: '/an-sinh-xa-hoi/nha-dai-doan-ket/sua-chua-nang-cap',
        titleKey: 'page.anSinhXaHoiDashboard.suaChuaNangCap',
        descKey: 'page.anSinhXaHoiDashboard.suaChuaNangCapDesc',
        icon: Hammer,
        color: 'bg-teal-500',
      },
    ],
  },
];

export const HANH_CHINH_PLACEHOLDER_GROUPS: PlaceholderGroupDef[] = [
  {
    groupTitleKey: 'page.hanhChinhDashboard.groupQuanLyTaiSan',
    modules: [
      {
        path: '/hanh-chinh/quan-ly-tai-san/danh-sach-tai-san',
        titleKey: 'page.hanhChinhDashboard.danhSachTaiSan',
        descKey: 'page.hanhChinhDashboard.danhSachTaiSanDesc',
        icon: Package,
        color: 'bg-sky-500',
      },
      {
        path: '/hanh-chinh/quan-ly-tai-san/cap-phat-thu-hoi-luan-chuyen',
        titleKey: 'page.hanhChinhDashboard.capPhatThuHoiLuanChuyen',
        descKey: 'page.hanhChinhDashboard.capPhatThuHoiLuanChuyenDesc',
        icon: ArrowLeftRight,
        color: 'bg-blue-500',
      },
      {
        path: '/hanh-chinh/quan-ly-tai-san/chi-phi-tai-san',
        titleKey: 'page.hanhChinhDashboard.chiPhiTaiSan',
        descKey: 'page.hanhChinhDashboard.chiPhiTaiSanDesc',
        icon: Coins,
        color: 'bg-indigo-500',
      },
      {
        path: '/hanh-chinh/quan-ly-tai-san/thiet-lap-danh-muc',
        titleKey: 'page.hanhChinhDashboard.thietLapDanhMuc',
        descKey: 'page.hanhChinhDashboard.thietLapDanhMucDesc',
        icon: Settings,
        color: 'bg-violet-500',
      },
    ],
  },
  {
    groupTitleKey: 'page.hanhChinhDashboard.groupQuanLyXe',
    modules: [
      {
        path: '/hanh-chinh/quan-ly-xe/danh-sach-xe',
        titleKey: 'page.hanhChinhDashboard.danhSachXe',
        descKey: 'page.hanhChinhDashboard.danhSachXeDesc',
        icon: Car,
        color: 'bg-cyan-500',
      },
      {
        path: '/hanh-chinh/quan-ly-xe/lich-su-su-dung',
        titleKey: 'page.hanhChinhDashboard.lichSuSuDung',
        descKey: 'page.hanhChinhDashboard.lichSuSuDungDesc',
        icon: History,
        color: 'bg-teal-500',
      },
      {
        path: '/hanh-chinh/quan-ly-xe/chi-phi-xe',
        titleKey: 'page.hanhChinhDashboard.chiPhiXe',
        descKey: 'page.hanhChinhDashboard.chiPhiXeDesc',
        icon: Coins,
        color: 'bg-emerald-500',
      },
      {
        path: '/hanh-chinh/quan-ly-xe/thiet-lap-danh-muc',
        titleKey: 'page.hanhChinhDashboard.thietLapDanhMuc',
        descKey: 'page.hanhChinhDashboard.thietLapDanhMucDesc',
        icon: Settings,
        color: 'bg-green-600',
      },
    ],
  },
];

export function flattenPlaceholderModules(groups: PlaceholderGroupDef[]): PlaceholderModuleDef[] {
  return groups.flatMap((g) => g.modules);
}
