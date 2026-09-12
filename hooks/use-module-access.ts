import { useMemo } from 'react';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import type { AppResource } from '@/lib/permissions';

export interface ModuleAccess {
  /** Được phép mở module. Chỉ đáng tin khi `waiting === false`. */
  canView: boolean;
  /**
   * Ma trận quyền chưa tải xong. Trong lúc này **không được** chuyển hướng người
   * dùng đi và **không được** gọi query dữ liệu — hãy hiện trạng thái tải.
   */
  waiting: boolean;
  /** Đủ điều kiện để bắt đầu tải dữ liệu của module: có quyền và đã hết chờ. */
  ready: boolean;
}

/**
 * Cổng vào một module: gộp "có quyền xem không" với "đã biết chưa".
 *
 * Vì sao cần: `usePermissionGrantStore` không persist, nên sau mỗi lần tải lại trang
 * `matrixActive` là `false` cho tới khi truy vấn `permission-grants` trả về. Nếu chỉ
 * hỏi `useCan()` thì trong khoảng đó mọi module đều trả về "không có quyền" và trang
 * sẽ đá người dùng ra ngoài kèm toast lỗi. Trước đây khoảng trống này được lấp bằng
 * cách cho xem tất cả — đó chính là lỗ hổng đã vá.
 *
 * Dùng thay cho cặp `useCan('view', …)` + biến `waitingMatrixHydrate` viết tay ở
 * từng module (trước đây chỉ 20/41 module có, 21 module còn lại không chờ gì cả).
 */
export function useModuleAccess(resource: AppResource): ModuleAccess {
  const user = useAuthStore((s) => s.user);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const canView = useCan('view', resource);

  return useMemo(() => {
    // Mock admin không đi qua ma trận quyền → không bao giờ phải chờ.
    const needsMatrix = user != null && user.role !== 'admin';
    const waiting = needsMatrix && matrixLoading;
    return { canView, waiting, ready: canView && !waiting };
  }, [user, matrixLoading, canView]);
}
