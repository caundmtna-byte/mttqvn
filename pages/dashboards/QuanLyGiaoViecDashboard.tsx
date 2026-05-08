import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, ListTodo, FileBarChart } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const QuanLyGiaoViecDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.taskDashboard.groupMain'),
        items: [
          {
            path: '/quan-ly-giao-viec/chuong-trinh-nam',
            title: txt('page.taskDashboard.yearProgram'),
            description: txt('page.taskDashboard.yearProgramDesc'),
            icon: CalendarRange,
            color: 'bg-violet-500',
          },
          {
            path: '/quan-ly-giao-viec/cong-viec',
            title: txt('page.taskDashboard.tasks'),
            description: txt('page.taskDashboard.tasksDesc'),
            icon: ListTodo,
            color: 'bg-amber-500',
          },
          {
            path: '/quan-ly-giao-viec/bao-cao-cong-viec',
            title: txt('page.taskDashboard.taskReport'),
            description: txt('page.taskDashboard.taskReportDesc'),
            icon: FileBarChart,
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
            })
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [user, matrixActive, grantsByModule, chucVuCapBac, navigate]);

  return <ModuleDashboardLayout groups={groups} />;
};

export default QuanLyGiaoViecDashboard;
