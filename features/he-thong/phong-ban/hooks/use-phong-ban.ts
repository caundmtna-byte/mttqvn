import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isConstraintFieldError } from '@/lib/supabase/constraint-field-error';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, updateDepartmentStatus } from "../services/phong-ban-service";
import { DepartmentFormValues } from "../core/schema";
import type { Department } from '../core/types';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { toast } from "sonner";
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import { importPhongBanRows } from '../services/phong-ban-import';
import { txt } from '../../../../lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';

const departmentsQueryKey = queryKeys.departments.all;

export const useDepartments = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: departmentsQueryKey,
    queryFn: getDepartments,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });
};

export const useCreateDepartment = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDepartment,
    onSuccess: (created) => {
      queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
        old ? [...old, created].sort((a, b) => a.duong_dan.localeCompare(b.duong_dan)) : [created],
      );
      toast.success(txt('department.toast.createSuccess'));
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      // Lỗi trùng có ô nhập tương ứng ⇒ form gắn chữ đỏ dưới ô, không toast.
      if (isConstraintFieldError(err)) return;
      toast.error(getErrorMessage(err));
    }
  });
};

export const useUpdateDepartment = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: DepartmentFormValues }) => updateDepartment(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
        old?.map((d) => (d.id === updated.id ? updated : d)),
      );
      toast.success(txt('department.toast.updateSuccess'));
      if (onSuccess) onSuccess();
    },
    onError: (err: unknown) => {
      // Lỗi trùng có ô nhập tương ứng ⇒ form gắn chữ đỏ dưới ô, không toast.
      if (isConstraintFieldError(err)) return;
      toast.error(getErrorMessage(err));
    }
  });
};

// --- Hàm thuần cho thao tác hàng loạt (có test đi kèm) -------------------------

/** Kết quả một lượt thao tác trên nhiều phòng ban: ai xong, ai hỏng vì sao. */
export interface KetQuaHangLoat {
  thanhCong: string[];
  thatBai: { id: string; loi: unknown }[];
}

/** Ghép danh sách id với kết quả `Promise.allSettled` theo đúng thứ tự. */
export function gomKetQuaHangLoat(
  ids: readonly string[],
  ketQua: readonly PromiseSettledResult<unknown>[],
): KetQuaHangLoat {
  const thanhCong: string[] = [];
  const thatBai: { id: string; loi: unknown }[] = [];
  ids.forEach((id, i) => {
    const r = ketQua[i];
    if (r && r.status === 'fulfilled') thanhCong.push(id);
    else thatBai.push({ id, loi: r && r.status === 'rejected' ? r.reason : undefined });
  });
  return { thanhCong, thatBai };
}

/** Gộp lý do hỏng thành một câu ngắn cho người dùng đọc (tối đa 2 lý do khác nhau). */
export function tomTatLyDoHong(thatBai: readonly { loi: unknown }[]): string {
  const lyDo = [...new Set(thatBai.map((t) => getErrorMessage(t.loi)).filter(Boolean))];
  return lyDo.slice(0, 2).join('; ');
}

/** Đặt trạng thái cho các phòng ban được chọn, giữ nguyên phần còn lại. */
export function datTrangThaiPhongBan(
  danhSach: Department[] | undefined,
  ids: readonly string[],
  status: TrangThaiHoatDong,
): Department[] | undefined {
  if (!danhSach) return danhSach;
  const canDoi = new Set(ids);
  if (canDoi.size === 0) return danhSach;
  return danhSach.map((d) => (canDoi.has(d.id) ? { ...d, trang_thai: status } : d));
}

/** Bỏ các phòng ban đã xóa khỏi danh sách đang hiển thị. */
export function boPhongBanKhoiDanhSach(
  danhSach: Department[] | undefined,
  ids: readonly string[],
): Department[] | undefined {
  if (!danhSach) return danhSach;
  const canXoa = new Set(ids);
  if (canXoa.size === 0) return danhSach;
  return danhSach.filter((d) => !canXoa.has(d.id));
}

// --- Hook ---------------------------------------------------------------------

/** Đổi trạng thái MỘT phòng ban — đổi trên màn hình ngay, hỏng thì trả về như cũ. */
export const useUpdateStatusDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrangThaiHoatDong }) => updateDepartmentStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: departmentsQueryKey });
      const danhSachTruoc = queryClient.getQueryData<Department[]>(departmentsQueryKey);
      queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
        datTrangThaiPhongBan(old, [id], status),
      );
      return { danhSachTruoc };
    },
    onSuccess: () => {
      toast.success(txt('department.toast.updateSuccess'));
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx?.danhSachTruoc) queryClient.setQueryData(departmentsQueryKey, ctx.danhSachTruoc);
      toast.error(getErrorMessage(err));
    },
  });
};

