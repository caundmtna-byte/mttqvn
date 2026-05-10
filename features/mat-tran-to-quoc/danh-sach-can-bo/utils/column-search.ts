import type { MttqCanBoFilters, MttqCanBoRow } from '../core/types';

export function mttqCanBoMatchesColumnSearch(
  item: MttqCanBoRow,
  f: MttqCanBoFilters,
): boolean {
  const {
    columnSearch,
    trang_thai_id,
    gioi_tinh,
    to_chuc_id,
    phong_ban_id,
    chuc_vu_id,
    chuc_vu_cap_quan_ly,
    don_vi_id,
    dan_toc_id,
    dang_vien,
    trinh_do_id,
    ly_luan_chinh_tri_id,
  } = f;
  for (const [colId, term] of Object.entries(columnSearch)) {
    const t = term.trim();
    if (!t) continue;
    if (colId === 'ten_trang_thai' && trang_thai_id?.length) continue;
    if (colId === 'gioi_tinh' && gioi_tinh?.length) continue;
    if (colId === 'ten_to_chuc' && to_chuc_id?.length) continue;
    if ((colId === 'ten_phong_ban' || colId === 'ten_bo_phan') && phong_ban_id?.length) continue;
    if (colId === 'ten_chuc_vu' && chuc_vu_id?.length) continue;
    if (colId === 'chuc_vu_cap_quan_ly' && chuc_vu_cap_quan_ly?.length) continue;
    if (colId === 'ten_don_vi' && don_vi_id?.length) continue;
    if (colId === 'ten_dan_toc' && dan_toc_id?.length) continue;
    if (colId === 'ten_trinh_do' && trinh_do_id?.length) continue;
    if (colId === 'ten_ly_luan_chinh_tri' && ly_luan_chinh_tri_id?.length) continue;
    if (colId === 'dang_vien' && dang_vien?.length) continue;
    const raw = (item as unknown as Record<string, unknown>)[colId];
    let s: string;
    if (typeof raw === 'boolean') {
      s = raw ? '1' : '0';
    } else {
      s = raw == null ? '' : String(raw).toLowerCase();
    }
    if (!s.includes(t.toLowerCase())) return false;
  }
  return true;
}
