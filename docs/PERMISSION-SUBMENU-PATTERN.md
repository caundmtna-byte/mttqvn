# Pattern: phân quyền module & ẩn submenu / dashboard

Tài liệu ngắn cho dev khi thêm module mới hoặc chỉnh luật `can()` theo chức vụ.

## Luật OR (ví dụ đã áp dụng: **Phòng ban** — `AppResource` `departments`)

Với chức vụ đang hydrate ma trận (`useHydratePositionPermissions` / `id_chuc_vu` khớp session):

| Hành động UI (`AppAction`) | Được phép nếu |
|----------------------------|----------------|
| `view` | `chucVuCapBac === 1` **hoặc** ma trận có `admin` / `all` **hoặc** ma trận có `view` |
| `create` | `chucVuCapBac === 1` **hoặc** `admin` / `all` **hoặc** `create` |
| `edit` | `chucVuCapBac === 1` **hoặc** `admin` / `all` **hoặc** `update` |
| `delete` | `chucVuCapBac === 1` **hoặc** `admin` / `all` **hoặc** `delete` |

- `quan_tri` trong DB map sang `admin` trong app (`var-phan-quyen-quyen-map.ts`); `grantsAllow` coi `admin`/`all` như đủ quyền thao tác trên module đó.
- `cap_bac` lấy từ `var_chuc_vu.cap_bac`, lưu ở `usePermissionGrantStore.chucVuCapBac` cùng lúc hydrate `grantsByModule`.

Module khác: nếu không cần OR với `cap_bac`, giữ nhánh `matrixCan` mặc định trong `lib/permissions.ts`.

## Ẩn “xem được module” → ẩn card & submenu

**Định nghĩa:** user “xem được” một resource khi `can('view', <AppResource>)` là `true` sau khi đã áp dụng luật module.

1. **Dashboard con (vd. Hệ thống):** `pages/dashboards/SystemDashboard.tsx` — lọc từng card theo `appResourceForDashboardNavigatePath(path)` + `can()`. Nhóm không còn card nào thì bỏ cả nhóm.
2. **Sidebar + Trang chủ:** `lib/nav-module-visibility.ts` — `getSidebarPathGateResources('/he-thong')` trả về mọi `AppResource` có `APP_RESOURCE_TO_MODULE[res]` bắt đầu bằng `he-thong/`. Hiện mục menu chỉ khi `some(can('view', …))`. Path khác: trả về `null` (chưa lọc theo resource — vẫn hiện).
3. **Ngoại lệ:** `/` và **`/thong-tin-ban-quyen`** luôn hiện (sidebar / thẻ Trang chủ).

## Deep link

Trang module: nếu `!can('view', resource)` → redirect (vd. về `/he-thong`) + toast, đồng thời **tắt query** list nếu dùng `enabled: canView` trong hook.

## Checklist module mới

1. Thêm `AppResource` + `APP_RESOURCE_TO_MODULE` trong `lib/permissions.ts`.
2. Nếu luật khác mặc định: thêm nhánh trong `can()` / helper (tham chiếu `canDepartmentsWithCapBac`).
3. Bổ sung path vào map dashboard / `getSidebarPathGateResources` khi module thuộc submenu đã lọc.
4. Guard route + `txt('…noViewPermission')` nếu cần UX nhất quán.
5. Cập nhật `lib/__tests__/permissions.test.ts` cho nhánh matrix mới.

Xem thêm: `docs/checklist-module.md` mục **13. Phân quyền (client UX)**.
