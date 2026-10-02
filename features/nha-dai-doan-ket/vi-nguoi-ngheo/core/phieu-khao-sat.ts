/**
 * Phiếu khảo sát in của Chương trình hỗ trợ — danh mục, kiểu dữ liệu, schema.
 *
 * Lưu ở MỘT cột jsonb `vnn_chuong_trinh.phieu_khao_sat`
 * (`20261002110000_vnn_phieu_khao_sat.sql`): `chung` dùng cho cả 4 phiếu, cộng
 * đúng một nhánh theo lĩnh vực. DB chỉ CHECK "là object" — danh mục ô tick và
 * kiểu từng trường kiểm ở đây.
 *
 * Thông tin CON NGƯỜI của chủ hộ (CCCD, năm sinh, nhân khẩu…) KHÔNG nằm ở đây:
 * đọc từ hộ nghèo được gắn (`ho_ngheo_id`).
 */
import { z } from 'zod';
import { parseSoInput } from '@/lib/number';
import type { VnnLinhVuc } from './constants';

/* ------------------------------------------------------------------ *
 * Loại phiếu theo lĩnh vực
 * ------------------------------------------------------------------ */

export const VNN_LOAI_PHIEU = ['thien-tai', 'benh-tat', 'sinh-ke', 'hoc-sinh'] as const;
export type VnnLoaiPhieu = (typeof VNN_LOAI_PHIEU)[number];

/** Khoá nhánh trong jsonb ứng với từng loại phiếu. */
export const VNN_NHANH_PHIEU = {
  'thien-tai': 'thien_tai',
  'benh-tat': 'benh_tat',
  'sinh-ke': 'sinh_ke',
  'hoc-sinh': 'hoc_sinh',
} as const satisfies Record<VnnLoaiPhieu, string>;
export type VnnNhanhPhieu = (typeof VNN_NHANH_PHIEU)[VnnLoaiPhieu];

const LOAI_PHIEU_THEO_LINH_VUC: Partial<Record<VnnLinhVuc, VnnLoaiPhieu>> = {
  'Cứu trợ': 'thien-tai',
  'Nhà bị sập': 'thien-tai',
  'Hoả hoạn': 'thien-tai',
  'Chữa bệnh': 'benh-tat',
  'Người chết': 'benh-tat',
  'Mô hình sinh kế': 'sinh-ke',
  'Học sinh nghèo': 'hoc-sinh',
};

/** `null` ⇒ lĩnh vực không có phiếu in (Tết vì người nghèo). */
export function vnnLoaiPhieu(linhVuc: string | null | undefined): VnnLoaiPhieu | null {
  return LOAI_PHIEU_THEO_LINH_VUC[linhVuc as VnnLinhVuc] ?? null;
}

/* ------------------------------------------------------------------ *
 * Danh mục ô tick — đúng chữ trên mẫu giấy
 * ------------------------------------------------------------------ */

export const PKS_DOI_TUONG_UU_TIEN = [
  'Gia đình có công với cách mạng',
  'Người cao tuổi neo đơn',
  'Người khuyết tật',
  'Đồng bào dân tộc thiểu số',
] as const;
export const PKS_KET_LUAN = ['Đủ điều kiện, đề nghị hỗ trợ', 'Chưa đủ điều kiện hỗ trợ'] as const;

export const PKS_LOAI_SU_CO = [
  'Bão, áp thấp nhiệt đới',
  'Lũ, ngập lụt',
  'Sạt lở đất',
  'Lốc, sét, mưa đá',
  'Hỏa hoạn',
] as const;
export const PKS_THIET_HAI_NHA = [
  'Sập đổ hoàn toàn',
  'Sập đổ một phần',
  'Hư hỏng nặng, không thể ở',
  'Tốc mái, hư hỏng một phần',
  'Bị ngập nước',
] as const;
export const PKS_NHU_CAU_THIEN_TAI = [
  'Lương thực, thực phẩm',
  'Nước uống, nhu yếu phẩm',
  'Tiền mặt',
  'Di dời, ở tạm khẩn cấp',
  'Xây mới nhà ở',
  'Sửa chữa nhà ở',
] as const;

