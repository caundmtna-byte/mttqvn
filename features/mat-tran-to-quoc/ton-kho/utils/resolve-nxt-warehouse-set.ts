/**
 * Tập kho đưa vào báo cáo NXT = kho người dùng chọn ∩ phạm vi kho của viewer.
 *
 * - Trả `null` ⇒ không lọc kho (chưa chọn kho và viewer không bị giới hạn).
 * - Trả `Set` rỗng ⇒ không kho nào — KHÔNG được hiểu là "mọi kho"; cán bộ xã chưa có kho
 *   mà rơi về `null` là lộ số liệu toàn tỉnh.
 */
export function resolveNxtWarehouseSet(
  warehouseIds: readonly string[] | null | undefined,
  scopeKhoIds: readonly string[] | null | undefined,
): Set<string> | null {
  const picked = warehouseIds?.length ? warehouseIds.map(String) : null;
  if (scopeKhoIds == null) return picked ? new Set(picked) : null;
  const scope = new Set(scopeKhoIds.map(String));
  return picked ? new Set(picked.filter((id) => scope.has(id))) : scope;
}
