import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type {
  MttqKhenThuong,
  MttqKhenThuongChiTietFlatRow,
  MttqKhenThuongCt,
  MttqKhenThuongLineForCanBo,
  MttqKhenThuongListRow,
} from '../core/types';
import type { MttqKhenThuongFormValues } from '../core/schema';
import type { MttqKhenThuongCap, MttqKhenThuongDanhHieu, MttqKhenThuongHinhThuc, MttqKhenThuongTrangThai } from '../core/constants';
import {
  MTTQ_KHEN_THUONG_CT_SELECT_FLAT_LIST,
  MTTQ_KHEN_THUONG_SELECT_FULL,
  MTTQ_KHEN_THUONG_SELECT_LIST,
} from '../core/supabase-select';
import { MTTQ_KHEN_THUONG_MOCK_CHILDREN, MTTQ_KHEN_THUONG_MOCK_PARENTS } from '../mock-data';
import type { MttqKhenThuongMockParent } from '../mock-data';

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

function donViIdFromCanBoEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ don_vi_id?: unknown }>(v);
  const d = o?.don_vi_id;
  if (d == null || d === '') return null;
  return String(d);
}

function nguoiTaoFromCanBoEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ id_nguoi_tao?: unknown }>(v);
  const d = o?.id_nguoi_tao;
  if (d == null || d === '') return null;
  return String(d);
}

export function flattenCtRow(row: Record<string, unknown>): MttqKhenThuongCt {
  return {
    id: String(row.id),
    id_khen_thuong: String(row.id_khen_thuong),
    can_bo_id: String(row.can_bo_id),
    cap_khen_thuong: String(row.cap_khen_thuong ?? 'Xã') as MttqKhenThuongCap,
    hinh_thuc_khen: String(row.hinh_thuc_khen) as MttqKhenThuongHinhThuc,
    danh_hieu: String(row.danh_hieu) as MttqKhenThuongDanhHieu,
    noi_dung_khen: nullableStr(row.noi_dung_khen),
    ho_so_khen: nullableStr(row.ho_so_khen),
    ten_can_bo: tenCanBoFromEmbed(row.can_bo),
    can_bo_don_vi_id: donViIdFromCanBoEmbed(row.can_bo),
    can_bo_id_nguoi_tao: nguoiTaoFromCanBoEmbed(row.can_bo),
  };
}

function flattenListRow(row: Record<string, unknown>): MttqKhenThuongListRow {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
  const lines = row.mttq_khen_thuong_ct;
  let soDong = 0;
  const rewardedDonViIds: string[] = [];
  const hinhSet = new Set<MttqKhenThuongHinhThuc>();
  const danhSet = new Set<MttqKhenThuongDanhHieu>();
  if (Array.isArray(lines)) {
    const onlyAggregateCount =
      lines.length === 1 &&
      lines[0] != null &&
      typeof lines[0] === 'object' &&
      'count' in (lines[0] as object);
    if (onlyAggregateCount) {
      const lo = lines[0] as Record<string, unknown>;
      const c = lo.count;
      soDong =
        typeof c === 'number'
          ? c
          : typeof c === 'string' && /^\d+$/.test(c)
          ? Number(c)
          : 0;
    } else {
      for (const line of lines) {
        if (line == null || typeof line !== 'object') continue;
        const lo = line as Record<string, unknown>;
        if ('count' in lo && lo.count != null) continue;
        soDong += 1;
        const dv = donViIdFromCanBoEmbed(lo.can_bo);
        if (dv) rewardedDonViIds.push(dv);
        const ht = lo.hinh_thuc_khen;
        if (typeof ht === 'string' && ht.trim()) hinhSet.add(ht as MttqKhenThuongHinhThuc);
        const dh = lo.danh_hieu;
        if (typeof dh === 'string' && dh.trim()) danhSet.add(dh as MttqKhenThuongDanhHieu);
      }
    }
  }

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
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
    so_dong: soDong,
    rewarded_can_bo_don_vi_ids: rewardedDonViIds,
    hinh_thuc_trong_qd: [...hinhSet].sort((a, b) => a.localeCompare(b)),
    danh_hieu_trong_qd: [...danhSet].sort((a, b) => a.localeCompare(b)),
  };
}

