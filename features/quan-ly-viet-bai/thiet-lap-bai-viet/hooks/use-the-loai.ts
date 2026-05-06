import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import {
  getTheLoais,
  createTheLoai,
  updateTheLoai,
  deleteTheLoais,
} from '../services/the-loai-service';
import type { TheLoaiFormValues } from '../core/schema';
import type { BaiVietTheLoai } from '../core/types';

const qk = queryKeys.baiVietTheLoai.all;

export const useTheLoais = () =>
  useQuery({
    queryKey: qk,
    queryFn: getTheLoais,
    ...masterDataQueryOptions,
  });

export const useCreateTheLoai = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTheLoai,
    onSuccess: (created) => {
      queryClient.setQueryData<BaiVietTheLoai[]>(qk, (old) =>
        old ? [...old, created].sort((a, b) => a.ten_the_loai.localeCompare(b.ten_the_loai)) : [created],
      );
      toast.success(txt('articleSettings.toast.theLoaiCreate'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateTheLoai = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TheLoaiFormValues }) => updateTheLoai(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<BaiVietTheLoai[]>(qk, (old) => old?.map((r) => (r.id === updated.id ? updated : r)));
      toast.success(txt('articleSettings.toast.theLoaiUpdate'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteTheLoais = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTheLoais,
    onSuccess: (_, ids) => {
      queryClient.setQueryData<BaiVietTheLoai[]>(qk, (old) => old?.filter((r) => !ids.includes(r.id)));
      toast.success(txt('articleSettings.toast.theLoaiDelete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
