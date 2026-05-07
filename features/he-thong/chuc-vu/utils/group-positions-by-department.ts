import type { Department } from '../../phong-ban/core/types';
import type { SortState } from '../../../../store/createGenericStore';
import type { Position } from '../core/types';
import { comparePositions } from './compare-positions';

/** Chức vụ không có `phong_ban_id`. */
export const UNASSIGNED_DEPT_ID = '__unassigned__';
/** `phong_ban_id` không khớp phòng nào trong danh sách hiện tại. */
export const UNKNOWN_DEPT_ID = '__unknown_dept__';

export type GroupedPositionRow =
  | { kind: 'dept'; department: Department }
  | { kind: 'dept-placeholder'; id: string; ten_phong_ban: string }
  | { kind: 'position'; position: Position };

export function getGroupedPositionRowId(row: GroupedPositionRow): string {
  if (row.kind === 'position') return row.position.id;
  if (row.kind === 'dept') return `__dept__:${row.department.id}`;
  return `__dept__:${row.id}`;
}

/**
 * Cấp hàng cho `HierarchyTable`: 1 = phòng gốc, 2 = bộ phận (phòng con), 3 = chức vụ.
 * Hàng placeholder (chưa gán / phòng lạ) dùng cấp 1.
 */
export function getGroupedPositionRowLevel(row: GroupedPositionRow): number {
  if (row.kind === 'position') return 3;
  if (row.kind === 'dept-placeholder') return 1;
  return row.department.cap_do <= 1 ? 1 : 2;
}

export interface DeptGroupLabels {
  unassigned: string;
  unknownDept: string;
}

function sortBucket(list: Position[], sort: SortState): Position[] {
  const next = [...list];
  next.sort((a, b) => comparePositions(a, b, sort));
  return next;
}

/**
 * Danh sách phẳng: tiêu đề phòng (theo `duong_dan`) + chức vụ trong phòng;
 * cuối cùng là nhóm phòng không tồn tại (nếu có), rồi chưa gán phòng (nếu có).
 */
export function buildFlatGroupedRows(
  positions: Position[],
  departments: Department[],
  sort: SortState,
  labels: DeptGroupLabels
): GroupedPositionRow[] {
  const deptIds = new Set(departments.map((d) => d.id));
  const byDept = new Map<string, Position[]>();
  const unknown: Position[] = [];
  const unassigned: Position[] = [];

  for (const p of positions) {
    const pid = p.phong_ban_id;
    if (pid == null || String(pid).trim() === '') {
      unassigned.push(p);
      continue;
    }
    if (!deptIds.has(pid)) {
      unknown.push(p);
      continue;
    }
    const arr = byDept.get(pid);
    if (arr) arr.push(p);
    else byDept.set(pid, [p]);
  }

  const sortedDepts = [...departments].sort((a, b) => a.duong_dan.localeCompare(b.duong_dan, 'vi'));

  const out: GroupedPositionRow[] = [];
  for (const d of sortedDepts) {
    const bucket = byDept.get(d.id);
    if (!bucket?.length) continue;
    out.push({ kind: 'dept', department: d });
    for (const pos of sortBucket(bucket, sort)) {
      out.push({ kind: 'position', position: pos });
    }
  }

  if (unknown.length > 0) {
    out.push({
      kind: 'dept-placeholder',
      id: UNKNOWN_DEPT_ID,
      ten_phong_ban: labels.unknownDept,
    });
    for (const pos of sortBucket(unknown, sort)) {
      out.push({ kind: 'position', position: pos });
    }
  }

  if (unassigned.length > 0) {
    out.push({
      kind: 'dept-placeholder',
      id: UNASSIGNED_DEPT_ID,
      ten_phong_ban: labels.unassigned,
    });
    for (const pos of sortBucket(unassigned, sort)) {
      out.push({ kind: 'position', position: pos });
    }
  }

  return out;
}
