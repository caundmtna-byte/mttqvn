/**
 * Embed `mttq_can_bo` → `var_phong_ban` (không embed lồng `cha` — PostgREST báo lỗi
 * relationship var_phong_ban ↔ var_phong_ban). Tên phòng ban cha lấy client qua `getDepartments` + `cha_id`.
 */
export const MTTQ_CAN_BO_EMBED_PHONG_BAN =
  'phong_ban:var_phong_ban!mttq_can_bo_phong_ban_id_fkey(ten_phong_ban,cha_id)';

/** Embed đầy đủ — detail / form / returning sau mutation. Export cho join từ bảng cha. */
export const MTTQ_CAN_BO_EMBED_FULL = [
  'to_chuc_ref:mttq_thiet_lap!mttq_can_bo_to_chuc_id_fkey(ten,loai)',
  'dan_toc:mttq_thiet_lap!mttq_can_bo_dan_toc_id_fkey(ten,loai)',
  'trinh_do:mttq_thiet_lap!mttq_can_bo_trinh_do_id_fkey(ten,loai)',
  'ly_luan_chinh_tri:mttq_thiet_lap!mttq_can_bo_ly_luan_chinh_tri_id_fkey(ten,loai)',
  'chuc_vu:var_chuc_vu!mttq_can_bo_chuc_vu_id_fkey(ten_chuc_vu,cap_quan_ly)',
  'don_vi:var_ssn_xa_phuong!mttq_can_bo_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))',
  MTTQ_CAN_BO_EMBED_PHONG_BAN,
  'trang_thai:mttq_thiet_lap!mttq_can_bo_trang_thai_id_fkey(ten,loai)',
  'nguoi_tao:var_nhan_vien!mttq_can_bo_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)',
].join(',');

/** Chỉ join phục vụ cột bảng mặc định + filter chip — giảm egress so với FULL. Export để embed từ bảng cha (vd. ủy viên ủy ban). */
export const MTTQ_CAN_BO_EMBED_LIST = [
  'to_chuc_ref:mttq_thiet_lap!mttq_can_bo_to_chuc_id_fkey(ten,loai)',
  'dan_toc:mttq_thiet_lap!mttq_can_bo_dan_toc_id_fkey(ten,loai)',
  'trinh_do:mttq_thiet_lap!mttq_can_bo_trinh_do_id_fkey(ten,loai)',
  'ly_luan_chinh_tri:mttq_thiet_lap!mttq_can_bo_ly_luan_chinh_tri_id_fkey(ten,loai)',
  'chuc_vu:var_chuc_vu!mttq_can_bo_chuc_vu_id_fkey(ten_chuc_vu,cap_quan_ly)',
  'don_vi:var_ssn_xa_phuong!mttq_can_bo_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))',
  MTTQ_CAN_BO_EMBED_PHONG_BAN,
  'trang_thai:mttq_thiet_lap!mttq_can_bo_trang_thai_id_fkey(ten,loai)',
].join(',');

const BASE_COLS = [
  'id',
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
  'phong_ban_id',
  'don_vi_id',
  'ngay_tham_gia_to_chuc',
  'trang_thai_id',
  'ngay_nhap_trang_thai',
  'van_hoa',
  'ngay_vao_dang',
  'que_quan',
  'noi_o_hien_nay',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const MTTQ_CAN_BO_SELECT_LIST = `${BASE_COLS},${MTTQ_CAN_BO_EMBED_LIST}`;

/** Báo cáo thống kê: bỏ cột ít dùng để giảm egress; giữ embed LIST + dân tộc/trình độ cho nhãn filter. */
const STATS_COLS = [
  'id',
  'to_chuc_id',
  'ho_ten',
  'ngay_sinh',
  'gioi_tinh',
  'dan_toc_id',
  'dang_vien',
  'trinh_do_id',
  'ly_luan_chinh_tri_id',
  'dien_thoai',
  'chuc_vu_id',
  'phong_ban_id',
  'don_vi_id',
  'trang_thai_id',
  'ngay_nhap_trang_thai',
  'van_hoa',
  'ngay_vao_dang',
  'que_quan',
  'noi_o_hien_nay',
  'id_nguoi_tao',
  'tg_tao',
].join(',');

/**
 * Báo cáo dùng đủ embed của LIST (đã gồm dan_toc / trinh_do / ly_luan_chinh_tri qua FK).
 * KHÔNG khai báo lại 3 embed này — duplicate cùng FK + cùng alias khiến PostgREST
 * sinh JOIN lặp, Postgres throw `table name "mttq_can_bo_dan_toc_1" specified more than once`.
 */
export const MTTQ_CAN_BO_SELECT_STATS = `${STATS_COLS},${MTTQ_CAN_BO_EMBED_LIST}`;
export const MTTQ_CAN_BO_SELECT_FULL = `${BASE_COLS},${MTTQ_CAN_BO_EMBED_FULL}`;
export const MTTQ_CAN_BO_RETURNING_FULL = MTTQ_CAN_BO_SELECT_FULL;
