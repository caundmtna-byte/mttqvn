/** PostgREST/Supabase mặc định tối đa 1000 dòng/request — loop đến hết. */
export const SUPABASE_PAGE_SIZE = 1000;

/**
 * Ngưỡng an toàn cho một lần đọc trọn bảng.
 *
 * Đây KHÔNG phải trần cắt dữ liệu: vượt ngưỡng thì hàm **ném lỗi**, chứ không
 * lặng lẽ trả về một phần. Cắt ngầm là loại lỗi tệ nhất trong hệ thống này —
 * báo cáo, tồn kho và ma trận quyền đều tính trên toàn bộ dòng, thiếu một dòng
 * là ra số sai mà không ai phát hiện. Ngưỡng chỉ để chặn vòng lặp vô tận /
 * truy vấn quên bộ lọc, nên đặt rất cao so với dữ liệu thật.
 */
export const FETCH_ALL_PAGES_SAFETY_LIMIT = 200_000;

/** Số dòng vượt mức này thì ghi cảnh báo — dấu hiệu bảng đã cần phân trang server. */
export const FETCH_ALL_PAGES_WARN_AT = 20_000;

export type FetchAllPagesOptions = {
  pageSize?: number;
  /** Ngưỡng an toàn; vượt ⇒ ném lỗi. Mặc định FETCH_ALL_PAGES_SAFETY_LIMIT. */
  safetyLimit?: number;
  /** Tên bảng/nguồn, dùng trong câu cảnh báo và câu lỗi. */
  label?: string;
};

/**
 * Gọi `fetchPage(from, to)` lặp `.range(from, to)` cho tới khi **hết dữ liệu**.
 *
 * Luôn trả về ĐẦY ĐỦ số dòng của truy vấn. Tham số thứ hai nhận cả số (cỡ
 * trang, giữ tương thích với call site cũ) lẫn object tuỳ chọn.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  options: number | FetchAllPagesOptions = {},
): Promise<T[]> {
  const opts: FetchAllPagesOptions = typeof options === 'number' ? { pageSize: options } : options;
  const pageSize = Math.max(1, opts.pageSize ?? SUPABASE_PAGE_SIZE);
  const safetyLimit = Math.max(1, opts.safetyLimit ?? FETCH_ALL_PAGES_SAFETY_LIMIT);
  const where = opts.label ? ` "${opts.label}"` : '';

  const out: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const chunk = await fetchPage(from, to);
    out.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
    if (out.length > safetyLimit) {
      // Ném lỗi thay vì trả về một phần: dữ liệu thiếu sẽ thành số liệu sai.
      throw new Error(
        `Truy vấn${where} vượt ngưỡng an toàn ${safetyLimit.toLocaleString('vi-VN')} dòng. ` +
          'Hãy thu hẹp bộ lọc hoặc chuyển sang phân trang phía máy chủ.',
      );
    }
  }

  if (out.length >= FETCH_ALL_PAGES_WARN_AT) {
    console.warn(
      `[fetchAllPages]${where} đã tải ${out.length.toLocaleString('vi-VN')} dòng trong một lần — ` +
        'bảng đã lớn đến mức nên chuyển sang RPC phân trang phía máy chủ.',
    );
  }
  return out;
}
