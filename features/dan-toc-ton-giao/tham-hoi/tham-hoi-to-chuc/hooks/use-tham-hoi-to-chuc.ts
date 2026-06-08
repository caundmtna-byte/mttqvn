import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { ThamHoiToChucFormValues } from '../core/schema';
import type { ThamHoiToChuc } from '../core/types';
import {
  createThamHoiToChuc,
  deleteThamHoiToChucMany,
  getThamHoiToChucById,
  getThamHoiToChucByToChucId,
  getThamHoiToChucList,
  importThamHoiToChuc,
  updateThamHoiToChuc,
} from '../services/tham-hoi-to-chuc-service';

const listKey = queryKeys.danTocThamHoiToChuc.all;

export function useThamHoiToChucList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThamHoiToChucList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiToChucDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiToChuc.detail(id?.trim() ?? '__'),
    queryFn: () => getThamHoiToChucById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThamHoiToChucByToChucId(toChucId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(toChucId?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocThamHoiToChuc.byToChuc(toChucId?.trim() ?? '__'),
    queryFn: () => getThamHoiToChucByToChucId(toChucId!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThamHoiToChuc(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThamHoiToChucFormValues; idNguoiTao: string }) =>
      createThamHoiToChuc(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(created.id), created);
      queryClient.invalidateQueries({
        queryKey: queryKeys.danTocThamHoiToChuc.byToChuc(created.to_chuc_id),
      });
      toast.success(txt('danTocThamHoiToChuc.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThamHoiToChuc(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThamHoiToChucFormValues }) =>
      updateThamHoiToChuc(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(updated.id), updated);
      queryClient.invalidateQueries({
        queryKey: queryKeys.danTocThamHoiToChuc.byToChuc(updated.to_chuc_id),
      });
      toast.success(txt('danTocThamHoiToChuc.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteThamHoiToChucMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThamHoiToChucMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThamHoiToChuc[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocThamHoiToChuc.detail(id) });
      }
      void queryClient.invalidateQueries({ queryKey: ['dttg-tham-hoi-to-chuc', 'by-to-chuc'] });
      toast.success(txt('danTocThamHoiToChuc.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useImportThamHoiToChuc(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importThamHoiToChuc(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: ['dttg-tham-hoi-to-chuc', 'by-to-chuc'] });
      if (result.created > 0) {
        toast.success(txt('danTocThamHoiToChuc.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
