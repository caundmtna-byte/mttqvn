import type { MttqCanBoFilters } from '../core/types';
import { normalizeMttqCanBoFilters } from './mttq-can-bo-filters-normalize';

export function countMttqCanBoColumnSearchActive(f: MttqCanBoFilters): number {
  const F = normalizeMttqCanBoFilters(f);
  const cs = F.columnSearch;
  let n = 0;
  const skipTt = F.trang_thai_id.length > 0;
  const skipGt = F.gioi_tinh.length > 0;
  const skipTo = F.to_chuc_id.length > 0;
  const skipPb = F.phong_ban_id.length > 0;
  const skipCv = F.chuc_vu_id.length > 0;
  const skipCap = F.chuc_vu_cap_quan_ly.length > 0;
  const skipDv = F.don_vi_id.length > 0;
  const skipDt = F.dan_toc_id.length > 0;
  const skipDvy = F.dang_vien.length > 0;
  const skipTd = F.trinh_do_id.length > 0;
  const skipLl = F.ly_luan_chinh_tri_id.length > 0;
  for (const [colId, v] of Object.entries(cs)) {
    if (!(v ?? '').trim()) continue;
    if (skipTt && colId === 'ten_trang_thai') continue;
    if (skipGt && colId === 'gioi_tinh') continue;
    if (skipTo && colId === 'ten_to_chuc') continue;
    if (skipPb && (colId === 'ten_phong_ban' || colId === 'ten_bo_phan')) continue;
    if (skipCv && colId === 'ten_chuc_vu') continue;
    if (skipCap && colId === 'chuc_vu_cap_quan_ly') continue;
    if (skipDv && colId === 'ten_don_vi') continue;
    if (skipDt && colId === 'ten_dan_toc') continue;
    if (skipTd && colId === 'ten_trinh_do') continue;
    if (skipLl && colId === 'ten_ly_luan_chinh_tri') continue;
    if (skipDvy && colId === 'dang_vien') continue;
    n += 1;
  }
  return n;
}
