import { Position } from '../core/types';
import { PositionFormValues, positionSchema } from '../core/schema';
import { parseTrangThaiHoatDongImport, type TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { getJobLevels } from '../../cap-bac/services/cap-bac-service';
import { getDepartments } from '../../phong-ban/services/phong-ban-service';
import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import {
  POSITION_RETURNING_FULL,
  POSITION_RETURNING_STATUS_ONLY,
  POSITION_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '../../../../lib/text';

const repo = createRepository<Position>({
  tableName: 'var_chuc_vu',
  select: POSITION_SELECT_FULL,
  delay: 600,
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
  if (!isSupabase()) {
    const depts = await getDepartments();
    return {
      ...base,
      ten_cap_bac: ten_cap ?? base.ten_cap_bac,
      ten_phong_ban: depts.find((d) => d.id === base.phong_ban_id)?.ten_phong_ban ?? base.ten_phong_ban,
    };
  }
  return {
    ...base,
    ten_cap_bac: ten_cap ?? base.ten_cap_bac,
  };
}

export const getPositions = async (): Promise<Position[]> => {
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  const flattened = isSupabase()
    ? (list as unknown as Record<string, unknown>[]).map((r) => flattenSupabaseRow(r))
    : list;
  return Promise.all((flattened as Position[]).map(enrichPosition));
};

export const createPosition = async (data: PositionFormValues): Promise<Position> => {
  const now = new Date().toISOString();
  const ten = data.ten_chuc_vu.trim();
  const moTa = data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;

  if (isSupabase()) {
    const inserted = await repo.insert(
      {
        ten_chuc_vu: ten,
        mo_ta: moTa,
        cap_bac: normInt16Fk(data.cap_bac ?? undefined),
        phong_ban_id: normInt8Fk(data.phong_ban_id ?? undefined),
        thu_tu: data.thu_tu ?? 0,
        trang_thai: data.trang_thai,
        tg_tao: now,
        tg_cap_nhat: now,
      } as unknown as Omit<Position, 'id'> & { id?: string },
      { returningSelect: POSITION_RETURNING_FULL },
    );
    const flat = flattenSupabaseRow(inserted as unknown as Record<string, unknown>);
    return enrichPosition(flat);
  }

  const id = `pos-${Date.now()}`;
  const inserted = await repo.insert(
    {
      id,
      ten_chuc_vu: ten,
      cap_bac: data.cap_bac && String(data.cap_bac).trim() !== '' ? String(data.cap_bac).trim() : null,
      phong_ban_id: data.phong_ban_id && String(data.phong_ban_id).trim() !== '' ? String(data.phong_ban_id).trim() : null,
      mo_ta: moTa,
      thu_tu: data.thu_tu ?? 0,
      trang_thai: data.trang_thai,
      tg_tao: now,
      tg_cap_nhat: now,
    } as Omit<Position, 'id'> & { id: string },
    { returningSelect: POSITION_RETURNING_FULL },
  );
  return enrichPosition(inserted as Position);
};

export const updatePosition = async (id: string, data: PositionFormValues): Promise<Position> => {
  const existingRaw = await repo.getById(id);
  if (!existingRaw) throw new Error(txt('position.service.notFound'));
  const existing = isSupabase()
    ? normalizePositionRow(flattenSupabaseRow(existingRaw as unknown as Record<string, unknown>))
    : (existingRaw as Position);

  const ten = data.ten_chuc_vu.trim();
  const moTa = data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;

  const payload = isSupabase()
    ? ({
        ten_chuc_vu: ten,
        mo_ta: moTa,
        cap_bac: normInt16Fk(data.cap_bac ?? undefined),
        phong_ban_id: normInt8Fk(data.phong_ban_id ?? undefined),
        thu_tu: data.thu_tu ?? existing.thu_tu,
        trang_thai: data.trang_thai,
        tg_cap_nhat: new Date().toISOString(),
      } as unknown as Partial<Position>)
    : ({
        ten_chuc_vu: ten,
        mo_ta: moTa,
        cap_bac: data.cap_bac && String(data.cap_bac).trim() !== '' ? String(data.cap_bac).trim() : null,
        phong_ban_id:
          data.phong_ban_id && String(data.phong_ban_id).trim() !== '' ? String(data.phong_ban_id).trim() : null,
        thu_tu: data.thu_tu ?? existing.thu_tu,
        trang_thai: data.trang_thai,
        tg_cap_nhat: new Date().toISOString(),
      } as Partial<Position>);

  const updated = await repo.update(id, payload, { returningSelect: POSITION_RETURNING_FULL });
  const flat = isSupabase() ? flattenSupabaseRow(updated as unknown as Record<string, unknown>) : updated;
  return enrichPosition(flat as Position);
};

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
  let result = results[0] as Position;
  if (isSupabase()) result = flattenSupabaseRow(result as unknown as Record<string, unknown>);
  return enrichPosition(result);
};

export const deletePositions = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};

/** Import nhiều chức vụ (chỉ thêm mới). Cột: ten_chuc_vu; cấp bậc: cap_bac | ma_cap_bac | cap_bac_id (legacy); phòng ban: phong_ban_id | ten_phong_ban; mo_ta, thu_tu, trang_thai */
export const importPositions = async (
  rows: Record<string, unknown>[]
): Promise<{ created: number; errors: string[] }> => {
  const levels = await getJobLevels();
  const depts = await getDepartments();
  const errors: string[] = [];
  let created = 0;

  const resolveCapId = (raw: unknown): string | null => {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    const byId = levels.find((l) => l.id === s);
    if (byId) return byId.id;
    const up = s.toUpperCase();
    const byMa = levels.find((l) => l.ma_cap_bac?.toUpperCase() === up);
    return byMa?.id ?? null;
  };

  const resolveDeptId = (raw: unknown): string | null => {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    const byId = depts.find((d) => d.id === s);
    if (byId) return byId.id;
    const key = s.toLowerCase();
    const byTen = depts.find((d) => (d.ten_phong_ban ?? '').trim().toLowerCase() === key);
    return byTen?.id ?? null;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ten_chuc_vu = String(row.ten_chuc_vu ?? '').trim();
    if (!ten_chuc_vu) {
      errors.push(`Dòng ${i + 2}: Thiếu tên chức vụ`);
      continue;
    }

    const capRaw = row.cap_bac ?? row['cap_bac_id'] ?? row.ma_cap_bac;
    const pbRaw = row.phong_ban_id ?? row.ten_phong_ban;
    const resolvedCapBac = resolveCapId(capRaw);
    const phong_ban_id = resolveDeptId(pbRaw);
    if (!resolvedCapBac) {
      errors.push(
        `Dòng ${i + 2}: ${capRaw != null && String(capRaw).trim() !== '' ? 'Không tìm thấy cấp bậc (mã hoặc id)' : txt('position.validation.levelRequired')}`,
      );
      continue;
    }
    if (!phong_ban_id) {
      errors.push(
        `Dòng ${i + 2}: ${pbRaw != null && String(pbRaw).trim() !== '' ? 'Không tìm thấy phòng ban (tên hoặc id)' : txt('position.validation.departmentRequired')}`,
      );
      continue;
    }

    const parsed = positionSchema.safeParse({
      ten_chuc_vu,
      cap_bac: resolvedCapBac,
      phong_ban_id,
      mo_ta: row.mo_ta != null ? String(row.mo_ta) : '',
      thu_tu: row.thu_tu != null && String(row.thu_tu).trim() !== '' ? Number(row.thu_tu) : 0,
      trang_thai: parseTrangThaiHoatDongImport(row.trang_thai),
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      errors.push(`Dòng ${i + 2}: ${msg}`);
      continue;
    }

    try {
      await createPosition({
        ...parsed.data,
        mo_ta: parsed.data.mo_ta?.trim() || null,
      });
      created++;
    } catch (e: unknown) {
      errors.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : 'Lỗi'}`);
    }
  }

  return { created, errors };
};