import { z } from 'zod';
import { txt } from '@/lib/text';
import type { MttqTangLuongLoaiKy, MttqTangLuongListRow } from './types';

export const MTTQ_TANG_LUONG_LOAI_KY_VALUES = [
  'dung_han',
  'truoc_han_6',
  'truoc_han_9',
  'truoc_han_12',
] as const satisfies readonly MttqTangLuongLoaiKy[];

const optionalText = z.string().trim().optional().or(z.literal(''));

export const mttqTangLuongSchema = z
  .object({
    can_bo_id: z.string().min(1, txt('matTranTangLuong.validation.canBoRequired')),
    ngay_nang_luong: z.string().min(1, txt('matTranTangLuong.validation.ngayNangRequired')),
    loai_ky: z.enum(MTTQ_TANG_LUONG_LOAI_KY_VALUES),
    ngach_luong_id_cu: z.string().optional().or(z.literal('')),
    bac_luong_id_cu: z.string().optional().or(z.literal('')),
    ngach_luong_id_moi: z.string().min(1, txt('matTranTangLuong.validation.ngachMoiRequired')),
    bac_luong_id_moi: z.string().min(1, txt('matTranTangLuong.validation.bacMoiRequired')),
    luong: z
      .number({ message: txt('matTranTangLuong.validation.luongRequired') })
      .positive(txt('matTranTangLuong.validation.luongZero')),
    ghi_chu: optionalText,
    file_quyet_dinh: optionalText,
  })
  .superRefine((data, ctx) => {
    if (data.loai_ky !== 'dung_han' && !data.ngay_nang_luong) return;
  });

export type MttqTangLuongFormValues = z.infer<typeof mttqTangLuongSchema>;

export function tangLuongToFormInput(
  row: MttqTangLuongListRow | null,
  defaults?: Partial<MttqTangLuongFormValues>,
): MttqTangLuongFormValues {
  if (!row) {
    return {
      can_bo_id: defaults?.can_bo_id ?? '',
      ngay_nang_luong: defaults?.ngay_nang_luong ?? '',
      loai_ky: defaults?.loai_ky ?? 'dung_han',
      ngach_luong_id_cu: defaults?.ngach_luong_id_cu ?? '',
      bac_luong_id_cu: defaults?.bac_luong_id_cu ?? '',
      ngach_luong_id_moi: defaults?.ngach_luong_id_moi ?? '',
      bac_luong_id_moi: defaults?.bac_luong_id_moi ?? '',
      luong: defaults?.luong ?? 0,
      ghi_chu: defaults?.ghi_chu ?? '',
      file_quyet_dinh: defaults?.file_quyet_dinh ?? '',
    };
  }
  return {
    can_bo_id: row.can_bo_id,
    ngay_nang_luong: row.ngay_nang_luong,
    loai_ky: row.loai_ky,
    ngach_luong_id_cu: row.ngach_luong_id_cu ?? '',
    bac_luong_id_cu: row.bac_luong_id_cu ?? '',
    ngach_luong_id_moi: row.ngach_luong_id_moi,
    bac_luong_id_moi: row.bac_luong_id_moi,
    luong: row.luong > 0 ? row.luong : 0,
    ghi_chu: row.ghi_chu ?? '',
    file_quyet_dinh: row.file_quyet_dinh ?? '',
  };
}

export function loaiKyToSoThang(loai: MttqTangLuongLoaiKy): number | null {
  switch (loai) {
    case 'truoc_han_6':
      return 6;
    case 'truoc_han_9':
      return 9;
    case 'truoc_han_12':
      return 12;
    default:
      return null;
  }
}

export function isTruocHanLoaiKy(loai: MttqTangLuongLoaiKy): boolean {
  return loai !== 'dung_han';
}
