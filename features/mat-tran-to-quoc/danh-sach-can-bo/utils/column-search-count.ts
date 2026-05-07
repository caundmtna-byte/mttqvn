export function countMttqCanBoColumnSearchActive(
  columnSearch: Record<string, string>,
  trangThaiIdChip: string[] | undefined,
  gioiTinhChip: string[] | undefined,
): number {
  let n = 0;
  const skipTt = (trangThaiIdChip?.length ?? 0) > 0;
  const skipGt = (gioiTinhChip?.length ?? 0) > 0;
  for (const [colId, v] of Object.entries(columnSearch)) {
    if (!(v ?? '').trim()) continue;
    if (skipTt && colId === 'ten_trang_thai') continue;
    if (skipGt && colId === 'gioi_tinh') continue;
    n += 1;
  }
  return n;
}
