import React from 'react';
import {
  Activity,
  CalendarClock,
  CalendarRange,
  CreditCard,
  Edit,
  ExternalLink,
  FileText,
  HandHeart,
  Landmark,
  Link2,
  ListChecks,
  ListOrdered,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatDisplayDateTimeShort } from '@/lib/display-format';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSystemInfo from '@/components/shared/DetailSystemInfo';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { KhoDotCuuTroDetail } from '../core/types';
import { dotLoaiBadge, dotTrangThaiBadge } from '../core/display-badges';
import { thoiGianChuongTrinh } from '../utils/display';

interface Props {
  data: KhoDotCuuTroDetail;
  onClose: () => void;
  onEdit: (item: KhoDotCuuTroDetail) => void;
  onDelete: (id: string) => void;
}

const KhoDotCuuTroDetailDrawer: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranReliefCampaign');
  const empty = txt('common.emptyCell');

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
          badge={<EnumBadge value={data.trang_thai} config={dotTrangThaiBadge} shape="pill" truncate />}
        />

        <DetailSection title={txt('matTranDotCuuTro.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranDotCuuTro.store.ttCol')} value={String(data.tt)} icon={<ListOrdered size={12} />} />
            <DetailField
              label={txt('matTranDotCuuTro.form.loai')}
              value={<EnumBadge value={data.loai} config={dotLoaiBadge} shape="pill" truncate />}
              icon={<Tag size={12} />}
            />
            <DetailField
              label={txt('matTranDotCuuTro.form.donViChuTri')}
              value={data.don_vi_chu_tri_label || undefined}
              icon={<Landmark size={12} />}
              emptyText={empty}
            />
            <DetailField
              label={txt('matTranDotCuuTro.store.thoiGianCol')}
              value={thoiGianChuongTrinh(data) || undefined}
              icon={<CalendarRange size={12} />}
              emptyText={empty}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranDotCuuTro.detail.moTa')}
              value={data.mo_ta}
              icon={<FileText size={12} />}
              emptyText={empty}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranDotCuuTro.form.link')}
              icon={<Link2 size={12} />}
              emptyText={empty}
              value={
                data.link ? (
                  <a
                    href={data.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline break-all"
                  >
                    {data.link}
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  </a>
                ) : undefined
              }
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranDotCuuTro.detail.sectionTiepNhan')} icon={<Wallet size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranDotCuuTro.form.taiKhoan')}
              value={data.tai_khoan_tiep_nhan ? <span className="tabular-nums">{data.tai_khoan_tiep_nhan}</span> : undefined}
              icon={<CreditCard size={12} />}
              emptyText={empty}
            />
            <DetailField
              label={txt('matTranDotCuuTro.form.nganHang')}
              value={data.ngan_hang || undefined}
              icon={<Landmark size={12} />}
              emptyText={empty}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranDotCuuTro.detail.sectionTienDo')} icon={<Activity size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('matTranDotCuuTro.form.trangThai')}
              value={<EnumBadge value={data.trang_thai} config={dotTrangThaiBadge} shape="pill" truncate />}
              icon={<Activity size={12} />}
            />
            <DetailField
              label={txt('matTranDotCuuTro.detail.ngayCapNhatTrangThai')}
              value={formatDisplayDateTimeShort(data.ngay_cap_nhat_trang_thai) || undefined}
              icon={<CalendarClock size={12} />}
              emptyText={empty}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranDotCuuTro.form.tienDo')}
              value={data.tien_do || undefined}
              icon={<ListChecks size={12} />}
              emptyText={empty}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSystemInfo
          nguoiTao={data.ten_nguoi_tao}
          tgTao={data.tg_tao}
          nguoiCapNhat={data.ten_nguoi_cap_nhat}
          tgCapNhat={data.tg_cap_nhat}
        />
      </div>
    </GenericDrawer>
  );
};

export default KhoDotCuuTroDetailDrawer;
