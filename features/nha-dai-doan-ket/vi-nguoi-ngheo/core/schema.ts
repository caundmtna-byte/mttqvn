import { z } from 'zod';
import { txt } from '@/lib/text';
import { parseSoInput } from '@/lib/number';
import {
  VNN_DOI_TUONG_VALUES,
  VNN_HINH_THUC_DEFAULT,
  VNN_HINH_THUC_VALUES,
  VNN_LINH_VUC_DEFAULT,
  VNN_LINH_VUC_VALUES,
  VNN_NAM_MAX,
  VNN_NAM_MIN,
  VNN_NGUON_DEFAULT,
  VNN_NGUON_HO_TRO_DEFAULT,
  VNN_NGUON_HO_TRO_VALUES,
  VNN_NGUON_VALUES,
  VNN_TRANG_THAI_DEFAULT,
  VNN_TRANG_THAI_VALUES,
  vnnCoHienVat,
} from './constants';
import type { ViNguoiNgheo } from './types';
import {
  chuanHoaPhieuKhaoSat,
  phieuKhaoSatToFormInput,
  pksChungSchema,
  pksFormSchema,
  vnnLoaiPhieu,
  VNN_NHANH_PHIEU,
  type PksFormInput,
} from './phieu-khao-sat';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

const optionalFk = optionalText;

/**
 * Số tiền: để trống là hợp lệ (khoản chỉ có quà, hoặc chưa chốt mức).
 * Có nhập thì phải là số không âm — khớp `CHECK (so_tien >= 0)` ở DB.
 */
const optionalSoTien = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
    const s = String(val).trim();
    if (s === '') return undefined;
    // `Number('500.000')` là NaN — số dán từ Excel phải đọc được.
    const n = parseSoInput(s);
    return n ?? Number.NaN;
  },
  z
    .number({ message: txt('viNguoiNgheo.validation.soTienInvalid') })
    .min(0, txt('viNguoiNgheo.validation.soTienMin'))
    .optional(),
);

/** Số lượng hiện vật: để trống hợp lệ; có nhập thì là số nguyên không âm. */
const optionalSoLuong = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
    const s = String(val).trim();
    if (s === '') return undefined;
    const n = parseSoInput(s);
    return n ?? Number.NaN;
  },
  z
    .number({ message: txt('viNguoiNgheo.validation.soLuongInvalid') })
    .int(txt('viNguoiNgheo.validation.soLuongInvalid'))
    .min(0, txt('viNguoiNgheo.validation.soLuongInvalid'))
    .optional(),
);

