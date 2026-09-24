/**
 * Đọc MỘT dòng Excel thành hồ sơ cán bộ — hàm thuần, không gọi mạng.
 *
 * Mọi khoá ngoại nhận id hoặc tên, khớp NGUYÊN VẸN sau khi bỏ dấu / không phân
 * biệt hoa thường (`findRefStrict`); hai mục trùng tên thì báo lỗi thay vì lấy
 * mục đầu tiên. Chức vụ tra theo tên CHỈ trong phòng ban đã chọn (kể cả bộ phận
 * con) — cùng một tên chức vụ có ở nhiều phòng ban là chuyện bình thường.
 */
import { txt } from '@/lib/text';
import {
  findRefStrict,
  matchEnumCell,
  parseImportNgay,
  trimCell,
  type NamedRef,
} from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import type { Position } from '@/features/he-thong/chuc-vu/core/types';
import type { Department } from '@/features/he-thong/phong-ban/core/types';
import { normalizeCapQuanLyInput, type CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { MTTQ_CAN_BO_GIOI_TINH } from '../core/constants';
import type { buildMttqCanBoSchema, MttqCanBoFormValues } from '../core/schema';
import {
  chucVuBelongsToRootPhongBan,
  collectAllowedPhongBanIds,
  positionMatchesAllowedPhongBan,
} from './chuc-vu-options-for-phong-ban';
import { parseImportTonGiao } from './ton-giao-form';

export const CAN_BO_IMPORT_MAX_ROWS = 2000;

export type CanBoImportPosition = Pick<Position, 'id' | 'ten_chuc_vu' | 'phong_ban_id' | 'trang_thai'>;
export type CanBoImportDepartment = Pick<Department, 'id' | 'ten_phong_ban' | 'cha_id' | 'trang_thai'>;

export interface CanBoImportRowCtx {
  positions: readonly CanBoImportPosition[];
  departments: readonly CanBoImportDepartment[];
  toChuc: readonly NamedRef[];
  danToc: readonly NamedRef[];
  trinhDo: readonly NamedRef[];
  lyLuan: readonly NamedRef[];
  trangThai: readonly NamedRef[];
  xa: readonly NamedRef[];
  /** `buildMttqCanBoSchema(...)` — dựng một lần ở service. */
  schema: ReturnType<typeof buildMttqCanBoSchema>;
}

export interface CanBoImportRow extends ImportParsedRow {
  idKey: string | null;
  values: MttqCanBoFormValues;
}

/**
 * Cột file ↔ cột DB khác tên (cho `pickMappedColumns`): payload ghi
 * `phong_ban_id` nhưng file mang cột `id_phong_ban`.
 */
export const CAN_BO_IMPORT_COLUMN_ALIAS: Readonly<Record<string, string>> = {
  phong_ban_id: 'id_phong_ban',
};

type Fail = { ok: false; message: string };

function fail(rowNum: number, message: string): Fail {
  return { ok: false, message: txt('matTranCanBo.import.rowPrefix', { row: String(rowNum) }) + message };
}

const SPLIT = /[,;|/]+/;

/** Có / Không, true/false, 1/0, x. Ô trống hoặc giá trị khác ⇒ không phải đảng viên. */
export function parseImportDangVien(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const s = trimCell(raw).toLowerCase();
  return ['có', 'co', 'yes', 'true', '1', 'x'].includes(s);
}

/** « Tỉnh », « Xã phường » — phân tách bằng dấu phẩy/chấm phẩy. Để trống = không gán. */
export function parseImportCapQuanLy(raw: unknown): CapQuanLy[] | null {
  const s = trimCell(raw);
  if (!s) return [];
  const values: CapQuanLy[] = [];
  for (const part of s.split(SPLIT).map((p) => p.trim()).filter(Boolean)) {
    const norm = normalizeCapQuanLyInput(part);
    if (!norm) return null;
    if (!values.includes(norm)) values.push(norm);
  }
  return values;
}

type RefResult = { ok: true; id: string } | { ok: false; errorKey: string };

function refRequired(list: readonly NamedRef[], raw: unknown, emptyKey: string, missingKey: string): RefResult {
  if (!trimCell(raw)) return { ok: false, errorKey: emptyKey };
  const r = findRefStrict(list, raw);
  if (r.ok && r.ref) return { ok: true, id: r.ref.id };
  return {
    ok: false,
    errorKey: !r.ok && r.reason === 'ambiguous' ? 'matTranCanBo.import.errorTrungTen' : missingKey,
  };
}

function thietLap(list: readonly NamedRef[], raw: unknown): RefResult {
  return refRequired(list, raw, 'matTranCanBo.import.errorThietLapEmpty', 'matTranCanBo.import.errorThietLapResolve');
}

/** Một hoặc nhiều tổ chức — id hoặc tên, phân tách bằng dấu phẩy/chấm phẩy. */
function toChucIds(list: readonly NamedRef[], raw: unknown): { ok: true; ids: string[] } | { ok: false; errorKey: string } {
  const parts = trimCell(raw).split(SPLIT).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, errorKey: 'matTranCanBo.import.errorThietLapEmpty' };
  const ids: string[] = [];
  for (const part of parts) {
    const r = thietLap(list, part);
    if (!r.ok) return r;
    if (!ids.includes(r.id)) ids.push(r.id);
  }
  return { ok: true, ids };
}

