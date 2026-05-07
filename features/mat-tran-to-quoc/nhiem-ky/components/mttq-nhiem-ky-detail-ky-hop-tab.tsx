import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { useCan } from '@/hooks/use-can';
import type { MttqKyHop } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import { useMttqKyHopListForNhiemKy } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop';
import { donViDisplayLabel } from '@/features/mat-tran-to-quoc/ky-hop/utils/column-search';

const KY_HOP_LIST_PATH = '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop';

interface Props {
  nhiemKyId: string;
}

const MttqNhiemKyDetailKyHopTab: React.FC<Props> = ({ nhiemKyId }) => {
  const navigate = useNavigate();
  const canView = useCan('view', 'matTranSession');
  const tinhCap = txt('matTranKyHop.tinhCap');
  const { data: rows = [], isLoading } = useMttqKyHopListForNhiemKy(nhiemKyId, { enabled: canView });

  const openModule = useCallback(() => {
    navigate(KY_HOP_LIST_PATH);
  }, [navigate]);

  const openRow = useCallback(
    (_row: MttqKyHop) => {
      navigate(KY_HOP_LIST_PATH);
    },
    [navigate],
  );

  const labelColumn = useMemo(
    () => ({
      header: txt('matTranKyHop.store.kyThuCol'),
      minWidthClass: 'min-w-[140px]',
      renderCell: (r: MttqKyHop) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">{r.ky_thu}</p>
          <p className="truncate text-xs text-muted-foreground tabular-nums">{r.ngay_hop ?? '—'}</p>
        </div>
      ),
    }),
    [],
  );

  if (!canView) {
    return (
      <DetailSection title={txt('matTranNhiemKy.detail.tabKyHop')}>
        <p className="text-xs text-muted-foreground">{txt('matTranKyHop.noViewPermission')}</p>
      </DetailSection>
    );
  }

  return (
    <DetailSection title={txt('matTranNhiemKy.detail.tabKyHop')}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{txt('matTranNhiemKy.detail.kyHopHint')}</p>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={openModule}>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {txt('matTranNhiemKy.detail.openKyHopModule')}
          </Button>
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">{txt('matTranNhiemKy.detail.kyHopEmpty')}</p>
        ) : (
          <EmbeddedChildDataGrid<MttqKyHop>
            rows={rows}
            getRowKey={(r) => r.id}
            onRowClick={openRow}
            maxVisibleBodyRows={8}
            labelColumn={labelColumn}
            columns={[
              {
                id: 'dv',
                header: txt('matTranKyHop.store.donViCol'),
                renderCell: (r) => (
                  <span className="truncate text-xs text-muted-foreground">{donViDisplayLabel(r, tinhCap)}</span>
                ),
              },
              {
                id: 'nd',
                header: txt('matTranKyHop.store.noiDungCol'),
                renderCell: (r) => (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{r.noi_dung_ky_hop ?? '—'}</span>
                ),
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
                  {txt('matTranNhiemKy.detail.openKyHopRow')}
                </Button>
              ),
            }}
          />
        )}
      </div>
    </DetailSection>
  );
};

export default MttqNhiemKyDetailKyHopTab;
