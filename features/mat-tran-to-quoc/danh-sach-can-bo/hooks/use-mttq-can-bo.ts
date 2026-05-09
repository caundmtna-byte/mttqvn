import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqCanBo } from '../core/types';
import type { MttqCanBoFormValues } from '../core/schema';
import {
  createMttqCanBo,
  deleteMttqCanBoMany,
  getMttqCanBoById,
  getMttqCanBoList,
  getMttqCanBoStatsList,
  updateMttqCanBo,
} from '../services/mttq-can-bo-service';
import { importMttqCanBoRows } from '../services/mttq-can-bo-import';

const listKey = queryKeys.mttqCanBo.all;
const statsListKey = queryKeys.mttqCanBo.stats;

export const useMttqCanBoList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getMttqCanBoList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqCanBoStatsList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: statsListKey,
    queryFn: getMttqCanBoStatsList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqCanBoDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqCanBo.detail(id ?? ''),
    queryFn: () => (id ? getMttqCanBoById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCreateMttqCanBo = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqCanBoFormValues; idNguoiTao: string }) =>
      createMttqCanBo(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<MttqCanBo[]>(listKey, (old) => [...(old ?? []), created]);
      queryClient.invalidateQueries({ queryKey: statsListKey });
      toast.success(txt('matTranCanBo.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateMttqCanBo = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqCanBoFormValues }) => updateMttqCanBo(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<MttqCanBo[]>(listKey, (old) => old?.map((x) => (x.id === id ? updated : x)));
      queryClient.invalidateQueries({ queryKey: statsListKey });
      queryClient.setQueryData(queryKeys.mttqCanBo.detail(id), updated);
      toast.success(txt('matTranCanBo.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteMttqCanBoMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqCanBoMany,
    onSuccess: (_, ids) => {
      queryClient.setQueryData<MttqCanBo[]>(listKey, (old) => old?.filter((x) => !ids.includes(x.id)));
      queryClient.invalidateQueries({ queryKey: statsListKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqCanBo.detail(id) });
      }
      toast.success(txt('matTranCanBo.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useImportMttqCanBo = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importMttqCanBoRows(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: statsListKey });
      if (result.created > 0) {
        toast.success(txt('matTranCanBo.import.toastSuccess', { count: String(result.created) }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 5).join('; '));
      }
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
