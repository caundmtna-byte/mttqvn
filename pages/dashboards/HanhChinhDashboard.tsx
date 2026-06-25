import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { HANH_CHINH_PLACEHOLDER_GROUPS } from '../../lib/an-sinh-hanh-chinh-module-config';

const HanhChinhDashboard: React.FC = () => {
  const navigate = useNavigate();

  const groups = useMemo((): ModuleGroup[] => {
    return HANH_CHINH_PLACEHOLDER_GROUPS.map((g) => ({
      groupTitle: txt(g.groupTitleKey),
      items: g.modules.map(
        (item): ModuleItem => ({
          title: txt(item.titleKey),
          description: txt(item.descKey),
          icon: item.icon,
          color: item.color,
          moduleId: item.path,
          action: () => navigate(item.path),
        }),
      ),
    }));
  }, [navigate]);

  return <ModuleDashboardLayout groups={groups} />;
};

export default HanhChinhDashboard;
