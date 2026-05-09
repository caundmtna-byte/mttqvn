import {
  MTTQ_CAN_BO_SELECT_FULL,
  MTTQ_CAN_BO_SELECT_LIST,
  MTTQ_CAN_BO_SELECT_STATS,
} from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/supabase-select';

const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!mttq_uy_vien_uy_ban_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan,id_phong_ban)';

const NHIEM_KY = 'nhiem_ky:mttq_nhiem_ky!mttq_uy_vien_uy_ban_nhiem_ky_id_fkey(ten_nhiem_ky)';

const DON_VI = 'don_vi:var_ssn_xa_phuong!mttq_uy_vien_uy_ban_don_vi_id_fkey(ten,id_tinh_thanh)';

/** Embed cán bộ — FK mặc định PostgreSQL sau migration can_bo_id */
const CAN_BO_LIST = `can_bo:mttq_can_bo!mttq_uy_vien_uy_ban_can_bo_id_fkey(${MTTQ_CAN_BO_SELECT_LIST})`;
const CAN_BO_FULL = `can_bo:mttq_can_bo!mttq_uy_vien_uy_ban_can_bo_id_fkey(${MTTQ_CAN_BO_SELECT_FULL})`;
const CAN_BO_STATS = `can_bo:mttq_can_bo!mttq_uy_vien_uy_ban_can_bo_id_fkey(${MTTQ_CAN_BO_SELECT_STATS})`;

/** Cột tối thiểu để render bảng danh sách + summary điểm danh — giảm egress so với FULL. */
const LIST_COLS = [
  'id',
  'ma_uv',
  'nhiem_ky_id',
  'don_vi_id',
  'can_bo_id',
  'trang_thai_tham_gia',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

/** Đầy đủ cột UB + embed cán bộ — detail / form sửa (hồ sơ cán bộ lấy từ embed). */
const FULL_COLS = [LIST_COLS, 'ghi_chu'].join(',');

export const MTTQ_UY_VIEN_UY_BAN_SELECT_LIST = `${LIST_COLS},${NHIEM_KY},${DON_VI},${NGUOI_TAO},${CAN_BO_LIST}`;

/** Báo cáo thống kê: embed cán bộ (dang_vien, SĐT từ hồ sơ). */
const STATS_COLS = [
  'id',
  'ma_uv',
  'nhiem_ky_id',
  'don_vi_id',
  'can_bo_id',
  'trang_thai_tham_gia',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const MTTQ_UY_VIEN_UY_BAN_SELECT_STATS = `${STATS_COLS},${NHIEM_KY},${DON_VI},${NGUOI_TAO},${CAN_BO_STATS}`;

export const MTTQ_UY_VIEN_UY_BAN_SELECT_FULL = `${FULL_COLS},${NHIEM_KY},${DON_VI},${NGUOI_TAO},${CAN_BO_FULL}`;

/** Trả về sau insert/update — full để TanStack Query có đủ dữ liệu cho detail mở ngay sau đó. */
export const MTTQ_UY_VIEN_UY_BAN_RETURNING_FULL = MTTQ_UY_VIEN_UY_BAN_SELECT_FULL;
