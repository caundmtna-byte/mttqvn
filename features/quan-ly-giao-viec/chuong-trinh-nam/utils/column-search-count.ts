import type { ChuongTrinhNamFilters } from '../core/types';

export function countChuongTrinhNamColumnSearchActive(
  columnSearch: ChuongTrinhNamFilters['columnSearch'],
  chipFilters?: Pick<ChuongTrinhNamFilters, 'id_phong_ban' | 'nam_bat_dau'>,
): number {
  const skipPb = (chipFilters?.id_phong_ban?.length ?? 0) > 0;
  const skipNam = (chipFilters?.nam_bat_dau?.length ?? 0) > 0;
  let n = 0;
  for (const [colId, v] of Object.entries(columnSearch)) {
    if (!(v ?? '').trim()) continue;
    if (skipPb && colId === 'ten_phong_ban') continue;
    if (skipNam && colId === 'ngay_bat_dau') continue;
    n += 1;
  }
  return n;
}
