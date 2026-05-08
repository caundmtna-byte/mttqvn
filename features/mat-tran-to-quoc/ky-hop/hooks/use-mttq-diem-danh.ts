import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions, masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import { txt } from '@/lib/text';
import type { MttqDiemDanhTrangThai, MttqDiemDanhUyVien } from '../core/types';
import { getDiemDanhForKyHop, getDiemDanhForNhiemKy, upsertDiemDanh } from '../services/mttq-diem-danh-service';
import type { MttqUyVienUyBanListRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';

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

export const useUpsertDiemDanh = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: {
      kyHopId: string;
      uyVienId: string;
      trangThai: MttqDiemDanhTrangThai;
      idNguoiTao: string;
      /** Khi có — invalidate ma trận điểm danh theo nhiệm kỳ */
      nhiemKyId?: string;
    }) =>
      upsertDiemDanh({
        kyHopId: args.kyHopId,
        uyVienId: args.uyVienId,
        trangThai: args.trangThai,
        idNguoiTao: args.idNguoiTao,
      }),
    onSuccess: (_data, { kyHopId, uyVienId, trangThai, nhiemKyId }) => {
      // 1) Patch local cache cho điểm danh kỳ họp — không refetch toàn bảng:
      //    Trước đây invalidate ⇒ mỗi tick = 1 round-trip cho cả bảng N ủy viên.
      //    Sau: setQueryData đổi đúng row tương ứng (hoặc thêm mới) — 0 egress.
      const kyHopKey = queryKeys.mttqDiemDanhUyVien.byKyHop(kyHopId);
      const oldKyHop = queryClient.getQueryData<MttqDiemDanhUyVien[]>(kyHopKey);
      const oldStatus = oldKyHop?.find((r) => r.uy_vien_id === uyVienId)?.trang_thai;
      queryClient.setQueryData<MttqDiemDanhUyVien[]>(kyHopKey, (cur) => {
        if (!cur) return cur;
        const idx = cur.findIndex((r) => r.uy_vien_id === uyVienId);
        if (idx === -1) {
          // Row mới — id thật trả về sau refetch tiếp theo (ghi_chu = null
          // mặc định để không hiển thị nội dung lạ).
          const placeholder: MttqDiemDanhUyVien = {
            id: '',
            ky_hop_id: kyHopId,
            uy_vien_id: uyVienId,
            trang_thai: trangThai,
            ghi_chu: null,
          };
          return [...cur, placeholder];
        }
        const next = cur.slice();
        next[idx] = { ...next[idx], trang_thai: trangThai };
        return next;
      });

      // 2) Patch summary counters trên ủy viên list — tính delta từ oldStatus → trangThai.
      //    Không invalidate `mttqUyVienUyBan.all` để tránh refetch toàn list mỗi tick.
      let dCo = 0;
      let dVang = 0;
      let dChua = 0;
      if (!oldStatus) {
        dChua = -1;
        if (trangThai === 'Có mặt') dCo = 1;
        else dVang = 1;
      } else if (oldStatus !== trangThai) {
        if (oldStatus === 'Có mặt') dCo = -1;
        else dVang = -1;
        if (trangThai === 'Có mặt') dCo += 1;
        else dVang += 1;
      }
      if (dCo !== 0 || dVang !== 0 || dChua !== 0) {
        const allKeys = queryClient.getQueriesData<MttqUyVienUyBanListRow[]>({
          queryKey: queryKeys.mttqUyVienUyBan.all,
        });
        for (const [k, list] of allKeys) {
          if (!Array.isArray(list)) continue;
          const next = list.map((row) =>
            row.id === uyVienId
              ? {
                  ...row,
                  diem_danh_co_mat: Math.max(0, (row.diem_danh_co_mat ?? 0) + dCo),
                  diem_danh_vang_mat: Math.max(0, (row.diem_danh_vang_mat ?? 0) + dVang),
                  diem_danh_chua: Math.max(0, (row.diem_danh_chua ?? 0) + dChua),
                }
              : row,
          );
          queryClient.setQueryData(k, next);
        }
      }

      // 3) Ma trận điểm danh nhiệm kỳ — mark stale (refetch khi user mở trang Ma trận).
      const nk = nhiemKyId?.trim();
      if (nk) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.mttqDiemDanhUyVien.byNhiemKy(nk),
          refetchType: 'none',
        });
      }
    },
    onError: (e: unknown) => {
      toast.error(getErrorMessage(e) || txt('matTranKyHop.diemDanh.saveFailed'));
    },
  });
};
