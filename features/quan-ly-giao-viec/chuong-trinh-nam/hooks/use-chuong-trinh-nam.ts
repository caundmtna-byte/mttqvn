import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { ChuongTrinhNam, ChuongTrinhNamListRow } from '../core/types';
import type { ChuongTrinhNamFormValues } from '../core/schema';
import {
  chuongTrinhNamToListRow,
  createChuongTrinhNam,
  deleteChuongTrinhNamMany,
  getChuongTrinhNamById,
  getChuongTrinhNamList,
  updateChuongTrinhNam,
} from '../services/chuong-trinh-nam-service';

const listKey = queryKeys.chuongTrinhNam.all;

export const useChuongTrinhNamList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getChuongTrinhNamList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useChuongTrinhNamDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.chuongTrinhNam.detail(id ?? ''),
    queryFn: () => (id ? getChuongTrinhNamById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCreateChuongTrinhNam = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ChuongTrinhNamFormValues; idNguoiTao: string }) =>
      createChuongTrinhNam(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ChuongTrinhNamListRow[]>(listKey, (old) => {
        const row = chuongTrinhNamToListRow(created);
        if (!old?.length) return [row];
        return [row, ...old];
      });
      queryClient.setQueryData(queryKeys.chuongTrinhNam.detail(created.id), created);
      toast.success(txt('chuongTrinhNam.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateChuongTrinhNam = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ChuongTrinhNamFormValues }) =>
      updateChuongTrinhNam(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<ChuongTrinhNamListRow[]>(listKey, (old) =>
        old?.map((r) => (r.id === id ? chuongTrinhNamToListRow(updated) : r)),
      );
      queryClient.setQueryData<ChuongTrinhNam | null>(queryKeys.chuongTrinhNam.detail(id), updated);
      toast.success(txt('chuongTrinhNam.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteChuongTrinhNamMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteChuongTrinhNamMany,
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ChuongTrinhNamListRow[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.chuongTrinhNam.detail(id) });
      }
      toast.success(txt('chuongTrinhNam.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
