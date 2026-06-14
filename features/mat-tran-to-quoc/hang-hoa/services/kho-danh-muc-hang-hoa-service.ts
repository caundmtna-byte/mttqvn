import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getErrorMessage } from '@/lib/utils';
import type { KhoDanhMucHangHoaDetail, KhoDanhMucHangHoaListRow } from '../core/types';
import type { KhoDanhMucHangHoaFormValues } from '../core/schema';
import { KHO_DANH_MUC_HANG_HOA_RETURNING, KHO_DANH_MUC_HANG_HOA_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_danh_muc_hang_hoa',
  select: KHO_DANH_MUC_HANG_HOA_SELECT,
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

export function normalizeDanhMucRow(row: Record<string, unknown>): KhoDanhMucHangHoaListRow {
  const thu = row.thu_tu;
  return {
    id: String(row.id ?? ''),
    ten_danh_muc: String(row.ten_danh_muc ?? ''),
    mo_ta: nullableStr(row.mo_ta),
    thu_tu: typeof thu === 'number' ? thu : Number(thu) || 0,
    trang_thai: String(row.trang_thai ?? 'Đang hoạt động'),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

function formDanhMucToPayload(data: KhoDanhMucHangHoaFormValues) {
  const moTaRaw = data.mo_ta != null ? String(data.mo_ta).trim() : '';
  return {
    ten_danh_muc: data.ten_danh_muc.trim(),
    mo_ta: moTaRaw === '' ? null : moTaRaw,
    thu_tu: data.thu_tu ?? 0,
    trang_thai: data.trang_thai,
  };
}

export async function getKhoDanhMucHangHoaList(): Promise<KhoDanhMucHangHoaListRow[]> {
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  return list.map((row) => normalizeDanhMucRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDanhMucHangHoaById(id: string): Promise<KhoDanhMucHangHoaDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_danh_muc_hang_hoa')
    .select(KHO_DANH_MUC_HANG_HOA_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return normalizeDanhMucRow(data as unknown as Record<string, unknown>);
}

export async function createKhoDanhMucHangHoa(data: KhoDanhMucHangHoaFormValues): Promise<KhoDanhMucHangHoaListRow> {
  const payload = formDanhMucToPayload(data);
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DANH_MUC_HANG_HOA_RETURNING,
  });
  return normalizeDanhMucRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDanhMucHangHoa(id: string, data: KhoDanhMucHangHoaFormValues): Promise<KhoDanhMucHangHoaListRow> {
  const payload = formDanhMucToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DANH_MUC_HANG_HOA_RETURNING,
  });
  return normalizeDanhMucRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDanhMucHangHoaMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    await repo.remove(ids);
  } catch (e) {
    const msg = getErrorMessage(e);
    if (/23503|foreign key|violates foreign key|is still referenced/i.test(msg)) {
      throw new Error(txt('matTranHangHoa.service.deleteDanhMucBlocked'));
    }
    throw e;
  }
}
