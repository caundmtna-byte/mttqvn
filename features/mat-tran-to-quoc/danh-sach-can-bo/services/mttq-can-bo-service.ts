import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { txt } from '@/lib/text';
import type { MttqCanBo } from '../core/types';
import type { MttqCanBoFormValues } from '../core/schema';
import {
  MTTQ_CAN_BO_RETURNING_FULL,
  MTTQ_CAN_BO_SELECT_FULL,
  MTTQ_CAN_BO_SELECT_LIST,
  MTTQ_CAN_BO_SELECT_STATS,
} from '../core/supabase-select';
import { MTTQ_CAN_BO_MOCK_DATA } from '../mock-data';

const repoFull = createRepository<MttqCanBo>({
  tableName: 'mttq_can_bo',
  select: MTTQ_CAN_BO_SELECT_FULL,
  delay: 400,
  mockData: MTTQ_CAN_BO_MOCK_DATA,
});

/** Chỉ dùng khi Supabase; mock giữ một repo (FULL) để getAll/mutation dùng chung bộ nhớ. */
const repoList = isSupabase()
  ? createRepository<MttqCanBo>({
      tableName: 'mttq_can_bo',
      select: MTTQ_CAN_BO_SELECT_LIST,
      delay: 400,
      mockData: MTTQ_CAN_BO_MOCK_DATA,
    })
  : repoFull;

const repoStats = isSupabase()
  ? createRepository<MttqCanBo>({
      tableName: 'mttq_can_bo',
      select: MTTQ_CAN_BO_SELECT_STATS,
      delay: 400,
      mockData: MTTQ_CAN_BO_MOCK_DATA,
    })
  : repoFull;

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function dateOnly(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
  return s || null;
}

function nullableId(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function tenFromThietLap(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown }>(v);
  const t = o?.ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

/** Embed `var_chuc_vu` qua FK `chuc_vu_id` — cột hiển thị `ten_chuc_vu`. */
function tenFromVarChucVuEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten_chuc_vu?: unknown; ten?: unknown }>(v);
  const t = o?.ten_chuc_vu ?? o?.ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

function capQuanLyRawFromChucVuEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ cap_quan_ly?: unknown }>(v);
  const c = o?.cap_quan_ly;
  if (c == null || c === '') return null;
  return String(c);
}

/** Tên phòng ban / bộ phận từ embed một tầng + map `id → ten_phong_ban` (danh sách phòng ban). */
function labelsFromPhongBanEmbed(
  v: unknown,
  deptTenById?: ReadonlyMap<string, string>,
): { ten_phong_ban: string | null; ten_bo_phan: string | null } {
  const o = pickEmbedded<{ ten_phong_ban?: unknown; cha_id?: unknown }>(v);
  if (!o) return { ten_phong_ban: null, ten_bo_phan: null };
  const selfTen =
    o.ten_phong_ban != null && String(o.ten_phong_ban).trim() !== ''
      ? String(o.ten_phong_ban).trim()
      : null;
  const chaId = o.cha_id == null || o.cha_id === '' ? null : String(o.cha_id);
  if (!selfTen && !chaId) return { ten_phong_ban: null, ten_bo_phan: null };
  if (!chaId) {
    return { ten_phong_ban: selfTen, ten_bo_phan: null };
  }
  const parentTen = deptTenById?.get(chaId) ?? null;
  return { ten_phong_ban: parentTen, ten_bo_phan: selfTen };
}

async function departmentTenByIdMap(): Promise<Map<string, string>> {
  const depts = await getDepartments();
  return new Map(depts.map((d) => [String(d.id), d.ten_phong_ban]));
}

/** Nhãn đơn vị (xã — tỉnh) từ embed `var_ssn_xa_phuong`. */
function tenDonViFromXaEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown; var_ssn_tinh_thanh?: unknown }>(v);
  if (!o) return null;
  const xa = o.ten;
  const tinhO = pickEmbedded<{ ten?: unknown }>(o.var_ssn_tinh_thanh);
  const tinh = tinhO?.ten;
  const xs = xa != null && String(xa).trim() !== '' ? String(xa).trim() : '';
  const ts = tinh != null && String(tinh).trim() !== '' ? String(tinh).trim() : '';
  if (!xs && !ts) return null;
  if (xs && ts) return `${xs} – ${ts}`;
  return xs || ts || null;
}

