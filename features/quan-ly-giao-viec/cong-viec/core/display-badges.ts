import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { cn } from '@/lib/utils';
import type { CongViecMucDo, CongViecTrangThai } from './constants';
import type { CongViecDanhSach } from './types';
import { daysFromDeadline } from '../utils/deadline-progress';

export const CONG_VIEC_TRANG_THAI_BADGE_CONFIG: BadgeConfig<CongViecTrangThai> = {
  Mới: { label: 'Mới', color: 'sky' },
  'Đang thực hiện': { label: 'Đang thực hiện', color: 'blue' },
  'Hoàn thành': { label: 'Hoàn thành', color: 'emerald' },
  'Tạm dừng': { label: 'Tạm dừng', color: 'amber' },
  Hủy: { label: 'Hủy', color: 'rose' },
};

export const CONG_VIEC_MUC_DO_BADGE_CONFIG: BadgeConfig<CongViecMucDo> = {
  Thấp: { label: 'Thấp', color: 'slate' },
  'Trung bình': { label: 'Trung bình', color: 'blue' },
  Cao: { label: 'Cao', color: 'amber' },
  Khẩn: { label: 'Khẩn', color: 'rose' },
};

/** Viền pill đồng bộ EnumBadge (deadline / tiến độ theo hạn). */
const CHIP: Record<'slate' | 'rose' | 'amber' | 'emerald', string> = {
  slate:
    'bg-muted/80 text-muted-foreground border-border dark:bg-muted/40',
  rose: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:border-rose-900',
  amber:
    'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-900',
  emerald:
    'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-900',
};

export type CongViecDeadlineChipTone = keyof typeof CHIP;

function deadlineTone(
  thoiHan: string | null,
  trangThai: CongViecDanhSach['trang_thai'],
): CongViecDeadlineChipTone {
  if (trangThai === 'Hủy' || trangThai === 'Hoàn thành') return 'slate';
  if (!thoiHan) return 'slate';
  const d = daysFromDeadline(thoiHan);
  if (d == null) return 'slate';
  if (d < 0) return 'rose';
  if (d === 0) return 'amber';
  if (d <= 3) return 'amber';
  return 'emerald';
}

/** Màu chip cho cột / trường “tiến độ theo hạn”. */
export function congViecTienDoChipTone(
  thoiHan: string | null,
  trangThai: CongViecDanhSach['trang_thai'],
): CongViecDeadlineChipTone {
  return deadlineTone(thoiHan, trangThai);
}

/** Màu chip cho ngày thời hạn (khi việc còn xử lý). */
export function congViecThoiHanChipTone(
  thoiHan: string | null,
  trangThai: CongViecDanhSach['trang_thai'],
): CongViecDeadlineChipTone {
  return deadlineTone(thoiHan, trangThai);
}

export function congViecDeadlineChipClass(tone: CongViecDeadlineChipTone, extra?: string): string {
  return cn(
    'inline-flex max-w-full min-w-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums',
    CHIP[tone],
    extra,
  );
}
