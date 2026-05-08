import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { Users, Building, Shield, Briefcase, MapPin } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const SystemDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.systemDashboard.orgChartGroup'),
        items: [
          {
            path: '/he-thong/phong-ban',
            title: txt('page.systemDashboard.department'),
            description: txt('page.systemDashboard.departmentDesc'),
            icon: Building,
            color: 'bg-indigo-500',
          },
          {
            path: '/he-thong/chuc-vu',
            title: txt('page.systemDashboard.position'),
            description: txt('page.systemDashboard.positionDesc'),
            icon: Briefcase,
            color: 'bg-blue-500',
          },
          {
            path: '/he-thong/nhan-vien',
            title: txt('page.systemDashboard.employee'),
            description: txt('page.systemDashboard.employeeDesc'),
            icon: Users,
            color: 'bg-emerald-500',
          },
        ],
      },
      {
        groupTitle: txt('page.systemDashboard.securityGroup'),
        items: [
          {
            path: '/he-thong/thong-tin-to-chuc',
            title: txt('page.systemDashboard.companyInfo'),
            description: txt('page.systemDashboard.companyInfoDesc'),
            icon: Building,
            color: 'bg-violet-500',
          },
          {
            path: '/he-thong/phan-quyen',
            title: txt('page.systemDashboard.permission'),
            description: txt('page.systemDashboard.permissionDesc'),
            icon: Shield,
            color: 'bg-rose-500',
          },
          {
            path: '/he-thong/danh-sach-tinh-thanh',
            title: txt('page.systemDashboard.provinceList'),
            description: txt('page.systemDashboard.provinceListDesc'),
            icon: MapPin,
            color: 'bg-sky-500',
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
            })
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [user, matrixActive, grantsByModule, chucVuCapBac, navigate]);

  return <ModuleDashboardLayout groups={groups} />;
};

export default SystemDashboard;
