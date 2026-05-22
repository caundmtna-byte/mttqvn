import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getErrorMessage } from '@/lib/utils';
import type { LuongThietLapCauHinhRow } from '../core/types';
import { getLuongThietLapCauHinh, updateLuongThietLapCauHinhMucLuong } from '../services/luong-thiet-lap-cau-hinh-service';

const singletonKey = queryKeys.luongThietLapCauHinh.singleton;

export function useLuongThietLapCauHinh(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: singletonKey,
    queryFn: getLuongThietLapCauHinh,
    enabled: options?.enabled !== false,
    ...masterDataQueryOptions,
  });
}

export function useUpdateLuongThietLapCauHinh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (muc_luong_co_so: number) => updateLuongThietLapCauHinhMucLuong(muc_luong_co_so),
    onSuccess: (row) => {
      queryClient.setQueryData<LuongThietLapCauHinhRow | null>(singletonKey, row);
      toast.success(txt('matTranThietLapLuong.toast.mlcs'));
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err)),
  });
}
