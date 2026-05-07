import type { Employee, TrangThaiNhanVien } from '../core/types';
import type { EmployeeFormValues } from '../core/schema';
import { employeeToFormValues } from '../utils/employee-to-form';
import { getPositions } from '../../chuc-vu/services/chuc-vu-service';
import { getDepartments } from '../../phong-ban/services/phong-ban-service';
import { createRepository } from '@/lib/data/create-repository';
import { EMPLOYEES_LIST_QUERY_PARAMS } from '@/lib/query-keys';
import { txt } from '../../../../lib/text';
import { isSupabase } from '@/lib/data/config';
import {
  checkAuthUserExists,
  createAuthUser,
  deleteAuthUser,
  resetAuthUserPassword,
} from '@/lib/supabase/admin-user';
import {
  EMPLOYEE_RETURNING_FULL,
  EMPLOYEE_RETURNING_STATUS_ONLY,
  EMPLOYEE_SELECT_FULL,
} from '../core/supabase-select';

/**
 * Lỗi báo trước khi tạo / đổi `ten_tai_khoan`: email Auth tương ứng đã tồn tại.
 * UI catch để hỏi admin xử lý: reset password (về 123456) hay giữ nguyên.
 */
export class AuthUserExistsError extends Error {
  readonly username: string;
  constructor(username: string) {
    super(`Email Auth ${username}@gmail.com đã tồn tại`);
    this.name = 'AuthUserExistsError';
    this.username = username;
  }
}

export type AuthConflictDecision = 'reset' | 'keep';

const now = () => new Date().toISOString();

const repo = createRepository<Employee>({
  tableName: 'var_nhan_vien',
  select: EMPLOYEE_SELECT_FULL,
  delay: 200,
});

export type GetEmployeesParams = {
  limit?: number;
  offset?: number;
  orderBy?: string;
  ascending?: boolean;
};

/** Chuẩn hoá id / FK int8 từ PostgREST (number hoặc chuỗi số). */
function normalizeEmployeeRow(raw: Employee): Employee {
  return {
    ...raw,
    id: String(raw.id),
    id_phong_ban: raw.id_phong_ban == null ? null : String(raw.id_phong_ban),
    id_bo_phan: raw.id_bo_phan == null ? null : String(raw.id_bo_phan),
    id_chuc_vu: raw.id_chuc_vu == null ? null : String(raw.id_chuc_vu),
  };
}

/** Bổ sung tên hiển thị từ master (khi FK int8 trùng `id` master sau này). */
async function enrichEmployee(raw: Employee, lookups?: {
  depts?: { id: string; ten_phong_ban: string }[];
  positions?: { id: string; ten_chuc_vu: string }[];
}): Promise<Employee> {
  const row = normalizeEmployeeRow(raw);
  const depts = lookups?.depts ?? (await getDepartments()).map((d) => ({ id: d.id, ten_phong_ban: d.ten_phong_ban }));
  const positions = lookups?.positions ?? (await getPositions()).map((p) => ({ id: p.id, ten_chuc_vu: p.ten_chuc_vu }));
  return {
    ...row,
    ten_phong_ban: depts.find((d) => d.id === row.id_phong_ban)?.ten_phong_ban,
    ten_bo_phan: depts.find((d) => d.id === row.id_bo_phan)?.ten_phong_ban,
    ten_chuc_vu: positions.find((p) => p.id === row.id_chuc_vu)?.ten_chuc_vu,
  };
}

export const getEmployees = async (params: GetEmployeesParams = {}): Promise<Employee[]> => {
  const limit = params.limit ?? EMPLOYEES_LIST_QUERY_PARAMS.limit;
  const offset = params.offset ?? EMPLOYEES_LIST_QUERY_PARAMS.offset;
  const orderBy = params.orderBy ?? EMPLOYEES_LIST_QUERY_PARAMS.orderBy;
  const ascending = params.ascending ?? EMPLOYEES_LIST_QUERY_PARAMS.ascending;
  const list = await repo.getAll({ limit, offset, orderBy, ascending });
  if (list.length === 0) return list;
  const [depts, positions] = await Promise.all([getDepartments(), getPositions()]);
  const lookups = {
    depts: depts.map((d) => ({ id: d.id, ten_phong_ban: d.ten_phong_ban })),
    positions: positions.map((p) => ({ id: p.id, ten_chuc_vu: p.ten_chuc_vu })),
  };
  return Promise.all(list.map((row) => enrichEmployee(row, lookups)));
};

