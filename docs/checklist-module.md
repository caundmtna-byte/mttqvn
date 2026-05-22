# Checklist xây dựng module mới

Dùng checklist này khi tạo một module mới để tránh sót bước và đảm bảo **cùng độ đầy đủ** với các module chuẩn trong template (Dự án, Phòng ban, Nhân viên, Công việc…).

---

## Phạm vi & mức “đầy đủ”

- **Baseline (bắt buộc để gọi là module CRUD chuẩn):** list có toolbar + bảng (desktop) / card (mobile), form drawer, detail drawer, **tìm kiếm + filter** (theo một trong hai pattern dưới), chọn dòng + xóa nhiều, import/export (nếu nghiệp vụ có), phân quyền nút theo resource, flow detail ↔ form, i18n/text, route + menu.
  - **Pattern A — chip trên toolbar:** ô search tổng + `FilterChip*` trên desktop + `filterGroups` trên mobile.
  - **Pattern B — lọc/tìm theo header cột** (như Nhân viên / Phòng ban): **không** dùng chip desktop cho các filter đã chuyển xuống header; **mặc định vẫn có ô search tổng** trên toolbar (`searchTerm` + `matchesSearchTerm` / `SEARCHABLE_KEYS`, **AND** với `columnSearch` và filter khác). Chỉ dùng **`hideSearch`** khi product ghi nhận bàn giao *chỉ* tìm theo cột — và phải có mục kiểm tra QA tương ứng. Luôn giữ **badge + Xóa tất cả** + `filterGroups` **mobile** cho parity.
- **Nâng cao (tùy nghiệp vụ — không bắt buộc cho mọi module):** tab Thống kê, bulk edit sheet, in/xuất PDF, preview profile… Chỉ làm khi product yêu cầu; **lọc/sắp theo cột** là baseline nếu module chọn Pattern B (xem mục **6.8**, **7.4**).

---

## 1. Cấu trúc thư mục & core

- [ ] Tạo thư mục `features/<nhóm>/<module>/` (vd: `features/hanh-chinh/du-an/`).
- [ ] **core/types.ts**: Định nghĩa type entity (id, các trường hiển thị, quan hệ); type cho filters nếu phức tạp.
- [ ] **core/schema.ts**: Zod schema cho form (`XxxFormValues`); rule khớp với message validation trong i18n.
- [ ] **core/constants.ts** (nếu cần): Options trạng thái, enum hiển thị, map value → label.
- [ ] **core/supabase-select.ts** (khuyến nghị khi dùng Supabase): Chuỗi `select` tập trung + join/embed để list/detail không thiếu cột enriched (`ten_phong_ban`, …) — tránh lệch field giữa service và UI.

---

## 2. Store (Zustand)

- [ ] **store/useXxxStore.ts**: `createGenericStore<Filters>(initialFilters, DEFAULT_COLUMNS)`.
- [ ] **Filters**: Đủ key cho mọi filter trên toolbar (search không nằm trong filters object nhưng đồng bộ clear); nếu có lọc theo cột, struct rõ ràng (vd `columnSearch`).
- [ ] **DEFAULT_COLUMNS**: Mỗi cột: `id`, `label`, `visible`, `minWidth`, `order`; cột `actions` nếu dùng pattern Sửa + menu ⋮ — khớp `TABLE_ACTION_COLUMN_WIDTH` (~92px) trừ khi cố tình rộng hơn.
- [ ] **initialFilters**: Giá trị mặc định ổn định (mảng rỗng, không `undefined` lẫn lộn).

---

## 3. API / Service

- [ ] **services/xxx-service.ts**: getList, getById, create, update, delete (và deleteList nếu có xóa nhiều).
- [ ] **importXxx** (nếu có Import): Nhận mảng row, trả về `{ created, errors }`; normalize kiểu (chuỗi trim, FK null/empty).
- [ ] **List** trả về đủ trường cho **ô tìm kiếm tổng** và **cột bảng**: enriched (`ten_*`), text hiển thị cho enum (`*_text` nếu dùng).
- [ ] Lỗi Supabase/API: throw hoặc return shape thống nhất để hook hiển thị toast + message (vd `notFound`, `hasChildren`).

