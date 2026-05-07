import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqLopTapHuan } from '../core/types';
import type { MttqTapHuanFormValues } from '../core/schema';
import {
  createMttqLopTapHuan,
  deleteMttqLopTapHuanMany,
  getMttqLopTapHuanById,
  getMttqLopTapHuanList,
  updateMttqLopTapHuan,
} from '../services/mttq-tap-huan-service';

const listKey = queryKeys.mttqLopTapHuan.all;

export const useMttqLopTapHuanList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getMttqLopTapHuanList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqLopTapHuanDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqLopTapHuan.detail(id ?? ''),
    queryFn: () => (id ? getMttqLopTapHuanById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCreateMttqLopTapHuan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqTapHuanFormValues; idNguoiTao: string }) =>
      createMttqLopTapHuan(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(txt('matTranTapHuan.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateMttqLopTapHuan = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqTapHuanFormValues }) =>
      updateMttqLopTapHuan(id, data),
    onSuccess: (updated, { id }) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.setQueryData<MttqLopTapHuan | null>(queryKeys.mttqLopTapHuan.detail(id), updated);
      toast.success(txt('matTranTapHuan.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteMttqLopTapHuanMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqLopTapHuanMany,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqLopTapHuan.detail(id) });
      }
      toast.success(txt('matTranTapHuan.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
