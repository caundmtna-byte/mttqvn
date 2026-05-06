import React from 'react';
import { useLocation } from 'react-router-dom';
import SubmenuPlaceholder from '../components/placeholder/SubmenuPlaceholder';
import { SIDEBAR_MENU } from '../lib/sidebar-menu';
import { txt } from '../lib/text';

/**
 * Trang “sắp có” cho các module mở từ Trang chủ (trước khi có nội dung thật).
 */
const HomeModulePlaceholder: React.FC = () => {
  const { pathname } = useLocation();
  const item = SIDEBAR_MENU.find((m) => m.path === pathname);
  const title = item ? txt(item.nameKey) : pathname;

  return <SubmenuPlaceholder title={title} icon={item?.icon} />;
};

export default HomeModulePlaceholder;
