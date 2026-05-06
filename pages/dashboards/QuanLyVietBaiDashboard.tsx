import React from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { FileText, Coins, BarChart3, Settings } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';

const QuanLyVietBaiDashboard: React.FC = () => {
  const navigate = useNavigate();

  const groups = [
    {
      groupTitle: txt('page.articleDashboard.groupMain'),
      items: [
        {
          title: txt('page.articleDashboard.articles'),
          description: txt('page.articleDashboard.articlesDesc'),
          icon: FileText,
          color: 'bg-violet-500',
          action: () => navigate('/quan-ly-viet-bai/bai-viet'),
        },
        {
          title: txt('page.articleDashboard.commission'),
          description: txt('page.articleDashboard.commissionDesc'),
          icon: Coins,
          color: 'bg-amber-500',
          action: () => navigate('/quan-ly-viet-bai/hoa-hong-viet-bai'),
        },
        {
          title: txt('page.articleDashboard.statsReport'),
          description: txt('page.articleDashboard.statsReportDesc'),
          icon: BarChart3,
          color: 'bg-teal-500',
          action: () => navigate('/quan-ly-viet-bai/bc-thong-ke-bai-viet'),
        },
        {
          title: txt('page.articleDashboard.settings'),
          description: txt('page.articleDashboard.settingsDesc'),
          icon: Settings,
          color: 'bg-slate-500',
          action: () => navigate('/quan-ly-viet-bai/thiet-lap-bai-viet'),
        },
      ],
    },
  ];

  return <ModuleDashboardLayout groups={groups} />;
};

export default QuanLyVietBaiDashboard;
