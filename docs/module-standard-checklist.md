# Checklist module tiêu chuẩn (list + detail + form)

Dùng khi tạo mới hoặc rà soát một module CRUD trong app.

## Cách dùng (module mới / trước release)

1. **Sao chép** bảng checklist vào ticket / PR hoặc làm việc trực tiếp trên file này (nhánh docs).
2. Với **từng dòng**: đổi cột `OK?` từ `☐` → `☑` khi đã xác minh (code + thử tay hoặc test tự động).
3. Cột **Ghi chú**: bắt buộc khi `☐` (chưa làm / backlog) hoặc khi `☑` nhưng có **ngoại lệ** có chủ đích (ví dụ “Không làm import — không có nghiệp vụ”, “RLS do DBA xử lý sau”).
4. **Trước release**: chạy lại toàn bộ mục liên quan module thay đổi; không để `☐` im lặng — hoặc ghi rõ lý do hoãn + owner.
5. **Sau mỗi đợt release** (hoặc khi merge nhánh `main`/`release-*`): cập nhật lại file checklist này trong repo — đánh dấu `☑` các mục đã xác minh cho version đó, cập nhật cột **Ghi chú** (vd. “v1.2: thêm bảng con khen thưởng”, “v1.2: tablet dùng `listBreakpoint=sm`”), và ghi **phiên bản / ngày** ở cuối file (mục “Nhật ký checklist” bên dưới).

### Nhật ký checklist (ghi tay khi release)

| Phiên bản / ngày | Module / phạm vi | Thay đổi checklist |
|------------------|-------------------|---------------------|
| *(thêm dòng mới lên trên)* | | |

---

## 1. Điều hướng & phát hiện

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 1.1 | Route trong `App.tsx` (lazy load nếu module lớn) | ☐ | |
| 1.2 | Mục menu / sidebar trỏ đúng path | ☐ | |
| 1.3 | Breadcrumb (nếu module dùng layout có breadcrumb) | ☐ | |
| 1.4 | Command palette / tìm nhanh trang (nếu có) | ☐ | |

---

## 2. Phân quyền & an toàn

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 2.1 | Resource key thống nhất (`useCan` / `useResourcePermissions`) | ☐ | |
| 2.2 | Ẩn / vô hiệu hóa nút theo `view` / `create` / `edit` / `delete` / `export` | ☐ | |
| 2.3 | Trang hoặc empty khi không có quyền xem | ☐ | |
| 2.4 | API / RLS phía Supabase khớp quyền UI (không chỉ dựa UI) | ☐ | |

---

## 3. Tầng dữ liệu

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 3.1 | Types (`core/types.ts` hoặc tương đương) | ☐ | |
| 3.2 | Schema form (zod) nếu có form | ☐ | |
| 3.3 | Service / query hooks (`useQuery`, `useMutation`, invalidate) | ☐ | |
| 3.4 | `queryKeys` ổn định, không hard-code rải rác | ☐ | |
| 3.5 | Migration + seed (nếu bảng mới) | ☐ | |

---

## 4. Store danh sách (`createGenericStore` hoặc tương đương)

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 4.1 | Cột mặc định: `id`, `label`, `visible`, `order`, `minWidth` / preset | ☐ | |
| 4.2 | `searchTerm`, `filters`, `sort`, `pagination`, `selectedIds` | ☐ | |
| 4.3 | `resetState` khi unmount trang (tránh leak state) | ☐ | |
| 4.4 | Khóa filter rõ ràng, type-safe | ☐ | |

---

## 5. Trang chính — toolbar

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 5.1 | `GenericToolbar`: Back (nếu submodule), search | ☐ | |
| 5.2 | Desktop: chip / bộ lọc (hoặc chỉ header cột nếu module chọn pattern “Excel header”) | ☐ | |
| 5.3 | Mobile: nút Filter + `MobileFilterSheet` (`filterGroups`) | ☐ | |
| 5.4 | `activeFilterCount` + “Xóa bộ lọc” (`onClearAllFilters`) đồng bộ logic filter | ☐ | |
| 5.5 | Column manager (ẩn/hiện / thứ tự cột) | ☐ | |
| 5.6 | Chọn nhiều + xóa hàng loạt (nếu có nghiệp vụ) | ☐ | |
| 5.7 | Export (nếu có): quyền + toast khi không có dữ liệu | ☐ | |
| 5.8 | Import (nếu có): dialog + xử lý lỗi | ☐ | |

---

## 6. Trang chính — bảng (`GenericTable`)

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 6.1 | Skeleton / loading text | ☐ | |
| 6.2 | Empty state có title + mô tả gợi ý | ☐ | |
| 6.3 | Phân trang, đổi page size | ☐ | |
| 6.4 | Sort (cột hoặc mặc định nghiệp vụ) | ☐ | |
| 6.5 | **Desktop: lọc/sắp theo header cột** (`renderColumnHeaderAccessory` + `hideSortOnColumnLabel` khi dùng menu header) | ☐ | |
| 6.6 | `columnSearch` (ô tìm trong dropdown header) cho cột không lọc multi-select | ☐ | |
| 6.7 | Resize cột (nếu bật) | ☐ | |
| 6.8 | Sticky checkbox + cột quan trọng (`stickyLeftCount`) | ☐ | |
| 6.9 | Row actions (Sửa / Xóa / …) + `compact` trên mobile card | ☐ | |
| 6.10 | Mobile: card list thống nhất (`MobileListCard` nếu team dùng) | ☐ | |
| 6.11 | Click row → xem chi tiết (hoặc đúng hành vi nghiệp vụ) | ☐ | |
| 6.12 | (Tuỳ chọn) `listBreakpoint`: `md` (mặc định) vs `sm` — tablet có bảng + header cột; trade-off bảng hẹp | ☐ | |

