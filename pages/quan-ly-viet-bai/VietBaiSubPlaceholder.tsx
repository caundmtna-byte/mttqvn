import React from 'react';
import { useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { FileText, Coins, BarChart3, Settings } from 'lucide-react';
import SubmenuPlaceholder from '../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../lib/text';

const SUB_CONFIG: Record<string, { titleKey: string; icon: LucideIcon }> = {
  '/quan-ly-viet-bai/bai-viet': { titleKey: 'page.articleDashboard.articles', icon: FileText },
  '/quan-ly-viet-bai/hoa-hong-viet-bai': { titleKey: 'page.articleDashboard.commission', icon: Coins },
  '/quan-ly-viet-bai/bc-thong-ke-bai-viet': { titleKey: 'page.articleDashboard.statsReport', icon: BarChart3 },
  '/quan-ly-viet-bai/thiet-lap-bai-viet': { titleKey: 'page.articleDashboard.settings', icon: Settings },
};

const VietBaiSubPlaceholder: React.FC = () => {
  const { pathname } = useLocation();
  const cfg = SUB_CONFIG[pathname];
  const title = cfg ? txt(cfg.titleKey) : pathname;

  return (
    <SubmenuPlaceholder
      title={title}
      icon={cfg?.icon}
      backTo="/quan-ly-viet-bai"
      backLabel={txt('page.articleDashboard.backToParent')}
    />
  );
};

export default VietBaiSubPlaceholder;
