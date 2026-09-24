/**
 * Đọc MỘT dòng Excel thành ủy viên ủy ban — hàm thuần, không gọi mạng.
 *
 * Danh mục (nhiệm kỳ, đơn vị, cán bộ) được nạp MỘT lần ở service rồi truyền
 * vào — trước đây mỗi dòng tra 2-4 request (N+1) và khớp tên bằng `ilike
 * '%…%'`, nên một tên gõ thiếu có thể gán nhầm sang nhiệm kỳ / cán bộ khác.
 * Nay chỉ khớp id hoặc NGUYÊN VẸN tên (bỏ dấu, không phân biệt hoa/thường);
 * trùng tên thì báo lỗi để người nhập dùng id.
 */
import { txt } from '@/lib/text';
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';
import {
  findRefStrict,
  matchEnumCell,
  parseImportNgay,
  trimCell,
  type NamedRef,
} from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import {
  MTTQ_UY_VIEN_TRANG_THAM_GIA,
  MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG,
  type MttqUyVienTrangThamGia,
} from '../core/constants';

export const UY_VIEN_IMPORT_MAX_ROWS = 2000;

export interface CanBoImportRef {
  id: string;
  ho_ten: string;
  /** `yyyy-mm-dd` hoặc null. */
  ngay_sinh: string | null;
}

export interface UyVienImportRowCtx {
  nhiemKy: readonly NamedRef[];
  xaPhuong: readonly NamedRef[];
  canBo: readonly CanBoImportRef[];
  /** Cán bộ cấp xã: chỉ được ghi ủy viên của xã này; ô đơn vị trống ⇒ gán xã này. */
  xaPhamVi?: string | null;
}

export interface UyVienImportRow extends ImportParsedRow {
  idKey: string | null;
  nhiem_ky_id: string;
  /** `null` = cấp Tỉnh. */
  don_vi_id: string | null;
  can_bo_id: string;
  ma_uv: string | null;
  /** `null` = ô trống: thêm mới lấy "Đang tham gia", ghi đè giữ giá trị cũ. */
  trang_thai_tham_gia: MttqUyVienTrangThamGia | null;
  ghi_chu: string | null;
}

/** Ô đơn vị ghi "Tỉnh" (hoặc để trống) ⇒ ủy viên cấp tỉnh, `don_vi_id = null`. */
const DON_VI_TINH = new Set(['tinh', 'mttq tinh']);

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

function nullIfEmpty(s: string): string | null {
  return s === '' ? null : s;
}

export type CanBoLookup =
  | { ok: true; id: string }
  | { ok: false; reason: 'missing_id' | 'missing' | 'ambiguous' | 'empty' };

/**
 * Cán bộ: ô ID (khớp đúng id) được ưu tiên; không có thì họ tên (khớp nguyên
 * vẹn, bỏ dấu) + ngày sinh để phân biệt người trùng tên. Hồ sơ chưa có ngày
 * sinh vẫn được xét như trước đây.
 */
export function resolveCanBoImport(
  list: readonly CanBoImportRef[],
  raw: Record<string, unknown>,
): CanBoLookup {
  const idRaw = trimCell(raw.can_bo_id);
  if (idRaw) {
    const hit = list.find((c) => c.id === idRaw);
    return hit ? { ok: true, id: hit.id } : { ok: false, reason: 'missing_id' };
  }
  const key = chuanHoaKhoaSoKhop(trimCell(raw.ho_va_ten));
  if (!key) return { ok: false, reason: 'empty' };
  const ns = parseImportNgay(raw.ngay_sinh);
  const byName = list.filter((c) => chuanHoaKhoaSoKhop(c.ho_ten) === key);
  const hits = ns == null ? byName : byName.filter((c) => c.ngay_sinh == null || c.ngay_sinh === ns);
  if (hits.length === 1) return { ok: true, id: hits[0].id };
  return { ok: false, reason: hits.length > 1 ? 'ambiguous' : 'missing' };
}

const CAN_BO_ERR: Record<Exclude<CanBoLookup, { ok: true }>['reason'], string> = {
  empty: 'matTranUyVienUyBan.validation.importCanBoRequired',
  missing_id: 'matTranUyVienUyBan.import.errCanBoId',
  missing: 'matTranUyVienUyBan.import.badCanBo',
  ambiguous: 'matTranUyVienUyBan.import.errCanBoTrungTen',
};

