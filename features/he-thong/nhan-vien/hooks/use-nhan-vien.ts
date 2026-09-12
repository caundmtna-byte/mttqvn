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
  resetEmployeePassword,
  AuthUserExistsError,
  type AuthConflictDecision,
} from '../services/nhan-vien-service';
import { importEmployeeRows } from '../services/nhan-vien-import';
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

export const useEmployees = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: employeesListQueryKey,
    queryFn: () => getEmployees(),
    enabled: options?.enabled !== false,
    // Danh sách nhân viên có thể xóa ngoài phiên này — stale ngắn + refetch khi vào lại trang.
    // Mutations vẫn patch cache qua setQueryData.
    ...listQueryOptions,
    refetchOnMount: true,
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

/**
 * Hiển thị mật khẩu hệ thống vừa sinh cho quản trị viên.
 *
 * Trước đây mọi tài khoản đều dùng mật khẩu mặc định `123456` nên không cần báo.
 * Nay Edge Function sinh chuỗi ngẫu nhiên và **chỉ trả về đúng một lần**, nên toast
 * phải ở lại cho tới khi admin tự đóng và phải sao chép được.
 */
function toastGeneratedPassword(created: Employee) {
  const pw = created.__generatedPassword;
  if (!pw) return;
  toast.success(txt('employee.toast.generatedPasswordTitle'), {
    description: `${created.ten_tai_khoan} — ${pw}`,
    duration: Infinity,
    closeButton: true,
    action: {
      label: txt('common.copy'),
      onClick: () => void navigator.clipboard?.writeText(pw),
    },
  });
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
      toastGeneratedPassword(created);
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
      toastGeneratedPassword(created);
      if (onSuccess) onSuccess();
    },
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
  });
};

/**
 * Quản trị viên đặt lại mật khẩu cho một nhân viên.
 *
 * Không đụng tới cache danh sách: mật khẩu không nằm trong `var_nhan_vien`.
 * Nếu Edge Function từ chối mật khẩu admin gõ và tự sinh chuỗi khác, chuỗi đó
 * được hiện trong toast **không tự tắt** — đây là lần duy nhất đọc được nó.
 */
export const useResetEmployeePassword = (onSuccess?: () => void) =>
  useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetEmployeePassword(id, password),
    onSuccess: (res) => {
      if (res.generatedPassword) {
        const pw = res.generatedPassword;
        toast.warning(txt('employee.resetPassword.toastFallback'), {
          description: `${res.username} — ${pw}`,
          duration: Infinity,
          closeButton: true,
          action: {
            label: txt('common.copy'),
            onClick: () => void navigator.clipboard?.writeText(pw),
          },
        });
      } else {
        toast.success(txt('employee.resetPassword.toastSuccess', { username: res.username }));
      }
      onSuccess?.();
    },
    onError: (err: unknown) => {
      toast.error(txt('employee.resetPassword.toastFailed', { reason: getErrorMessage(err) }));
    },
  });

/** Đặt trạng thái cho các nhân viên được chọn, giữ nguyên phần còn lại. */
export function datTrangThaiNhanVien(
  danhSach: Employee[] | undefined,
  ids: readonly string[],
  status: TrangThaiNhanVien,
): Employee[] | undefined {
  if (!danhSach) return danhSach;
  const canDoi = new Set(ids);
  if (canDoi.size === 0) return danhSach;
  return danhSach.map((e) => (canDoi.has(e.id) ? { ...e, trang_thai: status } : e));
}

/**
 * Đổi trạng thái nhân viên — bảng đổi ngay khi bấm, hỏng thì trả về như cũ.
 *
 * Toàn bộ danh sách id đi trong MỘT lệnh gửi lên máy chủ, không lặp từng người.
 */
export const useUpdateStatusEmployee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: TrangThaiNhanVien }) =>
      updateEmployeeStatus(ids, status),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });
      const danhSachTruoc = queryClient.getQueryData<Employee[]>(employeesListQueryKey);
      const chiTietTruoc = ids.map(
        (id) => [id, queryClient.getQueryData<Employee>(queryKeys.employees.detail(id))] as const,
      );
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        datTrangThaiNhanVien(old, ids, status),
      );
      ids.forEach((id) => {
        queryClient.setQueryData<Employee | undefined>(queryKeys.employees.detail(id), (prev) =>
          prev ? { ...prev, trang_thai: status } : prev,
        );
      });
      return { danhSachTruoc, chiTietTruoc };
    },
    onSuccess: (_, variables) => {
      toast.success(txt('employee.toast.statusUpdateSuccess', { count: variables.ids.length }));
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx?.danhSachTruoc) {
        queryClient.setQueryData<Employee[]>(employeesListQueryKey, ctx.danhSachTruoc);
      }
      ctx?.chiTietTruoc.forEach(([id, prev]) => {
        queryClient.setQueryData(queryKeys.employees.detail(id), prev);
      });
      toast.error(getErrorMessage(err));
    },
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
  });
};

