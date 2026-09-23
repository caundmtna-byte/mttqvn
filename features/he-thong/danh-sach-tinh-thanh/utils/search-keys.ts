/** Các key dùng cho ô tìm kiếm tổng (toolbar) — danh sách tỉnh. */
export const TINH_THANH_SEARCHABLE_KEYS = ['thu_tu', 'ten', 'id', 'so_xa_phuong', 'tg_tao', 'tg_cap_nhat'] as const;

/** Danh sách xã — `ten_tinh` gắn thêm ở layer filter (map từ tỉnh). */
export const XA_PHUONG_SEARCHABLE_KEYS = ['thu_tu', 'ten', 'id', 'id_tinh_thanh', 'ten_tinh', 'tg_tao', 'tg_cap_nhat'] as const;
