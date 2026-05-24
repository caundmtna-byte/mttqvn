import React, { useCallback, useMemo, useState } from 'react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { MttqDiemDanhTrangThai } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import type { MttqKyHop } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import { useMttqKyHopListForNhiemKy } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop';
import { canViewKyHopRow, useMttqKyHopViewer } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop-viewer';
import { useDiemDanhForNhiemKy, useUpsertDiemDanh } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-diem-danh';

interface Props {
  uyVienId: string;
  nhiemKyId: string;
}

const MttqUyVienUyBanDetailDiemDanhTab: React.FC<Props> = ({ uyVienId, nhiemKyId }) => {
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const canViewSession = useCan('view', 'matTranSession');
  const { canEdit } = useResourcePermissions('matTranSession');

  const { data: kyHopRows = [], isLoading: loadingKyHop } = useMttqKyHopListForNhiemKy(nhiemKyId, {
    enabled: canViewSession && Boolean(nhiemKyId.trim()),
  });
  const kyHopViewer = useMttqKyHopViewer();
  const visibleKyHopRows = useMemo(
    () => kyHopRows.filter((r) => canViewKyHopRow(kyHopViewer, r)),
    [kyHopRows, kyHopViewer],
  );
  const { data: diemDanhRows = [], isLoading: loadingDiemDanh } = useDiemDanhForNhiemKy(nhiemKyId, {
    enabled: canViewSession && Boolean(nhiemKyId.trim()),
  });
  const upsertMutation = useUpsertDiemDanh();
  const [pendingKyHopId, setPendingKyHopId] = useState<string | null>(null);

  const kyHopSorted = useMemo(() => {
    const list = [...visibleKyHopRows];
    list.sort((a, b) => {
      const da = a.ngay_hop ?? '';
      const db = b.ngay_hop ?? '';
      if (da !== db) return da.localeCompare(db);
      return a.ky_thu.localeCompare(b.ky_thu, 'vi');
    });
    return list;
  }, [visibleKyHopRows]);

  const trangThaiByKyHopId = useMemo(() => {
    const m = new Map<string, MttqDiemDanhTrangThai>();
    for (const r of diemDanhRows) {
      if (r.uy_vien_id === uyVienId) m.set(r.ky_hop_id, r.trang_thai);
    }
    return m;
  }, [diemDanhRows, uyVienId]);

  const handleSetTrangThai = useCallback(
    async (kyHopId: string, trangThai: MttqDiemDanhTrangThai) => {
      if (!idNguoiTao) return;
      setPendingKyHopId(kyHopId);
      try {
        await upsertMutation.mutateAsync({
          kyHopId,
          uyVienId,
          trangThai,
          idNguoiTao,
          nhiemKyId,
        });
      } finally {
        setPendingKyHopId(null);
      }
    },
    [idNguoiTao, uyVienId, upsertMutation, nhiemKyId],
  );

  if (!canViewSession) {
    return (
      <DetailSection title={txt('matTranUyVienUyBan.detail.diemDanhSectionTitle')}>
        <p className="text-xs text-muted-foreground">{txt('matTranKyHop.noViewPermission')}</p>
      </DetailSection>
    );
  }

  const canMutate = canEdit && Boolean(idNguoiTao);
  const loading = loadingKyHop || loadingDiemDanh;

  return (
    <DetailSection title={txt('matTranUyVienUyBan.detail.diemDanhSectionTitle')}>
      <div className="flex flex-col gap-3">
        {!idNguoiTao && canEdit ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">{txt('matTranKyHop.noEmployeeBanner')}</p>
        ) : null}
        {!canEdit ? <p className="text-xs text-muted-foreground">{txt('matTranKyHop.diemDanh.readOnlyHint')}</p> : null}

        {loading ? (
          <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
        ) : kyHopSorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{txt('matTranUyVienUyBan.detail.diemDanhEmptyKyHop')}</p>
        ) : (
          <ul className="rounded-lg border border-border/60 divide-y divide-border/60 overflow-hidden bg-card">
            {kyHopSorted.map((kh: MttqKyHop) => {
              const current = trangThaiByKyHopId.get(kh.id) ?? null;
              const rowPending = pendingKyHopId === kh.id;
              return (
                <li key={kh.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{kh.ky_thu}</p>
                    <p className="text-xs text-muted-foreground tabular-nums truncate">{kh.ngay_hop ?? '—'}</p>
                    {current == null ? (
                      <p className="text-xs text-muted-foreground mt-0.5">{txt('matTranKyHop.diemDanh.chuaDiemDanh')}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={current === 'Có mặt' ? 'default' : 'outline'}
                      className="h-8 px-3 text-xs"
                      disabled={!canMutate || rowPending}
                      onClick={() => void handleSetTrangThai(kh.id, 'Có mặt')}
                    >
                      {txt('matTranKyHop.diemDanh.coMat')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={current === 'Vắng mặt' ? 'default' : 'outline'}
                      className="h-8 px-3 text-xs"
                      disabled={!canMutate || rowPending}
                      onClick={() => void handleSetTrangThai(kh.id, 'Vắng mặt')}
                    >
                      {txt('matTranKyHop.diemDanh.vangMat')}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DetailSection>
  );
};

export default MttqUyVienUyBanDetailDiemDanhTab;
