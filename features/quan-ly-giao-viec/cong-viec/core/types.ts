import type { CongViecMucDo, CongViecTrangThai } from './constants';

export type CongViecListScope = 'mine_do' | 'mine_related' | 'mine_assign';

export interface CongViecDanhSachFilters {
  columnSearch: Record<string, string>;
  /** Lọc theo giá trị enum đúng chuỗi DB (đồng bộ với `trang_thai` / `muc_do`). */
  trang_thai: string[];
  muc_do: string[];
}

/** Danh sách / chi tiết — id và FK dạng string (bigint JSON từ Supabase). */
export interface CongViecDanhSach {
  id: string;
  muc_do: CongViecMucDo;
  ten_cong_viec: string;
  ghi_chu: string | null;
  link_tai_lieu: string | null;
  /** ISO date YYYY-MM-DD */
  thoi_han: string | null;
  tien_do: number;
  id_trach_nhiem: string;
  ids_ho_tro: string[];
  trang_thai: CongViecTrangThai;
  ket_qua: string | null;
  link_kq: string | null;
  ngay_hoan_thanh: string | null;
  id_nguoi_tao: string;
  /** FK chương trình năm (nullable). */
  id_chuong_trinh: string | null;
  tg_tao: string;
  tg_cap_nhat: string;
  ho_va_ten_trach_nhiem?: string | null;
  ten_tai_khoan_trach_nhiem?: string | null;
  ho_va_ten_nguoi_tao?: string | null;
  ten_tai_khoan_nguoi_tao?: string | null;
  /** Từ embed PostgREST `chuong_trinh_nam`. */
  ten_chuong_trinh?: string | null;
}

/** Bản ghi đã join tên hỗ trợ (chỉ client, phục vụ tìm kiếm / cột). */
export interface CongViecDanhSachRow extends CongViecDanhSach {
  ho_tro_display: string;
}
