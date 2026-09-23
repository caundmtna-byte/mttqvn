import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Hàng TabGroup của trang list — đặt NGOÀI khung card (trên nền trang), card chỉ
 * còn toolbar + bảng. Tab nằm chung nền card với toolbar thì hai lớp điều hướng
 * trông dính vào nhau. Mẫu gốc: `features/mat-tran-to-quoc/ton-kho/index.tsx`.
 *
 * Mobile cuộn ngang khi tab dài hơn màn hình.
 */
const PageTabRow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div
    className={cn(
      'shrink-0 relative z-0 px-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
      className,
    )}
  >
    {children}
  </div>
);

export default PageTabRow;
