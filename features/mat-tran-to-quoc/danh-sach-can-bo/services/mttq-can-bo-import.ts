import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import type { Position } from '@/features/he-thong/chuc-vu/core/types';
import { getPositions } from '@/features/he-thong/chuc-vu/services/chuc-vu-service';
import type { Department } from '@/features/he-thong/phong-ban/core/types';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import type { MttqThietLapLoai } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/core/types';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { MTTQ_CAN_BO_GIOI_TINH, type MttqCanBoGioiTinh } from '../core/constants';
import { normalizeCapQuanLyInput, type CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { buildMttqCanBoSchema, type MttqCanBoFormValues } from '../core/schema';
import { chucVuBelongsToRootPhongBan } from '../utils/chuc-vu-options-for-phong-ban';
import { parseImportTonGiao } from '../utils/ton-giao-form';
import { formToPayload } from './mttq-can-bo-service';

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

function trimCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (Number.isInteger(v) && Math.abs(v) > 1e12) {
      return String(BigInt(v));
    }
    return String(v).trim();
  }
  return String(v).trim();
}

/** ISO yyyy-mm-dd, dd/mm/yyyy, hoặc số serial Excel (ngày). */
function parseImportDateOnly(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 200 && raw < 2_000_000) {
      const ms = EXCEL_EPOCH_MS + Math.floor(raw) * 86_400_000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    const yyyy = m[3];
    const iso = `${yyyy}-${mm}-${dd}`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  return null;
}

function parseImportDangVien(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (['có', 'co', 'yes', 'true', '1', 'x'].includes(s)) return true;
  return false;
}

function parseImportGioiTinh(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return 'Nam';
  const exact = MTTQ_CAN_BO_GIOI_TINH.find((g) => g === s);
  if (exact) return exact;
  const ci = MTTQ_CAN_BO_GIOI_TINH.find((g) => g.toLowerCase() === s.toLowerCase());
  return ci ?? s;
}

/** « Tỉnh », « Xã phường » — phân tách bằng dấu phẩy/chấm phẩy. Để trống = không gán. */
function parseImportCapQuanLy(
  raw: unknown,
): { ok: true; values: CapQuanLy[] } | { ok: false; errorKey: string } {
  const s = trimCell(raw);
  if (!s) return { ok: true, values: [] };
  const parts = s.split(/[,;|/]+/).map((p) => p.trim()).filter(Boolean);
  const values: CapQuanLy[] = [];
  for (const part of parts) {
    const norm = normalizeCapQuanLyInput(part);
    if (!norm) return { ok: false, errorKey: 'matTranCanBo.import.errorCapQuanLyInvalid' };
    if (!values.includes(norm)) values.push(norm);
  }
  return { ok: true, values };
}

function resolveThietLapId(
  raw: unknown,
  items: { id: string; ten: string }[],
): { id: string } | { errorKey: string } {
  const s = trimCell(raw);
  if (!s) return { errorKey: 'matTranCanBo.import.errorThietLapEmpty' };
  const byId = items.find((x) => String(x.id) === s);
  if (byId) return { id: byId.id };
  const key = s.toLowerCase();
  const byTen = items.find((x) => x.ten.trim().toLowerCase() === key);
  if (byTen) return { id: byTen.id };
  return { errorKey: 'matTranCanBo.import.errorThietLapResolve' };
}

/** Một hoặc nhiều tổ chức — phân tách bằng dấu phẩy/chấm phẩy (id hoặc tên). */
function resolveThietLapIds(
  raw: unknown,
  items: { id: string; ten: string }[],
): { ok: true; ids: string[] } | { ok: false; errorKey: string } {
  const s = trimCell(raw);
  if (!s) return { ok: false, errorKey: 'matTranCanBo.import.errorThietLapEmpty' };
  const parts = s.split(/[,;|/]+/).map((p) => p.trim()).filter(Boolean);
  const ids: string[] = [];
  for (const part of parts) {
    const resolved = resolveThietLapId(part, items);
    if ('errorKey' in resolved) return { ok: false, errorKey: resolved.errorKey };
    if (!ids.includes(resolved.id)) ids.push(resolved.id);
  }
  if (ids.length === 0) return { ok: false, errorKey: 'matTranCanBo.import.errorThietLapEmpty' };
  return { ok: true, ids };
}

function resolveDepartmentId(
  raw: unknown,
  depts: { id: string; ten_phong_ban: string }[],
): { id: string } | { errorKey: string } {
  const s = trimCell(raw);
  if (!s) return { errorKey: 'matTranCanBo.import.errorPhongBanEmpty' };
  const byId = depts.find((d) => String(d.id) === s);
  if (byId) return { id: byId.id };
  const key = s.toLowerCase();
  const byTen = depts.find((d) => d.ten_phong_ban.trim().toLowerCase() === key);
  if (byTen) return { id: byTen.id };
  return { errorKey: 'matTranCanBo.import.errorPhongBanResolve' };
}