export const PKS_CO_KHONG = ['Có', 'Không'] as const;
export const PKS_NGUYEN_NHAN_MAT = ['Thiên tai', 'Tai nạn', 'Ốm đau, bệnh tật'] as const;
export const PKS_GIAY_TO = [
  'Giấy ra viện/chuyển viện',
  'Tóm tắt hồ sơ bệnh án',
  'Hóa đơn, chứng từ viện phí',
  'Giấy báo tử/Trích lục khai tử',
] as const;
export const PKS_NHU_CAU_BENH_TAT = [
  'Chi phí khám, chữa bệnh',
  'Chi phí thuốc, đi lại khi điều trị',
  'Thăm hỏi, phúng viếng',
  'Hỗ trợ chi phí mai táng',
  'Hỗ trợ người thân phụ thuộc',
] as const;

export const PKS_MO_HINH = [
  'Chăn nuôi (bò, dê, lợn, gà...)',
  'Trồng trọt (giống cây, phân bón...)',
  'Máy móc, công cụ sản xuất',
  'Buôn bán nhỏ, dịch vụ',
] as const;

export const PKS_GIOI_TINH = ['Nam', 'Nữ'] as const;
export const PKS_KET_QUA_HOC_TAP = ['Xuất sắc', 'Giỏi', 'Khá', 'Đạt', 'Chưa đạt'] as const;
export const PKS_HOAN_CANH_HOC_SINH = [
  'Mồ côi cả cha và mẹ',
  'Mồ côi cha hoặc mẹ',
  'Thuộc hộ nghèo, cận nghèo',
  'Học sinh khuyết tật',
] as const;
export const PKS_NHU_CAU_HOC_SINH = [
  'Học bổng',
  'Xe đạp',
  'Sách vở, đồ dùng học tập',
  'Quần áo, áo ấm',
] as const;

/* ------------------------------------------------------------------ *
 * Kiểu trường — ô trống ⇒ `undefined` (không ghi khoá vào jsonb)
 * ------------------------------------------------------------------ */

const TEXT_MAX = 2000;

function blank(v: unknown): unknown {
  if (v == null) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  return v;
}

const vText = z.preprocess(
  (v) => (typeof v === 'string' ? blank(v.trim()) : blank(v)),
  z.string().max(TEXT_MAX, 'Tối đa 2000 ký tự').optional(),
);

const vNgay = z.preprocess(
  (v) => blank(typeof v === 'string' ? v.trim() : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày chưa hợp lệ')
    .optional(),
);

function vSo(opts: { choThapPhan?: boolean; nguyen?: boolean; min?: number; max?: number }) {
  return z.preprocess(
    (v) => {
      const b = blank(v);
      if (b === undefined) return undefined;
      const n = parseSoInput(b as string | number, { choThapPhan: opts.choThapPhan });
      if (n == null) return Number.NaN;
      // Tối đa 2 chữ số lẻ: số 3 chữ số lẻ ("1.125") nạp lại vào ô sẽ bị đọc thành 1125.
      return opts.choThapPhan ? Math.round(n * 100) / 100 : n;
    },
    (() => {
      let s = z.number({ message: 'Số chưa hợp lệ' }).min(opts.min ?? 0, 'Số chưa hợp lệ');
      if (opts.max != null) s = s.max(opts.max, 'Số chưa hợp lệ');
      if (opts.nguyen) s = s.int('Số chưa hợp lệ');
      return s.optional();
    })(),
  );
}

const vTien = vSo({ nguyen: true });
const vThapPhan = vSo({ choThapPhan: true });
const vSoNguyen = vSo({ nguyen: true, max: 1000 });
const vNam = vSo({ nguyen: true, min: 1900, max: 2100 });

/** Chọn một: ngoài danh mục ⇒ bỏ (dữ liệu chỉ đến từ ô tick). */
function vMot<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess(
    (v) => (typeof v === 'string' && (values as readonly string[]).includes(v) ? v : undefined),
    z.enum(values).optional(),
  );
}

/** Chọn nhiều: lọc giá trị lạ, bỏ trùng, giữ thứ tự trên phiếu; rỗng ⇒ bỏ khoá. */
function vNhieu<T extends readonly [string, ...string[]]>(values: T) {
  return z.preprocess((v) => {
    if (!Array.isArray(v)) return undefined;
    const set = new Set(v.filter((x): x is string => typeof x === 'string'));
    const out = values.filter((x) => set.has(x));
    return out.length > 0 ? out : undefined;
  }, z.array(z.enum(values)).optional());
}

/* ------------------------------------------------------------------ *
 * Schema từng nhánh
 * ------------------------------------------------------------------ */

export const pksChungSchema = z.object({
  ngay_khao_sat: vNgay,
  thu_nhap_binh_quan: vTien,
  doi_tuong_uu_tien: vNhieu(PKS_DOI_TUONG_UU_TIEN),
  doi_tuong_uu_tien_khac: vText,
  hoan_canh_gia_dinh: vText,
  ho_tro_nguon_khac: vText,
  ket_luan: vMot(PKS_KET_LUAN),
  muc_de_xuat: vText,
  ghi_chu: vText,
});

