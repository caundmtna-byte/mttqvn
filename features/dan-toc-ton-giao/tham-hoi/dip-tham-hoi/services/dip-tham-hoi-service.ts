import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import type { DipThamHoiFormValues } from '../core/schema';
import { dipThamHoiSchema } from '../core/schema';
import type { DipThamHoi, DipThamHoiOption } from '../core/types';
import type { TrangThaiDipThamHoi } from '../core/constants';
import { TRANG_THAI_DEFAULT } from '../core/constants';
import {
  DTTG_DIP_THAM_HOI_SELECT_TABLE,
  DTTG_DIP_THAM_HOI_SELECT_TABLE_PLAIN,
  DTTG_DIP_THAM_HOI_SELECT_VIEW_PLAIN,
  DTTG_DIP_THAM_HOI_TABLE,
  DTTG_DIP_THAM_HOI_VIEW,
} from '../core/supabase-select';
import { DTTG_DIP_THAM_HOI_MOCK } from '../mock-data';

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function toInt(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : fallback;
}

export function flattenDipThamHoiRow(row: Record<string, unknown>): DipThamHoi {
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_to_chuc);
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.don_vi_to_chuc;
  delete rest.phong_ban;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  const soToChucDuKien = toInt(r.so_luong_to_chuc_du_kien);
  const soCaNhanDuKien = toInt(r.so_luong_ca_nhan_du_kien);
  const soDuKienTong =
    r.so_luong_du_kien_tong != null
      ? toInt(r.so_luong_du_kien_tong)
      : soToChucDuKien + soCaNhanDuKien;
  const soHoanThanhTc = toInt(r.so_hoan_thanh_to_chuc);
  const soHoanThanhCn = toInt(r.so_hoan_thanh_ca_nhan);
  const soThucTeTong =
    r.so_luong_thuc_te_tong != null
      ? toInt(r.so_luong_thuc_te_tong)
      : soHoanThanhTc + soHoanThanhCn;

  return {
    id: String(r.id ?? ''),
    ten_dip: String(r.ten_dip ?? ''),
    mo_ta: nullableStr(r.mo_ta),
    thoi_gian_du_kien: nullableStr(r.thoi_gian_du_kien),
    thoi_gian_thuc_te: nullableStr(r.thoi_gian_thuc_te),
    don_vi_to_chuc_id:
      r.don_vi_to_chuc_id == null || r.don_vi_to_chuc_id === '' ? null : String(r.don_vi_to_chuc_id),
    ten_don_vi_to_chuc: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    phong_ban_tham_muu_id:
      r.phong_ban_tham_muu_id == null || r.phong_ban_tham_muu_id === ''
        ? null
        : String(r.phong_ban_tham_muu_id),
    ten_phong_ban:
      pb?.ten_phong_ban != null && String(pb.ten_phong_ban).trim() !== ''
        ? String(pb.ten_phong_ban)
        : null,
    so_luong_to_chuc_du_kien: soToChucDuKien,
    so_luong_ca_nhan_du_kien: soCaNhanDuKien,
    so_luong_du_kien_tong: soDuKienTong,
    so_thuc_hien_to_chuc: toInt(r.so_thuc_hien_to_chuc),
    so_thuc_hien_ca_nhan: toInt(r.so_thuc_hien_ca_nhan),
    so_hoan_thanh_to_chuc: soHoanThanhTc,
    so_hoan_thanh_ca_nhan: soHoanThanhCn,
    so_luong_thuc_te_tong: soThucTeTong,
    trang_thai: String(r.trang_thai ?? TRANG_THAI_DEFAULT) as TrangThaiDipThamHoi,
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

let mockRows = structuredClone(DTTG_DIP_THAM_HOI_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function formToPayload(data: DipThamHoiFormValues): Record<string, unknown> {
  return {
    ten_dip: data.ten_dip,
    mo_ta: data.mo_ta ?? null,
    thoi_gian_du_kien: data.thoi_gian_du_kien ?? null,
    thoi_gian_thuc_te: data.thoi_gian_thuc_te ?? null,
    don_vi_to_chuc_id:
      data.don_vi_to_chuc_id != null && data.don_vi_to_chuc_id !== ''
        ? Number(data.don_vi_to_chuc_id)
        : null,
    phong_ban_tham_muu_id:
      data.phong_ban_tham_muu_id != null && data.phong_ban_tham_muu_id !== ''
        ? Number(data.phong_ban_tham_muu_id)
        : null,
    so_luong_to_chuc_du_kien: data.so_luong_to_chuc_du_kien,
    so_luong_ca_nhan_du_kien: data.so_luong_ca_nhan_du_kien,
    trang_thai: data.trang_thai,
    ghi_chu: data.ghi_chu ?? null,
  };
}

async function resolveXaPhuongTenById(id: string | null | undefined): Promise<string | null> {
  if (id == null || id === '') return null;
  const all = await getXaPhuongAll();
  return all.find((x) => x.id === id)?.ten ?? null;
}

async function mockRowFromForm(
  data: DipThamHoiFormValues,
  base: Partial<DipThamHoi> = {},
): Promise<DipThamHoi> {
  const tenDonVi = await resolveXaPhuongTenById(data.don_vi_to_chuc_id);
  const pbList = await getDepartments();
  const pb = data.phong_ban_tham_muu_id
    ? pbList.find((p) => p.id === data.phong_ban_tham_muu_id)
    : undefined;
  const soToChuc = data.so_luong_to_chuc_du_kien;
  const soCaNhan = data.so_luong_ca_nhan_du_kien;
  return {
    id: base.id ?? mockNextId(),
    ten_dip: data.ten_dip,
    mo_ta: data.mo_ta ?? null,
    thoi_gian_du_kien: data.thoi_gian_du_kien ?? null,
    thoi_gian_thuc_te: data.thoi_gian_thuc_te ?? null,
    don_vi_to_chuc_id: data.don_vi_to_chuc_id ?? null,
    ten_don_vi_to_chuc: tenDonVi,
    phong_ban_tham_muu_id: data.phong_ban_tham_muu_id ?? null,
    ten_phong_ban: pb?.ten_phong_ban ?? base.ten_phong_ban ?? null,
    so_luong_to_chuc_du_kien: soToChuc,
    so_luong_ca_nhan_du_kien: soCaNhan,
    so_luong_du_kien_tong: soToChuc + soCaNhan,
    so_thuc_hien_to_chuc: base.so_thuc_hien_to_chuc ?? 0,
    so_thuc_hien_ca_nhan: base.so_thuc_hien_ca_nhan ?? 0,
    so_hoan_thanh_to_chuc: base.so_hoan_thanh_to_chuc ?? 0,
    so_hoan_thanh_ca_nhan: base.so_hoan_thanh_ca_nhan ?? 0,
    so_luong_thuc_te_tong: base.so_luong_thuc_te_tong ?? 0,
    trang_thai: data.trang_thai,
    ghi_chu: data.ghi_chu ?? null,
    id_nguoi_tao: base.id_nguoi_tao ?? '',
    tg_tao: base.tg_tao ?? new Date().toISOString(),
    tg_cap_nhat: base.tg_cap_nhat ?? new Date().toISOString(),
    ho_va_ten_nguoi_tao: base.ho_va_ten_nguoi_tao ?? 'Mock',
  };
}

function isSchemaFallbackError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  const code = String(e.code ?? '');
  const msg = String(e.message ?? '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code.startsWith('PGRST') ||
    msg.includes('does not exist') ||
    msg.includes('could not find') ||
    msg.includes('relationship') ||
    msg.includes('schema cache') ||
    msg.includes('column')
  );
}

type DipQueryTier = { from: string; select: string };

const DIP_QUERY_TIERS: DipQueryTier[] = [
  { from: DTTG_DIP_THAM_HOI_TABLE, select: DTTG_DIP_THAM_HOI_SELECT_TABLE_PLAIN },
  { from: DTTG_DIP_THAM_HOI_TABLE, select: DTTG_DIP_THAM_HOI_SELECT_TABLE },
  { from: DTTG_DIP_THAM_HOI_VIEW, select: DTTG_DIP_THAM_HOI_SELECT_VIEW_PLAIN },
];

async function enrichDipRows(rows: DipThamHoi[]): Promise<DipThamHoi[]> {
  if (rows.length === 0) return rows;

  const needsDonVi = rows.some((r) => r.don_vi_to_chuc_id && !r.ten_don_vi_to_chuc);
  const needsPhongBan = rows.some((r) => r.phong_ban_tham_muu_id && !r.ten_phong_ban);
  const needsNguoiTao = rows.some((r) => r.id_nguoi_tao && !r.ho_va_ten_nguoi_tao);

  const [xaList, pbList, nvMap] = await Promise.all([
    needsDonVi ? getXaPhuongAll() : Promise.resolve([]),
    needsPhongBan ? getDepartments() : Promise.resolve([]),
    needsNguoiTao ? fetchNhanVienNameMap(rows.map((r) => r.id_nguoi_tao).filter(Boolean)) : Promise.resolve(new Map<string, string>()),
  ]);

  const xaMap = new Map(xaList.map((x) => [String(x.id), x.ten]));
  const pbMap = new Map(pbList.map((p) => [String(p.id), p.ten_phong_ban]));

  return rows.map((row) => ({
    ...row,
    ten_don_vi_to_chuc:
      row.ten_don_vi_to_chuc ??
      (row.don_vi_to_chuc_id ? xaMap.get(row.don_vi_to_chuc_id) ?? null : null),
    ten_phong_ban:
      row.ten_phong_ban ??
      (row.phong_ban_tham_muu_id ? pbMap.get(row.phong_ban_tham_muu_id) ?? null : null),
    ho_va_ten_nguoi_tao:
      row.ho_va_ten_nguoi_tao ?? (row.id_nguoi_tao ? nvMap.get(row.id_nguoi_tao) ?? null : null),
  }));
}

async function fetchNhanVienNameMap(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = getSupabase();
  if (!supabase) return map;

  const numericIds = unique.map(Number).filter((n) => Number.isFinite(n));
  if (numericIds.length === 0) return map;

  const { data, error } = await supabase
    .from('var_nhan_vien')
    .select('id,ho_va_ten,ten_tai_khoan')
    .in('id', numericIds);
  if (error || !data) return map;

  for (const row of data as { id: number; ho_va_ten?: string | null; ten_tai_khoan?: string | null }[]) {
    const name = row.ho_va_ten?.trim() || row.ten_tai_khoan?.trim();
    if (name) map.set(String(row.id), name);
  }
  return map;
}

async function fetchDipRowsFromTier(
  tier: DipQueryTier,
  id?: string,
): Promise<{ data: Record<string, unknown>[] | null; error: unknown }> {
  const supabase = getSupabase();
  if (!supabase) return { data: null, error: new Error('No supabase client') };

  if (id != null && id !== '') {
    const { data, error } = await supabase
      .from(tier.from)
      .select(tier.select)
      .eq('id', id)
      .maybeSingle();
    if (error) return { data: null, error };
    return { data: data ? [data as unknown as Record<string, unknown>] : [], error: null };
  }

  const { data, error } = await supabase
    .from(tier.from)
    .select(tier.select)
    .order('tg_cap_nhat', { ascending: false });
  if (error) return { data: null, error };
  return { data: (data ?? []) as unknown as Record<string, unknown>[], error: null };
}

async function fetchDipRowsResilient(id?: string): Promise<DipThamHoi[]> {
  let lastError: unknown = null;
  for (const tier of DIP_QUERY_TIERS) {
    const { data, error } = await fetchDipRowsFromTier(tier, id);
    if (!error && data != null && data.length > 0) {
      const rows = data.map((row) => flattenDipThamHoiRow(row));
      return enrichDipRows(rows);
    }
    if (error && !isSchemaFallbackError(error)) {
      handleSupabaseError(error);
    }
    lastError = error;
  }
  if (lastError) handleSupabaseError(lastError);
  return [];
}

async function fetchViewRowById(id: string): Promise<DipThamHoi | null> {
  const rows = await fetchDipRowsResilient(id);
  return rows[0] ?? null;
}

export async function getDipThamHoiList(): Promise<DipThamHoi[]> {
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => b.tg_cap_nhat.localeCompare(a.tg_cap_nhat));
  }
  return fetchDipRowsResilient();
}

