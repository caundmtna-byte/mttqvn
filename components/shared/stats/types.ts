/**
 * Generic types cho các module Thống kê / Báo cáo.
 * Các module (nhân viên, công việc, v.v.) dùng chung để chuẩn hóa UI.
 */

import type { LucideIcon } from 'lucide-react';

/** Một thẻ KPI trong lưới tổng quan (số liệu, icon, phần trăm, xu hướng) */
export interface StatsKpiCardItem {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** Tailwind text color, e.g. 'text-primary' */
  color?: string;
  /** Tailwind bg color, e.g. 'bg-primary/10' */
  bg?: string;
  /** Hiển thị phụ, e.g. '45%' */
  pct?: string | null;
  /** Thay đổi so kỳ (để hiển thị badge xu hướng). null = ẩn */
  delta?: number | null;
}

/** Một dòng trong bảng thống kê đơn giản (2 cột: nhãn + giá trị) */
export interface StatsTableRow {
  /** Cột 1: tên / nhãn */
  label: string;
  /** Cột 2: số hoặc chuỗi */
  value: number | string;
  /** Optional key for row (e.g. id) */
  id?: string;
}

/** Props cho card bảng thống kê 2 cột */
export interface StatsTableCardProps {
  title: string;
  /** Icon hiển thị cạnh title */
  icon?: LucideIcon;
  /** Dữ liệu bảng */
  rows: StatsTableRow[];
  /** Key cột 1 (i18n) */
  columnLabelKey?: string;
  /** Key cột 2 (i18n) */
  columnValueKey?: string;
  /** Chiều cao tối đa vùng scroll (e.g. 'max-h-[240px]') */
  maxHeight?: string;
  /** Không có dữ liệu: key i18n thông báo */
  emptyKey?: string;
}
