/** Đếm số ô tìm-theo-cột đang có chữ, để hiện badge trên nút Lọc. */
export function countHnghColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const v of Object.values(columnSearch)) if (v?.trim()) n += 1;
  return n;
}
