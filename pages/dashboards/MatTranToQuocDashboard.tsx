import React from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Award,
  CalendarClock,
  CalendarDays,
  Users,
  IdCard,
  Settings,
} from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';

const MatTranToQuocDashboard: React.FC = () => {
  const navigate = useNavigate();

  const groups = [
    {
      groupTitle: txt('page.matTranDashboard.groupTrainingReward'),
      items: [
        {
          title: txt('page.matTranDashboard.trainingList'),
          description: txt('page.matTranDashboard.trainingListDesc'),
          icon: GraduationCap,
          color: 'bg-rose-500',
          action: () => navigate('/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan'),
          moduleId: '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan',
        },
        {
          title: txt('page.matTranDashboard.rewardList'),
          description: txt('page.matTranDashboard.rewardListDesc'),
          icon: Award,
          color: 'bg-teal-500',
          action: () => navigate('/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong'),
          moduleId: '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong',
        },
      ],
    },
    {
      groupTitle: txt('page.matTranDashboard.groupCommittee'),
      items: [
        {
          title: txt('page.matTranDashboard.term'),
          description: txt('page.matTranDashboard.termDesc'),
          icon: CalendarClock,
          color: 'bg-violet-500',
          action: () => navigate('/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky'),
          moduleId: '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky',
        },
        {
          title: txt('page.matTranDashboard.session'),
          description: txt('page.matTranDashboard.sessionDesc'),
          icon: CalendarDays,
          color: 'bg-cyan-500',
          action: () => navigate('/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop'),
          moduleId: '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop',
        },
        {
          title: txt('page.matTranDashboard.committeeMembers'),
          description: txt('page.matTranDashboard.committeeMembersDesc'),
          icon: Users,
          color: 'bg-purple-500',
          action: () => navigate('/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien'),
          moduleId: '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien',
        },
      ],
    },
    {
      groupTitle: txt('page.matTranDashboard.groupOtherSettings'),
      items: [
        {
          title: txt('page.matTranDashboard.officerList'),
          description: txt('page.matTranDashboard.officerListDesc'),
          icon: IdCard,
          color: 'bg-slate-500',
          action: () => navigate('/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo'),
          moduleId: '/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo',
        },
        {
          title: txt('page.matTranDashboard.setupSettings'),
          description: txt('page.matTranDashboard.setupSettingsDesc'),
          icon: Settings,
          color: 'bg-emerald-600',
          action: () => navigate('/mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat'),
          moduleId: '/mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat',
        },
      ],
    },
  ];

  return <ModuleDashboardLayout groups={groups} />;
};

export default MatTranToQuocDashboard;
