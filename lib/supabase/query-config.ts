/**
 * Cấu hình TanStack Query thống nhất cho dữ liệu từ API/Supabase:
 * - staleTime: giảm refetch không cần thiết
 * - gcTime: giữ cache trong RAM sau khi unmount (V5 dùng gcTime thay cho cacheTime)
 */
export const SERVER_STALE_TIME_MS = 1000 * 60 * 5; // 5 phút
export const SERVER_GC_TIME_MS = 1000 * 60 * 30; // 30 phút

/** Master data (phòng ban, chức vụ, nhiệm kỳ…) đổi ít — stale dài hơn để giảm egress. */
export const MASTER_DATA_STALE_TIME_MS = 1000 * 60 * 30; // 30 phút

/**
 * Dữ liệu địa lý cấp xã/phường — thực tế thay đổi rất hiếm, cache 24h.
 * Vẫn invalidate thủ công sau khi user thực sự thêm/sửa/xóa xã.
 */
export const GEO_DATA_STALE_TIME_MS = 1000 * 60 * 60 * 24; // 24 giờ
export const GEO_DATA_GC_TIME_MS = 1000 * 60 * 60 * 24; // 24 giờ


export const defaultServerQueryOptions = {
  staleTime: SERVER_STALE_TIME_MS,
  gcTime: SERVER_GC_TIME_MS,
} as const;

/** Danh sách transaction (nhân viên, …) — mặc định đồng bộ QueryClient root. */
export const listQueryOptions = {
  staleTime: SERVER_STALE_TIME_MS,
  gcTime: SERVER_GC_TIME_MS,
} as const;

/**
 * Danh sách/chi tiết CRUD trên Supabase (kho cứu trợ, …): có thể đổi ngoài phiên hoặc SQL;
 * `staleTime` ngắn hơn default + `refetchOnMount: true` (giống hướng dẫn `useEmployees`).
 * Không persist các query `kho-*` — xem `index.tsx` `shouldDehydrateQuery`.
 */
export const TRANSACTIONAL_CRUD_LIST_STALE_TIME_MS = 30 * 1000;

export const transactionalCrudListQueryOptions = {
  staleTime: TRANSACTIONAL_CRUD_LIST_STALE_TIME_MS,
  gcTime: SERVER_GC_TIME_MS,
  refetchOnMount: true,
} as const;

export const masterDataQueryOptions = {
  staleTime: MASTER_DATA_STALE_TIME_MS,
  gcTime: SERVER_GC_TIME_MS,
} as const;

/** Xã/phường — thay đổi rất hiếm, cache 24h để giảm egress đáng kể. */
export const geoDataQueryOptions = {
  staleTime: GEO_DATA_STALE_TIME_MS,
  gcTime: GEO_DATA_GC_TIME_MS,
} as const;

