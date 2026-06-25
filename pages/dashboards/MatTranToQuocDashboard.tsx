import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  CalendarClock,
  CalendarDays,
  Users,
  IdCard,
  BarChart3,
  Settings,
  PieChart,
  CircleDollarSign,
  SlidersHorizontal,
} from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const MatTranToQuocDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.matTranDashboard.groupTrainingReward'),
        items: [
          {
            path: '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan',
            title: txt('page.matTranDashboard.trainingList'),
            description: txt('page.matTranDashboard.trainingListDesc'),
            icon: GraduationCap,
            color: 'bg-rose-500',
          },
          {
            path: '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong',
            title: txt('page.matTranDashboard.rewardList'),
            description: txt('page.matTranDashboard.rewardListDesc'),
            icon: Award,
            color: 'bg-teal-500',
          },
        ],
      },
      {
        groupTitle: txt('page.matTranDashboard.groupCommittee'),
        items: [
          {
            path: '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky',
            title: txt('page.matTranDashboard.term'),
            description: txt('page.matTranDashboard.termDesc'),
            icon: CalendarClock,
            color: 'bg-violet-500',
          },
          {
            path: '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop',
            title: txt('page.matTranDashboard.session'),
            description: txt('page.matTranDashboard.sessionDesc'),
            icon: CalendarDays,
            color: 'bg-cyan-500',
          },
          {
            path: '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien',
            title: txt('page.matTranDashboard.committeeMembers'),
            description: txt('page.matTranDashboard.committeeMembersDesc'),
            icon: Users,
            color: 'bg-purple-500',
          },
          {
            path: '/mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien',
            title: txt('page.matTranDashboard.committeeMemberStatsReport'),
            description: txt('page.matTranDashboard.committeeMemberStatsReportDesc'),
            icon: PieChart,
            color: 'bg-indigo-600',
          },
        ],
      },
      {
        groupTitle: txt('page.matTranDashboard.groupOtherSettings'),
        items: [
          {
            path: '/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo',
            title: txt('page.matTranDashboard.officerList'),
            description: txt('page.matTranDashboard.officerListDesc'),
            icon: IdCard,
            color: 'bg-slate-500',
          },
          {
            path: '/mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo',
            title: txt('page.matTranDashboard.officerStatsReport'),
            description: txt('page.matTranDashboard.officerStatsReportDesc'),
            icon: BarChart3,
            color: 'bg-teal-600',
          },
          {
            path: '/mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat',
            title: txt('page.matTranDashboard.setupSettings'),
            description: txt('page.matTranDashboard.setupSettingsDesc'),
            icon: Settings,
            color: 'bg-emerald-600',
          },
        ],
      },
      {
        groupTitle: txt('page.matTranDashboard.groupSalaryManagement'),
        items: [
          {
            path: '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong',
            title: txt('page.matTranDashboard.salaryIncreaseList'),
            description: txt('page.matTranDashboard.salaryIncreaseListDesc'),
            icon: CircleDollarSign,
            color: 'bg-amber-600',
          },
          {
            path: '/mat-tran-to-quoc/quan-ly-luong/thiet-lap-luong',
            title: txt('page.matTranDashboard.salarySetup'),
            description: txt('page.matTranDashboard.salarySetupDesc'),
            icon: SlidersHorizontal,
            color: 'bg-sky-600',
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

export default MatTranToQuocDashboard;
