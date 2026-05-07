import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { MttqKhenThuong, MttqKhenThuongCt, MttqKhenThuongLineForCanBo, MttqKhenThuongListRow } from '../core/types';
import type { MttqKhenThuongFormValues } from '../core/schema';
import type { MttqKhenThuongDanhHieu, MttqKhenThuongHinhThuc, MttqKhenThuongTrangThai } from '../core/constants';
import { MTTQ_KHEN_THUONG_SELECT_FULL, MTTQ_KHEN_THUONG_SELECT_LIST } from '../core/supabase-select';
import { MTTQ_KHEN_THUONG_MOCK_CHILDREN, MTTQ_KHEN_THUONG_MOCK_PARENTS } from '../mock-data';

type ParentRepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<ParentRepoRow>({
  tableName: 'mttq_khen_thuong',
  select: MTTQ_KHEN_THUONG_SELECT_LIST,
  delay: 400,
  /** Danh sách mock do `mockParents` / `mockChildren` quản lý — không dùng MockRepository cho bảng này. */
  mockData: [],
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function dateOnly(v: unknown): string {
  if (v == null || v === '') return '';
  const s = typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
  return s || '';
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function isPersistedChildId(id: unknown): id is string {
  if (id == null || typeof id !== 'string') return false;
  return /^\d+$/.test(id.trim());
}

/** Mock in-memory (chỉ khi không Supabase). */
let mockParents = structuredClone(MTTQ_KHEN_THUONG_MOCK_PARENTS);
let mockChildren = structuredClone(MTTQ_KHEN_THUONG_MOCK_CHILDREN);

function mockNextId(): string {
  const maxP = Math.max(0, ...mockParents.map((p) => Number(p.id) || 0));
  const maxC = Math.max(0, ...mockChildren.map((c) => Number(c.id) || 0));
  return String(Math.max(maxP, maxC) + 1);
}

function tenCanBoFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ho_ten?: unknown }>(v);
  const t = o?.ho_ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

export function flattenCtRow(row: Record<string, unknown>): MttqKhenThuongCt {
  return {
    id: String(row.id),
    id_khen_thuong: String(row.id_khen_thuong),
    can_bo_id: String(row.can_bo_id),
    hinh_thuc_khen: String(row.hinh_thuc_khen) as MttqKhenThuongHinhThuc,
    danh_hieu: String(row.danh_hieu) as MttqKhenThuongDanhHieu,
    noi_dung_khen: nullableStr(row.noi_dung_khen),
    ho_so_khen: nullableStr(row.ho_so_khen),
    ten_can_bo: tenCanBoFromEmbed(row.can_bo),
  };
}

function flattenListRow(row: Record<string, unknown>): MttqKhenThuongListRow {
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const lines = row.mttq_khen_thuong_ct;
  const soDong = Array.isArray(lines) ? lines.length : 0;

  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.mttq_khen_thuong_ct;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    so_qd: String(r.so_qd ?? ''),
    ngay_khen_thuong: dateOnly(r.ngay_khen_thuong),
    don_vi_de_xuat: nullableStr(r.don_vi_de_xuat),
    ghi_chu: nullableStr(r.ghi_chu),
    trang_thai: String(r.trang_thai ?? 'Mới') as MttqKhenThuongTrangThai,
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    so_dong: soDong,
  };
}

export function flattenFullRow(row: Record<string, unknown>): MttqKhenThuong {
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rawCt = row.mttq_khen_thuong_ct;
  const chi_tiet: MttqKhenThuongCt[] = Array.isArray(rawCt)
    ? rawCt.map((x) => flattenCtRow(x as Record<string, unknown>))
    : [];

  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.mttq_khen_thuong_ct;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    so_qd: String(r.so_qd ?? ''),
    ngay_khen_thuong: dateOnly(r.ngay_khen_thuong),
    don_vi_de_xuat: nullableStr(r.don_vi_de_xuat),
    ghi_chu: nullableStr(r.ghi_chu),
    trang_thai: String(r.trang_thai ?? 'Mới') as MttqKhenThuongTrangThai,
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    chi_tiet,
  };
}

function normalizeFull(x: MttqKhenThuong): MttqKhenThuong {
  return {
    ...x,
    id: String(x.id),
    chi_tiet: x.chi_tiet.map((c) => ({
      ...c,
      id: String(c.id),
      id_khen_thuong: String(c.id_khen_thuong),
      can_bo_id: String(c.can_bo_id),
    })),
  };
}