---

## 7. Chi tiết (`GenericDrawer` / trang riêng)

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 7.1 | Tiêu đề, subtitle, icon | ☐ | |
| 7.2 | `DetailSection` / `DetailField` / `DetailFieldGrid` — đủ trường | ☐ | |
| 7.3 | **Detail action toolbar / footer**: Đóng, Sửa, Xóa theo quyền | ☐ | |
| 7.4 | Đồng bộ bản ghi sau refetch khi đang mở (`useEffect` + `find` theo `id`) | ☐ | |
| 7.5 | Bảng con / embedded grid (nếu có): query theo FK, empty, quyền; invalidate query khi module cha/sửa con thay đổi | ☐ | |
| 7.6 | Liên kết chéo sang module khác (vd. `?open=id`) + xóa query sau khi xử lý | ☐ | |

---

## 8. Form (drawer / modal)

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 8.1 | Create vs Edit: title, default values, reset | ☐ | |
| 8.2 | Lỗi validation hiển thị theo field | ☐ | |
| 8.3 | Toast success / error, đóng sau khi lưu | ☐ | |
| 8.4 | Mở form từ list vs từ detail (`formOrigin` nếu cần refresh detail) | ☐ | |
| 8.5 | Combobox / FK: loading, empty, tạo mới (nếu có) | ☐ | |

---

## 9. Xóa & xác nhận

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 9.1 | `useConfirmStore` — một bản ghi | ☐ | |
| 9.2 | Xóa nhiều — message có `count` | ☐ | |
| 9.3 | Đóng detail / clear selection sau xóa thành công | ☐ | |

---

## 10. Ngôn ngữ & UX

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 10.1 | Chuỗi qua `txt()` / `text.ts`, không hard-code dài trong JSX | ☐ | |
| 10.2 | `searchPlaceholder` theo ngữ cảnh module | ☐ | |
| 10.3 | `aria-label` cho checkbox, nút icon | ☐ | |

---

## 11. Export / Import (nếu có)

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 11.1 | `ExportDialog`: cột export, `visibleColumnKeys`, tên file | ☐ | |
| 11.2 | `useExportData`: map dữ liệu, phân trang export | ☐ | |

---

## 12. Kiểm thử & vận hành

| # | Hạng mục | OK? | Ghi chú |
|---|----------|-----|---------|
| 12.1 | Luồng chính: list → view → edit → lưu | ☐ | |
| 12.2 | Mobile: filter sheet, chọn nhiều, scroll bảng | ☐ | |
| 12.3 | (Tuỳ chọn) E2E / storybook cho module | ☐ | |

---

## Gợi ý tham chiếu trong repo

- **Lọc header cột + sort + tìm cột**: `features/he-thong/nhan-vien/components/nhan-vien-table.tsx` (`ColumnHeaderFilter`, `ColumnHeaderSortMenu`, `ColumnHeaderSearch` từ `@/components/shared/column-header`).
- **Đếm filter chéo (exclude-self)**: `features/he-thong/nhan-vien/hooks/use-filter-counts.ts`; module MTTQ cán bộ: `features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo-filter-counts.ts`.
- **Toolbar + mobile filter**: `components/shared/GenericToolbar.tsx` + `MobileFilterSheet`.
- **Mobile list card**: `components/shared/MobileListCard.tsx`.
- **`GenericTable` breakpoint list / card**: prop `listBreakpoint` (`sm` \| `md`) trong `components/shared/GenericTable.tsx` — ví dụ dùng `sm` tại `features/mat-tran-to-quoc/danh-sach-can-bo/components/mttq-can-bo-table.tsx`.
- **Bảng con trong detail**: `components/shared/EmbeddedChildDataGrid.tsx`; ví dụ khen thưởng theo cán bộ: `getMttqKhenThuongLinesForCanBoId` + `useMttqKhenThuongLinesForCanBo` + `mttq-can-bo-khen-thuong-section.tsx`; mở quyết định: `?open=<id>` trên `danh-sach-khen-thuong/index.tsx`.
- **Khung trang CRUD**: `lib/createFeatureModule.tsx` (module dùng factory).

---

## Snapshot: module **Danh sách cán bộ** (`matTranOfficerList`)

| Mục | Trạng thái gợi ý |
|-----|------------------|
| Route + permission gate | Có |
| List: toolbar, export, column manager, mobile filters | Có |
| List: header cột (lọc trạng thái / giới tính + sort + tìm theo cột) | Có (đồng bộ store với toolbar) |
| List: counts chip / header theo filter chéo | Có (`useMttqCanBoFilterCounts`) |
| Detail drawer + footer actions | Có |
| Form + validation | Có |
| Bảng con trên detail (khen thưởng gắn cán bộ) | Có (`EmbeddedChildDataGrid` + deep link `?open=`) |
| `GenericTable` `listBreakpoint="sm"` (tablet thấy bảng) | Có |
| Import | Chưa thấy (tuỳ nghiệp vụ) |
| Mobile card `MobileListCard` | Có |