export const pksThienTaiSchema = z.object({
  loai_su_co: vNhieu(PKS_LOAI_SU_CO),
  loai_su_co_khac: vText,
  thoi_gian_xay_ra: vText,
  thiet_hai_nha: vNhieu(PKS_THIET_HAI_NHA),
  thiet_hai_tai_san: vText,
  thiet_hai_san_xuat: vText,
  uoc_tinh_thiet_hai: vTien,
  ket_cau_nha: vText,
  dien_tich_nha: vThapPhan,
  nam_xay_dung: vNam,
  noi_o_tam: vText,
  kha_nang_doi_ung: vText,
  nhu_cau: vNhieu(PKS_NHU_CAU_THIEN_TAI),
  nhu_cau_khac: vText,
});

export const pksBenhTatSchema = z.object({
  ho_ten: vText,
  nam_sinh: vNam,
  quan_he_chu_ho: vText,
  chan_doan: vText,
  co_so_dieu_tri: vText,
  dieu_tri_tu: vNgay,
  dieu_tri_den: vNgay,
  co_bhyt: vMot(PKS_CO_KHONG),
  chi_phi_da_tra: vTien,
  chi_phi_du_kien: vTien,
  ngay_mat: vNgay,
  noi_mat: vText,
  nguyen_nhan: vMot(PKS_NGUYEN_NHAN_MAT),
  nguyen_nhan_khac: vText,
  nguoi_phu_thuoc: vText,
  giay_to: vNhieu(PKS_GIAY_TO),
  giay_to_khac: vText,
  nhu_cau: vNhieu(PKS_NHU_CAU_BENH_TAT),
  nhu_cau_khac: vText,
});

export const pksSinhKeSchema = z.object({
  so_lao_dong: vSoNguyen,
  nguon_thu_nhap_chinh: vText,
  dien_tich_dat_sx: vThapPhan,
  chuong_trai: vText,
  kinh_nghiem: vText,
  mo_hinh: vNhieu(PKS_MO_HINH),
  mo_hinh_khac: vText,
  quy_mo: vText,
  von_doi_ung: vText,
  hieu_qua_du_kien: vText,
  nguoi_huong_dan: vText,
});

export const pksHocSinhSchema = z.object({
  ho_ten: vText,
  gioi_tinh: vMot(PKS_GIOI_TINH),
  ngay_sinh: vNgay,
  lop: vText,
  truong: vText,
  quan_he_chu_ho: vText,
  ket_qua_hoc_tap: vMot(PKS_KET_QUA_HOC_TAP),
  hoan_canh: vNhieu(PKS_HOAN_CANH_HOC_SINH),
  hoan_canh_khac: vText,
  khoang_cach_km: vThapPhan,
  phuong_tien: vText,
  nhu_cau: vNhieu(PKS_NHU_CAU_HOC_SINH),
  nhu_cau_khac: vText,
});

const NHANH_SCHEMA = {
  thien_tai: pksThienTaiSchema,
  benh_tat: pksBenhTatSchema,
  sinh_ke: pksSinhKeSchema,
  hoc_sinh: pksHocSinhSchema,
} as const;

export type PksChung = z.infer<typeof pksChungSchema>;
export type PksThienTai = z.infer<typeof pksThienTaiSchema>;
export type PksBenhTat = z.infer<typeof pksBenhTatSchema>;
export type PksSinhKe = z.infer<typeof pksSinhKeSchema>;
export type PksHocSinh = z.infer<typeof pksHocSinhSchema>;

/** Giá trị đã chuẩn hoá — đúng hình dạng lưu trong jsonb. */
export interface VnnPhieuKhaoSat {
  chung: PksChung;
  thien_tai?: PksThienTai;
  benh_tat?: PksBenhTat;
  sinh_ke?: PksSinhKe;
  hoc_sinh?: PksHocSinh;
}

/* ------------------------------------------------------------------ *
 * Hình dạng ô nhập của form (chuỗi thô + mảng tick)
 * ------------------------------------------------------------------ */

type FormInputOf<T> = { [K in keyof T]-?: NonNullable<T[K]> extends readonly unknown[] ? string[] : string };

