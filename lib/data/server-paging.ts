/**
 * Dựng tham số `p_sort` cho các RPC phân trang server-side.
 *
 * Quy ước: `'<cot>_asc'` / `'<cot>_desc'`. Cột không nằm trong whitelist trả về
 * `null` ⇒ RPC dùng thứ tự mặc định. Whitelist phải khớp đúng danh sách cột mà
 * RPC xử lý trong khối `ORDER BY ... CASE WHEN p_sort = ...`, nếu không thì
 * người dùng bấm sắp xếp mà danh sách không đổi.
 */
export type ServerSortDirection = 'asc' | 'desc';

export type ServerSortState = {
  column: string | null;
  direction: ServerSortDirection | null;
};

export function buildRpcSortParam(
  sort: ServerSortState | null | undefined,
  allowedColumns: readonly string[],
): string | null {
  if (!sort?.column || !sort.direction) return null;
  if (!allowedColumns.includes(sort.column)) return null;
  return `${sort.column}_${sort.direction}`;
}

/**
 * Đọc `total_count` (COUNT(*) OVER ()) từ kết quả RPC phân trang.
 *
 * Trả `null` khi trang rỗng — lúc đó cửa sổ đếm không có dòng nào để mang tổng
 * ra, nên người gọi phải hỏi lại trang đầu thay vì đoán bừa (đoán theo `offset`
 * sẽ cho tổng sai ngay khi bộ lọc vừa thu hẹp kết quả).
 */
export function readRpcTotalCount(rows: readonly Record<string, unknown>[]): number | null {
  const first = rows[0];
  if (!first) return null;
  const n = Number(first.total_count);
  return Number.isFinite(n) ? n : null;
}

/** Cỡ lô khi kéo toàn bộ dữ liệu của một danh sách phân trang server để xuất file. */
export const SERVER_EXPORT_BATCH_SIZE = 500;

/**
 * Ngưỡng an toàn cho một lần xuất — vượt thì **ném lỗi**, không cắt bớt dòng.
 *
 * File xuất thiếu dòng là loại lỗi tệ nhất: cán bộ mang đi báo cáo mà không
 * biết số đã bị hụt. Ngưỡng chỉ để chặn truy vấn quên bộ lọc, nên đặt rất cao.
 */
export const SERVER_EXPORT_SAFETY_LIMIT = 200_000;

/**
 * Kéo TOÀN BỘ bản ghi khớp bộ lọc của một danh sách phân trang phía máy chủ,
 * bằng cách gọi lại chính hàm phân trang theo từng lô.
 *
 * Dùng cho hộp thoại Xuất khi người dùng chọn phạm vi "Tất cả": không có bước
 * này thì file xuất ra chỉ có đúng trang đang xem. Chỉ gọi khi người dùng thực
 * sự bấm xuất — không tải sẵn, để giữ lợi ích egress của phân trang.
 */
export async function fetchAllServerPages<TRow, TQuery extends { page: number; pageSize: number }>(
  query: Omit<TQuery, 'page' | 'pageSize'>,
  fetchPage: (q: TQuery) => Promise<ServerPageLike<TRow>>,
  options?: { batchSize?: number; safetyLimit?: number },
): Promise<TRow[]> {
  const batchSize = Math.max(1, options?.batchSize ?? SERVER_EXPORT_BATCH_SIZE);
  const safetyLimit = Math.max(1, options?.safetyLimit ?? SERVER_EXPORT_SAFETY_LIMIT);
  const out: TRow[] = [];
  for (let page = 1; ; page += 1) {
    const res = await fetchPage({ ...query, page, pageSize: batchSize } as TQuery);
    out.push(...res.rows);
    if (!res.hasNextPage || res.rows.length === 0) break;
    if (out.length > safetyLimit) {
      throw new Error(
        `Dữ liệu cần xuất vượt ngưỡng an toàn ${safetyLimit.toLocaleString('vi-VN')} dòng. ` +
          'Hãy thu hẹp bộ lọc rồi xuất lại.',
      );
    }
  }
  return out;
}

type ServerPageLike<TRow> = { rows: TRow[]; hasNextPage: boolean };
