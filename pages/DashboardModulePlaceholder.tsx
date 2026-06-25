import React from 'react';
import { useLocation } from 'react-router-dom';
import { HeartHandshake, Building2 } from 'lucide-react';
import SubmenuPlaceholder from '../components/placeholder/SubmenuPlaceholder';
import { txt } from '../lib/text';
import {
  AN_SINH_PLACEHOLDER_GROUPS,
  HANH_CHINH_PLACEHOLDER_GROUPS,
  flattenPlaceholderModules,
} from '../lib/an-sinh-hanh-chinh-module-config';

const PATH_TO_TITLE_KEY = Object.fromEntries(
  [
    ...flattenPlaceholderModules(AN_SINH_PLACEHOLDER_GROUPS),
    ...flattenPlaceholderModules(HANH_CHINH_PLACEHOLDER_GROUPS),
  ].map((m) => [m.path, m.titleKey]),
);

const DashboardModulePlaceholder: React.FC = () => {
  const { pathname } = useLocation();
  const titleKey = PATH_TO_TITLE_KEY[pathname];
  const title = titleKey ? txt(titleKey) : pathname;

  const isAnSinh = pathname.startsWith('/an-sinh-xa-hoi/');
  const backTo = isAnSinh ? '/an-sinh-xa-hoi' : '/hanh-chinh';
  const backLabelKey = isAnSinh
    ? 'page.anSinhXaHoiDashboard.backToParent'
    : 'page.hanhChinhDashboard.backToParent';
  const icon = isAnSinh ? HeartHandshake : Building2;

  return (
    <SubmenuPlaceholder
      title={title}
      icon={icon}
      backTo={backTo}
      backLabel={txt(backLabelKey)}
    />
  );
};

export default DashboardModulePlaceholder;
