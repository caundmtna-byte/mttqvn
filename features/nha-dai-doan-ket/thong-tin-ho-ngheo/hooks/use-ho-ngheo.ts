import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { isConstraintFieldError } from '@/lib/supabase/constraint-field-error';
import { getErrorMessage } from '@/lib/utils';
import type {
  HoNgheoFormValues,
  HoNgheoStatusChangeValues,
} from '../core/schema';
import type { HoNgheo } from '../core/types';
import type { ImportRunOptions } from '@/components/shared/ImportDialog';
import { importHoNgheoRows, type HoNgheoImportContext } from '../services/ho-ngheo-import';
import { canViewHoNgheoRow, isHoNgheoScopedToXaPhuong, useHoNgheoViewer } from './use-ho-ngheo-viewer';
import {
  createHoNgheo,
  deleteHoNgheoMany,
  getHoNgheoById,
  getHoNgheoThongKeRows,
  type HoNgheoThongKeScope,
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
 * Một hộ ĐẦY ĐỦ, có nhân khẩu & đời sống — form sửa, màn chi tiết, trang in.
 *
 * Không dùng `useHoNgheoDetail`: cache `detail` được mồi bằng dòng của bảng
 * (RPC phân trang), thiếu các cột nhân khẩu ⇒ `nhan_khau === undefined`.
 */
export function useHoNgheoFull(id: string | null | undefined, options?: { enabled?: boolean }) {
  const key = id?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.hoNgheo.full(key || '__'),
    queryFn: () => getHoNgheoById(key),
    enabled: key !== '' && options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

/** Ghi kết quả mutation (đã là bản đầy đủ — `HNGH_RETURNING`) vào cả hai cache. */
function setHoNgheoCaches(queryClient: ReturnType<typeof useQueryClient>, row: HoNgheo): void {
  queryClient.setQueryData(queryKeys.hoNgheo.detail(row.id), row);
  queryClient.setQueryData(queryKeys.hoNgheo.full(row.id), row);
}

/**
 * Làm mới các trang đang phân trang phía máy chủ.
 *
 * Trang danh sách đọc key `['thong-tin-ho-ngheo','page',…]` — không invalidate
 * thì thêm/sửa/xóa xong bảng không đổi cho tới khi tải lại trang.
 */
function invalidateHoNgheoPages(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.hoNgheo.all, 'page'] });
  // Tab Thống kê cũng đếm trên cùng bảng — thêm/sửa/xoá/nhập xong phải ra số mới.
  void queryClient.invalidateQueries({ queryKey: [...queryKeys.hoNgheo.all, 'thong-ke'] });
}

/**
 * Dữ liệu tab Thống kê, ĐÃ áp phạm vi xem.
 *
 * Lọc hai lớp như trang danh sách: máy chủ chỉ trả xã của cán bộ xã, rồi
 * `canViewHoNgheoRow` gác lại ở client. Thiếu bước này thì số tổng là số toàn tỉnh.
 */
export function useHoNgheoThongKe(options: { enabled: boolean }) {
  const viewer = useHoNgheoViewer();
  const scope = useMemo<HoNgheoThongKeScope>(
    () =>
      isHoNgheoScopedToXaPhuong(viewer)
        ? { viewAll: false, xaPhuongId: viewer.viewerDonViId }
        : { viewAll: true },
    [viewer],
  );

  const query = useQuery({
    queryKey: queryKeys.hoNgheo.thongKe(scope),
    queryFn: () => getHoNgheoThongKeRows(scope),
    enabled: options.enabled,
    ...transactionalCrudListQueryOptions,
  });

  const rows = useMemo(
    () => (query.data ?? []).filter((r) => canViewHoNgheoRow(viewer, r)),
    [query.data, viewer],
  );

  return { ...query, rows };
}

export function useCreateHoNgheo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: HoNgheoFormValues; idNguoiTao: string }) =>
      createHoNgheo(data, idNguoiTao),
    onSuccess: (created) => {
      setHoNgheoCaches(queryClient, created);
      invalidateHoNgheoPages(queryClient);
      toast.success(txt('hoNgheo.toast.create'));
      onSuccess?.();
    },
    onError: (err: unknown) => {
      // Trùng / sai định dạng số căn cước ⇒ form gắn chữ đỏ dưới ô, không toast.
      if (isConstraintFieldError(err)) return;
      toast.error(getErrorMessage(err));
    },
  });
}

export function useUpdateHoNgheo(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: HoNgheoFormValues }) => updateHoNgheo(id, data),
    onSuccess: (updated) => {
      setHoNgheoCaches(queryClient, updated);
      invalidateHoNgheoPages(queryClient);
      toast.success(txt('hoNgheo.toast.update'));
      onSuccess?.();
    },
    onError: (err: unknown) => {
      if (isConstraintFieldError(err)) return;
      toast.error(getErrorMessage(err));
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
      setHoNgheoCaches(queryClient, updated);
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
        queryClient.removeQueries({ queryKey: queryKeys.hoNgheo.full(id) });
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

export function useImportHoNgheo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      rows,
      options,
      ctx,
    }: {
      rows: Record<string, unknown>[];
      options: ImportRunOptions;
      ctx: HoNgheoImportContext;
    }) => importHoNgheoRows(rows, options, ctx),
    onSuccess: (result) => {
      invalidateHoNgheoPages(queryClient);
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.hoNgheo.all, 'detail'] });
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.hoNgheo.all, 'full'] });
      // Ô chọn hộ ở form Vì người nghèo / Nhà đại đoàn kết đọc danh sách hộ riêng.
      void queryClient.invalidateQueries({ queryKey: queryKeys.viNguoiNgheo.all });
      if ((result.created ?? 0) + (result.updated ?? 0) > 0) {
        toast.success(
          txt('hoNgheo.import.toastDone', {
            created: String(result.created ?? 0),
            updated: String(result.updated ?? 0),
          }),
        );
      }
    },
  });
}