---

## 4. Hooks (React Query)

- [ ] **hooks/use-xxx.ts**: `useQuery` list, `useQuery` detail theo `id`, `useMutation` create / update / delete (và import nếu có).
- [ ] **queryKeys**: dùng `lib/query-keys.ts` — `all`, `detail(id)` (và nhánh có tham số nếu có) — đồng bộ với mutations (`setQueryData` / `removeQueries`), xem mục 14.
- [ ] **Cấu hình stale**: dữ liệu CRUD Supabase có thể đổi ngoài app → spread **`transactionalCrudListQueryOptions`** từ `lib/supabase/query-config.ts` cho list **và** detail query; master data / lookup ít đổi → **`masterDataQueryOptions`** (không nhầm hai loại).
- [ ] **Sau mutation**: ưu tiên **`setQueryData`** patch list + detail; xóa: **`removeQueries`** từng `detail(id)` đã xóa. Tránh **`invalidateQueries(listKey)`** sau mỗi sửa một dòng nếu đã patch được cache (xem `.cursor/rules/egress-checklist.mdc` C2).
- [ ] **useImportXxx(onSuccess?)** (nếu có): invalidate hoặc setQueryData + toast tổng hợp lỗi từng dòng nếu API trả về.

---

## 5. Trang chính (index)

### 5.1 State & drawer

- [ ] State: `showForm`, `editingItem`, `detailItem`, (bảng con) `detailChild`, `showChildForm`, `openedFormFromDetailId`.
- [ ] Form/Detail drawer: **lazy import** + `Suspense` + fallback spinner nếu chunk lớn (giảm bundle trang list).

### 5.1b TanStack Query (list + detail drawer)

- [ ] **`onView` / mở chi tiết**: nếu row list **đủ field** cho chi tiết (detail cùng shape hoặc embed đủ), gọi `queryClient.setQueryData(queryKeys.<module>.detail(item.id), item)` **trước** `setViewingId` / state tương đương — tránh request `getById` thừa (race với `useEffect` seed cache). Nếu form/detail cần field **chỉ từ server**: dùng `queryClient.fetchQuery` đúng `queryKey` + `queryFn` (egress C3), xem `dot-cuu-tro` `handleEditFromList`.
- [ ] **Lỗi tải danh sách**: khi query list `enabled && isError`, hiển thị **`ErrorState`** + `refetch()` (không chỉ toast toàn cục); thêm key kiểu **`listLoadErrorHint`** trong `text.ts` module.
- [ ] **`handleCloseForm`**: không **`invalidateQueries(detail)`** khi người dùng **Hủy** nếu mutation đã `setQueryData` và không cần buộc refetch server; vẫn giữ UX **Detail → Sửa → Hủy → mở lại detail** qua state (`formOrigin` / `openedFormFromDetailId`).
- [ ] **Đồng bộ list → detail** (khuyến nghị): `useEffect` khi `rows` + id đang xem đổi — `setQueryData(detail(id), row)` nếu row còn trong list; nếu không còn → đóng detail.

### 5.2 Lọc & tìm kiếm

- [ ] **filterFn** (client): **`searchTerm`** luôn kết hợp qua `matchesSearchTerm(item, searchTerm, SEARCHABLE_KEYS)` (`lib/searchUtils`) trừ khi module **không** có ô search tổng (đã ghi nhận). **Pattern B:** **AND** thêm **`columnSearch`** + helpers — không thay thế hoàn toàn ô tìm tổng trừ khi `hideSearch` có chủ đích.
- [ ] Filter theo chip (status, phòng ban, …): kết hợp AND với search; `activeFilterCount` khớp logic **Xóa tất cả bộ lọc**. **Pattern B:** filter “chip-level” chuyển sang header/mobile sheet — vẫn AND đúng trong `filterFn`.

