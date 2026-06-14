import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import type {
  MttqLopTapHuan,
  MttqLopTapHuanCt,
  MttqLopTapHuanListRow,
  MttqTapHuanChiTietFlatRow,
} from '../core/types';
import type { MttqTapHuanFormValues } from '../core/schema';
import type { MttqTapHuanCap, MttqTapHuanThuocDien } from '../core/constants';
import {
  MTTQ_LOP_TAP_HUAN_CT_SELECT_FLAT_LIST,
  MTTQ_LOP_TAP_HUAN_SELECT_FULL,
  MTTQ_LOP_TAP_HUAN_SELECT_LIST,
} from '../core/supabase-select';
import {
  tapHuanCanBoThreeColFromSource,
  tapHuanSnapshotFromSource,
  tapHuanSnapshotSourceFromPostgrestCanBoEmbed,
} from '../utils/snapshot-from-can-bo';

type ParentRepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<ParentRepoRow>({
  tableName: 'mttq_lop_tap_huan',
  select: MTTQ_LOP_TAP_HUAN_SELECT_LIST,
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
  const s = String(v).trim();
  return s === '' ? null : s;
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

function hoTenFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ho_ten?: unknown }>(v);
  const t = o?.ho_ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

function tenDonViFromXaEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown; var_ssn_tinh_thanh?: unknown }>(v);
  if (!o) return null;
  const xa = o.ten;
  const tinhO = pickEmbedded<{ ten?: unknown }>(o.var_ssn_tinh_thanh);
  const tinh = tinhO?.ten;
  const xs = xa != null && String(xa).trim() !== '' ? String(xa).trim() : '';
  const ts = tinh != null && String(tinh).trim() !== '' ? String(tinh).trim() : '';
  if (!xs && !ts) return null;
  if (xs && ts) return `${xs} – ${ts}`;
  return xs || ts || null;
}

function tenToChucFromEmbed(v: unknown): string | null {
  const o = pickEmbedded<{ ten?: unknown }>(v);
  const t = o?.ten;
  return t != null && String(t).trim() !== '' ? String(t) : null;
}

function chucVuCapQuanLyFromCanBoEmbed(canBo: Record<string, unknown> | undefined): string | null {
  if (!canBo) return null;
  const raw = canBo.cap_quan_ly;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  if (raw.includes('Tỉnh')) return 'Tỉnh';
  if (raw.includes('Xã phường')) return 'Xã phường';
  return null;
}

export function flattenCtRow(
  row: Record<string, unknown>,
  toChucTenById?: ReadonlyMap<string, string>,
): MttqLopTapHuanCt {
  const canBo = pickEmbedded<Record<string, unknown>>(row.can_bo);
  const src = tapHuanSnapshotSourceFromPostgrestCanBoEmbed(canBo, toChucTenById);
  const three = tapHuanCanBoThreeColFromSource(src);
  const snap = tapHuanSnapshotFromSource(src);
  const cv = three.ten_chuc_vu.trim() ? three.ten_chuc_vu : null;
  const toChuc = three.ten_to_chuc.trim() ? three.ten_to_chuc : null;
  const pb = three.ten_phong_ban.trim() ? three.ten_phong_ban : null;
  const dv = snap.don_vi_cong_tac.trim() ? snap.don_vi_cong_tac : null;
  return {
    id: String(row.id),
    id_lop_tap_huan: String(row.id_lop_tap_huan),
    can_bo_id: String(row.can_bo_id),
    chuc_vu: cv,
    ten_to_chuc: toChuc,
    ten_phong_ban: pb,
    don_vi_cong_tac: dv,
    thuoc_dien: String(row.thuoc_dien) as MttqTapHuanThuocDien,
    ten_can_bo: hoTenFromEmbed(canBo),
    can_bo_don_vi_id: canBo ? nullableId(canBo.don_vi_id) : null,
    ten_don_vi_can_bo: tenDonViFromXaEmbed(canBo?.don_vi),
    chuc_vu_cap_quan_ly: chucVuCapQuanLyFromCanBoEmbed(canBo),
  };
}

/** Dòng `mttq_lop_tap_huan_ct` + embed `lop` + `can_bo` (tab Danh sách chi tiết / Supabase). */
export function flattenChiTietFlatRow(
  row: Record<string, unknown>,
  toChucTenById?: ReadonlyMap<string, string>,
): MttqTapHuanChiTietFlatRow {
  const lop = pickEmbedded<Record<string, unknown>>(row.lop);
  const nv = pickEmbedded<{ id_phong_ban?: string | number | null }>(lop?.nguoi_tao);
  const ct = flattenCtRow(row, toChucTenById);
  const tenDonViLop = lop ? tenDonViFromXaEmbed(lop.don_vi) : null;

  return {
    id: String(row.id),
    id_lop_tap_huan: String(row.id_lop_tap_huan ?? lop?.id ?? ''),
    ten_lop_tap_huan: String(lop?.ten_lop_tap_huan ?? ''),
    nam_tap_huan: toInt(lop?.nam_tap_huan),
    cap_tap_huan: String(lop?.cap_tap_huan ?? 'Cấp tỉnh') as MttqTapHuanCap,
    don_vi_id: lop ? nullableId(lop.don_vi_id) : null,
    ten_don_vi_lop: tenDonViLop,
    tg_cap_nhat_lop: String(lop?.tg_cap_nhat ?? ''),
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
    can_bo_id: ct.can_bo_id,
    ten_can_bo: ct.ten_can_bo ?? null,
    ten_to_chuc: ct.ten_to_chuc ?? null,
    ten_phong_ban: ct.ten_phong_ban ?? null,
    chuc_vu: ct.chuc_vu,
    ten_don_vi_can_bo: ct.ten_don_vi_can_bo ?? null,
    can_bo_don_vi_id: ct.can_bo_don_vi_id ?? null,
    chuc_vu_cap_quan_ly: ct.chuc_vu_cap_quan_ly ?? null,
    thuoc_dien: ct.thuoc_dien,
  };
}

