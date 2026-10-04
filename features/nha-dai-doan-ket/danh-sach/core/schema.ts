import { z } from 'zod';
import { canNhaTaiTro, nddkThieuTien } from './luat-so-tien';
import { txt } from '@/lib/text';
import {
  NDDK_DOI_TUONG_VALUES,
  NDDK_LOAI_HINH_DEFAULT,
  NDDK_LOAI_HINH_VALUES,
  NDDK_NAM_MAX,
  NDDK_NAM_MIN,
  NDDK_NGUON_DEFAULT,
  NDDK_NGUON_HO_TRO_DEFAULT,
  NDDK_NGUON_HO_TRO_VALUES,
  NDDK_NGUON_KHAC_MAX,
  NDDK_NGUON_VALUES,
  NDDK_NHU_CAU_HO_TRO_VALUES,
  NDDK_THON_KIEM_TRA_MAX,
  NDDK_TRANG_THAI_DEFAULT,
  NDDK_TRANG_THAI_VALUES,
} from './constants';
import type { NddkNguoiThamGia, NddkNguonKhac, NhaDaiDoanKet } from './types';
import { parseSoInput } from '@/lib/number';
import {
  emptyThanhPhanKiemTra,
  isNguoiThamGiaEmpty,
  isThanhPhanKiemTraEmpty,
} from '../utils/bien-ban-json';

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

/**
 * Số tiền: để trống là hợp lệ (hồ sơ đang khảo sát thì chưa chốt mức hỗ trợ).
 * Có nhập thì phải là số không âm — khớp `CHECK (so_tien >= 0)` ở DB.
 */
const optionalSoTien = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
    const s = String(val).trim();
    if (s === '') return undefined;
    // `Number('500.000.000')` là NaN — cán bộ dán số từ Excel sẽ bị từ chối
    // trên một chuỗi trông hoàn toàn bình thường.
    const n = parseSoInput(s);
    return n ?? Number.NaN;
  },
  z
    .number({ message: txt('nhaDaiDoanKet.validation.soTienInvalid') })
    .min(0, txt('nhaDaiDoanKet.validation.soTienMin'))
    .optional(),
);

/* ------------------------------------------------------------------ *
 * Biên bản (khảo sát / kiểm tra hoàn thành / bàn giao) — mọi ô đều không bắt buộc
 * ------------------------------------------------------------------ */

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s ? s : undefined))
  .refine((s) => s === undefined || /^\d{4}-\d{2}-\d{2}$/.test(s), {
    message: txt('nhaDaiDoanKet.validation.ngayInvalid'),
  });

/** m², cho phép phần lẻ; chấp nhận cả dấu phẩy thập phân ("45,5"). */
const optionalDienTich = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    const s = String(val).trim().replace(',', '.');
    if (s === '') return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : Number.NaN;
  },
  z
    .number({ message: txt('nhaDaiDoanKet.validation.dienTichInvalid') })
    .min(0, txt('nhaDaiDoanKet.validation.dienTichInvalid'))
    .optional(),
);

const trimmedString = z
  .string()
  .optional()
  .transform((s) => (s ?? '').trim());

const nguoiThamGiaSchema = z.object({ ho_ten: trimmedString, chuc_vu: trimmedString });

/** Cả khối rỗng ⇒ `undefined` (lưu NULL), dòng thôn rỗng bị bỏ. */
const thanhPhanKiemTraSchema = z
  .object({
    bcd: nguoiThamGiaSchema,
    ubnd: nguoiThamGiaSchema,
    mttq: nguoiThamGiaSchema,
    thon: z.array(nguoiThamGiaSchema).max(NDDK_THON_KIEM_TRA_MAX),
  })
  .optional()
  .transform((tp) => {
    if (!tp) return undefined;
    const cleaned = { ...tp, thon: tp.thon.filter((p: NddkNguoiThamGia) => !isNguoiThamGiaEmpty(p)) };
    return isThanhPhanKiemTraEmpty(cleaned) ? undefined : cleaned;
  });

