import React from 'react';
import { CalendarDays, Edit, FileText, Hash, MapPin, StickyNote, Trash2, Type, User } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import type { MttqKyHop } from '../core/types';
import { donViDisplayLabel } from '../utils/column-search';

interface Props {
  data: MttqKyHop;
  onClose: () => void;
  onEdit: (item: MttqKyHop) => void;
  onDelete: (id: string) => void;
}

const MttqKyHopDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranSession');
  const confirm = useConfirmStore((s) => s.confirm);
  const tinhCap = txt('matTranKyHop.tinhCap');

  const handleDelete = () => {
    confirm({
      title: txt('matTranKyHop.deleteTitle'),
      message: txt('matTranKyHop.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data.id),
    });
  };

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
              onClick={handleDelete}
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

  const subtitle = [data.ky_thu, data.ngay_hop ?? ''].filter(Boolean).join(' · ');

  return (
    <GenericDrawer
      onClose={onClose}
      title={txt('matTranKyHop.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<CalendarDays size={18} />}
      subtitle={subtitle}
      footer={footer}
      footerCompact
    >
      <div className="space-y-5">
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0">
            <CalendarDays size={24} className="text-white" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h2 className="text-base font-bold text-foreground leading-tight truncate tracking-tight">{data.ten_nhiem_ky}</h2>
            <p className="text-body-sm text-muted-foreground">{donViDisplayLabel(data, tinhCap)}</p>
          </div>
        </div>

        <DetailSection title={txt('matTranKyHop.detail.sectionMain')} icon={<Type size={14} />} variant="primary">
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranKyHop.form.nhiemKy')}
              value={<span className="font-semibold tracking-tight">{data.ten_nhiem_ky}</span>}
              icon={<Type size={12} />}
            />
            <DetailField
              label={txt('matTranKyHop.form.donVi')}
              value={donViDisplayLabel(data, tinhCap)}
              icon={<MapPin size={12} />}
            />
            <DetailField label={txt('matTranKyHop.form.kyThu')} value={data.ky_thu} icon={<Hash size={12} />} />
            <DetailField
              label={txt('matTranKyHop.form.ngayHop')}
              value={data.ngay_hop ?? undefined}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranKyHop.form.noiDungKyHop')}
              value={
                data.noi_dung_ky_hop?.trim() ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.noi_dung_ky_hop}</p>
                ) : undefined
              }
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranKyHop.form.taiLieuHop')}
              value={
                data.tai_lieu_hop?.trim() ? (
                  <a
                    href={data.tai_lieu_hop}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all text-sm"
                  >
                    {data.tai_lieu_hop}
                  </a>
                ) : undefined
              }
              icon={<FileText size={12} />}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranKyHop.form.ghiChu')}
              value={
                data.ghi_chu?.trim() ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.ghi_chu}</p>
                ) : undefined
              }
              icon={<StickyNote size={12} />}
              emptyText={txt('common.emptyCell')}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranKyHop.detail.systemInfo')} icon={<User size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranKyHop.store.nguoiTaoCol')}
              value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao ?? undefined}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('matTranKyHop.detail.tgTao')}
              value={data.tg_tao ? formatDateTimeShort(data.tg_tao) : undefined}
              emptyText={txt('common.emptyCell')}
            />
            <DetailField
              label={txt('matTranKyHop.detail.tgCapNhat')}
              value={data.tg_cap_nhat ? formatDateTimeShort(data.tg_cap_nhat) : undefined}
              emptyText={txt('common.emptyCell')}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default MttqKyHopDetail;
