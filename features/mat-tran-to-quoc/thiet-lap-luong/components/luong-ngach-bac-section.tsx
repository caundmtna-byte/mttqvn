import React, { useMemo, useState } from 'react';
import { Gauge, Hash, ListOrdered, Plus } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import EmptyState from '@/components/shared/EmptyState';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { formatCurrency } from '@/lib/utils';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { LuongThietLapBacRow, LuongThietLapNgachListRow } from '../core/types';
import type { LuongThietLapBacMaCode } from '../core/schema';
import { LuongBacTableRowActions } from './luong-bac-table-row-actions';

interface Props {
  ngach: LuongThietLapNgachListRow;
  bacRows: LuongThietLapBacRow[];
  bacLoading?: boolean;
  mucLuongCoSo: number;
  missingCodesForCreate: LuongThietLapBacMaCode[];
  onAddBac: (ngach: LuongThietLapNgachListRow) => void;
  onEditBac: (row: LuongThietLapBacRow) => void;
  onDeleteBac: (row: LuongThietLapBacRow) => void;
  onViewBac?: (row: LuongThietLapBacRow) => void;
}

function previewLuong(heSo: string | number, mlcs: number): number {
  const base = Number.isFinite(mlcs) && mlcs > 0 ? mlcs : 0;
  const he = Number(heSo);
  if (base <= 0 || !Number.isFinite(he) || he <= 0) return 0;
  return Math.round(base * he);
}

const LuongNgachBacSection: React.FC<Props> = ({
  ngach,
  bacRows,
  bacLoading = false,
  mucLuongCoSo,
  missingCodesForCreate,
  onAddBac,
  onEditBac,
  onDeleteBac,
  onViewBac,
}) => {
  const { canCreate } = useResourcePermissions('matTranSalarySetup');
  const [childMenuOpenId, setChildMenuOpenId] = useState<string | null>(null);

  const sortedRows = useMemo(
    () => [...bacRows].sort((a, b) => a.thu_tu - b.thu_tu || a.ma_bac.localeCompare(b.ma_bac, 'vi')),
    [bacRows],
  );

  const canAddMore = missingCodesForCreate.length > 0;
  const countLabel = bacLoading ? '…' : String(sortedRows.length);

  return (
    <DetailSection
      title={txt('matTranThietLapLuong.detail.sectionBac')}
      icon={<Hash size={14} />}
      variant="primary"
      headerRight={
        canCreate ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
              {countLabel} {txt('matTranThietLapLuong.detail.bacChildRecordsSuffix')}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => onAddBac(ngach)}
              disabled={!canAddMore}
              className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Plus size={14} className="mr-1.5" />
              {txt('common.create')}
            </Button>
          </div>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {countLabel} {txt('matTranThietLapLuong.detail.bacChildRecordsSuffix')}
          </span>
        )
      }
    >
      {bacLoading ? (
        <div className="flex justify-center py-8 text-sm text-muted-foreground">{txt('common.loadingData')}</div>
      ) : sortedRows.length === 0 ? (
        <EmptyState
          title={txt('matTranThietLapLuong.detail.noBac')}
          description={txt('matTranThietLapLuong.detail.noBacHint')}
          icon={<Hash className="h-10 w-10 text-muted-foreground" />}
          action={
            canCreate && canAddMore ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onAddBac(ngach)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                <Plus size={14} className="mr-2" />
                {txt('common.create')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmbeddedChildDataGrid<LuongThietLapBacRow>
          containerClassName="border-0 shadow-none"
          rows={sortedRows}
          getRowKey={(row) => row.id}
          onRowClick={onViewBac}
          maxVisibleBodyRows={7}
          labelColumn={{
            header: txt('matTranThietLapLuong.bac.colBac'),
            minWidthClass: 'min-w-[72px]',
            renderCell: (row) => (
              <span className="font-semibold tabular-nums text-foreground text-sm whitespace-nowrap">{row.ma_bac}</span>
            ),
          }}
          columns={[
            {
              id: 'thu_tu',
              header: txt('matTranThietLapLuong.store.thuTuCol'),
              renderCell: (row) => (
                <span className="text-xs tabular-nums text-muted-foreground flex items-center gap-1">
                  <ListOrdered size={12} aria-hidden />
                  {row.thu_tu}
                </span>
              ),
            },
            {
              id: 'he_so',
              header: txt('matTranThietLapLuong.bac.colHeSo'),
              renderCell: (row) => (
                <span className="text-xs tabular-nums text-foreground flex items-center gap-1">
                  <Gauge size={12} className="text-muted-foreground shrink-0" aria-hidden />
                  {String(row.he_so)}
                </span>
              ),
            },
            {
              id: 'luong',
              header: txt('matTranThietLapLuong.bac.colLuong'),
              headerClassName: 'text-right',
              cellClassName: 'text-right',
              renderCell: (row) => (
                <span className="text-xs tabular-nums font-medium text-foreground">
                  {formatCurrency(previewLuong(row.he_so, mucLuongCoSo))}
                </span>
              ),
            },
          ]}
          actionsColumn={{
            header: txt('common.actions'),
            widthClass: 'w-[92px] min-w-[92px]',
            renderCell: (row) => (
              <LuongBacTableRowActions
                compact
                item={row}
                menuOpenId={childMenuOpenId}
                onMenuOpenChange={setChildMenuOpenId}
                onEdit={onEditBac}
                onDelete={onDeleteBac}
              />
            ),
          }}
        />
      )}
    </DetailSection>
  );
};

export default LuongNgachBacSection;
