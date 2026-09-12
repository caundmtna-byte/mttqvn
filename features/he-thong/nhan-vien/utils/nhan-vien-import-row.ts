/**
 * Chuyển một dòng Excel thành dữ liệu nhân viên — LOGIC THUẦN, không gọi mạng.
 *
 * Mọi FK (phòng ban, bộ phận, chức vụ, tổ chức, xã/phường) đều tra được bằng
 * **ID hoặc TÊN** — cán bộ khởi tạo hệ thống gõ tên, không ai nhớ id.
 * Câu lỗi phải nói rõ dòng nào, giá trị nào sai, tra ở đâu để sửa.
 */
import { txt } from '@/lib/text';
import { normalizeCapQuanLyInput, type CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import type { EmployeeFormValues } from '../core/schema';
import type { TrangThaiNhanVien } from '../core/types';

/** Trần số dòng một lần nhập — chống dán nhầm file khổng lồ (mỗi dòng là 2 request Auth). */
export const NHAN_VIEN_IMPORT_MAX_ROWS = 500;

export type ImportRowOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

export interface NamedRef {
  id: string;
  ten: string;
}

export function trimCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) {
    // ID bigint đọc từ Excel có thể ra dạng số — tránh mất chữ số / ký hiệu mũ.
    if (Number.isInteger(v) && Math.abs(v) > 1e12) return String(BigInt(v));
    return String(v).trim();
  }
  return String(v).trim();
}

export function normalizeMatchKey(v: unknown): string {
  return trimCell(v).replace(/\s+/g, ' ').toLowerCase();
}

/** Tách ô đa giá trị: "A, B; C" → ['A','B','C']. */
export function splitMultiCell(raw: unknown): string[] {
  const s = trimCell(raw);
  if (!s) return [];
  return s
    .split(/[,;|]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Tra theo id trước (khớp tuyệt đối), sau đó theo tên (không phân biệt hoa thường). */
export function findRef(refs: readonly NamedRef[], raw: unknown): NamedRef | undefined {
  const s = trimCell(raw);
  if (!s) return undefined;
  const byId = refs.find((r) => String(r.id) === s);
  if (byId) return byId;
  const key = normalizeMatchKey(s);
  return refs.find((r) => normalizeMatchKey(r.ten) === key);
}

/** Trạng thái tài khoản: để trống ⇒ Hoạt động. */
export function parseImportTrangThaiNhanVien(raw: unknown): TrangThaiNhanVien | null {
  const s = normalizeMatchKey(raw);
  if (!s) return 'Hoạt động';
  if (['hoạt động', 'hoat dong', 'đang hoạt động', 'dang hoat dong', 'mở', 'mo', '1', 'x'].includes(s)) {
    return 'Hoạt động';
  }
  if (['khóa', 'khoá', 'khoa', 'bị khóa', 'bi khoa', 'đã khóa', 'da khoa', '0'].includes(s)) {
    return 'Khóa';
  }
  return null;
}

export interface NhanVienImportCtx {
  phongBan: NamedRef[];
  chucVu: NamedRef[];
  toChuc: NamedRef[];
  xaPhuong: NamedRef[];
  /** Tên tài khoản đã có trong hệ thống (chữ thường). */
  existingUsernames: Set<string>;
  /** Tên tài khoản đã gặp ở dòng trước trong cùng file → số dòng. */
  seenUsernames: Map<string, number>;
}

export function parseNhanVienImportRow(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: NhanVienImportCtx,
): ImportRowOutcome<EmployeeFormValues> {
  const prefix = txt('employee.import.rowPrefix', { row: rowNum });

  const tenTaiKhoan = trimCell(row.ten_tai_khoan).toLowerCase();
  if (!tenTaiKhoan) return { ok: false, message: prefix + txt('employee.import.errTaiKhoanEmpty') };
  if (ctx.existingUsernames.has(tenTaiKhoan)) {
    return { ok: false, message: prefix + txt('employee.import.errTaiKhoanTrungHeThong', { ten: tenTaiKhoan }) };
  }
  const dongTruoc = ctx.seenUsernames.get(tenTaiKhoan);
  if (dongTruoc != null) {
    return {
      ok: false,
      message: prefix + txt('employee.import.errTaiKhoanTrungFile', { ten: tenTaiKhoan, row: dongTruoc }),
    };
  }

  const hoVaTen = trimCell(row.ho_va_ten);
  if (!hoVaTen) return { ok: false, message: prefix + txt('employee.import.errHoTenEmpty') };

  const pbRaw = trimCell(row.id_phong_ban);
  if (!pbRaw) return { ok: false, message: prefix + txt('employee.import.errPhongBanEmpty') };
  const pb = findRef(ctx.phongBan, pbRaw);
  if (!pb) return { ok: false, message: prefix + txt('employee.import.errPhongBanNotFound', { ten: pbRaw }) };

  const bpRaw = trimCell(row.id_bo_phan);
  let boPhanId = '';
  if (bpRaw) {
    const bp = findRef(ctx.phongBan, bpRaw);
    if (!bp) return { ok: false, message: prefix + txt('employee.import.errBoPhanNotFound', { ten: bpRaw }) };
    boPhanId = bp.id;
  }

  const cvRaw = trimCell(row.id_chuc_vu);
  if (!cvRaw) return { ok: false, message: prefix + txt('employee.import.errChucVuEmpty') };
  const cv = findRef(ctx.chucVu, cvRaw);
  if (!cv) return { ok: false, message: prefix + txt('employee.import.errChucVuNotFound', { ten: cvRaw }) };

  const capQuanLy: CapQuanLy[] = [];
  for (const part of splitMultiCell(row.cap_quan_ly)) {
    const norm = normalizeCapQuanLyInput(part);
    if (!norm) return { ok: false, message: prefix + txt('employee.import.errCapQuanLy', { gia_tri: part }) };
    if (!capQuanLy.includes(norm)) capQuanLy.push(norm);
  }

  const toChucIds: string[] = [];
  for (const part of splitMultiCell(row.to_chuc_ids)) {
    const tc = findRef(ctx.toChuc, part);
    if (!tc) return { ok: false, message: prefix + txt('employee.import.errToChucNotFound', { ten: part }) };
    if (!toChucIds.includes(tc.id)) toChucIds.push(tc.id);
  }

  const dvRaw = trimCell(row.don_vi_id);
  let donViId = '';
  if (dvRaw) {
    const dv = findRef(ctx.xaPhuong, dvRaw);
    if (!dv) return { ok: false, message: prefix + txt('employee.import.errDonViNotFound', { ten: dvRaw }) };
    donViId = dv.id;
  }
  // Cùng luật với form (`buildEmployeeSchema`), nhưng báo bằng câu người dùng hiểu
  // thay vì để zod trả lỗi kỹ thuật theo `path`.
  if (capQuanLy.includes('Xã phường') && !donViId) {
    return { ok: false, message: prefix + txt('employee.import.errDonViRequired') };
  }

  const trangThai = parseImportTrangThaiNhanVien(row.trang_thai);
  if (trangThai == null) {
    return { ok: false, message: prefix + txt('employee.import.errTrangThai', { gia_tri: trimCell(row.trang_thai) }) };
  }

  return {
    ok: true,
    data: {
      ten_tai_khoan: tenTaiKhoan,
      ho_va_ten: hoVaTen,
      hinh_anh: null,
      id_phong_ban: pb.id,
      id_bo_phan: boPhanId,
      id_chuc_vu: cv.id,
      cap_quan_ly: capQuanLy,
      to_chuc_ids: toChucIds,
      don_vi_id: donViId,
      trang_thai: trangThai,
    },
  };
}