/** Chức vụ: id khớp ở mọi phòng ban; tên chỉ tra trong phòng ban đã chọn. */
function chucVuId(ctx: CanBoImportRowCtx, raw: unknown, phongBanId: string): RefResult {
  const s = trimCell(raw);
  if (!s) return { ok: false, errorKey: 'matTranCanBo.import.errorChucVuEmpty' };
  const byId = ctx.positions.find((p) => String(p.id) === s);
  if (byId) {
    return chucVuBelongsToRootPhongBan(String(byId.id), phongBanId, ctx.positions, ctx.departments)
      ? { ok: true, id: String(byId.id) }
      : { ok: false, errorKey: 'matTranCanBo.import.errorChucVuPhongBanMismatch' };
  }
  const allowed = collectAllowedPhongBanIds(phongBanId, ctx.departments);
  const inPhong = ctx.positions
    .filter((p) => positionMatchesAllowedPhongBan(p, allowed))
    .map((p) => ({ id: String(p.id), ten: p.ten_chuc_vu }));
  const r = findRefStrict(inPhong, s);
  if (r.ok && r.ref) return { ok: true, id: r.ref.id };
  if (!r.ok && r.reason === 'ambiguous') return { ok: false, errorKey: 'matTranCanBo.import.errorTrungTen' };
  // Tên có thật nhưng ở phòng ban khác: nói đúng lỗi thay vì "không tìm thấy".
  const elsewhere = findRefStrict(
    ctx.positions.map((p) => ({ id: String(p.id), ten: p.ten_chuc_vu })),
    s,
  );
  return {
    ok: false,
    errorKey:
      elsewhere.ok || elsewhere.reason === 'ambiguous'
        ? 'matTranCanBo.import.errorChucVuPhongBanMismatch'
        : 'matTranCanBo.import.errorChucVuResolve',
  };
}

