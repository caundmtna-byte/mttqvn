import React from 'react';
import { Edit, Trash2, Settings2, Calendar, Clock, FileText, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { BaiVietThietLapKhac, BaiVietThietLapKhacLoai } from '../core/types';

interface Props {
  data: BaiVietThietLapKhac;
  sectionLabel: string;
  onClose: () => void;
  onEdit: (item: BaiVietThietLapKhac) => void;
  onDelete: (id: string) => void;
}

function loaiLabel(loai: BaiVietThietLapKhacLoai): string {
  return loai === 'trang_dang' ? txt('page.articleSettings.sectionTrangDang') : txt('page.articleSettings.sectionNguonDang');
}

const ArticleKhacDetail: React.FC<Props> = ({ data, sectionLabel, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('articleSettings');

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
      title={txt('page.articleSettings.detailKhacTitle')}
      subtitle={`${sectionLabel} · #${data.id}`}
      icon={<Settings2 size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0">
            <Settings2 size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-foreground leading-tight truncate">{data.ten}</h2>
            <p className="text-body-sm text-muted-foreground mt-0.5">{loaiLabel(data.loai)}</p>
          </div>
        </div>

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

export default ArticleKhacDetail;
