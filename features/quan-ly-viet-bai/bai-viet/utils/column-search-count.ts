export function countBaiVietColumnSearchActive(columnSearch: Record<string, string>): number {
  return Object.values(columnSearch).filter((v) => (v ?? '').trim().length > 0).length;
}
