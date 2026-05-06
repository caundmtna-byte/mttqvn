import type { ColumnConfig } from '../store/createGenericStore';

/** Chiều rộng cột checkbox trái (px) — khớp GenericTable / HierarchyTable */
export const TABLE_CHECKBOX_WIDTH = 44;
/** Cột thao tác rộng (Sửa + menu ⋮) — GenericTable, HierarchyTable + renderActions */
export const TABLE_ACTION_COLUMN_WIDTH = 92;
/** Cột thao tác hẹp (icon Sửa/Xóa) — HierarchyTable mặc định */
export const TABLE_ACTION_COLUMN_WIDTH_COMPACT = 80;
/** Min width mặc định mỗi cột dữ liệu khi tính tổng bảng (px) */
export const DEFAULT_DATA_COLUMN_MIN_WIDTH = 120;

export type DataColumnWidthInput = Pick<ColumnConfig, 'width' | 'minWidth'>;

export interface ComputeDataTableMinWidthOptions {
  /** Mặc định TABLE_CHECKBOX_WIDTH; đặt 0 nếu không có cột checkbox */
  checkboxWidth?: number;
  /** Mặc định TABLE_ACTION_COLUMN_WIDTH; đặt 0 nếu không có cột thao tác */
  actionColumnWidth?: number;
  defaultColumnMin?: number;
}

/**
 * Tổng minWidth cho `<table>` để vùng scroll ngang có scrollWidth đủ lớn,
 * tránh co cột khi bảng nằm trong flex (`min-w-0`).
 */
export function computeDataTableMinWidth(
  dataColumns: DataColumnWidthInput[],
  options?: ComputeDataTableMinWidthOptions
): number {
  const checkbox = options?.checkboxWidth ?? TABLE_CHECKBOX_WIDTH;
  const action = options?.actionColumnWidth ?? TABLE_ACTION_COLUMN_WIDTH;
  const def = options?.defaultColumnMin ?? DEFAULT_DATA_COLUMN_MIN_WIDTH;
  const cols = dataColumns.reduce(
    (sum, c) => sum + (c.width ?? c.minWidth ?? def),
    0
  );
  return checkbox + cols + action;
}
