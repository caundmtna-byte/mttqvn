import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { LuongThietLapNgachFormValues } from '../core/schema';
import type { LuongThietLapNgachListRow } from '../core/types';
import {
  createLuongThietLapNgach,
  deleteLuongThietLapNgachMany,
  getLuongThietLapNgachById,
  getLuongThietLapNgachList,
  updateLuongThietLapNgach,
} from '../services/luong-thiet-lap-ngach-service';

const listKey = queryKeys.luongThietLapNgach.all;

export function useLuongThietLapNgachList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getLuongThietLapNgachList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useLuongThietLapNgachDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.luongThietLapNgach.detail(id?.trim() ?? '__'),
    queryFn: () => getLuongThietLapNgachById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateLuongThietLapNgach(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: LuongThietLapNgachFormValues) => createLuongThietLapNgach(data),
    onSuccess: (created) => {
      queryClient.setQueryData<LuongThietLapNgachListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [...rest, created].sort((a, b) =>
          a.thu_tu !== b.thu_tu ? a.thu_tu - b.thu_tu : Number(a.id) - Number(b.id),
        );
      });
      queryClient.setQueryData(queryKeys.luongThietLapNgach.detail(created.id), created);
      void queryClient.invalidateQueries({ queryKey: queryKeys.luongThietLapBac.byNgach(created.id) });
      toast.success(txt('matTranThietLapLuong.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateLuongThietLapNgach(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: LuongThietLapNgachFormValues }) =>
      updateLuongThietLapNgach(id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<LuongThietLapNgachListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<LuongThietLapNgachListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.luongThietLapNgach.detail(updated.id), updated);
      toast.success(txt('matTranThietLapLuong.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteLuongThietLapNgachMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteLuongThietLapNgachMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<LuongThietLapNgachListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<LuongThietLapNgachListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.luongThietLapNgach.detail(id) });
        queryClient.removeQueries({ queryKey: queryKeys.luongThietLapBac.byNgach(id) });
      }
      toast.success(txt('matTranThietLapLuong.toast.delete', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
