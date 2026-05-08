import type { ChuongTrinhNamFilters } from '../core/types';

export function countChuongTrinhNamColumnSearchActive(columnSearch: ChuongTrinhNamFilters['columnSearch']): number {
  return Object.values(columnSearch).filter((v) => (v ?? '').trim().length > 0).length;
}
