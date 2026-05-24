import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { MttqTangLuongListRow } from '../core/types';
import type { MttqTangLuongFormValues } from '../core/schema';
import { loaiKyToSoThang } from '../core/schema';
import {
  MTTQ_TANG_LUONG_RETURNING,
  MTTQ_TANG_LUONG_SELECT_FULL,
  MTTQ_TANG_LUONG_SELECT_LIST,
} from '../core/supabase-select';
import { computeNgayDenHanGoc, getLatestRecordForCanBo } from '../utils/tang-luong-cycle';
import { MTTQ_TANG_LUONG_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_tang_luong',
  select: MTTQ_TANG_LUONG_SELECT_LIST,
  delay: 400,
  mockData: [],
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function nullableId(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function tenNgachFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown; ma?: unknown }>(v);
  if (!o) return null;
  const ten = o.ten != null ? String(o.ten) : '';
  const ma = o.ma != null && String(o.ma).trim() !== '' ? String(o.ma) : '';
  if (!ten) return null;
  return ma ? `${ten} (${ma})` : ten;
}

function maBacFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ma_bac?: unknown }>(v);
  const m = o?.ma_bac;
  return m != null && String(m).trim() !== '' ? String(m) : null;
}

function tenDonViFromXaEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown; var_ssn_tinh_thanh?: unknown }>(v);
  if (!o) return null;
  const xa = o.ten != null ? String(o.ten).trim() : '';
  const tinhO = pickEmbedded<{ ten?: unknown }>(o.var_ssn_tinh_thanh);
  const tinh = tinhO?.ten != null ? String(tinhO.ten).trim() : '';
  if (!xa && !tinh) return null;
  if (xa && tinh) return `${xa} – ${tinh}`;
  return xa || tinh || null;
}

export function flattenMttqTangLuongRow(row: Record<string, unknown>): MttqTangLuongListRow {
  const canBo = pickEmbedded<{
    ho_ten?: unknown;
    phong_ban_id?: unknown;
    don_vi_id?: unknown;
    to_chuc_id?: unknown;
    phong_ban?: unknown;
    don_vi?: unknown;
    to_chuc_ref?: unknown;
  }>(row.can_bo);
  const phongBan = pickEmbedded<{ ten_phong_ban?: unknown; cha_id?: unknown }>(canBo?.phong_ban);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);

  const rest = { ...row };
  delete rest.can_bo;
  delete rest.ngach_cu;
  delete rest.bac_cu;
  delete rest.ngach_moi;
  delete rest.bac_moi;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    can_bo_id: String(r.can_bo_id ?? ''),
    ngay_nang_luong: String(r.ngay_nang_luong ?? '').slice(0, 10),
    loai_ky: String(r.loai_ky ?? 'dung_han') as MttqTangLuongListRow['loai_ky'],
    ngach_luong_id_cu: nullableId(r.ngach_luong_id_cu),
    bac_luong_id_cu: nullableId(r.bac_luong_id_cu),
    ngach_luong_id_moi: String(r.ngach_luong_id_moi ?? ''),
    bac_luong_id_moi: String(r.bac_luong_id_moi ?? ''),
    so_thang_rut_ngan: r.so_thang_rut_ngan == null ? null : Number(r.so_thang_rut_ngan),
    ngay_den_han_goc: nullableStr(r.ngay_den_han_goc)?.slice(0, 10) ?? null,
    luong: r.luong == null ? 0 : Number(r.luong),
    ghi_chu: nullableStr(r.ghi_chu),
    file_quyet_dinh: nullableStr(r.file_quyet_dinh),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_ten_can_bo: String(canBo?.ho_ten ?? ''),
    phong_ban_id: nullableId(canBo?.phong_ban_id),
    don_vi_id: nullableId(canBo?.don_vi_id),
    to_chuc_id: nullableId(canBo?.to_chuc_id),
    ten_phong_ban:
      phongBan?.ten_phong_ban != null && String(phongBan.ten_phong_ban).trim() !== ''
        ? String(phongBan.ten_phong_ban)
        : null,
    ten_bo_phan: null,
    ten_don_vi: tenDonViFromXaEmbed(canBo?.don_vi),
    ten_to_chuc: (() => {
      const t = pickEmbedded<{ ten?: unknown }>(canBo?.to_chuc_ref);
      return t?.ten != null ? String(t.ten) : null;
    })(),
    ten_ngach_cu: tenNgachFromEmbed(row.ngach_cu),
    ma_bac_cu: maBacFromEmbed(row.bac_cu),
    ten_ngach_moi: tenNgachFromEmbed(row.ngach_moi) ?? '—',
    ma_bac_moi: maBacFromEmbed(row.bac_moi) ?? '—',
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

