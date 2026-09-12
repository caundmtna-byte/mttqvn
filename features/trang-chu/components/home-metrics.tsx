import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, CalendarDays, ClockAlert, Send, Wallet } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDateShort } from '@/lib/utils';
import ErrorState from '@/components/shared/ErrorState';
import HomeMetricCard from './home-metric-card';
import { useHomeTaskMetrics } from '../hooks/use-home-task-metrics';
import { useHomeKyHopMetric } from '../hooks/use-home-ky-hop-metric';
import { useHomeTangLuongMetric } from '../hooks/use-home-tang-luong-metric';
import type { HomeMetricCardItem } from '../core/types';

const CONG_VIEC_PATH = '/quan-ly-giao-viec/cong-viec';
const KY_HOP_PATH = '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop';
const TANG_LUONG_PATH = '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong';

const MetricSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <div
    role="status"
    aria-busy="true"
    aria-label={txt('common.loadingData')}
    className="grid grid-cols-2 gap-3 lg:grid-cols-4"
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-[104px] rounded-xl border border-border/50 bg-card p-4">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-6 w-14 animate-pulse rounded bg-muted/70" />
      </div>
    ))}
  </div>
);

/**
 * Dải thẻ chỉ số ở Trang chủ.
 *
 * Ba nguyên tắc không được phá:
 * 1. **Không có quyền thì không render thẻ** — không hiện số 0 để người dùng đoán.
 * 2. **Chờ ma trận quyền xong mới quyết định** — trong lúc chờ hiện khung chờ, tuyệt đối
 *    không hiện thẻ rồi giấu đi (đây là hồi quy đã từng xảy ra ở Trang chủ).
 * 3. **Mọi con số đã khoá phạm vi ở nguồn** (tham số RPC / bộ lọc PostgREST), không lọc sau.
 */