function resolveChucVuId(
  raw: unknown,
  positions: { id: string; ten_chuc_vu: string }[],
): { id: string } | { errorKey: string } {
  const s = trimCell(raw);
  if (!s) return { errorKey: 'matTranCanBo.import.errorChucVuEmpty' };
  const byId = positions.find((p) => String(p.id) === s);
  if (byId) return { id: byId.id };
  const key = s.toLowerCase();
  const byTen = positions.find((p) => p.ten_chuc_vu.trim().toLowerCase() === key);
  if (byTen) return { id: byTen.id };
  return { errorKey: 'matTranCanBo.import.errorChucVuResolve' };
}

function resolveDonVi(
  raw: unknown,
  xa: { id: string; ten: string }[],
): { id: string } | { errorKey: string } {
  const s = trimCell(raw);
  if (!s) return { id: '' };
  const byId = xa.find((x) => String(x.id) === s);
  if (byId) return { id: byId.id };
  const key = s.toLowerCase();
  const byTen = xa.find((x) => x.ten.trim().toLowerCase() === key);
  if (byTen) return { id: byTen.id };
  return { errorKey: 'matTranCanBo.import.errorDonViResolve' };
}

function thietByLoai(
  all: { id: string; loai: MttqThietLapLoai; ten: string }[],
  loai: MttqThietLapLoai,
): { id: string; ten: string }[] {
  return all.filter((x) => x.loai === loai).map((x) => ({ id: x.id, ten: x.ten }));
}

function rowToFormValues(
  row: Record<string, unknown>,
  ctx: {
    positions: Pick<Position, 'id' | 'ten_chuc_vu' | 'phong_ban_id' | 'trang_thai'>[];
    departments: Pick<Department, 'id' | 'ten_phong_ban' | 'cha_id' | 'trang_thai'>[];
    toChuc: { id: string; ten: string }[];
    danToc: { id: string; ten: string }[];
    trinhDo: { id: string; ten: string }[];
    lyLuan: { id: string; ten: string }[];
    trangThai: { id: string; ten: string }[];
    xa: { id: string; ten: string }[];
  },
): { ok: true; data: MttqCanBoFormValues } | { ok: false; errorKey: string } {
  const pb = resolveDepartmentId(row.id_phong_ban, ctx.departments);
  if ('errorKey' in pb) return { ok: false, errorKey: pb.errorKey };

  const toChucRaw = row.to_chuc_ids ?? row.to_chuc_id;
  const toChucResolved = resolveThietLapIds(toChucRaw, ctx.toChuc);
  if (!toChucResolved.ok) return { ok: false, errorKey: toChucResolved.errorKey };

  const danToc = resolveThietLapId(row.dan_toc_id, ctx.danToc);
  if ('errorKey' in danToc) return { ok: false, errorKey: danToc.errorKey };

  const trinhDo = resolveThietLapId(row.trinh_do_id, ctx.trinhDo);
  if ('errorKey' in trinhDo) return { ok: false, errorKey: trinhDo.errorKey };

  const lyLuan = resolveThietLapId(row.ly_luan_chinh_tri_id, ctx.lyLuan);
  if ('errorKey' in lyLuan) return { ok: false, errorKey: lyLuan.errorKey };

  const tt = resolveThietLapId(row.trang_thai_id, ctx.trangThai);
  if ('errorKey' in tt) return { ok: false, errorKey: tt.errorKey };

  const cv = resolveChucVuId(row.chuc_vu_id, ctx.positions);
  if ('errorKey' in cv) return { ok: false, errorKey: cv.errorKey };
  if (!chucVuBelongsToRootPhongBan(cv.id, pb.id, ctx.positions, ctx.departments)) {
    return { ok: false, errorKey: 'matTranCanBo.import.errorChucVuPhongBanMismatch' };
  }

  const donVi = resolveDonVi(row.don_vi_id, ctx.xa);
  if ('errorKey' in donVi) return { ok: false, errorKey: donVi.errorKey };

  const capQuanLy = parseImportCapQuanLy(row.cap_quan_ly);
  if (!capQuanLy.ok) return { ok: false, errorKey: capQuanLy.errorKey };

  const hoTen = trimCell(row.ho_ten);
  if (!hoTen) return { ok: false, errorKey: 'matTranCanBo.import.errorHoTenEmpty' };

  const ngaySinh = parseImportDateOnly(row.ngay_sinh);
  if (!ngaySinh) return { ok: false, errorKey: 'matTranCanBo.import.errorNgaySinh' };

  const ngayThamGia = parseImportDateOnly(row.ngay_tham_gia_to_chuc);
  if (!ngayThamGia) return { ok: false, errorKey: 'matTranCanBo.import.errorNgayThamGia' };

  const ngayNhapTT = parseImportDateOnly(row.ngay_nhap_trang_thai);
  if (!ngayNhapTT) return { ok: false, errorKey: 'matTranCanBo.import.errorNgayNhapTT' };

  const ngayVaoDang = parseImportDateOnly(row.ngay_vao_dang);

  const data: MttqCanBoFormValues = {
    id_phong_ban: pb.id,
    to_chuc_ids: toChucResolved.ids,
    ho_ten: hoTen,
    ngay_sinh: ngaySinh,
    gioi_tinh: parseImportGioiTinh(row.gioi_tinh) as MttqCanBoGioiTinh,
    dan_toc_id: danToc.id,
    ton_giao: parseImportTonGiao(row.ton_giao),
    dia_chi: trimCell(row.dia_chi),
    dang_vien: parseImportDangVien(row.dang_vien),
    trinh_do_id: trinhDo.id,
    ly_luan_chinh_tri_id: lyLuan.id,
    dien_thoai: trimCell(row.dien_thoai),
    chuc_vu_id: cv.id,
    cap_quan_ly: capQuanLy.values,
    don_vi_id: donVi.id,
    ngay_tham_gia_to_chuc: ngayThamGia,
    trang_thai_id: tt.id,
    ngay_nhap_trang_thai: ngayNhapTT,
    van_hoa: trimCell(row.van_hoa),
    ngay_vao_dang: ngayVaoDang ?? '',
    que_quan: trimCell(row.que_quan),
    noi_o_hien_nay: trimCell(row.noi_o_hien_nay),
  };
  return { ok: true, data };
}