export function parseCanBoImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: CanBoImportRowCtx,
): ImportRowOutcome<CanBoImportRow> {
  const err = (key: string) => fail(rowNum, txt(key));

  const pb = refRequired(
    ctx.departments.map((d) => ({ id: String(d.id), ten: d.ten_phong_ban })),
    raw.id_phong_ban,
    'matTranCanBo.import.errorPhongBanEmpty',
    'matTranCanBo.import.errorPhongBanResolve',
  );
  if (!pb.ok) return err(pb.errorKey);

  const toChuc = toChucIds(ctx.toChuc, raw.to_chuc_ids);
  if (!toChuc.ok) return err(toChuc.errorKey);
  const danToc = thietLap(ctx.danToc, raw.dan_toc_id);
  if (!danToc.ok) return err(danToc.errorKey);
  const trinhDo = thietLap(ctx.trinhDo, raw.trinh_do_id);
  if (!trinhDo.ok) return err(trinhDo.errorKey);
  const lyLuan = thietLap(ctx.lyLuan, raw.ly_luan_chinh_tri_id);
  if (!lyLuan.ok) return err(lyLuan.errorKey);
  const trangThai = thietLap(ctx.trangThai, raw.trang_thai_id);
  if (!trangThai.ok) return err(trangThai.errorKey);

  const cv = chucVuId(ctx, raw.chuc_vu_id, pb.id);
  if (!cv.ok) return err(cv.errorKey);

  let donViId = '';
  if (trimCell(raw.don_vi_id)) {
    const dv = findRefStrict(ctx.xa, raw.don_vi_id);
    if (!dv.ok || !dv.ref) {
      return err(
        !dv.ok && dv.reason === 'ambiguous' ? 'matTranCanBo.import.errorTrungTen' : 'matTranCanBo.import.errorDonViResolve',
      );
    }
    donViId = dv.ref.id;
  }

  const capQuanLy = parseImportCapQuanLy(raw.cap_quan_ly);
  if (!capQuanLy) return err('matTranCanBo.import.errorCapQuanLyInvalid');

  const hoTen = trimCell(raw.ho_ten);
  if (!hoTen) return err('matTranCanBo.import.errorHoTenEmpty');

  const ngaySinh = parseImportNgay(raw.ngay_sinh);
  if (!ngaySinh) return err('matTranCanBo.import.errorNgaySinh');
  const ngayThamGia = parseImportNgay(raw.ngay_tham_gia_to_chuc);
  if (!ngayThamGia) return err('matTranCanBo.import.errorNgayThamGia');
  const ngayNhapTT = parseImportNgay(raw.ngay_nhap_trang_thai);
  if (!ngayNhapTT) return err('matTranCanBo.import.errorNgayNhapTT');
  const ngayVaoDangRaw = trimCell(raw.ngay_vao_dang);
  const ngayVaoDang = parseImportNgay(raw.ngay_vao_dang);
  if (ngayVaoDangRaw && !ngayVaoDang) return err('matTranCanBo.import.errorNgayVaoDang');

  const gioiTinh = trimCell(raw.gioi_tinh) ? matchEnumCell(MTTQ_CAN_BO_GIOI_TINH, raw.gioi_tinh) : 'Nam';
  if (!gioiTinh) return err('matTranCanBo.validation.gioiTinhRequired');

  const parsed = ctx.schema.safeParse({
    id_phong_ban: pb.id,
    to_chuc_ids: toChuc.ids,
    ho_ten: hoTen,
    ngay_sinh: ngaySinh,
    gioi_tinh: gioiTinh,
    dan_toc_id: danToc.id,
    ton_giao: parseImportTonGiao(raw.ton_giao),
    dia_chi: trimCell(raw.dia_chi),
    dang_vien: parseImportDangVien(raw.dang_vien),
    trinh_do_id: trinhDo.id,
    ly_luan_chinh_tri_id: lyLuan.id,
    dien_thoai: trimCell(raw.dien_thoai),
    chuc_vu_id: cv.id,
    cap_quan_ly: capQuanLy,
    don_vi_id: donViId,
    ngay_tham_gia_to_chuc: ngayThamGia,
    trang_thai_id: trangThai.id,
    ngay_nhap_trang_thai: ngayNhapTT,
    van_hoa: trimCell(raw.van_hoa),
    ngay_vao_dang: ngayVaoDang ?? '',
    que_quan: trimCell(raw.que_quan),
    noi_o_hien_nay: trimCell(raw.noi_o_hien_nay),
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return { ok: true, data: { rowNum, raw, idKey: trimCell(raw.id) || null, values: parsed.data } };
}