function mockQdEmbedFromParent(p: MttqKhenThuongMockParent): Record<string, unknown> {
  return {
    id: p.id,
    id_nguoi_tao: p.id_nguoi_tao,
    so_qd: p.so_qd,
    ngay_khen_thuong: p.ngay_khen_thuong,
    don_vi_de_xuat: p.don_vi_de_xuat,
    trang_thai: p.trang_thai,
    tg_cap_nhat: p.tg_cap_nhat,
    nguoi_tao: {
      ho_va_ten: p.ho_va_ten_nguoi_tao,
      ten_tai_khoan: p.ten_tai_khoan_nguoi_tao,
      id_phong_ban: p.id_phong_ban_nguoi_tao,
    },
  };
}

/** Dòng `mttq_khen_thuong_ct` + embed `qd` + `can_bo` (tab Danh sách chi tiết / Supabase). */
export function flattenKhenThuongChiTietFlatRow(row: Record<string, unknown>): MttqKhenThuongChiTietFlatRow {
  const qd = pickEmbedded<Record<string, unknown>>(row.qd);
  const nv = pickEmbedded<{ id_phong_ban?: string | number | null }>(qd?.nguoi_tao);
  const ct = flattenCtRow(row);

  return {
    id: String(row.id),
    id_khen_thuong: String(row.id_khen_thuong ?? qd?.id ?? ''),
    so_qd: String(qd?.so_qd ?? ''),
    ngay_khen_thuong: dateOnly(qd?.ngay_khen_thuong),
    don_vi_de_xuat: nullableStr(qd?.don_vi_de_xuat),
    trang_thai: String(qd?.trang_thai ?? 'Mới') as MttqKhenThuongChiTietFlatRow['trang_thai'],
    tg_cap_nhat_qd: String(qd?.tg_cap_nhat ?? ''),
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
    id_nguoi_tao: String(qd?.id_nguoi_tao ?? ''),
    can_bo_id: ct.can_bo_id,
    ten_can_bo: ct.ten_can_bo ?? null,
    cap_khen_thuong: ct.cap_khen_thuong,
    hinh_thuc_khen: ct.hinh_thuc_khen,
    danh_hieu: ct.danh_hieu,
    noi_dung_khen: ct.noi_dung_khen,
    ho_so_khen: ct.ho_so_khen,
    can_bo_don_vi_id: ct.can_bo_don_vi_id ?? null,
  };
}

