import { createRepository } from '@/lib/data/create-repository';
import type { MttqThietLap, MttqThietLapLoai } from '../core/types';
import type { MttqThietLapFormValues } from '../core/schema';
import { MTTQ_THIET_LAP_RETURNING_FULL, MTTQ_THIET_LAP_SELECT_FULL } from '../core/supabase-select';
import { txt } from '@/lib/text';

const repo = createRepository<MttqThietLap>({
  tableName: 'mttq_thiet_lap',
  select: MTTQ_THIET_LAP_SELECT_FULL,
});

function normalize(raw: MttqThietLap): MttqThietLap {
  const thu = raw.thu_tu;
  return {
    ...raw,
    id: String(raw.id),
    loai: raw.loai as MttqThietLapLoai,
    thu_tu: typeof thu === 'number' ? thu : Number(thu) || 0,
    mo_ta: raw.mo_ta ?? null,
  };
}

export const getMttqThietLapAll = async (): Promise<MttqThietLap[]> => {
  const list = await repo.getAll({ orderBy: 'loai', ascending: true });
  const sorted = [...list].sort((a, b) => {
    const la = String(a.loai).localeCompare(String(b.loai));
    if (la !== 0) return la;
    const ta = typeof a.thu_tu === 'number' ? a.thu_tu : Number(a.thu_tu);
    const tb = typeof b.thu_tu === 'number' ? b.thu_tu : Number(b.thu_tu);
    return ta - tb;
  });
  return sorted.map((r) => normalize(r as MttqThietLap));
};

export const getMttqThietLapByLoai = async (loai: MttqThietLapLoai): Promise<MttqThietLap[]> => {
  const all = await getMttqThietLapAll();
  return all.filter((x) => x.loai === loai);
};

export const createMttqThietLap = async (data: MttqThietLapFormValues): Promise<MttqThietLap> => {
  const now = new Date().toISOString();
  const ten = data.ten.trim();
  const moTa = data.mo_ta != null && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;

  const inserted = await repo.insert(
    {
      loai: data.loai,
      ten,
      mo_ta: moTa,
      thu_tu: data.thu_tu ?? 0,
      tg_tao: now,
      tg_cap_nhat: now,
    } as Omit<MttqThietLap, 'id'>,
    { returningSelect: MTTQ_THIET_LAP_RETURNING_FULL },
  );
  return normalize(inserted as MttqThietLap);
};

export const updateMttqThietLap = async (id: string, data: MttqThietLapFormValues): Promise<MttqThietLap> => {
  // Bỏ tiền-fetch `getById`: nếu id sai, `repo.update` throw lỗi PostgREST.
  const ten = data.ten.trim();
  const moTa = data.mo_ta != null && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;

  const updated = await repo.update(
    id,
    {
      loai: data.loai,
      ten,
      mo_ta: moTa,
      thu_tu: data.thu_tu ?? 0,
      tg_cap_nhat: new Date().toISOString(),
    } as Partial<MttqThietLap>,
    { returningSelect: MTTQ_THIET_LAP_RETURNING_FULL },
  );
  return normalize(updated as MttqThietLap);
};

export const deleteMttqThietLap = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};
