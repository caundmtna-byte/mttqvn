import type { QuyLoai } from '../../core/constants';

/**
 * Đếm số ô tìm theo cột đang bật.
 *
 * Ở màn này việc LỌC do máy chủ làm (`p_column_search`); hàm này chỉ để hiện
 * con số "đang bật N bộ lọc" trên thanh công cụ.
 */
export function countQuySoThuChiColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

/**
 * Quy đổi chip "Loại phiếu" (đa chọn ở UI) sang tham số `p_loai` của RPC (đơn trị).
 *
 * Không chọn gì, hoặc chọn CẢ HAI, đều có nghĩa "không lọc" ⇒ `null`. Chọn đúng
 * một loại thì gửi loại đó. Không dùng `[0]` một cách mù quáng: chọn cả hai mà
 * gửi mỗi 'thu' là danh sách mất sạch phiếu chi mà người dùng không hiểu vì sao.
 */
export function resolveLoaiParam(selected: readonly string[]): QuyLoai | null {
  const valid = selected.filter((v): v is QuyLoai => v === 'thu' || v === 'chi');
  const uniq = [...new Set(valid)];
  if (uniq.length !== 1) return null;
  return uniq[0] ?? null;
}
