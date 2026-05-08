import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type {
  MttqLopTapHuan,
  MttqLopTapHuanCt,
  MttqLopTapHuanListRow,
} from '../core/types';
import type { MttqTapHuanFormValues } from '../core/schema';
import type { MttqTapHuanCap, MttqTapHuanThuocDien } from '../core/constants';
import {
  MTTQ_LOP_TAP_HUAN_SELECT_FULL,
  MTTQ_LOP_TAP_HUAN_SELECT_LIST,
} from '../core/supabase-select';
import {
  MTTQ_LOP_TAP_HUAN_MOCK_CHILDREN,
  MTTQ_LOP_TAP_HUAN_MOCK_PARENTS,
} from '../mock-data';

type ParentRepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<ParentRepoRow>({
  tableName: 'mttq_lop_tap_huan',
  select: MTTQ_LOP_TAP_HUAN_SELECT_LIST,
  delay: 400,
  /** Mock parents/children được service quản lý — không dùng MockRepository cho bảng này. */
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

function toInt(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  return 0;
}

function isPersistedChildId(id: unknown): id is string {
  if (id == null || typeof id !== 'string') return false;
  return /^\d+$/.test(id.trim());
}

/** Mock in-memory (chỉ khi không Supabase). */
let mockParents = structuredClone(MTTQ_LOP_TAP_HUAN_MOCK_PARENTS);
let mockChildren = structuredClone(MTTQ_LOP_TAP_HUAN_MOCK_CHILDREN);

function mockNextId(): string {
  const maxP = Math.max(0, ...mockParents.map((p) => Number(p.id) || 0));
  const maxC = Math.max(0, ...mockChildren.map((c) => Number(c.id) || 0));
  return String(Math.max(maxP, maxC) + 1);
}

function tenFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown }>(v);
  const t = o?.ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

function hoTenFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ho_ten?: unknown }>(v);
  const t = o?.ho_ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

export function flattenCtRow(row: Record<string, unknown>): MttqLopTapHuanCt {
  const canBo = pickEmbedded<Record<string, unknown>>(row.can_bo);
  const fromJoinCv = tenFromEmbed(canBo?.chuc_vu);
  const fromJoinDv = tenFromEmbed(canBo?.to_chuc);
  const storedCv = nullableStr(row.chuc_vu);
  const storedDv = nullableStr(row.don_vi_cong_tac);
  return {
    id: String(row.id),
    id_lop_tap_huan: String(row.id_lop_tap_huan),
    can_bo_id: String(row.can_bo_id),
    chuc_vu: storedCv ?? fromJoinCv,
    don_vi_cong_tac: storedDv ?? fromJoinDv,
    thuoc_dien: String(row.thuoc_dien) as MttqTapHuanThuocDien,
    ten_can_bo: hoTenFromEmbed(canBo),
    ten_cap_quan_ly: tenFromEmbed(canBo?.cap_quan_ly),
  };
}

function flattenListRow(row: Record<string, unknown>): MttqLopTapHuanListRow {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
  // PostgREST aggregate `mttq_lop_tap_huan_ct(count)` trả `[{ count: N }]` — không
  // kéo mảng id chi tiết nữa (tiết kiệm egress đáng kể với lớp tập huấn nhiều cán bộ).
  const lines = row.mttq_lop_tap_huan_ct;
  let soDong = 0;
  if (Array.isArray(lines)) {
    const first = lines[0] as { count?: unknown } | undefined;
    const c = first?.count;
    soDong =
      typeof c === 'number'
        ? c
        : typeof c === 'string' && /^\d+$/.test(c)
        ? Number(c)
        : lines.length;
  }

  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.mttq_lop_tap_huan_ct;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    ten_lop_tap_huan: String(r.ten_lop_tap_huan ?? ''),
    nam_tap_huan: toInt(r.nam_tap_huan),
    cap_tap_huan: String(r.cap_tap_huan ?? 'Cấp tỉnh') as MttqTapHuanCap,
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
    so_dong: soDong,
  };
}

