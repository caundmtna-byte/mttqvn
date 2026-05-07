import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqNhiemKy } from '../core/types';
import type { MttqNhiemKyFormValues } from '../core/schema';
import {
  createMttqNhiemKy,
  deleteMttqNhiemKyMany,
  getMttqNhiemKyById,
  getMttqNhiemKyList,
  importMttqNhiemKy,
  updateMttqNhiemKy,
} from '../services/mttq-nhiem-ky-service';

const listKey = queryKeys.mttqNhiemKy.all;

export const useMttqNhiemKyList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getMttqNhiemKyList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqNhiemKyDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqNhiemKy.detail(id ?? ''),
    queryFn: () => (id ? getMttqNhiemKyById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCreateMttqNhiemKy = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqNhiemKyFormValues; idNguoiTao: string }) =>
      createMttqNhiemKy(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(txt('matTranNhiemKy.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateMttqNhiemKy = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqNhiemKyFormValues }) => updateMttqNhiemKy(id, data),
    onSuccess: (updated, { id }) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.setQueryData<MttqNhiemKy | null>(queryKeys.mttqNhiemKy.detail(id), updated);
      toast.success(txt('matTranNhiemKy.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteMttqNhiemKyMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqNhiemKyMany,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqNhiemKy.detail(id) });
      }
      toast.success(txt('matTranNhiemKy.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useImportMttqNhiemKy = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importMttqNhiemKy(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      if (result.created > 0) {
        toast.success(txt('matTranNhiemKy.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
