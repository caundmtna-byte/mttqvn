import type { MttqCanBoRow } from '../core/types';

/**
 * Key cho ô tìm tổng + `useMttqCanBoFilterCounts` — **chỉ** field có trong payload
 * `MTTQ_CAN_BO_SELECT_LIST` sau `flattenMttqCanBoRow` (cùng query với danh sách).
 *
 * Không gồm `ten_dan_toc` / `ten_trinh_do` / `ten_ly_luan_chinh_tri` / người tạo:
 * các join đó chỉ có ở `MTTQ_CAN_BO_SELECT_FULL` (detail). Tìm theo các trường đó
 * trên list sẽ lệch (trước đây là rủi ro “có dữ liệu nhưng không ra” khi tối ưu egress).
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
  'ten_to_chuc',
  'ten_chuc_vu',
  'ten_trang_thai',
  'tuoi',
];
