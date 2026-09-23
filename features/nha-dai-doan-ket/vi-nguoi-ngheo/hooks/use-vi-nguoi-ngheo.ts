import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { ViNguoiNgheoFormValues, ViNguoiNgheoStatusChangeValues } from '../core/schema';
import type { ViNguoiNgheo } from '../core/types';
import {
  createViNguoiNgheo,
  deleteViNguoiNgheoMany,
  getViNguoiNgheoByDonVi,
  getViNguoiNgheoByHoNgheo,
  getViNguoiNgheoById,
  getViNguoiNgheoList,
  getVnnHoNgheoOptions,
  updateViNguoiNgheo,
  updateViNguoiNgheoTrangThai,
} from '../services/vi-nguoi-ngheo-service';

const listKey = queryKeys.viNguoiNgheo.all;

/** Danh sách phẳng — tab Thống kê dùng; tab Danh sách đi qua RPC phân trang. */
export function useViNguoiNgheoList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: listKey,
    queryFn: getViNguoiNgheoList,
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

export function useViNguoiNgheoDetail(id: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(id?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.viNguoiNgheo.detail(id?.trim() ?? '__'),
    queryFn: () => getViNguoiNgheoById(id!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/** Các khoản của một hộ — mục "Chương trình vì người nghèo" trong chi tiết hộ nghèo. */
export function useViNguoiNgheoByHoNgheo(hoNgheoId: string | null, options?: { enabled?: boolean }) {
  const enabled = Boolean(hoNgheoId?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.viNguoiNgheo.byHoNgheo(hoNgheoId?.trim() ?? '__'),
    queryFn: () => getViNguoiNgheoByHoNgheo(hoNgheoId!.trim()),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/** Các khoản của một nhà tài trợ trong kỳ — mục "Thành tích" của Khen thưởng nhà tài trợ. */
export function useViNguoiNgheoByDonVi(
  donViId: string | null,
  tuNam: number | null,
  denNam: number | null,
  options?: { enabled?: boolean },
) {
  const enabled = Boolean(donViId?.trim()) && options?.enabled !== false;
  return useQuery({
    queryKey: queryKeys.viNguoiNgheo.byDonVi(donViId?.trim() ?? '__', tuNam, denNam),
    queryFn: () => getViNguoiNgheoByDonVi(donViId!.trim(), tuNam, denNam),
    enabled,
    ...transactionalCrudListQueryOptions,
  });
}

/** Chỉ bật khi form đang mở — kéo cả danh sách hộ là tốn egress nếu bật sẵn. */
export function useVnnHoNgheoOptions(xaPhuongId: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.viNguoiNgheo.hoNgheoOptions(xaPhuongId ?? ''),
    queryFn: () => getVnnHoNgheoOptions(xaPhuongId),
    enabled: options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Làm mới các trang phân trang server và danh sách theo hộ.
 *
 * Mutation chỉ `setQueryData` vào mảng phẳng `listKey`; trang danh sách đọc key
 * `[..., 'page', …]`, màn hộ nghèo `[..., 'by-ho-ngheo', …]`, khen thưởng nhà
 * tài trợ `[..., 'by-don-vi', …]` và cột thành tích của nó — không
 * invalidate thì bảng không đổi cho tới khi tải lại trang.
 */
function invalidateVnnDerived(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: [...listKey, 'page'] });
  void queryClient.invalidateQueries({ queryKey: [...listKey, 'by-ho-ngheo'] });
  void queryClient.invalidateQueries({ queryKey: [...listKey, 'by-don-vi'] });
  // Cột thành tích của Khen thưởng nhà tài trợ tính từ bảng này.
  void queryClient.invalidateQueries({ queryKey: queryKeys.khenThuongNhaTaiTro.all });
}

export function useCreateViNguoiNgheo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: ViNguoiNgheoFormValues; idNguoiTao: string }) =>
      createViNguoiNgheo(data, idNguoiTao),
    onSuccess: (created) => {
      queryClient.setQueryData<ViNguoiNgheo[]>(listKey, (old) => {
        if (!old) return old;
        return [created, ...old.filter((r) => r.id !== created.id)];
      });
      queryClient.setQueryData(queryKeys.viNguoiNgheo.detail(created.id), created);
      invalidateVnnDerived(queryClient);
      toast.success(txt('viNguoiNgheo.toast.create'));
      onSuccess?.();
    },
  });
}

export function useUpdateViNguoiNgheo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ViNguoiNgheoFormValues }) =>
      updateViNguoiNgheo(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ViNguoiNgheo[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.viNguoiNgheo.detail(updated.id), updated);
      invalidateVnnDerived(queryClient);
      toast.success(txt('viNguoiNgheo.toast.update'));
      onSuccess?.();
    },
  });
}

export function useUpdateViNguoiNgheoTrangThai(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ViNguoiNgheoStatusChangeValues }) =>
      updateViNguoiNgheoTrangThai(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData<ViNguoiNgheo[]>(listKey, (old) =>
        old?.map((r) => (r.id === updated.id ? updated : r)),
      );
      queryClient.setQueryData(queryKeys.viNguoiNgheo.detail(updated.id), updated);
      invalidateVnnDerived(queryClient);
      toast.success(txt('viNguoiNgheo.toast.statusChange'));
      onSuccess?.();
    },
  });
}

export function useDeleteViNguoiNgheoMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteViNguoiNgheoMany(ids),
    onSuccess: (_, ids) => {
      queryClient.setQueryData<ViNguoiNgheo[]>(listKey, (old) =>
        old?.filter((r) => !ids.includes(r.id)),
      );
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.viNguoiNgheo.detail(id) });
      }
      invalidateVnnDerived(queryClient);
      toast.success(txt('viNguoiNgheo.toast.delete', { count: ids.length }));
    },
  });
}