export function flattenFullRow(row: Record<string, unknown>): MttqLopTapHuan {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
  const rawCt = row.mttq_lop_tap_huan_ct;
  const chi_tiet: MttqLopTapHuanCt[] = Array.isArray(rawCt)
    ? rawCt.map((x) => flattenCtRow(x as Record<string, unknown>))
    : [];

  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.mttq_lop_tap_huan_ct;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    ten_lop_tap_huan: String(r.ten_lop_tap_huan ?? ''),
    nam_tap_huan: toInt(r.nam_tap_huan),
    cap_tap_huan: String(r.cap_tap_huan ?? 'Cấp tỉnh') as MttqTapHuanCap,
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
    chi_tiet,
  };
}

function normalizeFull(x: MttqLopTapHuan): MttqLopTapHuan {
  return {
    ...x,
    id: String(x.id),
    chi_tiet: x.chi_tiet.map((c) => ({
      ...c,
      id: String(c.id),
      id_lop_tap_huan: String(c.id_lop_tap_huan),
      can_bo_id: String(c.can_bo_id),
    })),
  };
}

function headerPayload(data: MttqTapHuanFormValues) {
  return {
    ten_lop_tap_huan: data.ten_lop_tap_huan.trim(),
    nam_tap_huan: data.nam_tap_huan,
    cap_tap_huan: data.cap_tap_huan,
    ghi_chu: data.ghi_chu?.trim() ?? null,
  };
}

async function syncChildrenSupabase(parentId: string, lines: MttqTapHuanFormValues['chi_tiet']) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');
  const q = () => supabase.from('mttq_lop_tap_huan_ct');

  const { data: existing, error: e1 } = await q().select('id').eq('id_lop_tap_huan', parentId);
  if (e1) handleSupabaseError(e1);

  const keep = new Set(lines.map((l) => l.id).filter(isPersistedChildId));
  const existingIds = (existing ?? []).map((r) => String(r.id));
  const toDelete = existingIds.filter((id: string) => !keep.has(id));

  // Batch để giảm round-trip: 1 delete (in-list) + 1 upsert update + 1 insert.
  const baseOf = (line: MttqTapHuanFormValues['chi_tiet'][number]) => ({
    can_bo_id: Number(line.can_bo_id),
    chuc_vu: line.chuc_vu.trim(),
    don_vi_cong_tac: line.don_vi_cong_tac.trim(),
    thuoc_dien: line.thuoc_dien,
  });
  const toUpsertExisting = lines
    .filter((l) => isPersistedChildId(l.id))
    .map((l) => ({ id: Number(l.id), id_lop_tap_huan: Number(parentId), ...baseOf(l) }));
  const toInsertNew = lines
    .filter((l) => !isPersistedChildId(l.id))
    .map((l) => ({ id_lop_tap_huan: Number(parentId), ...baseOf(l) }));

  if (toDelete.length > 0) {
    const { error: e2 } = await q().delete().in('id', toDelete);
    if (e2) handleSupabaseError(e2);
  }
  if (toUpsertExisting.length > 0) {
    const { error: e3 } = await q().upsert(toUpsertExisting, { onConflict: 'id' });
    if (e3) handleSupabaseError(e3);
  }
  if (toInsertNew.length > 0) {
    const { error: e4 } = await q().insert(toInsertNew);
    if (e4) handleSupabaseError(e4);
  }
}

function syncChildrenMock(parentId: string, lines: MttqTapHuanFormValues['chi_tiet']) {
  mockChildren = mockChildren.filter((c) => c.id_lop_tap_huan !== parentId);
  for (const line of lines) {
    const id = isPersistedChildId(line.id) ? line.id! : mockNextId();
    mockChildren.push({
      id,
      id_lop_tap_huan: parentId,
      can_bo_id: line.can_bo_id,
      chuc_vu: line.chuc_vu.trim(),
      don_vi_cong_tac: line.don_vi_cong_tac.trim(),
      thuoc_dien: line.thuoc_dien,
    });
  }
}

