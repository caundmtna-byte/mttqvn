import React from 'react';
import { Edit, Trash2, Settings2, Calendar, Clock, FileText, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { PbxhThietLap } from '../core/types';
import { PBXH_LOAI_TAB_LABEL_KEY } from '../core/types';

interface Props {
  data: PbxhThietLap;
  onClose: () => void;
  onEdit: (item: PbxhThietLap) => void;
  onDelete: (id: string) => void;
}

const PbxhThietLapDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('phanBienThietLapDanhMuc');
  const loaiLabel = txt(PBXH_LOAI_TAB_LABEL_KEY[data.loai]);

  const footer = (
    <div className="flex items-center justify-between w-full gap-2">
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
      title={txt('page.pbxhThietLap.detailTitle')}
      subtitle={`${loaiLabel} · #${data.id}`}
      icon={<Settings2 size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Settings2 size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten}
          subtitle={<p className="m-0">{loaiLabel}</p>}
        />

        <DetailSection title={txt('page.articleSettings.detailBasic')} icon={<Settings2 size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('page.articleSettings.colTen')} value={data.ten} icon={<Settings2 size={12} />} />
            <DetailField label={txt('page.articleSettings.colThuTu')} value={String(data.thu_tu)} icon={<ListOrdered size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('page.articleSettings.colMoTa')}
              value={data.mo_ta ?? ''}
              icon={<FileText size={12} />}
              emptyText="—"
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('page.articleSettings.detailSystem')} icon={<Clock size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField label={txt('page.articleSettings.colTgTao')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField label={txt('page.articleSettings.colTgCapNhat')} value={formatDateTimeShort(data.tg_cap_nhat)} icon={<Calendar size={12} />} />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default PbxhThietLapDetail;