### 5.3 CRUD & chọn nhiều

- [ ] **handleEdit**: Từ detail → set `openedFormFromDetailId` (hoặc `formOrigin` + id) để **Hủy** mở lại detail.
- [ ] **handleCloseForm**: mở lại detail theo state UX; **không** bắt buộc `invalidateQueries(detail)` khi Hủy nếu cache đã đúng (xem **5.1b**). Chỉ invalidate/refetch detail khi nghiệp vụ cần dữ liệu server mới và mutation chưa patch đủ.
- [ ] **handleDeleteMany** onSuccess: Xóa cả bản ghi đang mở trong detail → `detailItem` / `detailChild` = null.
- [ ] Export: `exportData` useMemo (cột + header đúng ngôn ngữ), `handleExport` → `exportToExcel` (hoặc helper thống nhất).
- [ ] Import: `showImport`, `IMPORT_COLUMNS` (key/label/required), `ImportDialog`, wire toolbar.

### 5.4 Xác nhận xóa

- [ ] Xóa một / xóa nhiều: dùng `useConfirmStore` + copy từ `txt()` (`deleteTitle`, `deleteMessage`, `bulkDeleteTitle`, `bulkDeleteMessage`).

---

## 6. Toolbar (GenericToolbar + module toolbar)

Toolbar là **một hàng điều khiển** phía trên list; bắt buộc đủ **chức năng** sau (ẩn nút theo quyền, không ẩn cả khối nếu không cần).

### 6.1 Luôn có (desktop + mobile)

- [ ] **Ô tìm kiếm tổng trên toolbar**: `searchTerm` + `onSearchChange` + **`hideSearch` không bật** (hoặc `hideSearch={false}`) — trừ khi có quyết định rõ (xem **6.8**). Placeholder: `txt('common.searchPlaceholder')` trừ khi module cần gợi ý đặc thù.
- [ ] **`filterFn` / `useListWithFilter`**: luôn áp **`searchTerm`** qua `matchesSearchTerm` (hoặc tương đương) với **`*_SEARCHABLE_KEYS`** đủ cột + FK/enriched — **không** để tham số `term` bị bỏ qua (`_term`) khi ô search còn hiển thị.
- [ ] **Badge số bộ lọc đang bật** (`activeFilterCount`) + **Xóa tất cả** (`onClearAllFilters`) — reset cả search + mọi filter + (nếu có) column search.
- [ ] **Column manager**: `columns`, `onToggleColumn`, `onReorderColumns`, `onResetColumns` — đồng bộ store.

### 6.2 Filter UI

- [ ] **Desktop**: `filters` render `FilterChipMultiSelect` / single tùy nghiệp vụ — mỗi chip đồng bộ `filters` trong store.
- [ ] **Mobile**: `filterGroups` cho `MobileFilterSheet` (cùng options với desktop); label + icon từng nhóm.

### 6.8 Pattern “lọc ở header cột” (không chip desktop)

Áp dụng khi product/module chuyển filter chính sang **header** (`renderColumnHeaderAccessory` trên `GenericTable` / `HierarchyTable`).

- [ ] Store có **`columnSearch`** (và/hoặc filter đặc thù từng cột) + **sort** client/server thống nhất với `compareXxx` / service.
- [ ] **`filterFn`**: kết hợp `columnSearch` **AND** các filter còn lại; tránh lọc trùng (vd cột đã là MultiSelect trong header thì **không** áp thêm text search cùng key — xem util `*_column-search.ts` mẫu).
- [ ] Toolbar: **`filters={[]}`** hoặc không render chip cho những gì đã chuyển xuống header. **`hideSearch`**: *mặc định không dùng* — nếu bật, ghi chú trong spec module + bổ sung hàng kiểm tra **§17** (ô search ẩn có chủ đích).
- [ ] **`activeFilterCount`** + **`onClearAllFilters`**: đếm và reset **cả** `columnSearch`, sort, và filter mobile (trạng thái, cây gốc, …).
- [ ] **Mobile**: vẫn có **`filterGroups`** (hoặc sheet tương đương) để người dùng lọc khi không có header desktop.
- [ ] Empty state: phân biệt **không có dữ liệu** vs **không có kết quả sau lọc** (`common.noData` / `common.noResults`).