export const getEmployeeById = async (id: string): Promise<Employee | undefined> => {
  const [row, depts, positions] = await Promise.all([
    repo.getById(id),
    getDepartments(),
    getPositions(),
  ]);
  if (!row) return undefined;
  const lookups = {
    depts: depts.map((d) => ({ id: d.id, ten_phong_ban: d.ten_phong_ban })),
    positions: positions.map((p) => ({ id: p.id, ten_chuc_vu: p.ten_chuc_vu })),
  };
  return enrichEmployee(row, lookups);
};

function normInt8Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^\d+$/.test(s)) return null;
  return Number(s);
}

/** Form → payload Supabase (int8 FK; chuỗi không phải số → null). */
function toRowPayload(data: EmployeeFormValues) {
  const normText = (v: string | null | undefined) => (v === undefined || v === null || v === '' ? null : v);
  return {
    ten_tai_khoan: data.ten_tai_khoan.trim().toLowerCase(),
    ho_va_ten: data.ho_va_ten,
    hinh_anh: normText(data.hinh_anh ?? null),
    id_phong_ban: normInt8Fk(data.id_phong_ban),
    id_bo_phan: normInt8Fk(data.id_bo_phan),
    id_chuc_vu: normInt8Fk(data.id_chuc_vu),
    trang_thai: data.trang_thai as TrangThaiNhanVien,
  };
}

async function fetchLookups() {
  const [depts, positions] = await Promise.all([getDepartments(), getPositions()]);
  return {
    depts: depts.map((d) => ({ id: d.id, ten_phong_ban: d.ten_phong_ban })),
    positions: positions.map((p) => ({ id: p.id, ten_chuc_vu: p.ten_chuc_vu })),
  };
}

async function insertEmployeeRow(data: EmployeeFormValues): Promise<Employee> {
  const [inserted, lookups] = await Promise.all([
    repo.insert(
      toRowPayload(data) as unknown as Omit<Employee, 'id'> & { id?: string },
      { returningSelect: EMPLOYEE_RETURNING_FULL },
    ),
    fetchLookups(),
  ]);
  return enrichEmployee(inserted, lookups);
}

async function updateEmployeeRow(id: string, data: EmployeeFormValues): Promise<Employee> {
  const [updated, lookups] = await Promise.all([
    repo.update(
      id,
      {
        ...toRowPayload(data),
        tg_cap_nhat: now(),
      } as unknown as Partial<Employee>,
      { returningSelect: EMPLOYEE_RETURNING_FULL },
    ),
    fetchLookups(),
  ]);
  return enrichEmployee(updated, lookups);
}

/**
 * Tạo nhân viên mới. Nếu Auth user `<ten_tai_khoan>@gmail.com` đã tồn tại sẽ
 * throw {@link AuthUserExistsError} để UI hỏi admin (reset / keep).
 * Khi mock (chưa nối Supabase) thì bỏ qua bước Auth.
 */
export const createEmployee = async (data: EmployeeFormValues): Promise<Employee> => {
  if (isSupabase()) {
    const username = data.ten_tai_khoan.trim().toLowerCase();
    const { exists } = await checkAuthUserExists(username);
    if (exists) throw new AuthUserExistsError(username);
    await createAuthUser(username);
  }
  return insertEmployeeRow(data);
};

/** Tiếp tục tạo nhân viên sau khi admin đã chọn xử lý conflict. */
export const createEmployeeWithAuthDecision = async (
  data: EmployeeFormValues,
  decision: AuthConflictDecision,
): Promise<Employee> => {
  if (isSupabase()) {
    const username = data.ten_tai_khoan.trim().toLowerCase();
    if (decision === 'reset') {
      await resetAuthUserPassword(username);
    }
  }
  return insertEmployeeRow(data);
};

