import { Position } from '../core/types';
import type { PositionFormValues } from '../core/schema';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { getJobLevels } from '../../cap-bac/services/cap-bac-service';
import { createRepository } from '@/lib/data/create-repository';
import {
  POSITION_RETURNING_FULL,
  POSITION_RETURNING_STATUS_ONLY,
  POSITION_SELECT_FULL,
} from '../core/supabase-select';

const repo = createRepository<Position>({
  tableName: 'var_chuc_vu',
  select: POSITION_SELECT_FULL,
});

function pickEmbedded<T>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function flattenSupabaseRow(row: Record<string, unknown>): Position {
  const phongBan = pickEmbedded<{ ten_phong_ban?: string }>(row.var_phong_ban);
  const rest = { ...row };
  delete rest.var_phong_ban;
  return {
    ...rest,
    ten_phong_ban: phongBan?.ten_phong_ban,
  } as Position;
}

/** Chuẩn hoá cap_bac (int2 từ PostgREST: number / bigint / chuỗi số) → chuỗi hiển thị/lưu form. */
function normalizeCapBacFromApi(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (typeof raw === 'bigint') return String(raw);
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(Math.trunc(raw));
  const s = String(raw).trim();
  if (s === '') return null;
  if (/^-?\d+$/.test(s)) return s;
  return s;
}

function normalizePositionRow(raw: Position): Position {
  return {
    ...raw,
    id: String(raw.id),
    phong_ban_id: raw.phong_ban_id == null || raw.phong_ban_id === '' ? null : String(raw.phong_ban_id),
    cap_bac: normalizeCapBacFromApi(raw.cap_bac as unknown),
    thu_tu: typeof raw.thu_tu === 'number' ? raw.thu_tu : Number(raw.thu_tu),
  };
}

function normInt8Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^\d+$/.test(s)) return null;
  return Number(s);
}

function normInt16Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < -32768 || n > 32767) return null;
  return n;
}

async function enrichPosition(raw: Position): Promise<Position> {
  const base = normalizePositionRow(raw);
  const levels = await getJobLevels();
  const capKey = base.cap_bac != null && String(base.cap_bac).trim() !== '' ? String(base.cap_bac).trim() : '';
  const ten_cap =
    capKey !== ''
      ? levels.find((l) => String(l.id).trim() === capKey)?.ten_cap_bac
      : undefined;
  return {
    ...base,
    ten_cap_bac: ten_cap ?? base.ten_cap_bac,
  };
}

export const getPositions = async (): Promise<Position[]> => {
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  const flattened = (list as unknown as Record<string, unknown>[]).map((r) => flattenSupabaseRow(r));
  return Promise.all((flattened as Position[]).map(enrichPosition));
};

/** Form → cột DB (không có mốc thời gian). Dùng chung cho form và nhập file. */
export function positionFormToPayload(data: PositionFormValues): Record<string, unknown> {
  const moTa = data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;
  return {
    ten_chuc_vu: data.ten_chuc_vu.trim(),
    mo_ta: moTa,
    cap_bac: normInt16Fk(data.cap_bac ?? undefined),
    phong_ban_id: normInt8Fk(data.phong_ban_id ?? undefined),
    thu_tu: data.thu_tu ?? 0,
    trang_thai: data.trang_thai,
  };
}

export const createPosition = async (data: PositionFormValues): Promise<Position> => {
  const now = new Date().toISOString();
  const inserted = await repo.insert(
    { ...positionFormToPayload(data), tg_tao: now, tg_cap_nhat: now } as unknown as Omit<Position, 'id'> & {
      id?: string;
    },
    { returningSelect: POSITION_RETURNING_FULL },
  );
  const flat = flattenSupabaseRow(inserted as unknown as Record<string, unknown>);
  return enrichPosition(flat);
};

export const updatePosition = async (id: string, data: PositionFormValues): Promise<Position> => {
  const payload = {
    ...positionFormToPayload(data),
    tg_cap_nhat: new Date().toISOString(),
  } as unknown as Partial<Position>;

  const updated = await repo.update(id, payload, { returningSelect: POSITION_RETURNING_FULL });
  const flat = flattenSupabaseRow(updated as unknown as Record<string, unknown>);
  return enrichPosition(flat as Position);
};

/** Ghi đè từ file: chỉ các cột có trong `payload`, không đọc lại cả bản ghi. */
export async function updatePositionPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  await repo.update(
    id,
    { ...payload, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<Position>,
    { returningSelect: 'id' },
  );
}

export const updatePositionStatus = async (ids: string[], status: TrangThaiHoatDong): Promise<Position | undefined> => {
  const now = new Date().toISOString();
  const results = await Promise.all(
    ids.map((id) =>
      repo.update(
        id,
        { trang_thai: status, tg_cap_nhat: now },
        { returningSelect: POSITION_RETURNING_STATUS_ONLY },
      ),
    ),
  );
  if (ids.length !== 1) return undefined;
  const result = flattenSupabaseRow(results[0] as unknown as Record<string, unknown>);
  return enrichPosition(result);
};

export const deletePositions = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};
