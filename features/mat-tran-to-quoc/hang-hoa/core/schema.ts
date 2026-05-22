import { z } from 'zod';
import { txt } from '@/lib/text';

export const khoDanhMucHangHoaSchema = z.object({
  ten_danh_muc: z.string().trim().min(1, txt('matTranHangHoa.validation.tenDanhMucRequired')),
  mo_ta: z.string().max(10_000),
  thu_tu: z.coerce.number().int().min(0),
  trang_thai: z.enum(['Đang hoạt động', 'Ngừng hoạt động']),
});

export type KhoDanhMucHangHoaFormValues = z.infer<typeof khoDanhMucHangHoaSchema>;

export const khoDanhSachHangHoaSchema = z.object({
  id_danh_muc: z.string().trim().min(1, txt('matTranHangHoa.validation.danhMucRequired')),
  ten_hang_hoa: z.string().trim().min(1, txt('matTranHangHoa.validation.tenHangRequired')),
  don_vi_tinh: z.string().trim().min(1, txt('matTranHangHoa.validation.donViTinhRequired')),
  mo_ta: z.string().max(10_000),
  quy_cach: z.string().max(500),
  thu_tu: z.coerce.number().int().min(0),
  trang_thai: z.enum(['Đang hoạt động', 'Ngừng hoạt động']),
});

export type KhoDanhSachHangHoaFormValues = z.infer<typeof khoDanhSachHangHoaSchema>;
