import React, { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { MttqUyVienUyBan, MttqUyVienUyBanListRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import { useMttqUyVienUyBanListForNhiemKy } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import {
  canViewUyVienUyBanRow,
  useMttqUyVienUyBanViewer,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import { donViDisplayLabel } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/utils/column-search';
import {
  formatUyVienListDate,
  formatUyVienMaUvDisplay,
  getUyVienTrangThamGiaBadgeConfig,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/utils/display-format';
import EnumBadge from '@/components/ui/EnumBadge';
import { MttqUyVienUyBanTableRowActions } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/components/mttq-uy-vien-uy-ban-table-row-actions';

interface Props {
  nhiemKyId: string;
  onViewRow: (row: MttqUyVienUyBan) => void;
  onEditRow: (row: MttqUyVienUyBan) => void;
  onDeleteRow: (id: string) => void;
  onAdd: () => void;
}

const MttqNhiemKyDetailUyVienTab: React.FC<Props> = ({ nhiemKyId, onViewRow, onEditRow, onDeleteRow, onAdd }) => {
  const canView = useCan('view', 'matTranCommitteeMembers');
  const { canCreate } = useResourcePermissions('matTranCommitteeMembers');
  const tinhCap = txt('matTranUyVienUyBan.tinhCap');
  const { data: rows = [], isLoading } = useMttqUyVienUyBanListForNhiemKy(nhiemKyId, { enabled: canView });
  const viewer = useMttqUyVienUyBanViewer();
  const viewableRows = useMemo(
    () => rows.filter((r) => canViewUyVienUyBanRow(viewer, r)),
    [rows, viewer],
  );
  const [childMenuOpenId, setChildMenuOpenId] = useState<string | null>(null);

  const labelColumn = useMemo(
    () => ({
      header: txt('matTranUyVienUyBan.store.hoVaTenCol'),
      minWidthClass: 'min-w-[160px]',
      renderCell: (r: MttqUyVienUyBanListRow) => {
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

  const countLabel = isLoading ? '…' : String(viewableRows.length);
  const showAdd = canCreate;

  return (
    <DetailSection
      title={txt('matTranNhiemKy.detail.tabUyVien')}
      icon={<Users size={14} />}
      variant="primary"
      headerRight={
        <>
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {countLabel} {txt('matTranNhiemKy.detail.uyVienChildRecordsSuffix')}
          </span>
          {showAdd ? (
            <Button
              type="button"
              size="sm"
              onClick={onAdd}
              className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90"
            >
              <Plus size={14} className="mr-1.5" />
              {txt('matTranNhiemKy.detail.addUyVien')}
            </Button>
          ) : null}
        </>
      }
    >
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
      ) : viewableRows.length === 0 ? (
        <EmptyState
          title={txt('matTranNhiemKy.detail.uyVienEmpty')}
          icon={<Users className="h-10 w-10 text-muted-foreground" />}
          action={
            showAdd ? (
              <Button type="button" size="sm" onClick={onAdd} className="bg-primary text-white hover:bg-primary/90">
                <Plus size={14} className="mr-2" />
                {txt('matTranNhiemKy.detail.addUyVien')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmbeddedChildDataGrid<MttqUyVienUyBanListRow>
          rows={viewableRows}
          getRowKey={(r) => r.id}
          onRowClick={onViewRow}
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
            header: txt('common.actions'),
            widthClass: 'w-[92px] min-w-[92px]',
            renderCell: (r) => (
              <MttqUyVienUyBanTableRowActions
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

export default MttqNhiemKyDetailUyVienTab;
