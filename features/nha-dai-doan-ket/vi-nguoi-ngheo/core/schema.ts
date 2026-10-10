import { z } from 'zod';
import { vnnOTienCanNhap } from './luat-so-tien';
import { vnnTruongConThieu, type VnnTruongBatBuoc } from './luat-truong-bat-buoc';
import { canNhaTaiTro } from '../../danh-sach/core/luat-so-tien';
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
  vNgay,
  vText,
} from './phieu-khao-sat';
import {
  bbbgFormSchema,
  bienBanBanGiaoToFormInput,
  chuanHoaBienBanBanGiao,
  type BbbgFormInput,
} from './bien-ban-ban-giao';

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((s) => (s === '' || s === undefined ? undefined : s));

const optionalFk = optionalText;

/** Câu báo lỗi ô bắt buộc theo trạng thái — xem `luat-truong-bat-buoc.ts`. */
const TRUONG_BAT_BUOC_MSG_KEY: Record<VnnTruongBatBuoc, string> = {
  ngay_ban_giao: 'viNguoiNgheo.validation.ngayBanGiaoBatBuoc',
  so_quyet_dinh: 'viNguoiNgheo.validation.soQuyetDinhBatBuoc',
  ngay_quyet_dinh: 'viNguoiNgheo.validation.ngayQuyetDinhBatBuoc',
};

function themLoiTruongBatBuoc(
  ctx: z.RefinementCtx,
  thieu: VnnTruongBatBuoc[],
  pathPrefix: string[],
) {
  for (const k of thieu) {
    ctx.addIssue({ code: 'custom', path: [...pathPrefix, k], message: txt(TRUONG_BAT_BUOC_MSG_KEY[k]) });
  }
}

/**
 * Số tiền: ô trống ⇒ `undefined` để `superRefine` báo "bắt buộc" đúng ô (luat-so-tien.ts).
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
  /** Người được hỗ trợ BẮT BUỘC là một hộ trong danh sách hộ nghèo — không nhập tay. */
  ho_ngheo_id: z.string().trim().min(1, txt('viNguoiNgheo.validation.hoNgheoRequired')),
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
  /** Ô nhập biên bản bàn giao — cùng quy ước `undefined` ⇒ không gửi cột. */
  bien_ban_ban_giao: z.custom<BbbgFormInput>().optional(),
})
  .superRefine((v, ctx) => {
    // Bản sao so_tien NOT NULL dưới DB — xem core/luat-so-tien.ts.
    for (const o of vnnOTienCanNhap(v)) {
      ctx.addIssue({ code: 'custom', path: [o], message: txt('viNguoiNgheo.validation.soTienBatBuoc') });
    }
    if (canNhaTaiTro(v.nguon_ho_tro) && !v.don_vi_ho_tro_id) {
      ctx.addIssue({ code: 'custom', path: ['don_vi_ho_tro_id'], message: txt('viNguoiNgheo.validation.nhaTaiTroRequired') });
    }
    if (v.bien_ban_ban_giao) {
      // `undefined` ⇒ form chưa có bản đầy đủ (nút Lưu đang khoá) — không kiểm được.
      themLoiTruongBatBuoc(
        ctx,
        vnnTruongConThieu(v.trang_thai, v.nguon_ho_tro, v.bien_ban_ban_giao),
        ['bien_ban_ban_giao'],
      );
      const r = bbbgFormSchema.safeParse(v.bien_ban_ban_giao);
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({ code: 'custom', message: issue.message, path: ['bien_ban_ban_giao', ...issue.path] });
        }
      }
    }
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
    // Đổi từ "Hiện vật" về "Tiền mặt" thì bỏ số lượng cũ — ô đã ẩn, không để số rác.
    const base = vnnCoHienVat(v.hinh_thuc_ho_tro) ? v : { ...v, so_luong: undefined };
    return {
      ...base,
      phieu_khao_sat: chuanHoaPhieuForm(v.phieu_khao_sat, v.linh_vuc_ho_tro),
      bien_ban_ban_giao:
        v.bien_ban_ban_giao === undefined
          ? undefined
          : chuanHoaBienBanBanGiao(bbbgFormSchema.parse(v.bien_ban_ban_giao), v.linh_vuc_ho_tro),
    };
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
export const viNguoiNgheoStatusChangeSchema = z
  .object({
    trang_thai: z.enum(VNN_TRANG_THAI_VALUES, {
      message: txt('viNguoiNgheo.validation.trangThaiInvalid'),
    }),
    ghi_chu: optionalText,
    /** Chỉ làm ngữ cảnh cho luật bắt buộc số/ngày quyết định — KHÔNG ghi xuống DB. */
    nguon_ho_tro: optionalText,
    // Ô biên bản bắt buộc của trạng thái đích; service gộp vào jsonb `bien_ban_ban_giao`.
    ngay_ban_giao: vNgay,
    so_quyet_dinh: vText,
    ngay_quyet_dinh: vNgay,
  })
  .superRefine((v, ctx) => themLoiTruongBatBuoc(ctx, vnnTruongConThieu(v.trang_thai, v.nguon_ho_tro, v), []));

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
  trang_thai: string;
  don_vi_ho_tro_id?: string;
  ghi_chu?: string;
  /** Có khi form đã có dữ liệu phiếu (tạo mới, hoặc sửa từ bản đầy đủ). */
  phieu_khao_sat?: PksFormInput;
  bien_ban_ban_giao?: BbbgFormInput;
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
      trang_thai: VNN_TRANG_THAI_DEFAULT,
      don_vi_ho_tro_id: '',
      ghi_chu: '',
      phieu_khao_sat: phieuKhaoSatToFormInput(null),
      bien_ban_ban_giao: bienBanBanGiaoToFormInput(null),
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
    trang_thai: row.trang_thai ?? VNN_TRANG_THAI_DEFAULT,
    don_vi_ho_tro_id: row.don_vi_ho_tro_id ?? '',
    ghi_chu: row.ghi_chu ?? '',
    // `undefined` = dòng từ RPC chưa có phiếu ⇒ để form biết mà không gửi cột này.
    phieu_khao_sat:
      row.phieu_khao_sat === undefined ? undefined : phieuKhaoSatToFormInput(row.phieu_khao_sat),
    bien_ban_ban_giao:
      row.bien_ban_ban_giao === undefined ? undefined : bienBanBanGiaoToFormInput(row.bien_ban_ban_giao),
  };
}
