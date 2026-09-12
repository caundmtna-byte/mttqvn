/**
 * Đếm số ô "tìm theo cột" đang có nội dung — dùng cho badge số bộ lọc đang bật.
 *
 * Việc SO KHỚP theo cột đã chuyển xuống RPC (`p_column_search`) từ khi module
 * này phân trang phía máy chủ; lọc ở client chỉ lọc được đúng trang đang xem.
 */
export function countColumnSearchActive(columnSearch: Record<string, string> | undefined): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}
