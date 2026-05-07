import React, { useMemo, useState } from 'react';
import { MapPin, Calendar, Clock, Plus, Folder, Edit, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDate, formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid from '@/components/shared/DetailFieldGrid';
import EmptyState from '@/components/shared/EmptyState';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import Button from '@/components/ui/Button';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { TinhThanh } from '../core/types';
import type { XaPhuong } from '../core/types';
import { useXaPhuongByTinhThanh } from '../hooks/use-dia-ban';
import { XaPhuongRowActions } from './xa-phuong-row-actions';

interface Props {
  data: TinhThanh;
  onClose: () => void;
  onEdit: (item: TinhThanh) => void;
  onDelete: (id: string) => void;
  onAddXa: () => void;
  onEditXa: (item: XaPhuong) => void;
  onDeleteXa: (id: string) => void;
  onViewXa?: (item: XaPhuong) => void;
}

const TinhThanhDetail: React.FC<Props> = ({
  data,
  onClose,
  onEdit,
  onDelete,
  onAddXa,
  onEditXa,
  onDeleteXa,
  onViewXa,
}) => {
  const { canEdit, canDelete, canCreate } = useResourcePermissions('provinces');
  const [childMenuOpenId, setChildMenuOpenId] = useState<string | null>(null);
  const { data: xaRows = [], isLoading: loadingXa } = useXaPhuongByTinhThanh(data.id);

  const sortedXa = useMemo(
    () => [...xaRows].sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten)),
    [xaRows],
  );

  const renderFooter = (
    <div className="flex w-full items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
      >
        {BTN_CLOSE()}
      </Button>
      {canEdit || canDelete ? (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              size="sm"
              onClick={() => {
                onEdit(data);
                onClose();
              }}
              className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_EDIT()}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onDelete(data.id);
                onClose();
              }}
              className="h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200 hover:border-rose-300 dark:border-rose-800 dark:hover:border-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_DELETE()}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <GenericDrawer
      title={txt('diaBan.detail.tinhTitle')}
      subtitle={`${txt('diaBan.detail.tinhSubtitle')} · #${data.id}`}
      icon={<MapPin size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0">
            <MapPin size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <h2 className="text-base font-bold text-foreground leading-tight truncate">{data.ten}</h2>
            <p className="text-body-sm text-muted-foreground tabular-nums">
              {txt('diaBan.colThuTu')}: {data.thu_tu}
            </p>
          </div>
        </div>

        <DetailSection title={txt('diaBan.detail.basicInfo')} icon={<MapPin size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('diaBan.colTen')} value={data.ten} icon={<MapPin size={12} />} />
            <DetailField
              label={txt('diaBan.colThuTu')}
              value={String(data.thu_tu ?? 0)}
              icon={<MapPin size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('diaBan.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('diaBan.detail.createdAt')}
              value={formatDateTimeShort(data.tg_tao)}
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('diaBan.detail.updated')}
              value={formatDate(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('diaBan.detail.wardsSection')}
          icon={<MapPin size={14} />}
          variant="primary"
          headerRight={
            <>
              <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
                {sortedXa.length}
              </span>
              {canCreate ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={onAddXa}
                  className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90"
                >
                  <Plus size={14} className="mr-1.5" />
                  {txt('diaBan.detail.addWard')}
                </Button>
              ) : null}
            </>
          }
        >
          {loadingXa ? (
            <p className="text-sm text-muted-foreground py-4">{txt('diaBan.loading')}</p>
          ) : sortedXa.length === 0 ? (
            <EmptyState
              title={txt('diaBan.detail.noWards')}
              description={txt('diaBan.detail.noWardsHint')}
              icon={<Folder className="h-10 w-10 text-muted-foreground" />}
              action={
                canCreate ? (
                  <Button type="button" size="sm" onClick={onAddXa} className="bg-primary text-white hover:bg-primary/90">
                    <Plus size={14} className="mr-2" />
                    {txt('diaBan.detail.addWard')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmbeddedChildDataGrid<XaPhuong>
              rows={sortedXa}
              getRowKey={(row) => row.id}
              labelColumn={{
                header: txt('diaBan.colTen'),
                minWidthClass: 'min-w-[160px]',
                renderCell: (row) => <span className="font-medium text-foreground">{row.ten}</span>,
              }}
              columns={[
                {
                  id: 'order',
                  header: txt('diaBan.colThuTu'),
                  renderCell: (row) => (
                    <span className="tabular-nums text-sm text-muted-foreground">{row.thu_tu}</span>
                  ),
                },
              ]}
              actionsColumn={{
                header: txt('common.actions'),
                widthClass: 'w-[92px] min-w-[92px]',
                renderCell: (row) => (
                  <XaPhuongRowActions
                    compact
                    item={row}
                    menuOpenId={childMenuOpenId}
                    onMenuOpenChange={setChildMenuOpenId}
                    onEdit={onEditXa}
                    onDelete={onDeleteXa}
                    canEdit={!!canEdit}
                    canDelete={!!canDelete}
                  />
                ),
              }}
              onRowClick={onViewXa ? (row) => onViewXa(row) : undefined}
            />
          )}
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default TinhThanhDetail;