### 6.3 Khi có hàng được chọn (`selectedCount > 0`)

- [ ] Thanh bulk: **Bỏ chọn**, **Xóa** (nếu `canDelete`), đổi trạng thái hàng loạt (nếu nghiệp vụ có) — `bulkActions` / `onDeleteMany` / `onStatusChangeMany`.
- [ ] Mobile: `MobileActionsSheet` cho import/export/xóa nếu không đủ chỗ trên hàng chính.

### 6.4 Nút chính (theo quyền)

- [ ] **Thêm**: `onAdd` + `BTN_ADD()` / icon Plus; ẩn khi `!canCreate`.
- [ ] **Export**: ẩn khi `!canExport`.
- [ ] **Import**: ẩn khi `!canImport`.
- [ ] **Back** (`showBack`): khi module là trang con; `onBack` tùy chọn — mặc định dùng breadcrumb/parent path.

### 6.5 Tùy chọn

- [ ] **`desktopStartSlot`**: TabGroup (vd List | Thống kê) chỉ desktop — khớp pattern Nhân viên nếu có tab.
- [ ] **`searchTrailing`**: Phụ kiện nhỏ cạnh ô search (vd combobox nhanh).

### 6.6 Quyền

- [ ] Trong component toolbar: `useResourcePermissions('<resource>')` — chỉ render nút khi đúng `can*` (xem mục 13).

### 6.7 Nhãn nút (chuẩn ngắn)

- [ ] Toolbar **Thêm**: `txt('common.addNew')` hoặc `BTN_ADD()` — nội dung **Thêm** (không “Thêm mới” trên nút trừ khi product bắt buộc).
- [ ] Form drawer: `FormDrawerFooter` mặc định — **Lưu** / **Thêm** / **Hủy** qua `lib/button-labels.ts` + `common.*` trong `lib/text/ui.ts`; ưu tiên **`compact` + `footerCompact`**; **không** nhân bản `form.save` / `form.create` trong `text.ts` nếu chỉ trùng nghĩa.
- [ ] Chi tiết drawer: `BTN_CLOSE`, `BTN_EDIT`, `BTN_DELETE` (thứ tự xem `lib/button-labels.ts`).
- [ ] Quy tắc đầy đủ: [patterns-button-labels.md](./patterns-button-labels.md).

---

## 7. Bảng danh sách & mobile card

### 7.1 GenericTable (desktop)

- [ ] **Cột dữ liệu** khớp `DEFAULT_COLUMNS` (thứ tự + visibility); `renderCell(colId, item)` — badge trạng thái, format ngày/số qua helper chung (`lib/fmt`, v.v.).
- [ ] **Checkbox**: chọn dòng + chọn tất cả trang; `selectedIds` từ store.
- [ ] **Sort**: `sort` + `onSort` nếu module hỗ trợ — hoặc sort chỉ qua header phụ (khi `hideSortOnColumnLabel`).
- [ ] **Phân trang**: `page`, `pageSize`, `onPageChange`, `onPageSizeChange`; footer đếm bản ghi (copy chuẩn từ module mẫu).
- [ ] **Loading**: `isLoading` → spinner + `loadingText` từ `txt()`; lỗi query list: xử lý ở **trang** (`ErrorState` + `refetch`) — xem **5.1b**, không chỉ dựa toast toàn cục.
- [ ] **Empty**: `emptyTitle`, `emptyDescription`, optional `emptyAction` (vd nút Thêm).
- [ ] **Sticky**: cột trái (checkbox + cột đầu) / cột phải (actions) theo `stickyLeftCount` và minWidth.
- [ ] **Virtual scroll**: bật mặc định khi dữ liệu lớn — giữ behavior như module mẫu.
- [ ] **Summary row** (nếu có): `renderSummaryRow` — optional.

