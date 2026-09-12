import React from 'react';
import { Calendar, Edit, FileText, ListOrdered, Tag, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { QUY_LOAI_KHOAN_LABEL } from '../../core/constants';
import { quyLoaiKhoanBadge, quyTrangThaiBadge } from '../../core/display-badges';
import type { QuyDanhMucKhoanDetail } from '../core/types';

interface Props {
  data: QuyDanhMucKhoanDetail;
  onClose: () => void;
  onEdit: (item: QuyDanhMucKhoanDetail) => void;
  onDelete: (id: string) => void;
}

const QuyDanhMucKhoanDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('quyDanhMucKhoan');

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
      title={txt('quy.danhMucKhoan.detail.title')}
      subtitle={`#${data.id}`}
      icon={<Tag size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Tag size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten}
          subtitle={
            <p className="m-0 truncate text-muted-foreground">{QUY_LOAI_KHOAN_LABEL[data.loai]}</p>
          }
        />

        <DetailSection title={txt('quy.danhMucKhoan.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.danhMucKhoan.store.loaiCol')}
              value={<EnumBadge value={data.loai} config={quyLoaiKhoanBadge} />}
              icon={<Tag size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucKhoan.store.trangThaiCol')}
              value={<EnumBadge value={data.trang_thai} config={quyTrangThaiBadge} />}
              icon={<ListOrdered size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucKhoan.form.thuTu')}
              value={String(data.thu_tu)}
              icon={<ListOrdered size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('quy.danhMucKhoan.form.moTa')}
              value={data.mo_ta}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('quy.danhMucKhoan.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('quy.danhMucKhoan.detail.tgTao')}
              value={formatDateTimeShort(data.tg_tao)}
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('quy.danhMucKhoan.detail.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default QuyDanhMucKhoanDetailDrawer;
