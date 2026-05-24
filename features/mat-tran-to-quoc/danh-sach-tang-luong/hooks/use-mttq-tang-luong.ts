import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { MttqTangLuongFormValues } from '../core/schema';
import type { MttqTangLuongListRow } from '../core/types';
import {
  createMttqTangLuong,
  deleteMttqTangLuong,
  deleteMttqTangLuongMany,
  getMttqTangLuongByCanBo,
  getMttqTangLuongById,
  getMttqTangLuongList,
  updateMttqTangLuong,
} from '../services/mttq-tang-luong-service';

export function useMttqTangLuongList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.mttqTangLuong.all,
    queryFn: getMttqTangLuongList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useMttqTangLuongDetail(id: string | null, options?: { enabled?: boolean }) {
  const tid = id?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.mttqTangLuong.detail(tid || '__'),
    queryFn: () => getMttqTangLuongById(tid),
    enabled: Boolean(tid) && options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useMttqTangLuongByCanBo(canBoId: string | null, options?: { enabled?: boolean; limit?: number }) {
  const id = canBoId?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.mttqTangLuong.byCanBo(id || '__'),
    queryFn: () => getMttqTangLuongByCanBo(id, options?.limit ?? 20),
    enabled: Boolean(id) && options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

function patchListCache(
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (rows: MttqTangLuongListRow[]) => MttqTangLuongListRow[],
) {
  queryClient.setQueryData<MttqTangLuongListRow[]>(queryKeys.mttqTangLuong.all, (old) => {
    const base = old ?? [];
    return updater(base).sort((a, b) => b.ngay_nang_luong.localeCompare(a.ngay_nang_luong));
  });
}

export function useCreateMttqTangLuong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { data: MttqTangLuongFormValues; idNguoiTao: string }) =>
      createMttqTangLuong(input.data, input.idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.mttqTangLuong.detail(created.id), created);
      patchListCache(queryClient, (rows) => [...rows.filter((r) => r.id !== created.id), created]);
      queryClient.invalidateQueries({
        queryKey: queryKeys.mttqTangLuong.byCanBo(created.can_bo_id),
        refetchType: 'none',
      });
      toast.success(txt('matTranTangLuong.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateMttqTangLuong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqTangLuongFormValues }) =>
      updateMttqTangLuong(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.mttqTangLuong.detail(updated.id), updated);
      patchListCache(queryClient, (rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
      queryClient.invalidateQueries({
        queryKey: queryKeys.mttqTangLuong.byCanBo(updated.can_bo_id),
        refetchType: 'none',
      });
      toast.success(txt('matTranTangLuong.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteMttqTangLuong() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqTangLuong,
    onSuccess: (_void, id) => {
      const cached = queryClient.getQueryData<MttqTangLuongListRow>(queryKeys.mttqTangLuong.detail(id));
      patchListCache(queryClient, (rows) => rows.filter((r) => r.id !== id));
      queryClient.removeQueries({ queryKey: queryKeys.mttqTangLuong.detail(id) });
      if (cached?.can_bo_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.mttqTangLuong.byCanBo(cached.can_bo_id),
          refetchType: 'none',
        });
      }
      toast.success(txt('matTranTangLuong.toast.delete'));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteMttqTangLuongMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqTangLuongMany,
    onSuccess: (_void, ids) => {
      const idSet = new Set(ids);
      patchListCache(queryClient, (rows) => rows.filter((r) => !idSet.has(r.id)));
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqTangLuong.detail(id) });
      }
      toast.success(txt('matTranTangLuong.toast.deleteMany', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