function headerPayload(data: MttqKhenThuongFormValues) {
  return {
    so_qd: data.so_qd.trim(),
    ngay_khen_thuong: data.ngay_khen_thuong,
    don_vi_de_xuat: data.don_vi_de_xuat?.trim() ?? null,
    ghi_chu: data.ghi_chu?.trim() ?? null,
    trang_thai: data.trang_thai,
  };
}

async function syncChildrenSupabase(parentId: string, lines: MttqKhenThuongFormValues['chi_tiet']) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');
  const q = () => supabase.from('mttq_khen_thuong_ct');

  const { data: existing, error: e1 } = await q().select('id').eq('id_khen_thuong', parentId);
  if (e1) handleSupabaseError(e1);

  const keep = new Set(lines.map((l) => l.id).filter(isPersistedChildId));
  const existingIds = (existing ?? []).map((r) => String(r.id));
  const toDelete = existingIds.filter((id: string) => !keep.has(id));
  if (toDelete.length > 0) {
    const { error: e2 } = await q().delete().in('id', toDelete);
    if (e2) handleSupabaseError(e2);
  }

  for (const line of lines) {
    const base = {
      can_bo_id: Number(line.can_bo_id),
      hinh_thuc_khen: line.hinh_thuc_khen,
      danh_hieu: line.danh_hieu,
      noi_dung_khen: line.noi_dung_khen?.trim() ?? null,
      ho_so_khen: line.ho_so_khen?.trim() ?? null,
    };
    if (isPersistedChildId(line.id)) {
      const { error: e3 } = await q().update(base).eq('id', line.id);
      if (e3) handleSupabaseError(e3);
    } else {
      const { error: e4 } = await q().insert({
        id_khen_thuong: Number(parentId),
        ...base,
      });
      if (e4) handleSupabaseError(e4);
    }
  }
}

function syncChildrenMock(parentId: string, lines: MttqKhenThuongFormValues['chi_tiet']) {
  mockChildren = mockChildren.filter((c) => c.id_khen_thuong !== parentId);
  for (const line of lines) {
    const id = isPersistedChildId(line.id) ? line.id! : mockNextId();
    mockChildren.push({
      id,
      id_khen_thuong: parentId,
      can_bo_id: line.can_bo_id,
      hinh_thuc_khen: line.hinh_thuc_khen,
      danh_hieu: line.danh_hieu,
      noi_dung_khen: line.noi_dung_khen?.trim() ?? null,
      ho_so_khen: line.ho_so_khen?.trim() ?? null,
    });
  }
}

export async function getMttqKhenThuongList(): Promise<MttqKhenThuongListRow[]> {
  if (!isSupabase()) {
    return mockParents.map((p) => {
      const n = mockChildren.filter((c) => c.id_khen_thuong === p.id).length;
      return {
        id: p.id,
        so_qd: p.so_qd,
        ngay_khen_thuong: p.ngay_khen_thuong,
        don_vi_de_xuat: p.don_vi_de_xuat,
        ghi_chu: p.ghi_chu,
        trang_thai: p.trang_thai,
        id_nguoi_tao: p.id_nguoi_tao,
        tg_tao: p.tg_tao,
        tg_cap_nhat: p.tg_cap_nhat,
        ho_va_ten_nguoi_tao: p.ho_va_ten_nguoi_tao,
        ten_tai_khoan_nguoi_tao: p.ten_tai_khoan_nguoi_tao,
        so_dong: n,
      };
    });
  }

  const list = await repo.getAll({ orderBy: 'ngay_khen_thuong', ascending: false });
  return list.map((row) => flattenListRow(row as unknown as Record<string, unknown>));
}

