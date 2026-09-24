/**
 * Chuyển một dòng Excel thành dữ liệu danh mục / hàng hóa — LOGIC THUẦN, không gọi mạng.
 *
 * Chống trùng (trong file / với hệ thống) và ghi đè do lõi chung
 * `lib/data/import-plan.ts` lo — ở đây chỉ đọc và kiểm từng ô.
 *
 * Thứ tự và trạng thái để TRỐNG được giữ là `null`: thêm mới thì lấy mặc định
 * (tự đánh số tiếp / Đang hoạt động), ghi đè thì GIỮ NGUYÊN giá trị cũ — không
 * để một ô bỏ trống âm thầm đổi thứ tự hay mở lại hàng đã ngừng.
 */
import { txt } from '@/lib/text';
import { findRefStrict, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { khoDanhMucHangHoaSchema, khoDanhSachHangHoaSchema } from '../core/schema';

/** Trần số dòng một lần nhập — chặn file dán nhầm vài chục nghìn dòng làm treo trình duyệt. */
export const HANG_HOA_IMPORT_MAX_ROWS = 2000;

/** Khớp đúng `z.enum` trong `core/schema.ts` — chuỗi lưu DB có dấu. */
const DANG_HOAT_DONG = 'Đang hoạt động';
const NGUNG_HOAT_DONG = 'Ngừng hoạt động';

export type TrangThaiHangHoa = typeof DANG_HOAT_DONG | typeof NGUNG_HOAT_DONG;

export const TRANG_THAI_HANG_HOA_MAC_DINH: TrangThaiHangHoa = DANG_HOAT_DONG;

function khoaO(v: unknown): string {
  return trimCell(v).replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Trạng thái: chấp nhận cách viết tắt cán bộ hay gõ ("hoạt động", "ngưng", "x", "1"/"0").
 * Trả `''` khi ô trống (người gọi tự quyết mặc định), `null` khi giá trị lạ.
 */
export function parseImportTrangThai(raw: unknown): TrangThaiHangHoa | '' | null {
  const s = khoaO(raw);
  if (!s) return '';
  if (['đang hoạt động', 'dang hoat dong', 'hoạt động', 'hoat dong', 'x', '1', 'có', 'co'].includes(s)) {
    return DANG_HOAT_DONG;
  }
  if (
    [
      'ngừng hoạt động',
      'ngưng hoạt động',
      'ngung hoat dong',
      'ngừng',
      'ngưng',
      'ngung',
      'dừng',
      'dung',
      '0',
      'không',
      'khong',
    ].includes(s)
  ) {
    return NGUNG_HOAT_DONG;
  }
  return null;
}

/** Thứ tự: để trống ⇒ `null`; có giá trị thì phải là số nguyên ≥ 0. */
export function parseImportThuTu(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  const s = trimCell(raw);
  if (!s) return { ok: true, value: null };
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('matTranHangHoa.import.rowPrefix', { row: rowNum }) + message };
}

function nullIfEmpty(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

/** Đọc trạng thái + thứ tự dùng chung cho hai loại dòng. */
function parseTrangThaiThuTu(
  rowNum: number,
  row: Record<string, unknown>,
):
  | { ok: true; trangThai: TrangThaiHangHoa | null; thuTu: number | null }
  | { ok: false; message: string } {
  const trangThai = parseImportTrangThai(row.trang_thai);
  if (trangThai == null) {
    return fail(rowNum, txt('matTranHangHoa.import.errTrangThai', { gia_tri: trimCell(row.trang_thai) }));
  }
  const thuTu = parseImportThuTu(row.thu_tu);
  if (!thuTu.ok) {
    return fail(rowNum, txt('matTranHangHoa.import.errThuTu', { gia_tri: trimCell(row.thu_tu) }));
  }
  return { ok: true, trangThai: trangThai === '' ? null : trangThai, thuTu: thuTu.value };
}

// ---------------------------------------------------------------------------
// Danh mục
// ---------------------------------------------------------------------------

export interface DanhMucImportRow extends ImportParsedRow {
  idKey: string | null;
  ten_danh_muc: string;
  mo_ta: string;
  /** `null` = ô trống. */
  thu_tu: number | null;
  /** `null` = ô trống. */
  trang_thai: TrangThaiHangHoa | null;
}

export function parseDanhMucImportRow(
  rowNum: number,
  row: Record<string, unknown>,
): ImportRowOutcome<DanhMucImportRow> {
  const ten = trimCell(row.ten_danh_muc);
  if (!ten) return fail(rowNum, txt('matTranHangHoa.import.errTenDanhMucEmpty'));

  const tt = parseTrangThaiThuTu(rowNum, row);
  if (!tt.ok) return tt;

  const moTa = trimCell(row.mo_ta);
  const checked = khoDanhMucHangHoaSchema.safeParse({
    ten_danh_muc: ten,
    mo_ta: moTa,
    thu_tu: tt.thuTu ?? 0,
    trang_thai: tt.trangThai ?? TRANG_THAI_HANG_HOA_MAC_DINH,
  });
  if (!checked.success) return fail(rowNum, checked.error.issues[0]?.message ?? checked.error.message);

  return {
    ok: true,
    data: {
      rowNum,
      raw: row,
      idKey: trimCell(row.id) || null,
      ten_danh_muc: ten,
      mo_ta: moTa,
      thu_tu: tt.thuTu,
      trang_thai: tt.trangThai,
    },
  };
}

/** Có khi THÊM MỚI; ghi đè không truyền để thứ tự / trạng thái trống giữ giá trị cũ. */
export interface ImportTaoMoi {
  thuTuTiepTheo: number;
}

function ganThuTuTrangThai(
  out: Record<string, unknown>,
  row: { thu_tu: number | null; trang_thai: TrangThaiHangHoa | null },
  taoMoi: ImportTaoMoi | undefined,
): Record<string, unknown> {
  const thuTu = row.thu_tu ?? taoMoi?.thuTuTiepTheo;
  if (thuTu != null) out.thu_tu = thuTu;
  const trangThai = row.trang_thai ?? (taoMoi ? TRANG_THAI_HANG_HOA_MAC_DINH : null);
  if (trangThai != null) out.trang_thai = trangThai;
  return out;
}

export function danhMucImportPayload(
  row: DanhMucImportRow,
  taoMoi?: ImportTaoMoi,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ten_danh_muc: row.ten_danh_muc,
    mo_ta: nullIfEmpty(row.mo_ta),
  };
  return ganThuTuTrangThai(out, row, taoMoi);
}

// ---------------------------------------------------------------------------
// Hàng hóa
// ---------------------------------------------------------------------------

export interface HangHoaImportRowCtx {
  /** Danh mục hiện có — tra theo id hoặc đúng tên (bỏ dấu, không phân biệt hoa thường). */
  danhMuc: readonly NamedRef[];
}

export interface HangHoaImportRow extends ImportParsedRow {
  idKey: string | null;
  id_danh_muc: string;
  ten_hang_hoa: string;
  don_vi_tinh: string;
  mo_ta: string;
  quy_cach: string;
  thu_tu: number | null;
  trang_thai: TrangThaiHangHoa | null;
}

export function parseHangHoaImportRow(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: HangHoaImportRowCtx,
): ImportRowOutcome<HangHoaImportRow> {
  const dmRaw = trimCell(row.id_danh_muc);
  if (!dmRaw) return fail(rowNum, txt('matTranHangHoa.import.errDanhMucEmpty'));
  const dm = findRefStrict(ctx.danhMuc, dmRaw);
  if (!dm.ok || !dm.ref) {
    const key =
      !dm.ok && dm.reason === 'ambiguous'
        ? 'matTranHangHoa.import.errDanhMucTrungTen'
        : 'matTranHangHoa.import.errDanhMucNotFound';
    return fail(rowNum, txt(key, { ten: dmRaw }));
  }

  const tenHang = trimCell(row.ten_hang_hoa);
  if (!tenHang) return fail(rowNum, txt('matTranHangHoa.import.errTenHangEmpty'));

  const donViTinh = trimCell(row.don_vi_tinh);
  if (!donViTinh) return fail(rowNum, txt('matTranHangHoa.import.errDonViTinhEmpty'));

  const tt = parseTrangThaiThuTu(rowNum, row);
  if (!tt.ok) return tt;

  const moTa = trimCell(row.mo_ta);
  const quyCach = trimCell(row.quy_cach);
  const checked = khoDanhSachHangHoaSchema.safeParse({
    id_danh_muc: dm.ref.id,
    ten_hang_hoa: tenHang,
    don_vi_tinh: donViTinh,
    mo_ta: moTa,
    quy_cach: quyCach,
    thu_tu: tt.thuTu ?? 0,
    trang_thai: tt.trangThai ?? TRANG_THAI_HANG_HOA_MAC_DINH,
  });
  if (!checked.success) return fail(rowNum, checked.error.issues[0]?.message ?? checked.error.message);

  return {
    ok: true,
    data: {
      rowNum,
      raw: row,
      idKey: trimCell(row.id) || null,
      id_danh_muc: String(dm.ref.id),
      ten_hang_hoa: tenHang,
      don_vi_tinh: donViTinh,
      mo_ta: moTa,
      quy_cach: quyCach,
      thu_tu: tt.thuTu,
      trang_thai: tt.trangThai,
    },
  };
}

export function hangHoaImportPayload(
  row: HangHoaImportRow,
  taoMoi?: ImportTaoMoi,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    id_danh_muc: Number(row.id_danh_muc),
    ten_hang_hoa: row.ten_hang_hoa,
    don_vi_tinh: row.don_vi_tinh,
    mo_ta: nullIfEmpty(row.mo_ta),
    quy_cach: nullIfEmpty(row.quy_cach),
  };
  return ganThuTuTrangThai(out, row, taoMoi);
}
