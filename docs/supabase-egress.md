# Supabase: egress và hiệu năng (checklist nội bộ)

Tham chiếu chính: [Manage Egress usage](https://supabase.com/docs/guides/platform/manage-your-usage/egress).

## Đã áp dụng trong codebase

- **PostgREST**: `select` liệt kê cột/embed thay vì `*` trên các bảng module Hệ thống (nhân viên, phòng ban, chức vụ, phân quyền).
- **Sau insert/update**: `returningSelect` thu hẹp khi chỉ đổi trạng thái hoặc bulk không cần payload lớn (`lib/data/repository.ts`, `SupabaseRepository`).
- **Giới hạn getAll**: `SUPABASE_DEFAULT_MAX_ROWS = 5000` — mỗi feature có thể truyền `limit`/`offset` qua `RepositoryQueryOptions`.
- **Nhân viên**: `getEmployees()` mặc định `limit: 5000`, `orderBy: ma_nhan_vien`; query key `queryKeys.employees.list(...)` đồng bộ với TanStack Query.
- **TanStack Query**: `masterDataQueryOptions` (stale 30 phút) cho master data; `listQueryOptions` cho danh sách; mutation ưu tiên `setQueryData`, `invalidateQueries` khi bulk/import hoặc cập nhật phức tạp.

## Vận hành (Dashboard Supabase)

- **Usage / Observability**: theo dõi egress theo dịch vụ; tìm endpoint `/rest/v1/...` gọi nhiều.
- **Database → Query performance**: truy vấn gọi nặng, số dòng trả về trung bình.
- **Index**: cột dùng trong `filter`, `order`, `eq` trên Postgres (giảm scan, gián tiếp giảm retry/refetch phía client).

## Khi mở rộng

- Realtime: subscribe tối thiểu, hủy khi unmount.
- Storage: ảnh qua CDN/transform, `cache-control`.
- Backend/BFF: pooler Postgres (Supavisor) theo [Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).
