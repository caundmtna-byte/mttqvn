/**
 * Số cán bộ sắp đến hạn nâng bậc lương cho Trang chủ — 1 request đếm phía máy chủ.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useMttqTangLuongViewer } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/hooks/use-mttq-tang-luong-viewer';
import {
  getHomeTangLuongSapDenHan,
  HOME_TANG_LUONG_SO_NGAY,
  type HomeTangLuongSapDenHan,
} from '../services/home-tang-luong-service';
import { resolveTangLuongHomeScope } from '../utils/tang-luong-home-scope';

export interface UseHomeTangLuongMetricResult {
  data: HomeTangLuongSapDenHan | null;
  visible: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useHomeTangLuongMetric(): UseHomeTangLuongMetricResult {
  const access = useModuleAccess('matTranSalaryIncreaseList');
  const viewer = useMttqTangLuongViewer();
  const scope = useMemo(() => resolveTangLuongHomeScope(viewer), [viewer]);

  // Không xác định được phạm vi (cán bộ xã chưa gắn đơn vị) thì không phát truy
  // vấn — đếm "không lọc" ở đây là lộ số liệu lương toàn tỉnh.
  const enabled = access.ready && scope != null;

  const q = useQuery({
    queryKey: queryKeys.trangChu.tangLuongSapDenHan(scope, HOME_TANG_LUONG_SO_NGAY),
    queryFn: () => getHomeTangLuongSapDenHan(scope!, HOME_TANG_LUONG_SO_NGAY),
    enabled,
    ...listQueryOptions,
  });

  return {
    data: q.data ?? null,
    visible: access.waiting || (access.canView && scope != null),
    isLoading: access.waiting || (enabled && q.isPending),
    isError: q.isError,
    refetch: () => void q.refetch(),
  };
}
