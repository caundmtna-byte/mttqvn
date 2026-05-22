import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { KhoDotCuuTroFormValues } from '../core/schema';
import type { KhoDotCuuTroDetail, KhoDotCuuTroListRow } from '../core/types';
import {
  createKhoDotCuuTro,
  deleteKhoDotCuuTroMany,
  getKhoDotCuuTroById,
  getKhoDotCuuTroList,
  updateKhoDotCuuTro,
} from '../services/kho-dot-cuu-tro-service';

const listKey = queryKeys.khoDotCuuTro.all;

export function useKhoDotCuuTroList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getKhoDotCuuTroList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useKhoDotCuuTroDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.khoDotCuuTro.detail(id?.trim() ?? '__'),
    queryFn: () => getKhoDotCuuTroById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateKhoDotCuuTro(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KhoDotCuuTroFormValues) => createKhoDotCuuTro(data),
    onSuccess: (created, variables) => {
      queryClient.setQueryData<KhoDotCuuTroListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [...rest, created].sort((a, b) =>
          a.tt !== b.tt ? a.tt - b.tt : Number(a.id) - Number(b.id),
        );
      });
      const moTa = variables.mo_ta.trim();
      queryClient.setQueryData<KhoDotCuuTroDetail>(queryKeys.khoDotCuuTro.detail(created.id), {
        ...created,
        mo_ta: moTa === '' ? null : moTa,
      });
      toast.success(txt('matTranDotCuuTro.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateKhoDotCuuTro(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KhoDotCuuTroFormValues }) => updateKhoDotCuuTro(id, data),
    onSuccess: (updated, variables) => {
      const prev = queryClient.getQueryData<KhoDotCuuTroListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDotCuuTroListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      const detailKey = queryKeys.khoDotCuuTro.detail(updated.id);
      const moTa = variables.data.mo_ta.trim();
      queryClient.setQueryData<KhoDotCuuTroDetail>(detailKey, {
        ...updated,
        mo_ta: moTa === '' ? null : moTa,
      });
      toast.success(txt('matTranDotCuuTro.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteKhoDotCuuTroMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhoDotCuuTroMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<KhoDotCuuTroListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDotCuuTroListRow[]>(listKey, prev.filter((r) => !ids.includes(r.id)));
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoDotCuuTro.detail(id) });
      }
      toast.success(txt('matTranDotCuuTro.toast.delete', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
