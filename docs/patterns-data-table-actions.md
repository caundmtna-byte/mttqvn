# Pattern: thao tác trên bảng và placement detail

## Bảng (list)

- **Khuyến nghị**: một nút **Sửa** (hoặc hành động chính) + menu **⋮** cho các thao tác phụ / nguy hiểm (xóa, đổi trạng thái, …).
- **Primitives**: `components/shared/row-actions` — `TableRowIconButton`, `RowActionsOverflowMenu`, `useRowMenuOpenState`, `DataTableRowActions`.
- **Chiều rộng cột**: `GenericTable` dùng ~92px cho cột actions mặc định; nếu cần nhiều icon luôn hiện, tăng `minWidth` cột trong `DEFAULT_COLUMNS` của store.
- **Header cột — sort A–Z + tìm + filter tick**: `GenericTable` `renderColumnHeaderAccessory` + `hideSortOnColumnLabel`; reuse `ColumnHeaderSortMenu` / `ColumnHeaderSearch` / `ColumnHeaderFilter` từ `@/components/shared/column-header` (mẫu `nhan-vien-table.tsx`; module MTTQ khen thưởng: `mttq-khen-thuong-table.tsx`). Checklist: **`docs/checklist-module.md` §7.4**.

## Detail — placement

Định nghĩa type và helper: `lib/detail-action-placement.ts`.

## Detail — chuyển trạng thái

- **Popup (modal) giữa màn**, không phải drawer trượt.
- Chuẩn kỹ thuật: `GenericDrawer` + `variant="modal"` + `DIALOG_SIZE.*` — chi tiết và ví dụ: **`docs/patterns-detail-status-change.md`**.

| `DetailActionPlacement` | Vùng UI |
|-------------------------|---------|
| `prominent` | Thanh hành động chính — `DetailToolbar` |
| `inline` | Bên phải giá trị trường — `DetailField` prop `trailing` |

`partitionDetailActions(actions)` trả về `prominent[]` và `inlineByFieldKey` để feature map vào layout.

## i18n

- `common.moreRowActions`: nhãn nút ⋮ (thay cho copy riêng từng module khi dùng `DataTableRowActions`).
