import { z } from 'zod';
import { txt } from '@/lib/text';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_GIOI_TINH_VALUES,
  HNGH_NAM_SINH_MAX,
  HNGH_NAM_SINH_MIN,
  HNGH_SO_NHAN_KHAU_MAX,
  HNGH_TINH_TRANG_DAT_VALUES,
  HNGH_VIEC_LAM_VALUES,
  HNGH_TO_CHUC_DEFAULT,
  HNGH_TO_CHUC_VALUES,
  HNGH_TON_GIAO_DEFAULT,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_DEFAULT,
  HNGH_TRANG_THAI_VALUES,
} from './constants';
import type { HoNgheo } from './types';
import { chuanHoaSoCccd, soCccdHopLe } from '../utils/so-cccd';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

const optionalFk = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

/** Bóc khoảng trắng như trigger DB, rỗng ⇒ bỏ trống; đã nhập thì đủ 9 (CMND) hoặc 12 (CCCD) chữ số. */
const soCccd = z
  .string()
  .optional()
  .transform((s) => chuanHoaSoCccd(s) || undefined)
  .refine((s) => soCccdHopLe(s), { message: txt('hoNgheo.validation.soCccdKhongHopLe') });

/** Ô chọn không bắt buộc: '' (chưa chọn) ⇒ `undefined`. */
function optionalEnum<const T extends readonly [string, ...string[]]>(values: T, message: string) {
  return z
    .enum(values, { message })
    .optional()
    .or(z.literal('').transform(() => undefined));
}

/** Ô số nguyên không bắt buộc, form giữ dạng chuỗi: '' ⇒ `undefined`. */
function optionalInt(min: number, max: number, message: string) {
  return z.preprocess(
    (v) => {
      if (v == null) return undefined;
      const s = String(v).trim();
      return s === '' ? undefined : Number(s);
    },
    z.number({ message }).int(message).min(min, message).max(max, message).optional(),
  );
}

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s : undefined))
  .refine((s) => s === undefined || /^\d{4}-\d{2}-\d{2}$/.test(s), {
    message: txt('hoNgheo.validation.ngayInvalid'),
  });

/* ------------------------------------------------------------------ *
 * Hộ
 * ------------------------------------------------------------------ */

