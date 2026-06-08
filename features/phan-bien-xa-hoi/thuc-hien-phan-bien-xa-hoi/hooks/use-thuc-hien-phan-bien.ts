import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
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
      toast.success(txt('pbxhThucHien.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
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
      toast.success(txt('pbxhThucHien.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
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
      toast.success(txt('pbxhThucHien.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
