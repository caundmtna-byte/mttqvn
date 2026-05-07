import { Department } from '../core/types';
import { DepartmentFormValues } from '../core/schema';
import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import {
  DEPARTMENT_RETURNING_FULL,
  DEPARTMENT_RETURNING_STATUS_ONLY,
  DEPARTMENT_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '../../../../lib/text';

const repo = createRepository<Department>({
  tableName: 'var_phong_ban',
  select: DEPARTMENT_SELECT_FULL,
  delay: 600,
});

/** Chuẩn hoá id / FK int8 từ PostgREST (number hoặc chuỗi số). */
function normalizeDepartmentRow(raw: Department): Department {
  return {
    ...raw,
    id: String(raw.id),
    cha_id: raw.cha_id == null || raw.cha_id === '' ? null : String(raw.cha_id),
    cap_do: typeof raw.cap_do === 'number' ? raw.cap_do : Number(raw.cap_do),
    thu_tu: typeof raw.thu_tu === 'number' ? raw.thu_tu : Number(raw.thu_tu),
  };
}

function normInt8Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^\d+$/.test(s)) return null;
  return Number(s);
}

/** cha_id lưu DB: Supabase dùng int8; mock giữ chuỗi (vd dep-0). */
function chaIdForStorage(chaId: string | null): string | number | null {
  if (chaId == null || chaId === '') return null;
  if (isSupabase()) return normInt8Fk(chaId);
  return chaId;
}

function resolveChaIdForm(dataCha: string | null | undefined): string | null {
  if (dataCha === '' || dataCha == null) return null;
  return String(dataCha).trim();
}

function buildPathAndLevel(
  id: string,
  chaId: string | null,
  all: Department[],
): { duong_dan: string; cap_do: number } {
  let duong_dan = `/${id}`;
  let cap_do = 1;
  if (chaId) {
    const parent = all.find((d) => d.id === chaId);
    if (parent) {
      duong_dan = `${parent.duong_dan}/${id}`;
      cap_do = parent.cap_do + 1;
    }
  }
  return { duong_dan, cap_do };
}

export const getDepartments = async (): Promise<Department[]> => {
  const list = await repo.getAll({ orderBy: 'duong_dan', ascending: true });
  return list.map((row) => normalizeDepartmentRow(row as Department));
};

export const createDepartment = async (data: DepartmentFormValues): Promise<Department> => {
  const now = new Date().toISOString();
  const chaId = resolveChaIdForm(data.cha_id);
  const ten = data.ten_phong_ban.trim();

  if (isSupabase()) {
    const inserted = await repo.insert(
      {
        ten_phong_ban: ten,
        mo_ta: data.mo_ta && data.mo_ta.trim() !== '' ? data.mo_ta.trim() : null,
        cha_id: normInt8Fk(chaId ?? undefined),
        trang_thai: data.trang_thai,
        thu_tu: data.thu_tu ?? 0,
        duong_dan: '',
        cap_do: 0,
        tg_tao: now,
        tg_cap_nhat: now,
      } as unknown as Omit<Department, 'id'> & { id?: string },
      { returningSelect: DEPARTMENT_RETURNING_FULL },
    );
    return normalizeDepartmentRow(inserted as Department);
  }

  const all = (await repo.getAll()).map((d) => normalizeDepartmentRow(d as Department));
  const id = `dep-${Date.now()}`;
  const { duong_dan, cap_do } = buildPathAndLevel(id, chaId, all);
  const newDep = await repo.insert(
    {
      id,
      ten_phong_ban: ten,
      mo_ta: data.mo_ta,
      cha_id: chaId,
      trang_thai: data.trang_thai,
      thu_tu: data.thu_tu ?? 0,
      duong_dan,
      cap_do,
      tg_tao: now,
      tg_cap_nhat: now,
    } as Omit<Department, 'id'> & { id: string },
    { returningSelect: DEPARTMENT_RETURNING_FULL },
  );
  return normalizeDepartmentRow(newDep as Department);
};

export const updateDepartment = async (id: string, data: DepartmentFormValues): Promise<Department> => {
  const existingRaw = await repo.getById(id);
  if (!existingRaw) throw new Error(txt('department.service.notFound'));
  const existing = normalizeDepartmentRow(existingRaw as Department);

  const all = (await repo.getAll()).map((d) => normalizeDepartmentRow(d as Department));
  const chaId = resolveChaIdForm(data.cha_id);
  let { duong_dan, cap_do } = buildPathAndLevel(id, chaId, all);
  if (chaId === existing.cha_id) {
    duong_dan = existing.duong_dan;
    cap_do = existing.cap_do;
  }

  const ten = data.ten_phong_ban.trim();
  const updated = await repo.update(
    id,
    {
      ten_phong_ban: ten,
      mo_ta: data.mo_ta && data.mo_ta.trim() !== '' ? data.mo_ta.trim() : null,
      cha_id: chaIdForStorage(chaId),
      trang_thai: data.trang_thai,
      thu_tu: data.thu_tu ?? 0,
      duong_dan,
      cap_do,
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<Department>,
    { returningSelect: DEPARTMENT_RETURNING_FULL },
  );
  return normalizeDepartmentRow(updated as Department);
};

export const updateDepartmentStatus = async (id: string, status: TrangThaiHoatDong): Promise<Department> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('department.service.notFound'));
  const updated = await repo.update(
    id,
    { trang_thai: status, tg_cap_nhat: new Date().toISOString() } as unknown as Partial<Department>,
    { returningSelect: DEPARTMENT_RETURNING_STATUS_ONLY },
  );
  return normalizeDepartmentRow(updated as Department);
};

export const deleteDepartment = async (id: string): Promise<void> => {
  const all = (await repo.getAll()).map((d) => normalizeDepartmentRow(d as Department));
  const hasChildren = all.some((d) => d.cha_id === id);
  if (hasChildren) throw new Error(txt('department.service.hasChildren'));
  await repo.remove([id]);
};

/** Import nhiều phòng ban (chỉ thêm mới, cha_id = null hoặc id có sẵn) */
export const importDepartments = async (
  rows: DepartmentFormValues[],
): Promise<{ created: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;
  const all = await getDepartments(); // fetch 1 lần cho toàn bộ import
  for (let i = 0; i < rows.length; i++) {
    try {
      const data = rows[i];
      const idCha = resolveChaIdForm(data.cha_id);
      if (idCha && !all.some((d) => d.id === idCha)) {
        errors.push(`Dòng ${i + 2}: Phòng cha không tồn tại`);
        continue;
      }
      await createDepartment({ ...data, cha_id: idCha ?? undefined });
      created++;
    } catch (e: unknown) {
      errors.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : 'Lỗi'}`);
    }
  }
  return { created, errors };
};
