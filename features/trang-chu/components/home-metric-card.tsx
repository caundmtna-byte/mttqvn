import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { txt } from '@/lib/text';
import { cn } from '@/lib/utils';
import type { HomeMetricCardItem, HomeMetricTone } from '../core/types';

const TONE_ICON: Record<HomeMetricTone, string> = {
  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  info: 'bg-primary/10 text-primary',
};

const TONE_VALUE: Record<HomeMetricTone, string> = {
  danger: 'text-rose-600 dark:text-rose-400',
  warning: 'text-amber-600 dark:text-amber-400',
  info: 'text-foreground',
};

interface Props {
  item: HomeMetricCardItem;
  /** Đơn vị đếm hiển thị sau con số ("việc", "kỳ họp"). */
  unit: string;
}

/** Một ô chỉ số ở Trang chủ. Bấm vào là mở thẳng danh sách đã lọc sẵn. */
const HomeMetricCard: React.FC<Props> = ({ item, unit }) => {
  const Icon = item.icon;
  // Số 0 không phải tin xấu — làm nhạt đi để mắt chỉ dừng ở ô thật sự cần xử lý.
  const tone: HomeMetricTone = item.value > 0 ? item.tone : 'info';

  return (
    <motion.button
      type="button"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={item.onOpen}
      title={txt('page.home.metrics.openHint')}
      className="group relative w-full rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="absolute right-2.5 top-2.5 rounded-full bg-muted p-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-primary" aria-hidden />
      </div>

      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            TONE_ICON[tone],
          )}
        >
          <Icon className="h-[18px] w-[18px]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          {/* Nhãn phải đọc được nguyên câu trên điện thoại — không cắt bằng `truncate`. */}
          <p className="line-clamp-2 text-xs font-medium leading-snug text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-bold tabular-nums leading-none', TONE_VALUE[tone])}>
              {item.value}
            </span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </p>
          {item.hint ? (
            <p className="mt-1.5 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
              {item.hint}
            </p>
          ) : null}
        </div>
      </div>
    </motion.button>
  );
};

export default HomeMetricCard;
