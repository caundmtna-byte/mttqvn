import type { TrangThaiNhanVien } from '../core/constants';
import { Employee } from '../core/types';
import { EmployeeFormValues } from '../core/schema';
import { getPositions } from '../../chuc-vu/services/chuc-vu-service';
import { getDepartments } from '../../phong-ban/services/phong-ban-service';
import { getBranches } from '../../chi-nhanh/services/chi-nhanh-service';
import { MOCK_EMPLOYEES } from '../../../../mocks/he-thong';
import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { EMPLOYEES_LIST_QUERY_PARAMS } from '@/lib/query-keys';
import { txt } from '../../../../lib/text';
import { getAvatarUrl } from '../../../../lib/utils';
import {
  EMPLOYEE_RETURNING_FULL,
  EMPLOYEE_RETURNING_STATUS_ONLY,
  EMPLOYEE_SELECT_FULL,
} from '../core/supabase-select';

const now = () => new Date().toISOString();
const CURRENT_USER = 'admin'; // TODO: lấy từ auth context khi có hệ thống xác thực

const mockSeed: Employee[] = MOCK_EMPLOYEES.map((emp) => ({
  ...emp,
  created_at: emp.ngay_vao_lam ? new Date(emp.ngay_vao_lam).toISOString() : '2024-01-01T00:00:00.000Z',
  updated_at: '2025-01-15T08:30:00.000Z',
  created_by: 'system',
  updated_by: 'system',
}));

const repo = createRepository<Employee>({
  tableName: 'he_thong_nhan_vien',
  mockData: mockSeed,
  select: EMPLOYEE_SELECT_FULL,
  delay: 600,
});

export type GetEmployeesParams = {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
};

/** Flatten Supabase relation response to Employee shape */
function flattenSupabaseRow(row: Record<string, unknown>): Employee {
  const phongBan = row.he_thong_phong_ban as { ten_phong_ban?: string } | null | undefined;
  const chucVu = row.he_thong_chuc_vu as { ten_chuc_vu?: string } | null | undefined;
  const chiNhanh = row.he_thong_chi_nhanh as { ten_chi_nhanh?: string } | null | undefined;
  const {
    he_thong_phong_ban: _he_thong_phong_ban,
    he_thong_chuc_vu: _he_thong_chuc_vu,
    he_thong_chi_nhanh: _he_thong_chi_nhanh,
    ...rest
  } = row;
  return {
    ...rest,
    ten_phong_ban: phongBan?.ten_phong_ban,
    ten_chuc_vu: chucVu?.ten_chuc_vu,
    ten_chi_nhanh: chiNhanh?.ten_chi_nhanh,
  } as Employee;
}

/** Enrich with display names: from Supabase relation (already in row) or from mock lookup */
async function enrichEmployee(raw: Employee): Promise<Employee> {
  if (isSupabase()) {
    return raw; // already flattened in getAll/getById
  }
  const [positions, depts, branches] = await Promise.all([
    getPositions(),
    getDepartments(),
    getBranches(),
  ]);
  return {
    ...raw,
    ten_phong_ban: depts.find((d) => d.id === raw.phong_ban_id)?.ten_phong_ban,
    ten_chuc_vu: positions.find((p) => p.id === raw.chuc_vu_id)?.ten_chuc_vu,
    ten_chi_nhanh: branches.find((b) => b.id === raw.chi_nhanh_id)?.ten_chi_nhanh,
  };
}

export const getEmployees = async (params: GetEmployeesParams = {}): Promise<Employee[]> => {
  const limit = params.limit ?? EMPLOYEES_LIST_QUERY_PARAMS.limit;
  const offset = params.offset ?? EMPLOYEES_LIST_QUERY_PARAMS.offset;
  const orderBy = params.orderBy ?? EMPLOYEES_LIST_QUERY_PARAMS.orderBy;
  const ascending = params.ascending ?? EMPLOYEES_LIST_QUERY_PARAMS.ascending;
  const list = await repo.getAll({ limit, offset, orderBy, ascending });
  const flattened = isSupabase()
    ? (list as unknown as Record<string, unknown>[]).map(flattenSupabaseRow)
    : list;
  const enriched = await Promise.all(flattened.map(enrichEmployee));
  return enriched;
};

