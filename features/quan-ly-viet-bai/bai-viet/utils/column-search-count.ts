export function countBaiVietColumnSearchActive(
  columnSearch: Record<string, string>,
  idTheLoaiChip: string[] | undefined,
): number {
  let n = 0;
  const skipTheLoaiCol = (idTheLoaiChip?.length ?? 0) > 0;
  for (const [colId, v] of Object.entries(columnSearch)) {
    if (!(v ?? '').trim()) continue;
    if (skipTheLoaiCol && colId === 'ten_the_loai') continue;
    n += 1;
  }
  return n;
}
