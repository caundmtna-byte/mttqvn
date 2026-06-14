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
  getCongViecByChuongTrinhNamId,
  getCongViecDanhSachById,
  getCongViecDanhSachList,
  getCongViecDanhSachPage,
  updateCongViecDanhSach,
  type CongViecPageQuery,
} from '../services/cong-viec-danh-sach-service';

const listKey = queryKeys.congViecDanhSach.all;
const reportKey = queryKeys.congViecBaoCao.all;

/**
 * Đánh dấu cache báo cáo công việc là stale (không refetch ngay) khi bảng nguồn
 * thay đổi. `refetchType: 'none'` quan trọng: tránh kích hoạt 8 RPC khi user
 * đang ở trang công việc — chỉ refetch khi user thực sự mở trang Báo cáo.
 */
function invalidateReportCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: reportKey, refetchType: 'none' });
}

export const useCongViecDanhSachList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getCongViecDanhSachList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useCongViecDanhSachPage = (args: CongViecPageQuery & { enabled?: boolean }) => {
  const { enabled = true, ...q } = args;
  return useQuery({
    queryKey: queryKeys.congViecDanhSach.page(q),
    queryFn: () => getCongViecDanhSachPage(q),
    enabled,
    ...listQueryOptions,
  });
};

export const useCongViecDanhSachDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.congViecDanhSach.detail(id ?? ''),
    queryFn: () => (id ? getCongViecDanhSachById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

export const useCongViecByChuongTrinhNamId = (chuongTrinhId: string | null, options?: { enabled?: boolean }) => {
  const id = chuongTrinhId?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.congViecDanhSach.byChuongTrinh(id),
    queryFn: () => getCongViecByChuongTrinhNamId(id),
    enabled: Boolean(id) && (options?.enabled !== false),
    ...listQueryOptions,
  });
};

function invalidateCongViecByChuongQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  chuongTrinhId: string | null | undefined,
) {
  const s = chuongTrinhId?.trim();
  if (s) {
    void queryClient.invalidateQueries({ queryKey: queryKeys.congViecDanhSach.byChuongTrinh(s) });
  } else {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.congViecDanhSach.byChuongTrinhPrefix,
      exact: false,
    });
  }
}

export const useCreateCongViecDanhSach = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: CongViecDanhSachFormValues; idNguoiTao: string }) =>
      createCongViecDanhSach(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.setQueryData(queryKeys.congViecDanhSach.detail(created.id), created);
      invalidateCongViecByChuongQueries(queryClient, created.id_chuong_trinh);
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
    onSuccess: (updated, { id, data }) => {
      queryClient.setQueryData<CongViecDanhSach[]>(listKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.congViecDanhSach.detail(id), updated);
      invalidateCongViecByChuongQueries(queryClient, updated.id_chuong_trinh);
      invalidateCongViecByChuongQueries(queryClient, data.id_chuong_trinh ?? undefined);
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
      queryClient.invalidateQueries({ queryKey: listKey });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.congViecDanhSach.detail(id) });
      }
      invalidateCongViecByChuongQueries(queryClient, null);
      invalidateReportCache(queryClient);
      toast.success(txt('taskList.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
