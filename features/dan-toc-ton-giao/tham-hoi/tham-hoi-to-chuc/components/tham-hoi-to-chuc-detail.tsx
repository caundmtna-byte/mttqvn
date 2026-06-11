import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  Edit,
  ExternalLink,
  FileText,
  Gift,
  Link2,
  ListChecks,
  Star,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import ThamHoiToChucChangeStatusDialog from './tham-hoi-to-chuc-change-status-dialog';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { tienDoThamHoiBadge } from '../core/display-badges';
import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import type { ThamHoiToChuc } from '../core/types';

interface Props {
  data: ThamHoiToChuc;
  onClose: () => void;
  onEdit: (item: ThamHoiToChuc) => void;
  onDelete: (id: string) => void;
}

const ThamHoiToChucDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('danTocThamHoiToChuc');
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const emptyCell = txt('common.emptyCell');

  const toolbarActions: DetailToolbarAction[] = [];
  if (canEdit) {
    toolbarActions.push({
      label: txt('danTocThamHoiToChuc.detail.actionChangeStatus'),
      icon: <ArrowRightLeft size={16} />,
      variant: 'info',
      onClick: () => setChangeStatusOpen(true),
    });
  }

  const loaiHinhBadge = useMemo(
    () => ({
      Chùa: { label: 'Chùa', color: 'violet' as const },
      'Giáo xứ': { label: 'Giáo xứ', color: 'blue' as const },
      'Nghĩa trang': { label: 'Nghĩa trang', color: 'slate' as const },
      Khác: { label: 'Khác', color: 'amber' as const },
    }),
    [],
  );

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
      title={txt('danTocThamHoiToChuc.detail.title')}
      subtitle={data.dip_tham_hoi}
      icon={<Building2 size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Building2 size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_co_so ?? data.dip_tham_hoi}
          subtitle={
            data.loai_hinh?.trim() ? (
              <EnumBadge value={data.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
            ) : undefined
          }
          badge={
            data.tien_do?.trim() ? (
              <EnumBadge value={data.tien_do.trim()} config={tienDoThamHoiBadge} shape="pill" truncate />
            ) : undefined
          }
        />

        {toolbarActions.length > 0 ? (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        ) : null}

        <DetailSection title={txt('danTocThamHoiToChuc.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiToChuc.form.toChuc')}
              icon={<Star size={12} />}
              value={data.ten_co_so}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.form.dipThamHoi')}
              icon={<Calendar size={12} />}
              value={data.dip_tham_hoi}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.form.thoiGianDuKien')}
              icon={<Calendar size={12} />}
              value={data.thoi_gian_du_kien}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.form.thoiGianThucTe')}
              icon={<Calendar size={12} />}
              value={data.thoi_gian_thuc_te}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.form.phongBanThamMuu')}
              icon={<Users size={12} />}
              value={data.ten_phong_ban}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.form.donViThamHoi')}
              icon={<Building2 size={12} />}
              value={formatDonViThamHoiDisplay(data)}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.form.tienDo')}
              icon={<ListChecks size={12} />}
              value={
                data.tien_do?.trim() ? (
                  <EnumBadge value={data.tien_do.trim()} config={tienDoThamHoiBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocThamHoiToChuc.detail.sectionContent')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiToChuc.form.noiDungThamHoi')}
              icon={<FileText size={12} />}
              value={data.noi_dung_tham_hoi}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiToChuc.form.thanhPhanDoan')}
              icon={<Users size={12} />}
              value={data.thanh_phan_doan}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiToChuc.form.quaTang')}
              icon={<Gift size={12} />}
              value={data.qua_tang}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocThamHoiToChuc.detail.sectionResult')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiToChuc.form.ketQuaThucHien')}
              icon={<FileText size={12} />}
              value={data.ket_qua_thuc_hien}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiToChuc.form.linkKetQua')}
              icon={<Link2 size={12} />}
              value={
                data.link_ket_qua?.trim() ? (
                  <a
                    href={data.link_ket_qua.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {txt('danTocThamHoiToChuc.detail.openLink')}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocThamHoiToChuc.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocThamHoiToChuc.detail.nguoiTao')}
              icon={<User size={12} />}
              value={data.ho_va_ten_nguoi_tao}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.detail.tgTao')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_tao)}
            />
            <DetailField
              label={txt('danTocThamHoiToChuc.detail.tgCapNhat')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_cap_nhat)}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
      {changeStatusOpen ? (
        <ThamHoiToChucChangeStatusDialog
          open={changeStatusOpen}
          item={data}
          onClose={() => setChangeStatusOpen(false)}
        />
      ) : null}
    </GenericDrawer>
  );
};

export default ThamHoiToChucDetail;
