/**
 * Lọc theo từng ô cột do RPC `get_dttg_tham_hoi_to_chuc_page` thực hiện trên
 * TOÀN BỘ dữ liệu; ở client chỉ còn việc đếm số ô đang bật cho toolbar.
 */
export function countThamHoiToChucColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}
