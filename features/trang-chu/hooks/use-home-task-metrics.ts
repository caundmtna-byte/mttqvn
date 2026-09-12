/**
 * Số liệu công việc "của tôi" cho Trang chủ — 2 lần gọi RPC, mỗi lần trả về đúng 1 dòng.
 *
 * Dùng lại RPC `cong_viec_bao_cao_kpi` đã tính sẵn phía máy chủ (`qua_han`, `sap_het_han`)
 * thay vì kéo bảng công việc về đếm ở client.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { getTaskReportKpi } from '@/features/quan-ly-giao-viec/bao-cao-cong-viec/services/cong-viec-bao-cao-service';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useAuthStore } from '@/store/useStore';
import {
  buildMyAssignedOpenKpiArgs,
  buildMyTasksKpiArgs,
  resolveHomeViewerId,
} from '../utils/build-home-task-args';

export interface HomeTaskMetrics {
  /** Việc tôi phụ trách đã quá thời hạn. */
  quaHan: number;
  /** Việc tôi phụ trách còn ≤ 3 ngày là đến hạn (ngưỡng do RPC `cong_viec_bao_cao_kpi` quy định). */
  sapHetHan: number;
  /** Việc tôi giao cho người khác, chưa Hoàn thành và chưa Hủy. */
  toiGiaoChuaXong: number;
}

export interface UseHomeTaskMetricsResult {
  data: HomeTaskMetrics | null;
  /** Có được phép hiện nhóm thẻ này không (quyền xem module Công việc + đã gắn hồ sơ nhân viên). */
  visible: boolean;
  /** Đang chờ ma trận quyền hoặc đang tải số liệu. */
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * Thẻ công việc chỉ hiện khi:
 * 1. Có quyền xem module Công việc (`useModuleAccess('tasks')`) — chưa biết thì hiện khung chờ,
 *    không hiện thẻ rồi giấu đi.
 * 2. Tài khoản đã gắn `var_nhan_vien` — không có thì không thể nói "của tôi" là của ai.
 */
export function useHomeTaskMetrics(): UseHomeTaskMetricsResult {
  const access = useModuleAccess('tasks');
  const nhanVienId = useAuthStore((s) => s.user?.nhan_vien_id);
  const viewerId = useMemo(() => resolveHomeViewerId(nhanVienId), [nhanVienId]);

  const enabled = access.ready && viewerId != null;

  const mineArgs = useMemo(
    () => (viewerId == null ? null : buildMyTasksKpiArgs(viewerId)),
    [viewerId],
  );
  const assignedArgs = useMemo(
    () => (viewerId == null ? null : buildMyAssignedOpenKpiArgs(viewerId)),
    [viewerId],
  );

  const mine = useQuery({
    queryKey: queryKeys.trangChu.congViecKpi(mineArgs),
    queryFn: () => getTaskReportKpi(mineArgs!),
    enabled: enabled && mineArgs != null,
    ...listQueryOptions,
  });

  const assigned = useQuery({
    queryKey: queryKeys.trangChu.congViecKpi(assignedArgs),
    queryFn: () => getTaskReportKpi(assignedArgs!),
    enabled: enabled && assignedArgs != null,
    ...listQueryOptions,
  });

  const data =
    mine.data && assigned.data
      ? {
          quaHan: mine.data.qua_han,
          sapHetHan: mine.data.sap_het_han,
          toiGiaoChuaXong: assigned.data.total,
        }
      : null;

  return {
    data,
    visible: access.waiting || (access.canView && viewerId != null),
    isLoading: access.waiting || (enabled && (mine.isPending || assigned.isPending)),
    isError: mine.isError || assigned.isError,
    refetch: () => {
      void mine.refetch();
      void assigned.refetch();
    },
  };
}