/**
 * Đổi trạng thái NHIỀU phòng ban trong một lượt.
 *
 * Trước đây màn hình chạy vòng lặp `await` từng phòng ban một: N phòng ban là N
 * lượt chờ nối đuôi, và chỉ cần một phòng ban hỏng là vòng lặp dừng giữa chừng,
 * để lại nửa đổi nửa không mà không báo gì. Nay tất cả chạy song song, phòng ban
 * nào hỏng thì chỉ riêng nó quay về trạng thái cũ và được nêu tên trong thông báo.
 */
export const useUpdateStatusDepartmentMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: TrangThaiHoatDong }) =>
      gomKetQuaHangLoat(ids, await Promise.allSettled(ids.map((id) => updateDepartmentStatus(id, status)))),
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: departmentsQueryKey });
      const danhSachTruoc = queryClient.getQueryData<Department[]>(departmentsQueryKey);
      queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
        datTrangThaiPhongBan(old, ids, status),
      );
      return { danhSachTruoc };
    },
    onSuccess: (ketQua, { ids, status }, ctx) => {
      if (ketQua.thatBai.length > 0) {
        // Chỉ giữ lại phần đổi được: dựng lại từ ảnh chụp rồi áp cho các id thành công.
        queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
          datTrangThaiPhongBan(ctx?.danhSachTruoc ?? old, ketQua.thanhCong, status),
        );
        toast.warning(
          txt('department.toast.statusManyPartial', {
            done: ketQua.thanhCong.length,
            total: ids.length,
            failed: ketQua.thatBai.length,
            reason: tomTatLyDoHong(ketQua.thatBai),
          }),
          { duration: Infinity, closeButton: true },
        );
        return;
      }
      toast.success(txt('department.toast.statusManySuccess', { count: ketQua.thanhCong.length }));
    },
    onError: (err: unknown, _vars, ctx) => {
      if (ctx?.danhSachTruoc) queryClient.setQueryData(departmentsQueryKey, ctx.danhSachTruoc);
      toast.error(getErrorMessage(err));
    },
  });
};

/** Xóa MỘT phòng ban — dòng biến mất ngay, hỏng thì hiện lại. */
export const useDeleteDepartment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDepartment,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: departmentsQueryKey });
      const danhSachTruoc = queryClient.getQueryData<Department[]>(departmentsQueryKey);
      queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
        boPhongBanKhoiDanhSach(old, [id]),
      );
      return { danhSachTruoc };
    },
    onSuccess: () => {
      toast.success(txt('department.toast.deleteSuccess'));
    },
    onError: (err: unknown, _id, ctx) => {
      if (ctx?.danhSachTruoc) queryClient.setQueryData(departmentsQueryKey, ctx.danhSachTruoc);
      // Xóa hỏng thì LUÔN phải báo — không có ô nhập nào để gắn chữ đỏ như lúc
      // thêm/sửa, im lặng ở đây là người dùng tưởng đã xóa xong.
      toast.error(getErrorMessage(err));
    },
  });
};

/**
 * Xóa NHIỀU phòng ban trong một lượt — thay cho vòng lặp `await` tuần tự ở màn hình.
 * Phòng ban nào không xóa được (còn phòng con…) thì hiện lại và được nêu trong thông báo.
 */
export const useDeleteDepartmentMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) =>
      gomKetQuaHangLoat(ids, await Promise.allSettled(ids.map((id) => deleteDepartment(id)))),
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: departmentsQueryKey });
      const danhSachTruoc = queryClient.getQueryData<Department[]>(departmentsQueryKey);
      queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
        boPhongBanKhoiDanhSach(old, ids),
      );
      return { danhSachTruoc };
    },
    onSuccess: (ketQua, ids, ctx) => {
      if (ketQua.thatBai.length > 0) {
        queryClient.setQueryData<Department[]>(departmentsQueryKey, (old) =>
          boPhongBanKhoiDanhSach(ctx?.danhSachTruoc ?? old, ketQua.thanhCong),
        );
        toast.warning(
          txt('department.toast.deleteManyPartial', {
            done: ketQua.thanhCong.length,
            total: ids.length,
            failed: ketQua.thatBai.length,
            reason: tomTatLyDoHong(ketQua.thatBai),
          }),
          { duration: Infinity, closeButton: true },
        );
        return;
      }
      toast.success(txt('department.toast.deleteManySuccess', { count: ketQua.thanhCong.length }));
    },
    onError: (err: unknown, _ids, ctx) => {
      if (ctx?.danhSachTruoc) queryClient.setQueryData(departmentsQueryKey, ctx.danhSachTruoc);
      toast.error(getErrorMessage(err));
    },
  });
};

export const useImportDepartments = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, options }: { rows: Record<string, unknown>[]; options: ImportRunOptions }) =>
      importPhongBanRows(rows, options),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: departmentsQueryKey });
      const created = result.created ?? 0;
      const updated = result.updated ?? 0;
      if (created + updated > 0) {
        toast.success(txt('department.import.toastDone', { created, updated }));
      }
    },
  });
};
