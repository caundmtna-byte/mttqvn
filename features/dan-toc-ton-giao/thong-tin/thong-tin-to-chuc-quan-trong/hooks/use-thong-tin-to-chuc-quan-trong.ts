import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import type { ThongTinToChucQuanTrongFormValues } from '../core/schema';
import type { ThongTinToChucQuanTrong } from '../core/types';
import {
  createThongTinToChucQuanTrong,
  deleteThongTinToChucQuanTrongMany,
  getThongTinToChucQuanTrongById,
  getThongTinToChucQuanTrongList,
  importThongTinToChucQuanTrong,
  updateThongTinToChucQuanTrong,
  updateThongTinToChucQuanTrongStatus,
} from '../services/thong-tin-to-chuc-quan-trong-service';

const listKey = queryKeys.danTocToChucQuanTrong.all;

export function useThongTinToChucQuanTrongList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThongTinToChucQuanTrongList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThongTinToChucQuanTrongDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocToChucQuanTrong.detail(id?.trim() ?? '__'),
    queryFn: () => getThongTinToChucQuanTrongById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThongTinToChucQuanTrong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThongTinToChucQuanTrongFormValues; idNguoiTao: string }) =>
      createThongTinToChucQuanTrong(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(created.id), created);
      toast.success(txt('danTocToChucQuanTrong.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThongTinToChucQuanTrong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThongTinToChucQuanTrongFormValues }) =>
      updateThongTinToChucQuanTrong(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(updated.id), updated);
      toast.success(txt('danTocToChucQuanTrong.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThongTinToChucQuanTrongStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrangThaiHoatDong }) =>
      updateThongTinToChucQuanTrongStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(updated.id), updated);
      toast.success(txt('danTocToChucQuanTrong.toast.update'));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteThongTinToChucQuanTrongMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThongTinToChucQuanTrongMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThongTinToChucQuanTrong[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocToChucQuanTrong.detail(id) });
      }
      toast.success(txt('danTocToChucQuanTrong.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useImportThongTinToChucQuanTrong(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importThongTinToChucQuanTrong(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      if (result.created > 0) {
        toast.success(txt('danTocToChucQuanTrong.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
