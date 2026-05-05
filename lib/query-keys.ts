/**
 * Query keys tập trung — tránh lệch chuỗi khi invalidate / prefetch (TanStack Query + Supabase).
 */
/** Tham số fetch danh sách nhân viên (đồng bộ với getEmployees + useEmployees). */
export const EMPLOYEES_LIST_QUERY_PARAMS = {
  limit: 5000,
  offset: 0,
  orderBy: 'ten_tai_khoan',
  ascending: true,
} as const;

export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    /** Danh sách có limit/offset/order — giảm refetch và khớp cache mutation. */
    list: (params: {
      limit: number;
      offset: number;
      orderBy: string;
      ascending: boolean;
    }) => ['employees', 'list', params] as const,
    /** Prefix: invalidate mọi query `['employee', id]` */
    anyDetail: ['employee'] as const,
    detail: (id: string) => ['employee', id] as const,
  },
  departments: {
    all: ['departments'] as const,
  },
  positions: {
    all: ['positions'] as const,
  },
  roles: {
    all: ['roles'] as const,
  },
  branches: {
    all: ['branches'] as const,
  },
  jobLevels: {
    all: ['job-levels'] as const,
  },
  thongTinToChuc: {
    singleton: ['thong-tin-to-chuc', 'singleton'] as const,
  },
} as const;
