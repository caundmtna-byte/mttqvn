import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import type { MttqKyHop, MttqKyHopDiemDanhSummary, MttqKyHopListRow } from '../core/types';
import { getDiemDanhSummariesForKyHopIds } from './mttq-diem-danh-service';
import { mttqKyHopSchema, type MttqKyHopFormInput, type MttqKyHopFormValues } from '../core/schema';
import { MTTQ_KY_HOP_SELECT_FULL, MTTQ_KY_HOP_SELECT_LIST } from '../core/supabase-select';
import { MTTQ_KY_HOP_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_ky_hop',
  select: MTTQ_KY_HOP_SELECT_LIST,
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

function mergeDiemDanhSummary(row: MttqKyHop, s?: MttqKyHopDiemDanhSummary): MttqKyHop {
  return {
    ...row,
    diem_danh_co_mat: s?.co_mat ?? 0,
    diem_danh_vang_mat: s?.vang_mat ?? 0,
    diem_danh_chua: s?.chua_diem_danh ?? 0,
  };
}

async function withDiemDanhSummaries(rows: MttqKyHop[]): Promise<MttqKyHop[]> {
  if (rows.length === 0) return rows;
  const map = await getDiemDanhSummariesForKyHopIds(rows.map((r) => r.id));
  return rows.map((r) => mergeDiemDanhSummary(r, map.get(r.id)));
}

export function flattenRow(row: Record<string, unknown>): MttqKyHop {
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const nk = pickEmbedded<{ ten_nhiem_ky?: string }>(row.nhiem_ky);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi);
  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.nhiem_ky;
  delete rest.don_vi;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    nhiem_ky_id: String(r.nhiem_ky_id ?? ''),
    ten_nhiem_ky: String(nk?.ten_nhiem_ky ?? ''),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ky_thu: String(r.ky_thu ?? ''),
    ngay_hop: nullableStr(r.ngay_hop),
    noi_dung_ky_hop: nullableStr(r.noi_dung_ky_hop),
    tai_lieu_hop: nullableStr(r.tai_lieu_hop),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    diem_danh_co_mat: 0,
    diem_danh_vang_mat: 0,
    diem_danh_chua: 0,
  };
}

