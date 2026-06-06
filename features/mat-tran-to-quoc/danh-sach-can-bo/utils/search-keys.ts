import type { MttqCanBoRow } from '../core/types';

/**
 * Key cho ô tìm tổng + `useMttqCanBoFilterCounts` — field có trong payload
 * `MTTQ_CAN_BO_SELECT_LIST` sau `flattenMttqCanBoRow`.
 */
export const MTTQ_CAN_BO_SEARCHABLE_KEYS: (keyof MttqCanBoRow)[] = [
  'ho_ten',
  'gioi_tinh',
  'ton_giao',
  'dia_chi',
  'dien_thoai',
  'ten_don_vi',
  'ten_phong_ban',
  'ten_bo_phan',
  'ten_to_chuc_arr',
  'ten_chuc_vu',
  'chuc_vu_cap_quan_ly',
  'ten_trang_thai',
  'ten_dan_toc',
  'ten_trinh_do',
  'ten_ly_luan_chinh_tri',
  'tuoi',
];
