/**
 * Scaffold chung cho `column-search.ts` theo module — module giữ wrapper mỏng
 * (`columnIdToValue` + re-export tên hàm domain).
 */

export function countActiveColumnSearchFilters(
  columnSearch: Record<string, string> | undefined,
  skipColumnIds: readonly string[] = [],
): number {
  if (!columnSearch) return 0;
  const skip = new Set(skipColumnIds);
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.has(colId)) continue;
    n += 1;
  }
  return n;
}

export function rowMatchesColumnSearch(
  columnSearch: Record<string, string> | undefined,
  skipColumnIds: readonly string[],
  getCellText: (colId: string) => string,
): boolean {
  if (!columnSearch) return true;
  const skip = new Set(skipColumnIds);
  for (const [colId, q] of Object.entries(columnSearch)) {
    const term = q.trim();
    if (!term) continue;
    if (skip.has(colId)) continue;
    const cell = getCellText(colId).toLowerCase();
    if (!cell.includes(term.toLowerCase())) return false;
  }
  return true;
}
