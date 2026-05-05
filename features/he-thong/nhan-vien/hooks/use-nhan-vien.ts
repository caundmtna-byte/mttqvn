import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  createEmployeeWithAuthDecision,
  updateEmployee,
  updateEmployeeWithAuthDecision,
  deleteEmployees,
  updateEmployeeStatus,
  restoreEmployees,
  AuthUserExistsError,
  type AuthConflictDecision,
} from '../services/nhan-vien-service';
import { EmployeeFormValues } from '../core/schema';
import { Employee } from '../core/types';
import type { TrangThaiNhanVien } from '../core/constants';
import { toast } from 'sonner';
import { txt } from '../../../../lib/text';
import { EMPLOYEES_LIST_QUERY_PARAMS, queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';

const employeesListQueryKey = queryKeys.employees.list({
  limit: EMPLOYEES_LIST_QUERY_PARAMS.limit,
  offset: EMPLOYEES_LIST_QUERY_PARAMS.offset,
  orderBy: EMPLOYEES_LIST_QUERY_PARAMS.orderBy,
  ascending: EMPLOYEES_LIST_QUERY_PARAMS.ascending,
});

export const useEmployees = () =>
  useQuery({
    queryKey: employeesListQueryKey,
    queryFn: () => getEmployees(),
    ...listQueryOptions,
  });

export const useEmployee = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.employees.detail(id ?? ''),
    queryFn: () => getEmployeeById(id!),
    enabled: !!id,
    ...listQueryOptions,
  });

interface CreateMutationOptions {
  onSuccess?: () => void;
  /** Bắt {@link AuthUserExistsError} để UI mở dialog xác nhận. Trả `true` để chặn toast lỗi mặc định. */
  onAuthConflict?: (username: string) => boolean | void;
}

export const useCreateEmployee = (options?: (() => void) | CreateMutationOptions) => {
  const queryClient = useQueryClient();
  const opts: CreateMutationOptions = typeof options === 'function' ? { onSuccess: options } : options ?? {};
  return useMutation({
    mutationFn: createEmployee,
    onSuccess: (created) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old ? [...old, created] : [created],
      );
      toast.success(txt('employee.toast.createSuccess'));
      opts.onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof AuthUserExistsError) {
        const handled = opts.onAuthConflict?.(err.username);
        if (handled) return;
      }
      toast.error(`Lỗi: ${getErrorMessage(err)}`);
    },
  });
};

export const useCreateEmployeeWithAuthDecision = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, decision }: { data: EmployeeFormValues; decision: AuthConflictDecision }) =>
      createEmployeeWithAuthDecision(data, decision),
    onSuccess: (created, variables) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old ? [...old, created] : [created],
      );
      toast.success(
        variables.decision === 'reset'
          ? txt('employee.toast.authPasswordReset')
          : txt('employee.toast.createSuccess'),
      );
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => toast.error(`Lỗi: ${getErrorMessage(err)}`),
  });
};

export const useUpdateEmployee = (options?: (() => void) | CreateMutationOptions) => {
  const queryClient = useQueryClient();
  const opts: CreateMutationOptions = typeof options === 'function' ? { onSuccess: options } : options ?? {};
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EmployeeFormValues }) => updateEmployee(id, data),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old?.map((e) => (e.id === variables.id ? updated : e)),
      );
      queryClient.setQueryData(queryKeys.employees.detail(variables.id), updated);
      toast.success(txt('employee.toast.updateSuccess'));
      opts.onSuccess?.();
    },
    onError: (err: unknown) => {
      if (err instanceof AuthUserExistsError) {
        const handled = opts.onAuthConflict?.(err.username);
        if (handled) return;
      }
      toast.error(`Lỗi: ${getErrorMessage(err)}`);
    },
  });
};

export const useUpdateEmployeeWithAuthDecision = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
      decision,
    }: {
      id: string;
      data: EmployeeFormValues;
      decision: AuthConflictDecision;
    }) => updateEmployeeWithAuthDecision(id, data, decision),
    onSuccess: (updated, variables) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old?.map((e) => (e.id === variables.id ? updated : e)),
      );
      queryClient.setQueryData(queryKeys.employees.detail(variables.id), updated);
      toast.success(
        variables.decision === 'reset'
          ? txt('employee.toast.authPasswordReset')
          : txt('employee.toast.updateSuccess'),
      );
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => toast.error(`Lỗi: ${getErrorMessage(err)}`),
  });
};

export const useUpdateStatusEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TrangThaiNhanVien }) =>
      updateEmployeeStatus(ids, status),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old?.map((e) =>
          variables.ids.includes(e.id) ? { ...e, trang_thai: variables.status } : e,
        ),
      );
      variables.ids.forEach((id) => {
        queryClient.setQueryData<Employee | undefined>(queryKeys.employees.detail(id), (prev) =>
          prev ? { ...prev, trang_thai: variables.status } : prev,
        );
      });
      toast.success(txt('employee.toast.statusUpdateSuccess', { count: variables.ids.length }));
    },
    onError: (err: unknown) => toast.error(`Lỗi: ${getErrorMessage(err)}`),
  });
};

export const useDeleteEmployees = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteEmployees(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old?.filter((e) => !ids.includes(e.id)),
      );
      ids.forEach((id) => queryClient.removeQueries({ queryKey: queryKeys.employees.detail(id) }));
      toast.success(txt('employee.toast.deleteSuccess', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
};

/**
 * Hook xóa có thể hoàn tác (undo). Xoá trước → toast có nút "Hoàn tác" → nếu
 * nhấn thì restore lại.
 */
export const useDeleteWithUndo = () => {
  const queryClient = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => deleteEmployees(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        old?.filter((e) => !ids.includes(e.id)),
      );
      ids.forEach((id) => queryClient.removeQueries({ queryKey: queryKeys.employees.detail(id) }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });

  const restoreMut = useMutation({
    mutationFn: (employees: Employee[]) => restoreEmployees(employees),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.anyDetail });
      toast.success(txt('employee.toast.undoSuccess'));
    },
  });

  const deleteWithUndo = async (
    employees: Employee[],
    callbacks?: { onDone?: () => void },
  ) => {
    const ids = employees.map((e) => e.id);
    const snapshot = [...employees];

    await deleteMut.mutateAsync(ids);
    callbacks?.onDone?.();

    toast(txt('employee.toast.deleteCount', { count: ids.length }), {
      duration: 6000,
      action: {
        label: txt('employee.toast.undo'),
        onClick: () => restoreMut.mutate(snapshot),
      },
    });
  };

  return { deleteWithUndo, isPending: deleteMut.isPending };
};
