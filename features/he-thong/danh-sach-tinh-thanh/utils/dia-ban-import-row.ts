/**
 * Đọc MỘT dòng Excel thành tỉnh thành / xã phường — hàm thuần, không gọi mạng.
 *
 * Xã phường tìm tỉnh ở cột `id_tinh_thanh` trước (nhận id hoặc tên), không có
 * thì ở cột `ten_tinh`. Tên so sau khi bỏ dấu, không phân biệt hoa/thường.
 */
import { txt } from '@/lib/text';
import { findRefStrict, trimCell, type NamedRef } from '@/lib/data/import-cells';
import { chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from '@/lib/data/import-plan';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import {
  tinhThanhSchema,
  xaPhuongSchema,
  type TinhThanhFormValues,
  type XaPhuongFormValues,
} from '../core/schema';

export const TINH_THANH_IMPORT_MAX_ROWS = 500;
export const XA_PHUONG_IMPORT_MAX_ROWS = 5000;

export interface TinhThanhImportRow extends ImportParsedRow {
  values: TinhThanhFormValues;
  idKey: string | null;
}

export interface XaPhuongImportRow extends ImportParsedRow {
  values: XaPhuongFormValues;
  idKey: string | null;
}

export interface TinhThanhImportExisting {
  id: string;
  ten: string;
}

export interface XaPhuongImportExisting {
  id: string;
  id_tinh_thanh: string;
  ten: string;
}

export interface XaPhuongImportRowCtx {
  tinh: readonly NamedRef[];
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

/** Ô trống ⇒ 0; không phải số nguyên không âm ⇒ `null` (lỗi). */
export function docThuTu(raw: unknown): number | null {
  const s = trimCell(raw);
  if (!s) return 0;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

export function parseTinhThanhImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
): ImportRowOutcome<TinhThanhImportRow> {
  const ten = trimCell(raw.ten);
  if (!ten) return fail(rowNum, txt('diaBan.import.errTenTinhEmpty'));
  const thuTu = docThuTu(raw.thu_tu);
  if (thuTu == null) return fail(rowNum, txt('diaBan.import.errThuTu', { gia_tri: trimCell(raw.thu_tu) }));
  const parsed = tinhThanhSchema.safeParse({ ten, thu_tu: thuTu });
  if (!parsed.success) return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  return { ok: true, data: { rowNum, raw, values: parsed.data, idKey: trimCell(raw.id) || null } };
}

export function parseXaPhuongImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: XaPhuongImportRowCtx,
): ImportRowOutcome<XaPhuongImportRow> {
  const ten = trimCell(raw.ten);
  if (!ten) return fail(rowNum, txt('diaBan.import.errTenXaEmpty'));

  const theoId = findRefStrict(ctx.tinh, raw.id_tinh_thanh);
  const theoTen = findRefStrict(ctx.tinh, raw.ten_tinh);
  const tinh = (theoId.ok ? theoId.ref : null) ?? (theoTen.ok ? theoTen.ref : null);
  if (!tinh) {
    const gia_tri = trimCell(raw.id_tinh_thanh) || trimCell(raw.ten_tinh);
    return fail(
      rowNum,
      gia_tri ? txt('diaBan.import.errTinhXa', { gia_tri }) : txt('diaBan.import.errTinhXaEmpty'),
    );
  }

  const thuTu = docThuTu(raw.thu_tu);
  if (thuTu == null) return fail(rowNum, txt('diaBan.import.errThuTu', { gia_tri: trimCell(raw.thu_tu) }));
  const parsed = xaPhuongSchema.safeParse({ id_tinh_thanh: tinh.id, ten, thu_tu: thuTu });
  if (!parsed.success) return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  return { ok: true, data: { rowNum, raw, values: parsed.data, idKey: trimCell(raw.id) || null } };
}

const MA_HE_THONG = txt('shared.import.colMaHeThong');

/** `uq_var_ssn_tinh_thanh_ten_lower` trên `lower(trim(ten))`. */
export const TINH_THANH_IMPORT_KEYS: readonly ImportKeySpec<TinhThanhImportExisting, TinhThanhImportRow>[] = [
  { key: 'id', label: MA_HE_THONG, unique: true, ofExisting: (e) => e.id, ofRow: (r) => r.idKey },
  {
    key: 'ten',
    label: txt('diaBan.import.keyTenTinh'),
    unique: true,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten),
    ofRow: (r) => chuanHoaKhoaVanBan(r.values.ten),
  },
];

/** `uq_var_ssn_xa_phuong_ten_lower_per_tinh` trên `(id_tinh_thanh, lower(trim(ten)))`. */
export const XA_PHUONG_IMPORT_KEYS: readonly ImportKeySpec<XaPhuongImportExisting, XaPhuongImportRow>[] = [
  { key: 'id', label: MA_HE_THONG, unique: true, ofExisting: (e) => e.id, ofRow: (r) => r.idKey },
  {
    key: 'tinh_ten',
    label: txt('diaBan.import.keyTinhTenXa'),
    unique: true,
    ofExisting: (e) => ghepKhoa(e.id_tinh_thanh, chuanHoaKhoaVanBan(e.ten)),
    ofRow: (r) => ghepKhoa(r.values.id_tinh_thanh, chuanHoaKhoaVanBan(r.values.ten)),
  },
];