export const hoNgheoSchema = z.object({
  ho_ten_dai_dien: z.string().trim().min(1, txt('hoNgheo.validation.hoTenRequired')),
  so_cccd: soCccd,
  xa_phuong_id: optionalFk,
  khoi_xom: optionalText,
  doi_tuong: z
    .enum(HNGH_DOI_TUONG_VALUES, { message: txt('hoNgheo.validation.doiTuongInvalid') })
    .optional()
    .or(z.literal('').transform(() => undefined)),
  dien_thoai: optionalText,
  dan_toc_id: optionalFk,
  ton_giao: z.enum(HNGH_TON_GIAO_VALUES, { message: txt('hoNgheo.validation.tonGiaoInvalid') }),
  to_chuc: z.enum(HNGH_TO_CHUC_VALUES, { message: txt('hoNgheo.validation.toChucInvalid') }),
  so_tai_khoan: optionalText,
  ngan_hang: optionalText,
  trang_thai: z.enum(HNGH_TRANG_THAI_VALUES, {
    message: txt('hoNgheo.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
  // Nhân khẩu & đời sống — in ở phiếu khảo sát / biên bản bàn giao nhà.
  gioi_tinh: optionalEnum(HNGH_GIOI_TINH_VALUES, txt('hoNgheo.validation.gioiTinhInvalid')),
  nam_sinh: optionalInt(
    HNGH_NAM_SINH_MIN,
    HNGH_NAM_SINH_MAX,
    txt('hoNgheo.validation.namSinhInvalid'),
  ),
  ngay_cap_cccd: optionalDate,
  noi_cap_cccd: optionalText,
  ho_ten_vo_chong: optionalText,
  so_nhan_khau: optionalInt(0, HNGH_SO_NHAN_KHAU_MAX, txt('hoNgheo.validation.soNhanKhauInvalid')),
  nghe_nghiep: optionalText,
  trinh_do_hoc_van: optionalText,
  tinh_trang_viec_lam: optionalEnum(HNGH_VIEC_LAM_VALUES, txt('hoNgheo.validation.viecLamInvalid')),
  doi_tuong_uu_tien: optionalText,
  tinh_trang_dat: optionalEnum(
    HNGH_TINH_TRANG_DAT_VALUES,
    txt('hoNgheo.validation.tinhTrangDatInvalid'),
  ),
});

export type HoNgheoFormValues = z.infer<typeof hoNgheoSchema>;

/**
 * Form nhập tay VÀ import Excel: bắt buộc thêm Số căn cước, Khối xóm, Đối tượng, Dân tộc.
 * (Import từng dùng `hoNgheoSchema` cho phép trống ⇒ hàng nghìn hộ lọt vào thiếu CCCD / dân tộc.)
 */
export const hoNgheoFormSchema = hoNgheoSchema.extend({
  so_cccd: z
    .string()
    .transform((s) => chuanHoaSoCccd(s))
    .refine((s) => s !== '', { message: txt('hoNgheo.validation.soCccdRequired') })
    .refine((s) => soCccdHopLe(s), { message: txt('hoNgheo.validation.soCccdKhongHopLe') }),
  khoi_xom: z.string().trim().min(1, txt('hoNgheo.validation.khoiXomRequired')),
  doi_tuong: z.enum(HNGH_DOI_TUONG_VALUES, { message: txt('hoNgheo.validation.doiTuongRequired') }),
  dan_toc_id: z.string().trim().min(1, txt('hoNgheo.validation.danTocRequired')),
});

export const hoNgheoStatusChangeSchema = z.object({
  trang_thai: z.enum(HNGH_TRANG_THAI_VALUES, {
    message: txt('hoNgheo.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type HoNgheoStatusChangeValues = z.infer<typeof hoNgheoStatusChangeSchema>;

export type HoNgheoStatusChangeInput = { trang_thai: string; ghi_chu?: string };

/**
 * Hình dạng ô nhập (mọi trường là chuỗi thô của form).
 * Cố ý KHÔNG có `ngay_cap_nhat_trang_thai`: trigger DB gán khi trạng thái đổi.
 */
export type HoNgheoFormInput = {
  ho_ten_dai_dien: string;
  so_cccd?: string;
  xa_phuong_id?: string;
  khoi_xom?: string;
  doi_tuong?: string;
  dien_thoai?: string;
  dan_toc_id?: string;
  ton_giao: string;
  to_chuc: string;
  so_tai_khoan?: string;
  ngan_hang?: string;
  trang_thai: string;
  ghi_chu?: string;
  gioi_tinh?: string;
  nam_sinh?: string;
  ngay_cap_cccd?: string;
  noi_cap_cccd?: string;
  ho_ten_vo_chong?: string;
  so_nhan_khau?: string;
  nghe_nghiep?: string;
  trinh_do_hoc_van?: string;
  tinh_trang_viec_lam?: string;
  doi_tuong_uu_tien?: string;
  tinh_trang_dat?: string;
};

const numToInput = (n: number | null | undefined): string => (n == null ? '' : String(n));

export function hoNgheoToFormInput(row: HoNgheo | null): HoNgheoFormInput {
  if (!row) {
    return {
      ho_ten_dai_dien: '',
      so_cccd: '',
      xa_phuong_id: '',
      khoi_xom: '',
      doi_tuong: '',
      dien_thoai: '',
      dan_toc_id: '',
      ton_giao: HNGH_TON_GIAO_DEFAULT,
      to_chuc: HNGH_TO_CHUC_DEFAULT,
      so_tai_khoan: '',
      ngan_hang: '',
      trang_thai: HNGH_TRANG_THAI_DEFAULT,
      ghi_chu: '',
      gioi_tinh: '',
      nam_sinh: '',
      ngay_cap_cccd: '',
      noi_cap_cccd: '',
      ho_ten_vo_chong: '',
      so_nhan_khau: '',
      nghe_nghiep: '',
      trinh_do_hoc_van: '',
      tinh_trang_viec_lam: '',
      doi_tuong_uu_tien: '',
      tinh_trang_dat: '',
    };
  }
  const nk = row.nhan_khau;
  return {
    ho_ten_dai_dien: row.ho_ten_dai_dien ?? '',
    so_cccd: row.so_cccd ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    khoi_xom: row.khoi_xom ?? '',
    doi_tuong: row.doi_tuong ?? '',
    dien_thoai: row.dien_thoai ?? '',
    dan_toc_id: row.dan_toc_id ?? '',
    ton_giao: row.ton_giao ?? HNGH_TON_GIAO_DEFAULT,
    to_chuc: row.to_chuc ?? HNGH_TO_CHUC_DEFAULT,
    so_tai_khoan: row.so_tai_khoan ?? '',
    ngan_hang: row.ngan_hang ?? '',
    trang_thai: row.trang_thai ?? HNGH_TRANG_THAI_DEFAULT,
    ghi_chu: row.ghi_chu ?? '',
    gioi_tinh: nk?.gioi_tinh ?? '',
    nam_sinh: numToInput(nk?.nam_sinh),
    ngay_cap_cccd: nk?.ngay_cap_cccd ?? '',
    noi_cap_cccd: nk?.noi_cap_cccd ?? '',
    ho_ten_vo_chong: nk?.ho_ten_vo_chong ?? '',
    so_nhan_khau: numToInput(nk?.so_nhan_khau),
    nghe_nghiep: nk?.nghe_nghiep ?? '',
    trinh_do_hoc_van: nk?.trinh_do_hoc_van ?? '',
    tinh_trang_viec_lam: nk?.tinh_trang_viec_lam ?? '',
    doi_tuong_uu_tien: nk?.doi_tuong_uu_tien ?? '',
    tinh_trang_dat: nk?.tinh_trang_dat ?? '',
  };
}
