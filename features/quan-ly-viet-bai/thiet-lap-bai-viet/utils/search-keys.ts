/** Các trường dùng cho ô tìm kiếm chung (toolbar) — thể loại bài viết */
export const ARTICLE_THE_LOAI_SEARCH_KEYS = [
  'ten_the_loai',
  'mo_ta',
  'don_gia',
  'tg_tao',
  'tg_cap_nhat',
] as const satisfies readonly string[];

/** Các trường tìm kiếm chung — thiết lập khác (trang đăng / nguồn đăng) */
export const ARTICLE_KHAC_SEARCH_KEYS = [
  'ten',
  'mo_ta',
  'thu_tu',
  'tg_tao',
  'tg_cap_nhat',
] as const satisfies readonly string[];
