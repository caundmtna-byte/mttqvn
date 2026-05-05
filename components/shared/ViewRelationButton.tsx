import React from 'react';
import { ExternalLink } from 'lucide-react';
import Tooltip from '../ui/Tooltip';

export interface ViewRelationButtonProps {
  /** Nội dung tooltip khi hover (vd: "Xem chiến dịch", "Xem thông tin tài khoản") */
  tooltip: string;
  /** Gọi khi click nút */
  onClick: () => void;
  /** aria-label cho accessibility (mặc định = tooltip) */
  ariaLabel?: string;
  /** Vô hiệu hóa nút */
  disabled?: boolean;
  /** Icon tùy chỉnh (mặc định ExternalLink 14) */
  icon?: React.ReactNode;
  /** placement tooltip */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * Nút icon "Xem liên kết" dùng trong detail/form – cùng giao diện và hành vi với
 * nút "Xem chiến dịch" trong Chi phí chiến dịch: Tooltip + nút tròn, primary.
 * Dùng bên cạnh text (truncate) trong DetailField value hoặc cạnh Combobox.
 */
const ViewRelationButton: React.FC<ViewRelationButtonProps> = ({
  tooltip,
  onClick,
  ariaLabel,
  disabled = false,
  icon,
  placement = 'top',
  className,
}) => (
  <Tooltip content={tooltip} placement={placement}>
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? tooltip}
      className={
        className ??
        'shrink-0 p-1 rounded-md text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:pointer-events-none'
      }
    >
      {icon ?? <ExternalLink size={14} />}
    </button>
  </Tooltip>
);

export default ViewRelationButton;