let mockRows = structuredClone(MTTQ_KY_HOP_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function payloadFromForm(data: MttqKyHopFormValues) {
  return {
    nhiem_ky_id: data.nhiem_ky_id,
    don_vi_id: data.don_vi_id,
    ky_thu: data.ky_thu,
    ngay_hop: data.ngay_hop,
    noi_dung_ky_hop: data.noi_dung_ky_hop,
    tai_lieu_hop: data.tai_lieu_hop,
    ghi_chu: data.ghi_chu,
  };
}

export async function getMttqKyHopList(): Promise<MttqKyHopListRow[]> {
  if (!isSupabase()) {
    const base = mockRows.map((r) => ({ ...r }));
    return withDiemDanhSummaries(base);
  }
  const list = await repo.getAll({ orderBy: 'ngay_hop', ascending: false });
  const flat = list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
  return withDiemDanhSummaries(flat);
}

/** Danh sách kỳ họp thuộc một nhiệm kỳ (drawer chi tiết nhiệm kỳ). */
export async function getMttqKyHopListForNhiemKyId(nhiemKyId: string): Promise<MttqKyHopListRow[]> {
  const id = nhiemKyId.trim();
  if (!id) return [];
  if (!isSupabase()) {
    const base = mockRows.filter((r) => r.nhiem_ky_id === id).map((r) => ({ ...r }));
    return withDiemDanhSummaries(base);
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mttq_ky_hop')
    .select(MTTQ_KY_HOP_SELECT_LIST)
    .eq('nhiem_ky_id', id)
    .order('ngay_hop', { ascending: false })
    .limit(500);
  if (error) handleSupabaseError(error);
  const flat = (data ?? []).map((row) => flattenRow(row as unknown as Record<string, unknown>));
  return withDiemDanhSummaries(flat);
}

export async function getMttqKyHopById(id: string): Promise<MttqKyHop | null> {
  if (!isSupabase()) {
    const r = mockRows.find((x) => x.id === id);
    if (!r) return null;
    const [merged] = await withDiemDanhSummaries([{ ...r }]);
    return merged ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_ky_hop')
    .select(MTTQ_KY_HOP_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  const flat = flattenRow(data as unknown as Record<string, unknown>);
  const [merged] = await withDiemDanhSummaries([flat]);
  return merged ?? null;
}

export async function createMttqKyHop(data: MttqKyHopFormValues, idNguoiTao: string): Promise<MttqKyHop> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranKyHop.service.noEmployeeProfile'));

  if (!isSupabase()) {
    const id = mockNextId();
    const now = new Date().toISOString();
    const row: MttqKyHop = {
      id,
      ...payloadFromForm(data),
      ten_nhiem_ky: 'Mock nhiệm kỳ',
      ten_don_vi: null,
      id_nguoi_tao: trimmed,
      tg_tao: now,
      tg_cap_nhat: now,
      ho_va_ten_nguoi_tao: 'Mock',
      ten_tai_khoan_nguoi_tao: 'mock',
      diem_danh_co_mat: 0,
      diem_danh_vang_mat: 0,
      diem_danh_chua: 0,
    };
    mockRows.push(row);
    const [out] = await withDiemDanhSummaries([row]);
    return out ?? row;
  }

  const inserted = await repo.insert(
    {
      ...payloadFromForm(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<RepoRow, 'id'>,
    { returningSelect: MTTQ_KY_HOP_SELECT_FULL },
  );
  const flat = flattenRow(inserted as unknown as Record<string, unknown>);
  const [out] = await withDiemDanhSummaries([flat]);
  return out ?? flat;
}

export async function updateMttqKyHop(id: string, data: MttqKyHopFormValues): Promise<MttqKyHop> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranKyHop.service.notFound'));
    const now = new Date().toISOString();
    mockRows[idx] = {
      ...mockRows[idx],
      ...payloadFromForm(data),
      tg_cap_nhat: now,
    };
    const [out] = await withDiemDanhSummaries([mockRows[idx]]);
    if (out) mockRows[idx] = out;
    return out ?? { ...mockRows[idx] };
  }

  const updated = await repo.update(
    id,
    {
      ...payloadFromForm(data),
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<RepoRow>,
    { returningSelect: MTTQ_KY_HOP_SELECT_FULL },
  );
  const flat = flattenRow(updated as unknown as Record<string, unknown>);
  const [out] = await withDiemDanhSummaries([flat]);
  return out ?? flat;
}

export async function deleteMttqKyHopMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    mockRows = mockRows.filter((r) => !ids.includes(r.id));
    return;
  }
  await repo.remove(ids);
}

async function resolveNhiemKyIdByTen(ten: string): Promise<string | null> {
  const t = ten.trim();
  if (!t) return null;
  if (!isSupabase()) return '1';
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_nhiem_ky')
    .select('id')
    .eq('ten_nhiem_ky', t)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (data?.id != null) return String(data.id);
  const { data: data2, error: err2 } = await supabase
    .from('mttq_nhiem_ky')
    .select('id')
    .ilike('ten_nhiem_ky', `%${t}%`)
    .limit(1)
    .maybeSingle();
  if (err2) handleSupabaseError(err2);
  return data2?.id != null ? String(data2.id) : null;
}

async function resolveDonViIdByTen(tenDonVi: string): Promise<string | null> {
  const t = tenDonVi.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === 'mttq tỉnh' || lower === 'mttq tinh') return null;
  const all = await getXaPhuongAll();
  const exact = all.find((x) => x.ten.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find((x) => x.ten.toLowerCase().includes(lower) || lower.includes(x.ten.toLowerCase()));
  return partial?.id ?? null;
}

function importRowToFormInput(
  row: Record<string, unknown>,
  resolved: { nhiem_ky_id: string; don_vi_id: string },
): MttqKyHopFormInput {
  return {
    nhiem_ky_id: resolved.nhiem_ky_id,
    don_vi_id: resolved.don_vi_id,
    ky_thu: String(row.ky_thu ?? '').trim(),
    ngay_hop: row.ngay_hop != null && String(row.ngay_hop).trim() !== '' ? String(row.ngay_hop) : '',
    noi_dung_ky_hop:
      row.noi_dung_ky_hop != null && String(row.noi_dung_ky_hop).trim() !== ''
        ? String(row.noi_dung_ky_hop)
        : undefined,
    tai_lieu_hop:
      row.tai_lieu_hop != null && String(row.tai_lieu_hop).trim() !== '' ? String(row.tai_lieu_hop) : undefined,
    ghi_chu: row.ghi_chu != null && String(row.ghi_chu).trim() !== '' ? String(row.ghi_chu) : undefined,
  };
}

/** Import nhiều kỳ họp (chỉ thêm mới). Cột: ten_nhiem_ky hoặc nhiem_ky_id; ten_don_vi hoặc don_vi_id; ky_thu; ngay_hop; ... */
export async function importMttqKyHop(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('matTranKyHop.service.noEmployeeProfile'));

  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const nkRaw = String(raw.nhiem_ky_id ?? raw.ten_nhiem_ky ?? '').trim();
    let nhiem_ky_id = nkRaw;
    if (!/^\d+$/.test(nhiem_ky_id)) {
      const resolvedNk = await resolveNhiemKyIdByTen(nkRaw);
      if (!resolvedNk) {
        errors.push(txt('matTranKyHop.import.rowError', { row: i + 2, message: txt('matTranKyHop.import.badNhiemKy') }));
        continue;
      }
      nhiem_ky_id = resolvedNk;
    }

    const dvRaw = raw.don_vi_id != null && String(raw.don_vi_id).trim() !== '' ? String(raw.don_vi_id).trim() : '';
    let don_vi_id: string;
    if (dvRaw && /^\d+$/.test(dvRaw)) {
      don_vi_id = dvRaw;
    } else {
      const tenDv = String(raw.ten_don_vi ?? '').trim();
      don_vi_id = (await resolveDonViIdByTen(tenDv)) ?? '';
    }

    const input = importRowToFormInput(raw, { nhiem_ky_id, don_vi_id });

    const parsed = mttqKyHopSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      errors.push(txt('matTranKyHop.import.rowError', { row: i + 2, message: msg }));
      continue;
    }
    const data = parsed.data as MttqKyHopFormValues;
    try {
      await createMttqKyHop(data, trimmedNv);
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(txt('matTranKyHop.import.rowError', { row: i + 2, message: msg }));
    }
  }

  return { created, errors };
}
