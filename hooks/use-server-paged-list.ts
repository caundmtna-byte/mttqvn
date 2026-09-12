import { useMemo } from 'react';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { listQueryOptions } from '@/lib/supabase/query-config';
import type { ServerSortState } from '@/lib/data/server-paging';
import type { PaginationState, SortState } from '@/store/createGenericStore';

/** Hình dạng mà mọi service phân trang phía máy chủ phải trả về. */
export type ServerPageResult<TRow> = {
  rows: TRow[];
  hasNextPage: boolean;
  totalRecords: number;
};

/** Tham số cơ bản mà RPC phân trang nào cũng nhận. */
export type ServerPageBaseParams = {
  page: number;
  pageSize: number;
  search: string;
  sort: ServerSortState | null;
};

type UseServerPagedListArgs<TRow, TExtra extends object> = {
  pagination: PaginationState;
  searchTerm: string;
  sort: SortState;
  /** Tham số riêng của module: phạm vi xem, các bộ lọc… */
  extraParams: TExtra;
  queryKey: (params: ServerPageBaseParams & TExtra) => QueryKey;
  fetchFn: (params: ServerPageBaseParams & TExtra) => Promise<ServerPageResult<TRow>>;
  enabled?: boolean;
};

type UseServerPagedListResult<TRow, TExtra extends object> = {
  rows: TRow[];
  totalRecords: number;
  hasNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  /** Bộ tham số đã dựng — truyền tiếp cho hàm xuất "tất cả". */
  params: ServerPageBaseParams & TExtra;
};

/**
 * Khuôn dùng chung cho danh sách phân trang phía máy chủ.
 *
 * Gom ba thứ mà trước đây mỗi module tự chép lại: dựng tham số ổn định cho
 * query key, gọi RPC, và quy đổi kết quả về `{ rows, totalRecords }` để nối
 * thẳng vào `GenericTable` (`serverSidePagination` / `serverTotalRecords`).
 *
 * Việc quay về trang 1 khi đổi tìm kiếm / bộ lọc / sắp xếp do
 * `createGenericStore` lo — không cần effect ở trang.
 */
export function useServerPagedList<TRow, TExtra extends object>({
  pagination,
  searchTerm,
  sort,
  extraParams,
  queryKey,
  fetchFn,
  enabled = true,
}: UseServerPagedListArgs<TRow, TExtra>): UseServerPagedListResult<TRow, TExtra> {
  const params = useMemo(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: searchTerm,
      sort: sort.column && sort.direction ? { column: sort.column, direction: sort.direction } : null,
      ...extraParams,
    }),
    [pagination.page, pagination.pageSize, searchTerm, sort.column, sort.direction, extraParams],
  );

  const query = useQuery({
    queryKey: queryKey(params),
    queryFn: () => fetchFn(params),
    enabled,
    ...listQueryOptions,
  });

  return {
    rows: query.data?.rows ?? [],
    totalRecords: query.data?.totalRecords ?? 0,
    hasNextPage: query.data?.hasNextPage ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => void query.refetch(),
    params,
  };
}
