/**
 * Generic components cho các màn Thống kê / Báo cáo.
 * Dùng chung cho: Nhân viên (nhan-vien-stats), Báo cáo công việc (bao-cao), và các module thống kê sau này.
 *
 * Chuẩn layout màn báo cáo/thống kê:
 * - DashboardToolbar (filters, actions, filterGroups, activeFilterCount, onClearFilters, onBack)
 * - StatsKpiGrid (các thẻ KPI: icon, label, value, pct, delta)
 * - StatsCard / StatsTableCard (biểu đồ hoặc bảng 2 cột)
 *
 * BarChart phân loại (mỗi cột một màu):
 * - Luôn dùng `ColoredBar` + `getFill` (không dùng `<Bar fill="…">` một màu).
 * - Có EnumBadge: `getFill={(row, i) => chartFillForCategoricalBar(row, i, { badgeConfig, labelKey: 'label' })}`
 * - Không badge: `getFill={(row, i) => chartFillForCategoricalBar(row, i)}` hoặc `chartFillByIndex(i)`.
 * - Helper: `@/lib/constants/chart-colors` (`chartFillForCategoricalBar`, `chartFillFromBadgeConfig`).
 *
 * Khoảng thời gian & filter chip:
 * - Preset ngày: `buildStandardDateRangePresets()` + `resolveStandardDateRange()` từ `@/lib/date-range-presets`.
 * - Nhiều chip dimension: `DashboardToolbar` + `FilterChipOverflowRow` (mặc định 2 chip + nút …).
 *
 * Types: StatsKpiCardItem, StatsTableRow, StatsTableCardProps (xem types.ts).
 */

export { default as StatsKpiGrid } from './StatsKpiGrid';
export { default as StatsCard } from './StatsCard';
export { default as StatsTableCard } from './StatsTableCard';
export { default as StatsTrendBadge } from './StatsTrendBadge';
export { default as ColoredBar } from './ColoredBar';
export type {
  StatsKpiCardItem,
  StatsTableRow,
  StatsTableCardProps,
} from './types';
