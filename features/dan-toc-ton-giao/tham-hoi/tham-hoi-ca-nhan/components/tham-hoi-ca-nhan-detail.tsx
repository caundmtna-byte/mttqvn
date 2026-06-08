import React from 'react';
import {
  Building2,
  Calendar,
  Edit,
  ExternalLink,
  FileText,
  Gift,
  Link2,
  ListChecks,
  MapPin,
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
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { trangThaiThamHoiBadge } from '../core/display-badges';
import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import { formatThoiGianDuKienDisplay } from '../utils/thoi-gian-du-kien';
import type { ThamHoiCaNhan } from '../core/types';

interface Props {
  data: ThamHoiCaNhan;
  onClose: () => void;
  onEdit: (item: ThamHoiCaNhan) => void;
  onDelete: (id: string) => void;
}

const ThamHoiCaNhanDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('danTocThamHoiCaNhan');
  const emptyCell = txt('common.emptyCell');

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
      title={txt('danTocThamHoiCaNhan.detail.title')}
      subtitle={data.dip_tham_hoi}
      icon={<User size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <User size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ho_va_ten ?? data.dip_tham_hoi}
          subtitle={
            data.doi_tuong ? (
              <span className="text-muted-foreground text-sm">{data.doi_tuong}</span>
            ) : undefined
          }
          badge={
            data.trang_thai?.trim() ? (
              <EnumBadge value={data.trang_thai.trim()} config={trangThaiThamHoiBadge} shape="pill" truncate />
            ) : undefined
          }
        />

        <DetailSection title={txt('danTocThamHoiCaNhan.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiCaNhan.form.caNhan')}
              icon={<User size={12} />}
              value={data.ho_va_ten}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.store.doiTuongCol')}
              icon={<Users size={12} />}
              value={data.doi_tuong}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.store.chucVuViTriCol')}
              icon={<Users size={12} />}
              value={data.chuc_vu_vi_tri}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.phongBanThamMuu')}
              icon={<Users size={12} />}
              value={data.ten_phong_ban}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.dipThamHoi')}
              icon={<Calendar size={12} />}
              value={data.dip_tham_hoi}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.thoiGianDuKien')}
              icon={<Calendar size={12} />}
              value={formatThoiGianDuKienDisplay(data.thoi_gian_du_kien) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.donViThamHoi')}
              icon={<Building2 size={12} />}
              value={formatDonViThamHoiDisplay(data)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.donViXaPhuong')}
              icon={<MapPin size={12} />}
              value={data.ten_xa_phuong}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.quaTang')}
              icon={<Gift size={12} />}
              value={data.qua_tang}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.form.trangThai')}
              icon={<ListChecks size={12} />}
              value={
                data.trang_thai?.trim() ? (
                  <EnumBadge value={data.trang_thai.trim()} config={trangThaiThamHoiBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocThamHoiCaNhan.detail.sectionResult')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiCaNhan.form.ketQuaGhiChu')}
              icon={<FileText size={12} />}
              value={data.ket_qua_ghi_chu}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocThamHoiCaNhan.form.linkKetQua')}
              icon={<Link2 size={12} />}
              value={
                data.link_ket_qua?.trim() ? (
                  <a
                    href={data.link_ket_qua.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {txt('danTocThamHoiCaNhan.detail.openLink')}
                    <ExternalLink size={12} aria-hidden />
                  </a>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocThamHoiCaNhan.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocThamHoiCaNhan.detail.nguoiTao')}
              icon={<User size={12} />}
              value={data.ho_va_ten_nguoi_tao}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.detail.tgTao')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_tao)}
            />
            <DetailField
              label={txt('danTocThamHoiCaNhan.detail.tgCapNhat')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_cap_nhat)}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default ThamHoiCaNhanDetail;
