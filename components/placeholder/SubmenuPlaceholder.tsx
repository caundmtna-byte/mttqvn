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
  /** Mặc định "/" — dùng khi placeholder nằm trong submenu (vd. quay lại dashboard cha) */
  backTo?: string;
  /** Mặc định nhãn "Quay lại trang chủ" */
  backLabel?: string;
}

/**
 * Trang placeholder cho submenu (vd: Hành chính, Nhân sự).
 * Dùng layout "Đang phát triển" với nút quay lại (trang chủ hoặc dashboard cha).
 */
const SubmenuPlaceholder: React.FC<SubmenuPlaceholderProps> = ({
  title,
  icon,
  children,
  backTo = '/',
  backLabel,
}) => {
  const description = txt('page.placeholder.descriptionWithModule', { name: title });

  return (
    <ComingSoonLayout
      title={title}
      description={description}
      icon={icon}
      backLabel={backLabel ?? txt('page.placeholder.backToHome')}
      backTo={backTo}
      titlePrimary
    >
      {children}
    </ComingSoonLayout>
  );
};

export default SubmenuPlaceholder;
