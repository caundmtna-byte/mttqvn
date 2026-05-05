# Quy ước giao diện (UI Conventions)

## Trang submenu (dashboard nhóm)

- **Tên nhóm module** (vd. "Nhân sự", "Bảo mật & cấu hình" trên Hệ thống) **luôn dùng màu primary** (`text-primary`).
- Áp dụng cho mọi trang submenu có danh sách nhóm + module (Hệ thống, và sau này Hành chính, Nhân sự, Marketing, Tài chính, Mua hàng, Kho vận khi đã có trang thật).
- Cách làm: dùng component **`ModuleDashboardLayout`** (`components/dashboard/ModuleDashboardLayout.tsx`), truyền `groups` với `groupTitle` và `items`. Component đã style `groupTitle` bằng `text-primary`.
- Trang placeholder submenu (chưa xây): tên nhóm cũng dùng primary qua **`ComingSoonLayout`** với prop `titlePrimary={true}` (vd. trong `SubmenuPlaceholder`).

## Dialog và Drawer (kích thước thống nhất)

- **Nguồn constant:** `lib/dialog-sizes.ts`.
- **Dialog (modal giữa màn hình):** dùng `DIALOG_SIZE`:
  - `CONFIRM` (max-w-sm): xác nhận đơn giản (xóa, hủy thao tác).
  - `COMPACT` (max-w-md): lựa chọn nhanh (picker đơn giản).
  - `LARGE` (max-w-2xl): nội dung nhiều, rộng và cao (import, export, upload).
- **Drawer (slide từ phải):**
  - **Form và Detail dùng chung kích thước:** 48rem (768px). Dùng `DRAWER_WIDTH_FORM` / `DRAWER_WIDTH_DETAIL` hoặc `getDrawerWidthClass(0)`.
  - **Drawer chồng:** khi mở drawer trên một drawer đang mở (vd. Form mở từ Detail), drawer ở trên dùng **44rem** và z-index cao hơn. Truyền `stackLevel={1}` (hoặc cao hơn) cho `GenericDrawer`; width lấy từ `getDrawerWidthClass(stackLevel)`.
- **GenericDrawer:** prop `stackLevel` (mặc định 0). `stackLevel > 0` → width 44rem, z-index tăng theo level.

## Section trong Form và Detail

- **Tiêu đề section luôn màu primary.** Dùng component **`Section`** (hoặc **`FormSection`** / **`DetailSection`**) trong form và detail.
- **Mặc định:** `variant="primary"` (không cần truyền) → tiêu đề `text-primary`, border `border-primary/20`.
- **Ngoại lệ:** Chỉ dùng `variant="muted"` khi section thực sự phụ, ít cần nhấn mạnh (ít dùng).
- Áp dụng thống nhất cho mọi module (nhân viên, cấp bậc, chức vụ, v.v.) để giao diện đồng bộ.

## Trường bắt buộc trong form (Required fields)

- **Trường bắt buộc phải có dấu sao (*) bên cạnh label.** Component **Input** và **Textarea** (`components/ui/`) đã hỗ trợ prop **`required`**: khi `required={true}` sẽ render `<span className="text-red-500 ml-0.5">*</span>` cạnh label.
- **Quy ước:** Mọi form (drawer, dialog, page form) phải truyền **`required`** cho các trường bắt buộc (vd. tên, mã, nội dung câu hỏi). Validation vẫn dùng schema (zod, yup, v.v.); prop `required` chỉ dùng để hiển thị dấu sao, giúp người dùng nhận biết trường bắt buộc.
- **Áp dụng:** Tất cả module (thiết lập khóa học, nhân viên, hợp đồng, v.v.) dùng chung quy ước này.

## Design system (border radius, button, error)

- **Border radius:** Dùng 2–3 mức thống nhất.
  - `rounded-lg`: form control (input, select, textarea, combobox), nút thường, chip.
  - `rounded-xl`: card, panel, dropdown list, section.
  - `rounded-2xl`: modal, drawer, dialog, thẻ lớn (MainCard).
  - Tránh trộn `rounded-md` với `rounded-lg` cho cùng mục đích; ưu tiên `rounded-lg` cho form.
- **Button height:** Chuẩn theo size (Button component / toolbar).
  - `sm`: `h-8` (32px).
  - `default`: `h-10` (40px).
  - `lg`: theo thiết kế (vd. `h-11`). Toolbar và action trong form nên dùng sm hoặc default thống nhất.
- **Error message (form):** Luôn dùng `text-xs` cho thông báo lỗi dưới input/select/textarea (Input, Select, Textarea, Combobox). Không đổi sang `text-sm` để giữ đồng bộ và tiết kiệm không gian.

## Toolbar và Filter chip (màn mới)

- **Toolbar mới:** Luôn truyền `filters` bằng **FilterChipMultiSelect** hoặc **FilterChipSingleSelect** (từ `components/shared/`). Không tự viết dropdown multi-select riêng.
- **Quy chuẩn filter chip:** Mỗi dropdown có "Chọn tất cả" (trái) và nút "Xóa chọn" (phải); đã implement trong **MultiSelect** và **MobileFilterSheet**.
- **Mobile:** Truyền đủ **filterGroups** cho **GenericToolbar** để dùng **MobileFilterSheet** (mỗi nhóm filter có "Xóa chọn" theo nhóm).
- **Count và ẩn option rỗng (chuẩn chung):**
  - **Count thực tế:** Khi filter chip hiển thị count (số lượng), danh sách dùng để đếm phải là **danh sách người dùng được phép xem** (sau phân quyền). Toolbar nhận prop danh sách đó (vd. `employees`, `items`) và hook đếm (vd. `useFilterCounts`) đếm trên chính list đó.
  - **Chỉ hiện option có dữ liệu:** Option có `count === 0` (và không đang chọn) được ẩn. Util **`filterOptionsWithCount`** (`lib/filterOptionsWithCount.ts`) và prop **`hideZeroCount`** (mặc định `true`) trên **FilterChipMultiSelect** / **MobileFilterSheet** đảm bảo điều này; toolbar chỉ cần truyền `options` có field `count`, không cần lọc tay.
- **Ví dụ:** Xem `CapPhatThuHoiToolbar`, `nhan-vien-toolbar` (có count); các `*-toolbar.tsx` khác: `filters` = nhiều `<FilterChipMultiSelect />`, `filterGroups` = mảng `{ key, label, icon, options, value, onChange }` khớp với từng filter.

## Tóm tắt

| Ngữ cảnh | Thành phần | Màu chữ |
|----------|------------|---------|
| Trang submenu (dashboard thật) | Tiêu đề nhóm (groupTitle) | `text-primary` |
| Trang placeholder submenu | Tiêu đề (tên nhóm) | `text-primary` (titlePrimary) |
| Form / Detail | Tiêu đề section (Section / FormSection / DetailSection) | `text-primary` (mặc định, variant='primary') |

| Mục đích | Loại | Kích thước / Ghi chú |
|----------|------|----------------------|
| Xác nhận (confirm, xóa) | Dialog | DIALOG_SIZE.CONFIRM (max-w-sm) |
| Import / Export (rộng, cao) | Dialog | DIALOG_SIZE.LARGE (max-w-2xl, max-h 85vh) |
| Form drawer | Drawer | 48rem (chung với Detail) |
| Detail drawer | Drawer | 48rem (chung với Form) |
| Drawer chồng (mở từ drawer khác) | Drawer | 44rem, stackLevel ≥ 1 |