/**
 * Bỏ các nhân viên đã xóa khỏi danh sách đang hiển thị.
 *
 * Hàm thuần — tách ra để test được, vì xóa nhầm dòng là mất dữ liệu trên màn hình.
 */
export function boNhanVienKhoiDanhSach(
  danhSach: Employee[] | undefined,
  ids: readonly string[],
): Employee[] | undefined {
  if (!danhSach) return danhSach;
  const canXoa = new Set(ids);
  return danhSach.filter((e) => !canXoa.has(e.id));
}

/**
 * Đưa các nhân viên vừa xóa trở lại danh sách (khi bấm "Hoàn tác" hoặc khi xóa lỗi).
 *
 * Giữ đúng vị trí cũ theo thứ tự hiện có nếu còn suy ra được; dòng nào không rõ
 * vị trí thì thêm vào cuối. Không tạo dòng trùng khi danh sách đã có sẵn.
 */
export function khoiPhucNhanVienVaoDanhSach(
  danhSach: Employee[] | undefined,
  nhanVien: readonly Employee[],
): Employee[] | undefined {
  if (!danhSach) return danhSach;
  const daCo = new Set(danhSach.map((e) => e.id));
  const themVao = nhanVien.filter((e) => !daCo.has(e.id));
  if (themVao.length === 0) return danhSach;
  return [...danhSach, ...themVao];
}

/**
 * Hook xóa có thể hoàn tác (undo).
 *
 * Dòng biến mất khỏi bảng NGAY khi bấm xóa (optimistic), rồi mới gửi lệnh xóa lên
 * máy chủ. Ba nhánh:
 *  - Xóa lỗi ⇒ dòng hiện lại đúng chỗ cũ kèm thông báo lỗi.
 *  - Bấm "Hoàn tác" ⇒ dòng hiện lại ngay, sau đó mới gọi khôi phục.
 *  - Khôi phục lỗi ⇒ dòng biến mất trở lại kèm thông báo rõ ràng, tránh việc
 *    người dùng tưởng đã khôi phục xong trong khi thật ra vẫn mất.
 */
export const useDeleteWithUndo = () => {
  const queryClient = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => deleteEmployees(ids),
    onMutate: async (ids: string[]) => {
      // Huỷ lần tải đang chạy, nếu không dữ liệu cũ về sau sẽ dựng lại dòng vừa xóa.
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });
      const danhSachTruoc = queryClient.getQueryData<Employee[]>(employeesListQueryKey);
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        boNhanVienKhoiDanhSach(old, ids),
      );
      return { danhSachTruoc };
    },
    onSuccess: (_, ids) => {
      ids.forEach((id) => queryClient.removeQueries({ queryKey: queryKeys.employees.detail(id) }));
    },
    onError: (err: unknown, _ids, ctx) => {
      if (ctx?.danhSachTruoc) {
        queryClient.setQueryData<Employee[]>(employeesListQueryKey, ctx.danhSachTruoc);
      }
      toast.error(txt('employee.toast.deleteFailed', { reason: getErrorMessage(err) }));
    },
  });

  const restoreMut = useMutation({
    mutationFn: (employees: Employee[]) => restoreEmployees(employees),
    onMutate: async (employees: Employee[]) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.employees.all });
      const danhSachTruoc = queryClient.getQueryData<Employee[]>(employeesListQueryKey);
      queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
        khoiPhucNhanVienVaoDanhSach(old, employees),
      );
      return { danhSachTruoc };
    },
    onSuccess: () => {
      // Lấy lại từ máy chủ để có đúng id/thời điểm cập nhật sau khi khôi phục.
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.anyDetail });
      toast.success(txt('employee.toast.undoSuccess'));
    },
    onError: (err: unknown, _employees, ctx) => {
      // Trước đây nhánh này KHÔNG có gì: hoàn tác hỏng mà màn hình im lặng, người
      // dùng đinh ninh nhân viên đã được khôi phục.
      if (ctx?.danhSachTruoc) {
        queryClient.setQueryData<Employee[]>(employeesListQueryKey, ctx.danhSachTruoc);
      }
      toast.error(txt('employee.toast.undoFailed', { reason: getErrorMessage(err) }), {
        duration: Infinity,
        closeButton: true,
      });
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

/** Nhập nhân viên từ Excel — xem `services/nhan-vien-import.ts`. */
export const useImportEmployees = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) => importEmployeeRows(rows),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      if (result.created > 0) {
        toast.success(txt('employee.import.toastSuccess', { count: result.created }));
      }
      onSuccess?.();
    },
  });
};
