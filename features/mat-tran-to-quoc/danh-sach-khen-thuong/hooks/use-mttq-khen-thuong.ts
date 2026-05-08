import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqKhenThuong, MttqKhenThuongLineForCanBo } from '../core/types';
import type { MttqKhenThuongFormValues } from '../core/schema';
import {
  createMttqKhenThuong,
  deleteMttqKhenThuongMany,
  getMttqKhenThuongById,
  getMttqKhenThuongList,
  getMttqKhenThuongLinesForCanBoId,
  updateMttqKhenThuong,
} from '../services/mttq-khen-thuong-service';

const listKey = queryKeys.mttqKhenThuong.all;

export const useMttqKhenThuongList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getMttqKhenThuongList,
    enabled: options?.enabled !== false,
    ...listQueryOptions,
  });

export const useMttqKhenThuongDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqKhenThuong.detail(id ?? ''),
    queryFn: () => (id ? getMttqKhenThuongById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...listQueryOptions,
  });

/** Dòng khen thưởng liên quan một cán bộ (bảng con trên detail cán bộ). */
export const useMttqKhenThuongLinesForCanBo = (canBoId: string | null, options?: { enabled?: boolean }) =>
  useQuery<MttqKhenThuongLineForCanBo[]>({
    queryKey: queryKeys.mttqKhenThuong.byCanBo(canBoId?.trim() ?? ''),
    queryFn: () => getMttqKhenThuongLinesForCanBoId(canBoId!.trim()),
    enabled: Boolean(canBoId?.trim()) && (options?.enabled !== false),
    ...listQueryOptions,
  });

export const useCreateMttqKhenThuong = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqKhenThuongFormValues; idNguoiTao: string }) =>
      createMttqKhenThuong(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      // `byCanBoPrefix` chỉ active trên trang detail cán bộ — mark stale, refetch
      // khi user mở lại detail. Tránh refetch tất cả `byCanBo(*)` cache lúc tạo mới.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mttqKhenThuong.byCanBoPrefix,
        refetchType: 'none',
      });
      toast.success(txt('matTranKhenThuong.toast.create'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useUpdateMttqKhenThuong = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqKhenThuongFormValues }) => updateMttqKhenThuong(id, data),
    onSuccess: (updated, { id }) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mttqKhenThuong.byCanBoPrefix,
        refetchType: 'none',
      });
      queryClient.setQueryData<MttqKhenThuong | null>(queryKeys.mttqKhenThuong.detail(id), updated);
      toast.success(txt('matTranKhenThuong.toast.update'));
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};

export const useDeleteMttqKhenThuongMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqKhenThuongMany,
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mttqKhenThuong.byCanBoPrefix,
        refetchType: 'none',
      });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqKhenThuong.detail(id) });
      }
      toast.success(txt('matTranKhenThuong.toast.delete', { count: ids.length }));
    },
    onError: (e: unknown) => toast.error(getErrorMessage(e)),
  });
};
