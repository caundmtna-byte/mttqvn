import type { Position } from '../core/types';

/** Cột đã có MultiSelect trong header — không dùng thêm `columnSearch` text cho cùng cột. */
export const POSITION_COLUMN_IDS_WITH_MULTISELECT = ['ten_phong_ban', 'trang_thai'] as const;

export function columnIdToPositionKey(colId: string): keyof Position {
  return colId as keyof Position;
}

export function countColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  const skip = POSITION_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    n += 1;
  }
  return n;
}

export function positionMatchesColumnSearch(
  pos: Position,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  const skip = POSITION_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    const trimmed = q.trim();
    if (!trimmed) continue;
    const key = columnIdToPositionKey(colId);
    const raw = pos[key];
    const str = raw == null ? '' : String(raw);
    if (!str.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
