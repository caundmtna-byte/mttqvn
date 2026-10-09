import React from 'react';
import { useLocation } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import SubmenuPlaceholder from '../components/placeholder/SubmenuPlaceholder';
import { txt } from '../lib/text';
import {
  AN_SINH_PLACEHOLDER_GROUPS,
  flattenPlaceholderModules,
} from '../lib/an-sinh-module-config';

const PATH_TO_TITLE_KEY = Object.fromEntries(
  flattenPlaceholderModules(AN_SINH_PLACEHOLDER_GROUPS).map((m) => [m.path, m.titleKey]),
);

const DashboardModulePlaceholder: React.FC = () => {
  const { pathname } = useLocation();
  const titleKey = PATH_TO_TITLE_KEY[pathname];
  const title = titleKey ? txt(titleKey) : pathname;

  return (
    <SubmenuPlaceholder
      title={title}
      icon={HeartHandshake}
      backTo="/cong-tac-xa-hoi"
      backLabel={txt('page.anSinhXaHoiDashboard.backToParent')}
    />
  );
};

export default DashboardModulePlaceholder;
