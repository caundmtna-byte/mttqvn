import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions, masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqDiemDanhTrangThai, MttqDiemDanhUyVien } from '../core/types';
import { getDiemDanhForKyHop, getDiemDanhForNhiemKy, upsertDiemDanh } from '../services/mttq-diem-danh-service';
import { apDungPatchDiemDanh, hoanNguyenPatchDiemDanh } from '../utils/diem-danh-optimistic';

export const useDiemDanhForKyHop = (kyHopId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.mttqDiemDanhUyVien.byKyHop(kyHopId ?? ''),
    queryFn: () => getDiemDanhForKyHop(kyHopId ?? ''),
    enabled: Boolean(kyHopId?.trim()) && options?.enabled !== false,
    ...listQueryOptions,
  });

export const useDiemDanhForNhiemKy = (nhiemKyId: string | null, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: queryKeys.mttqDiemDanhUyVien.byNhiemKy(nhiemKyId ?? ''),
    queryFn: () => getDiemDanhForNhiemKy(nhiemKyId ?? ''),
    enabled: Boolean(nhiemKyId?.trim()) && options?.enabled !== false,
    // Ma trận điểm danh tương đối ổn định; dùng masterDataQueryOptions (30 phút stale)
    // để tránh refetch không cần thiết. Invalidate thủ công sau mỗi lần upsert.
    ...masterDataQueryOptions,
  });

/**
 * Tick điểm danh — hiện kết quả NGAY khi bấm, gửi lên máy chủ sau.
 *
 * Điểm danh là thao tác bấm liên tiếp hàng chục lần, nên nếu chờ máy chủ trả lời
 * rồi mới đổi giao diện thì mỗi nút bấm phải đợi một vòng mạng. Ở đây cache được
 * sửa trong `onMutate` (trước khi gửi), và nếu lưu thất bại thì `onError` trả
 * cache về đúng như cũ — người dùng thấy nút quay lại trạng thái trước kèm báo lỗi.
 *
 * Toàn bộ phần tính toán nằm ở `utils/diem-danh-optimistic.ts` và có test riêng.
 */
export const useUpsertDiemDanh = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      kyHopId: string;
      uyVienId: string;
      trangThai: MttqDiemDanhTrangThai;
      idNguoiTao: string;
      /** Khi có — cập nhật luôn ma trận điểm danh theo nhiệm kỳ */
      nhiemKyId?: string;
    }) =>
      upsertDiemDanh({
        kyHopId: args.kyHopId,
        uyVienId: args.uyVienId,
        trangThai: args.trangThai,
        idNguoiTao: args.idNguoiTao,
      }),

    onMutate: async ({ kyHopId, uyVienId, trangThai, nhiemKyId }) => {
      // Huỷ các lần tải đang chạy trên đúng những nhánh sắp sửa, nếu không dữ liệu
      // cũ về sau sẽ ghi đè lên kết quả vừa bấm.
      const nk = nhiemKyId?.trim();
      await Promise.all([
        queryClient.cancelQueries({ queryKey: queryKeys.mttqDiemDanhUyVien.byKyHop(kyHopId) }),
        queryClient.cancelQueries({ queryKey: queryKeys.mttqUyVienUyBan.all }),
        queryClient.cancelQueries({ queryKey: queryKeys.mttqKyHop.all }),
        ...(nk ? [queryClient.cancelQueries({ queryKey: queryKeys.mttqDiemDanhUyVien.byNhiemKy(nk) })] : []),
      ]);

      return apDungPatchDiemDanh(queryClient, { kyHopId, uyVienId, trangThai, nhiemKyId });
    },

    onSuccess: (saved, { kyHopId, uyVienId }) => {
      // Dòng vừa thêm lạc quan có `id` rỗng — thay bằng dòng thật máy chủ trả về
      // để các thao tác sau (sửa ghi chú, xoá) có id đúng.
      queryClient.setQueryData<MttqDiemDanhUyVien[]>(
        queryKeys.mttqDiemDanhUyVien.byKyHop(kyHopId),
        (cur) => cur?.map((r) => (r.ky_hop_id === kyHopId && r.uy_vien_id === uyVienId ? saved : r)),
      );
    },

    onError: (e: unknown, _vars, snapshot) => {
      hoanNguyenPatchDiemDanh(queryClient, snapshot);
      toast.error(getErrorMessage(e) || txt('matTranKyHop.diemDanh.saveFailed'));
    },

    onSettled: (_data, _err, { kyHopId, nhiemKyId }) => {
      // Đánh dấu cũ (KHÔNG tải lại ngay) — cache đã đúng nhờ patch/hoàn nguyên,
      // tải lại mỗi lần bấm sẽ đốt băng thông vô ích. Lần mở trang sau tự đồng bộ.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.mttqDiemDanhUyVien.byKyHop(kyHopId),
        refetchType: 'none',
      });
      const nk = nhiemKyId?.trim();
      if (nk) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.mttqDiemDanhUyVien.byNhiemKy(nk),
          refetchType: 'none',
        });
      }
    },
  });
};
