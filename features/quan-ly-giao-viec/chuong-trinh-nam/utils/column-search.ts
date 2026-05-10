import type { ChuongTrinhNamFilters, ChuongTrinhNamListRow } from '../core/types';
import { formatChuongTrinhNamTienDo } from './ngay-ket-thuc-tien-do';

export function chuongTrinhNamMatchesColumnSearch(
  item: ChuongTrinhNamListRow,
  f: Pick<ChuongTrinhNamFilters, 'columnSearch' | 'id_phong_ban' | 'nam_bat_dau' | 'tien_do'>,
): boolean {
  const { columnSearch, id_phong_ban, nam_bat_dau, tien_do } = f;
  const skipPhongBanCol = (id_phong_ban?.length ?? 0) > 0;
  const skipNamBatDauCol = (nam_bat_dau?.length ?? 0) > 0;
  const skipTienDoCol = (tien_do?.length ?? 0) > 0;
  for (const [colId, raw] of Object.entries(columnSearch ?? {})) {
    const q = (raw ?? '').trim().toLowerCase();
    if (!q) continue;
    if (skipPhongBanCol && colId === 'ten_phong_ban') continue;
    if (skipNamBatDauCol && colId === 'ngay_bat_dau') continue;
    if (skipTienDoCol && colId === 'tien_do') continue;
    if (colId === 'tien_do') {
      if (!formatChuongTrinhNamTienDo(item).toLowerCase().includes(q)) return false;
      continue;
    }
    const v = item[colId as keyof ChuongTrinhNamListRow];
    const hay = v == null ? '' : String(v).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}
