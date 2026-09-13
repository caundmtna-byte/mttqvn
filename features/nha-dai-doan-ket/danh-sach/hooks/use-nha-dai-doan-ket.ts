import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type {
  NhaDaiDoanKetFormValues,
  NhaDaiDoanKetStatusChangeValues,
} from '../core/schema';
import type { NhaDaiDoanKet } from '../core/types';
import {
  createNhaDaiDoanKet,
  deleteNhaDaiDoanKetMany,
  getNhaDaiDoanKetById,
  getNhaDaiDoanKetList,
  updateNhaDaiDoanKet,
  updateNhaDaiDoanKetTrangThai,
} from '../services/nha-dai-doan-ket-service';

const listKey = queryKeys.nhaDaiDoanKet.all;

/** Danh sách phẳng — trang Thống kê dùng; trang Danh sách đi qua RPC phân trang. */
export function useNhaDaiDoanKetList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getNhaDaiDoanKetList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useNhaDaiDoanKetDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.nhaDaiDoanKet.detail(id?.trim() ?? '__'),
    queryFn: () => getNhaDaiDoanKetById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Làm mới các trang đang phân trang phía máy chủ.
 *
 * Mutation chỉ `setQueryData` vào mảng phẳng `listKey`, còn trang danh sách đọc
 * key `['nha-dai-doan-ket','page',…]` — không invalidate thì thêm/sửa/xóa xong
 * bảng không đổi cho tới khi tải lại trang.
 */
function invalidateNddkPages(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.nhaDaiDoanKet.all, 'page'] });
}

export function useCreateNhaDaiDoanKet(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: NhaDaiDoanKetFormValues; idNguoiTao: string }) =>
      createNhaDaiDoanKet(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<NhaDaiDoanKet[]>(listKey, (old) => {
        if (!old) return [created];
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.nhaDaiDoanKet.detail(created.id), created);
      invalidateNddkPages(queryClient);
      toast.success(txt('nhaDaiDoanKet.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateNhaDaiDoanKet(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NhaDaiDoanKetFormValues }) =>
      updateNhaDaiDoanKet(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<NhaDaiDoanKet[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.nhaDaiDoanKet.detail(updated.id), updated);
      invalidateNddkPages(queryClient);
      toast.success(txt('nhaDaiDoanKet.toast.update'));
      onSuccess?.();
    },
  });
}

/**
 * Đổi riêng trạng thái từ hộp thoại trên màn chi tiết.
 *
 * Tách khỏi `useUpdateNhaDaiDoanKet` vì đây là hành động nghiệp vụ khác: nó có
 * thể bị DB từ chối do thiếu quyền Duyệt, và toast báo thành công cũng khác.
 */
export function useUpdateNhaDaiDoanKetTrangThai(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: NhaDaiDoanKetStatusChangeValues }) =>
      updateNhaDaiDoanKetTrangThai(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<NhaDaiDoanKet[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.nhaDaiDoanKet.detail(updated.id), updated);
      invalidateNddkPages(queryClient);
      toast.success(txt('nhaDaiDoanKet.toast.statusChange'));
      onSuccess?.();
    },
  });
}

export function useDeleteNhaDaiDoanKetMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteNhaDaiDoanKetMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<NhaDaiDoanKet[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.nhaDaiDoanKet.detail(id) });
      }
      invalidateNddkPages(queryClient);
      toast.success(txt('nhaDaiDoanKet.toast.delete', { count: ids.length }));
    },
  });
}
