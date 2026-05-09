import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { FileText, Coins, BarChart3, Settings } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const QuanLyVietBaiDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.articleDashboard.groupMain'),
        items: [
          {
            path: '/quan-ly-viet-bai/bai-viet',
            title: txt('page.articleDashboard.articles'),
            description: txt('page.articleDashboard.articlesDesc'),
            icon: FileText,
            color: 'bg-violet-500',
          },
          {
            path: '/quan-ly-viet-bai/nhuan-but-viet-bai',
            title: txt('page.articleDashboard.commission'),
            description: txt('page.articleDashboard.commissionDesc'),
            icon: Coins,
            color: 'bg-amber-500',
          },
          {
            path: '/quan-ly-viet-bai/bc-thong-ke-bai-viet',
            title: txt('page.articleDashboard.statsReport'),
            description: txt('page.articleDashboard.statsReportDesc'),
            icon: BarChart3,
            color: 'bg-teal-500',
          },
          {
            path: '/quan-ly-viet-bai/thiet-lap-bai-viet',
            title: txt('page.articleDashboard.settings'),
            description: txt('page.articleDashboard.settingsDesc'),
            icon: Settings,
            color: 'bg-slate-500',
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

export default QuanLyVietBaiDashboard;
