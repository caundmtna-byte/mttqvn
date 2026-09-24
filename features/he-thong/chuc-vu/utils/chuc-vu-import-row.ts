/**
 * Đọc MỘT dòng Excel thành chức vụ — hàm thuần, không gọi mạng.
 *
 * Cấp bậc nhận id hoặc mã cấp bậc (ở cột "Cấp bậc (id/số)" hoặc "Cấp bậc (mã)").
 * Phòng ban nhận id hoặc tên (bỏ dấu, không phân biệt hoa/thường, khớp nguyên vẹn).
 */
import { txt } from '@/lib/text';
import { parseTrangThaiHoatDongImport } from '@/lib/constants/trang-thai';
import { findRefStrict, trimCell, type NamedRef } from '@/lib/data/import-cells';
import { chuanHoaKhoaVanBan, type ImportKeySpec } from '@/lib/data/import-plan';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { positionSchema, type PositionFormValues } from '../core/schema';

export const CHUC_VU_IMPORT_MAX_ROWS = 2000;

export interface CapBacRef {
  id: string;
  ma: string | null;
}

export interface ChucVuImportRowCtx {
  capBac: readonly CapBacRef[];
  phongBan: readonly NamedRef[];
}

export interface ChucVuImportRow extends ImportParsedRow {
  values: PositionFormValues;
  idKey: string | null;
}

/** Bản ghi đã có — chỉ cột khoá. */
export interface ChucVuImportExisting {
  id: string;
  ten_chuc_vu: string;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

/** Id trước, rồi mã cấp bậc (không phân biệt hoa/thường). */
export function timCapBac(list: readonly CapBacRef[], raw: unknown): CapBacRef | null {
  const s = trimCell(raw);
  if (!s) return null;
  const byId = list.find((l) => l.id === s);
  if (byId) return byId;
  const up = s.toUpperCase();
  return list.find((l) => (l.ma ?? '').trim().toUpperCase() === up) ?? null;
}

export function parseChucVuImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: ChucVuImportRowCtx,
): ImportRowOutcome<ChucVuImportRow> {
  const ten = trimCell(raw.ten_chuc_vu);
  if (!ten) return fail(rowNum, txt('position.import.errTenEmpty'));

  const capCell = trimCell(raw.cap_bac) ? raw.cap_bac : raw.ma_cap_bac;
  const capText = trimCell(capCell);
  if (!capText) return fail(rowNum, txt('position.validation.levelRequired'));
  const cap = timCapBac(ctx.capBac, capCell);
  if (!cap) return fail(rowNum, txt('position.import.errCapBac', { gia_tri: capText }));

  const pbText = trimCell(raw.ten_phong_ban);
  if (!pbText) return fail(rowNum, txt('position.validation.departmentRequired'));
  const pb = findRefStrict(ctx.phongBan, raw.ten_phong_ban);
  if (!pb.ok || !pb.ref) return fail(rowNum, txt('position.import.errPhongBan', { gia_tri: pbText }));

  const thuTuText = trimCell(raw.thu_tu);
  const thuTu = thuTuText ? Number(thuTuText) : 0;
  if (!Number.isInteger(thuTu) || thuTu < 0) {
    return fail(rowNum, txt('position.import.errThuTu', { gia_tri: thuTuText }));
  }
  const trangThai = parseTrangThaiHoatDongImport(raw.trang_thai);
  if (!trangThai) {
    return fail(rowNum, txt('position.import.errTrangThai', { gia_tri: trimCell(raw.trang_thai) }));
  }

  const parsed = positionSchema.safeParse({
    ten_chuc_vu: ten,
    cap_bac: cap.id,
    phong_ban_id: pb.ref.id,
    mo_ta: trimCell(raw.mo_ta) || null,
    thu_tu: thuTu,
    trang_thai: trangThai,
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return { ok: true, data: { rowNum, raw, values: parsed.data, idKey: trimCell(raw.id) || null } };
}

/** `uq_var_chuc_vu_ten_lower` trên `lower(trim(ten_chuc_vu))`. */
export const CHUC_VU_IMPORT_KEYS: readonly ImportKeySpec<ChucVuImportExisting, ChucVuImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'ten_chuc_vu',
    label: txt('position.import.keyTen'),
    unique: true,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten_chuc_vu),
    ofRow: (r) => chuanHoaKhoaVanBan(r.values.ten_chuc_vu),
  },
];
