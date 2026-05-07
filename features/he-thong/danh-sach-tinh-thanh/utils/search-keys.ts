/** Các key dùng cho ô tìm kiếm tổng (toolbar) — danh sách tỉnh. */
export const TINH_THANH_SEARCHABLE_KEYS = ['ten', 'id', 'so_xa_phuong'] as const;

/** Danh sách xã — `ten_tinh` gắn thêm ở layer filter (map từ tỉnh). */
export const XA_PHUONG_SEARCHABLE_KEYS = ['ten', 'id', 'id_tinh_thanh', 'ten_tinh'] as const;
