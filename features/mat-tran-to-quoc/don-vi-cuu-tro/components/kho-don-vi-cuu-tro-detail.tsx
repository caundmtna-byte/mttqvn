import React, { useMemo } from 'react';
import { Building2, Calendar, Edit, FileText, ListOrdered, Mail, MapPin, Phone, Trash2, Type, User } from 'lucide-react';
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
import EnumBadge from '@/components/ui/EnumBadge';
import { buildKhoDonViCuuTroLoaiBadgeConfig, isKhoDonViCuuTroCaNhan } from '../core/loai';
import type { KhoDonViCuuTroDetail } from '../core/types';

interface Props {
  data: KhoDonViCuuTroDetail;
  onClose: () => void;
  onEdit: (item: KhoDonViCuuTroDetail) => void;
  onDelete: (id: string) => void;
}

const KhoDonViCuuTroDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefSupportUnits');

  const loaiBadge = useMemo(() => buildKhoDonViCuuTroLoaiBadgeConfig(), []);

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

  const SummaryIcon = isKhoDonViCuuTroCaNhan(data.loai) ? User : Building2;

  return (
    <GenericDrawer
      title={txt('matTranDonViCuuTro.detail.title')}
      subtitle={`#${data.id}`}
      icon={<SummaryIcon size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <SummaryIcon size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten}
          badge={<EnumBadge value={data.loai} config={loaiBadge} shape="pill" truncate />}
        />

        <DetailSection title={txt('matTranDonViCuuTro.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranDonViCuuTro.store.ttCol')} value={String(data.tt)} icon={<ListOrdered size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.ten')} value={data.ten} icon={<Type size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.diaChi')} value={data.dia_chi} icon={<MapPin size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.dienThoai')} value={data.dien_thoai} icon={<Phone size={12} />} />
            <DetailField label={txt('matTranDonViCuuTro.form.email')} value={data.email} icon={<Mail size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranDonViCuuTro.form.ghiChu')}
              value={data.ghi_chu}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranDonViCuuTro.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranDonViCuuTro.detail.tgTao')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField
              label={txt('matTranDonViCuuTro.detail.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default KhoDonViCuuTroDetailDrawer;
