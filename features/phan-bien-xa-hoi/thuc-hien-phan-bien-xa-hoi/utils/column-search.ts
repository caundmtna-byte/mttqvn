/**
 * Đếm số ô "tìm theo cột" đang có nội dung — dùng cho badge số bộ lọc đang bật.
 *
 * Việc SO KHỚP theo cột đã chuyển xuống RPC (`p_column_search`) từ khi module
 * này phân trang phía máy chủ; lọc ở client chỉ lọc được đúng trang đang xem.
 */
export function countThucHienColumnSearchActive(columnSearch: Record<string, string>): number {
  let n = 0;
  for (const v of Object.values(columnSearch)) {
    if (v?.trim()) n += 1;
  }
  return n;
}
