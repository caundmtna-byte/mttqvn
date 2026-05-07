/** Cột đã có chip toolbar — không tính trùng `columnSearch` cùng cột. */
const SKIP_WHEN_CHIP = new Set(['trang_thai', 'muc_do']);

export function countCongViecColumnSearchActive(columnSearch: Record<string, string>): number {
  let n = 0;
  for (const [colId, v] of Object.entries(columnSearch)) {
    if (!(v ?? '').trim()) continue;
    if (SKIP_WHEN_CHIP.has(colId)) continue;
    n += 1;
  }
  return n;
}
