import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions, masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqUyVienUyBan } from '../core/types';
import type { MttqUyVienUyBanFormValues } from '../core/schema';
import {
  createMttqUyVienUyBan,
  deleteMttqUyVienUyBanMany,
  getMttqUyVienUyBanById,
  getMttqUyVienUyBanList,
  getMttqUyVienUyBanListForNhiemKyId,
  getMttqUyVienUyBanStatsList,
  importMttqUyVienUyBan,
  updateMttqUyVienUyBan,
  UyVienUyBanConflictError,
} from '../services/mttq-uy-vien-uy-ban-service';

function uyVienMutationErrorMessage(e: unknown): string {
  if (e instanceof UyVienUyBanConflictError) return e.message;
  return getErrorMessage(e);
}

const listKey = queryKeys.mttqUyVienUyBan.all;
const statsListKey = queryKeys.mttqUyVienUyBan.stats;

export const useMttqUyVienUyBanList = (options?: { enabled?: boolean; donViId?: string | null }) =>
  useQuery({
    queryKey: [...listKey, options?.donViId ?? 'all'] as const,
    queryFn: () => getMttqUyVienUyBanList(options?.donViId),
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqUyVienUyBanStatsList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: statsListKey,
    queryFn: getMttqUyVienUyBanStatsList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqUyVienUyBanDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqUyVienUyBan.detail(id ?? ''),
    queryFn: () => (id ? getMttqUyVienUyBanById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

/** Ủy viên theo nhiệm kỳ — drawer chi tiết nhiệm kỳ. */
export const useMttqUyVienUyBanListForNhiemKy = (nhiemKyId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.mttqUyVienUyBan.byNhiemKy(nhiemKyId ?? ''),
    queryFn: () => getMttqUyVienUyBanListForNhiemKyId(nhiemKyId ?? ''),
    enabled: Boolean(nhiemKyId?.trim()) && options?.enabled !== false,
    // Danh sách ủy viên theo nhiệm kỳ thay đổi ít — 30 phút stale.
    ...masterDataQueryOptions,
  });

export const useCreateMttqUyVienUyBan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqUyVienUyBanFormValues; idNguoiTao: string }) =>
      createMttqUyVienUyBan(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: statsListKey });
      toast.success(txt('matTranUyVienUyBan.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(uyVienMutationErrorMessage(e)),
  });
};

export const useUpdateMttqUyVienUyBan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqUyVienUyBanFormValues }) =>
      updateMttqUyVienUyBan(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<MttqUyVienUyBan[]>(listKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData<MttqUyVienUyBan[]>(statsListKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData<MttqUyVienUyBan | null>(queryKeys.mttqUyVienUyBan.detail(id), updated);
      toast.success(txt('matTranUyVienUyBan.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(uyVienMutationErrorMessage(e)),
  });
};

export const useDeleteMttqUyVienUyBanMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqUyVienUyBanMany,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: statsListKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqUyVienUyBan.detail(id) });
      }
      toast.success(txt('matTranUyVienUyBan.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useImportMttqUyVienUyBan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importMttqUyVienUyBan(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: statsListKey });
      if (result.created > 0) {
        toast.success(txt('matTranUyVienUyBan.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
