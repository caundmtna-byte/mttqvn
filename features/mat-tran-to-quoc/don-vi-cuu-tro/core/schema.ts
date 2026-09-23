import { z } from 'zod';
import { txt } from '@/lib/text';
import { KHO_DON_VI_CUU_TRO_LOAI } from './loai';
import { DON_VI_GIOI_THIEU_TINH } from '../utils/don-vi-gioi-thieu';

export const khoDonViCuuTroLoaiSchema = z.enum(KHO_DON_VI_CUU_TRO_LOAI, {
  message: txt('matTranDonViCuuTro.validation.loaiRequired'),
});

export const khoDonViCuuTroSchema = z.object({
  loai: khoDonViCuuTroLoaiSchema,
  ten: z.string().trim().min(1, txt('matTranDonViCuuTro.validation.tenRequired')),
  // Giữ kiểu string chứ không `z.coerce.number()`: react-hook-form luôn trả chuỗi,
  // mà `coerce` biến ô để trống thành 0 — tức "chưa nhập" hoá thành "nhóm 0 người".
  so_nguoi: z
    .string()
    .trim()
    .refine((s) => s === '' || /^\d{1,7}$/.test(s), txt('matTranDonViCuuTro.validation.soNguoiInvalid')),
  nguoi_dai_dien: z.string().max(255),
  chuc_vu: z.string().max(255),
  dia_chi: z.string().max(2000),
  dien_thoai: z.string().max(64),
  // Một ô chọn, ba trạng thái: '' | sentinel cấp tỉnh | id xã/phường.
  don_vi_gioi_thieu: z
    .string()
    .trim()
    .refine(
      (s) => s === '' || s === DON_VI_GIOI_THIEU_TINH || /^\d+$/.test(s),
      txt('matTranDonViCuuTro.validation.donViGioiThieuInvalid'),
    ),
  email: z
    .string()
    .trim()
    .max(320)
    .refine((s) => s === '' || z.string().email().safeParse(s).success, txt('matTranDonViCuuTro.validation.emailInvalid')),
  ghi_chu: z.string().max(10_000),
});

export type KhoDonViCuuTroFormValues = z.infer<typeof khoDonViCuuTroSchema>;
