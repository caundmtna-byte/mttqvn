import React from 'react';
import { cn } from '@/lib/utils';

export interface DetailSummaryCardProps {
  /** Cột trái: avatar, ô icon gradient (`DetailSummaryIconTile`), hoặc node tuỳ biến */
  leading: React.ReactNode;
  /** Tiêu đề chính (tên thực thể) */
  title: React.ReactNode;
  /** Badge trạng thái — cùng hàng với title, canh phải */
  badge?: React.ReactNode;
  /** Hàng phụ: mã, @tài khoản, khoảng thời gian, … */
  subtitle?: React.ReactNode;
  /** Thêm meta (vd. phòng ban) — render bên dưới subtitle */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Card tóm tắt đầu nội dung detail (trên DetailToolbar).
 * Bố cục chuẩn: leading | (title + badge) / subtitle / children — thống nhất với Nhân viên, Chức vụ.
 */
export const DetailSummaryCard: React.FC<DetailSummaryCardProps> = ({
  leading,
  title,
  badge,
  subtitle,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4',
        className,
      )}
    >
      {leading}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <h2 className="text-base font-bold text-foreground leading-tight truncate flex-1 min-w-0">
            {title}
          </h2>
          {badge != null ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {subtitle != null ? (
          <div className="text-body-sm text-muted-foreground min-w-0">{subtitle}</div>
        ) : null}
        {children}
      </div>
    </div>
  );
};

/** Ô icon gradient 64×64 — cùng quy mô cột trái với avatar detail Nhân viên. */
export const DetailSummaryIconTile: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div
    className={cn(
      'h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0',
      className,
    )}
  >
    {children}
  </div>
);

export default DetailSummaryCard;