const HomeMetrics: React.FC = () => {
  const navigate = useNavigate();
  const tasks = useHomeTaskMetrics();
  const kyHop = useHomeKyHopMetric();
  const tangLuong = useHomeTangLuongMetric();

  /**
   * Mở danh sách Công việc đúng tab người dùng cần: thẻ "của tôi" → tab *Tôi làm*,
   * thẻ "tôi giao" → tab *Tôi giao*. Tab nằm trên URL (`?tab=`) nên điều hướng từ đây
   * là bền — không phụ thuộc vào state trong bộ nhớ của module Công việc.
   *
   * Ghi chú: bộ lọc trạng thái và thứ tự "gần hạn trước" của trang Công việc hiện chỉ
   * sống trong Zustand và bị `resetState()` xoá lúc trang mount, nên KHÔNG thể đặt sẵn
   * từ Trang chủ. Muốn thẻ mở ra danh sách đã lọc đúng "quá hạn / sắp đến hạn" thì trang
   * Công việc phải đọc thêm bộ lọc từ URL — việc đó nằm ngoài phạm vi thay đổi ở đây.
   */
  const openCongViec = useCallback(
    (tab: 'mine_do' | 'mine_assign') => {
      navigate(`${CONG_VIEC_PATH}?tab=${tab}`);
    },
    [navigate],
  );

  const openKyHop = useCallback(() => {
    navigate(KY_HOP_PATH);
  }, [navigate]);

  // Tab "Kế hoạch" của module Tăng lương là nơi liệt kê kỳ đến hạn sắp tới;
  // tab nằm trên URL nên điều hướng từ đây là bền.
  const openTangLuong = useCallback(() => {
    navigate(`${TANG_LUONG_PATH}?tab=ke_hoach`);
  }, [navigate]);

  const taskCards = useMemo<HomeMetricCardItem[]>(() => {
    if (!tasks.data) return [];
    return [
      {
        id: 'qua-han',
        label: txt('page.home.metrics.quaHanLabel'),
        value: tasks.data.quaHan,
        hint: txt('page.home.metrics.quaHanHint'),
        icon: ClockAlert,
        tone: 'danger',
        onOpen: () => openCongViec('mine_do'),
      },
      {
        id: 'sap-het-han',
        label: txt('page.home.metrics.sapHetHanLabel'),
        value: tasks.data.sapHetHan,
        hint: txt('page.home.metrics.sapHetHanHint'),
        icon: AlarmClock,
        tone: 'warning',
        onOpen: () => openCongViec('mine_do'),
      },
      {
        id: 'toi-giao',
        label: txt('page.home.metrics.toiGiaoLabel'),
        value: tasks.data.toiGiaoChuaXong,
        hint: txt('page.home.metrics.toiGiaoHint'),
        icon: Send,
        tone: 'info',
        onOpen: () => openCongViec('mine_assign'),
      },
    ];
  }, [tasks.data, openCongViec]);

  const kyHopCard = useMemo<HomeMetricCardItem | null>(() => {
    if (!kyHop.data) return null;
    const ngay = kyHop.data.ngayHopGanNhat;
    const ky = kyHop.data.kyThuGanNhat;
    const hint = !ngay
      ? txt('page.home.metrics.kyHopHint')
      : ky
        ? txt('page.home.metrics.kyHopNextWithKy', { ky, ngay: formatDateShort(ngay) })
        : txt('page.home.metrics.kyHopNext', { ngay: formatDateShort(ngay) });
    return {
      id: 'ky-hop',
      label: txt('page.home.metrics.kyHopLabel'),
      value: kyHop.data.total,
      hint,
      icon: CalendarDays,
      tone: 'info',
      onOpen: openKyHop,
    };
  }, [kyHop.data, openKyHop]);

  const tangLuongCard = useMemo<HomeMetricCardItem | null>(() => {
    if (!tangLuong.data) return null;
    const ngay = tangLuong.data.ngayGanNhat;
    return {
      id: 'tang-luong',
      label: txt('page.home.metrics.tangLuongLabel'),
      value: tangLuong.data.total,
      hint: ngay
        ? txt('page.home.metrics.tangLuongNext', { ngay: formatDateShort(ngay) })
        : txt('page.home.metrics.tangLuongHint'),
      icon: Wallet,
      tone: 'warning',
      onOpen: openTangLuong,
    };
  }, [tangLuong.data, openTangLuong]);

  const anyVisible = tasks.visible || kyHop.visible || tangLuong.visible;
  if (!anyVisible) return null;

  const loading = tasks.isLoading || kyHop.isLoading || tangLuong.isLoading;
  const failed =
    (tasks.visible && tasks.isError) ||
    (kyHop.visible && kyHop.isError) ||
    (tangLuong.visible && tangLuong.isError);
  const skeletonCount =
    (tasks.visible ? 3 : 0) + (kyHop.visible ? 1 : 0) + (tangLuong.visible ? 1 : 0);

  const cards = [
    ...(tasks.visible ? taskCards : []),
    ...(kyHop.visible && kyHopCard ? [kyHopCard] : []),
    ...(tangLuong.visible && tangLuongCard ? [tangLuongCard] : []),
  ];
  const allZero = cards.length > 0 && cards.every((c) => c.value === 0);

  return (
    <section aria-label={txt('page.home.metrics.sectionTitle')} className="mb-6">
      <div className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {txt('page.home.metrics.sectionTitle')}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {txt('page.home.metrics.sectionHint')}
        </p>
      </div>

      {loading ? (
        <MetricSkeleton count={Math.max(skeletonCount, 1)} />
      ) : failed ? (
        <ErrorState
          title={txt('page.home.metrics.errorTitle')}
          message={txt('page.home.metrics.errorMessage')}
          primaryButtons
          onRetry={() => {
            if (tasks.isError) tasks.refetch();
            if (kyHop.isError) kyHop.refetch();
            if (tangLuong.isError) tangLuong.refetch();
          }}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((item) => (
              <HomeMetricCard
                key={item.id}
                item={item}
                unit={
                  item.id === 'ky-hop'
                    ? txt('page.home.metrics.unitKyHop')
                    : item.id === 'tang-luong'
                      ? txt('page.home.metrics.unitCanBo')
                      : txt('page.home.metrics.unitViec')
                }
              />
            ))}
          </div>
          {allZero && (
            <p className="mt-2.5 text-xs text-muted-foreground">
              {txt('page.home.metrics.allClear')}
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default HomeMetrics;
