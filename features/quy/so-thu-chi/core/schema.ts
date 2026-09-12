import { z } from 'zod';
import { txt } from '@/lib/text';
import { QUY_LOAI_KEYS } from '../../core/constants';
import { isSoTienHopLe, parseTienInput } from '../../utils/quy-tien';

/**
 * Form lập phiếu.
 *
 * Số tiền để dạng CHUỖI trong form (cán bộ gõ `1.500.000`) và chỉ đổi sang số ở
 * bước cuối. Hai lỗi được tách riêng — "không đọc được" khác hẳn "phải lớn hơn
 * 0" — vì với sổ tiền, câu lỗi mơ hồ là câu lỗi vô dụng.
 */
export const quySoThuChiSchema = z.object({
  loai: z.enum(QUY_LOAI_KEYS, { message: txt('quy.soThuChi.validation.loaiRequired') }),
  ngay_chung_tu: z
    .string()
    .trim()
    .min(1, txt('quy.soThuChi.validation.ngayRequired')),
  khoan_id: z.string().trim().min(1, txt('quy.soThuChi.validation.khoanRequired')),
  tai_khoan_id: z.string().trim().min(1, txt('quy.soThuChi.validation.taiKhoanRequired')),
  so_tien: z
    .string()
    .trim()
    .min(1, txt('quy.soThuChi.validation.soTienRequired'))
    .refine((s) => parseTienInput(s) != null, txt('quy.soThuChi.validation.soTienKhongDoc'))
    .refine(
      (s) => isSoTienHopLe(parseTienInput(s)),
      txt('quy.soThuChi.validation.soTienPhaiDuong'),
    ),
  noi_dung: z.string().trim().min(1, txt('quy.soThuChi.validation.noiDungRequired')),
  nguoi_nop_nhan: z.string().max(300),
  don_vi_id: z
    .string()
    .trim()
    .refine((s) => s === '' || /^\d+$/.test(s), txt('quy.soThuChi.validation.donViInvalid')),
  chung_tu_goc: z.string().max(300),
  ghi_chu: z.string().max(10_000),
});

export type QuySoThuChiFormValues = z.infer<typeof quySoThuChiSchema>;
