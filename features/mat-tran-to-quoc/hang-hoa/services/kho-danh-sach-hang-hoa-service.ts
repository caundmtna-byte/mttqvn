import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { KhoDanhSachHangHoaDetail, KhoDanhSachHangHoaListRow } from '../core/types';
import type { KhoDanhSachHangHoaFormValues } from '../core/schema';
import { KHO_DANH_SACH_HANG_HOA_RETURNING, KHO_DANH_SACH_HANG_HOA_SELECT } from '../core/supabase-select';
import { KHO_DANH_SACH_HANG_HOA_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_danh_sach_hang_hoa',
  select: KHO_DANH_SACH_HANG_HOA_SELECT,
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

export function normalizeHangHoaRow(row: Record<string, unknown>): KhoDanhSachHangHoaListRow {
  const dm = pickEmbedded<{ ten_danh_muc?: string }>(row.kho_danh_muc_hang_hoa);
  const rest = { ...row };
  delete rest.kho_danh_muc_hang_hoa;
  const r = rest as Record<string, unknown>;
  const thu = r.thu_tu;
  return {
    id: String(r.id ?? ''),
    id_danh_muc: String(r.id_danh_muc ?? ''),
    ten_danh_muc_nhom: dm?.ten_danh_muc != null && String(dm.ten_danh_muc).trim() !== '' ? String(dm.ten_danh_muc) : '',
    ten_hang_hoa: String(r.ten_hang_hoa ?? ''),
    don_vi_tinh: String(r.don_vi_tinh ?? ''),
    mo_ta: nullableStr(r.mo_ta),
    quy_cach: nullableStr(r.quy_cach),
    thu_tu: typeof thu === 'number' ? thu : Number(thu) || 0,
    trang_thai: String(r.trang_thai ?? 'Đang hoạt động'),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

let mockHang: KhoDanhSachHangHoaListRow[] = structuredClone(KHO_DANH_SACH_HANG_HOA_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockHang.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function normIdDanhMuc(v: string | null | undefined): number {
  const s = v == null || v === '' ? '' : String(v).trim();
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(txt('matTranHangHoa.validation.danhMucRequired'));
  return n;
}

function formHangToPayload(data: KhoDanhSachHangHoaFormValues) {
  const moTa = data.mo_ta != null && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;
  const quyCach = data.quy_cach != null && String(data.quy_cach).trim() !== '' ? String(data.quy_cach).trim() : null;
  return {
    id_danh_muc: normIdDanhMuc(data.id_danh_muc),
    ten_hang_hoa: data.ten_hang_hoa.trim(),
    don_vi_tinh: data.don_vi_tinh.trim(),
    mo_ta: moTa,
    quy_cach: quyCach,
    thu_tu: data.thu_tu ?? 0,
    trang_thai: data.trang_thai,
  };
}

export async function getKhoDanhSachHangHoaList(): Promise<KhoDanhSachHangHoaListRow[]> {
  if (!isSupabase()) {
    return [...mockHang].sort((a, b) => {
      const g = a.ten_danh_muc_nhom.localeCompare(b.ten_danh_muc_nhom, 'vi');
      if (g !== 0) return g;
      const o = a.thu_tu - b.thu_tu;
      if (o !== 0) return o;
      return a.ten_hang_hoa.localeCompare(b.ten_hang_hoa, 'vi');
    });
  }
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => normalizeHangHoaRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDanhSachHangHoaById(id: string): Promise<KhoDanhSachHangHoaDetail | null> {
  if (!isSupabase()) {
    return mockHang.find((r) => r.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_danh_sach_hang_hoa')
    .select(KHO_DANH_SACH_HANG_HOA_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return normalizeHangHoaRow(data as unknown as Record<string, unknown>);
}

export async function createKhoDanhSachHangHoa(data: KhoDanhSachHangHoaFormValues): Promise<KhoDanhSachHangHoaListRow> {
  const payload = formHangToPayload(data);
  if (!isSupabase()) {
    const now = new Date().toISOString();
    const row: KhoDanhSachHangHoaListRow = {
      id: mockNextId(),
      id_danh_muc: String(payload.id_danh_muc),
      ten_danh_muc_nhom: mockHang.find((h) => h.id_danh_muc === String(payload.id_danh_muc))?.ten_danh_muc_nhom ?? '',
      ten_hang_hoa: payload.ten_hang_hoa,
      don_vi_tinh: payload.don_vi_tinh,
      mo_ta: payload.mo_ta,
      quy_cach: payload.quy_cach,
      thu_tu: payload.thu_tu,
      trang_thai: payload.trang_thai,
      tg_tao: now,
      tg_cap_nhat: now,
    };
    mockHang = [row, ...mockHang];
    return row;
  }
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DANH_SACH_HANG_HOA_RETURNING,
  });
  return normalizeHangHoaRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDanhSachHangHoa(id: string, data: KhoDanhSachHangHoaFormValues): Promise<KhoDanhSachHangHoaListRow> {
  const payload = formHangToPayload(data);
  if (!isSupabase()) {
    const idx = mockHang.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranHangHoa.service.notFoundHang'));
    const now = new Date().toISOString();
    const prev = mockHang[idx];
    const row: KhoDanhSachHangHoaListRow = {
      ...prev,
      ...payload,
      id_danh_muc: String(payload.id_danh_muc),
      tg_cap_nhat: now,
    };
    mockHang = [...mockHang.slice(0, idx), row, ...mockHang.slice(idx + 1)];
    return row;
  }
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DANH_SACH_HANG_HOA_RETURNING,
  });
  return normalizeHangHoaRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDanhSachHangHoaMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    const set = new Set(ids);
    mockHang = mockHang.filter((r) => !set.has(r.id));
    return;
  }
  await repo.remove(ids);
}
