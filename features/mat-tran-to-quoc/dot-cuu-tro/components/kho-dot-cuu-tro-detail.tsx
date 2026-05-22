import React from 'react';
import { Calendar, Edit, ExternalLink, FileText, HandHeart, Link2, ListOrdered, Trash2, Type } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { KhoDotCuuTroDetail } from '../core/types';

interface Props {
  data: KhoDotCuuTroDetail;
  onClose: () => void;
  onEdit: (item: KhoDotCuuTroDetail) => void;
  onDelete: (id: string) => void;
}

const KhoDotCuuTroDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefCampaign');

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
      title={txt('matTranDotCuuTro.detail.title')}
      subtitle={`#${data.id}`}
      icon={<HandHeart size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <HandHeart size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten}
        />

        <DetailSection title={txt('matTranDotCuuTro.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranDotCuuTro.store.ttCol')} value={String(data.tt)} icon={<ListOrdered size={12} />} />
            <DetailField label={txt('matTranDotCuuTro.form.ten')} value={data.ten} icon={<Type size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranDotCuuTro.detail.moTa')}
              value={data.mo_ta}
              icon={<FileText size={12} />}
            />
            {data.link ? (
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('matTranDotCuuTro.form.link')}
                icon={<Link2 size={12} />}
                value={
                  <a
                    href={data.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                  >
                    {data.link}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  </a>
                }
              />
            ) : (
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('matTranDotCuuTro.form.link')}
                value={null}
                icon={<Link2 size={12} />}
              />
            )}
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranDotCuuTro.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranDotCuuTro.detail.tgTao')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField
              label={txt('matTranDotCuuTro.detail.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default KhoDotCuuTroDetailDrawer;
