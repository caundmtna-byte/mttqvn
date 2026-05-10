import type { MttqCanBoFilters } from '../core/types';

export function countMttqCanBoColumnSearchActive(
  columnSearch: Record<string, string>,
  f: MttqCanBoFilters,
): number {
  let n = 0;
  const skipTt = f.trang_thai_id.length > 0;
  const skipGt = f.gioi_tinh.length > 0;
  const skipTo = f.to_chuc_id.length > 0;
  const skipPb = f.phong_ban_id.length > 0;
  const skipCv = f.chuc_vu_id.length > 0;
  const skipCap = f.chuc_vu_cap_quan_ly.length > 0;
  const skipDv = f.don_vi_id.length > 0;
  const skipDt = f.dan_toc_id.length > 0;
  const skipDvy = f.dang_vien.length > 0;
  const skipTd = f.trinh_do_id.length > 0;
  const skipLl = f.ly_luan_chinh_tri_id.length > 0;
  for (const [colId, v] of Object.entries(columnSearch)) {
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
