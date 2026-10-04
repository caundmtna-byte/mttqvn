import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import type { TiepNhanFormValues, TiepNhanTrangThaiValues } from '../core/schema';
import {
  deleteTiepNhanMany,
  getTiepNhanFull,
  getTnPhieuKhoCuaNhaTaiTro,
  luuTiepNhan,
  updateTiepNhanTrangThai,
} from '../services/tiep-nhan-service';

/** Bản đầy đủ — chi tiết, form sửa, trang in. */
export function useTiepNhanFull(id: string | null | undefined, options?: { enabled?: boolean }) {
  const key = id?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.tiepNhan.full(key || '__'),
    queryFn: () => getTiepNhanFull(key),
    enabled: key !== '' && options?.enabled !== false,
    ...transactionalCrudListQueryOptions,
  });
}

/** Phiếu "Nhập từ ngoài" của nhà tài trợ đang chọn — chỉ bật khi form mở. */
export function useTnPhieuKho(nhaTaiTroId: string | null | undefined) {
  const key = nhaTaiTroId?.trim() ?? '';
  return useQuery({
    queryKey: queryKeys.tiepNhan.phieuKho(key || '__'),
    queryFn: () => getTnPhieuKhoCuaNhaTaiTro(key),
    enabled: key !== '',
    ...transactionalCrudListQueryOptions,
  });
}

/**
 * Sau mỗi lần ghi: làm mới danh sách, bản đầy đủ, ô phiếu kho, và mọi số tổng hợp
 * đọc từ bảng này (Kết quả hỗ trợ của Nhà tài trợ, thành tích Khen thưởng NTT).
 */
function lamMoi(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tiepNhan.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.khoDonViCuuTro.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.khenThuongNhaTaiTro.all });
}

export function useLuuTiepNhan(onSuccess?: (id: string) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string | null; data: TiepNhanFormValues }) => luuTiepNhan(id, data),
    onSuccess: (savedId, { id }) => {
      lamMoi(queryClient);
      toast.success(txt(id ? 'matTranTiepNhan.toast.update' : 'matTranTiepNhan.toast.create'));
      onSuccess?.(savedId);
    },
  });
}

export function useUpdateTiepNhanTrangThai() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TiepNhanTrangThaiValues }) => updateTiepNhanTrangThai(id, data),
    onSuccess: () => {
      lamMoi(queryClient);
      toast.success(txt('matTranTiepNhan.toast.trangThai'));
    },
  });
}

export function useDeleteTiepNhanMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => deleteTiepNhanMany(ids),
    onSuccess: (_, ids) => {
      lamMoi(queryClient);
      toast.success(txt('matTranTiepNhan.toast.delete', { count: ids.length }));
    },
  });
}