/** Dòng không tên, không tiền bị bỏ; không còn dòng nào ⇒ `undefined` (NULL). */
const nguonKhacSchema = z
  .array(z.object({ ten: trimmedString, so_tien: optionalSoTien }))
  .max(NDDK_NGUON_KHAC_MAX)
  .optional()
  .transform((list): NddkNguonKhac[] | undefined => {
    const rows = (list ?? [])
      .filter((x) => x.ten !== '' || x.so_tien != null)
      .map((x) => ({ ten: x.ten, so_tien: x.so_tien ?? null }));
    return rows.length > 0 ? rows : undefined;
  });

export const nhaDaiDoanKetSchema = z.object({
  noi_dung_ho_tro: z.string().trim().min(1, txt('nhaDaiDoanKet.validation.noiDungRequired')),
  nam: z.coerce
    .number({ message: txt('nhaDaiDoanKet.validation.namInvalid') })
    .int(txt('nhaDaiDoanKet.validation.namInvalid'))
    .min(NDDK_NAM_MIN, txt('nhaDaiDoanKet.validation.namInvalid'))
    .max(NDDK_NAM_MAX, txt('nhaDaiDoanKet.validation.namInvalid')),
  nguon: z.enum(NDDK_NGUON_VALUES, { message: txt('nhaDaiDoanKet.validation.nguonInvalid') }),
  nguon_ho_tro: z.enum(NDDK_NGUON_HO_TRO_VALUES, {
    message: txt('nhaDaiDoanKet.validation.nguonHoTroInvalid'),
  }),
  ho_ngheo_id: z.string().trim().min(1, txt('nhaDaiDoanKet.validation.hoNgheoRequired')),
  ho_ten_chu_ho: z.string().trim().min(1, txt('nhaDaiDoanKet.validation.chuHoRequired')),
  xa_phuong_id: optionalFk,
  khoi_xom: optionalText,
  doi_tuong: z
    .union([z.enum(NDDK_DOI_TUONG_VALUES), z.literal('')])
    .optional()
    .transform((s) => (s === '' || s === undefined ? undefined : s)),
  loai_hinh_ho_tro: z.enum(NDDK_LOAI_HINH_VALUES, {
    message: txt('nhaDaiDoanKet.validation.loaiHinhInvalid'),
  }),
  so_tien: optionalSoTien,
  /** Nhà tài trợ (kho_don_vi_cuu_tro) — bắt buộc khi Nguồn hỗ trợ = "Ủng hộ trực tiếp". */
  nha_tai_tro_id: optionalFk,
  trang_thai: z.enum(NDDK_TRANG_THAI_VALUES, {
    message: txt('nhaDaiDoanKet.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
  // Phiếu khảo sát
  ngay_khao_sat: optionalDate,
  hien_trang_nha: optionalText,
  hoan_canh_gia_dinh: optionalText,
  nhu_cau_ho_tro: z
    .union([z.enum(NDDK_NHU_CAU_HO_TRO_VALUES), z.literal('')])
    .optional()
    .transform((s) => (s === '' || s === undefined ? undefined : s)),
  ghi_chu_khao_sat: optionalText,
  // Biên bản kiểm tra hoàn thành
  ngay_kiem_tra_hoan_thanh: optionalDate,
  thanh_phan_kiem_tra: thanhPhanKiemTraSchema,
  dien_tich_san: optionalDienTich,
  phan_nen: optionalText,
  phan_mai: optionalText,
  phan_khung_tuong: optionalText,
  tong_gia_tri: optionalSoTien,
  nguon_khac: nguonKhacSchema,
  // Biên bản bàn giao
  ngay_ban_giao: optionalDate,
  dia_diem_ban_giao: optionalText,
  ban_giao_ho_ten: optionalText,
  ban_giao_chuc_vu: optionalText,
  lam_chung_ho_ten: optionalText,
  lam_chung_chuc_vu: optionalText,
  so_quyet_dinh: optionalText,
  ngay_quyet_dinh: optionalDate,
}).superRefine((v, ctx) => {
  // Bản sao CHECK nddk_so_tien_theo_trang_thai_chk — xem core/luat-so-tien.ts.
  if (nddkThieuTien(v.trang_thai, v.so_tien)) {
    ctx.addIssue({
      code: 'custom',
      path: ['so_tien'],
      message: txt('nhaDaiDoanKet.validation.soTienBatBuoc', { trangThai: v.trang_thai }),
    });
  }
  if (canNhaTaiTro(v.nguon_ho_tro) && !v.nha_tai_tro_id) {
    ctx.addIssue({ code: 'custom', path: ['nha_tai_tro_id'], message: txt('nhaDaiDoanKet.validation.nhaTaiTroRequired') });
  }
});

export type NhaDaiDoanKetFormValues = z.infer<typeof nhaDaiDoanKetSchema>;

/**
 * Hộp thoại "Chuyển trạng thái" — chỉ hai trường, KHÔNG đi qua form sửa đầy đủ.
 *
 * `ghi_chu` ở đây là **lý do của lần đổi này**: trigger
 * `fn_ghi_lich_su_trang_thai` chụp lại nó vào `lich_su_trang_thai`, nên mỗi lần
 * đổi giữ được lý do riêng dù cột `ghi_chu` của bản ghi bị ghi đè sau đó.
 */
export const nhaDaiDoanKetStatusChangeSchema = z.object({
  trang_thai: z.enum(NDDK_TRANG_THAI_VALUES, {
    message: txt('nhaDaiDoanKet.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type NhaDaiDoanKetStatusChangeValues = z.infer<typeof nhaDaiDoanKetStatusChangeSchema>;

export type NhaDaiDoanKetStatusChangeInput = {
  trang_thai: string;
  ghi_chu?: string;
};

/**
 * Hình dạng ô nhập (mọi trường là chuỗi / số thô của form).
 * Cố ý KHÔNG có `ngay_cap_nhat_trang_thai`: trigger DB gán khi trạng thái đổi.
 */
export type NhaDaiDoanKetFormInput = {
  noi_dung_ho_tro: string;
  nam: number;
  nguon: string;
  nguon_ho_tro: string;
  ho_ngheo_id: string;
  ho_ten_chu_ho: string;
  xa_phuong_id?: string;
  khoi_xom?: string;
  doi_tuong?: string;
  loai_hinh_ho_tro: string;
  so_tien?: string;
  nha_tai_tro_id?: string;
  trang_thai: string;
  ghi_chu?: string;
  ngay_khao_sat?: string;
  hien_trang_nha?: string;
  hoan_canh_gia_dinh?: string;
  nhu_cau_ho_tro?: string;
  ghi_chu_khao_sat?: string;
  ngay_kiem_tra_hoan_thanh?: string;
  thanh_phan_kiem_tra: {
    bcd: NddkNguoiThamGia;
    ubnd: NddkNguoiThamGia;
    mttq: NddkNguoiThamGia;
    thon: NddkNguoiThamGia[];
  };
  dien_tich_san?: string;
  phan_nen?: string;
  phan_mai?: string;
  phan_khung_tuong?: string;
  tong_gia_tri?: string;
  nguon_khac: { ten: string; so_tien: string }[];
  ngay_ban_giao?: string;
  dia_diem_ban_giao?: string;
  ban_giao_ho_ten?: string;
  ban_giao_chuc_vu?: string;
  lam_chung_ho_ten?: string;
  lam_chung_chuc_vu?: string;
  so_quyet_dinh?: string;
  ngay_quyet_dinh?: string;
};

type BienBanFormInput = Omit<
  NhaDaiDoanKetFormInput,
  | 'noi_dung_ho_tro'
  | 'nam'
  | 'nguon'
  | 'nguon_ho_tro'
  | 'ho_ngheo_id'
  | 'ho_ten_chu_ho'
  | 'xa_phuong_id'
  | 'khoi_xom'
  | 'doi_tuong'
  | 'loai_hinh_ho_tro'
  | 'so_tien'
  | 'nha_tai_tro_id'
  | 'trang_thai'
  | 'ghi_chu'
>;

const numToInput = (n: number | null | undefined): string => (n == null ? '' : String(n));

function bienBanToFormInput(row: NhaDaiDoanKet | null): BienBanFormInput {
  const b = row?.bien_ban;
  const tp = b?.thanh_phan_kiem_tra ?? emptyThanhPhanKiemTra();
  return {
    ngay_khao_sat: b?.ngay_khao_sat ?? '',
    hien_trang_nha: b?.hien_trang_nha ?? '',
    hoan_canh_gia_dinh: b?.hoan_canh_gia_dinh ?? '',
    nhu_cau_ho_tro: b?.nhu_cau_ho_tro ?? '',
    ghi_chu_khao_sat: b?.ghi_chu_khao_sat ?? '',
    ngay_kiem_tra_hoan_thanh: b?.ngay_kiem_tra_hoan_thanh ?? '',
    thanh_phan_kiem_tra: {
      bcd: { ...tp.bcd },
      ubnd: { ...tp.ubnd },
      mttq: { ...tp.mttq },
      thon: tp.thon.map((p) => ({ ...p })),
    },
    dien_tich_san: numToInput(b?.dien_tich_san),
    phan_nen: b?.phan_nen ?? '',
    phan_mai: b?.phan_mai ?? '',
    phan_khung_tuong: b?.phan_khung_tuong ?? '',
    tong_gia_tri: numToInput(b?.tong_gia_tri),
    nguon_khac: (b?.nguon_khac ?? []).map((x) => ({ ten: x.ten, so_tien: numToInput(x.so_tien) })),
    ngay_ban_giao: b?.ngay_ban_giao ?? '',
    dia_diem_ban_giao: b?.dia_diem_ban_giao ?? '',
    ban_giao_ho_ten: b?.ban_giao_ho_ten ?? '',
    ban_giao_chuc_vu: b?.ban_giao_chuc_vu ?? '',
    lam_chung_ho_ten: b?.lam_chung_ho_ten ?? '',
    lam_chung_chuc_vu: b?.lam_chung_chuc_vu ?? '',
    so_quyet_dinh: b?.so_quyet_dinh ?? '',
    ngay_quyet_dinh: b?.ngay_quyet_dinh ?? '',
  };
}

export function nhaDaiDoanKetToFormInput(row: NhaDaiDoanKet | null): NhaDaiDoanKetFormInput {
  if (!row) {
    return {
      noi_dung_ho_tro: '',
      nam: new Date().getFullYear(),
      nguon: NDDK_NGUON_DEFAULT,
      nguon_ho_tro: NDDK_NGUON_HO_TRO_DEFAULT,
      ho_ngheo_id: '',
      ho_ten_chu_ho: '',
      xa_phuong_id: '',
      khoi_xom: '',
      doi_tuong: '',
      loai_hinh_ho_tro: NDDK_LOAI_HINH_DEFAULT,
      so_tien: '',
      nha_tai_tro_id: '',
      trang_thai: NDDK_TRANG_THAI_DEFAULT,
      ghi_chu: '',
      ...bienBanToFormInput(null),
    };
  }
  return {
    noi_dung_ho_tro: row.noi_dung_ho_tro ?? '',
    nam: row.nam ?? new Date().getFullYear(),
    nguon: row.nguon ?? NDDK_NGUON_DEFAULT,
    nguon_ho_tro: row.nguon_ho_tro ?? NDDK_NGUON_HO_TRO_DEFAULT,
    ho_ngheo_id: row.ho_ngheo_id ?? '',
    ho_ten_chu_ho: row.ho_ten_chu_ho ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    khoi_xom: row.khoi_xom ?? '',
    doi_tuong: row.doi_tuong ?? '',
    loai_hinh_ho_tro: row.loai_hinh_ho_tro ?? NDDK_LOAI_HINH_DEFAULT,
    so_tien: row.so_tien == null ? '' : String(row.so_tien),
    nha_tai_tro_id: row.nha_tai_tro_id ?? '',
    trang_thai: row.trang_thai ?? NDDK_TRANG_THAI_DEFAULT,
    ghi_chu: row.ghi_chu ?? '',
    ...bienBanToFormInput(row),
  };
}
