import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { BaiVietDanhSachFormValues } from '../core/schema';
import {
  createBaiVietDanhSach,
  deleteBaiVietDanhSachMany,
  getBaiVietDanhSachById,
  getBaiVietDanhSachList,
  updateBaiVietDanhSach,
} from '../services/bai-viet-danh-sach-service';

const listKey = queryKeys.baiVietDanhSach.all;

export const useBaiVietDanhSachList = () =>
  useQuery({
    queryKey: listKey,
    queryFn: getBaiVietDanhSachList,
  });

export const useBaiVietDanhSachDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.baiVietDanhSach.detail(id ?? ''),
    queryFn: () => (id ? getBaiVietDanhSachById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });

export const useCreateBaiVietDanhSach = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: BaiVietDanhSachFormValues; idNguoiTao: string }) =>
      createBaiVietDanhSach(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
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
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.baiVietDanhSach.detail(id) });
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
      void queryClient.invalidateQueries({ queryKey: listKey });
      for (const id of ids) {
        void queryClient.removeQueries({ queryKey: queryKeys.baiVietDanhSach.detail(id) });
      }
      toast.success(txt('articleList.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
