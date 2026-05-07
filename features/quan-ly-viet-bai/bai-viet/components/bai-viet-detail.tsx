import React from 'react';
import { Edit, Trash2, FileText, ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import type { BaiVietDanhSach } from '../core/types';
import { formatCurrency, formatDateShort, formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';

interface Props {
  data: BaiVietDanhSach;
  onClose: () => void;
  onEdit: (item: BaiVietDanhSach) => void;
  onDelete: (id: string) => void;
}

const BaiVietDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('articles');

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
      title={txt('articleList.detail.title')}
      subtitle={txt('articleList.detail.subtitle')}
      icon={<FileText size={20} />}
      onClose={onClose}
      footer={footer}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      footerCompact
    >
      <div className="space-y-1 mb-4">
        <h3 className="text-lg font-semibold text-foreground leading-tight">{data.ten_bai}</h3>
        <p className="text-body-sm text-muted-foreground">
          {formatDateShort(data.ngay_dang)} · {data.ten_the_loai ?? txt('common.emptyCell')}
        </p>
      </div>

      <DetailSection title={txt('articleList.detail.sectionInfo')} icon={<FileText size={14} />} variant="primary">
        <DetailFieldGrid>
          <DetailField label={txt('articleList.store.theLoaiCol')} value={data.ten_the_loai} />
          <DetailField label={txt('articleList.store.donGiaCol')} value={formatCurrency(data.don_gia)} />
          <DetailField label={txt('articleList.store.ngayDangCol')} value={formatDateShort(data.ngay_dang)} />
          <DetailField label={txt('articleList.store.nguonDangCol')} value={data.ten_nguon_dang} />
          <DetailField label={txt('articleList.store.trangDangCol')} value={data.ten_trang_dang} />
          <DetailField
            className={DETAIL_FIELD_SPAN_FULL}
            label={txt('articleList.store.linkCol')}
            value={
              <a
                href={data.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline break-all"
              >
                {data.link}
                <ExternalLink size={12} className="shrink-0" aria-hidden />
              </a>
            }
          />
          <DetailField
            label={txt('articleList.store.nguoiTaoCol')}
            value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao}
          />
          <DetailField label={txt('articleList.store.tgCapNhatCol')} value={formatDateTimeShort(data.tg_cap_nhat)} />
        </DetailFieldGrid>
      </DetailSection>
    </GenericDrawer>
  );
};

export default BaiVietDetail;
