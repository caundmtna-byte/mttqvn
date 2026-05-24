import { txt } from '@/lib/text';
import { getPositions } from '@/features/he-thong/chuc-vu/services/chuc-vu-service';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import type { MttqThietLapLoai } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/core/types';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { MTTQ_CAN_BO_GIOI_TINH, type MttqCanBoGioiTinh } from '../core/constants';
import { buildMttqCanBoSchema, type MttqCanBoFormValues } from '../core/schema';
import { chucVuBelongsToRootPhongBan } from '../utils/chuc-vu-options-for-phong-ban';
import { parseImportTonGiao } from '../utils/ton-giao-form';
import { createMttqCanBo } from './mttq-can-bo-service';

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

function resolveDonVi(raw: unknown, xa: { id: string; ten: string }[]): string {
  const s = trimCell(raw);
  if (!s) return '';
  const byId = xa.find((x) => String(x.id) === s);
  if (byId) return byId.id;
  const key = s.toLowerCase();
  const byTen = xa.find((x) => x.ten.trim().toLowerCase() === key);
  return byTen ? byTen.id : s;
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
    positions: { id: string; ten_chuc_vu: string; cap_quan_ly?: string | null; phong_ban_id?: string | null }[];
    departments: { id: string; ten_phong_ban: string; cha_id: string | null; trang_thai: string }[];
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

  const toChuc = resolveThietLapId(row.to_chuc_id, ctx.toChuc);
  if ('errorKey' in toChuc) return { ok: false, errorKey: toChuc.errorKey };

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
    to_chuc_id: toChuc.id,
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
    don_vi_id: resolveDonVi(row.don_vi_id, ctx.xa),
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
): Promise<{ created: number; errors: string[] }> {
  const trimmedCreator = idNguoiTao.trim();
  if (!trimmedCreator) {
    throw new Error(txt('matTranCanBo.service.noEmployeeProfile'));
  }

  const errors: string[] = [];
  let created = 0;

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
    cap_quan_ly: p.cap_quan_ly ?? null,
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
    const row = rows[i];
    const mapped = rowToFormValues(row, ctx);
    if (!mapped.ok) {
      errors.push(txt('matTranCanBo.import.rowPrefix', { row: String(i + 2) }) + txt(mapped.errorKey));
      continue;
    }
    const parsed = schema.safeParse(mapped.data);
    if (!parsed.success) {
      const msg =
        parsed.error.flatten().formErrors[0] ??
        parsed.error.issues[0]?.message ??
        parsed.error.message;
      errors.push(txt('matTranCanBo.import.rowPrefix', { row: String(i + 2) }) + msg);
      continue;
    }
    try {
      await createMttqCanBo(parsed.data, trimmedCreator);
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : txt('matTranCanBo.import.errorCreate');
      errors.push(txt('matTranCanBo.import.rowPrefix', { row: String(i + 2) }) + msg);
    }
  }

  return { created, errors };
}
