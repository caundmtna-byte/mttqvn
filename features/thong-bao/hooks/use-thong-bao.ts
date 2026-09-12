/**
 * Hook cho chuông thông báo.
 *
 * Nhịp gọi máy chủ (egress — free-tier 5 GB/tháng):
 *   · mở app 1 lần  → 1 request đếm chưa đọc (`head`, không có dòng nào trong phản hồi);
 *   · mở chuông     → 1 request lấy danh sách, và chỉ khi thực sự mở;
 *   · đánh dấu đọc  → 1 request, cache được vá tại chỗ, KHÔNG gọi lại danh sách.
 *
 * `staleTime` 5 phút + `refetchOnWindowFocus: false` (mặc định của QueryClient gốc)
 * nghĩa là chuyển tab qua lại không sinh thêm request nào.
 */
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { useAuthStore } from '@/store/useStore';
import {
  getSoThongBaoChuaDoc,
  getThongBaoList,
  danhDauDaDoc,
  danhDauTatCaDaDoc,
} from '../services/thong-bao-service';
import type { ThongBao } from '../core/types';

/** `var_nhan_vien.id` của người đang đăng nhập, hoặc null khi tài khoản chưa gắn hồ sơ. */
function useNhanVienId(): string | null {
  const nhanVienId = useAuthStore((s) => s.user?.nhan_vien_id);
  const s = String(nhanVienId ?? '').trim();
  return s === '' ? null : s;
}

export interface UseThongBaoResult {
  /** Số chưa đọc — nguồn duy nhất cho huy hiệu trên chuông. */
  soChuaDoc: number;
  /** Danh sách (chỉ có dữ liệu sau khi chuông được mở lần đầu). */
  danhSach: ThongBao[];
  dangTaiDanhSach: boolean;
  loiDanhSach: boolean;
  /** Có hồ sơ nhân viên để nhận thông báo không — chưa có thì không phát truy vấn nào. */
  saiSang: boolean;
  taiLai: () => void;
  danhDauMotCaiDaDoc: (id: string) => Promise<void>;
  danhDauTatCa: () => Promise<number>;
  dangDanhDauTatCa: boolean;
}

/**
 * @param moChuong  true khi người dùng thực sự mở panel — chỉ lúc đó mới tải danh sách.
 */
export function useThongBao(moChuong: boolean): UseThongBaoResult {
  const nhanVienId = useNhanVienId();
  const queryClient = useQueryClient();
  const saiSang = nhanVienId != null;

  const dem = useQuery({
    queryKey: queryKeys.thongBao.soChuaDoc(nhanVienId ?? ''),
    queryFn: getSoThongBaoChuaDoc,
    enabled: saiSang,
    ...listQueryOptions,
  });

  const list = useQuery({
    queryKey: queryKeys.thongBao.list(nhanVienId ?? ''),
    queryFn: getThongBaoList,
    enabled: saiSang && moChuong,
    ...listQueryOptions,
  });

  const listKey = queryKeys.thongBao.list(nhanVienId ?? '');
  const demKey = queryKeys.thongBao.soChuaDoc(nhanVienId ?? '');

  /** Vá cache thay vì invalidate — tránh một cặp request thừa sau mỗi lần bấm. */
  const vaCache = useCallback(
    (capNhat: (cu: ThongBao[]) => ThongBao[], soChuaDocMoi: (cu: number) => number) => {
      queryClient.setQueryData<ThongBao[]>(listKey, (cu) => (cu ? capNhat(cu) : cu));
      queryClient.setQueryData<number>(demKey, (cu) => soChuaDocMoi(cu ?? 0));
    },
    [queryClient, listKey, demKey],
  );

  const mDanhDau = useMutation({
    mutationFn: danhDauDaDoc,
    onSuccess: (_kq, id) => {
      vaCache(
        (cu) => cu.map((x) => (x.id === id ? { ...x, da_doc: true } : x)),
        (cu) => Math.max(0, cu - 1),
      );
    },
  });

  const mDanhDauTatCa = useMutation({
    mutationFn: danhDauTatCaDaDoc,
    onSuccess: () => {
      vaCache(
        (cu) => cu.map((x) => (x.da_doc ? x : { ...x, da_doc: true })),
        () => 0,
      );
    },
  });

  const danhDauMotCaiDaDoc = useCallback(
    async (id: string) => {
      await mDanhDau.mutateAsync(id);
    },
    [mDanhDau],
  );

  const danhDauTatCa = useCallback(() => mDanhDauTatCa.mutateAsync(), [mDanhDauTatCa]);

  const taiLai = useCallback(() => {
    void dem.refetch();
    void list.refetch();
  }, [dem, list]);

  return {
    soChuaDoc: dem.data ?? 0,
    danhSach: list.data ?? [],
    dangTaiDanhSach: saiSang && moChuong && list.isPending,
    loiDanhSach: list.isError,
    saiSang,
    taiLai,
    danhDauMotCaiDaDoc,
    danhDauTatCa,
    dangDanhDauTatCa: mDanhDauTatCa.isPending,
  };
}
