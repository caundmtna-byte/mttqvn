/**
 * Biên bản bàn giao tiền, hiện vật hỗ trợ — kiểu dữ liệu, schema, chuẩn hoá.
 *
 * Lưu ở cột jsonb `vnn_chuong_trinh.bien_ban_ban_giao`
 * (`20261003130000_vnn_bien_ban_ban_giao.sql`). DB chỉ CHECK "là object" —
 * kiểu từng trường kiểm ở đây.
 *
 * CHỈ lưu phần biên bản cần mà dòng chưa có. Người nhận, CCCD, số tiền, nguồn,
 * lĩnh vực, đơn vị tài trợ, người được hỗ trợ (học sinh / người bệnh / người
 * qua đời — đã có ở phiếu khảo sát) đọc lại khi in, không chép sang đây.
 */
import { z } from 'zod';
import type { VnnLinhVuc } from './constants';
import { asObject, boKhoaRong, vNgay, vSo, vText } from './phieu-khao-sat';

/** Ô "Thời gian duy trì mô hình" chỉ có nghĩa với lĩnh vực này. */
export const BBBG_LINH_VUC_SINH_KE: readonly VnnLinhVuc[] = ['Mô hình sinh kế'];
/** Ô "Hạn hoàn thành xây dựng/sửa chữa nhà" chỉ có nghĩa với các lĩnh vực này. */
export const BBBG_LINH_VUC_NHA: readonly VnnLinhVuc[] = ['Nhà bị sập', 'Hoả hoạn'];

export const BBBG_HIEN_VAT_MAX = 20;

export const bbbgHienVatSchema = z.object({
  ten: vText,
  dvt: vText,
  // Hiện vật đếm theo kg / lít… có số lẻ.
  so_luong: vSo({ choThapPhan: true }),
  don_gia: vSo({ nguyen: true }),
  ghi_chu: vText,
});

export const bbbgThongTinSchema = z.object({
  ngay_ban_giao: vNgay,
  dia_diem: vText,
  don_vi_ben_giao: vText,
  dai_dien_ho_ten: vText,
  dai_dien_chuc_vu: vText,
  lam_chung_1_ho_ten: vText,
  lam_chung_1_chuc_vu: vText,
  lam_chung_2_ho_ten: vText,
  lam_chung_2_chuc_vu: vText,
  so_quyet_dinh: vText,
  ngay_quyet_dinh: vNgay,
  co_quan_quyet_dinh: vText,
  ve_viec: vText,
  muc_dich: vText,
  so_thang_duy_tri: vSo({ nguyen: true, max: 600 }),
  han_hoan_thanh_nha: vNgay,
});

export type BbbgHienVat = z.infer<typeof bbbgHienVatSchema>;
export type BbbgThongTin = z.infer<typeof bbbgThongTinSchema>;

/** Giá trị đã chuẩn hoá — đúng hình dạng lưu trong jsonb. */
export interface VnnBienBanBanGiao extends BbbgThongTin {
  hien_vat?: BbbgHienVat[];
}

/** Schema của cả khối form — chưa lọc dòng trống (việc của `chuanHoaBienBanBanGiao`). */
export const bbbgFormSchema = bbbgThongTinSchema.extend({
  hien_vat: z.array(bbbgHienVatSchema).max(BBBG_HIEN_VAT_MAX, `Tối đa ${BBBG_HIEN_VAT_MAX} dòng hiện vật`),
});
export type BbbgFormValues = z.infer<typeof bbbgFormSchema>;

/* ------------------------------------------------------------------ *
 * Hình dạng ô nhập của form (chuỗi thô)
 * ------------------------------------------------------------------ */

export type BbbgHienVatInput = { [K in keyof BbbgHienVat]-?: string };
export type BbbgFormInput = { [K in keyof BbbgThongTin]-?: string } & { hien_vat: BbbgHienVatInput[] };

