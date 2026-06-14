const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_khen_thuong_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan,id_phong_ban)';

const LIST_BASE_COLS = [
  'id',
  'so_qd',
  'ngay_khen_thuong',
  'don_vi_de_xuat',
  'trang_thai',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

const FULL_ONLY_COLS = ['ghi_chu'].join(',');

/**
 * Danh sách: dòng con tối thiểu (`id` + `can_bo.don_vi_id` + chip lọc) để gate phân quyền Xã.
 * `so_dong` = `mảng.length`.
 */
const CT_LIST_EMBED =
  'mttq_khen_thuong_ct(id,cap_khen_thuong,hinh_thuc_khen,danh_hieu,can_bo:mttq_can_bo!mttq_khen_thuong_ct_can_bo_id_fkey(don_vi_id))';

export const MTTQ_KHEN_THUONG_SELECT_LIST = `${LIST_BASE_COLS},${NGUOI_TAO},${CT_LIST_EMBED}`;

const CT_FULL =
  'mttq_khen_thuong_ct(id,id_khen_thuong,can_bo_id,cap_khen_thuong,hinh_thuc_khen,danh_hieu,noi_dung_khen,ho_so_khen,can_bo:mttq_can_bo!mttq_khen_thuong_ct_can_bo_id_fkey(ho_ten,don_vi_id,id_nguoi_tao))';

/** Chi tiết / sau ghi: đủ dòng con + tên cán bộ. */
export const MTTQ_KHEN_THUONG_SELECT_FULL = `${LIST_BASE_COLS},${FULL_ONLY_COLS},${NGUOI_TAO},${CT_FULL}`;

export const MTTQ_KHEN_THUONG_RETURNING = 'id,tg_cap_nhat';

/** Embed quyết định cha trên dòng `mttq_khen_thuong_ct` (danh sách phẳng tab Chi tiết). */
const QD_FOR_CT_FLAT_LIST = [
  'id',
  'id_nguoi_tao',
  'so_qd',
  'ngay_khen_thuong',
  'don_vi_de_xuat',
  'trang_thai',
  'tg_cap_nhat',
  NGUOI_TAO,
].join(',');

/** Query tab Danh sách chi tiết — không kéo `noi_dung_khen` / `ho_so_khen` (chỉ detail drawer). */
export const MTTQ_KHEN_THUONG_CT_SELECT_FLAT_LIST = `id,id_khen_thuong,can_bo_id,cap_khen_thuong,hinh_thuc_khen,danh_hieu,qd:mttq_khen_thuong!mttq_khen_thuong_ct_id_khen_thuong_fkey(${QD_FOR_CT_FLAT_LIST}),can_bo:mttq_can_bo!mttq_khen_thuong_ct_can_bo_id_fkey(ho_ten,don_vi_id)`;

/** Chi tiết dòng CT khi cần nội dung khen / hồ sơ. */
export const MTTQ_KHEN_THUONG_CT_SELECT_FLAT_FULL = `${MTTQ_KHEN_THUONG_CT_SELECT_FLAT_LIST.replace(
  'danh_hieu,qd:',
  'danh_hieu,noi_dung_khen,ho_so_khen,qd:',
)}`;