export function parseUyVienImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: UyVienImportRowCtx,
): ImportRowOutcome<UyVienImportRow> {
  const nkRaw = trimCell(raw.ten_nhiem_ky);
  if (!nkRaw) return fail(rowNum, txt('matTranUyVienUyBan.validation.nhiemKyRequired'));
  const nk = findRefStrict(ctx.nhiemKy, nkRaw);
  if (!nk.ok || !nk.ref) {
    const key =
      !nk.ok && nk.reason === 'ambiguous'
        ? 'matTranUyVienUyBan.import.errNhiemKyTrungTen'
        : 'matTranUyVienUyBan.import.badNhiemKy';
    return fail(rowNum, txt(key, { gia_tri: nkRaw }));
  }

  const dvRaw = trimCell(raw.ten_don_vi);
  let donViId: string | null = null;
  if (dvRaw && !DON_VI_TINH.has(chuanHoaKhoaSoKhop(dvRaw))) {
    const dv = findRefStrict(ctx.xaPhuong, dvRaw);
    if (!dv.ok || !dv.ref) {
      const key =
        !dv.ok && dv.reason === 'ambiguous'
          ? 'matTranUyVienUyBan.import.errDonViTrungTen'
          : 'matTranUyVienUyBan.import.errDonVi';
      return fail(rowNum, txt(key, { gia_tri: dvRaw }));
    }
    donViId = dv.ref.id;
  }
  if (ctx.xaPhamVi) {
    if (!dvRaw) donViId = ctx.xaPhamVi;
    else if (donViId !== ctx.xaPhamVi) return fail(rowNum, txt('shared.import.errNgoaiDonVi'));
  }

  const cb = resolveCanBoImport(ctx.canBo, raw);
  if (!cb.ok) return fail(rowNum, txt(CAN_BO_ERR[cb.reason], { gia_tri: trimCell(raw.can_bo_id) }));

  let trangThai: MttqUyVienTrangThamGia | null = null;
  if (trimCell(raw.trang_thai_tham_gia)) {
    trangThai = matchEnumCell(MTTQ_UY_VIEN_TRANG_THAM_GIA, raw.trang_thai_tham_gia);
    if (!trangThai) {
      return fail(
        rowNum,
        txt('matTranUyVienUyBan.import.errTrangThamGia', { gia_tri: trimCell(raw.trang_thai_tham_gia) }),
      );
    }
  }

  return {
    ok: true,
    data: {
      rowNum,
      raw,
      idKey: trimCell(raw.id) || null,
      nhiem_ky_id: nk.ref.id,
      don_vi_id: donViId,
      can_bo_id: cb.id,
      ma_uv: nullIfEmpty(trimCell(raw.ma_uv)),
      trang_thai_tham_gia: trangThai,
      ghi_chu: nullIfEmpty(trimCell(raw.ghi_chu)),
    },
  };
}

/** Payload ghi. `taoMoi` ⇒ trạng thái trống lấy mặc định; ghi đè thì bỏ để giữ giá trị cũ. */
export function uyVienImportPayload(row: UyVienImportRow, taoMoi = false): Record<string, unknown> {
  const out: Record<string, unknown> = {
    nhiem_ky_id: row.nhiem_ky_id,
    don_vi_id: row.don_vi_id,
    can_bo_id: row.can_bo_id,
    ma_uv: row.ma_uv,
    ghi_chu: row.ghi_chu,
  };
  const trangThai = row.trang_thai_tham_gia ?? (taoMoi ? MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG : null);
  if (trangThai) out.trang_thai_tham_gia = trangThai;
  return out;
}

/**
 * Cột file → cột DB mà payload ghi. Cán bộ đến từ ô ID hoặc ô họ tên, nên
 * map một trong hai là đủ để ghi `can_bo_id`.
 */
export function uyVienMappedDbColumns(mapped: ReadonlySet<string>): Set<string> {
  const out = new Set(mapped);
  if (mapped.has('ten_nhiem_ky')) out.add('nhiem_ky_id');
  if (mapped.has('ten_don_vi')) out.add('don_vi_id');
  if (mapped.has('ho_va_ten')) out.add('can_bo_id');
  return out;
}