let mockRows = structuredClone(MTTQ_TANG_LUONG_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

async function assertBacBelongsToNgach(ngachId: string, bacId: string): Promise<void> {
  if (!isSupabase()) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { data, error } = await supabase
    .from('luong_thiet_lap_bac_luong')
    .select('id,ngach_id')
    .eq('id', bacId)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data || String(data.ngach_id) !== ngachId) {
    throw new Error(txt('matTranTangLuong.validation.bacNotInNgach'));
  }
}

function payloadFromForm(
  data: MttqTangLuongFormValues,
  ngayDenHanGoc: string | null,
  luong: number,
) {
  return {
    can_bo_id: data.can_bo_id.trim(),
    ngay_nang_luong: data.ngay_nang_luong.slice(0, 10),
    loai_ky: data.loai_ky,
    ngach_luong_id_cu: data.ngach_luong_id_cu?.trim() || null,
    bac_luong_id_cu: data.bac_luong_id_cu?.trim() || null,
    ngach_luong_id_moi: data.ngach_luong_id_moi.trim(),
    bac_luong_id_moi: data.bac_luong_id_moi.trim(),
    so_thang_rut_ngan: loaiKyToSoThang(data.loai_ky),
    ngay_den_han_goc: ngayDenHanGoc,
    luong,
    ghi_chu: data.ghi_chu?.trim() || null,
    file_quyet_dinh: data.file_quyet_dinh?.trim() || null,
  };
}

function resolveLuongFromForm(data: MttqTangLuongFormValues): number {
  const luong = Number(data.luong);
  if (!Number.isFinite(luong) || luong <= 0) {
    throw new Error(txt('matTranTangLuong.validation.luongZero'));
  }
  return Math.round(luong);
}

export async function getMttqTangLuongList(): Promise<MttqTangLuongListRow[]> {
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => b.ngay_nang_luong.localeCompare(a.ngay_nang_luong));
  }
  const list = await repo.getAll({ orderBy: 'ngay_nang_luong', ascending: false });
  return list.map((row) => flattenMttqTangLuongRow(row as unknown as Record<string, unknown>));
}

export async function getMttqTangLuongById(id: string): Promise<MttqTangLuongListRow | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_tang_luong')
    .select(MTTQ_TANG_LUONG_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenMttqTangLuongRow(data as unknown as Record<string, unknown>);
}

export async function getMttqTangLuongByCanBo(canBoId: string, limit = 20): Promise<MttqTangLuongListRow[]> {
  const id = canBoId.trim();
  if (!id) return [];
  if (!isSupabase()) {
    return mockRows
      .filter((r) => r.can_bo_id === id)
      .sort((a, b) => b.ngay_nang_luong.localeCompare(a.ngay_nang_luong))
      .slice(0, limit);
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mttq_tang_luong')
    .select(MTTQ_TANG_LUONG_SELECT_LIST)
    .eq('can_bo_id', id)
    .order('ngay_nang_luong', { ascending: false })
    .limit(limit);
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenMttqTangLuongRow(row as unknown as Record<string, unknown>));
}

