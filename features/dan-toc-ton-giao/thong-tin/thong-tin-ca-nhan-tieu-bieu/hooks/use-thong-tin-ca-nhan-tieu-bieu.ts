import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import type { ThongTinCaNhanTieuBieuFormValues } from '../core/schema';
import type { ThongTinCaNhanTieuBieu } from '../core/types';
import {
  createThongTinCaNhanTieuBieu,
  deleteThongTinCaNhanTieuBieuMany,
  getThongTinCaNhanTieuBieuById,
  getThongTinCaNhanTieuBieuList,
  importThongTinCaNhanTieuBieu,
  updateThongTinCaNhanTieuBieu,
  updateThongTinCaNhanTieuBieuStatus,
} from '../services/thong-tin-ca-nhan-tieu-bieu-service';

const listKey = queryKeys.danTocCaNhanTieuBieu.all;

export function useThongTinCaNhanTieuBieuList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getThongTinCaNhanTieuBieuList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useThongTinCaNhanTieuBieuDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && (options?.enabled !== false);
  return useQuery({
    queryKey: queryKeys.danTocCaNhanTieuBieu.detail(id?.trim() ?? '__'),
    queryFn: () => getThongTinCaNhanTieuBieuById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateThongTinCaNhanTieuBieu(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ThongTinCaNhanTieuBieuFormValues; idNguoiTao: string }) =>
      createThongTinCaNhanTieuBieu(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(created.id), created);
      toast.success(txt('danTocCaNhanTieuBieu.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThongTinCaNhanTieuBieu(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ThongTinCaNhanTieuBieuFormValues }) =>
      updateThongTinCaNhanTieuBieu(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(updated.id), updated);
      toast.success(txt('danTocCaNhanTieuBieu.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useUpdateThongTinCaNhanTieuBieuStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrangThaiHoatDong }) =>
      updateThongTinCaNhanTieuBieuStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(updated.id), updated);
      toast.success(txt('danTocCaNhanTieuBieu.toast.update'));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useDeleteThongTinCaNhanTieuBieuMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteThongTinCaNhanTieuBieuMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ThongTinCaNhanTieuBieu[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.danTocCaNhanTieuBieu.detail(id) });
      }
      toast.success(txt('danTocCaNhanTieuBieu.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}

export function useImportThongTinCaNhanTieuBieu(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importThongTinCaNhanTieuBieu(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      if (result.created > 0) {
        toast.success(txt('danTocCaNhanTieuBieu.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
}
