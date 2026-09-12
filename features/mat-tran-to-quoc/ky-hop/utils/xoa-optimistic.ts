import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Khuôn chung cho "xóa hiện ngay": bỏ dòng khỏi bảng trước, gọi máy chủ sau, hỏng
 * thì trả bảng về đúng như cũ.
 *
 * Dùng chung cho các danh sách của Mặt trận (kỳ họp, nhiệm kỳ…) — mỗi danh sách có
 * nhiều nhánh cache (bảng chính, bảng lọc theo nhiệm kỳ…) nên phải chụp và hoàn
 * nguyên theo TIỀN TỐ khoá, không chỉ một khoá duy nhất.
 */

/** Ảnh chụp cache trước khi xóa, dùng để hoàn nguyên khi lệnh xóa thất bại. */
export interface CacheSnapshot {
  entries: [QueryKey, unknown][];
}

/** Bỏ các dòng có id nằm trong danh sách; giữ nguyên thứ tự các dòng còn lại. */
export function boDongTheoId<T extends { id: string }>(
  rows: T[] | undefined,
  ids: readonly string[],
): T[] | undefined {
  if (!rows) return rows;
  const canXoa = new Set(ids);
  if (canXoa.size === 0) return rows;
  return rows.filter((r) => !canXoa.has(r.id));
}

/** Chụp lại mọi nhánh cache nằm dưới một tiền tố khoá. */
export function chupCache(queryClient: QueryClient, queryKey: QueryKey): CacheSnapshot {
  return { entries: queryClient.getQueriesData({ queryKey }) };
}

/** Trả mọi nhánh cache đã chụp về đúng giá trị cũ. */
export function hoanNguyenCache(queryClient: QueryClient, snapshot: CacheSnapshot | undefined): void {
  if (!snapshot) return;
  for (const [key, value] of snapshot.entries) {
    queryClient.setQueryData(key, value);
  }
}

/**
 * Chụp cache rồi bỏ ngay các dòng bị xóa khỏi mọi nhánh dưới tiền tố khoá.
 * Trả về ảnh chụp để `onError` gọi {@link hoanNguyenCache}.
 */
export function xoaDongKhoiCache<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  ids: readonly string[],
): CacheSnapshot {
  const snapshot = chupCache(queryClient, queryKey);
  for (const [key, value] of snapshot.entries) {
    if (!Array.isArray(value)) continue;
    queryClient.setQueryData(key, boDongTheoId(value as T[], ids));
  }
  return snapshot;
}
