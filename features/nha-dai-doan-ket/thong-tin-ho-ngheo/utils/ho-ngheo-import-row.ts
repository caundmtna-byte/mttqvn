/**
 * Đọc MỘT dòng Excel thành hồ sơ hộ nghèo — hàm thuần, không gọi mạng.
 *
 * Xã phường và dân tộc nhận id hoặc tên (bỏ dấu, không phân biệt hoa/thường,
 * khớp nguyên vẹn). Đối tượng / tôn giáo / trạng thái khớp theo danh mục cố
 * định; tôn giáo và trạng thái để trống thì lấy mặc định như form.
 */
import { txt } from '@/lib/text';
import { findRefStrict, matchEnumCell, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_TON_GIAO_DEFAULT,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_DEFAULT,
  HNGH_TRANG_THAI_VALUES,
} from '../core/constants';
import { hoNgheoSchema, type HoNgheoFormValues } from '../core/schema';
import { chuanHoaSoCccd } from './so-cccd';

export const HO_NGHEO_IMPORT_MAX_ROWS = 3000;

export interface HoNgheoImportRowCtx {
  xaPhuong: readonly NamedRef[];
  danToc: readonly NamedRef[];
  /** Cán bộ cấp xã: chỉ được nhập hộ của xã này; ô xã trống ⇒ gán xã này. */
  xaPhamVi: string | null;
}

export interface HoNgheoImportRow extends ImportParsedRow {
  values: HoNgheoFormValues;
  idKey: string | null;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

function enumOrDefault<T extends string>(
  values: readonly T[],
  raw: unknown,
  fallback: T | undefined,
): T | undefined | null {
  if (!trimCell(raw)) return fallback;
  return matchEnumCell(values, raw);
}

export function parseHoNgheoImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: HoNgheoImportRowCtx,
): ImportRowOutcome<HoNgheoImportRow> {
  const xa = findRefStrict(ctx.xaPhuong, raw.xa_phuong_id);
  if (!xa.ok) {
    const key = xa.reason === 'ambiguous' ? 'hoNgheo.import.errXaTrungTen' : 'hoNgheo.import.errXaPhuong';
    return fail(rowNum, txt(key, { gia_tri: trimCell(raw.xa_phuong_id) }));
  }
  let xaId = xa.ref?.id ?? '';
  if (ctx.xaPhamVi) {
    if (!xaId) xaId = ctx.xaPhamVi;
    else if (xaId !== ctx.xaPhamVi) return fail(rowNum, txt('hoNgheo.noXaPhuongScopePermission'));
  }

  const danToc = findRefStrict(ctx.danToc, raw.dan_toc_id);
  if (!danToc.ok) {
    return fail(rowNum, txt('hoNgheo.import.errDanToc', { gia_tri: trimCell(raw.dan_toc_id) }));
  }

  const doiTuong = enumOrDefault(HNGH_DOI_TUONG_VALUES, raw.doi_tuong, undefined);
  if (doiTuong === null) {
    return fail(rowNum, txt('hoNgheo.import.errDoiTuong', { gia_tri: trimCell(raw.doi_tuong) }));
  }
  const tonGiao = enumOrDefault(HNGH_TON_GIAO_VALUES, raw.ton_giao, HNGH_TON_GIAO_DEFAULT);
  if (tonGiao === null) {
    return fail(rowNum, txt('hoNgheo.import.errTonGiao', { gia_tri: trimCell(raw.ton_giao) }));
  }
  const trangThai = enumOrDefault(HNGH_TRANG_THAI_VALUES, raw.trang_thai, HNGH_TRANG_THAI_DEFAULT);
  if (trangThai === null) {
    return fail(rowNum, txt('hoNgheo.import.errTrangThai', { gia_tri: trimCell(raw.trang_thai) }));
  }

  const parsed = hoNgheoSchema.safeParse({
    ho_ten_dai_dien: trimCell(raw.ho_ten_dai_dien),
    so_cccd: chuanHoaSoCccd(trimCell(raw.so_cccd)),
    xa_phuong_id: xaId,
    khoi_xom: trimCell(raw.khoi_xom),
    doi_tuong: doiTuong ?? '',
    dien_thoai: trimCell(raw.dien_thoai),
    dan_toc_id: danToc.ref?.id ?? '',
    ton_giao: tonGiao,
    so_tai_khoan: trimCell(raw.so_tai_khoan),
    ngan_hang: trimCell(raw.ngan_hang),
    trang_thai: trangThai,
    ghi_chu: trimCell(raw.ghi_chu),
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return {
    ok: true,
    data: { rowNum, raw, values: parsed.data, idKey: trimCell(raw.id) || null },
  };
}
