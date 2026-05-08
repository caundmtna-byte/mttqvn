import React, { useMemo, useState } from 'react';
import { CalendarDays, Plus } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { MttqKyHop } from '@/features/mat-tran-to-quoc/ky-hop/core/types';
import { useMttqKyHopListForNhiemKy } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop';
import { donViDisplayLabel } from '@/features/mat-tran-to-quoc/ky-hop/utils/column-search';
import { MttqKyHopTableRowActions } from '@/features/mat-tran-to-quoc/ky-hop/components/mttq-ky-hop-table-row-actions';

interface Props {
  nhiemKyId: string;
  onViewRow: (row: MttqKyHop) => void;
  onEditRow: (row: MttqKyHop) => void;
  onDeleteRow: (id: string) => void;
  onAdd: () => void;
}

const MttqNhiemKyDetailKyHopTab: React.FC<Props> = ({ nhiemKyId, onViewRow, onEditRow, onDeleteRow, onAdd }) => {
  const canView = useCan('view', 'matTranSession');
  const { canCreate } = useResourcePermissions('matTranSession');
  const tinhCap = txt('matTranKyHop.tinhCap');
  const { data: rows = [], isLoading } = useMttqKyHopListForNhiemKy(nhiemKyId, { enabled: canView });
  const [childMenuOpenId, setChildMenuOpenId] = useState<string | null>(null);

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

  const countLabel = isLoading ? '…' : String(rows.length);
  const showAdd = canCreate;

  return (
    <DetailSection
      title={txt('matTranNhiemKy.detail.tabKyHop')}
      icon={<CalendarDays size={14} />}
      variant="primary"
      headerRight={
        <>
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {countLabel} {txt('matTranNhiemKy.detail.kyHopChildRecordsSuffix')}
          </span>
          {showAdd ? (
            <Button
              type="button"
              size="sm"
              onClick={onAdd}
              className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90"
            >
              <Plus size={14} className="mr-1.5" />
              {txt('matTranNhiemKy.detail.addKyHop')}
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={txt('matTranNhiemKy.detail.kyHopEmpty')}
          icon={<CalendarDays className="h-10 w-10 text-muted-foreground" />}
          action={
            showAdd ? (
              <Button type="button" size="sm" onClick={onAdd} className="bg-primary text-white hover:bg-primary/90">
                <Plus size={14} className="mr-2" />
                {txt('matTranNhiemKy.detail.addKyHop')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmbeddedChildDataGrid<MttqKyHop>
          rows={rows}
          getRowKey={(r) => r.id}
          onRowClick={onViewRow}
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
            header: txt('common.actions'),
            widthClass: 'w-[92px] min-w-[92px]',
            renderCell: (r) => (
              <MttqKyHopTableRowActions
                compact
                item={r}
                menuOpenId={childMenuOpenId}
                onMenuOpenChange={setChildMenuOpenId}
                onEdit={onEditRow}
                onDelete={onDeleteRow}
              />
            ),
          }}
          containerClassName="border-0 shadow-none"
        />
      )}
    </DetailSection>
  );
};

export default MttqNhiemKyDetailKyHopTab;
