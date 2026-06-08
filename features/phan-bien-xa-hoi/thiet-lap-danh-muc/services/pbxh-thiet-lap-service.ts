import { createRepository } from '@/lib/data/create-repository';
import type { PbxhThietLap, PbxhThietLapLoai } from '../core/types';
import type { PbxhThietLapFormValues } from '../core/schema';
import { PBXH_THIET_LAP_RETURNING_FULL, PBXH_THIET_LAP_SELECT_FULL } from '../core/supabase-select';

const repo = createRepository<PbxhThietLap>({
  tableName: 'pbxh_thiet_lap',
  select: PBXH_THIET_LAP_SELECT_FULL,
  delay: 400,
});

function normalize(raw: PbxhThietLap): PbxhThietLap {
  const thu = raw.thu_tu;
  return {
    ...raw,
    id: String(raw.id),
    loai: raw.loai as PbxhThietLapLoai,
    thu_tu: typeof thu === 'number' ? thu : Number(thu) || 0,
    mo_ta: raw.mo_ta ?? null,
  };
}

export const getPbxhThietLapAll = async (): Promise<PbxhThietLap[]> => {
  const list = await repo.getAll({ orderBy: 'loai', ascending: true });
  const sorted = [...list].sort((a, b) => {
    const la = String(a.loai).localeCompare(String(b.loai));
    if (la !== 0) return la;
    const ta = typeof a.thu_tu === 'number' ? a.thu_tu : Number(a.thu_tu);
    const tb = typeof b.thu_tu === 'number' ? b.thu_tu : Number(b.thu_tu);
    return ta - tb;
  });
  return sorted.map((r) => normalize(r as PbxhThietLap));
};

export const getPbxhThietLapByLoai = async (loai: PbxhThietLapLoai): Promise<PbxhThietLap[]> => {
  const all = await getPbxhThietLapAll();
  return all.filter((x) => x.loai === loai);
};

export const createPbxhThietLap = async (data: PbxhThietLapFormValues): Promise<PbxhThietLap> => {
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
    } as Omit<PbxhThietLap, 'id'>,
    { returningSelect: PBXH_THIET_LAP_RETURNING_FULL },
  );
  return normalize(inserted as PbxhThietLap);
};

export const updatePbxhThietLap = async (id: string, data: PbxhThietLapFormValues): Promise<PbxhThietLap> => {
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
    } as Partial<PbxhThietLap>,
    { returningSelect: PBXH_THIET_LAP_RETURNING_FULL },
  );
  return normalize(updated as PbxhThietLap);
};

export const deletePbxhThietLap = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};
