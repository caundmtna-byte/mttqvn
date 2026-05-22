---
name: tanstack-query-crud-list-detail
description: Chuẩn hoá TanStack Query cho module CRUD (list + detail drawer + form)—query keys, transactional options, cache mutation, onView seed, lỗi list ErrorState, đóng form không invalidate thừa. Dùng khi tạo/sửa features/**/hooks/use-*.ts hoặc index list module.
---

# TanStack Query — CRUD list + detail + form

## Khi nào dùng skill này

- Tạo hoặc review module có **bảng danh sách**, **drawer chi tiết**, **drawer form** (CRUD).
- Sửa hook `use-*` hoặc `index.tsx` trang list có `useQuery` / `useMutation`.

## Checklist nhanh

1. **`lib/query-keys.ts`**: thêm `moduleKey: { all, detail(id) }` (và `list`/`by*` nếu có tham số).
2. **`hooks/use-*.ts`**
   - `useQuery` list: `queryKey` = `all`, `queryFn`, `enabled` nếu có gate quyền, spread **`transactionalCrudListQueryOptions`** cho dữ liệu CRUD Supabase (không dùng cho master lookup).
   - `useQuery` detail: cùng transactional options; `enabled: Boolean(id?.trim()) && …`.
   - Mutations: **`setQueryData`** list; create/update **`setQueryData`** detail; delete **`removeQueries`** từng `detail(id)`; **`onError`** toast (hoặc dựa global mutation `onError`).
3. **`index.tsx`**
   - **`onView`**: `queryClient.setQueryData(queryKeys.*.detail(item.id), item)` rồi `setViewingId` nếu row list đủ cho detail.
   - List: `isError` + **`ErrorState`** + `refetch` khi `enabled && isError`; thêm **`listLoadErrorHint`** (hoặc tương đương) trong `text.ts`.
   - **`handleCloseForm`**: không `invalidateQueries(detail)` khi Hủy nếu không cần refetch server (mutation đã patch cache).
   - `useEffect`: đồng bộ `detail(viewingId)` từ `rows` khi list đổi (nếu id còn tồn tại).
4. **Sửa từ list**: nếu `Detail === ListRow` → truyền row vào form; nếu thiếu field → **`queryClient.fetchQuery({ queryKey: detail(id), queryFn: () => getById(id), ...transactionalCrudListQueryOptions })`** rồi mở form (xem `kho-dot-cuu-tro`).
5. **Egress / anti-pattern**: đọc [`.cursor/rules/egress-checklist.mdc`](mdc:.cursor/rules/egress-checklist.mdc) mục **C** (C2–C6).

## Tài liệu dự án

- Checklist module đầy đủ: [`docs/checklist-module.md`](mdc:docs/checklist-module.md) (mục 4, 5.1b, 14, 17).
- Quy tắc Cursor: [`.cursor/rules/tanstack-query-list-detail-crud.mdc`](mdc:.cursor/rules/tanstack-query-list-detail-crud.mdc).

## Ví dụ tham chiếu trong repo

- Đủ pattern (seed view, ErrorState, đóng form không invalidate thừa): `features/mat-tran-to-quoc/don-vi-cuu-tro/`.
- `fetchQuery` khi mở sửa cần full row: `features/mat-tran-to-quoc/dot-cuu-tro/index.tsx` (`handleEditFromList`).
