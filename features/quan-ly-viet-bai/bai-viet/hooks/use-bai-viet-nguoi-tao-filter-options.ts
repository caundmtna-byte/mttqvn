import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import {
  getBaiVietNguoiTaoFilterOptions,
  type BaiVietNguoiTaoFilterOptionsQuery,
} from '../services/bai-viet-danh-sach-service';

export function useBaiVietNguoiTaoFilterOptions(
  args: BaiVietNguoiTaoFilterOptionsQuery & { enabled?: boolean },
) {
  const { enabled = true, ...q } = args;
  return useQuery({
    queryKey: queryKeys.baiVietDanhSach.nguoiTaoFilterOptions({
      scope: q.scope,
      viewerDonViId: q.viewerDonViId,
    }),
    queryFn: () => getBaiVietNguoiTaoFilterOptions(q),
    enabled,
    ...listQueryOptions,
  });
}