export async function getMttqLopTapHuanList(): Promise<MttqLopTapHuanListRow[]> {
  if (!isSupabase()) {
    return mockParents.map((p) => {
      const n = mockChildren.filter((c) => c.id_lop_tap_huan === p.id).length;
      return {
        id: p.id,
        ten_lop_tap_huan: p.ten_lop_tap_huan,
        nam_tap_huan: p.nam_tap_huan,
        cap_tap_huan: p.cap_tap_huan,
        ghi_chu: p.ghi_chu,
        id_nguoi_tao: p.id_nguoi_tao,
        tg_tao: p.tg_tao,
        tg_cap_nhat: p.tg_cap_nhat,
        ho_va_ten_nguoi_tao: p.ho_va_ten_nguoi_tao,
        ten_tai_khoan_nguoi_tao: p.ten_tai_khoan_nguoi_tao,
        id_phong_ban_nguoi_tao: p.id_phong_ban_nguoi_tao ?? null,
        so_dong: n,
      };
    });
  }

  const list = await repo.getAll({ orderBy: 'nam_tap_huan', ascending: false });
  return list.map((row) => flattenListRow(row as unknown as Record<string, unknown>));
}

export async function getMttqLopTapHuanById(id: string): Promise<MttqLopTapHuan | null> {
  if (!isSupabase()) {
    const p = mockParents.find((x) => x.id === id);
    if (!p) return null;
    const chi = mockChildren
      .filter((c) => c.id_lop_tap_huan === id)
      .map((c) => ({
        ...c,
        ten_can_bo: null as string | null,
        ten_cap_quan_ly: null as string | null,
      }));
    return normalizeFull({
      ...p,
      chi_tiet: chi,
    });
  }

  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_lop_tap_huan')
    .select(MTTQ_LOP_TAP_HUAN_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return normalizeFull(flattenFullRow(data as unknown as Record<string, unknown>));
}

export async function createMttqLopTapHuan(
  data: MttqTapHuanFormValues,
  idNguoiTao: string,
): Promise<MttqLopTapHuan> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranTapHuan.service.noEmployeeProfile'));

  if (!isSupabase()) {
    const id = mockNextId();
    const now = new Date().toISOString();
    mockParents.push({
      id,
      ...headerPayload(data),
      id_nguoi_tao: trimmed,
      tg_tao: now,
      tg_cap_nhat: now,
      ho_va_ten_nguoi_tao: 'Mock',
      ten_tai_khoan_nguoi_tao: 'mock',
      id_phong_ban_nguoi_tao: null,
    });
    syncChildrenMock(id, data.chi_tiet);
    const full = await getMttqLopTapHuanById(id);
    if (!full) throw new Error(txt('matTranTapHuan.service.notFound'));
    return full;
  }

  // Narrow returning — `getById` ngay sau đó nạp full row, không cần payload rộng.
  const inserted = await repo.insert(
    {
      ...headerPayload(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<ParentRepoRow, 'id'>,
    { returningSelect: 'id,tg_cap_nhat' },
  );
  const parentId = String((inserted as { id?: unknown }).id ?? '');
  await syncChildrenSupabase(parentId, data.chi_tiet);
  const full = await getMttqLopTapHuanById(parentId);
  if (!full) throw new Error(txt('matTranTapHuan.service.notFound'));
  return full;
}

export async function updateMttqLopTapHuan(
  id: string,
  data: MttqTapHuanFormValues,
): Promise<MttqLopTapHuan> {
  if (!isSupabase()) {
    const idx = mockParents.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(txt('matTranTapHuan.service.notFound'));
    mockParents[idx] = {
      ...mockParents[idx],
      ...headerPayload(data),
      tg_cap_nhat: new Date().toISOString(),
    };
    syncChildrenMock(id, data.chi_tiet);
    const full = await getMttqLopTapHuanById(id);
    if (!full) throw new Error(txt('matTranTapHuan.service.notFound'));
    return full;
  }

  await repo.update(id, headerPayload(data) as unknown as Partial<ParentRepoRow>, {
    returningSelect: 'id,tg_cap_nhat',
  });
  await syncChildrenSupabase(id, data.chi_tiet);
  const full = await getMttqLopTapHuanById(id);
  if (!full) throw new Error(txt('matTranTapHuan.service.notFound'));
  return full;
}

export async function deleteMttqLopTapHuanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    mockParents = mockParents.filter((p) => !ids.includes(p.id));
    mockChildren = mockChildren.filter((c) => !ids.includes(c.id_lop_tap_huan));
    return;
  }
  await repo.remove(ids);
}