/**
 * Cập nhật nhân viên. Nếu `ten_tai_khoan` thay đổi:
 *  - Auth user mới đã tồn tại → throw {@link AuthUserExistsError}.
 *  - Auth user mới chưa có    → tạo user mới + xoá user cũ.
 */
export const updateEmployee = async (
  id: string,
  data: EmployeeFormValues,
): Promise<Employee> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('employee.service.notFound'));

  if (isSupabase()) {
    const oldUsername = String(existing.ten_tai_khoan ?? '').trim().toLowerCase();
    const newUsername = data.ten_tai_khoan.trim().toLowerCase();
    if (oldUsername !== newUsername) {
      const { exists } = await checkAuthUserExists(newUsername);
      if (exists) throw new AuthUserExistsError(newUsername);
      await createAuthUser(newUsername);
      if (oldUsername) {
        try {
          await deleteAuthUser(oldUsername);
        } catch {
          // Không chặn cập nhật nếu xoá Auth cũ thất bại — admin có thể dọn sau.
        }
      }
    }
  }

  return updateEmployeeRow(id, data);
};

/** Tiếp tục cập nhật sau khi admin chọn xử lý Auth conflict (đổi username). */
export const updateEmployeeWithAuthDecision = async (
  id: string,
  data: EmployeeFormValues,
  decision: AuthConflictDecision,
): Promise<Employee> => {
  const existing = await repo.getById(id);
  if (!existing) throw new Error(txt('employee.service.notFound'));

  if (isSupabase()) {
    const oldUsername = String(existing.ten_tai_khoan ?? '').trim().toLowerCase();
    const newUsername = data.ten_tai_khoan.trim().toLowerCase();
    if (oldUsername !== newUsername) {
      if (decision === 'reset') {
        await resetAuthUserPassword(newUsername);
      }
      if (oldUsername) {
        try {
          await deleteAuthUser(oldUsername);
        } catch {
          // Bỏ qua lỗi xoá Auth cũ.
        }
      }
    }
  }

  return updateEmployeeRow(id, data);
};

export const updateEmployeeStatus = async (
  ids: string[],
  status: TrangThaiNhanVien,
): Promise<void> => {
  const timestamp = now();
  await Promise.all(
    ids.map((id) =>
      repo.update(
        id,
        { trang_thai: status, tg_cap_nhat: timestamp } as unknown as Partial<Employee>,
        { returningSelect: EMPLOYEE_RETURNING_STATUS_ONLY },
      ),
    ),
  );
};

async function safeDeleteAuthUsersByIds(ids: string[]): Promise<void> {
  if (!isSupabase() || ids.length === 0) return;
  const rows = await Promise.all(ids.map((id) => repo.getById(id).catch(() => null)));
  const usernames = rows
    .map((row) => String((row as Employee | null)?.ten_tai_khoan ?? '').trim().toLowerCase())
    .filter(Boolean);
  await Promise.all(
    usernames.map((u) =>
      deleteAuthUser(u).catch(() => {
        // không chặn xoá nhân viên nếu xoá Auth thất bại.
      }),
    ),
  );
}

export const deleteEmployee = async (id: string): Promise<void> => {
  await safeDeleteAuthUsersByIds([id]);
  await repo.remove([id]);
};

export const deleteEmployees = async (ids: string[]): Promise<void> => {
  await safeDeleteAuthUsersByIds(ids);
  await repo.remove(ids);
};

/** Khôi phục nhân viên đã xóa (undo) — insert lại không giữ id cũ. */
export const restoreEmployees = async (employees: Employee[]): Promise<void> => {
  for (const emp of employees) {
    await repo.insert(
      toRowPayload(employeeToFormValues(emp)) as unknown as Omit<Employee, 'id'> & { id?: string },
      { returningSelect: EMPLOYEE_RETURNING_FULL },
    );
  }
};
