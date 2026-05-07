import { z } from 'zod';
import { txt } from '@/lib/text';
import type { MttqUyVienUyBan } from './types';

const optionalText = z
  .string()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

function parseOptionalDate(s: unknown): string | null {
  if (s === undefined || s === null) return null;
  const str = typeof s === 'string' ? s.trim() : String(s).trim();
  if (str === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  return null;
}

function nullIfEmptyTrimmed(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null;
  const t = s.trim();
  return t === '' ? null : t;
}

export const mttqUyVienUyBanSchema = z
  .object({
    ma_uv: optionalText,
    nhiem_ky_id: z.union([z.string(), z.number()]).refine((v) => String(v).trim() !== '', {
      message: txt('matTranUyVienUyBan.validation.nhiemKyRequired'),
    }),
    don_vi_id: z.union([z.string(), z.number(), z.literal('')]).optional(),
    ho_va_ten: z.string().trim().min(1, txt('matTranUyVienUyBan.validation.hoVaTenRequired')),
    chuc_vu_don_vi: optionalText,
    ngay_sinh: z.union([z.string(), z.literal('')]).optional(),
    gioi_tinh: optionalText,
    trang_thai_tham_gia: optionalText,
    ngay_nhap_trang_thai: z.union([z.string(), z.literal('')]).optional(),
    van_hoa: optionalText,
    trinh_do_cm: optionalText,
    trinh_do_llct: optionalText,
    dan_toc: optionalText,
    ton_giao: optionalText,
    dang_vien: z.boolean().optional(),
    ngay_vao_dang: z.union([z.string(), z.literal('')]).optional(),
    que_quan: optionalText,
    noi_o_hien_nay: optionalText,
    so_dien_thoai: optionalText,
    ghi_chu: optionalText,
  })
  .transform((d) => {
    const dv = d.don_vi_id;
    const donViStr =
      dv === undefined || dv === null || dv === '' ? null : String(dv).trim() === '' ? null : String(dv).trim();
    return {
      ma_uv: nullIfEmptyTrimmed(d.ma_uv),
      nhiem_ky_id: String(d.nhiem_ky_id).trim(),
      don_vi_id: donViStr,
      ho_va_ten: d.ho_va_ten.trim(),
      chuc_vu_don_vi: nullIfEmptyTrimmed(d.chuc_vu_don_vi),
      ngay_sinh: parseOptionalDate(d.ngay_sinh),
      gioi_tinh: nullIfEmptyTrimmed(d.gioi_tinh),
      trang_thai_tham_gia: nullIfEmptyTrimmed(d.trang_thai_tham_gia),
      ngay_nhap_trang_thai: parseOptionalDate(d.ngay_nhap_trang_thai),
      van_hoa: nullIfEmptyTrimmed(d.van_hoa),
      trinh_do_cm: nullIfEmptyTrimmed(d.trinh_do_cm),
      trinh_do_llct: nullIfEmptyTrimmed(d.trinh_do_llct),
      dan_toc: nullIfEmptyTrimmed(d.dan_toc),
      ton_giao: nullIfEmptyTrimmed(d.ton_giao),
      dang_vien: d.dang_vien ?? false,
      ngay_vao_dang: parseOptionalDate(d.ngay_vao_dang),
      que_quan: nullIfEmptyTrimmed(d.que_quan),
      noi_o_hien_nay: nullIfEmptyTrimmed(d.noi_o_hien_nay),
      so_dien_thoai: nullIfEmptyTrimmed(d.so_dien_thoai),
      ghi_chu: nullIfEmptyTrimmed(d.ghi_chu),
    };
  });

export type MttqUyVienUyBanFormInput = z.input<typeof mttqUyVienUyBanSchema>;
export type MttqUyVienUyBanFormValues = z.output<typeof mttqUyVienUyBanSchema>;

export function mttqUyVienUyBanToFormInput(d: MttqUyVienUyBan | null): MttqUyVienUyBanFormInput {
  if (!d) {
    return {
      ma_uv: undefined,
      nhiem_ky_id: '',
      don_vi_id: '',
      ho_va_ten: '',
      chuc_vu_don_vi: undefined,
      ngay_sinh: '',
      gioi_tinh: undefined,
      trang_thai_tham_gia: undefined,
      ngay_nhap_trang_thai: '',
      van_hoa: undefined,
      trinh_do_cm: undefined,
      trinh_do_llct: undefined,
      dan_toc: undefined,
      ton_giao: undefined,
      dang_vien: false,
      ngay_vao_dang: '',
      que_quan: undefined,
      noi_o_hien_nay: undefined,
      so_dien_thoai: undefined,
      ghi_chu: undefined,
    };
  }
  return {
    ma_uv: d.ma_uv ?? undefined,
    nhiem_ky_id: d.nhiem_ky_id,
    don_vi_id: d.don_vi_id ?? '',
    ho_va_ten: d.ho_va_ten,
    chuc_vu_don_vi: d.chuc_vu_don_vi ?? undefined,
    ngay_sinh: d.ngay_sinh ?? '',
    gioi_tinh: d.gioi_tinh ?? undefined,
    trang_thai_tham_gia: d.trang_thai_tham_gia ?? undefined,
    ngay_nhap_trang_thai: d.ngay_nhap_trang_thai ?? '',
    van_hoa: d.van_hoa ?? undefined,
    trinh_do_cm: d.trinh_do_cm ?? undefined,
    trinh_do_llct: d.trinh_do_llct ?? undefined,
    dan_toc: d.dan_toc ?? undefined,
    ton_giao: d.ton_giao ?? undefined,
    dang_vien: d.dang_vien,
    ngay_vao_dang: d.ngay_vao_dang ?? '',
    que_quan: d.que_quan ?? undefined,
    noi_o_hien_nay: d.noi_o_hien_nay ?? undefined,
    so_dien_thoai: d.so_dien_thoai ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
  };
}
