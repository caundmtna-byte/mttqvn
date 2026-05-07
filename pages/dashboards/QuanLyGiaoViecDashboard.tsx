import React from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import { ListTodo, FileBarChart } from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';

const QuanLyGiaoViecDashboard: React.FC = () => {
  const navigate = useNavigate();

  const groups = [
    {
      groupTitle: txt('page.taskDashboard.groupMain'),
      items: [
        {
          title: txt('page.taskDashboard.tasks'),
          description: txt('page.taskDashboard.tasksDesc'),
          icon: ListTodo,
          color: 'bg-amber-500',
          action: () => navigate('/quan-ly-giao-viec/cong-viec'),
          moduleId: '/quan-ly-giao-viec/cong-viec',
        },
        {
          title: txt('page.taskDashboard.taskReport'),
          description: txt('page.taskDashboard.taskReportDesc'),
          icon: FileBarChart,
          color: 'bg-teal-500',
          action: () => navigate('/quan-ly-giao-viec/bao-cao-cong-viec'),
          moduleId: '/quan-ly-giao-viec/bao-cao-cong-viec',
        },
      ],
    },
  ];

  return <ModuleDashboardLayout groups={groups} />;
};

export default QuanLyGiaoViecDashboard;
