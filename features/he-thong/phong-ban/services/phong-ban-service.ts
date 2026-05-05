import { Department } from '../core/types';
import { DepartmentFormValues } from '../core/schema';
import { MOCK_DEPARTMENTS } from '@/mocks/he-thong';
import { createRepository } from '@/lib/data/create-repository';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import {
  DEPARTMENT_RETURNING_FULL,
  DEPARTMENT_RETURNING_STATUS_ONLY,
  DEPARTMENT_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '../../../../lib/text';

const repo = createRepository<Department>({
  tableName: 'he_thong_phong_ban',
  mockData: MOCK_DEPARTMENTS,
  select: DEPARTMENT_SELECT_FULL,
  delay: 600,
});

function buildPathAndLevel(
  id: string,
  chaId: string | null,
  all: Department[]
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
  return list;
};

export const createDepartment = async (data: DepartmentFormValues): Promise<Department> => {
  const all = await repo.getAll();
  const id = `dep-${Date.now()}`;
  const chaId = data.cha_id === '' || data.cha_id == null ? null : data.cha_id;
  const { duong_dan, cap_do } = buildPathAndLevel(id, chaId, all);
  const now = new Date().toISOString();
  const newDep = await repo.insert(
    {
    id,
    ma_phong_ban: data.ma_phong_ban,
    ten_phong_ban: data.ten_phong_ban,
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
  return newDep;
};

export const updateDepartment = async (id: string, data: DepartmentFormValues): Promise<Department> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('department.service.notFound'));

  const all = await repo.getAll();
  const chaId = data.cha_id === '' || data.cha_id == null ? null : data.cha_id;
  let { duong_dan, cap_do } = buildPathAndLevel(id, chaId, all);
  if (chaId === existing.cha_id) {
    duong_dan = existing.duong_dan;
    cap_do = existing.cap_do;
  }

  return repo.update(
    id,
    {
    ...data,
    cha_id: chaId,
    trang_thai: data.trang_thai,
    duong_dan,
    cap_do,
    tg_cap_nhat: new Date().toISOString(),
    },
    { returningSelect: DEPARTMENT_RETURNING_FULL },
  );
};

export const updateDepartmentStatus = async (id: string, status: TrangThaiHoatDong): Promise<Department> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('department.service.notFound'));
  return repo.update(
    id,
    { trang_thai: status, tg_cap_nhat: new Date().toISOString() },
    { returningSelect: DEPARTMENT_RETURNING_STATUS_ONLY },
  );
};

export const deleteDepartment = async (id: string): Promise<void> => {
  const all = await repo.getAll();
  const hasChildren = all.some((d) => d.cha_id === id);
  if (hasChildren) throw new Error(txt('department.service.hasChildren'));
  await repo.remove([id]);
};

/** Import nhiều phòng ban (chỉ thêm mới, cha_id = null hoặc id có sẵn) */
export const importDepartments = async (
  rows: DepartmentFormValues[]
): Promise<{ created: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;
  for (let i = 0; i < rows.length; i++) {
    try {
      const data = rows[i];
      const idCha = data.cha_id === '' || data.cha_id == null ? null : data.cha_id;
      if (idCha) {
        const all = await repo.getAll();
        if (!all.some((d) => d.id === idCha)) {
          errors.push(`Dòng ${i + 2}: Phòng cha không tồn tại`);
          continue;
        }
      }
      await createDepartment({ ...data, cha_id: idCha ?? undefined });
      created++;
    } catch (e: unknown) {
      errors.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : 'Lỗi'}`);
    }
  }
  return { created, errors };
};