### 7.2 Mobile: `renderMobileCard`

- [ ] Một card = một bản ghi: hiển thị các trường chính + tap mở detail; checkbox chọn; actions (Sửa / menu) nhất quán desktop.
- [ ] Không để mất **chức năng** so với desktop (xem được, sửa, xóa — theo quyền).

### 7.3 Cột Thao tác

- [ ] Pattern khuyến nghị: **một nút Sửa** + **`RowActionsOverflowMenu`** (`components/shared/row-actions`) — thêm quyền `aria-label`, tooltip.
- [ ] `minWidth` cột `actions` đủ cho icon; không để vỡ layout khi tên dài (truncate ở cột text).

### 7.4 Lọc / sort theo header cột (chuẩn listview — tham khảo **Nhân viên**)

- [ ] Bảng hỗ trợ **`renderColumnHeaderAccessory`** trên `GenericTable` (và `hideSortOnColumnLabel` khi sort nằm trong menu header).
- [ ] **Mỗi cột dữ liệu** (trừ `actions`): nút **sliders** (`ColumnHeaderSortMenu`) → **Sắp xếp A→Z / Z→A** + **ô tìm theo cột** (`ColumnHeaderSearch` trong dropdown). Tham chiếu: `features/he-thong/nhan-vien/components/nhan-vien-table.tsx` + `@/components/shared/column-header`.
- [ ] Cột **enum / trạng thái** cần tick nhiều giá trị: **`ColumnHeaderFilter`** (sort + MultiSelect + tìm trong dropdown) — cùng `filters.<key>` với **FilterChip** trên toolbar nếu module vẫn dùng chip (vd. **Khen thưởng**: `mttq-khen-thuong-table.tsx` + `utils/column-search.ts`).
- [ ] **`columnSearch`**: util `*_matchesColumnSearch` + `count*ColumnSearchActive` — **không** áp text search trùng key với cột đã dùng `ColumnHeaderFilter` (khai báo danh sách skip trong util, xem `nhan-vien/utils/column-search.ts`).
- [ ] **`filterFn`**: `columnSearch` **AND** chip/toolbar filters; **sort sau filter** trong `index` (hoặc server) — tránh sort full list rồi mới filter.
- [ ] Toolbar: **`activeFilterCount`** gồm `columnSearch` (theo util đếm); **`onClearAllFilters`**: xóa `searchTerm`, `columnSearch`, các filter chip, và **reset sort** (`setSort(null, null)`) nếu sort client — đồng bộ **Export** với list đã lọc.

---

## 8. Form (drawer) — quy tắc UI & validation

### 8.1 Vỏ

- [ ] **GenericDrawer** (hoặc FormDrawer thống nhất): `title` + icon; `onClose` gọi parent `handleCloseForm`.
- [ ] **Footer**: **FormDrawerFooter** — `formId`, Hủy, Lưu / **Tạo** khi thêm mới (`createLabel` + icon); `isLoading` khi mutation pending; `compact` nếu module dùng.

### 8.2 React Hook Form + Zod

- [ ] `useForm` với `zodResolver(schema)`; type `Resolver<XxxFormValues>`.
- [ ] `defaultValues` / `reset` khi `initialData` hoặc thêm mới — đồng bộ với schema (chuỗi rỗng vs null theo quy ước service).

### 8.3 Bố cục

- [ ] **FormSection** (tiêu đề nhóm) + **FormGrid** (`cols={1|2|3}`): mobile 1 cột, sm+ nhiều cột.
- [ ] Trường đặc thù: **Controller** cho select/combobox/switch.

### 8.4 Trường bắt buộc & lỗi

