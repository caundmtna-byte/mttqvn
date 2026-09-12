import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { ThucHienPhanBienFormValues } from '../core/schema';
import type { ThucHienPhanBien } from '../core/types';
import {
  createThucHienPhanBien,
  deleteThucHienPhanBienMany,
  getThucHienPhanBienById,
  getThucHienPhanBienList,
  updateThucHienPhanBien,
} from '../services/thuc-hien-phan-bien-service';

const listKey = queryKeys.pbxhThucHien.all;

export function useThucHienPhanBienList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThucHienPhanBienList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThucHienPhanBienDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.pbxhThucHien.detail(id?.trim() ?? '__'),
    queryFn: () => getThucHienPhanBienById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Làm mới các trang đang phân trang phía máy chủ.
 *
 * Các mutation dưới đây chỉ `setQueryData` vào mảng phẳng `listKey`, mà trang
 * danh sách nay đọc key `['pbxh-thuc-hien','page',…]` — không invalidate thì
 * thêm/sửa/xoá xong bảng không đổi cho tới khi tải lại trang.
 */
function invalidatePbxhPages(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.pbxhThucHien.all, 'page'] });
}

export function useCreateThucHienPhanBien(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThucHienPhanBienFormValues; idNguoiTao: string }) =>
      createThucHienPhanBien(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThucHienPhanBien[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.pbxhThucHien.detail(created.id), created);
      invalidatePbxhPages(queryClient);
      toast.success(txt('pbxhThucHien.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateThucHienPhanBien(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThucHienPhanBienFormValues }) =>
      updateThucHienPhanBien(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThucHienPhanBien[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.pbxhThucHien.detail(updated.id), updated);
      invalidatePbxhPages(queryClient);
      toast.success(txt('pbxhThucHien.toast.update'));
      onSuccess?.();
    },
  });
}

export function useDeleteThucHienPhanBienMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThucHienPhanBienMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThucHienPhanBien[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.pbxhThucHien.detail(id) });
      }
      invalidatePbxhPages(queryClient);
      toast.success(txt('pbxhThucHien.toast.delete', { count: ids.length }));
    },
  });
}
