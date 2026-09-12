/**
 * Chuyển một dòng Excel thành dữ liệu danh mục / hàng hóa — LOGIC THUẦN, không gọi mạng.
 *
 * Toàn bộ câu báo lỗi ở đây là câu người dùng cuối đọc: phải nói rõ DÒNG nào,
 * SAI cái gì và SỬA thế nào. Cán bộ tải file lỗi về, sửa cột « Lỗi » rồi nhập lại.
 */
import { txt } from '@/lib/text';
import type { KhoDanhMucHangHoaFormValues, KhoDanhSachHangHoaFormValues } from '../core/schema';

/** Trần số dòng một lần nhập — chặn file dán nhầm vài chục nghìn dòng làm treo trình duyệt. */
export const HANG_HOA_IMPORT_MAX_ROWS = 2000;

export type ImportRowOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

/** Khớp đúng `z.enum` trong `core/schema.ts` — chuỗi lưu DB có dấu. */
const DANG_HOAT_DONG = 'Đang hoạt động';
const NGUNG_HOAT_DONG = 'Ngừng hoạt động';

export type TrangThaiHangHoa = typeof DANG_HOAT_DONG | typeof NGUNG_HOAT_DONG;

export function trimCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v).trim();
  return String(v).trim();
}

/** Khoá so khớp/chống trùng: bỏ dấu cách thừa + không phân biệt hoa thường. */
export function normalizeMatchKey(v: unknown): string {
  return trimCell(v).replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Trạng thái: chấp nhận cách viết tắt cán bộ hay gõ ("hoạt động", "ngưng", "x", "1"/"0").
 * Để trống ⇒ mặc định Đang hoạt động (không bắt cán bộ điền cột này).
 */
export function parseImportTrangThai(raw: unknown): TrangThaiHangHoa | null {
  const s = normalizeMatchKey(raw);
  if (!s) return DANG_HOAT_DONG;
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

/** Thứ tự: để trống ⇒ tự đánh tiếp; có giá trị thì phải là số nguyên ≥ 0. */
export function parseImportThuTu(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  const s = trimCell(raw);
  if (!s) return { ok: true, value: null };
  const n = Number(s.replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return { ok: false };
  return { ok: true, value: n };
}

export interface DanhMucImportCtx {
  /** Tên danh mục đã có trong hệ thống (khoá chuẩn hoá → tên hiển thị). */
  existingTen: Map<string, string>;
  /** Tên đã gặp ở các dòng trước TRONG CÙNG FILE (khoá chuẩn hoá → số dòng). */
  seenTen: Map<string, number>;
  /** Thứ tự kế tiếp dùng khi cột Thứ tự để trống — người gọi tự tăng sau mỗi dòng hợp lệ. */
  nextThuTu: number;
}

export function parseDanhMucImportRow(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: DanhMucImportCtx,
): ImportRowOutcome<KhoDanhMucHangHoaFormValues> {
  const prefix = txt('matTranHangHoa.import.rowPrefix', { row: rowNum });

  const ten = trimCell(row.ten_danh_muc);
  if (!ten) return { ok: false, message: prefix + txt('matTranHangHoa.import.errTenDanhMucEmpty') };

  const key = normalizeMatchKey(ten);
  const daCo = ctx.existingTen.get(key);
  if (daCo != null) {
    return { ok: false, message: prefix + txt('matTranHangHoa.import.errDanhMucTrungHeThong', { ten: daCo }) };
  }
  const dongTruoc = ctx.seenTen.get(key);
  if (dongTruoc != null) {
    return {
      ok: false,
      message: prefix + txt('matTranHangHoa.import.errDanhMucTrungFile', { ten, row: dongTruoc }),
    };
  }

  const trangThai = parseImportTrangThai(row.trang_thai);
  if (trangThai == null) {
    return {
      ok: false,
      message: prefix + txt('matTranHangHoa.import.errTrangThai', { gia_tri: trimCell(row.trang_thai) }),
    };
  }

  const thuTu = parseImportThuTu(row.thu_tu);
  if (!thuTu.ok) {
    return { ok: false, message: prefix + txt('matTranHangHoa.import.errThuTu', { gia_tri: trimCell(row.thu_tu) }) };
  }

  return {
    ok: true,
    data: {
      ten_danh_muc: ten,
      mo_ta: trimCell(row.mo_ta),
      thu_tu: thuTu.value ?? ctx.nextThuTu,
      trang_thai: trangThai,
    },
  };
}

export interface HangHoaImportCtx {
  /** Danh mục hiện có — tra theo id hoặc theo tên. */
  danhMuc: { id: string; ten: string }[];
  /** Cặp (id danh mục + tên hàng) đã có trong hệ thống. */
  existingHang: Set<string>;
  /** Cặp đã gặp ở dòng trước trong cùng file → số dòng. */
  seenHang: Map<string, number>;
  /** Thứ tự kế tiếp theo từng danh mục — người gọi tự tăng. */
  nextThuTuByDanhMuc: Map<string, number>;
}

/** Khoá chống trùng hàng hóa: cùng danh mục + cùng tên hàng (không phân biệt hoa thường). */
export function hangHoaDedupKey(idDanhMuc: string, tenHang: string): string {
  return `${String(idDanhMuc).trim()}::${normalizeMatchKey(tenHang)}`;
}

export function parseHangHoaImportRow(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: HangHoaImportCtx,
): ImportRowOutcome<KhoDanhSachHangHoaFormValues> {
  const prefix = txt('matTranHangHoa.import.rowPrefix', { row: rowNum });

  const dmRaw = trimCell(row.id_danh_muc);
  if (!dmRaw) return { ok: false, message: prefix + txt('matTranHangHoa.import.errDanhMucEmpty') };
  const dm =
    ctx.danhMuc.find((d) => String(d.id) === dmRaw) ??
    ctx.danhMuc.find((d) => normalizeMatchKey(d.ten) === normalizeMatchKey(dmRaw));
  if (!dm) {
    return { ok: false, message: prefix + txt('matTranHangHoa.import.errDanhMucNotFound', { ten: dmRaw }) };
  }

  const tenHang = trimCell(row.ten_hang_hoa);
  if (!tenHang) return { ok: false, message: prefix + txt('matTranHangHoa.import.errTenHangEmpty') };

  const donViTinh = trimCell(row.don_vi_tinh);
  if (!donViTinh) return { ok: false, message: prefix + txt('matTranHangHoa.import.errDonViTinhEmpty') };

  const key = hangHoaDedupKey(dm.id, tenHang);
  if (ctx.existingHang.has(key)) {
    return {
      ok: false,
      message: prefix + txt('matTranHangHoa.import.errHangTrungHeThong', { ten: tenHang, danh_muc: dm.ten }),
    };
  }
  const dongTruoc = ctx.seenHang.get(key);
  if (dongTruoc != null) {
    return {
      ok: false,
      message: prefix + txt('matTranHangHoa.import.errHangTrungFile', { ten: tenHang, row: dongTruoc }),
    };
  }

  const trangThai = parseImportTrangThai(row.trang_thai);
  if (trangThai == null) {
    return {
      ok: false,
      message: prefix + txt('matTranHangHoa.import.errTrangThai', { gia_tri: trimCell(row.trang_thai) }),
    };
  }

  const thuTu = parseImportThuTu(row.thu_tu);
  if (!thuTu.ok) {
    return { ok: false, message: prefix + txt('matTranHangHoa.import.errThuTu', { gia_tri: trimCell(row.thu_tu) }) };
  }

  return {
    ok: true,
    data: {
      id_danh_muc: String(dm.id),
      ten_hang_hoa: tenHang,
      don_vi_tinh: donViTinh,
      mo_ta: trimCell(row.mo_ta),
      quy_cach: trimCell(row.quy_cach),
      thu_tu: thuTu.value ?? ctx.nextThuTuByDanhMuc.get(String(dm.id)) ?? 0,
      trang_thai: trangThai,
    },
  };
}
