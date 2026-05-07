import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { CongViecDanhSach } from '../core/types';
import type { CongViecDanhSachFormValues } from '../core/schema';
import {
  createCongViecDanhSach,
  deleteCongViecDanhSachMany,
  getCongViecDanhSachById,
  getCongViecDanhSachList,
  updateCongViecDanhSach,
} from '../services/cong-viec-danh-sach-service';

const listKey = queryKeys.congViecDanhSach.all;
const reportKey = queryKeys.congViecBaoCao.all;

/** Invalidate toàn bộ cache báo cáo công việc khi bảng nguồn thay đổi. */
function invalidateReportCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: reportKey });
}

export const useCongViecDanhSachList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getCongViecDanhSachList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useCongViecDanhSachDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.congViecDanhSach.detail(id ?? ''),
    queryFn: () => (id ? getCongViecDanhSachById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCreateCongViecDanhSach = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: CongViecDanhSachFormValues; idNguoiTao: string }) =>
      createCongViecDanhSach(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<CongViecDanhSach[]>(listKey, (old) => [...(old ?? []), created]);
      invalidateReportCache(queryClient);
      toast.success(txt('taskList.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateCongViecDanhSach = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CongViecDanhSachFormValues }) =>
      updateCongViecDanhSach(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<CongViecDanhSach[]>(listKey, (old) =>
        old?.map((x) => (x.id === id ? updated : x)),
      );
      queryClient.setQueryData(queryKeys.congViecDanhSach.detail(id), updated);
      invalidateReportCache(queryClient);
      toast.success(txt('taskList.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteCongViecDanhSachMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCongViecDanhSachMany,
    onSuccess: (_, ids) => {
      queryClient.setQueryData<CongViecDanhSach[]>(listKey, (old) =>
        old?.filter((x) => !ids.includes(x.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.congViecDanhSach.detail(id) });
      }
      invalidateReportCache(queryClient);
      toast.success(txt('taskList.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
