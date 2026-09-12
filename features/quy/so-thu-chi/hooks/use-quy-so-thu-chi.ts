import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { QuyKey } from '../../core/constants';
import type { QuySoThuChiFormValues } from '../core/schema';
import {
  createQuySoThuChi,
  deleteQuySoThuChiMany,
  getQuySoThuChiById,
  updateQuySoThuChi,
} from '../services/quy-so-thu-chi-service';

/**
 * Sau mỗi lần ghi, **cả trang sổ lẫn số dư đều phải tải lại**: số dư nằm ở
 * `quy_so_du_view`, và tổng thu/chi của tập đã lọc do RPC tính — không thể vá
 * bằng tay ở cache mà vẫn đúng.
 */
function invalidateSoQuy(
  queryClient: ReturnType<typeof useQueryClient>,
  quy: QuyKey,
): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.quySoThuChi.all(quy) });
  void queryClient.invalidateQueries({ queryKey: ['quy-so-thu-chi', 'page'] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.quySoThuChi.soDu(quy) });
}

export function useQuySoThuChiDetail(
  quy: QuyKey,
  id: string | null,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.quySoThuChi.detail(quy, id?.trim() ?? '__'),
    queryFn: () => getQuySoThuChiById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

export function useCreateQuySoThuChi(quy: QuyKey, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: QuySoThuChiFormValues) => createQuySoThuChi(quy, data),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.quySoThuChi.detail(quy, created.id), created);
      invalidateSoQuy(queryClient, quy);
      toast.success(txt('quy.soThuChi.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateQuySoThuChi(quy: QuyKey, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: QuySoThuChiFormValues }) =>
      updateQuySoThuChi(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.quySoThuChi.detail(quy, updated.id), updated);
      invalidateSoQuy(queryClient, quy);
      toast.success(txt('quy.soThuChi.toast.update'));
      onSuccess?.();
    },
  });
}

export function useDeleteQuySoThuChiMany(quy: QuyKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteQuySoThuChiMany(ids),
    onSuccess: (_, ids) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.quySoThuChi.detail(quy, id) });
      }
      invalidateSoQuy(queryClient, quy);
      toast.success(txt('quy.soThuChi.toast.delete', { count: ids.length }));
    },
  });
}
