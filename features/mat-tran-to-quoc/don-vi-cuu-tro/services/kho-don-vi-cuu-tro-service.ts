import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { KhoDonViCuuTroDetail, KhoDonViCuuTroListRow, KhoDonViCuuTroLoai } from '../core/types';
import type { KhoDonViCuuTroFormValues } from '../core/schema';
import { KHO_DON_VI_CUU_TRO_RETURNING, KHO_DON_VI_CUU_TRO_SELECT } from '../core/supabase-select';
import { KHO_DON_VI_CUU_TRO_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_don_vi_cuu_tro',
  select: KHO_DON_VI_CUU_TRO_SELECT,
  delay: 350,
  mockData: [],
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function loaiLabel(loai: string): string {
  return loai === 'ca_nhan' ? txt('matTranDonViCuuTro.loai.caNhan') : txt('matTranDonViCuuTro.loai.toChuc');
}

export function flattenKhoDonViCuuTroRow(row: Record<string, unknown>): KhoDonViCuuTroListRow {
  const r = row as Record<string, unknown>;
  const loaiRaw = String(r.loai ?? 'to_chuc');
  const loai: KhoDonViCuuTroLoai = loaiRaw === 'ca_nhan' ? 'ca_nhan' : 'to_chuc';
  return {
    id: String(r.id ?? ''),
    tt: Number(r.tt ?? 0),
    loai,
    loai_label: loaiLabel(loai),
    ten: String(r.ten ?? ''),
    dia_chi: nullableStr(r.dia_chi),
    dien_thoai: nullableStr(r.dien_thoai),
    email: nullableStr(r.email),
    ghi_chu: nullableStr(r.ghi_chu),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

let mockRows: KhoDonViCuuTroListRow[] = structuredClone(KHO_DON_VI_CUU_TRO_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function mockNextTt(): number {
  const maxTt = Math.max(0, ...mockRows.map((r) => r.tt));
  return maxTt + 1;
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToPayload(data: KhoDonViCuuTroFormValues): Record<string, unknown> {
  return {
    loai: data.loai,
    ten: data.ten.trim(),
    dia_chi: emptyToNull(data.dia_chi),
    dien_thoai: emptyToNull(data.dien_thoai),
    email: emptyToNull(data.email),
    ghi_chu: emptyToNull(data.ghi_chu),
  };
}

export async function getKhoDonViCuuTroList(): Promise<KhoDonViCuuTroListRow[]> {
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => {
      if (a.tt !== b.tt) return a.tt - b.tt;
      return b.tg_cap_nhat.localeCompare(a.tg_cap_nhat);
    });
  }
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoDonViCuuTroRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDonViCuuTroById(id: string): Promise<KhoDonViCuuTroDetail | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_don_vi_cuu_tro')
    .select(KHO_DON_VI_CUU_TRO_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenKhoDonViCuuTroRow(data as unknown as Record<string, unknown>);
}

export async function createKhoDonViCuuTro(data: KhoDonViCuuTroFormValues): Promise<KhoDonViCuuTroListRow> {
  const payload = formToPayload(data);
  if (!isSupabase()) {
    const now = new Date().toISOString();
    const loai = data.loai;
    const row: KhoDonViCuuTroListRow = {
      id: mockNextId(),
      tt: mockNextTt(),
      loai,
      loai_label: loaiLabel(loai),
      ten: String(payload.ten),
      dia_chi: nullableStr(payload.dia_chi),
      dien_thoai: nullableStr(payload.dien_thoai),
      email: nullableStr(payload.email),
      ghi_chu: nullableStr(payload.ghi_chu),
      tg_tao: now,
      tg_cap_nhat: now,
    };
    mockRows = [row, ...mockRows];
    return row;
  }
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DON_VI_CUU_TRO_RETURNING,
  });
  return flattenKhoDonViCuuTroRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDonViCuuTro(id: string, data: KhoDonViCuuTroFormValues): Promise<KhoDonViCuuTroListRow> {
  const payload = formToPayload(data);
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranDonViCuuTro.service.notFound'));
    const prev = mockRows[idx];
    const now = new Date().toISOString();
    const loai = data.loai;
    const row: KhoDonViCuuTroListRow = {
      ...prev,
      loai,
      loai_label: loaiLabel(loai),
      ten: String(payload.ten),
      dia_chi: nullableStr(payload.dia_chi),
      dien_thoai: nullableStr(payload.dien_thoai),
      email: nullableStr(payload.email),
      ghi_chu: nullableStr(payload.ghi_chu),
      tg_cap_nhat: now,
    };
    mockRows = [...mockRows.slice(0, idx), row, ...mockRows.slice(idx + 1)];
    return row;
  }
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DON_VI_CUU_TRO_RETURNING,
  });
  return flattenKhoDonViCuuTroRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDonViCuuTroMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    const set = new Set(ids);
    mockRows = mockRows.filter((r) => !set.has(r.id));
    return;
  }
  await repo.remove(ids);
}
