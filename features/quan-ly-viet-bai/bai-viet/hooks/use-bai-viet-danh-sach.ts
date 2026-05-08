import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { BaiVietDanhSach } from '../core/types';
import type { BaiVietDanhSachFormValues } from '../core/schema';
import {
  createBaiVietDanhSach,
  deleteBaiVietDanhSachMany,
  getBaiVietDanhSachById,
  getBaiVietDanhSachList,
  getBaiVietDanhSachPage,
  updateBaiVietDanhSach,
  type BaiVietPageQuery,
} from '../services/bai-viet-danh-sach-service';

const listKey = queryKeys.baiVietDanhSach.all;

export const useBaiVietDanhSachList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getBaiVietDanhSachList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useBaiVietDanhSachPage = (args: BaiVietPageQuery & { enabled?: boolean }) => {
  const { enabled = true, ...q } = args;
  return useQuery({
    queryKey: queryKeys.baiVietDanhSach.page(q),
    queryFn: () => getBaiVietDanhSachPage(q),
    enabled,
    ...listQueryOptions,
  });
};

export const useBaiVietDanhSachDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.baiVietDanhSach.detail(id ?? ''),
    queryFn: () => (id ? getBaiVietDanhSachById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCreateBaiVietDanhSach = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: BaiVietDanhSachFormValues; idNguoiTao: string }) =>
      createBaiVietDanhSach(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.setQueryData(queryKeys.baiVietDanhSach.detail(created.id), created);
      toast.success(txt('articleList.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateBaiVietDanhSach = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BaiVietDanhSachFormValues }) =>
      updateBaiVietDanhSach(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.setQueryData(queryKeys.baiVietDanhSach.detail(id), updated);
      toast.success(txt('articleList.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteBaiVietDanhSachMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteBaiVietDanhSachMany,
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.baiVietDanhSach.detail(id) });
      }
      toast.success(txt('articleList.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