export function flattenMttqCanBoRow(
  row: Record<string, unknown>,
  deptTenById?: ReadonlyMap<string, string>,
): MttqCanBo {
  const toChuc = row.to_chuc_ref;
  const danToc = row.dan_toc;
  const trinhDo = row.trinh_do;
  const lyLuan = row.ly_luan_chinh_tri;
  const chucVu = row.chuc_vu;
  const donVi = row.don_vi;
  const phongBan = row.phong_ban;
  const trangThai = row.trang_thai;
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);

  const rest = { ...row };
  delete rest.to_chuc_ref;
  delete rest.dan_toc;
  delete rest.trinh_do;
  delete rest.ly_luan_chinh_tri;
  delete rest.chuc_vu;
  delete rest.don_vi;
  delete rest.phong_ban;
  delete rest.trang_thai;
  delete rest.nguoi_tao;

  const r = rest as Record<string, unknown>;
  const dv = r.dang_vien;
  const dangVien = dv === true || dv === 'true' || dv === 1 || dv === '1';

  return {
    ...r,
    id: String(r.id),
    to_chuc_id: nullableId(r.to_chuc_id),
    ho_ten: String(r.ho_ten ?? ''),
    ngay_sinh: dateOnly(r.ngay_sinh),
    gioi_tinh: String(r.gioi_tinh ?? 'Nam'),
    dan_toc_id: nullableId(r.dan_toc_id),
    ton_giao: r.ton_giao == null || r.ton_giao === '' ? null : String(r.ton_giao),
    dia_chi: r.dia_chi == null || r.dia_chi === '' ? null : String(r.dia_chi),
    dang_vien: dangVien,
    trinh_do_id: nullableId(r.trinh_do_id),
    ly_luan_chinh_tri_id: nullableId(r.ly_luan_chinh_tri_id),
    dien_thoai: r.dien_thoai == null || r.dien_thoai === '' ? null : String(r.dien_thoai),
    chuc_vu_id: nullableId(r.chuc_vu_id),
    phong_ban_id: nullableId(r.phong_ban_id),
    don_vi_id: nullableId(r.don_vi_id),
    ngay_tham_gia_to_chuc: dateOnly(r.ngay_tham_gia_to_chuc),
    trang_thai_id: nullableId(r.trang_thai_id),
    ngay_nhap_trang_thai: dateOnly(r.ngay_nhap_trang_thai),
    van_hoa: r.van_hoa == null || String(r.van_hoa).trim() === '' ? null : String(r.van_hoa).trim(),
    ngay_vao_dang: dateOnly(r.ngay_vao_dang),
    que_quan: r.que_quan == null || String(r.que_quan).trim() === '' ? null : String(r.que_quan).trim(),
    noi_o_hien_nay: r.noi_o_hien_nay == null || String(r.noi_o_hien_nay).trim() === '' ? null : String(r.noi_o_hien_nay).trim(),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ten_to_chuc: tenFromThietLap(toChuc) ?? (r.ten_to_chuc != null ? String(r.ten_to_chuc) : null),
    ten_dan_toc: tenFromThietLap(danToc) ?? (r.ten_dan_toc != null ? String(r.ten_dan_toc) : null),
    ten_trinh_do: tenFromThietLap(trinhDo) ?? (r.ten_trinh_do != null ? String(r.ten_trinh_do) : null),
    ten_ly_luan_chinh_tri:
      tenFromThietLap(lyLuan) ?? (r.ten_ly_luan_chinh_tri != null ? String(r.ten_ly_luan_chinh_tri) : null),
    ten_chuc_vu: tenFromVarChucVuEmbed(chucVu) ?? (r.ten_chuc_vu != null ? String(r.ten_chuc_vu) : null),
    ...(() => {
      const pair = labelsFromPhongBanEmbed(phongBan, deptTenById);
      return {
        ten_phong_ban: pair.ten_phong_ban ?? (r.ten_phong_ban != null ? String(r.ten_phong_ban) : null),
        ten_bo_phan: pair.ten_bo_phan ?? (r.ten_bo_phan != null ? String(r.ten_bo_phan) : null),
      };
    })(),
    chuc_vu_cap_quan_ly: capQuanLyRawFromChucVuEmbed(chucVu),
    ten_don_vi: tenDonViFromXaEmbed(donVi) ?? (r.ten_don_vi != null ? String(r.ten_don_vi) : null),
    ten_trang_thai: tenFromThietLap(trangThai) ?? (r.ten_trang_thai != null ? String(r.ten_trang_thai) : null),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? (r.ho_va_ten_nguoi_tao != null ? String(r.ho_va_ten_nguoi_tao) : null),
    ten_tai_khoan_nguoi_tao:
      nv?.ten_tai_khoan ?? (r.ten_tai_khoan_nguoi_tao != null ? String(r.ten_tai_khoan_nguoi_tao) : null),
  };
}

function normalize(raw: MttqCanBo): MttqCanBo {
  return {
    ...raw,
    id: String(raw.id),
    to_chuc_id: raw.to_chuc_id != null ? String(raw.to_chuc_id) : null,
    dan_toc_id: raw.dan_toc_id != null ? String(raw.dan_toc_id) : null,
    trinh_do_id: raw.trinh_do_id != null ? String(raw.trinh_do_id) : null,
    ly_luan_chinh_tri_id: raw.ly_luan_chinh_tri_id != null ? String(raw.ly_luan_chinh_tri_id) : null,
    chuc_vu_id: raw.chuc_vu_id != null ? String(raw.chuc_vu_id) : null,
    phong_ban_id: raw.phong_ban_id != null ? String(raw.phong_ban_id) : null,
    don_vi_id: raw.don_vi_id != null ? String(raw.don_vi_id) : null,
    trang_thai_id: raw.trang_thai_id != null ? String(raw.trang_thai_id) : null,
    id_nguoi_tao: String(raw.id_nguoi_tao),
  };
}

