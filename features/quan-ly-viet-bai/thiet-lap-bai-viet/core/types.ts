export interface BaiVietTheLoai {
  id: string;
  ten_the_loai: string;
  mo_ta: string | null;
  don_gia: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type BaiVietThietLapKhacLoai = 'trang_dang' | 'nguon_dang';

export interface BaiVietThietLapKhac {
  id: string;
  loai: BaiVietThietLapKhacLoai;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

/** Bộ lọc bảng thể loại (chỉ search theo cột + ô tìm chung). */
export type ArticleTheLoaiFilters = {
  columnSearch: Record<string, string>;
};

/** Bộ lọc bảng thiết lập khác (trang đăng / nguồn đăng). */
export type ArticleKhacFilters = {
  columnSearch: Record<string, string>;
};
