/** Embed đầy đủ — detail / form / returning sau mutation. */
const EMBED_FULL = [
  'cap_quan_ly:mttq_thiet_lap!mttq_can_bo_cap_quan_ly_id_fkey(ten,loai)',
  'to_chuc_ref:mttq_thiet_lap!mttq_can_bo_to_chuc_id_fkey(ten,loai)',
  'dan_toc:mttq_thiet_lap!mttq_can_bo_dan_toc_id_fkey(ten,loai)',
  'trinh_do:mttq_thiet_lap!mttq_can_bo_trinh_do_id_fkey(ten,loai)',
  'ly_luan_chinh_tri:mttq_thiet_lap!mttq_can_bo_ly_luan_chinh_tri_id_fkey(ten,loai)',
  'chuc_vu:mttq_thiet_lap!mttq_can_bo_chuc_vu_id_fkey(ten,loai)',
  'trang_thai:mttq_thiet_lap!mttq_can_bo_trang_thai_id_fkey(ten,loai)',
  'nguoi_tao:var_nhan_vien!mttq_can_bo_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)',
].join(',');

/** Chỉ join phục vụ cột bảng mặc định + filter chip — giảm egress so với FULL. */
const EMBED_LIST = [
  'cap_quan_ly:mttq_thiet_lap!mttq_can_bo_cap_quan_ly_id_fkey(ten,loai)',
  'to_chuc_ref:mttq_thiet_lap!mttq_can_bo_to_chuc_id_fkey(ten,loai)',
  'chuc_vu:mttq_thiet_lap!mttq_can_bo_chuc_vu_id_fkey(ten,loai)',
  'trang_thai:mttq_thiet_lap!mttq_can_bo_trang_thai_id_fkey(ten,loai)',
].join(',');

const BASE_COLS = [
  'id',
  'cap_quan_ly_id',
  'to_chuc_id',
  'ho_ten',
  'ngay_sinh',
  'gioi_tinh',
  'dan_toc_id',
  'ton_giao',
  'dia_chi',
  'dang_vien',
  'trinh_do_id',
  'ly_luan_chinh_tri_id',
  'dien_thoai',
  'chuc_vu_id',
  'ngay_tham_gia_to_chuc',
  'trang_thai_id',
  'ngay_nhap_trang_thai',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const MTTQ_CAN_BO_SELECT_LIST = `${BASE_COLS},${EMBED_LIST}`;
export const MTTQ_CAN_BO_SELECT_FULL = `${BASE_COLS},${EMBED_FULL}`;
export const MTTQ_CAN_BO_RETURNING_FULL = MTTQ_CAN_BO_SELECT_FULL;