export const viNguoiNgheoSchema = z.object({
  noi_dung_ho_tro: z.string().trim().min(1, txt('viNguoiNgheo.validation.noiDungRequired')),
  nam: z.coerce
    .number({ message: txt('viNguoiNgheo.validation.namInvalid') })
    .int(txt('viNguoiNgheo.validation.namInvalid'))
    .min(VNN_NAM_MIN, txt('viNguoiNgheo.validation.namInvalid'))
    .max(VNN_NAM_MAX, txt('viNguoiNgheo.validation.namInvalid')),
  linh_vuc_ho_tro: z.enum(VNN_LINH_VUC_VALUES, {
    message: txt('viNguoiNgheo.validation.linhVucInvalid'),
  }),
  nguon: z.enum(VNN_NGUON_VALUES, { message: txt('viNguoiNgheo.validation.nguonInvalid') }),
  nguon_ho_tro: z.enum(VNN_NGUON_HO_TRO_VALUES, {
    message: txt('viNguoiNgheo.validation.nguonHoTroInvalid'),
  }),
  ho_ngheo_id: optionalFk,
  ho_ten_nguoi_nhan: z.string().trim().min(1, txt('viNguoiNgheo.validation.nguoiNhanRequired')),
  xa_phuong_id: optionalFk,
  khoi_xom: optionalText,
  doi_tuong: z
    .union([z.enum(VNN_DOI_TUONG_VALUES), z.literal('')])
    .optional()
    .transform((s) => (s === '' || s === undefined ? undefined : s)),
  hinh_thuc_ho_tro: z.enum(VNN_HINH_THUC_VALUES, {
    message: txt('viNguoiNgheo.validation.hinhThucInvalid'),
  }),
  so_tien: optionalSoTien,
  so_luong: optionalSoLuong,
  tong_tien_quy_doi: optionalSoTien,
  tong_tien_ban_giao: optionalSoTien,
  trang_thai: z.enum(VNN_TRANG_THAI_VALUES, {
    message: txt('viNguoiNgheo.validation.trangThaiInvalid'),
  }),
  don_vi_ho_tro_id: optionalFk,
  ghi_chu: optionalText,
  /**
   * Ô nhập phiếu khảo sát. `undefined` ⇒ form chưa có bản đầy đủ — KHÔNG gửi
   * cột này lên (ghi rỗng đè dữ liệu thật). Kiểm ở `superRefine` bên dưới vì
   * chỉ `chung` + nhánh của lĩnh vực đang chọn mới cần hợp lệ.
   */
  phieu_khao_sat: z.custom<PksFormInput>().optional(),
})
  .superRefine((v, ctx) => {
    const p = v.phieu_khao_sat;
    const loai = vnnLoaiPhieu(v.linh_vuc_ho_tro);
    if (!p || !loai) return;
    const nhanh = VNN_NHANH_PHIEU[loai];
    const check = (key: 'chung' | typeof nhanh, schema: z.ZodType) => {
      const r = schema.safeParse(p[key]);
      if (r.success) return;
      for (const issue of r.error.issues) {
        ctx.addIssue({ code: 'custom', message: issue.message, path: ['phieu_khao_sat', key, ...issue.path] });
      }
    };
    check('chung', pksChungSchema);
    check(nhanh, pksFormSchema.shape[nhanh]);
  })
  .transform((v) => {
    // Đổi từ "Hiện vật" về "Tiền mặt" thì bỏ số hiện vật cũ — ô đã ẩn, không để số rác.
    const base = vnnCoHienVat(v.hinh_thuc_ho_tro)
      ? v
      : { ...v, so_luong: undefined, tong_tien_quy_doi: undefined, tong_tien_ban_giao: undefined };
    return { ...base, phieu_khao_sat: chuanHoaPhieuForm(v.phieu_khao_sat, v.linh_vuc_ho_tro) };
  });

/**
 * Ô nhập ⇒ giá trị lưu. `undefined` giữ nguyên nghĩa "không gửi"; lĩnh vực không
 * có phiếu ⇒ `null` (xoá phiếu cũ).
 */
function chuanHoaPhieuForm(p: PksFormInput | undefined, linhVuc: string) {
  if (p === undefined) return undefined;
  const loai = vnnLoaiPhieu(linhVuc);
  if (!loai) return null;
  const nhanh = VNN_NHANH_PHIEU[loai];
  // superRefine đã kiểm `chung` + nhánh này; các nhánh khác bị bỏ nên điền rỗng.
  const parsed = pksFormSchema.parse({
    ...phieuKhaoSatToFormInput(null),
    chung: p.chung,
    [nhanh]: p[nhanh],
  });
  return chuanHoaPhieuKhaoSat(parsed, linhVuc);
}

export type ViNguoiNgheoFormValues = z.infer<typeof viNguoiNgheoSchema>;

/**
 * Hộp thoại "Chuyển trạng thái". `ghi_chu` là **lý do của lần đổi này** —
 * trigger `fn_ghi_lich_su_trang_thai` chụp lại vào `lich_su_trang_thai`.
 */
export const viNguoiNgheoStatusChangeSchema = z.object({
  trang_thai: z.enum(VNN_TRANG_THAI_VALUES, {
    message: txt('viNguoiNgheo.validation.trangThaiInvalid'),
  }),
  ghi_chu: optionalText,
});

export type ViNguoiNgheoStatusChangeValues = z.infer<typeof viNguoiNgheoStatusChangeSchema>;

