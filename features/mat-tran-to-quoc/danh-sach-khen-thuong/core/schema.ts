import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  MTTQ_KHEN_THUONG_DANH_HIEU,
  MTTQ_KHEN_THUONG_CAP,
  MTTQ_KHEN_THUONG_HINH_THUC,
  MTTQ_KHEN_THUONG_TRANG_THAI,
} from './constants';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

/** Một dòng danh sách được khen (dùng trong form cha + drawer dòng). */
export const mttqKhenThuongChiTietLineSchema = z.object({
  id: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  can_bo_id: z.string().trim().min(1, txt('matTranKhenThuong.validation.canBoRequired')),
  cap_khen_thuong: z.enum(MTTQ_KHEN_THUONG_CAP, {
    message: txt('matTranKhenThuong.validation.capKhenThuongRequired'),
  }),
  hinh_thuc_khen: z.enum(MTTQ_KHEN_THUONG_HINH_THUC, {
    message: txt('matTranKhenThuong.validation.hinhThucRequired'),
  }),
  danh_hieu: z.enum(MTTQ_KHEN_THUONG_DANH_HIEU, {
    message: txt('matTranKhenThuong.validation.danhHieuRequired'),
  }),
  noi_dung_khen: optionalText,
  ho_so_khen: optionalText,
});

export type MttqKhenThuongChiTietLineFormValues = z.infer<typeof mttqKhenThuongChiTietLineSchema>;

export const mttqKhenThuongSchema = z.object({
  so_qd: z.string().trim().min(1, txt('matTranKhenThuong.validation.soQdRequired')),
  ngay_khen_thuong: z
    .string()
    .trim()
    .min(1, txt('matTranKhenThuong.validation.ngayRequired')),
  don_vi_de_xuat: optionalText,
  ghi_chu: optionalText,
  trang_thai: z.enum(MTTQ_KHEN_THUONG_TRANG_THAI, {
    message: txt('matTranKhenThuong.validation.trangThaiRequired'),
  }),
  chi_tiet: z
    .array(mttqKhenThuongChiTietLineSchema)
    .min(1, txt('matTranKhenThuong.validation.chiTietMin')),
});

export type MttqKhenThuongFormValues = z.infer<typeof mttqKhenThuongSchema>;

/** Chỉ đổi trạng thái + ghi chú từ detail (toolbar). */
export const mttqKhenThuongStatusChangeSchema = z.object({
  trang_thai: z.enum(MTTQ_KHEN_THUONG_TRANG_THAI, {
    message: txt('matTranKhenThuong.validation.trangThaiRequired'),
  }),
  ghi_chu: optionalText,
});

export type MttqKhenThuongStatusChangeValues = z.infer<typeof mttqKhenThuongStatusChangeSchema>;
