/**
 * Đọc MỘT dòng Excel thành nhiệm kỳ — hàm thuần, không gọi mạng.
 *
 * Năm và văn bản đi qua đúng schema của form. Các ô số lượng (SL…) để TRỐNG
 * được giữ là `null`: thêm mới thì ghi 0 như form, ghi đè thì GIỮ số cũ — một
 * ô bỏ trống không được âm thầm xoá số liệu đã nhập. Ô có chữ lạ thì báo lỗi
 * (trước đây bị đổi ngầm thành 0).
 */
import { txt } from '@/lib/text';
import { trimCell } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { mttqNhiemKySchema, type MttqNhiemKyFormValues } from '../core/schema';

export const NHIEM_KY_IMPORT_MAX_ROWS = 1000;

export const NHIEM_KY_SL_COLS = [
  'sl_dau_nhiem_ky',
  'sl_dang_tham_gia',
  'sl_thoi_tham_gia',
  'sl_can_bo_sung',
  'sl_thieu',
] as const;

export type NhiemKySlCol = (typeof NHIEM_KY_SL_COLS)[number];

export interface NhiemKyImportRow extends ImportParsedRow {
  idKey: string | null;
  ten_nhiem_ky: string;
  tu_nam: number | null;
  den_nam: number | null;
  thong_tin: string | null;
  ghi_chu: string | null;
  /** `null` = ô trống. */
  sl: Record<NhiemKySlCol, number | null>;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

/** Số nguyên; ô trống ⇒ `null`; chữ / số lẻ ⇒ `undefined` (lỗi). */
export function parseImportSoNguyen(raw: unknown): number | null | undefined {
  const s = trimCell(raw).replace(/\s/g, '');
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : undefined;
}

export function parseNhiemKyImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
): ImportRowOutcome<NhiemKyImportRow> {
  const sl = {} as Record<NhiemKySlCol, number | null>;
  for (const col of NHIEM_KY_SL_COLS) {
    const v = parseImportSoNguyen(raw[col]);
    if (v === undefined) {
      return fail(rowNum, txt('matTranNhiemKy.import.errSoLuong', { gia_tri: trimCell(raw[col]) }));
    }
    sl[col] = v;
  }

  const parsed = mttqNhiemKySchema.safeParse({
    ten_nhiem_ky: trimCell(raw.ten_nhiem_ky),
    tu_nam: trimCell(raw.tu_nam),
    den_nam: trimCell(raw.den_nam),
    thong_tin: trimCell(raw.thong_tin),
    ghi_chu: trimCell(raw.ghi_chu),
    sl_dau_nhiem_ky: sl.sl_dau_nhiem_ky ?? 0,
    sl_dang_tham_gia: sl.sl_dang_tham_gia ?? 0,
    sl_thoi_tham_gia: sl.sl_thoi_tham_gia ?? 0,
    sl_can_bo_sung: sl.sl_can_bo_sung ?? 0,
    sl_thieu: sl.sl_thieu ?? 0,
  });
  if (!parsed.success) return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  const v: MttqNhiemKyFormValues = parsed.data;

  return {
    ok: true,
    data: {
      rowNum,
      raw,
      idKey: trimCell(raw.id) || null,
      ten_nhiem_ky: v.ten_nhiem_ky,
      tu_nam: v.tu_nam,
      den_nam: v.den_nam,
      thong_tin: v.thong_tin,
      ghi_chu: v.ghi_chu,
      sl,
    },
  };
}

/** Payload ghi. `taoMoi` ⇒ SL trống ghi 0; ghi đè thì bỏ để giữ số cũ. */
export function nhiemKyImportPayload(row: NhiemKyImportRow, taoMoi = false): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ten_nhiem_ky: row.ten_nhiem_ky,
    tu_nam: row.tu_nam,
    den_nam: row.den_nam,
    thong_tin: row.thong_tin,
    ghi_chu: row.ghi_chu,
  };
  for (const col of NHIEM_KY_SL_COLS) {
    const n = row.sl[col] ?? (taoMoi ? 0 : null);
    if (n != null) out[col] = n;
  }
  return out;
}
