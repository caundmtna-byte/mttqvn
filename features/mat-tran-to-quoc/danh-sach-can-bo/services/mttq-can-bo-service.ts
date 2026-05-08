import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import type { MttqCanBo } from '../core/types';
import type { MttqCanBoFormValues } from '../core/schema';
import {
  MTTQ_CAN_BO_RETURNING_FULL,
  MTTQ_CAN_BO_SELECT_FULL,
  MTTQ_CAN_BO_SELECT_LIST,
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

export function flattenMttqCanBoRow(row: Record<string, unknown>): MttqCanBo {
  const cap = row.cap_quan_ly;
  const toChuc = row.to_chuc_ref;
  const danToc = row.dan_toc;
  const trinhDo = row.trinh_do;
  const lyLuan = row.ly_luan_chinh_tri;
  const chucVu = row.chuc_vu;
  const trangThai = row.trang_thai;
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);

  const rest = { ...row };
  delete rest.cap_quan_ly;
  delete rest.to_chuc_ref;
  delete rest.dan_toc;
  delete rest.trinh_do;
  delete rest.ly_luan_chinh_tri;
  delete rest.chuc_vu;
  delete rest.trang_thai;
  delete rest.nguoi_tao;

  const r = rest as Record<string, unknown>;
  const dv = r.dang_vien;
  const dangVien = dv === true || dv === 'true' || dv === 1 || dv === '1';

  return {
    ...r,
    id: String(r.id),
    cap_quan_ly_id: nullableId(r.cap_quan_ly_id),
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
    ngay_tham_gia_to_chuc: dateOnly(r.ngay_tham_gia_to_chuc),
    trang_thai_id: nullableId(r.trang_thai_id),
    ngay_nhap_trang_thai: dateOnly(r.ngay_nhap_trang_thai),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ten_cap_quan_ly: tenFromThietLap(cap) ?? (r.ten_cap_quan_ly != null ? String(r.ten_cap_quan_ly) : null),
    ten_to_chuc: tenFromThietLap(toChuc) ?? (r.ten_to_chuc != null ? String(r.ten_to_chuc) : null),
    ten_dan_toc: tenFromThietLap(danToc) ?? (r.ten_dan_toc != null ? String(r.ten_dan_toc) : null),
    ten_trinh_do: tenFromThietLap(trinhDo) ?? (r.ten_trinh_do != null ? String(r.ten_trinh_do) : null),
    ten_ly_luan_chinh_tri:
      tenFromThietLap(lyLuan) ?? (r.ten_ly_luan_chinh_tri != null ? String(r.ten_ly_luan_chinh_tri) : null),
    ten_chuc_vu: tenFromThietLap(chucVu) ?? (r.ten_chuc_vu != null ? String(r.ten_chuc_vu) : null),
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
    cap_quan_ly_id: raw.cap_quan_ly_id != null ? String(raw.cap_quan_ly_id) : null,
    to_chuc_id: raw.to_chuc_id != null ? String(raw.to_chuc_id) : null,
    dan_toc_id: raw.dan_toc_id != null ? String(raw.dan_toc_id) : null,
    trinh_do_id: raw.trinh_do_id != null ? String(raw.trinh_do_id) : null,
    ly_luan_chinh_tri_id: raw.ly_luan_chinh_tri_id != null ? String(raw.ly_luan_chinh_tri_id) : null,
    chuc_vu_id: raw.chuc_vu_id != null ? String(raw.chuc_vu_id) : null,
    trang_thai_id: raw.trang_thai_id != null ? String(raw.trang_thai_id) : null,
    id_nguoi_tao: String(raw.id_nguoi_tao),
  };
}

function formToPayload(data: MttqCanBoFormValues, idNguoiTao?: string) {
  const base = {
    cap_quan_ly_id: data.cap_quan_ly_id ?? null,
    to_chuc_id: data.to_chuc_id ?? null,
    ho_ten: data.ho_ten.trim(),
    ngay_sinh: data.ngay_sinh ?? null,
    gioi_tinh: data.gioi_tinh,
    dan_toc_id: data.dan_toc_id ?? null,
    ton_giao: data.ton_giao?.trim() ?? null,
    dia_chi: data.dia_chi?.trim() ?? null,
    dang_vien: data.dang_vien,
    trinh_do_id: data.trinh_do_id ?? null,
    ly_luan_chinh_tri_id: data.ly_luan_chinh_tri_id ?? null,
    dien_thoai: data.dien_thoai?.trim() ?? null,
    chuc_vu_id: data.chuc_vu_id ?? null,
    ngay_tham_gia_to_chuc: data.ngay_tham_gia_to_chuc ?? null,
    trang_thai_id: data.trang_thai_id ?? null,
    ngay_nhap_trang_thai: data.ngay_nhap_trang_thai ?? null,
  };
  if (idNguoiTao !== undefined) {
    return { ...base, id_nguoi_tao: idNguoiTao };
  }
  return base;
}

export async function getMttqCanBoList(): Promise<MttqCanBo[]> {
  const list = await repoList.getAll({ orderBy: 'ho_ten', ascending: true });
  return list.map((row) => normalize(flattenMttqCanBoRow(row as unknown as Record<string, unknown>)));
}

export async function getMttqCanBoById(id: string): Promise<MttqCanBo | null> {
  const row = await repoFull.getById(id);
  if (!row) return null;
  return normalize(flattenMttqCanBoRow(row as unknown as Record<string, unknown>));
}

export async function createMttqCanBo(data: MttqCanBoFormValues, idNguoiTao: string): Promise<MttqCanBo> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranCanBo.service.noEmployeeProfile'));

  const payload = formToPayload(data, trimmed);

  const inserted = await repoFull.insert(payload as unknown as Omit<MttqCanBo, 'id'>, {
    returningSelect: MTTQ_CAN_BO_RETURNING_FULL,
  });
  return normalize(flattenMttqCanBoRow(inserted as unknown as Record<string, unknown>));
}

export async function updateMttqCanBo(id: string, data: MttqCanBoFormValues): Promise<MttqCanBo> {
  // Bỏ `getById` tiền-update để tiết kiệm round-trip; nếu id sai, `repo.update`
  // sẽ throw lỗi PostgREST (PGRST116 — single-row not found) và message hiện toast.
  const payload = formToPayload(data);

  const updated = await repoFull.update(id, payload as unknown as Partial<MttqCanBo>, {
    returningSelect: MTTQ_CAN_BO_RETURNING_FULL,
  });
  return normalize(flattenMttqCanBoRow(updated as unknown as Record<string, unknown>));
}

export async function deleteMttqCanBoMany(ids: string[]): Promise<void> {
  await repoFull.remove(ids);
}