- [ ] Trường **bắt buộc** trong schema → trên UI component (`Input`, v.v.) set **`required`** → hiển thị **dấu \* màu đỏ** (`text-destructive`, `aria-hidden` trên sao) — xem `components/ui/Input.tsx`.
- [ ] Hiển thị `errors.<field>.message` dưới control; `aria-invalid`, `aria-describedby` tới dòng lỗi (đã hỗ trợ ở Input).
- [ ] Nút submit: `disabled` hoặc loading khi đang gửi; tránh double submit.

### 8.4b Icon cạnh nhãn trường (form)

- [ ] Mọi trường có **`label`** hiển thị trong drawer form: truyền **`icon`** cho **`Input`**, **`Textarea`**, **`Combobox`** (và control tương đương nếu component hỗ trợ) — **không** để label “trần”.
- [ ] **`Textarea`**: dùng cùng quy ước `icon` như `Input` (Lucide component hoặc `ReactNode`; `components/ui/Textarea.tsx` dùng `renderInputIcon`).
- [ ] Gợi ý icon: tên / tiêu đề → `Type`; mô tả / ghi chú → `FileText`; URL → `Link2`; địa chỉ → `MapPin`; SĐT → `Phone`; email → `Mail`; thứ tự → `ListOrdered`; ngày giờ (chỉ ở detail) → `Calendar`; danh mục / nhóm → `FolderOpen` / `Package` tùy ngữ cảnh.
- [ ] Tham chiếu: `features/he-thong/chuc-vu/components/chuc-vu-form.tsx`, `features/mat-tran-to-quoc/dot-cuu-tro/components/kho-dot-cuu-tro-form.tsx`.

### 8.5 Sanitize trước khi gửi

- [ ] Trim chuỗi, chuẩn hóa null/empty FK giống module mẫu (tránh gửi `""` khi DB cần `null`).

---

## 9. Detail (drawer)

### 9.1 Thứ tự block (từ trên xuống)

- [ ] **Summary card** (trên **DetailToolbar**): **bắt buộc** `DetailSummaryCard` (`components/shared/DetailSummaryCard.tsx`) — **không** copy tay class `bg-card p-4 rounded-xl border…`. **Hàng 1:** `leading` (avatar hoặc **`DetailSummaryIconTile`** + icon ~26px) + **title + badge** (nếu có) cùng hàng; **hàng 2:** `subtitle` (mã, @tài khoản, ngày `tabular-nums`, …); **`children`:** meta thêm nếu có. Tham chiếu trực tiếp trong repo: `nhan-vien-detail`, `chuc-vu-detail`, `phong-ban-detail`, `chuong-trinh-nam-detail`, `cong-viec-detail`, `bai-viet-detail`, địa bản, thiết lập bài viết / MTTQ (kỳ họp, nhiệm kỳ, ủy viên, khen thưởng, tập huấn, thiết lập, cán bộ), v.v.
- [ ] **DetailToolbar**: hành động “nổi bật” (đổi trạng thái, thêm bản ghi con, …) — chỉ hiện khi `canEdit` / đúng nghiệp vụ. **Đổi / chuyển trạng thái** → popup modal (`GenericDrawer` `variant="modal"`), không dùng drawer trượt — `docs/patterns-detail-status-change.md`.
- [ ] **DetailSection** + **DetailField**: nhóm “Thông tin chung”, “Liên hệ”, … — mỗi field một label + value.

### 9.1b Icon cạnh nhãn trường (detail)

- [ ] Mỗi **`DetailField`** truyền **`icon={<LucideIcon size={12} />}`** cạnh `label` (đồng bộ với form + các module chuẩn như `chuc-vu-detail`, `phong-ban-detail`).
- [ ] Không bỏ sót: cả nhóm “Thông tin hệ thống” (`tg_tao`, `tg_cap_nhat` → `Calendar`), STT (`ListOrdered`), v.v.

### 9.2 Chi tiết hiển thị

