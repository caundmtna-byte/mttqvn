import type { BadgeColor, BadgeConfig, BadgeConfigItem } from '@/components/ui/EnumBadge';

/** Bảng màu đa dạng cho biểu đồ (dùng chung các tab Thống kê, Báo cáo) */
export const CHART_COLORS = [
  '#6366f1', // indigo
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#ef4444', // red
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
] as const;

/** Palette HSL tương đương — dùng cho pie chart hoặc khi cần tone khớp theme */
export const CHART_COLORS_HSL = [
  'hsl(243 75% 59%)',
  'hsl(199 89% 48%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(0 72% 51%)',
  'hsl(210 40% 50%)',
  'hsl(30 80% 55%)',
  'hsl(173 58% 39%)',
] as const;

export const CHART_HEIGHT = 240;

export const CHART_FILL_FALLBACK = 'hsl(215 20% 55%)';

/** Màu fill chart khớp tone EnumBadge */
export const BADGE_COLOR_TO_CHART_FILL: Record<BadgeColor, string> = {
  primary: 'hsl(243 75% 59%)',
  emerald: 'hsl(142 71% 45%)',
  blue: 'hsl(217 91% 60%)',
  amber: 'hsl(38 92% 50%)',
  rose: 'hsl(0 72% 51%)',
  indigo: 'hsl(243 75% 59%)',
  pink: 'hsl(330 81% 60%)',
  violet: 'hsl(262 83% 58%)',
  sky: 'hsl(199 89% 48%)',
  slate: CHART_FILL_FALLBACK,
  cyan: 'hsl(199 89% 48%)',
};

/** Giới tính — khớp getUyVienGioiTinhBadgeConfig (Nam=blue, Nữ=pink, Khác=slate) */
export const GIOI_TINH_CHART_COLORS: Record<string, string> = {
  Nam: BADGE_COLOR_TO_CHART_FILL.blue,
  Nữ: BADGE_COLOR_TO_CHART_FILL.pink,
  Khác: BADGE_COLOR_TO_CHART_FILL.slate,
};

export function chartFillByIndex(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0];
}

export function chartFillByIndexHsl(index: number): string {
  return CHART_COLORS_HSL[index % CHART_COLORS_HSL.length] ?? CHART_COLORS_HSL[0];
}

/** Legacy BadgeConfig dùng `variant` thay vì `color` (info, success, …) */
const VARIANT_TO_BADGE_COLOR: Record<string, BadgeColor> = {
  primary: 'primary',
  info: 'sky',
  neutral: 'slate',
  success: 'emerald',
  warning: 'amber',
  danger: 'rose',
  secondary: 'slate',
};

type BadgeConfigItemLike = BadgeConfigItem & { variant?: string };

function resolveBadgeItemColor(item: BadgeConfigItemLike | undefined): BadgeColor {
  if (!item) return 'slate';
  if (item.color) return item.color;
  if (item.variant) return VARIANT_TO_BADGE_COLOR[item.variant] ?? 'slate';
  return 'slate';
}

export function chartFillFromBadgeConfig(
  config: BadgeConfig<string | number>,
  key: string | number | undefined | null,
): string {
  if (key == null || key === '' || key === '—') return CHART_FILL_FALLBACK;
  const item = config[key] as BadgeConfigItemLike | undefined;
  if (!item) return CHART_FILL_FALLBACK;
  return BADGE_COLOR_TO_CHART_FILL[resolveBadgeItemColor(item)] ?? CHART_FILL_FALLBACK;
}

type ChartBarRow = Record<string, unknown>;

/**
 * Chuẩn màu cột BarChart phân loại (mỗi cột một màu).
 * - Có `badgeConfig` + nhãn cột → màu khớp EnumBadge.
 * - Không có badge → palette `CHART_COLORS` theo index (đảm bảo không trùng màu liên tiếp).
 */
export function chartFillForCategoricalBar(
  row: unknown,
  index: number,
  options?: {
    badgeConfig?: BadgeConfig<string | number>;
    /** Tên field nhãn trên row, mặc định `label` */
    labelKey?: string;
  },
): string {
  const labelKey = options?.labelKey ?? 'label';
  const label =
    row != null && typeof row === 'object'
      ? (row as ChartBarRow)[labelKey]
      : undefined;

  if (options?.badgeConfig != null && label != null && label !== '') {
    return chartFillFromBadgeConfig(options.badgeConfig, label as string | number);
  }
  return chartFillByIndex(index);
}
