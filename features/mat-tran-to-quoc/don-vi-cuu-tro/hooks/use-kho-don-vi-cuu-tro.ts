import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { KhoDonViCuuTroFormValues } from '../core/schema';
import type { KhoDonViCuuTroListRow } from '../core/types';
import {
  createKhoDonViCuuTro,
  deleteKhoDonViCuuTroMany,
  getKhoDonViCuuTroById,
  getKhoDonViCuuTroList,
  updateKhoDonViCuuTro,
} from '../services/kho-don-vi-cuu-tro-service';

const listKey = queryKeys.khoDonViCuuTro.all;

export function useKhoDonViCuuTroList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getKhoDonViCuuTroList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useKhoDonViCuuTroDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.khoDonViCuuTro.detail(id?.trim() ?? '__'),
    queryFn: () => getKhoDonViCuuTroById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateKhoDonViCuuTro(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KhoDonViCuuTroFormValues) => createKhoDonViCuuTro(data),
    onSuccess: (created) => {
      queryClient.setQueryData<KhoDonViCuuTroListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [...rest, created].sort((a, b) =>
          a.tt !== b.tt ? a.tt - b.tt : Number(a.id) - Number(b.id),
        );
      });
      queryClient.setQueryData(queryKeys.khoDonViCuuTro.detail(created.id), created);
      toast.success(txt('matTranDonViCuuTro.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateKhoDonViCuuTro(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KhoDonViCuuTroFormValues }) => updateKhoDonViCuuTro(id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<KhoDonViCuuTroListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDonViCuuTroListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.khoDonViCuuTro.detail(updated.id), updated);
      toast.success(txt('matTranDonViCuuTro.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteKhoDonViCuuTroMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhoDonViCuuTroMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<KhoDonViCuuTroListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDonViCuuTroListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoDonViCuuTro.detail(id) });
      }
      toast.success(txt('matTranDonViCuuTro.toast.delete', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
