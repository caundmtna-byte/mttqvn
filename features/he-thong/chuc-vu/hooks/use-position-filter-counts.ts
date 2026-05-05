import { useMemo } from 'react';
import { matchesSearchTerm } from '@/lib/searchUtils';
import type { Position, PositionFilters } from '../core/types';
import { POSITION_SEARCHABLE_KEYS } from '../utils/search-keys';
import { positionMatchesColumnSearch } from '../utils/column-search';

function statusChipKey(p: Position): 'Active' | 'Inactive' {
  return p.trang_thai === 'Đang hoạt động' ? 'Active' : 'Inactive';
}

/**
 * Đếm cho chip Phòng ban / Trạng thái (exclude-self) — cùng chiến lược module Nhân viên.
 */
export function usePositionFilterCounts(
  positions: Position[],
  searchTerm: string,
  filters: PositionFilters,
) {
  return useMemo(() => {
    const matchesSearch = (p: Position) =>
      matchesSearchTerm(p as Record<string, unknown>, searchTerm, POSITION_SEARCHABLE_KEYS);

    const matchesDept = (p: Position) =>
      filters.phong_ban_id.length === 0 ||
      (p.phong_ban_id != null && filters.phong_ban_id.includes(p.phong_ban_id));

    const matchesStatus = (p: Position) => {
      const key = statusChipKey(p);
      return filters.status.length === 0 || filters.status.includes(key);
    };

    const deptCounts: Record<string, number> = {};
    const statusCounts: Record<'Active' | 'Inactive', number> = { Active: 0, Inactive: 0 };

    for (const p of positions) {
      if (!matchesSearch(p)) continue;
      if (!positionMatchesColumnSearch(p, filters.columnSearch)) continue;

      const passDept = matchesDept(p);
      const passStatus = matchesStatus(p);

      if (passStatus && p.phong_ban_id) {
        deptCounts[p.phong_ban_id] = (deptCounts[p.phong_ban_id] || 0) + 1;
      }

      if (passDept) {
        const key = statusChipKey(p);
        statusCounts[key] = (statusCounts[key] || 0) + 1;
      }
    }

    return { deptCounts, statusCounts };
  }, [positions, searchTerm, filters]);
}
