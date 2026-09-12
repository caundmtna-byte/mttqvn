/** Loại nhắc — khớp ràng buộc `thong_bao_loai_check` ở database. */
export type ThongBaoLoai =
  | 'cong_viec_qua_han'
  | 'cong_viec_sap_den_han'
  | 'tang_luong_sap_den_han';

/** Sắc thái hiển thị — khớp ràng buộc `thong_bao_muc_do_check` ở database. */
export type ThongBaoMucDo = 'canh_bao' | 'sap_toi' | 'tin';

/** Một dòng trong hộp thông báo. Chỉ gồm cột giao diện thực sự dùng. */
export interface ThongBao {
  id: string;
  loai: ThongBaoLoai;
  muc_do: ThongBaoMucDo;
  tieu_de: string;
  noi_dung: string;
  /** Đường dẫn nội bộ để mở đúng màn hình; null = không mở được đi đâu. */
  duong_dan: string | null;
  da_doc: boolean;
  /** ISO timestamp. */
  tg_tao: string;
}
