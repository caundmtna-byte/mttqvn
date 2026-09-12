import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import {
  HandHeart,
  Package,
  ArrowLeftRight,
  Warehouse,
  PackageCheck,
  Building2,
  BarChart3,
  BookOpen,
  Tags,
  Wallet,
  Home,
} from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can, type AppResource } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';
import { AN_SINH_PLACEHOLDER_GROUPS } from '../../lib/an-sinh-hanh-chinh-module-config';

/**
 * Bốn trang của MỖI quỹ. Hai quỹ dùng chung một bộ màn hình nên cũng dùng chung
 * `AppResource` — `appResourceForDashboardNavigatePath()` không suy ra được từ
 * đường dẫn (đường dẫn có tên quỹ, `module_id` thì không), nên gắn thẳng ở đây.
 */
function buildQuyItems(
  segment: 'quy-vi-nguoi-ngheo' | 'quy-cuu-tro',
  colors: { soThuChi: string; danhMucChiPhi: string; danhMucTaiKhoan: string; baoCao: string },
) {
  const base = `/an-sinh-xa-hoi/${segment}`;
  return [
    {
      path: `${base}/so-thu-chi`,
      resource: 'quySoThuChi' as const,
      title: txt('page.anSinhXaHoiDashboard.soThuChi'),
      description: txt('page.anSinhXaHoiDashboard.soThuChiDesc'),
      icon: BookOpen,
      color: colors.soThuChi,
    },
    {
      path: `${base}/danh-muc-chi-phi`,
      resource: 'quyDanhMucKhoan' as const,
      title: txt('page.anSinhXaHoiDashboard.danhMucChiPhi'),
      description: txt('page.anSinhXaHoiDashboard.danhMucChiPhiDesc'),
      icon: Tags,
      color: colors.danhMucChiPhi,
    },
    {
      path: `${base}/danh-muc-tai-khoan`,
      resource: 'quyDanhMucTaiKhoan' as const,
      title: txt('page.anSinhXaHoiDashboard.danhMucTaiKhoan'),
      description: txt('page.anSinhXaHoiDashboard.danhMucTaiKhoanDesc'),
      icon: Wallet,
      color: colors.danhMucTaiKhoan,
    },
    {
      path: `${base}/bao-cao-thong-ke`,
      resource: 'quyBaoCaoThongKe' as const,
      title: txt('page.anSinhXaHoiDashboard.baoCaoThongKe'),
      description: txt('page.anSinhXaHoiDashboard.baoCaoThongKeDesc'),
      icon: BarChart3,
      color: colors.baoCao,
    },
  ];
}

const AnSinhXaHoiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & {
      path: string;
      placeholder?: boolean;
      /** Ghi đè resource khi không suy được từ đường dẫn (các trang quỹ). */
      resource?: AppResource;
    };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.matTranDashboard.groupReliefWarehouse'),
        items: [
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro',
            title: txt('page.matTranDashboard.reliefCampaign'),
            description: txt('page.matTranDashboard.reliefCampaignDesc'),
            icon: HandHeart,
            color: 'bg-rose-500',
          },
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/hang-hoa',
            title: txt('page.matTranDashboard.reliefGoods'),
            description: txt('page.matTranDashboard.reliefGoodsDesc'),
            icon: Package,
            color: 'bg-orange-500',
          },
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho',
            title: txt('page.matTranDashboard.reliefStockTransactions'),
            description: txt('page.matTranDashboard.reliefStockTransactionsDesc'),
            icon: ArrowLeftRight,
            color: 'bg-blue-500',
          },
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/ton-kho',
            title: txt('page.matTranDashboard.reliefInventory'),
            description: txt('page.matTranDashboard.reliefInventoryDesc'),
            icon: PackageCheck,
            color: 'bg-emerald-500',
          },
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/danh-sach-kho',
            title: txt('page.matTranDashboard.reliefWarehouseList'),
            description: txt('page.matTranDashboard.reliefWarehouseListDesc'),
            icon: Warehouse,
            color: 'bg-slate-500',
          },
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/don-vi-cuu-tro',
            title: txt('page.matTranDashboard.reliefSupportUnits'),
            description: txt('page.matTranDashboard.reliefSupportUnitsDesc'),
            icon: Building2,
            color: 'bg-indigo-500',
          },
          {
            path: '/an-sinh-xa-hoi/kho-cuu-tro/bao-cao-ho-tro',
            title: txt('page.matTranDashboard.reliefSupportReport'),
            description: txt('page.matTranDashboard.reliefSupportReportDesc'),
            icon: BarChart3,
            color: 'bg-teal-600',
          },
        ],
      },
      {
        groupTitle: txt('page.anSinhXaHoiDashboard.groupQuyViNguoiNgheo'),
        items: buildQuyItems('quy-vi-nguoi-ngheo', {
          soThuChi: 'bg-pink-500',
          danhMucChiPhi: 'bg-fuchsia-500',
          danhMucTaiKhoan: 'bg-violet-500',
          baoCao: 'bg-purple-500',
        }),
      },
      {
        groupTitle: txt('page.anSinhXaHoiDashboard.groupQuyCuuTro'),
        items: buildQuyItems('quy-cuu-tro', {
          soThuChi: 'bg-rose-500',
          danhMucChiPhi: 'bg-orange-500',
          danhMucTaiKhoan: 'bg-amber-500',
          baoCao: 'bg-yellow-600',
        }),
      },
      {
        groupTitle: txt('page.anSinhXaHoiDashboard.groupNhaDaiDoanKet'),
        items: [
          {
            path: '/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach',
            resource: 'nhaDaiDoanKetList' as const,
            title: txt('page.anSinhXaHoiDashboard.danhSachNhaDaiDoanKet'),
            description: txt('page.anSinhXaHoiDashboard.danhSachNhaDaiDoanKetDesc'),
            icon: Home,
            color: 'bg-emerald-500',
          },
          {
            path: '/an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke',
            resource: 'nhaDaiDoanKetThongKe' as const,
            title: txt('page.anSinhXaHoiDashboard.thongKeNhaDaiDoanKet'),
            description: txt('page.anSinhXaHoiDashboard.thongKeNhaDaiDoanKetDesc'),
            icon: BarChart3,
            color: 'bg-teal-500',
          },
        ],
      },
      // Nhóm An sinh không còn màn hình "sắp có"; spread giữ lại để nhóm mới
      // thêm vào `AN_SINH_PLACEHOLDER_GROUPS` tự hiện mà không phải sửa file này.
      ...AN_SINH_PLACEHOLDER_GROUPS.map((g) => ({
        groupTitle: txt(g.groupTitleKey),
        items: g.modules.map((item) => ({
          path: item.path,
          title: txt(item.titleKey),
          description: txt(item.descKey),
          icon: item.icon,
          color: item.color,
          placeholder: true as const,
        })),
      })),
    ];

    return raw
      .map((g) => ({
        groupTitle: g.groupTitle,
        items: g.items
          .filter((item) => {
            if (item.placeholder) return true;
            const res = item.resource ?? appResourceForDashboardNavigatePath(item.path);
            if (!user || res == null) return true;
            return can(user, 'view', res);
          })
          .map(
            (item): ModuleItem => ({
              title: item.title,
              description: item.description,
              icon: item.icon,
              color: item.color,
              action: () => navigate(item.path),
            }),
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [user, matrixActive, grantsByModule, chucVuCapBac, navigate]);

  return <ModuleDashboardLayout groups={groups} />;
};

export default AnSinhXaHoiDashboard;
