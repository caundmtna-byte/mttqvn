import { createRepository } from '@/lib/data/create-repository';
import type { BaiVietTheLoai } from '../core/types';
import type { TheLoaiFormValues } from '../core/schema';
import { THE_LOAI_RETURNING_FULL, THE_LOAI_SELECT_FULL } from '../core/supabase-select';
import { txt } from '@/lib/text';

const repo = createRepository<BaiVietTheLoai>({
  tableName: 'bai_viet_thiet_lap_the_loai',
  select: THE_LOAI_SELECT_FULL,
  delay: 400,
});

function normalizeTheLoai(raw: BaiVietTheLoai): BaiVietTheLoai {
  const dg = raw.don_gia;
  const num = typeof dg === 'number' ? dg : Number(dg);
  return {
    ...raw,
    id: String(raw.id),
    don_gia: Number.isFinite(num) ? num : 0,
    mo_ta: raw.mo_ta ?? null,
  };
}

export const getTheLoais = async (): Promise<BaiVietTheLoai[]> => {
  const list = await repo.getAll({ orderBy: 'ten_the_loai', ascending: true });
  return list.map((r) => normalizeTheLoai(r as BaiVietTheLoai));
};

export const createTheLoai = async (data: TheLoaiFormValues): Promise<BaiVietTheLoai> => {
  const now = new Date().toISOString();
  const ten = data.ten_the_loai.trim();
  const moTa = data.mo_ta != null && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;
  const donGia = data.don_gia ?? 0;

  const payload = {
    ten_the_loai: ten,
    mo_ta: moTa,
    don_gia: donGia,
    tg_tao: now,
    tg_cap_nhat: now,
  };

  const inserted = await repo.insert(payload as Omit<BaiVietTheLoai, 'id'>, {
    returningSelect: THE_LOAI_RETURNING_FULL,
  });
  return normalizeTheLoai(inserted as BaiVietTheLoai);
};

export const updateTheLoai = async (id: string, data: TheLoaiFormValues): Promise<BaiVietTheLoai> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('articleSettings.service.notFoundTheLoai'));

  const ten = data.ten_the_loai.trim();
  const moTa = data.mo_ta != null && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;
  const donGia = data.don_gia ?? 0;

  const updated = await repo.update(
    id,
    {
      ten_the_loai: ten,
      mo_ta: moTa,
      don_gia: donGia,
      tg_cap_nhat: new Date().toISOString(),
    } as Partial<BaiVietTheLoai>,
    { returningSelect: THE_LOAI_RETURNING_FULL },
  );
  return normalizeTheLoai(updated as BaiVietTheLoai);
};

export const deleteTheLoais = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};
