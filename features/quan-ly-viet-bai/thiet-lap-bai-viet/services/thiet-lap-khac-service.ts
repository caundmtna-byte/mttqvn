import { createRepository } from '@/lib/data/create-repository';
import type { BaiVietThietLapKhac, BaiVietThietLapKhacLoai } from '../core/types';
import type { ThietLapKhacFormValues } from '../core/schema';
import {
  THIET_LAP_KHAC_RETURNING_FULL,
  THIET_LAP_KHAC_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '@/lib/text';

const repo = createRepository<BaiVietThietLapKhac>({
  tableName: 'bai_viet_thiet_lap_khac',
  select: THIET_LAP_KHAC_SELECT_FULL,
  delay: 400,
});

function normalizeKhac(raw: BaiVietThietLapKhac): BaiVietThietLapKhac {
  const thu = raw.thu_tu;
  return {
    ...raw,
    id: String(raw.id),
    loai: raw.loai as BaiVietThietLapKhacLoai,
    thu_tu: typeof thu === 'number' ? thu : Number(thu) || 0,
    mo_ta: raw.mo_ta ?? null,
  };
}

export const getThietLapKhacAll = async (): Promise<BaiVietThietLapKhac[]> => {
  const list = await repo.getAll({ orderBy: 'loai', ascending: true });
  const sorted = [...list].sort((a, b) => {
    const la = String(a.loai).localeCompare(String(b.loai));
    if (la !== 0) return la;
    const ta = typeof a.thu_tu === 'number' ? a.thu_tu : Number(a.thu_tu);
    const tb = typeof b.thu_tu === 'number' ? b.thu_tu : Number(b.thu_tu);
    return ta - tb;
  });
  return sorted.map((r) => normalizeKhac(r as BaiVietThietLapKhac));
};

export const getThietLapKhacByLoai = async (loai: BaiVietThietLapKhacLoai): Promise<BaiVietThietLapKhac[]> => {
  const all = await getThietLapKhacAll();
  return all.filter((x) => x.loai === loai);
};

export const createThietLapKhac = async (data: ThietLapKhacFormValues): Promise<BaiVietThietLapKhac> => {
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
    } as Omit<BaiVietThietLapKhac, 'id'>,
    { returningSelect: THIET_LAP_KHAC_RETURNING_FULL },
  );
  return normalizeKhac(inserted as BaiVietThietLapKhac);
};

export const updateThietLapKhac = async (id: string, data: ThietLapKhacFormValues): Promise<BaiVietThietLapKhac> => {
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
    } as Partial<BaiVietThietLapKhac>,
    { returningSelect: THIET_LAP_KHAC_RETURNING_FULL },
  );
  return normalizeKhac(updated as BaiVietThietLapKhac);
};

export const deleteThietLapKhac = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};
