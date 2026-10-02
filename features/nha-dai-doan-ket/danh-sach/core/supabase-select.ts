const XA_PHUONG = 'xa_phuong:var_ssn_xa_phuong!nddk_nha_dai_doan_ket_xa_phuong_id_fkey(ten)';
const NGUOI_TAO =
  'nguoi_tao:var_nhan_vien!nddk_nha_dai_doan_ket_id_nguoi_tao_fkey(ho_va_ten,ten_tai_khoan)';
const NGUOI_CAP_NHAT =
  'nguoi_cap_nhat:var_nhan_vien!nddk_nha_dai_doan_ket_id_nguoi_cap_nhat_fkey(ho_va_ten,ten_tai_khoan)';

const LIST_COLS = [
  'id',
  'noi_dung_ho_tro',
  'nam',
  'nguon',
  'nguon_ho_tro',
  'ho_ngheo_id',
  'ho_ten_chu_ho',
  'xa_phuong_id',
  'khoi_xom',
  'doi_tuong',
  'loai_hinh_ho_tro',
  'so_tien',
  'trang_thai',
  'ngay_cap_nhat_trang_thai',
  'ghi_chu',
  'id_nguoi_tao',
  'tg_tao',
  'tg_cap_nhat',
  'id_nguoi_cap_nhat',
].join(',');

export const NDDK_SELECT = `${LIST_COLS},${XA_PHUONG},${NGUOI_TAO},${NGUOI_CAP_NHAT}`;

/** Dữ liệu 3 biên bản — chỉ màn chi tiết / sửa / in mới cần. */
export const NDDK_BIEN_BAN_COLS = [
  'ngay_khao_sat',
  'hien_trang_nha',
  'hoan_canh_gia_dinh',
  'nhu_cau_ho_tro',
  'ghi_chu_khao_sat',
  'ngay_kiem_tra_hoan_thanh',
  'thanh_phan_kiem_tra',
  'dien_tich_san',
  'phan_nen',
  'phan_mai',
  'phan_khung_tuong',
  'tong_gia_tri',
  'nguon_khac',
  'ngay_ban_giao',
  'dia_diem_ban_giao',
  'ban_giao_ho_ten',
  'ban_giao_chuc_vu',
  'lam_chung_ho_ten',
  'lam_chung_chuc_vu',
  'so_quyet_dinh',
  'ngay_quyet_dinh',
] as const;

/** Một hồ sơ đầy đủ — `getNhaDaiDoanKetById` và `returning` của thêm/sửa. */
export const NDDK_SELECT_FULL = `${NDDK_SELECT},${NDDK_BIEN_BAN_COLS.join(',')}`;
/**
 * Trả về bản ĐẦY ĐỦ: mutation ghi thẳng kết quả vào cache chi tiết, trả thiếu
 * cột thì màn chi tiết mất dữ liệu biên bản cho tới khi tải lại.
 */
export const NDDK_RETURNING = NDDK_SELECT_FULL;
