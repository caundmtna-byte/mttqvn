import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { KhoDanhSachKhoFormValues } from '../core/schema';
import type { KhoDanhSachKhoListRow } from '../core/types';
import {
  createKhoDanhSachKho,
  deleteKhoDanhSachKhoMany,
  getKhoDanhSachKhoById,
  getKhoDanhSachKhoList,
  updateKhoDanhSachKho,
} from '../services/kho-danh-sach-kho-service';

const listKey = queryKeys.khoDanhSachKho.all;

export function useKhoDanhSachKhoList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getKhoDanhSachKhoList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useKhoDanhSachKhoDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.khoDanhSachKho.detail(id?.trim() ?? '__'),
    queryFn: () => getKhoDanhSachKhoById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateKhoDanhSachKho(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: KhoDanhSachKhoFormValues) => createKhoDanhSachKho(data),
    onSuccess: (created) => {
      queryClient.setQueryData<KhoDanhSachKhoListRow[]>(listKey, (old) => {
        if (!old) return [created];
        const rest = old.filter((r) => r.id !== created.id);
        return [...rest, created].sort((a, b) =>
          a.tt !== b.tt ? a.tt - b.tt : Number(a.id) - Number(b.id),
        );
      });
      queryClient.setQueryData(queryKeys.khoDanhSachKho.detail(created.id), created);
      toast.success(txt('matTranKhoDanhSach.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useUpdateKhoDanhSachKho(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KhoDanhSachKhoFormValues }) => updateKhoDanhSachKho(id, data),
    onSuccess: (updated) => {
      const prev = queryClient.getQueryData<KhoDanhSachKhoListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDanhSachKhoListRow[]>(
          listKey,
          prev.map((r) => (r.id === updated.id ? updated : r)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      queryClient.setQueryData(queryKeys.khoDanhSachKho.detail(updated.id), updated);
      toast.success(txt('matTranKhoDanhSach.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}

export function useDeleteKhoDanhSachKhoMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteKhoDanhSachKhoMany(ids),
    onSuccess: (_, ids) => {
      const prev = queryClient.getQueryData<KhoDanhSachKhoListRow[]>(listKey);
      if (prev) {
        queryClient.setQueryData<KhoDanhSachKhoListRow[]>(
          listKey,
          prev.filter((r) => !ids.includes(r.id)),
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: listKey });
      }
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.khoDanhSachKho.detail(id) });
      }
      toast.success(txt('matTranKhoDanhSach.toast.delete', { count: ids.length }));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
