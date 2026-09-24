import { createRepository } from '@/lib/data/create-repository';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TinhThanh, XaPhuong } from '../core/types';
import type { TinhThanhFormValues, XaPhuongFormValues } from '../core/schema';
import { TINH_THANH_SELECT_FULL, XA_PHUONG_SELECT_FULL } from '../core/supabase-select';

function normTinh(row: Record<string, unknown>): TinhThanh {
  return {
    id: String(row.id),
    ten: String(row.ten ?? ''),
    thu_tu: Number(row.thu_tu ?? 0),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

function normXa(row: Record<string, unknown>): XaPhuong {
  return {
    id: String(row.id),
    id_tinh_thanh: String(row.id_tinh_thanh ?? ''),
    ten: String(row.ten ?? ''),
    thu_tu: Number(row.thu_tu ?? 0),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

const tinhRepo = createRepository<TinhThanh>({
  tableName: 'var_ssn_tinh_thanh',
  select: TINH_THANH_SELECT_FULL,
});

const xaRepo = createRepository<XaPhuong>({
  tableName: 'var_ssn_xa_phuong',
  select: XA_PHUONG_SELECT_FULL,
});

const XA_COUNT_PAGE = 2000;

/** Đếm số xã/phường theo từng id tỉnh — dùng RPC GROUP BY phía DB thay vì paginate toàn bảng. */
async function getXaCountsByTinhThanhId(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');
  const { data, error } = await supabase.rpc('get_xa_counts_by_tinh_thanh');
  if (error) handleSupabaseError(error);
  for (const r of (data ?? []) as { id_tinh_thanh: string; so_xa: number }[]) {
    const id = String(r.id_tinh_thanh ?? '');
    if (!id) continue;
    counts.set(id, Number(r.so_xa) || 0);
  }
  return counts;
}

export async function getTinhThanhList(): Promise<TinhThanh[]> {
  const [list, xaCounts] = await Promise.all([
    tinhRepo.getAll({ orderBy: 'thu_tu', ascending: true }),
    getXaCountsByTinhThanhId(),
  ]);
  return list.map((r) => {
    const t = normTinh(r as unknown as Record<string, unknown>);
    const c = xaCounts.get(t.id) ?? 0;
    return { ...t, so_xa_phuong: c };
  });
}

export async function getXaPhuongByTinhThanh(idTinhThanh: string): Promise<XaPhuong[]> {
  if (!idTinhThanh.trim()) return [];
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured.');
  const { data, error } = await supabase
    .from('var_ssn_xa_phuong')
    .select(XA_PHUONG_SELECT_FULL)
    .eq('id_tinh_thanh', idTinhThanh)
    .order('thu_tu', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((r) => normXa(r as Record<string, unknown>));
}

/**
 * In-memory cache cho `getXaPhuongAll`. Bảng xã/phường VN ~10k+ rows nên kéo full
 * mỗi lần là rất tốn egress. Cache 24h vì xã/phường thay đổi rất hiếm — invalidate
 * thủ công sau create/update/delete trong cùng service (`invalidateXaPhuongAllCache`).
 *
 * Trước đây import 200 ủy viên = 200 lần fetch full bảng. Sau cache: 1 lần / 24h.
 */
const XA_PHUONG_ALL_TTL_MS = 24 * 60 * 60 * 1000;
/**
 * Cache RAM là chưa đủ: biến module mất sạch mỗi lần reload trang, nên mỗi lần F5
 * là lại kéo ~10k dòng. Mirror xuống localStorage để TTL 24h thật sự có hiệu lực
 * qua các phiên. Dữ liệu địa giới là công khai, không phải dữ liệu người dùng.
 */
const XA_PHUONG_ALL_STORAGE_KEY = 'mttq-xa-phuong-all-v1';
/** Quá ngưỡng này thì chỉ giữ cache RAM — tránh chiếm hết quota localStorage (~5MB). */
const XA_PHUONG_ALL_MAX_PERSIST_BYTES = 2 * 1024 * 1024;

let xaPhuongAllCache: { data: XaPhuong[]; expiresAt: number } | null = null;
let xaPhuongAllInflight: Promise<XaPhuong[]> | null = null;

function readXaPhuongAllFromStorage(): { data: XaPhuong[]; expiresAt: number } | null {
  try {
    const raw = window.localStorage.getItem(XA_PHUONG_ALL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: unknown; expiresAt?: unknown };
    if (!Array.isArray(parsed.data) || typeof parsed.expiresAt !== 'number') return null;
    return { data: parsed.data as XaPhuong[], expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeXaPhuongAllToStorage(entry: { data: XaPhuong[]; expiresAt: number }) {
  try {
    const serialized = JSON.stringify(entry);
    if (serialized.length > XA_PHUONG_ALL_MAX_PERSIST_BYTES) return;
    window.localStorage.setItem(XA_PHUONG_ALL_STORAGE_KEY, serialized);
  } catch {
    // Quota đầy / trình duyệt chặn storage — cache RAM vẫn hoạt động.
  }
}

function invalidateXaPhuongAllCache() {
  xaPhuongAllCache = null;
  xaPhuongAllInflight = null;
  try {
    window.localStorage.removeItem(XA_PHUONG_ALL_STORAGE_KEY);
  } catch {
    // bỏ qua
  }
}

/** Toàn bộ xã/phường (mọi tỉnh), dùng khi tab xã không lọc theo tỉnh + import resolver. */
export async function getXaPhuongAll(): Promise<XaPhuong[]> {
  const now = Date.now();
  if (xaPhuongAllCache && xaPhuongAllCache.expiresAt > now) {
    return xaPhuongAllCache.data;
  }
  const persisted = readXaPhuongAllFromStorage();
  if (persisted && persisted.expiresAt > now) {
    xaPhuongAllCache = persisted;
    return persisted.data;
  }
  if (xaPhuongAllInflight) return xaPhuongAllInflight;

  xaPhuongAllInflight = (async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client is not configured.');
    const out: XaPhuong[] = [];
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('var_ssn_xa_phuong')
        .select(XA_PHUONG_SELECT_FULL)
        .order('id_tinh_thanh', { ascending: true })
        .order('thu_tu', { ascending: true })
        .range(from, from + XA_COUNT_PAGE - 1);
      if (error) handleSupabaseError(error);
      const rows = data ?? [];
      if (rows.length === 0) break;
      for (const r of rows) out.push(normXa(r as Record<string, unknown>));
      if (rows.length < XA_COUNT_PAGE) break;
      from += XA_COUNT_PAGE;
    }
    xaPhuongAllCache = { data: out, expiresAt: Date.now() + XA_PHUONG_ALL_TTL_MS };
    writeXaPhuongAllToStorage(xaPhuongAllCache);
    return out;
  })();

  try {
    return await xaPhuongAllInflight;
  } finally {
    xaPhuongAllInflight = null;
  }
}

export async function getTinhThanhById(id: string): Promise<TinhThanh | null> {
  const row = await tinhRepo.getById(id);
  return row ? normTinh(row as unknown as Record<string, unknown>) : null;
}

/** Form → cột DB. Dùng chung cho form và nhập file. */
export function tinhThanhFormToPayload(values: TinhThanhFormValues): Record<string, unknown> {
  return { ten: values.ten.trim(), thu_tu: values.thu_tu };
}

export function xaPhuongFormToPayload(values: XaPhuongFormValues): Record<string, unknown> {
  return {
    id_tinh_thanh: values.id_tinh_thanh.trim(),
    ten: values.ten.trim(),
    thu_tu: values.thu_tu,
  };
}

export async function createTinhThanh(values: TinhThanhFormValues): Promise<TinhThanh> {
  const inserted = await tinhRepo.insert(tinhThanhFormToPayload(values) as never);
  return normTinh(inserted as unknown as Record<string, unknown>);
}

export async function updateTinhThanh(id: string, values: TinhThanhFormValues): Promise<TinhThanh> {
  const updated = await tinhRepo.update(id, tinhThanhFormToPayload(values) as never);
  return normTinh(updated as unknown as Record<string, unknown>);
}

/** Ghi đè từ file: chỉ các cột có trong `payload`. */
export async function updateTinhThanhPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  await tinhRepo.update(id, payload as never, { returningSelect: 'id' });
}

export async function deleteTinhThanhMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await tinhRepo.remove(ids);
  // DB xoá theo xã/phường của tỉnh (cascade), nên cache xã cũng phải bỏ —
  // không thì lần đọc sau trả về các xã đã chết từ cache 24h.
  invalidateXaPhuongAllCache();
}

export async function createXaPhuong(values: XaPhuongFormValues): Promise<XaPhuong> {
  const inserted = await xaRepo.insert(xaPhuongFormToPayload(values) as never);
  invalidateXaPhuongAllCache();
  return normXa(inserted as unknown as Record<string, unknown>);
}

export async function updateXaPhuong(id: string, values: XaPhuongFormValues): Promise<XaPhuong> {
  const updated = await xaRepo.update(id, xaPhuongFormToPayload(values) as never);
  invalidateXaPhuongAllCache();
  return normXa(updated as unknown as Record<string, unknown>);
}

/** Ghi đè từ file: chỉ các cột có trong `payload`. */
export async function updateXaPhuongPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  await xaRepo.update(id, payload as never, { returningSelect: 'id' });
  invalidateXaPhuongAllCache();
}

export async function deleteXaPhuongMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await xaRepo.remove(ids);
  invalidateXaPhuongAllCache();
}