function flattenListRow(row: Record<string, unknown>): MttqLopTapHuanListRow {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
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

  const tenDonViLop = tenDonViFromXaEmbed(row.don_vi);
  const tenToChucLop = tenToChucFromEmbed(row.to_chuc);
  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.mttq_lop_tap_huan_ct;
  delete rest.don_vi;
  delete rest.to_chuc;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    ten_lop_tap_huan: String(r.ten_lop_tap_huan ?? ''),
    nam_tap_huan: toInt(r.nam_tap_huan),
    cap_tap_huan: String(r.cap_tap_huan ?? 'Cấp tỉnh') as MttqTapHuanCap,
    don_vi_id: nullableId(r.don_vi_id),
    ten_don_vi: tenDonViLop,
    to_chuc_id: nullableId(r.to_chuc_id),
    ten_to_chuc: tenToChucLop,
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

/** Chuyển bản ghi FULL (có chi_tiet) sang dòng bảng danh sách. */
export function mttqLopTapHuanToListRow(row: MttqLopTapHuan): MttqLopTapHuanListRow {
  const { chi_tiet, ...rest } = row;
  return { ...rest, so_dong: chi_tiet?.length ?? 0 };
}

async function buildToChucTenByIdMap(): Promise<Map<string, string>> {
  const all = await getMttqThietLapAll();
  return new Map(
    all.filter((x) => x.loai === 'to_chuc').map((x) => [String(x.id), x.ten]),
  );
}

export function flattenFullRow(
  row: Record<string, unknown>,
  toChucTenById?: ReadonlyMap<string, string>,
): MttqLopTapHuan {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
  const rawCt = row.mttq_lop_tap_huan_ct;
  const chi_tiet: MttqLopTapHuanCt[] = Array.isArray(rawCt)
    ? rawCt.map((x) => flattenCtRow(x as Record<string, unknown>, toChucTenById))
    : [];

  const tenDonViLop = tenDonViFromXaEmbed(row.don_vi);
  const tenToChucLop = tenToChucFromEmbed(row.to_chuc);
  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.mttq_lop_tap_huan_ct;
  delete rest.don_vi;
  delete rest.to_chuc;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    ten_lop_tap_huan: String(r.ten_lop_tap_huan ?? ''),
    nam_tap_huan: toInt(r.nam_tap_huan),
    cap_tap_huan: String(r.cap_tap_huan ?? 'Cấp tỉnh') as MttqTapHuanCap,
    don_vi_id: nullableId(r.don_vi_id),
    ten_don_vi: tenDonViLop,
    to_chuc_id: nullableId(r.to_chuc_id),
    ten_to_chuc: tenToChucLop,
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
    don_vi_id: x.don_vi_id == null || String(x.don_vi_id).trim() === '' ? null : String(x.don_vi_id),
    to_chuc_id: x.to_chuc_id == null || String(x.to_chuc_id).trim() === '' ? null : String(x.to_chuc_id),
    chi_tiet: x.chi_tiet.map((c) => ({
      ...c,
      id: String(c.id),
      id_lop_tap_huan: String(c.id_lop_tap_huan),
      can_bo_id: String(c.can_bo_id),
    })),
  };
}

function headerPayload(data: MttqTapHuanFormValues) {
  const cap = String(data.cap_tap_huan ?? '').trim() as MttqTapHuanCap;
  const donViId =
    cap === 'Cấp xã' && data.don_vi_id.trim() !== '' ? data.don_vi_id.trim() : null;
  return {
    ten_lop_tap_huan: data.ten_lop_tap_huan.trim(),
    nam_tap_huan: data.nam_tap_huan,
    cap_tap_huan: cap,
    don_vi_id: donViId,
    to_chuc_id: data.to_chuc_id.trim(),
    ghi_chu: data.ghi_chu?.trim() ?? null,
  };
}

function headerPayloadForDb(data: MttqTapHuanFormValues): Record<string, unknown> {
  const h = headerPayload(data);
  return {
    ...h,
    don_vi_id: h.don_vi_id != null ? Number(h.don_vi_id) : null,
    to_chuc_id: Number(h.to_chuc_id),
  };
}

