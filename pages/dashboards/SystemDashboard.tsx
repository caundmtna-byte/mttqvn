import React from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { Users, Building, Shield, Briefcase, MapPin } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';

const SystemDashboard: React.FC = () => {
  const navigate = useNavigate();

  const groups = [
    {
      groupTitle: txt('page.systemDashboard.orgChartGroup'),
      items: [
        {
          title: txt('page.systemDashboard.department'),
          description: txt('page.systemDashboard.departmentDesc'),
          icon: Building,
          color: 'bg-indigo-500',
          action: () => navigate('/he-thong/phong-ban'),
        },
        {
          title: txt('page.systemDashboard.position'),
          description: txt('page.systemDashboard.positionDesc'),
          icon: Briefcase,
          color: 'bg-blue-500',
          action: () => navigate('/he-thong/chuc-vu'),
        },
        {
          title: txt('page.systemDashboard.employee'),
          description: txt('page.systemDashboard.employeeDesc'),
          icon: Users,
          color: 'bg-emerald-500',
          action: () => navigate('/he-thong/nhan-vien'),
        },
      ],
    },
    {
      groupTitle: txt('page.systemDashboard.securityGroup'),
      items: [
        {
          title: txt('page.systemDashboard.companyInfo'),
          description: txt('page.systemDashboard.companyInfoDesc'),
          icon: Building,
          color: 'bg-violet-500',
          action: () => navigate('/he-thong/thong-tin-to-chuc'),
        },
        {
          title: txt('page.systemDashboard.permission'),
          description: txt('page.systemDashboard.permissionDesc'),
          icon: Shield,
          color: 'bg-rose-500',
          action: () => navigate('/he-thong/phan-quyen'),
        },
        {
          title: txt('page.systemDashboard.provinceList'),
          description: txt('page.systemDashboard.provinceListDesc'),
          icon: MapPin,
          color: 'bg-sky-500',
          action: () => navigate('/he-thong/danh-sach-tinh-thanh'),
        },
      ],
    },
  ];

  return <ModuleDashboardLayout groups={groups} />;
};

export default SystemDashboard;
