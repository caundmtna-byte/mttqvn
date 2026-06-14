import { z } from 'zod';
import { txt } from '@/lib/text';
import { NHAP_XUAT_KHO_LOAI_PHIEU } from './constants';

const idStr = z.string().trim().min(1);

export const nhapXuatKhoCtLineSchema = z.object({
  /** id dòng chi tiết khi sửa (chuỗi số). Trống/undefined = thêm mới. */
  id: z.string().optional(),
  hang_hoa_id: idStr,
  /** Snapshot tại thời điểm lập phiếu — auto-fill từ hàng hóa. */
  don_vi_tinh: z.string().trim().min(1),
  /** Lưu ở form là string để xử lý input dễ hơn — service convert sang number. */
  so_luong: z
    .string()
    .trim()
    .min(1)
    .refine((s) => Number.isFinite(Number(s)) && Number(s) > 0, {
      message: txt('matTranNhapXuatKho.validation.soLuongInvalid'),
    }),
  don_gia: z
    .string()
    .trim()
    .refine((s) => s === '' || (Number.isFinite(Number(s)) && Number(s) >= 0), {
      message: txt('matTranNhapXuatKho.validation.donGiaInvalid'),
    }),
  ghi_chu: z.string().max(2000).optional(),
});

export type NhapXuatKhoCtLineFormValues = z.infer<typeof nhapXuatKhoCtLineSchema>;

const baseFormSchema = z.object({
  loai_phieu: z.enum(NHAP_XUAT_KHO_LOAI_PHIEU),
  ngay_phieu: z.string().trim().min(1, txt('matTranNhapXuatKho.validation.ngayPhieuRequired')),
  kho_xuat_id: z.string().trim().optional(),
  kho_nhap_id: z.string().trim().optional(),
  don_vi_cuu_tro_id: z.string().trim().optional(),
  dot_cuu_tro_id: z.string().trim().optional(),
  ghi_chu: z.string().max(50_000).optional(),
  nguoi_giao_nhan: z.string().max(500).optional(),
  bo_phan: z.string().max(500).optional(),
  chung_tu_goc: z.string().max(2000).optional(),
  chi_tiet: z
    .array(nhapXuatKhoCtLineSchema)
    .min(1, txt('matTranNhapXuatKho.validation.chiTietMin')),
});

export const nhapXuatKhoFormSchema = baseFormSchema.superRefine((data, ctx) => {
  switch (data.loai_phieu) {
    case 'nhap_ngoai': {
      if (!data.don_vi_cuu_tro_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['don_vi_cuu_tro_id'],
          message: txt('matTranNhapXuatKho.validation.donViCuuTroRequired'),
        });
      }
      if (!data.kho_nhap_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kho_nhap_id'],
          message: txt('matTranNhapXuatKho.validation.khoNhapRequired'),
        });
      }
      break;
    }
    case 'xuat_ngoai': {
      if (!data.kho_xuat_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kho_xuat_id'],
          message: txt('matTranNhapXuatKho.validation.khoXuatRequired'),
        });
      }
      if (!data.dot_cuu_tro_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dot_cuu_tro_id'],
          message: txt('matTranNhapXuatKho.validation.dotCuuTroRequired'),
        });
      }
      break;
    }
    case 'chuyen_kho': {
      if (!data.kho_xuat_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kho_xuat_id'],
          message: txt('matTranNhapXuatKho.validation.khoXuatRequired'),
        });
      }
      if (!data.kho_nhap_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kho_nhap_id'],
          message: txt('matTranNhapXuatKho.validation.khoNhapRequired'),
        });
      }
      if (
        data.kho_xuat_id?.trim() &&
        data.kho_nhap_id?.trim() &&
        data.kho_xuat_id.trim() === data.kho_nhap_id.trim()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kho_nhap_id'],
          message: txt('matTranNhapXuatKho.validation.khoXuatNhapKhacNhau'),
        });
      }
      break;
    }
  }
});

export type NhapXuatKhoFormValues = z.infer<typeof baseFormSchema>;
