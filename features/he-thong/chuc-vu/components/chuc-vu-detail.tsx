import React, { useMemo } from 'react';
import { txt } from '../../../../lib/text';
import { Edit, Trash2, Briefcase, Power, Building2, Layers, Calendar, Clock, FileText, ArrowUpFromLine, MapPinned } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import EnumBadge from '../../../../components/ui/EnumBadge';
import type { BadgeConfig } from '../../../../components/ui/EnumBadge';
import { Position } from '../core/types';
import { formatDate, formatDateTimeShort } from '../../../../lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '../../../../components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '../../../../components/shared/DetailSummaryCard';
import DetailSection from '../../../../components/shared/DetailSection';
import DetailField from '../../../../components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '../../../../components/shared/DetailFieldGrid';
import DetailToolbar, { DetailToolbarAction } from '../../../../components/shared/DetailToolbar';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '../../../../lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { capQuanLyBadgeConfig } from '../utils/cap-quan-ly';

interface Props {
  data: Position;
  onClose: () => void;
  onEdit: (item: Position) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: Position) => void;
}

const PositionDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete, onStatusChange }) => {
  const { canEdit, canDelete } = useResourcePermissions('positions');
  const isActive = data.trang_thai === 'Đang hoạt động';

  const trangThaiBadgeConfig = useMemo((): BadgeConfig<string> => ({
    'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
    'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
  }), []);

  const capQuanLyBadge = useMemo(
    () => capQuanLyBadgeConfig(txt('position.capQuanLyTinh'), txt('position.capQuanLyXaPhuong')),
    []
  );

  const toolbarActions: DetailToolbarAction[] = [
    ...(onStatusChange && canEdit
      ? [
          {
            label: isActive ? txt('position.detail.deactivate') : txt('position.detail.activate'),
            icon: <Power size={16} />,
            onClick: () => onStatusChange(data),
            variant: 'info' as const,
          },
        ]
      : []),
  ];

  const renderFooter = (
    <div className="flex items-center justify-between w-full gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
      >
        {BTN_CLOSE()}
      </Button>
      {(canEdit || canDelete) ? (
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
      title={txt('position.detail.title')}
      subtitle={`${txt('position.detail.subtitle')} · #${data.id}`}
      icon={<Briefcase size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Briefcase size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_chuc_vu}
          badge={<EnumBadge value={data.trang_thai} config={trangThaiBadgeConfig} />}
          subtitle={
            data.ten_phong_ban || data.cap_quan_ly ? (
              <div className="flex min-w-0 flex-col gap-1.5">
                {data.ten_phong_ban ? <p className="m-0 truncate text-muted-foreground">{data.ten_phong_ban}</p> : null}
                {data.cap_quan_ly ? (
                  <EnumBadge value={data.cap_quan_ly} config={capQuanLyBadge} shape="rounded" />
                ) : null}
              </div>
            ) : undefined
          }
        />

        {toolbarActions.length > 0 && (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        )}

        <DetailSection title={txt('position.detail.basicInfo')} icon={<Briefcase size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('position.form.name')} value={data.ten_chuc_vu} icon={<Briefcase size={12} />} />
            <DetailField
              label={txt('position.detail.level')}
              value={
                data.cap_bac != null && String(data.cap_bac).trim() !== '' ? (
                  <span className="font-semibold tabular-nums text-foreground">{String(data.cap_bac).trim()}</span>
                ) : undefined
              }
              icon={<Layers size={12} />}
              emptyText="—"
            />
            <DetailField
              label={txt('position.detail.managementLevel')}
              value={
                data.cap_quan_ly ? <EnumBadge value={data.cap_quan_ly} config={capQuanLyBadge} shape="rounded" /> : undefined
              }
              icon={<MapPinned size={12} />}
              emptyText="—"
            />
            <DetailField label={txt('position.detail.department')} value={data.ten_phong_ban ?? '—'} icon={<Building2 size={12} />} emptyText="—" />
            <DetailField label={txt('position.detail.order')} value={String(data.thu_tu ?? 0)} icon={<ArrowUpFromLine size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('position.detail.description')}
              value={data.mo_ta ?? ''}
              icon={<FileText size={12} />}
              emptyText="—"
            />
            <DetailField label={txt('common.status')} value={isActive ? txt('position.active') : txt('position.inactive')} icon={<Power size={12} />} />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('position.detail.systemInfo')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('position.detail.createdAt')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField label={txt('position.detail.updated')} value={formatDate(data.tg_cap_nhat)} icon={<Calendar size={12} />} />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default PositionDetail;