export async function getDipThamHoiOptions(): Promise<DipThamHoiOption[]> {
  const list = await getDipThamHoiList();
  return list.map((r) => ({
    id: r.id,
    ten_dip: r.ten_dip,
    phong_ban_tham_muu_id: r.phong_ban_tham_muu_id,
    thoi_gian_du_kien: r.thoi_gian_du_kien,
    thoi_gian_thuc_te: r.thoi_gian_thuc_te,
  }));
}

export async function getDipThamHoiById(id: string): Promise<DipThamHoi | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
  return fetchViewRowById(id);
}

export async function getDipTenById(id: string): Promise<string | null> {
  const row = await getDipThamHoiById(id);
  return row?.ten_dip ?? null;
}

export async function createDipThamHoi(
  data: DipThamHoiFormValues,
  idNguoiTao: string,
): Promise<DipThamHoi> {
  const parsed = dipThamHoiSchema.parse(data);
  if (!isSupabase()) {
    const created = await mockRowFromForm(parsed, { id_nguoi_tao: idNguoiTao });
    mockRows = [created, ...mockRows];
    return created;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('danTocDipThamHoi.service.notFound'));
  const payload = { ...formToPayload(parsed), id_nguoi_tao: Number(idNguoiTao) };
  const { data: inserted, error } = await supabase
    .from(DTTG_DIP_THAM_HOI_TABLE)
    .insert(payload)
    .select('id')
    .single();
  if (error) handleSupabaseError(error);
  const full = await fetchViewRowById(String(inserted.id));
  if (!full) throw new Error(txt('danTocDipThamHoi.service.notFound'));
  return full;
}

