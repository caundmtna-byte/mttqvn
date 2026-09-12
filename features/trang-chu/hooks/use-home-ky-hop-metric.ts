/**
 * Số kỳ họp sắp diễn ra cho Trang chủ — 1 request đếm phía máy chủ.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useMttqKyHopViewer } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop-viewer';
import { getHomeKyHopUpcoming, type HomeKyHopUpcoming } from '../services/home-ky-hop-service';
import { canCountKyHop, resolveKyHopUpcomingScope } from '../utils/ky-hop-upcoming-scope';
import { homeTodayIso } from '../utils/build-home-task-args';

export interface UseHomeKyHopMetricResult {
  data: HomeKyHopUpcoming | null;
  visible: boolean;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function useHomeKyHopMetric(): UseHomeKyHopMetricResult {
  const access = useModuleAccess('matTranSession');
  const viewer = useMttqKyHopViewer();
  const scope = useMemo(() => resolveKyHopUpcomingScope(viewer), [viewer]);
  const today = homeTodayIso();

  // Chưa xác định được phạm vi (cán bộ xã chưa gắn đơn vị) thì không phát truy vấn:
  // đếm "không lọc" ở đây là lộ số liệu toàn tỉnh.
  const enabled = access.ready && canCountKyHop(scope);

  const q = useQuery({
    queryKey: queryKeys.trangChu.kyHopSapToi(scope, today),
    queryFn: () => getHomeKyHopUpcoming(scope, today),
    enabled,
    ...listQueryOptions,
  });

  return {
    data: q.data ?? null,
    visible: access.waiting || (access.canView && canCountKyHop(scope)),
    isLoading: access.waiting || (enabled && q.isPending),
    isError: q.isError,
    refetch: () => void q.refetch(),
  };
}