- [ ] Giá trị rỗng: **DetailField** dùng `emptyText` mặc định (“Chưa cập nhật”) hoặc override — thống nhất module.
- [ ] Enum/ID: hiển thị **nhãn người đọc**, không raw id (dùng data enriched hoặc map constants).

### 9.3 Hành động inline

- [ ] **DetailField** `trailing`: nút nhỏ cạnh giá trị (sao chép, sửa nhanh) — phân bổ qua `partitionDetailActions` + `lib/detail-action-placement.ts` (`prominent` vs `inline`).

### 9.4 Footer detail

- [ ] **Đóng** | **Sửa** (`canEdit`) | **Xóa** (`canDelete`); ẩn đúng quyền.

### 9.5 Bảng con (nếu có)

- [ ] **Ưu tiên `EmbeddedChildDataGrid`** (`components/shared/EmbeddedChildDataGrid.tsx`): cột + `renderCell` + **hàng đủ actions** — pattern **`XxxTableRowActions`** (compact) + `RowActionsOverflowMenu`, **không** dàn nút icon raw trên từng dòng trừ khi product bắt buộc.
- [ ] Tránh “double card”: dùng `containerClassName` (vd `border-0 shadow-none`) khi grid nằm trong **DetailSection** đã có viền.
- [ ] Card section: tiêu đề + **EmptyState** + bảng; click dòng → mở detail con hoặc drawer con.
- [ ] Xóa con: `onChildDeleted?.(id)` để parent đóng drawer con nếu đang xem đúng id.

---

## 10. Flow chi tiết

- [ ] **Detail → Sửa → Hủy**: Đóng form, mở lại detail (state + `openedFormFromDetailId` / `formOrigin`).
- [ ] **Detail → Sửa → Lưu**: Cập nhật `detailItem` / cache chi tiết bản mới — ưu tiên **`setQueryData`** trong hook mutation; `invalidateQueries` chỉ khi thật sự cần refetch server.
- [ ] **Xóa con trong detail**: Đồng bộ đóng drawer con (mục 9.5).
- [ ] **Xóa nhiều**: Nếu id đang xem ∈ danh sách xóa → clear detail.

---

## 11. i18n & text

- [ ] Chuỗi UI: ưu tiên **`features/<module>/text.ts`** export object + `txt()` (`lib/text`) — hoặc key trong `locales` tùy chuẩn dự án; thống nhất một kiểu trong module.
- [ ] Tối thiểu cần key: loading, empty, emptyHint, delete/bulk delete, toast CRUD/import, form title/label/placeholder/save/create, tên cột (export + column manager), detail section, validation messages, toolbar (export/import/filter), **`listLoadErrorHint`** (hoặc tương đương) nếu trang list dùng `ErrorState` khi `isError`.
- [ ] Ô tìm kiếm list: dùng `common.searchPlaceholder` nếu không có gợi ý đặc thù.

---

## 12. Route & menu

- [ ] Đăng ký route trong router (path, `element`, lazy nếu khối lớn).
- [ ] Sidebar/menu: icon, label, **đúng `moduleId`** để khớp phân quyền và (nếu có) trang hướng dẫn.

---

## 13. Phân quyền (client UX)

- [ ] Thêm **`AppResource`** mới trong `lib/permissions.ts` (union `AppResource`).
- [ ] Ánh xạ **`APP_RESOURCE_TO_MODULE`**: resource → `module_id` dạng `he-thong/ten-module` khớp ma trận phân quyền / menu.
- [ ] Toolbar, nút trong detail, form (nếu cần): `useResourcePermissions(resource)` — `canCreate`, `canEdit`, `canDelete`, `canExport`, `canImport`, `canView`.
- [ ] **Ghi nhớ**: `can()` chỉ UX; **RLS / policy Supabase** vẫn phải đúng trên server.
- [ ] (Tùy module) Pattern ẩn submenu / dashboard / deep link: **`docs/PERMISSION-SUBMENU-PATTERN.md`**.

---

## 14. Query keys & Supabase

