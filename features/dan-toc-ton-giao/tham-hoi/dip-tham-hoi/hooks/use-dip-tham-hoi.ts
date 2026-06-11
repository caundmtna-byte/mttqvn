import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { DipThamHoiFormValues } from '../core/schema';
import type { TrangThaiDipThamHoi } from '../core/constants';
import type { DipThamHoi } from '../core/types';
import {
  createDipThamHoi,
  deleteDipThamHoiMany,
  getDipThamHoiById,
  getDipThamHoiList,
  getDipThamHoiOptions,
  updateDipThamHoi,
  updateDipThamHoiTrangThai,
} from '../services/dip-tham-hoi-service';

const listKey = queryKeys.danTocDipThamHoi.all;

export function useDipThamHoiList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getDipThamHoiList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

/** Combobox options cho module con */
export function useDipThamHoiOptions(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.danTocDipThamHoi.options,
    queryFn: getDipThamHoiOptions,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useDipThamHoiDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocDipThamHoi.detail(id?.trim() ?? '__'),
    queryFn: () => getDipThamHoiById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateDipThamHoi(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: DipThamHoiFormValues; idNguoiTao: string }) =>
      createDipThamHoi(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<DipThamHoi[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocDipThamHoi.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.options });
      toast.success(txt('danTocDipThamHoi.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateDipThamHoi(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DipThamHoiFormValues }) => updateDipThamHoi(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<DipThamHoi[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocDipThamHoi.detail(updated.id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.options });
      toast.success(txt('danTocDipThamHoi.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateDipThamHoiTrangThai(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, trangThai }: { id: string; trangThai: TrangThaiDipThamHoi }) =>
      updateDipThamHoiTrangThai(id, trangThai),
    onSuccess: (updated) => {
      queryClient.setQueryData<DipThamHoi[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocDipThamHoi.detail(updated.id), updated);
      toast.success(txt('danTocDipThamHoi.toast.changeStatus'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteDipThamHoiMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteDipThamHoiMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<DipThamHoi[]>(listKey, (old) => old?.filter((r) => !ids.includes(r.id)));
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocDipThamHoi.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.danTocDipThamHoi.options });
      toast.success(txt('danTocDipThamHoi.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
