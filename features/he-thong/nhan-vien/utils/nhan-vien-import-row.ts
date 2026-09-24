/**
 * Chuyển một dòng Excel thành dữ liệu nhân viên — LOGIC THUẦN, không gọi mạng.
 *
 * Mọi FK (phòng ban, bộ phận, chức vụ, tổ chức, xã/phường) đều tra được bằng
 * **ID hoặc TÊN** — cán bộ khởi tạo hệ thống gõ tên, không ai nhớ id.
 * Câu lỗi phải nói rõ dòng nào, giá trị nào sai, tra ở đâu để sửa.
 *
 * Trùng tên tài khoản (trong file / với hệ thống) do lõi `lib/data/import-plan.ts`
 * xét theo khoá `ten_tai_khoan` — không kiểm lại ở đây.
 */
import { txt } from '@/lib/text';
import { findRef, findRefStrict, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportKeySpec } from '@/lib/data/import-plan';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { normalizeCapQuanLyInput, type CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { buildEmployeeSchema, type EmployeeFormValues } from '../core/schema';
import type { TrangThaiNhanVien } from '../core/types';

/** Trần số dòng một lần nhập — chống dán nhầm file khổng lồ (mỗi dòng tạo mới là 2 request Auth). */
export const NHAN_VIEN_IMPORT_MAX_ROWS = 500;

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

/** Tên tài khoản so khớp như lúc lưu: cắt hai đầu, chữ thường. */
export function khoaTenTaiKhoan(v: string | null | undefined): string | null {
  const s = (v ?? '').trim().toLowerCase();
  return s === '' ? null : s;
}

export interface NhanVienImportCtx {
  phongBan: readonly NamedRef[];
  chucVu: readonly NamedRef[];
  toChuc: readonly NamedRef[];
  xaPhuong: readonly NamedRef[];
  /** id nhân viên đã có → tên tài khoản (chữ thường). */
  taiKhoanTheoId: ReadonlyMap<string, string>;
}

export interface NhanVienImportRow extends ImportParsedRow {
  values: EmployeeFormValues;
  idKey: string | null;
}

/** Bản ghi đã có — cột khoá + cột xét phạm vi (`nhanVienRowVisible`). */
export interface NhanVienImportExisting {
  id: string;
  ten_tai_khoan: string;
  don_vi_id: string | null;
  id_phong_ban: string | null;
  cap_quan_ly: readonly string[];
}

/**
 * Ghi đè xoá đơn vị của hồ sơ đang là cấp "Xã phường" mà file KHÔNG có cột Cấp
 * quản lý ⇒ hồ sơ còn "Xã phường" nhưng mất xã (form không bao giờ cho lưu thế).
 * Bộ đọc dòng chỉ bắt được khi cột Cấp quản lý có mặt, nên phải xét bản ghi cũ.
 */
export function kiemGhiDeNhanVien(
  existing: NhanVienImportExisting,
  row: NhanVienImportRow,
  mapped: ReadonlySet<string>,
): string | null {
  if (!mapped.has('don_vi_id') || mapped.has('cap_quan_ly')) return null;
  if (row.values.don_vi_id) return null;
  return existing.cap_quan_ly.includes('Xã phường') ? txt('employee.import.errDonViRequired') : null;
}

const schema = buildEmployeeSchema();

export function parseNhanVienImportRow(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: NhanVienImportCtx,
): ImportRowOutcome<NhanVienImportRow> {
  const prefix = txt('shared.import.rowPrefix', { row: rowNum });
  const fail = (message: string) => ({ ok: false as const, message: prefix + message });

  const tenTaiKhoan = trimCell(row.ten_tai_khoan).toLowerCase();
  if (!tenTaiKhoan) return fail(txt('employee.import.errTaiKhoanEmpty'));

  // Ghi đè KHÔNG đụng tài khoản đăng nhập, nên không được đổi tên tài khoản của
  // một hồ sơ đã có: đổi ở đây là hồ sơ trỏ sang một tài khoản Auth không tồn tại.
  const idKey = trimCell(row.id) || null;
  const taiKhoanCu = idKey ? ctx.taiKhoanTheoId.get(idKey) : undefined;
  if (taiKhoanCu != null && taiKhoanCu !== tenTaiKhoan) {
    return fail(txt('employee.import.errDoiTaiKhoan', { cu: taiKhoanCu, moi: tenTaiKhoan }));
  }

  const hoVaTen = trimCell(row.ho_va_ten);
  if (!hoVaTen) return fail(txt('employee.import.errHoTenEmpty'));

  const pbRaw = trimCell(row.id_phong_ban);
  if (!pbRaw) return fail(txt('employee.import.errPhongBanEmpty'));
  const pb = findRef(ctx.phongBan, pbRaw);
  if (!pb) return fail(txt('employee.import.errPhongBanNotFound', { ten: pbRaw }));

  const bpRaw = trimCell(row.id_bo_phan);
  let boPhanId = '';
  if (bpRaw) {
    const bp = findRef(ctx.phongBan, bpRaw);
    if (!bp) return fail(txt('employee.import.errBoPhanNotFound', { ten: bpRaw }));
    boPhanId = bp.id;
  }

  const cvRaw = trimCell(row.id_chuc_vu);
  if (!cvRaw) return fail(txt('employee.import.errChucVuEmpty'));
  const cv = findRef(ctx.chucVu, cvRaw);
  if (!cv) return fail(txt('employee.import.errChucVuNotFound', { ten: cvRaw }));

  const capQuanLy: CapQuanLy[] = [];
  for (const part of splitMultiCell(row.cap_quan_ly)) {
    const norm = normalizeCapQuanLyInput(part);
    if (!norm) return fail(txt('employee.import.errCapQuanLy', { gia_tri: part }));
    if (!capQuanLy.includes(norm)) capQuanLy.push(norm);
  }

  const toChucIds: string[] = [];
  for (const part of splitMultiCell(row.to_chuc_ids)) {
    const tc = findRef(ctx.toChuc, part);
    if (!tc) return fail(txt('employee.import.errToChucNotFound', { ten: part }));
    if (!toChucIds.includes(tc.id)) toChucIds.push(tc.id);
  }

  // Xã phường trùng tên giữa các tỉnh là chuyện có thật — không nhận bừa.
  const dvRaw = trimCell(row.don_vi_id);
  const dv = findRefStrict(ctx.xaPhuong, dvRaw);
  if (!dv.ok) {
    const key = dv.reason === 'ambiguous' ? 'employee.import.errDonViTrungTen' : 'employee.import.errDonViNotFound';
    return fail(txt(key, { ten: dvRaw }));
  }
  const donViId = dv.ref?.id ?? '';
  // Cùng luật với form (`buildEmployeeSchema`), nhưng báo bằng câu người dùng hiểu
  // thay vì để zod trả lỗi kỹ thuật theo `path`.
  if (capQuanLy.includes('Xã phường') && !donViId) {
    return fail(txt('employee.import.errDonViRequired'));
  }

  const trangThai = parseImportTrangThaiNhanVien(row.trang_thai);
  if (trangThai == null) {
    return fail(txt('employee.import.errTrangThai', { gia_tri: trimCell(row.trang_thai) }));
  }

  const checked = schema.safeParse({
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
  });
  if (!checked.success) return fail(checked.error.issues[0]?.message ?? checked.error.message);

  return { ok: true, data: { rowNum, raw: row, values: checked.data, idKey } };
}

/** `ten_tai_khoan TEXT NOT NULL UNIQUE` — ứng dụng luôn lưu chữ thường. */
export const NHAN_VIEN_IMPORT_KEYS: readonly ImportKeySpec<NhanVienImportExisting, NhanVienImportRow>[] = [
  {
    key: 'id',
    label: txt('shared.import.colMaHeThong'),
    unique: true,
    ofExisting: (e) => e.id,
    ofRow: (r) => r.idKey,
  },
  {
    key: 'ten_tai_khoan',
    label: txt('employee.import.keyTenTaiKhoan'),
    unique: true,
    ofExisting: (e) => khoaTenTaiKhoan(e.ten_tai_khoan),
    ofRow: (r) => khoaTenTaiKhoan(r.values.ten_tai_khoan),
  },
];
