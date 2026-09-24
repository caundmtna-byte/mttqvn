/**
 * Đọc MỘT dòng Excel thành đơn vị cứu trợ — hàm thuần, không gọi mạng.
 *
 * Loại đối tượng nhận mã (`doanh_nghiep`…), nhãn hiển thị (bỏ dấu, không phân
 * biệt hoa/thường) hoặc mã cũ trước migration. Giá trị lạ ⇒ lỗi dòng (trước đây
 * bị đổi ngầm thành « Doanh nghiệp »).
 */
import { txt } from '@/lib/text';
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';
import { trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import {
  KHO_DON_VI_CUU_TRO_LOAI,
  KHO_DON_VI_CUU_TRO_LOAI_DEFAULT,
  khoDonViCuuTroLoaiLabel,
  parseKhoDonViCuuTroLoai,
  type KhoDonViCuuTroLoai,
} from '../core/loai';
import { khoDonViCuuTroSchema, type KhoDonViCuuTroFormValues } from '../core/schema';
import { resolveDonViGioiThieuImport } from './don-vi-gioi-thieu';

export const DON_VI_CUU_TRO_IMPORT_MAX_ROWS = 2000;

export interface DonViCuuTroImportRowCtx {
  xaPhuong: readonly NamedRef[];
}

export interface DonViCuuTroImportRow extends ImportParsedRow {
  idKey: string | null;
  values: KhoDonViCuuTroFormValues;
}

/**
 * Payload ghi hai cột `don_vi_gioi_thieu_*` từ MỘT cột file `don_vi_gioi_thieu`
 * (cho `pickMappedColumns`).
 */
export const DON_VI_CUU_TRO_IMPORT_COLUMN_ALIAS: Readonly<Record<string, string>> = {
  don_vi_gioi_thieu_loai: 'don_vi_gioi_thieu',
  don_vi_gioi_thieu_id: 'don_vi_gioi_thieu',
};

export function parseImportLoai(raw: unknown): KhoDonViCuuTroLoai | null {
  const s = trimCell(raw);
  if (!s) return null;
  const code = s.toLowerCase();
  const legacy = parseKhoDonViCuuTroLoai(code);
  if (legacy !== KHO_DON_VI_CUU_TRO_LOAI_DEFAULT || code === KHO_DON_VI_CUU_TRO_LOAI_DEFAULT) return legacy;
  const key = chuanHoaKhoaSoKhop(s);
  return KHO_DON_VI_CUU_TRO_LOAI.find((v) => chuanHoaKhoaSoKhop(khoDonViCuuTroLoaiLabel(v)) === key) ?? null;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

export function parseDonViCuuTroImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: DonViCuuTroImportRowCtx,
): ImportRowOutcome<DonViCuuTroImportRow> {
  const loai = parseImportLoai(raw.loai);
  if (!loai) return fail(rowNum, txt('matTranDonViCuuTro.import.errLoai', { gia_tri: trimCell(raw.loai) }));

  const dv = resolveDonViGioiThieuImport(raw.don_vi_gioi_thieu, ctx.xaPhuong);
  if (!dv.ok) {
    const key =
      dv.reason === 'ambiguous'
        ? 'matTranDonViCuuTro.import.errDonViGioiThieuTrungTen'
        : 'matTranDonViCuuTro.import.errDonViGioiThieuNotFound';
    return fail(rowNum, txt(key, { ten: dv.ten }));
  }

  const parsed = khoDonViCuuTroSchema.safeParse({
    loai,
    ten: trimCell(raw.ten),
    so_nguoi: trimCell(raw.so_nguoi),
    nguoi_dai_dien: trimCell(raw.nguoi_dai_dien),
    chuc_vu: trimCell(raw.chuc_vu),
    dia_chi: trimCell(raw.dia_chi),
    dien_thoai: trimCell(raw.dien_thoai),
    don_vi_gioi_thieu: dv.value,
    email: trimCell(raw.email),
    ghi_chu: trimCell(raw.ghi_chu),
  });
  if (!parsed.success) return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);

  return { ok: true, data: { rowNum, raw, idKey: trimCell(raw.id) || null, values: parsed.data } };
}