export type PksFormInput = {
  chung: FormInputOf<PksChung>;
  thien_tai: FormInputOf<PksThienTai>;
  benh_tat: FormInputOf<PksBenhTat>;
  sinh_ke: FormInputOf<PksSinhKe>;
  hoc_sinh: FormInputOf<PksHocSinh>;
};

/** Ô trống của một nhánh — trường mảng lấy từ schema (`vNhieu`). */
function emptyBranch<S extends z.ZodObject>(schema: S, arrayKeys: readonly string[]) {
  const out: Record<string, string | string[]> = {};
  for (const k of Object.keys(schema.shape)) out[k] = arrayKeys.includes(k) ? [] : '';
  return out;
}

const ARRAY_KEYS: Record<keyof PksFormInput, readonly string[]> = {
  chung: ['doi_tuong_uu_tien'],
  thien_tai: ['loai_su_co', 'thiet_hai_nha', 'nhu_cau'],
  benh_tat: ['giay_to', 'nhu_cau'],
  sinh_ke: ['mo_hinh'],
  hoc_sinh: ['hoan_canh', 'nhu_cau'],
};

const SCHEMA_OF: Record<keyof PksFormInput, z.ZodObject> = { chung: pksChungSchema, ...NHANH_SCHEMA };

function branchToInput(
  key: keyof PksFormInput,
  raw: Record<string, unknown> | undefined,
): Record<string, string | string[]> {
  const out = emptyBranch(SCHEMA_OF[key], ARRAY_KEYS[key]);
  if (!raw) return out;
  for (const k of Object.keys(out)) {
    const v = raw[k];
    if (Array.isArray(out[k])) out[k] = Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
    else out[k] = v == null ? '' : String(v);
  }
  return out;
}

export function phieuKhaoSatToFormInput(p: VnnPhieuKhaoSat | null | undefined): PksFormInput {
  return {
    chung: branchToInput('chung', p?.chung),
    thien_tai: branchToInput('thien_tai', p?.thien_tai),
    benh_tat: branchToInput('benh_tat', p?.benh_tat),
    sinh_ke: branchToInput('sinh_ke', p?.sinh_ke),
    hoc_sinh: branchToInput('hoc_sinh', p?.hoc_sinh),
  } as PksFormInput;
}

/** Schema của cả khối form — kiểm mọi nhánh (ô ẩn vẫn phải hợp lệ để không lưu rác). */
export const pksFormSchema = z.object({
  chung: pksChungSchema,
  thien_tai: pksThienTaiSchema,
  benh_tat: pksBenhTatSchema,
  sinh_ke: pksSinhKeSchema,
  hoc_sinh: pksHocSinhSchema,
});
export type PksFormValues = z.infer<typeof pksFormSchema>;

function boKhoaRong<T extends Record<string, unknown>>(o: T): T {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;
}

/**
 * Giữ `chung` + đúng nhánh của lĩnh vực; lĩnh vực không có phiếu ⇒ `null`.
 * Đổi lĩnh vực là nhánh cũ bị bỏ — không để rác trong jsonb.
 */
export function chuanHoaPhieuKhaoSat(
  values: PksFormValues,
  linhVuc: string | null | undefined,
): VnnPhieuKhaoSat | null {
  const loai = vnnLoaiPhieu(linhVuc);
  if (!loai) return null;
  const nhanh = VNN_NHANH_PHIEU[loai];
  return {
    chung: boKhoaRong(values.chung),
    [nhanh]: boKhoaRong(values[nhanh]),
  } as VnnPhieuKhaoSat;
}

/* ------------------------------------------------------------------ *
 * Đọc jsonb từ DB — phòng thủ, từng trường một
 * ------------------------------------------------------------------ */

function asObject(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/** Trường nào sai kiểu thì bỏ trường đó, không bỏ cả phiếu. */
function docNhanh(schema: z.ZodObject, raw: unknown): Record<string, unknown> | undefined {
  const o = asObject(raw);
  if (!o) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, field] of Object.entries(schema.shape)) {
    const r = (field as z.ZodType).safeParse(o[k]);
    if (r.success && r.data !== undefined) out[k] = r.data;
  }
  return out;
}

export function docPhieuKhaoSat(raw: unknown): VnnPhieuKhaoSat | null {
  const o = asObject(raw);
  if (!o) return null;
  const out: VnnPhieuKhaoSat = { chung: (docNhanh(pksChungSchema, o.chung) ?? {}) as PksChung };
  for (const [k, schema] of Object.entries(NHANH_SCHEMA)) {
    const b = docNhanh(schema, o[k]);
    if (b) (out as unknown as Record<string, unknown>)[k] = b;
  }
  return out;
}
