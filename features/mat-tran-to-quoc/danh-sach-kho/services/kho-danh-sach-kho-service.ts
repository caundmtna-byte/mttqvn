import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { KhoDanhSachKhoDetail, KhoDanhSachKhoListRow } from '../core/types';
import type { KhoDanhSachKhoFormValues } from '../core/schema';
import { KHO_DANH_SACH_KHO_RETURNING, KHO_DANH_SACH_KHO_SELECT } from '../core/supabase-select';
import { KHO_DANH_SACH_KHO_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_danh_sach_kho',
  select: KHO_DANH_SACH_KHO_SELECT,
  delay: 350,
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

export function flattenKhoRow(row: Record<string, unknown>): KhoDanhSachKhoListRow {
  const dv = pickEmbedded<{ ten?: string; var_ssn_tinh_thanh?: unknown }>(row.don_vi);
  const tinh = pickEmbedded<{ ten?: string }>(dv?.var_ssn_tinh_thanh);
  const rest = { ...row };
  delete rest.don_vi;
  const r = rest as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    tt: Number(r.tt ?? 0),
    ten_kho: String(r.ten_kho ?? ''),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ten_tinh: tinh?.ten != null && String(tinh.ten).trim() !== '' ? String(tinh.ten) : null,
    mo_ta: nullableStr(r.mo_ta),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

let mockRows: KhoDanhSachKhoListRow[] = structuredClone(KHO_DANH_SACH_KHO_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function mockNextTt(): number {
  const maxTt = Math.max(0, ...mockRows.map((r) => r.tt));
  return maxTt + 1;
}

function formToPayload(data: KhoDanhSachKhoFormValues): {
  ten_kho: string;
  don_vi_id: number | null;
  mo_ta: string | null;
} {
  const moTa = data.mo_ta.trim();
  const rawDv = data.don_vi_id.trim();
  return {
    ten_kho: data.ten_kho.trim(),
    don_vi_id: rawDv === '' ? null : Number(rawDv),
    mo_ta: moTa === '' ? null : moTa,
  };
}

export async function getKhoDanhSachKhoList(): Promise<KhoDanhSachKhoListRow[]> {
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => {
      if (a.tt !== b.tt) return a.tt - b.tt;
      return b.tg_cap_nhat.localeCompare(a.tg_cap_nhat);
    });
  }
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDanhSachKhoById(id: string): Promise<KhoDanhSachKhoDetail | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_danh_sach_kho')
    .select(KHO_DANH_SACH_KHO_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenKhoRow(data as unknown as Record<string, unknown>);
}

export async function createKhoDanhSachKho(data: KhoDanhSachKhoFormValues): Promise<KhoDanhSachKhoListRow> {
  const payload = formToPayload(data);
  if (!isSupabase()) {
    const now = new Date().toISOString();
    const row: KhoDanhSachKhoListRow = {
      id: mockNextId(),
      tt: mockNextTt(),
      ten_kho: payload.ten_kho,
      don_vi_id: payload.don_vi_id != null ? String(payload.don_vi_id) : null,
      ten_don_vi: null,
      ten_tinh: null,
      mo_ta: payload.mo_ta,
      tg_tao: now,
      tg_cap_nhat: now,
    };
    mockRows = [row, ...mockRows];
    return row;
  }
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DANH_SACH_KHO_RETURNING,
  });
  return flattenKhoRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDanhSachKho(id: string, data: KhoDanhSachKhoFormValues): Promise<KhoDanhSachKhoListRow> {
  const payload = formToPayload(data);
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranKhoDanhSach.service.notFound'));
    const prev = mockRows[idx];
    const now = new Date().toISOString();
    const row: KhoDanhSachKhoListRow = {
      ...prev,
      ten_kho: payload.ten_kho,
      don_vi_id: payload.don_vi_id != null ? String(payload.don_vi_id) : null,
      mo_ta: payload.mo_ta,
      tg_cap_nhat: now,
    };
    mockRows = [...mockRows.slice(0, idx), row, ...mockRows.slice(idx + 1)];
    return row;
  }
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DANH_SACH_KHO_RETURNING,
  });
  return flattenKhoRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDanhSachKhoMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    const set = new Set(ids);
    mockRows = mockRows.filter((r) => !set.has(r.id));
    return;
  }
  await repo.remove(ids);
}