export function flattenFullRow(row: Record<string, unknown>): MttqKhenThuong {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
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
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
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

  // Batch để giảm round-trip: 1 delete (in-list) + N update từng dòng + 1 insert.
  const baseOf = (line: MttqKhenThuongFormValues['chi_tiet'][number]) => ({
    can_bo_id: Number(line.can_bo_id),
    cap_khen_thuong: line.cap_khen_thuong,
    hinh_thuc_khen: line.hinh_thuc_khen,
    danh_hieu: line.danh_hieu,
    noi_dung_khen: line.noi_dung_khen?.trim() ?? null,
    ho_so_khen: line.ho_so_khen?.trim() ?? null,
  });
  const toUpdateExisting = lines
    .filter((l) => isPersistedChildId(l.id))
    .map((l) => ({ id: Number(l.id), id_khen_thuong: Number(parentId), ...baseOf(l) }));
  const toInsertNew = lines
    .filter((l) => !isPersistedChildId(l.id))
    .map((l) => ({ id_khen_thuong: Number(parentId), ...baseOf(l) }));

  if (toDelete.length > 0) {
    const { error: e2 } = await q().delete().in('id', toDelete);
    if (e2) handleSupabaseError(e2);
  }
  // Không dùng `.upsert(..., onConflict: 'id')`: cột `id` là GENERATED ALWAYS AS IDENTITY —
  // PostgREST vẫn tạo INSERT có `id` → Postgres trả 400 ("cannot insert a non-DEFAULT value into column \"id\"").
  // Cập nhật từng dòng đã persist bằng `.update().eq('id', id)`.
  for (const row of toUpdateExisting) {
    const { id, ...patch } = row;
    const { error: e3 } = await q().update(patch).eq('id', id);
    if (e3) handleSupabaseError(e3);
  }
  if (toInsertNew.length > 0) {
    const { error: e4 } = await q().insert(toInsertNew);
    if (e4) handleSupabaseError(e4);
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
      cap_khen_thuong: line.cap_khen_thuong,
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
      const kids = mockChildren.filter((c) => c.id_khen_thuong === p.id);
      const rewarded_can_bo_don_vi_ids: string[] = [];
      const hinhSet = new Set<MttqKhenThuongHinhThuc>();
      const danhSet = new Set<MttqKhenThuongDanhHieu>();
      for (const c of kids) {
        const dv = c.can_bo_don_vi_id?.toString().trim();
        if (dv) rewarded_can_bo_don_vi_ids.push(dv);
        hinhSet.add(c.hinh_thuc_khen);
        danhSet.add(c.danh_hieu);
      }
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
        id_phong_ban_nguoi_tao: p.id_phong_ban_nguoi_tao ?? null,
        so_dong: kids.length,
        rewarded_can_bo_don_vi_ids,
        hinh_thuc_trong_qd: [...hinhSet].sort((a, b) => a.localeCompare(b)),
        danh_hieu_trong_qd: [...danhSet].sort((a, b) => a.localeCompare(b)),
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
      .map((c) => ({
        ...c,
        ten_can_bo: null as string | null,
        can_bo_don_vi_id: c.can_bo_don_vi_id ?? null,
      }));
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
      id_phong_ban_nguoi_tao: null,
    });
    syncChildrenMock(id, data.chi_tiet);
    const full = await getMttqKhenThuongById(id);
    if (!full) throw new Error(txt('matTranKhenThuong.service.notFound'));
    return full;
  }

  // Chỉ trả `id, tg_cap_nhat` — `getById` ngay sau đó nạp full row, không cần payload rộng.
  const inserted = await repo.insert(
    {
      ...headerPayload(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<ParentRepoRow, 'id'>,
    { returningSelect: 'id,tg_cap_nhat' },
  );
  const parentId = String((inserted as { id?: unknown }).id ?? '');
  await syncChildrenSupabase(parentId, data.chi_tiet);
  const full = await getMttqKhenThuongById(parentId);
  if (!full) throw new Error(txt('matTranKhenThuong.service.notFound'));
  return full;
}

export async function updateMttqKhenThuong(id: string, data: MttqKhenThuongFormValues): Promise<MttqKhenThuong> {
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

  // Narrow returning — `getById` ngay sau đó vẫn cấp full row cho UI.
  await repo.update(id, headerPayload(data) as unknown as Partial<ParentRepoRow>, {
    returningSelect: 'id,tg_cap_nhat',
  });
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
        cap_khen_thuong: c.cap_khen_thuong,
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
      'id, id_khen_thuong, cap_khen_thuong, hinh_thuc_khen, danh_hieu, noi_dung_khen, ho_so_khen, mttq_khen_thuong!inner(id, so_qd, ngay_khen_thuong, trang_thai)',
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
      cap_khen_thuong: String(row.cap_khen_thuong ?? 'Xã') as MttqKhenThuongLineForCanBo['cap_khen_thuong'],
      hinh_thuc_khen: String(row.hinh_thuc_khen) as MttqKhenThuongLineForCanBo['hinh_thuc_khen'],
      danh_hieu: String(row.danh_hieu) as MttqKhenThuongLineForCanBo['danh_hieu'],
      noi_dung_khen: nullableStr(row.noi_dung_khen),
      ho_so_khen: nullableStr(row.ho_so_khen),
    };
  });
  mapped.sort((a, b) => (b.ngay_khen_thuong || '').localeCompare(a.ngay_khen_thuong || ''));
  return mapped;
}

/** Toàn bộ dòng CT (client filter/sort). */
export async function getMttqKhenThuongChiTietFlatList(): Promise<MttqKhenThuongChiTietFlatRow[]> {
  if (!isSupabase()) {
    const rows: Record<string, unknown>[] = [];
    for (const c of mockChildren) {
      const p = mockParents.find((x) => x.id === c.id_khen_thuong);
      if (!p) continue;
      rows.push({
        id: c.id,
        id_khen_thuong: c.id_khen_thuong,
        can_bo_id: c.can_bo_id,
        cap_khen_thuong: c.cap_khen_thuong,
        hinh_thuc_khen: c.hinh_thuc_khen,
        danh_hieu: c.danh_hieu,
        noi_dung_khen: c.noi_dung_khen,
        ho_so_khen: c.ho_so_khen,
        qd: mockQdEmbedFromParent(p),
        can_bo: {
          ho_ten: `Cán bộ ${c.can_bo_id}`,
          don_vi_id: c.can_bo_don_vi_id ?? null,
        },
      });
    }
    return rows.map((r) => flattenKhenThuongChiTietFlatRow(r));
  }

  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mttq_khen_thuong_ct')
    .select(MTTQ_KHEN_THUONG_CT_SELECT_FLAT_LIST)
    .order('id', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenKhenThuongChiTietFlatRow(row as unknown as Record<string, unknown>));
}
