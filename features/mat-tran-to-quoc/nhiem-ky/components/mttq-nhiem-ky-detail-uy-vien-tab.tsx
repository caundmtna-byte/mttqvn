import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { useCan } from '@/hooks/use-can';
import type { MttqUyVienUyBan } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import { useMttqUyVienUyBanListForNhiemKy } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import { donViDisplayLabel } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/utils/column-search';
import {
  formatUyVienListDate,
  formatUyVienMaUvDisplay,
  getUyVienTrangThamGiaBadgeConfig,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/utils/display-format';
import EnumBadge from '@/components/ui/EnumBadge';

const UY_VIEN_LIST_PATH = '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien';

interface Props {
  nhiemKyId: string;
}

const MttqNhiemKyDetailUyVienTab: React.FC<Props> = ({ nhiemKyId }) => {
  const navigate = useNavigate();
  const canView = useCan('view', 'matTranCommitteeMembers');
  const tinhCap = txt('matTranUyVienUyBan.tinhCap');
  const { data: rows = [], isLoading } = useMttqUyVienUyBanListForNhiemKy(nhiemKyId, { enabled: canView });

  const openModule = useCallback(() => {
    navigate(UY_VIEN_LIST_PATH);
  }, [navigate]);

  const openRow = useCallback(
    (_row: MttqUyVienUyBan) => {
      navigate(UY_VIEN_LIST_PATH);
    },
    [navigate],
  );

  const labelColumn = useMemo(
    () => ({
      header: txt('matTranUyVienUyBan.store.hoVaTenCol'),
      minWidthClass: 'min-w-[160px]',
      renderCell: (r: MttqUyVienUyBan) => {
        const ma = formatUyVienMaUvDisplay(r.ma_uv);
        const ns = formatUyVienListDate(r.ngay_sinh, '');
        const sub = [ma, ns].filter(Boolean).join(' · ') || '—';
        return (
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">{r.ho_va_ten}</p>
            <p className="truncate text-xs text-muted-foreground tabular-nums" title={sub}>
              {sub}
            </p>
          </div>
        );
      },
    }),
    [],
  );

  if (!canView) {
    return (
      <DetailSection title={txt('matTranNhiemKy.detail.tabUyVien')}>
        <p className="text-xs text-muted-foreground">{txt('matTranUyVienUyBan.noViewPermission')}</p>
      </DetailSection>
    );
  }

  return (
    <DetailSection title={txt('matTranNhiemKy.detail.tabUyVien')}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{txt('matTranNhiemKy.detail.uyVienHint')}</p>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={openModule}>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {txt('matTranNhiemKy.detail.openUyVienModule')}
          </Button>
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{txt('matTranNhiemKy.detail.uyVienEmpty')}</p>
        ) : (
          <EmbeddedChildDataGrid<MttqUyVienUyBan>
            rows={rows}
            getRowKey={(r) => r.id}
            onRowClick={openRow}
            maxVisibleBodyRows={8}
            labelColumn={labelColumn}
            columns={[
              {
                id: 'dv',
                header: txt('matTranUyVienUyBan.store.donViCol'),
                renderCell: (r) => (
                  <span className="truncate text-xs text-muted-foreground">{donViDisplayLabel(r, tinhCap)}</span>
                ),
              },
              {
                id: 'cv',
                header: txt('matTranUyVienUyBan.store.chucVuDonViCol'),
                renderCell: (r) => (
                  <span className="truncate text-xs text-muted-foreground">{r.chuc_vu_don_vi ?? '—'}</span>
                ),
              },
              {
                id: 'tt',
                header: txt('matTranUyVienUyBan.store.trangThamGiaCol'),
                renderCell: (r) => {
                  const raw = r.trang_thai_tham_gia?.trim();
                  if (!raw) return <span className="truncate text-xs text-muted-foreground">—</span>;
                  return (
                    <EnumBadge
                      value={raw}
                      config={getUyVienTrangThamGiaBadgeConfig()}
                      fallbackLabel={raw}
                      truncate
                      className="max-w-full"
                    />
                  );
                },
              },
            ]}
            actionsColumn={{
              header: txt('matTranNhiemKy.detail.actionsCol'),
              widthClass: 'w-[5rem] min-w-[5rem]',
              renderCell: (r) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openRow(r);
                  }}
                >
                  {txt('matTranNhiemKy.detail.openUyVienRow')}
                </Button>
              ),
            }}
          />
        )}
      </div>
    </DetailSection>
  );
};

export default MttqNhiemKyDetailUyVienTab;
