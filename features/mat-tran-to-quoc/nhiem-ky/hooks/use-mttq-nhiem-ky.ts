import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
// Khuôn "xóa hiện ngay" dùng chung của khối Mặt trận — đặt cạnh module kỳ họp.
import { hoanNguyenCache, xoaDongKhoiCache } from '@/features/mat-tran-to-quoc/ky-hop/utils/xoa-optimistic';
import type { MttqNhiemKy } from '../core/types';
import type { MttqNhiemKyFormValues } from '../core/schema';
import {
  createMttqNhiemKy,
  deleteMttqNhiemKyMany,
  getMttqNhiemKyById,
  getMttqNhiemKyList,
  importMttqNhiemKy,
  setMttqNhiemKyDaKhoa,
  updateMttqNhiemKy,
} from '../services/mttq-nhiem-ky-service';

const listKey = queryKeys.mttqNhiemKy.all;

export const useMttqNhiemKyList = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: listKey,
    queryFn: getMttqNhiemKyList,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });

export const useMttqNhiemKyDetail = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.mttqNhiemKy.detail(id ?? ''),
    queryFn: () => (id ? getMttqNhiemKyById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
    ...masterDataQueryOptions,
  });

export const useCreateMttqNhiemKy = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ data, idNguoiTao }: { data: MttqNhiemKyFormValues; idNguoiTao: string }) =>
      createMttqNhiemKy(data, idNguoiTao),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      toast.success(txt('matTranNhiemKy.toast.create'));
      onSuccess?.();
    },
  });
};

export const useUpdateMttqNhiemKy = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: MttqNhiemKyFormValues }) => updateMttqNhiemKy(id, data),
    onSuccess: (updated, { id }) => {
      queryClient.setQueryData<MttqNhiemKy[]>(listKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData<MttqNhiemKy | null>(queryKeys.mttqNhiemKy.detail(id), updated);
      toast.success(txt('matTranNhiemKy.toast.update'));
      onSuccess?.();
    },
  });
};

/**
 * Khoá sổ / mở khoá nhiệm kỳ.
 *
 * Sau khi đổi phải nạp lại cả danh sách kỳ họp và uỷ viên của nhiệm kỳ: hai
 * danh sách đó mang theo cờ khoá của nhiệm kỳ cha để ẩn nút Thêm/Sửa/Xoá, không
 * nạp lại thì người dùng vẫn thấy nút cũ rồi bấm vào mới nhận lỗi.
 */
export const useSetMttqNhiemKyDaKhoa = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, daKhoa }: { id: string; daKhoa: boolean }) => setMttqNhiemKyDaKhoa(id, daKhoa),
    onSuccess: (updated, { id, daKhoa }) => {
      queryClient.setQueryData<MttqNhiemKy[]>(listKey, (cur) =>
        cur?.map((r) => (r.id === id ? updated : r)),
      );
      queryClient.setQueryData<MttqNhiemKy | null>(queryKeys.mttqNhiemKy.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqKyHop.byNhiemKy(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.byNhiemKy(id) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqKyHop.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.all });
      toast.success(txt(daKhoa ? 'matTranNhiemKy.toast.khoa' : 'matTranNhiemKy.toast.moKhoa'));
    },
  });
};

/**
 * Xóa nhiệm kỳ — dòng biến mất khỏi bảng ngay khi xác nhận, hỏng thì hiện lại.
 */
export const useDeleteMttqNhiemKyMany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMttqNhiemKyMany,
    onMutate: async (ids: string[]) => {
      // Huỷ lần tải đang chạy, nếu không dữ liệu cũ về sau sẽ dựng lại dòng vừa xóa.
      await queryClient.cancelQueries({ queryKey: listKey });
      return xoaDongKhoiCache<MttqNhiemKy>(queryClient, listKey, ids);
    },
    onSuccess: (_, ids) => {
      void queryClient.invalidateQueries({ queryKey: listKey, refetchType: 'none' });
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: queryKeys.mttqNhiemKy.detail(id) });
      }
      toast.success(txt('matTranNhiemKy.toast.delete', { count: ids.length }));
    },
    onError: (err: unknown, _ids, snapshot) => {
      hoanNguyenCache(queryClient, snapshot);
      toast.error(getErrorMessage(err));
    },
  });
};

export const useImportMttqNhiemKy = (onSuccess?: () => void) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rows, idNguoiTao }: { rows: Record<string, unknown>[]; idNguoiTao: string }) =>
      importMttqNhiemKy(rows, idNguoiTao),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: listKey });
      if (result.created > 0) {
        toast.success(txt('matTranNhiemKy.toast.importSuccess', { count: result.created }));
      }
      if (result.errors.length > 0) {
        toast.warning(result.errors.slice(0, 3).join('; '));
      }
      onSuccess?.();
    },
  });
};
