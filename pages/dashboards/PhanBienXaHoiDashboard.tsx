import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Settings, BarChart3 } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const PhanBienXaHoiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.phanBienXaHoiDashboard.groupMain'),
        items: [
          {
            path: '/phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi',
            title: txt('page.phanBienXaHoiDashboard.thucHien'),
            description: txt('page.phanBienXaHoiDashboard.thucHienDesc'),
            icon: Megaphone,
            color: 'bg-orange-500',
          },
          {
            path: '/phan-bien-xa-hoi/thiet-lap-danh-muc',
            title: txt('page.phanBienXaHoiDashboard.thietLapDanhMuc'),
            description: txt('page.phanBienXaHoiDashboard.thietLapDanhMucDesc'),
            icon: Settings,
            color: 'bg-amber-500',
          },
          {
            path: '/phan-bien-xa-hoi/thong-ke-phan-bien-xa-hoi',
            title: txt('page.phanBienXaHoiDashboard.thongKe'),
            description: txt('page.phanBienXaHoiDashboard.thongKeDesc'),
            icon: BarChart3,
            color: 'bg-teal-500',
          },
        ],
      },
    ];

    return raw
      .map((g) => ({
        groupTitle: g.groupTitle,
        items: g.items
          .filter((item) => {
            const res = appResourceForDashboardNavigatePath(item.path);
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

export default PhanBienXaHoiDashboard;
