import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type {
  HoNgheoFormValues,
  HoNgheoStatusChangeValues,
} from '../core/schema';
import type { HoNgheo } from '../core/types';
import {
  createHoNgheo,
  deleteHoNgheoMany,
  getHoNgheoById,
  updateHoNgheo,
  updateHoNgheoTrangThai,
} from '../services/ho-ngheo-service';

export function useHoNgheoDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.hoNgheo.detail(id?.trim() ?? '__'),
    queryFn: () => getHoNgheoById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Làm mới các trang đang phân trang phía máy chủ.
 *
 * Trang danh sách đọc key `['thong-tin-ho-ngheo','page',…]` — không invalidate
 * thì thêm/sửa/xóa xong bảng không đổi cho tới khi tải lại trang.
 */
function invalidateHoNgheoPages(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.hoNgheo.all, 'page'] });
}

export function useCreateHoNgheo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: HoNgheoFormValues; idNguoiTao: string }) =>
      createHoNgheo(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.hoNgheo.detail(created.id), created);
      invalidateHoNgheoPages(queryClient);
      toast.success(txt('hoNgheo.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateHoNgheo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HoNgheoFormValues }) => updateHoNgheo(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.hoNgheo.detail(updated.id), updated);
      invalidateHoNgheoPages(queryClient);
      toast.success(txt('hoNgheo.toast.update'));
      onSuccess?.();
    },
  });
}

/**
 * Đổi riêng trạng thái từ hộp thoại trên màn chi tiết.
 *
 * Tách khỏi `useUpdateHoNgheo` vì đây là hành động nghiệp vụ khác: nó để lại vết
 * ở `lich_su_trang_thai` và toast báo cũng khác.
 */
export function useUpdateHoNgheoTrangThai(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HoNgheoStatusChangeValues }) =>
      updateHoNgheoTrangThai(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.hoNgheo.detail(updated.id), updated);
      invalidateHoNgheoPages(queryClient);
      toast.success(txt('hoNgheo.toast.statusChange'));
      onSuccess?.();
    },
  });
}

export function useDeleteHoNgheoMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteHoNgheoMany(ids),
    onSuccess: (_, ids) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.hoNgheo.detail(id) });
        queryClient.removeQueries({ queryKey: queryKeys.viNguoiNgheo.byHoNgheo(id) });
      }
      invalidateHoNgheoPages(queryClient);
      // Khoản hỗ trợ của hộ vẫn còn (FK SET NULL), chỉ mất liên kết.
      void queryClient.invalidateQueries({ queryKey: queryKeys.viNguoiNgheo.all });
      toast.success(txt('hoNgheo.toast.delete', { count: ids.length }));
    },
  });
}

/** Hồ sơ Nhà đại đoàn kết đã gắn cho hộ — chỉ đọc, sửa ở module gốc. */
export function useNhaDaiDoanKetCuaHo(hoNgheoId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(hoNgheoId?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.hoNgheo.nhaDaiDoanKet(hoNgheoId?.trim() ?? '__'),
    queryFn: async () => {
      const { getNhaCuaHoNgheo } = await import('../services/nha-cua-ho-service');
      return getNhaCuaHoNgheo(hoNgheoId!.trim());
    },
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}