async function syncChildrenSupabase(parentId: string, lines: MttqTapHuanFormValues['chi_tiet']) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  const q = () => supabase.from('mttq_lop_tap_huan_ct');

  const { data: existing, error: e1 } = await q().select('id').eq('id_lop_tap_huan', parentId);
  if (e1) handleSupabaseError(e1);

  const keep = new Set(lines.map((l) => l.id).filter(isPersistedChildId));
  const existingIds = (existing ?? []).map((r) => String(r.id));
  const toDelete = existingIds.filter((id: string) => !keep.has(id));

  const baseOf = (line: MttqTapHuanFormValues['chi_tiet'][number]) => ({
    can_bo_id: Number(line.can_bo_id),
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
  for (const row of toUpsertExisting) {
    const { id, ...patch } = row;
    const { error: e3 } = await q().update(patch).eq('id', id);
    if (e3) handleSupabaseError(e3);
  }
  if (toInsertNew.length > 0) {
    const { error: e4 } = await q().insert(toInsertNew);
    if (e4) handleSupabaseError(e4);
  }
}

export async function getMttqLopTapHuanList(): Promise<MttqLopTapHuanListRow[]> {
  const list = await repo.getAll({ orderBy: 'nam_tap_huan', ascending: false });
  return list.map((row) => flattenListRow(row as unknown as Record<string, unknown>));
}

/** Toàn bộ dòng CT (client filter/sort). Nếu dữ liệu rất lớn: chuyển phân trang + order trên `mttq_lop_tap_huan_ct`. */
export async function getMttqLopTapHuanChiTietFlatList(): Promise<MttqTapHuanChiTietFlatRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const [{ data, error }, toChucById] = await Promise.all([
    supabase
      .from('mttq_lop_tap_huan_ct')
      .select(MTTQ_LOP_TAP_HUAN_CT_SELECT_FLAT_LIST)
      .order('id', { ascending: true }),
    buildToChucTenByIdMap(),
  ]);
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) =>
    flattenChiTietFlatRow(row as unknown as Record<string, unknown>, toChucById),
  );
}

function sortTapHuanChiTietFlatByLopDesc(rows: MttqTapHuanChiTietFlatRow[]): MttqTapHuanChiTietFlatRow[] {
  const out = [...rows];
  out.sort((a, b) => {
    if (a.nam_tap_huan !== b.nam_tap_huan) return b.nam_tap_huan - a.nam_tap_huan;
    const cmpTen = (b.ten_lop_tap_huan || '').localeCompare(a.ten_lop_tap_huan || '', undefined, {
      sensitivity: 'base',
    });
    if (cmpTen !== 0) return cmpTen;
    return (b.id || '').localeCompare(a.id || '');
  });
  return out;
}

/** Các dòng `mttq_lop_tap_huan_ct` của một cán bộ + thông tin lớp (cùng select với danh sách chi tiết). */
export async function getMttqLopTapHuanChiTietFlatListForCanBoId(canBoId: string): Promise<MttqTapHuanChiTietFlatRow[]> {
  const id = String(canBoId ?? '').trim();
  if (!id) return [];

  const supabase = getSupabase();
  if (!supabase) return [];
  const canBoKey = /^\d+$/.test(id) ? Number(id) : id;
  const [{ data, error }, toChucById] = await Promise.all([
    supabase
      .from('mttq_lop_tap_huan_ct')
      .select(MTTQ_LOP_TAP_HUAN_CT_SELECT_FLAT_LIST)
      .eq('can_bo_id', canBoKey)
      .order('id', { ascending: false }),
    buildToChucTenByIdMap(),
  ]);
  if (error) handleSupabaseError(error);
  const mapped = (data ?? []).map((row) =>
    flattenChiTietFlatRow(row as unknown as Record<string, unknown>, toChucById),
  );
  return sortTapHuanChiTietFlatByLopDesc(mapped);
}

export async function getMttqLopTapHuanById(id: string): Promise<MttqLopTapHuan | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const [{ data, error }, toChucById] = await Promise.all([
    supabase
      .from('mttq_lop_tap_huan')
      .select(MTTQ_LOP_TAP_HUAN_SELECT_FULL)
      .eq('id', id)
      .maybeSingle(),
    buildToChucTenByIdMap(),
  ]);
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return normalizeFull(flattenFullRow(data as unknown as Record<string, unknown>, toChucById));
}

export async function createMttqLopTapHuan(
  data: MttqTapHuanFormValues,
  idNguoiTao: string,
): Promise<MttqLopTapHuan> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranTapHuan.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    {
      ...headerPayloadForDb(data),
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
  await repo.update(id, headerPayloadForDb(data) as unknown as Partial<ParentRepoRow>, {
    returningSelect: 'id,tg_cap_nhat',
  });
  await syncChildrenSupabase(id, data.chi_tiet);
  const full = await getMttqLopTapHuanById(id);
  if (!full) throw new Error(txt('matTranTapHuan.service.notFound'));
  return full;
}

export async function deleteMttqLopTapHuanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}