export const getEmployeeById = async (id: string): Promise<Employee | undefined> => {
  const row = await repo.getById(id);
  if (!row) return undefined;
  const flat = isSupabase()
    ? flattenSupabaseRow(row as unknown as Record<string, unknown>)
    : row;
  return enrichEmployee(flat);
};

export const createEmployee = async (data: EmployeeFormValues): Promise<Employee> => {
  const id = `EMP-${Date.now()}`;
  const timestamp = now();
  const inserted = await repo.insert(
    {
    id,
    ma_nhan_vien: data.ma_nhan_vien,
    ho_ten: data.ho_ten,
    email: data.email,
    so_dien_thoai: data.so_dien_thoai,
    phong_ban_id: data.phong_ban_id ?? null,
    chuc_vu_id: data.chuc_vu_id ?? null,
    chi_nhanh_id: data.chi_nhanh_id ?? null,
    gioi_tinh: data.gioi_tinh,
    trang_thai: data.trang_thai,
    ngay_vao_lam: data.ngay_vao_lam,
    anh_dai_dien:
      data.anh_dai_dien || getAvatarUrl(data.ho_ten ?? ''),
    created_at: timestamp,
    updated_at: timestamp,
    created_by: CURRENT_USER,
    updated_by: CURRENT_USER,
    ...data,
  } as Omit<Employee, 'id'> & { id: string },
    { returningSelect: EMPLOYEE_RETURNING_FULL },
  );
  const flat = isSupabase()
    ? flattenSupabaseRow(inserted as unknown as Record<string, unknown>)
    : inserted;
  return enrichEmployee(flat);
};

export const updateEmployee = async (
  id: string,
  data: EmployeeFormValues
): Promise<Employee> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('employee.service.notFound'));
  const updated = await repo.update(
    id,
    {
    ...data,
    phong_ban_id: data.phong_ban_id ?? null,
    chuc_vu_id: data.chuc_vu_id ?? null,
    chi_nhanh_id: data.chi_nhanh_id ?? null,
    trang_thai: data.trang_thai,
    updated_at: now(),
    updated_by: CURRENT_USER,
    },
    { returningSelect: EMPLOYEE_RETURNING_FULL },
  );
  const flat = isSupabase()
    ? flattenSupabaseRow(updated as unknown as Record<string, unknown>)
    : updated;
  return enrichEmployee(flat);
};

export const updateEmployeeStatus = async (
  ids: string[],
  status: TrangThaiNhanVien
): Promise<void> => {
  const timestamp = now();
  for (const id of ids) {
    await repo.update(
      id,
      {
      trang_thai: status,
      updated_at: timestamp,
      updated_by: CURRENT_USER,
      },
      { returningSelect: EMPLOYEE_RETURNING_STATUS_ONLY },
    );
  }
};

export const bulkUpdateEmployees = async (
  ids: string[],
  fields: Record<string, unknown>
): Promise<void> => {
  const [positions, depts, branches] = await Promise.all([
    getPositions(),
    getDepartments(),
    getBranches(),
  ]);
  const timestamp = now();
  for (const id of ids) {
    const existing = await repo.getById(id);
    if (!existing) continue;
    const updated = { ...existing, ...fields, updated_at: timestamp, updated_by: CURRENT_USER };
    if (fields.chuc_vu_id)
      updated.ten_chuc_vu = positions.find((p) => p.id === fields.chuc_vu_id)?.ten_chuc_vu;
    if (fields.phong_ban_id)
      updated.ten_phong_ban = depts.find((d) => d.id === fields.phong_ban_id)?.ten_phong_ban;
    if (fields.chi_nhanh_id)
      updated.ten_chi_nhanh = branches.find((b) => b.id === fields.chi_nhanh_id)?.ten_chi_nhanh;
    await repo.update(id, updated, { returningSelect: 'id' });
  }
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await repo.remove([id]);
};

export const deleteEmployees = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};

/** Khôi phục nhân viên đã xóa (undo) */
export const restoreEmployees = async (employees: Employee[]): Promise<void> => {
  for (const emp of employees) {
    const {
      ten_phong_ban: _ten_phong_ban,
      ten_chuc_vu: _ten_chuc_vu,
      ten_chi_nhanh: _ten_chi_nhanh,
      ...row
    } = emp;
    await repo.insert(row as Omit<Employee, 'id'> & { id: string }, {
      returningSelect: EMPLOYEE_RETURNING_FULL,
    });
  }
};