- [ ] Thêm nhánh trong **`lib/query-keys.ts`** (`all`, `list` nếu có tham số, `detail(id)`…) — mutations dùng đúng key cho `setQueryData` / `removeQueries` / invalidate có chủ đích.
- [ ] List query dùng **cùng params** giữa hook và constant (tránh cache trùng tên khác param).
- [ ] CRUD list/detail từ Supabase: hook `useQuery` spread **`transactionalCrudListQueryOptions`** (`lib/supabase/query-config.ts`) — không copy tay `staleTime`/`refetchOnMount` lệch chuẩn dự án.

---

## 15. Tính năng tùy chọn (parity “Nhân viên đầy đủ”)

Chỉ triển khai khi spec yêu cầu; mỗi mục có thể thành phase sau.

- [ ] Tab **Danh sách | Thống kê** + component stats riêng.
- [ ] **Lọc/sắp xếp theo cột** (header accessory + state trong store).
- [ ] **Bulk edit** (sheet) cho vài field hàng loạt.
- [ ] **In / PDF / export profile** từ detail.
- [ ] **Preview** route riêng (vd profile) — lazy load.

---

## 16. Trang hướng dẫn (nội dung người dùng)

- [ ] Theo **`docs/GUIDE-CONTENT.md`**: thêm key `guide.modules.<submenu>_<moduleSlug>.*` trong `locales/guide.json` (intro, overview, permissions, workflow, quickStart, glossary, faq, contact) — tránh fallback “đang cập nhật”.

---

## 17. Kiểm tra cuối (QA)

- [ ] Tìm kiếm: thử từng từ khóa trên mọi cột/enriched đã khai báo trong `SEARCHABLE_KEYS` **hoặc** (Pattern B) từng ô **header column search** + sort từng cột.
- [ ] **Pattern A:** Từng filter chip + **Xóa tất cả** + đếm `activeFilterCount` đúng. **Pattern B:** không chip desktop nhưng **Xóa tất cả** vẫn xóa hết `columnSearch` + filter sheet + sort + **`searchTerm`**; đếm badge đúng.
- [ ] **Ô search tổng:** trên desktop (và breakpoint hỗ trợ) thấy ô search trên toolbar khi `hideSearch` không bật; gõ từ khóa → list lọc đúng (đồng bộ code `filterFn`).
- [ ] Mobile: mở **filter sheet**, đổi filter — kết quả khớp desktop (cùng store).
- [ ] Thêm / Sửa / Xóa một / Xóa nhiều; toast đúng; list refresh.
- [ ] Detail → Sửa → Hủy → detail cũ; Detail → Sửa → Lưu → detail mới.
- [ ] Lỗi tải list: thấy **`ErrorState`** + thử lại refetch; không chỉ toast.
- [ ] Mở chi tiết từ list (row đủ field): không có request **`getById` dư** do thiếu seed cache (xem **5.1b**).
- [ ] Detail có bảng con: xóa dòng đang mở detail → drawer con đóng.
- [ ] Export: đúng cột, tên file, encoding; Import: cột bắt buộc, báo lỗi từng dòng nếu có.
- [ ] Form: mọi trường required có `*` đỏ + validation hiển thị khi submit sai.
- [ ] Mobile: thao tác chính tương đương desktop (không “mất” nút).
- [ ] Quyền: user không có quyền không thấy nút tương ứng (smoke test `can*`).

---

*File này tham chiếu chuẩn từ các module: Dự án, Phòng ban, Nhân viên, Công việc. Cập nhật khi có quy ước UI/API mới.*

**TanStack Query (list + detail + form):** [`.cursor/rules/tanstack-query-list-detail-crud.mdc`](../.cursor/rules/tanstack-query-list-detail-crud.mdc), skill dự án `.cursor/skills/tanstack-query-crud-list-detail/SKILL.md`, và mục **C5–C6** trong [`.cursor/rules/egress-checklist.mdc`](../.cursor/rules/egress-checklist.mdc).
