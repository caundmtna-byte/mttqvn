import { nhanVienEmbedSelect } from '@/lib/nguoi-thao-tac';

const DON_VI =
  'don_vi:var_ssn_xa_phuong!kho_danh_sach_kho_don_vi_id_fkey(ten,var_ssn_tinh_thanh(ten))';

const LIST_COLS = ['id', 'tt', 'ten_kho', 'don_vi_id', 'mo_ta', 'tg_tao', 'tg_cap_nhat'].join(',');

/** List + detail — không có cột nặng tách riêng. */
const NGUOI = `${nhanVienEmbedSelect('nguoi_tao', 'kho_danh_sach_kho_id_nguoi_tao_fkey')},${nhanVienEmbedSelect('nguoi_cap_nhat', 'kho_danh_sach_kho_id_nguoi_cap_nhat_fkey')}`;

export const KHO_DANH_SACH_KHO_SELECT = `${LIST_COLS},${DON_VI},${NGUOI}`;

export const KHO_DANH_SACH_KHO_RETURNING = KHO_DANH_SACH_KHO_SELECT;
