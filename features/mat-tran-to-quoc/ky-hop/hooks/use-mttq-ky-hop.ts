import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqKyHop } from '../core/types';
import type { MttqKyHopFormValues } from '../core/schema';
import {
  createMttqKyHop,
  deleteMttqKyHopMany,
  getMttqKyHopById,
  getMttqKyHopList,
  getMttqKyHopListForNhiemKyId,
  importMttqKyHop,
  updateMttqKyHop,
} from '../services/mttq-ky-hop-service';

const listKey = queryKeys.mttqKyHop.all;

export const useMttqKyHopList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getMttqKyHopList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqKyHopDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqKyHop.detail(id ?? ''),
    queryFn: () => (id ? getMttqKyHopById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

/** Kỳ họp theo nhiệm kỳ — drawer chi tiết nhiệm kỳ. */
export const useMttqKyHopListForNhiemKy = (nhiemKyId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.mttqKyHop.byNhiemKy(nhiemKyId ?? ''),
    queryFn: () => getMttqKyHopListForNhiemKyId(nhiemKyId ?? ''),
    enabled: Boolean(nhiemKyId?.trim()) && options?.enabled !== false,
    ...listQueryOptions,
  });

export const useCreateMttqKyHop = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqKyHopFormValues; idNguoiTao: string }) =>
      createMttqKyHop(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(txt('matTranKyHop.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateMttqKyHop = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqKyHopFormValues }) => updateMttqKyHop(id, data),
    onSuccess: (updated, { id }) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.setQueryData<MttqKyHop | null>(queryKeys.mttqKyHop.detail(id), updated);
      toast.success(txt('matTranKyHop.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteMttqKyHopMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqKyHopMany,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqKyHop.detail(id) });
      }
      toast.success(txt('matTranKyHop.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useImportMttqKyHop = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importMttqKyHop(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      if (result.created > 0) {
        toast.success(txt('matTranKyHop.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
