import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Tags,
  Wallet,
  BarChart3,
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

export const AN_SINH_PLACEHOLDER_GROUPS: PlaceholderGroupDef[] = [
  {
    groupTitleKey: 'page.anSinhXaHoiDashboard.groupQuyViNguoiNgheo',
    modules: [
      {
        path: '/an-sinh-xa-hoi/quy-vi-nguoi-ngheo/so-thu-chi',
        titleKey: 'page.anSinhXaHoiDashboard.soThuChi',
        descKey: 'page.anSinhXaHoiDashboard.soThuChiDesc',
        icon: BookOpen,
        color: 'bg-pink-500',
      },
      {
        path: '/an-sinh-xa-hoi/quy-vi-nguoi-ngheo/danh-muc-chi-phi',
        titleKey: 'page.anSinhXaHoiDashboard.danhMucChiPhi',
        descKey: 'page.anSinhXaHoiDashboard.danhMucChiPhiDesc',
        icon: Tags,
        color: 'bg-fuchsia-500',
      },
      {
        path: '/an-sinh-xa-hoi/quy-vi-nguoi-ngheo/danh-muc-tai-khoan',
        titleKey: 'page.anSinhXaHoiDashboard.danhMucTaiKhoan',
        descKey: 'page.anSinhXaHoiDashboard.danhMucTaiKhoanDesc',
        icon: Wallet,
        color: 'bg-violet-500',
      },
      {
        path: '/an-sinh-xa-hoi/quy-vi-nguoi-ngheo/bao-cao-thong-ke',
        titleKey: 'page.anSinhXaHoiDashboard.baoCaoThongKe',
        descKey: 'page.anSinhXaHoiDashboard.baoCaoThongKeDesc',
        icon: BarChart3,
        color: 'bg-purple-500',
      },
    ],
  },
  {
    groupTitleKey: 'page.anSinhXaHoiDashboard.groupQuyCuuTro',
    modules: [
      {
        path: '/an-sinh-xa-hoi/quy-cuu-tro/so-thu-chi',
        titleKey: 'page.anSinhXaHoiDashboard.soThuChi',
        descKey: 'page.anSinhXaHoiDashboard.soThuChiDesc',
        icon: BookOpen,
        color: 'bg-rose-500',
      },
      {
        path: '/an-sinh-xa-hoi/quy-cuu-tro/danh-muc-chi-phi',
        titleKey: 'page.anSinhXaHoiDashboard.danhMucChiPhi',
        descKey: 'page.anSinhXaHoiDashboard.danhMucChiPhiDesc',
        icon: Tags,
        color: 'bg-orange-500',
      },
      {
        path: '/an-sinh-xa-hoi/quy-cuu-tro/danh-muc-tai-khoan',
        titleKey: 'page.anSinhXaHoiDashboard.danhMucTaiKhoan',
        descKey: 'page.anSinhXaHoiDashboard.danhMucTaiKhoanDesc',
        icon: Wallet,
        color: 'bg-amber-500',
      },
      {
        path: '/an-sinh-xa-hoi/quy-cuu-tro/bao-cao-thong-ke',
        titleKey: 'page.anSinhXaHoiDashboard.baoCaoThongKe',
        descKey: 'page.anSinhXaHoiDashboard.baoCaoThongKeDesc',
        icon: BarChart3,
        color: 'bg-yellow-600',
      },
    ],
  },
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
