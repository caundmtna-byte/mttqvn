import React from 'react';
import { txt } from '../../lib/text';
import type { LucideIcon } from 'lucide-react';
import ComingSoonLayout from './ComingSoonLayout';

interface SubmenuPlaceholderProps {
  title: string;
  /** Icon của module/submenu (cùng icon trên Trang chủ) */
  icon?: LucideIcon;
  /** Nội dung tùy chọn (vd: danh sách link module) */
  children?: React.ReactNode;
}

/**
 * Trang placeholder cho submenu (vd: Hành chính, Nhân sự).
 * Dùng layout "Đang phát triển" với nút "Quay lại trang chủ".
 */
const SubmenuPlaceholder: React.FC<SubmenuPlaceholderProps> = ({ title, icon, children }) => {
  const description = txt('page.placeholder.descriptionWithModule', { name: title });

  return (
    <ComingSoonLayout
      title={title}
      description={description}
      icon={icon}
      backLabel={txt('page.placeholder.backToHome')}
      backTo="/"
      titlePrimary
    >
      {children}
    </ComingSoonLayout>
  );
};

export default SubmenuPlaceholder;
