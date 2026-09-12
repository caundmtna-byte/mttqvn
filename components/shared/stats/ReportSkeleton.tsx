import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Khung chờ cho trang Thống kê / Báo cáo.
 *
 * 8 trang báo cáo trước đây chỉ render một dòng chữ "Đang tải thống kê…" — trong
 * khi đây là những trang nặng nhất (KPI + 4-6 biểu đồ Recharts + bảng tra cứu),
 * nên người dùng nhìn vào khoảng trắng rất lâu rồi nội dung nhảy vào một lúc.
 *
 * Khung này mô phỏng đúng bố cục thật để không bị giật layout khi dữ liệu về.
 */
const ReportSkeleton: React.FC<{
  /** Số thẻ KPI ở hàng trên. Mặc định 4. */
  kpiCount?: number;
  /** Số ô biểu đồ. Mặc định 2. */
  chartCount?: number;
  className?: string;
}> = ({ kpiCount = 4, chartCount = 2, className }) => (
  <div
    className={cn('space-y-4', className)}
    role="status"
    aria-busy="true"
    aria-label="Đang tải dữ liệu thống kê"
  >
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: kpiCount }).map((_, i) => (
        <div key={i} className="h-[88px] rounded-xl border border-border/50 bg-card p-4">
          <div className="h-3 w-20 bg-muted rounded animate-pulse mb-3" />
          <div className="h-6 w-16 bg-muted/70 rounded animate-pulse" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: chartCount }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/50 bg-card p-4">
          <div className="h-3.5 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="h-[240px] rounded-lg bg-muted/30 animate-pulse" />
        </div>
      ))}
    </div>

    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="h-3.5 w-32 bg-muted rounded animate-pulse mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 rounded bg-muted/30 animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

export default ReportSkeleton;
