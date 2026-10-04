/**
 * Danh mục nghiệp vụ của module Tiếp nhận — đối chiếu 1-1 với CHECK của bảng
 * `tn_tiep_nhan` (migration `20261004130000_tn_tiep_nhan`). `constants.test.ts` đọc
 * `supabase/schema.sql` để giữ hai bên khớp nhau.
 */
export const TN_HINH_THUC_VALUES = ['Chuyển khoản', 'Tiền mặt'] as const;
export type TnHinhThuc = (typeof TN_HINH_THUC_VALUES)[number];

export const TN_TRANG_THAI_VALUES = ['Đăng ký', 'Đã bàn giao'] as const;
export type TnTrangThai = (typeof TN_TRANG_THAI_VALUES)[number];
export const TN_TRANG_THAI_DEFAULT: TnTrangThai = 'Đăng ký';

/**
 * Năm mục đích tài trợ của "Biên bản xác nhận khoản tài trợ" (TT 20/2026/TT-BTC).
 * `value` là mã lưu DB; `label` in nguyên văn lên biên bản.
 */
export const TN_MUC_DICH = [
  { value: 'giao_duc_y_te_van_hoa', label: 'Tài trợ cho giáo dục, y tế, văn hóa' },
  { value: 'thien_tai_dich_benh', label: 'Phòng, chống, khắc phục hậu quả thiên tai, dịch bệnh' },
  {
    value: 'nha_dai_doan_ket',
    label: 'Làm nhà đại đoàn kết, nhà tình nghĩa, nhà cho các đối tượng chính sách theo quy định của pháp luật',
  },
  {
    value: 'dia_ban_dbkk',
    label:
      'Tài trợ theo quy định của Chính phủ, Thủ tướng Chính phủ dành cho các địa phương thuộc địa bàn có điều kiện kinh tế - xã hội đặc biệt khó khăn',
  },
  {
    value: 'khoa_hoc_cong_nghe',
    label: 'Tài trợ cho nghiên cứu khoa học, phát triển công nghệ và đổi mới sáng tạo, chuyển đổi số',
  },
] as const;
export type TnMucDich = (typeof TN_MUC_DICH)[number]['value'];
export const TN_MUC_DICH_VALUES = TN_MUC_DICH.map((m) => m.value) as readonly TnMucDich[];

/** Khớp CHECK `tn_phu_luc_chk`. */
export const TN_PHU_LUC_MAX = 30;
/** Phụ lục để trống ⇒ in sẵn 10 dòng rỗng để viết tay (đúng mẫu). */
export const TN_PHU_LUC_DONG_TRONG = 10;

export const TN_LIST_PATH = '/an-sinh-xa-hoi/kho-cuu-tro/tiep-nhan';
export const TN_LOAI_PHIEU_IN = ['bien-ban-xac-nhan'] as const;
export type TnLoaiPhieuIn = (typeof TN_LOAI_PHIEU_IN)[number];
export function isTnLoaiPhieuIn(v: unknown): v is TnLoaiPhieuIn {
  return typeof v === 'string' && (TN_LOAI_PHIEU_IN as readonly string[]).includes(v);
}