function formToPayload(data: MttqCanBoFormValues, idNguoiTao?: string) {
  const phongBanFk = data.id_phong_ban.trim() !== '' ? data.id_phong_ban.trim() : null;
  const base = {
    to_chuc_id: data.to_chuc_id,
    ho_ten: data.ho_ten.trim(),
    ngay_sinh: data.ngay_sinh,
    gioi_tinh: data.gioi_tinh,
    dan_toc_id: data.dan_toc_id,
    ton_giao: data.ton_giao.trim(),
    dia_chi: data.dia_chi.trim(),
    dang_vien: data.dang_vien,
    trinh_do_id: data.trinh_do_id,
    ly_luan_chinh_tri_id: data.ly_luan_chinh_tri_id,
    dien_thoai: data.dien_thoai.trim(),
    chuc_vu_id: data.chuc_vu_id,
    phong_ban_id: phongBanFk,
    don_vi_id: data.don_vi_id.trim() !== '' ? data.don_vi_id.trim() : null,
    ngay_tham_gia_to_chuc: data.ngay_tham_gia_to_chuc,
    trang_thai_id: data.trang_thai_id,
    ngay_nhap_trang_thai: data.ngay_nhap_trang_thai,
    van_hoa: data.van_hoa.trim() === '' ? null : data.van_hoa.trim(),
    ngay_vao_dang: data.ngay_vao_dang.trim() === '' ? null : data.ngay_vao_dang.trim(),
    que_quan: data.que_quan.trim() === '' ? null : data.que_quan.trim(),
    noi_o_hien_nay: data.noi_o_hien_nay.trim() === '' ? null : data.noi_o_hien_nay.trim(),
  };
  if (idNguoiTao !== undefined) {
    return { ...base, id_nguoi_tao: idNguoiTao };
  }
  return base;
}

export async function getMttqCanBoList(): Promise<MttqCanBo[]> {
  const list = await repoList.getAll({ orderBy: 'ho_ten', ascending: true });
  const deptTenById = await departmentTenByIdMap();
  return list.map((row) =>
    normalize(flattenMttqCanBoRow(row as unknown as Record<string, unknown>, deptTenById)),
  );
}

/** Payload gọn cho trang báo cáo (ít cột scalar hơn LIST + embed dân tộc/trình độ). */
export async function getMttqCanBoStatsList(): Promise<MttqCanBo[]> {
  const list = await repoStats.getAll({ orderBy: 'ho_ten', ascending: true });
  const deptTenById = await departmentTenByIdMap();
  return list.map((row) =>
    normalize(flattenMttqCanBoRow(row as unknown as Record<string, unknown>, deptTenById)),
  );
}

export async function getMttqCanBoById(id: string): Promise<MttqCanBo | null> {
  const row = await repoFull.getById(id);
  if (!row) return null;
  const deptTenById = await departmentTenByIdMap();
  return normalize(flattenMttqCanBoRow(row as unknown as Record<string, unknown>, deptTenById));
}

export async function createMttqCanBo(data: MttqCanBoFormValues, idNguoiTao: string): Promise<MttqCanBo> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranCanBo.service.noEmployeeProfile'));

  const payload = formToPayload(data, trimmed);

  const inserted = await repoFull.insert(payload as unknown as Omit<MttqCanBo, 'id'>, {
    returningSelect: MTTQ_CAN_BO_RETURNING_FULL,
  });
  const deptTenById = await departmentTenByIdMap();
  return normalize(flattenMttqCanBoRow(inserted as unknown as Record<string, unknown>, deptTenById));
}

export async function updateMttqCanBo(id: string, data: MttqCanBoFormValues): Promise<MttqCanBo> {
  // Bỏ `getById` tiền-update để tiết kiệm round-trip; nếu id sai, `repo.update`
  // sẽ throw lỗi PostgREST (PGRST116 — single-row not found) và message hiện toast.
  const payload = formToPayload(data);

  const updated = await repoFull.update(id, payload as unknown as Partial<MttqCanBo>, {
    returningSelect: MTTQ_CAN_BO_RETURNING_FULL,
  });
  const deptTenById = await departmentTenByIdMap();
  return normalize(flattenMttqCanBoRow(updated as unknown as Record<string, unknown>, deptTenById));
}

export async function deleteMttqCanBoMany(ids: string[]): Promise<void> {
  await repoFull.remove(ids);
}
