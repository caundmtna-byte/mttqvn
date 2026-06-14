import { createRepository } from '@/lib/data/create-repository';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TinhThanh, XaPhuong } from '../core/types';
import type { TinhThanhFormValues, XaPhuongFormValues } from '../core/schema';
import { tinhThanhSchema, xaPhuongSchema } from '../core/schema';
import { txt } from '@/lib/text';
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
let xaPhuongAllCache: { data: XaPhuong[]; expiresAt: number } | null = null;
let xaPhuongAllInflight: Promise<XaPhuong[]> | null = null;

function invalidateXaPhuongAllCache() {
  xaPhuongAllCache = null;
  xaPhuongAllInflight = null;
}

/** Toàn bộ xã/phường (mọi tỉnh), dùng khi tab xã không lọc theo tỉnh + import resolver. */
export async function getXaPhuongAll(): Promise<XaPhuong[]> {
  const now = Date.now();
  if (xaPhuongAllCache && xaPhuongAllCache.expiresAt > now) {
    return xaPhuongAllCache.data;
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

export async function createTinhThanh(values: TinhThanhFormValues): Promise<TinhThanh> {
  const payload = { ten: values.ten.trim(), thu_tu: values.thu_tu };
  const inserted = await tinhRepo.insert(payload as never);
  return normTinh(inserted as unknown as Record<string, unknown>);
}

export async function updateTinhThanh(id: string, values: TinhThanhFormValues): Promise<TinhThanh> {
  const updated = await tinhRepo.update(id, { ten: values.ten.trim(), thu_tu: values.thu_tu } as never);
  return normTinh(updated as unknown as Record<string, unknown>);
}

export async function deleteTinhThanhMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await tinhRepo.remove(ids);
}

export async function createXaPhuong(values: XaPhuongFormValues): Promise<XaPhuong> {
  const payload = {
    id_tinh_thanh: values.id_tinh_thanh.trim(),
    ten: values.ten.trim(),
    thu_tu: values.thu_tu,
  };
  const inserted = await xaRepo.insert(payload as never);
  invalidateXaPhuongAllCache();
  return normXa(inserted as unknown as Record<string, unknown>);
}

export async function updateXaPhuong(id: string, values: XaPhuongFormValues): Promise<XaPhuong> {
  const updated = await xaRepo.update(id, {
    id_tinh_thanh: values.id_tinh_thanh.trim(),
    ten: values.ten.trim(),
    thu_tu: values.thu_tu,
  } as never);
  invalidateXaPhuongAllCache();
  return normXa(updated as unknown as Record<string, unknown>);
}

export async function deleteXaPhuongMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await xaRepo.remove(ids);
  invalidateXaPhuongAllCache();
}

function numCell(row: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    if (row[k] === undefined || row[k] === null || row[k] === '') continue;
    const n = Number(row[k]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

/** Import CSV: cột `ten`, `thu_tu` (chỉ thêm mới; trùng tên trong file hoặc DB → bỏ qua dòng + lỗi). */
export async function importTinhThanhRows(
  rows: Record<string, unknown>[],
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  const list = await getTinhThanhList();
  const seenLower = new Set(list.map((t) => t.ten.trim().toLowerCase()));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ten = String(row.ten ?? row.Ten ?? '').trim();
    const thu_tu = numCell(row, 'thu_tu', 'ThuTu', 'thuTu', 'order');
    if (!ten) {
      errors.push(txt('diaBan.import.rowEmptyTenTinh', { row: String(i + 2) }));
      continue;
    }
    const parsed = tinhThanhSchema.safeParse({ ten, thu_tu });
    if (!parsed.success) {
      errors.push(
        txt('diaBan.import.rowInvalidTinh', {
          row: String(i + 2),
          detail: parsed.error.issues[0]?.message ?? '',
        }),
      );
      continue;
    }
    if (seenLower.has(parsed.data.ten.toLowerCase())) {
      errors.push(txt('diaBan.import.rowDupTenTinh', { row: String(i + 2), ten: parsed.data.ten }));
      continue;
    }
    try {
      await createTinhThanh(parsed.data);
      seenLower.add(parsed.data.ten.toLowerCase());
      created++;
    } catch (e: unknown) {
      errors.push(
        txt('diaBan.import.rowError', {
          row: String(i + 2),
          detail: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }
  return { created, errors };
}

/**
 * Import CSV xã: bắt buộc `ten`; `id_tinh_thanh` (số) hoặc `ten_tinh` / `tinh` (tên khớp danh mục tỉnh).
 */
export async function importXaPhuongRows(
  rows: Record<string, unknown>[],
  tinhList: TinhThanh[],
): Promise<{ created: number; errors: string[] }> {
  const errors: string[] = [];
  let created = 0;
  const tinhByName = new Map(tinhList.map((t) => [t.ten.trim().toLowerCase(), t.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ten = String(row.ten ?? row.Ten ?? '').trim();
    const thu_tu = numCell(row, 'thu_tu', 'ThuTu', 'thuTu', 'order');
    if (!ten) {
      errors.push(txt('diaBan.import.rowEmptyTenXa', { row: String(i + 2) }));
      continue;
    }

    const rawId = row.id_tinh_thanh ?? row.id_tinh ?? row.ma_tinh;
    let id_tinh_thanh = rawId != null && String(rawId).trim() !== '' ? String(rawId).trim() : '';

    if (!id_tinh_thanh || !tinhList.some((t) => t.id === id_tinh_thanh)) {
      const nameHint = String(row.ten_tinh ?? row.tinh_thanh ?? row.tinh ?? row.Tinh ?? '').trim().toLowerCase();
      const fromName = nameHint ? tinhByName.get(nameHint) : undefined;
      if (fromName) id_tinh_thanh = fromName;
    }

    if (!id_tinh_thanh || !tinhList.some((t) => t.id === id_tinh_thanh)) {
      errors.push(txt('diaBan.import.rowMissingTinhXa', { row: String(i + 2) }));
      continue;
    }

    const parsed = xaPhuongSchema.safeParse({ id_tinh_thanh, ten, thu_tu });
    if (!parsed.success) {
      errors.push(
        txt('diaBan.import.rowInvalidXa', {
          row: String(i + 2),
          detail: parsed.error.issues[0]?.message ?? '',
        }),
      );
      continue;
    }

    try {
      await createXaPhuong(parsed.data);
      created++;
    } catch (e: unknown) {
      errors.push(
        txt('diaBan.import.rowError', {
          row: String(i + 2),
          detail: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }
  return { created, errors };
}