const THONG_TIN_KEYS = Object.keys(bbbgThongTinSchema.shape) as (keyof BbbgThongTin)[];
const HIEN_VAT_KEYS = Object.keys(bbbgHienVatSchema.shape) as (keyof BbbgHienVat)[];

function chuoi(v: unknown): string {
  return v == null ? '' : String(v);
}

export function dongHienVatTrong(): BbbgHienVatInput {
  return Object.fromEntries(HIEN_VAT_KEYS.map((k) => [k, ''])) as BbbgHienVatInput;
}

export function bienBanBanGiaoToFormInput(p: VnnBienBanBanGiao | null | undefined): BbbgFormInput {
  const thongTin = Object.fromEntries(THONG_TIN_KEYS.map((k) => [k, chuoi(p?.[k])]));
  const hienVat = (p?.hien_vat ?? []).map(
    (d) => Object.fromEntries(HIEN_VAT_KEYS.map((k) => [k, chuoi(d[k])])) as BbbgHienVatInput,
  );
  return { ...thongTin, hien_vat: hienVat } as BbbgFormInput;
}

/** Thành tiền một dòng = SL × đơn giá, làm tròn đồng; thiếu một trong hai ⇒ `null`. */
export function thanhTienHienVat(d: Pick<BbbgHienVat, 'so_luong' | 'don_gia'>): number | null {
  if (d.so_luong == null || d.don_gia == null) return null;
  return Math.round(d.so_luong * d.don_gia);
}

function dongCoDuLieu(d: BbbgHienVat): boolean {
  return Object.values(d).some((v) => v !== undefined);
}

/**
 * Bỏ khoá rỗng + dòng hiện vật trống; ô ẩn theo lĩnh vực (duy trì mô hình,
 * hạn hoàn thành nhà) bị bỏ khi đổi lĩnh vực. Không còn gì ⇒ `null`.
 */
export function chuanHoaBienBanBanGiao(
  values: BbbgFormValues,
  linhVuc: string | null | undefined,
): VnnBienBanBanGiao | null {
  const { hien_vat, ...thongTin } = values;
  const lv = linhVuc as VnnLinhVuc;
  if (!BBBG_LINH_VUC_SINH_KE.includes(lv)) thongTin.so_thang_duy_tri = undefined;
  if (!BBBG_LINH_VUC_NHA.includes(lv)) thongTin.han_hoan_thanh_nha = undefined;

  const out: VnnBienBanBanGiao = boKhoaRong(thongTin);
  const dong = hien_vat.filter(dongCoDuLieu).map((d) => boKhoaRong(d));
  if (dong.length > 0) out.hien_vat = dong;
  return Object.keys(out).length > 0 ? out : null;
}

/* ------------------------------------------------------------------ *
 * Đọc jsonb từ DB — phòng thủ, từng trường một
 * ------------------------------------------------------------------ */

function docTruong<S extends z.ZodObject>(schema: S, o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, field] of Object.entries(schema.shape)) {
    const r = (field as z.ZodType).safeParse(o[k]);
    if (r.success && r.data !== undefined) out[k] = r.data;
  }
  return out;
}

/** Trường nào sai kiểu thì bỏ trường đó, không bỏ cả biên bản. */
export function docBienBanBanGiao(raw: unknown): VnnBienBanBanGiao | null {
  const o = asObject(raw);
  if (!o) return null;
  const out = docTruong(bbbgThongTinSchema, o) as VnnBienBanBanGiao;
  if (Array.isArray(o.hien_vat)) {
    const dong = o.hien_vat
      .map(asObject)
      .filter((d): d is Record<string, unknown> => d !== undefined)
      .map((d) => docTruong(bbbgHienVatSchema, d) as BbbgHienVat)
      .filter(dongCoDuLieu)
      .slice(0, BBBG_HIEN_VAT_MAX);
    if (dong.length > 0) out.hien_vat = dong;
  }
  return out;
}
