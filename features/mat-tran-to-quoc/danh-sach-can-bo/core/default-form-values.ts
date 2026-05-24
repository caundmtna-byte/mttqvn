import { MTTQ_CAN_BO_TON_GIAO_DEFAULT } from './constants';
import type { MttqCanBoFormValues } from './schema';

export const MTTQ_CAN_BO_FORM_DEFAULT_VALUES: MttqCanBoFormValues = {
  id_phong_ban: '',
  to_chuc_id: '',
  ho_ten: '',
  ngay_sinh: '',
  gioi_tinh: 'Nam',
  dan_toc_id: '',
  ton_giao: MTTQ_CAN_BO_TON_GIAO_DEFAULT,
  dia_chi: '',
  dang_vien: false,
  trinh_do_id: '',
  ly_luan_chinh_tri_id: '',
  dien_thoai: '',
  chuc_vu_id: '',
  don_vi_id: '',
  ngay_tham_gia_to_chuc: '',
  trang_thai_id: '',
  ngay_nhap_trang_thai: '',
  van_hoa: '',
  ngay_vao_dang: '',
  que_quan: '',
  noi_o_hien_nay: '',
};