async function resolveNgayDenHanGoc(
  canBoId: string,
  ngayNangLuong: string,
  excludeId?: string,
): Promise<string | null> {
  const all = await getMttqTangLuongList();
  const prev = getLatestRecordForCanBo(all, canBoId, excludeId);
  if (!prev) return null;
  if (prev.ngay_nang_luong.slice(0, 10) >= ngayNangLuong.slice(0, 10)) {
    const older = all
      .filter(
        (r) =>
          r.can_bo_id === canBoId &&
          r.id !== excludeId &&
          r.ngay_nang_luong.slice(0, 10) < ngayNangLuong.slice(0, 10),
      )
      .sort((a, b) => b.ngay_nang_luong.localeCompare(a.ngay_nang_luong))[0];
    return computeNgayDenHanGoc(older?.ngay_nang_luong);
  }
  return computeNgayDenHanGoc(prev.ngay_nang_luong);
}

export async function createMttqTangLuong(
  data: MttqTangLuongFormValues,
  idNguoiTao: string,
): Promise<MttqTangLuongListRow> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranTangLuong.service.noEmployeeProfile'));
  await assertBacBelongsToNgach(data.ngach_luong_id_moi, data.bac_luong_id_moi);
  const ngayDenHanGoc = await resolveNgayDenHanGoc(data.can_bo_id, data.ngay_nang_luong);
  const luong = resolveLuongFromForm(data);
  const payload = payloadFromForm(data, ngayDenHanGoc, luong);

  if (!isSupabase()) {
    const id = mockNextId();
    const now = new Date().toISOString();
    const row: MttqTangLuongListRow = {
      id,
      ...payload,
      loai_ky: payload.loai_ky as MttqTangLuongListRow['loai_ky'],
      ho_ten_can_bo: 'Mock cán bộ',
      ten_phong_ban: null,
      ten_bo_phan: null,
      ten_don_vi: null,
      ten_to_chuc: null,
      ten_ngach_cu: null,
      ma_bac_cu: null,
      ten_ngach_moi: 'Mock ngạch',
      ma_bac_moi: 'B1',
      id_nguoi_tao: trimmed,
      tg_tao: now,
      tg_cap_nhat: now,
    };
    mockRows.push(row);
    return row;
  }

  const inserted = await repo.insert(
    { ...payload, id_nguoi_tao: trimmed } as unknown as Omit<RepoRow, 'id'>,
    { returningSelect: MTTQ_TANG_LUONG_SELECT_FULL },
  );
  return flattenMttqTangLuongRow(inserted as unknown as Record<string, unknown>);
}

export async function updateMttqTangLuong(
  id: string,
  data: MttqTangLuongFormValues,
): Promise<MttqTangLuongListRow> {
  await assertBacBelongsToNgach(data.ngach_luong_id_moi, data.bac_luong_id_moi);
  const ngayDenHanGoc = await resolveNgayDenHanGoc(data.can_bo_id, data.ngay_nang_luong, id);
  const luong = resolveLuongFromForm(data);
  const payload = payloadFromForm(data, ngayDenHanGoc, luong);

  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranTangLuong.service.notFound'));
    mockRows[idx] = {
      ...mockRows[idx],
      ...payload,
      loai_ky: payload.loai_ky as MttqTangLuongListRow['loai_ky'],
      tg_cap_nhat: new Date().toISOString(),
    };
    return mockRows[idx];
  }

  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: MTTQ_TANG_LUONG_SELECT_FULL,
  });
  return flattenMttqTangLuongRow(updated as unknown as Record<string, unknown>);
}

export async function deleteMttqTangLuong(id: string): Promise<void> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranTangLuong.service.notFound'));
    mockRows.splice(idx, 1);
    return;
  }
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase.from('mttq_tang_luong').delete().eq('id', id);
  handleSupabaseError(error);
}

export async function deleteMttqTangLuongMany(ids: string[]): Promise<void> {
  for (const id of ids) {
    await deleteMttqTangLuong(id);
  }
}
