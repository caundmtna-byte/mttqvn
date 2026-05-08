import React, { useCallback, useMemo, useState } from 'react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { MttqDiemDanhTrangThai } from '../core/types';
import { useMttqUyVienUyBanListForNhiemKy } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import {
  canViewUyVienUyBanRow,
  useMttqUyVienUyBanViewer,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import type { MttqUyVienUyBan } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import { useDiemDanhForKyHop, useUpsertDiemDanh } from '../hooks/use-mttq-diem-danh';

interface Props {
  kyHopId: string;
  nhiemKyId: string;
}

const MttqKyHopDetailDiemDanhTab: React.FC<Props> = ({ kyHopId, nhiemKyId }) => {
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const canViewSession = useCan('view', 'matTranSession');
  const canViewUyVien = useCan('view', 'matTranCommitteeMembers');
  const { canEdit } = useResourcePermissions('matTranSession');

  const { data: uyVienRows = [], isLoading: loadingUyVien } = useMttqUyVienUyBanListForNhiemKy(nhiemKyId, {
    enabled: canViewUyVien && Boolean(nhiemKyId.trim()),
  });
  const uyVienViewer = useMttqUyVienUyBanViewer();
  const visibleUyVienRows = useMemo(
    () => uyVienRows.filter((r) => canViewUyVienUyBanRow(uyVienViewer, r)),
    [uyVienRows, uyVienViewer],
  );
  const { data: diemDanhRows = [], isLoading: loadingDiemDanh } = useDiemDanhForKyHop(kyHopId, {
    enabled: canViewSession && Boolean(kyHopId.trim()),
  });
  const upsertMutation = useUpsertDiemDanh();
  const [pendingUyVienId, setPendingUyVienId] = useState<string | null>(null);

  const trangThaiByUyVienId = useMemo(() => {
    const m = new Map<string, MttqDiemDanhTrangThai>();
    for (const r of diemDanhRows) {
      m.set(r.uy_vien_id, r.trang_thai);
    }
    return m;
  }, [diemDanhRows]);

  const handleSetTrangThai = useCallback(
    async (uyVienId: string, trangThai: MttqDiemDanhTrangThai) => {
      if (!idNguoiTao) return;
      setPendingUyVienId(uyVienId);
      try {
        await upsertMutation.mutateAsync({
          kyHopId,
          uyVienId,
          trangThai,
          idNguoiTao,
          nhiemKyId,
        });
      } finally {
        setPendingUyVienId(null);
      }
    },
    [idNguoiTao, kyHopId, upsertMutation],
  );

  if (!canViewSession) {
    return (
      <DetailSection title={txt('matTranKyHop.diemDanh.sectionTitle')}>
        <p className="text-xs text-muted-foreground">{txt('matTranKyHop.diemDanh.noViewPermission')}</p>
      </DetailSection>
    );
  }

  if (!canViewUyVien) {
    return (
      <DetailSection title={txt('matTranKyHop.diemDanh.sectionTitle')}>
        <p className="text-xs text-muted-foreground">{txt('matTranUyVienUyBan.noViewPermission')}</p>
      </DetailSection>
    );
  }

  const canMutate = canEdit && Boolean(idNguoiTao);
  const loading = loadingUyVien || loadingDiemDanh;

  return (
    <DetailSection title={txt('matTranKyHop.diemDanh.sectionTitle')}>
      <div className="flex flex-col gap-3">
        {!idNguoiTao && canEdit ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">{txt('matTranKyHop.noEmployeeBanner')}</p>
        ) : null}
        {!canEdit ? <p className="text-xs text-muted-foreground">{txt('matTranKyHop.diemDanh.readOnlyHint')}</p> : null}

        {loading ? (
          <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
        ) : visibleUyVienRows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{txt('matTranKyHop.diemDanh.emptyUyVien')}</p>
        ) : (
          <ul className="rounded-lg border border-border/60 divide-y divide-border/60 overflow-hidden bg-card">
            {visibleUyVienRows.map((uv: MttqUyVienUyBan) => {
              const current = trangThaiByUyVienId.get(uv.id) ?? null;
              const rowPending = pendingUyVienId === uv.id;
              return (
                <li key={uv.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{uv.ho_va_ten}</p>
                    {uv.chuc_vu_don_vi?.trim() ? (
                      <p className="text-xs text-muted-foreground truncate">{uv.chuc_vu_don_vi}</p>
                    ) : null}
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
                      onClick={() => void handleSetTrangThai(uv.id, 'Có mặt')}
                    >
                      {txt('matTranKyHop.diemDanh.coMat')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={current === 'Vắng mặt' ? 'default' : 'outline'}
                      className="h-8 px-3 text-xs"
                      disabled={!canMutate || rowPending}
                      onClick={() => void handleSetTrangThai(uv.id, 'Vắng mặt')}
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

export default MttqKyHopDetailDiemDanhTab;
