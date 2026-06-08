const CA_NHAN =
  'ca_nhan:dttg_thong_tin_ca_nhan_tieu_bieu!dttg_tham_hoi_ca_nhan_ca_nhan_id_fkey(ho_va_ten,doi_tuong,chuc_vu_vi_tri)';

const PHONG_BAN =
  'phong_ban:var_phong_ban!dttg_tham_hoi_ca_nhan_phong_ban_tham_muu_id_fkey(ten_phong_ban)';

const DON_VI_THAM_HOI =
  'don_vi_tham_hoi:var_ssn_xa_phuong!dttg_tham_hoi_ca_nhan_don_vi_tham_hoi_id_fkey(ten,var_ssn_tinh_thanh(ten))';

const XA_PHUONG =
  'xa_phuong:var_ssn_xa_phuong!dttg_tham_hoi_ca_nhan_xa_phuong_id_fkey(ten,var_ssn_tinh_thanh(ten))';

const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!dttg_tham_hoi_ca_nhan_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';

const LIST_COLS = [
  'id',
  'ca_nhan_id',
  'phong_ban_tham_muu_id',
  'doi_tuong',
  'chuc_vu_vi_tri',
  'dip_tham_hoi',
  'thoi_gian_du_kien',
  'don_vi_tham_hoi_id',
  'qua_tang',
  'xa_phuong_id',
  'trang_thai',
  'ket_qua_ghi_chu',
  'link_ket_qua',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
].join(',');

export const DTTG_THAM_HOI_CA_NHAN_SELECT = `${LIST_COLS},${CA_NHAN},${PHONG_BAN},${DON_VI_THAM_HOI},${XA_PHUONG},${NGUOI_TAO}`;

export const DTTG_THAM_HOI_CA_NHAN_RETURNING = DTTG_THAM_HOI_CA_NHAN_SELECT;
