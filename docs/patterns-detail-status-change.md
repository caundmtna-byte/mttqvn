# Quy chuẩn: **Chuyển trạng thái** từ màn detail

## UI bắt buộc

- Luôn dùng **popup (modal) giữa màn**, **không** dùng drawer trượt từ phải.
- Cách làm chuẩn trong repo: **`GenericDrawer` + `variant="modal"`** (`components/shared/GenericDrawer.tsx`).
- Kích thước popup form ngắn: `maxWidthClass={\`w-full ${DIALOG_SIZE.MEDIUM}\`}` (hoặc `COMPACT` nếu chỉ 1–2 trường), import `DIALOG_SIZE` từ `lib/dialog-sizes.ts`.

## Z-index

- Modal dùng `GenericDrawer` có offset z-index riêng so với drawer chi tiết → popup **nổi trên** drawer detail đang mở, không cần `stackLevel` chồng.

## Tham chiếu code

| Ví dụ | File |
|--------|------|
| Đổi trạng thái + ghi chú (MTTQ khen thưởng) | `features/mat-tran-to-quoc/danh-sach-khen-thuong/components/mttq-khen-thuong-chuyen-trang-thai-dialog.tsx` |
| Picker dạng modal (cùng primitive) | `components/shared/PositionPermissionPicker.tsx` (`variant="modal"`) |

## Vị trí nút (nghiệp vụ)

- Nút mở popup thường đặt ở **`DetailToolbar`** (`placement: prominent` — xem `lib/detail-action-placement.ts`, `docs/patterns-data-table-actions.md`).

## Không làm

- Không mở `GenericDrawer` mặc định (slide-in) cho luồng “Chuyển trạng thái” từ detail.
- Không đặt tên component `*Drawer` cho UI này; ưu tiên `*Dialog` hoặc `*Modal` để khớp hành vi.
