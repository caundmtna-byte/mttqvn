import React, { useMemo } from 'react';
import { Map, MapPin, Calendar, Clock, Edit, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDate, formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import Button from '@/components/ui/Button';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { XaPhuong } from '../core/types';
import type { TinhThanh } from '../core/types';

interface Props {
  data: XaPhuong;
  tinhList: TinhThanh[];
  onClose: () => void;
  onEdit: (item: XaPhuong) => void;
  onDelete: (id: string) => void;
  /** Drawer chồng trên chi tiết tỉnh (giống phòng ban / nhân viên) */
  stackLevel?: number;
  maxWidthClass?: string;
}

const XaPhuongDetail: React.FC<Props> = ({
  data,
  tinhList,
  onClose,
  onEdit,
  onDelete,
  stackLevel = 0,
  maxWidthClass = DRAWER_WIDTH_DETAIL,
}) => {
  const { canEdit, canDelete } = useResourcePermissions('provinces');
  const tenTinh = useMemo(
    () => tinhList.find((t) => t.id === data.id_tinh_thanh)?.ten ?? data.id_tinh_thanh,
    [tinhList, data.id_tinh_thanh],
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
      title={txt('diaBan.detail.xaTitle')}
      subtitle={`${txt('diaBan.detail.xaSubtitle')} · #${data.id}`}
      icon={<Map size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={maxWidthClass}
      stackLevel={stackLevel}
    >
      <div className="space-y-5">
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0">
            <Map size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            <h2 className="text-base font-bold text-foreground leading-tight truncate">{data.ten}</h2>
            <p className="text-body-sm text-muted-foreground flex items-center gap-1.5 min-w-0">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">{tenTinh}</span>
            </p>
          </div>
        </div>

        <DetailSection title={txt('diaBan.detail.basicInfo')} icon={<Map size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('diaBan.colTen')} value={data.ten} icon={<Map size={12} />} />
            <DetailField
              label={txt('diaBan.colThuTu')}
              value={String(data.thu_tu ?? 0)}
              icon={<Map size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('diaBan.detail.parentTinh')}
              value={tenTinh}
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
      </div>
    </GenericDrawer>
  );
};

export default XaPhuongDetail;
