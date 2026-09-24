/**
 * Đọc MỘT dòng Excel thành phòng ban — hàm thuần, không gọi mạng.
 *
 * Phòng ban cấp trên nhận id hoặc tên (bỏ dấu, không phân biệt hoa/thường,
 * khớp nguyên vẹn); để trống = cấp cao nhất. Phòng cha phải có sẵn trong hệ
 * thống — dòng tạo mới ở cùng file chưa có id nên chưa làm cha được.
 */
import { txt } from '@/lib/text';
import { parseTrangThaiHoatDongImport } from '@/lib/constants/trang-thai';
import { findRefStrict, trimCell, type NamedRef } from '@/lib/data/import-cells';
import { chuanHoaKhoaVanBan, type ImportKeySpec } from '@/lib/data/import-plan';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { departmentSchema, type DepartmentFormValues } from '../core/schema';

export const PHONG_BAN_IMPORT_MAX_ROWS = 2000;

export interface PhongBanImportRowCtx {
  phongBan: readonly NamedRef[];
  /** id → `duong_dan` ("/1/5/9") để chặn gán cha tạo vòng. */
  duongDanTheoId: ReadonlyMap<string, string>;
}

export interface PhongBanImportRow extends ImportParsedRow {
  values: DepartmentFormValues;
  idKey: string | null;
}

export interface PhongBanImportExisting {
  id: string;
  ten_phong_ban: string;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

export function parsePhongBanImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: PhongBanImportRowCtx,
): ImportRowOutcome<PhongBanImportRow> {
  const ten = trimCell(raw.ten_phong_ban);
  if (!ten) return fail(rowNum, txt('department.import.errTenEmpty'));

  const chaText = trimCell(raw.cha_id);
  const cha = findRefStrict(ctx.phongBan, raw.cha_id);
  if (!cha.ok) return fail(rowNum, txt('department.import.errCha', { gia_tri: chaText }));

  const thuTuText = trimCell(raw.thu_tu);
  const thuTu = thuTuText ? Number(thuTuText) : 0;
  if (!Number.isFinite(thuTu) || thuTu < 0) {
    return fail(rowNum, txt('department.import.errThuTu', { gia_tri: thuTuText }));
  }
  const trangThai = parseTrangThaiHoatDongImport(raw.trang_thai);
  if (!trangThai) {
    return fail(rowNum, txt('department.import.errTrangThai', { gia_tri: trimCell(raw.trang_thai) }));
  }

  const parsed = departmentSchema.safeParse({
    ten_phong_ban: ten,
    mo_ta: trimCell(raw.mo_ta),
    cha_id: cha.ref?.id ?? '',
    thu_tu: thuTu,
    trang_thai: trangThai,
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return { ok: true, data: { rowNum, raw, values: parsed.data, idKey: trimCell(raw.id) || null } };
}

/**
 * Gán `chaId` làm cha của `id` có tạo vòng không: chính nó, hoặc một phòng nằm
 * dưới nó (đường dẫn của cha đi qua `id`).
 */
export function taoVongCha(
  id: string,
  chaId: string | null,
  duongDanTheoId: ReadonlyMap<string, string>,
): boolean {
  if (!chaId) return false;
  if (chaId === id) return true;
  const duongDan = duongDanTheoId.get(chaId) ?? '';
  return duongDan.split('/').includes(id);
}

/** `uq_var_phong_ban_ten_lower` trên `lower(trim(ten_phong_ban))`. */
export const PHONG_BAN_IMPORT_KEYS: readonly ImportKeySpec<PhongBanImportExisting, PhongBanImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'ten_phong_ban',
    label: txt('department.import.keyTen'),
    unique: true,
    ofExisting: (e) => chuanHoaKhoaVanBan(e.ten_phong_ban),
    ofRow: (r) => chuanHoaKhoaVanBan(r.values.ten_phong_ban),
  },
];
