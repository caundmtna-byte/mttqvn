/**
 * Đọc MỘT dòng Excel thành kỳ họp — hàm thuần, không gọi mạng.
 *
 * Nhiệm kỳ và đơn vị tra trong danh mục nạp MỘT lần ở service (trước đây mỗi
 * dòng tra 1-3 request và khớp `ilike '%…%'`/chuỗi con, nên tên gõ thiếu có thể
 * gán nhầm). Nay khớp id hoặc NGUYÊN VẸN tên (bỏ dấu, không phân biệt hoa/thường);
 * trùng tên thì báo lỗi.
 */
import { txt } from '@/lib/text';
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';
import { findRefStrict, parseImportNgay, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { mttqKyHopSchema } from '../core/schema';

export const KY_HOP_IMPORT_MAX_ROWS = 2000;

export interface KyHopImportRowCtx {
  nhiemKy: readonly NamedRef[];
  xaPhuong: readonly NamedRef[];
  /**
   * Cán bộ cấp xã: chỉ được ghi kỳ họp của xã này (đúng như form khoá ô đơn vị).
   * Ô đơn vị trống ⇒ gán xã này thay vì cấp tỉnh.
   */
  xaPhamVi?: string | null;
}

export interface KyHopImportRow extends ImportParsedRow {
  idKey: string | null;
  nhiem_ky_id: string;
  /** `null` = MTTQ tỉnh. */
  don_vi_id: string | null;
  ky_thu: string;
  ngay_hop: string | null;
  noi_dung_ky_hop: string | null;
  tai_lieu_hop: string | null;
  ghi_chu: string | null;
}

/** Ô tên đơn vị ghi "MTTQ tỉnh" / "Tỉnh" (hoặc để trống) ⇒ cấp tỉnh. */
const DON_VI_TINH = new Set(['tinh', 'mttq tinh']);

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

export function parseKyHopImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: KyHopImportRowCtx,
): ImportRowOutcome<KyHopImportRow> {
  // Cột ID được ưu tiên; không có thì dùng cột tên (cả hai đều nhận id hoặc tên).
  const nkRaw = trimCell(raw.nhiem_ky_id) || trimCell(raw.ten_nhiem_ky);
  if (!nkRaw) return fail(rowNum, txt('matTranKyHop.validation.nhiemKyRequired'));
  const nk = findRefStrict(ctx.nhiemKy, nkRaw);
  if (!nk.ok || !nk.ref) {
    const key =
      !nk.ok && nk.reason === 'ambiguous' ? 'matTranKyHop.import.errNhiemKyTrungTen' : 'matTranKyHop.import.badNhiemKy';
    return fail(rowNum, txt(key, { gia_tri: nkRaw }));
  }

  const dvRaw = trimCell(raw.don_vi_id) || trimCell(raw.ten_don_vi);
  let donViId: string | null = null;
  if (dvRaw && !DON_VI_TINH.has(chuanHoaKhoaSoKhop(dvRaw))) {
    const dv = findRefStrict(ctx.xaPhuong, dvRaw);
    if (!dv.ok || !dv.ref) {
      const key =
        !dv.ok && dv.reason === 'ambiguous' ? 'matTranKyHop.import.errDonViTrungTen' : 'matTranKyHop.import.errDonVi';
      return fail(rowNum, txt(key, { gia_tri: dvRaw }));
    }
    donViId = dv.ref.id;
  }
  if (ctx.xaPhamVi) {
    if (!dvRaw) donViId = ctx.xaPhamVi;
    else if (donViId !== ctx.xaPhamVi) return fail(rowNum, txt('shared.import.errNgoaiDonVi'));
  }

  const ngayRaw = trimCell(raw.ngay_hop);
  const ngayHop = parseImportNgay(raw.ngay_hop);
  if (ngayRaw && !ngayHop) return fail(rowNum, txt('matTranKyHop.import.errNgayHop', { gia_tri: ngayRaw }));

  const parsed = mttqKyHopSchema.safeParse({
    nhiem_ky_id: nk.ref.id,
    don_vi_id: donViId ?? '',
    ky_thu: trimCell(raw.ky_thu),
    ngay_hop: ngayHop ?? '',
    noi_dung_ky_hop: trimCell(raw.noi_dung_ky_hop),
    tai_lieu_hop: trimCell(raw.tai_lieu_hop),
    ghi_chu: trimCell(raw.ghi_chu),
  });
  if (!parsed.success) return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);

  return {
    ok: true,
    data: { rowNum, raw, idKey: trimCell(raw.id) || null, ...parsed.data },
  };
}

export function kyHopImportPayload(row: KyHopImportRow): Record<string, unknown> {
  return {
    nhiem_ky_id: row.nhiem_ky_id,
    don_vi_id: row.don_vi_id,
    ky_thu: row.ky_thu,
    ngay_hop: row.ngay_hop,
    noi_dung_ky_hop: row.noi_dung_ky_hop,
    tai_lieu_hop: row.tai_lieu_hop,
    ghi_chu: row.ghi_chu,
  };
}

/** Nhiệm kỳ / đơn vị đến từ cột ID hoặc cột tên — map một trong hai là đủ để ghi. */
export function kyHopMappedDbColumns(mapped: ReadonlySet<string>): Set<string> {
  const out = new Set(mapped);
  if (mapped.has('ten_nhiem_ky')) out.add('nhiem_ky_id');
  if (mapped.has('ten_don_vi')) out.add('don_vi_id');
  return out;
}