export async function importMttqCanBoRows(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const trimmedCreator = idNguoiTao.trim();
  if (!trimmedCreator) {
    throw new Error(txt('matTranCanBo.service.noEmployeeProfile'));
  }

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const validPayloads: Record<string, unknown>[] = [];

  const [positions, departments, thietLapAll, xaList] = await Promise.all([
    getPositions(),
    getDepartments(),
    getMttqThietLapAll(),
    getXaPhuongAll(),
  ]);

  const toChuc = thietByLoai(thietLapAll, 'to_chuc');
  const danToc = thietByLoai(thietLapAll, 'dan_toc');
  const trinhDo = thietByLoai(thietLapAll, 'trinh_do');
  const lyLuan = thietByLoai(thietLapAll, 'ly_luan_chinh_tri');
  const trangThai = thietByLoai(thietLapAll, 'trang_thai');

  const posForSchema = positions.map((p) => ({
    id: String(p.id),
    phong_ban_id: p.phong_ban_id ?? null,
  }));
  const deptForSchema = departments.map((d) => ({
    id: String(d.id),
    cha_id: d.cha_id == null ? null : String(d.cha_id),
    trang_thai: d.trang_thai,
  }));

  const schema = buildMttqCanBoSchema(posForSchema, undefined, deptForSchema);

  const ctx = {
    positions,
    departments,
    toChuc,
    danToc,
    trinhDo,
    lyLuan,
    trangThai,
    xa: xaList,
  };

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNumRaw = raw[IMPORT_ROW_NUM_KEY];
    const rowNum =
      typeof rowNumRaw === 'number' && rowNumRaw > 0
        ? rowNumRaw
        : Number.isFinite(Number(rowNumRaw)) && Number(rowNumRaw) > 0
          ? Number(rowNumRaw)
          : i + 2;
    const rowData = { ...raw };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const mapped = rowToFormValues(rowData, ctx);
    if (!mapped.ok) {
      const msg = txt('matTranCanBo.import.rowPrefix', { row: String(rowNum) }) + txt(mapped.errorKey);
      errors.push(msg);
      errorRows.push({ rowNum, data: rowData, message: msg });
      continue;
    }
    const parsed = schema.safeParse(mapped.data);
    if (!parsed.success) {
      const msg =
        txt('matTranCanBo.import.rowPrefix', { row: String(rowNum) }) +
        (parsed.error.flatten().formErrors[0] ??
          parsed.error.issues[0]?.message ??
          parsed.error.message);
      errors.push(msg);
      errorRows.push({ rowNum, data: rowData, message: msg });
      continue;
    }
    validPayloads.push(formToPayload(parsed.data, trimmedCreator));
  }

  if (validPayloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('matTranCanBo.service.notFound'));
    const { error } = await supabase.from('mttq_can_bo').insert(validPayloads);
    if (error) handleSupabaseError(error);
  }

  return { created: validPayloads.length, errors, errorRows };
}