export async function getMttqKhenThuongById(id: string): Promise<MttqKhenThuong | null> {
  if (!isSupabase()) {
    const p = mockParents.find((x) => x.id === id);
    if (!p) return null;
    const chi = mockChildren
      .filter((c) => c.id_khen_thuong === id)
      .map((c) => ({ ...c, ten_can_bo: null as string | null }));
    return normalizeFull({
      ...p,
      chi_tiet: chi,
    });
  }

  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_khen_thuong')
    .select(MTTQ_KHEN_THUONG_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return normalizeFull(flattenFullRow(data as unknown as Record<string, unknown>));
}

export async function createMttqKhenThuong(data: MttqKhenThuongFormValues, idNguoiTao: string): Promise<MttqKhenThuong> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranKhenThuong.service.noEmployeeProfile'));

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
    });
    syncChildrenMock(id, data.chi_tiet);
    const full = await getMttqKhenThuongById(id);
    if (!full) throw new Error(txt('matTranKhenThuong.service.notFound'));
    return full;
  }

  const inserted = await repo.insert(
    {
      ...headerPayload(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<ParentRepoRow, 'id'>,
    { returningSelect: '*' },
  );
  const parentId = String((inserted as { id?: unknown }).id ?? '');
  await syncChildrenSupabase(parentId, data.chi_tiet);
  const full = await getMttqKhenThuongById(parentId);
  if (!full) throw new Error(txt('matTranKhenThuong.service.notFound'));
  return full;
}

export async function updateMttqKhenThuong(id: string, data: MttqKhenThuongFormValues): Promise<MttqKhenThuong> {
  const existing = await getMttqKhenThuongById(id);
  if (!existing) throw new Error(txt('matTranKhenThuong.service.notFound'));

  if (!isSupabase()) {
    const idx = mockParents.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(txt('matTranKhenThuong.service.notFound'));
    mockParents[idx] = {
      ...mockParents[idx],
      ...headerPayload(data),
      tg_cap_nhat: new Date().toISOString(),
    };
    syncChildrenMock(id, data.chi_tiet);
    const full = await getMttqKhenThuongById(id);
    if (!full) throw new Error(txt('matTranKhenThuong.service.notFound'));
    return full;
  }

  await repo.update(id, headerPayload(data) as unknown as Partial<ParentRepoRow>, { returningSelect: '*' });
  await syncChildrenSupabase(id, data.chi_tiet);
  const full = await getMttqKhenThuongById(id);
  if (!full) throw new Error(txt('matTranKhenThuong.service.notFound'));
  return full;
}

export async function deleteMttqKhenThuongMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    mockParents = mockParents.filter((p) => !ids.includes(p.id));
    mockChildren = mockChildren.filter((c) => !ids.includes(c.id_khen_thuong));
    return;
  }
  await repo.remove(ids);
}

/** Các dòng `mttq_khen_thuong_ct` của một cán bộ, kèm số QĐ / ngày / trạng thái quyết định cha. */
export async function getMttqKhenThuongLinesForCanBoId(canBoId: string): Promise<MttqKhenThuongLineForCanBo[]> {
  const id = String(canBoId ?? '').trim();
  if (!id) return [];

  if (!isSupabase()) {
    const out: MttqKhenThuongLineForCanBo[] = [];
    for (const c of mockChildren.filter((x) => String(x.can_bo_id) === id)) {
      const p = mockParents.find((x) => x.id === c.id_khen_thuong);
      if (!p) continue;
      out.push({
        id_ct: String(c.id),
        id_khen_thuong: String(c.id_khen_thuong),
        so_qd: p.so_qd,
        ngay_khen_thuong: dateOnly(p.ngay_khen_thuong),
        trang_thai: p.trang_thai,
        hinh_thuc_khen: c.hinh_thuc_khen,
        danh_hieu: c.danh_hieu,
        noi_dung_khen: c.noi_dung_khen ?? null,
        ho_so_khen: c.ho_so_khen ?? null,
      });
    }
    out.sort((a, b) => (b.ngay_khen_thuong || '').localeCompare(a.ngay_khen_thuong || ''));
    return out;
  }

  const supabase = getSupabase();
  if (!supabase) return [];
  const canBoKey = /^\d+$/.test(id) ? Number(id) : id;
  const q = () => supabase.from('mttq_khen_thuong_ct');
  const { data, error } = await q()
    .select(
      'id, id_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen, mttq_khen_thuong!inner(id, so_qd, ngay_khen_thuong, trang_thai)',
    )
    .eq('can_bo_id', canBoKey);
  if (error) handleSupabaseError(error);

  const rows = (data ?? []) as Record<string, unknown>[];
  const mapped: MttqKhenThuongLineForCanBo[] = rows.map((row) => {
    const rawParent = row.mttq_khen_thuong;
    const p = (Array.isArray(rawParent) ? rawParent[0] : rawParent) as Record<string, unknown> | undefined;
    return {
      id_ct: String(row.id),
      id_khen_thuong: String(row.id_khen_thuong),
      so_qd: String(p?.so_qd ?? ''),
      ngay_khen_thuong: dateOnly(p?.ngay_khen_thuong),
      trang_thai: String(p?.trang_thai ?? 'Mới') as MttqKhenThuongLineForCanBo['trang_thai'],
      hinh_thuc_khen: String(row.hinh_thuc_khen) as MttqKhenThuongLineForCanBo['hinh_thuc_khen'],
      danh_hieu: String(row.danh_hieu) as MttqKhenThuongLineForCanBo['danh_hieu'],
      noi_dung_khen: nullableStr(row.noi_dung_khen),
      ho_so_khen: nullableStr(row.ho_so_khen),
    };
  });
  mapped.sort((a, b) => (b.ngay_khen_thuong || '').localeCompare(a.ngay_khen_thuong || ''));
  return mapped;
}