export async function updateDipThamHoi(id: string, data: DipThamHoiFormValues): Promise<DipThamHoi> {
  const parsed = dipThamHoiSchema.parse(data);
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(txt('danTocDipThamHoi.service.notFound'));
    const updated = await mockRowFromForm(parsed, { ...mockRows[idx], id });
    mockRows[idx] = updated;
    return updated;
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('danTocDipThamHoi.service.notFound'));
  const { error } = await supabase.from(DTTG_DIP_THAM_HOI_TABLE).update(formToPayload(parsed)).eq('id', id);
  if (error) handleSupabaseError(error);
  const full = await fetchViewRowById(id);
  if (!full) throw new Error(txt('danTocDipThamHoi.service.notFound'));
  return full;
}

export async function updateDipThamHoiTrangThai(
  id: string,
  trangThai: TrangThaiDipThamHoi,
): Promise<DipThamHoi> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(txt('danTocDipThamHoi.service.notFound'));
    mockRows[idx] = { ...mockRows[idx], trang_thai: trangThai, tg_cap_nhat: new Date().toISOString() };
    return mockRows[idx];
  }
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('danTocDipThamHoi.service.notFound'));
  const { error } = await supabase.from(DTTG_DIP_THAM_HOI_TABLE).update({ trang_thai: trangThai }).eq('id', id);
  if (error) handleSupabaseError(error);
  const full = await fetchViewRowById(id);
  if (!full) throw new Error(txt('danTocDipThamHoi.service.notFound'));
  return full;
}

export async function deleteDipThamHoiMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    mockRows = mockRows.filter((r) => !ids.includes(r.id));
    return;
  }
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from(DTTG_DIP_THAM_HOI_TABLE).delete().in('id', ids.map(Number));
  if (error) handleSupabaseError(error);
}