/**
 * Hình dạng ô nhập (chuỗi / số thô của form).
 * Cố ý KHÔNG có `ngay_cap_nhat_trang_thai`: trigger DB gán khi trạng thái đổi.
 */
export type ViNguoiNgheoFormInput = {
  noi_dung_ho_tro: string;
  nam: number;
  linh_vuc_ho_tro: string;
  nguon: string;
  nguon_ho_tro: string;
  ho_ngheo_id?: string;
  ho_ten_nguoi_nhan: string;
  xa_phuong_id?: string;
  khoi_xom?: string;
  doi_tuong?: string;
  hinh_thuc_ho_tro: string;
  so_tien?: string;
  so_luong?: string;
  tong_tien_quy_doi?: string;
  tong_tien_ban_giao?: string;
  trang_thai: string;
  don_vi_ho_tro_id?: string;
  ghi_chu?: string;
  /** Có khi form đã có dữ liệu phiếu (tạo mới, hoặc sửa từ bản đầy đủ). */
  phieu_khao_sat?: PksFormInput;
};

export function viNguoiNgheoToFormInput(row: ViNguoiNgheo | null): ViNguoiNgheoFormInput {
  if (!row) {
    return {
      noi_dung_ho_tro: '',
      nam: new Date().getFullYear(),
      linh_vuc_ho_tro: VNN_LINH_VUC_DEFAULT,
      nguon: VNN_NGUON_DEFAULT,
      nguon_ho_tro: VNN_NGUON_HO_TRO_DEFAULT,
      ho_ngheo_id: '',
      ho_ten_nguoi_nhan: '',
      xa_phuong_id: '',
      khoi_xom: '',
      doi_tuong: '',
      hinh_thuc_ho_tro: VNN_HINH_THUC_DEFAULT,
      so_tien: '',
      so_luong: '',
      tong_tien_quy_doi: '',
      tong_tien_ban_giao: '',
      trang_thai: VNN_TRANG_THAI_DEFAULT,
      don_vi_ho_tro_id: '',
      ghi_chu: '',
      phieu_khao_sat: phieuKhaoSatToFormInput(null),
    };
  }
  return {
    noi_dung_ho_tro: row.noi_dung_ho_tro ?? '',
    nam: row.nam ?? new Date().getFullYear(),
    linh_vuc_ho_tro: row.linh_vuc_ho_tro ?? VNN_LINH_VUC_DEFAULT,
    nguon: row.nguon ?? VNN_NGUON_DEFAULT,
    nguon_ho_tro: row.nguon_ho_tro ?? VNN_NGUON_HO_TRO_DEFAULT,
    ho_ngheo_id: row.ho_ngheo_id ?? '',
    ho_ten_nguoi_nhan: row.ho_ten_nguoi_nhan ?? '',
    xa_phuong_id: row.xa_phuong_id ?? '',
    khoi_xom: row.khoi_xom ?? '',
    doi_tuong: row.doi_tuong ?? '',
    hinh_thuc_ho_tro: row.hinh_thuc_ho_tro ?? VNN_HINH_THUC_DEFAULT,
    so_tien: row.so_tien == null ? '' : String(row.so_tien),
    so_luong: row.so_luong == null ? '' : String(row.so_luong),
    tong_tien_quy_doi: row.tong_tien_quy_doi == null ? '' : String(row.tong_tien_quy_doi),
    tong_tien_ban_giao: row.tong_tien_ban_giao == null ? '' : String(row.tong_tien_ban_giao),
    trang_thai: row.trang_thai ?? VNN_TRANG_THAI_DEFAULT,
    don_vi_ho_tro_id: row.don_vi_ho_tro_id ?? '',
    ghi_chu: row.ghi_chu ?? '',
    // `undefined` = dòng từ RPC chưa có phiếu ⇒ để form biết mà không gửi cột này.
    phieu_khao_sat:
      row.phieu_khao_sat === undefined ? undefined : phieuKhaoSatToFormInput(row.phieu_khao_sat),
  };
}
