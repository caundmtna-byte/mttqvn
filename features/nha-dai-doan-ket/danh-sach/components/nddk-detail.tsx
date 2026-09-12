import React from 'react';
import {
  Edit,
  Trash2,
  Home,
  Clock,
  FileText,
  CalendarRange,
  CalendarClock,
  Coins,
  Hammer,
  ListChecks,
  MapPin,
  StickyNote,
  User,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '@/components/ui/EnumBadge';
import type { NhaDaiDoanKet } from '../core/types';
import {
  nddkDoiTuongBadge,
  nddkLoaiHinhBadge,
  nddkNguonBadge,
  nddkTrangThaiBadge,
} from '../core/display-badges';
import {
  formatNddkDateTimeDisplay,
  formatNddkNgayDisplay,
  formatNddkNguoiTaoDisplay,
  formatNddkSoTienDisplay,
  trimmedNddkDisplay,
} from '../utils/display-format';

interface Props {
  data: NhaDaiDoanKet;
  onClose: () => void;
  onEdit: (item: NhaDaiDoanKet) => void;
  onDelete: (id: string) => void;
}

const NddkDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('nhaDaiDoanKetList');
  const emptyCell = txt('common.emptyCell');
  const soTienLabel = formatNddkSoTienDisplay(data.so_tien);

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
      title={txt('nhaDaiDoanKet.detailTitle')}
      subtitle={`${data.loai_hinh_ho_tro} · ${data.nam} · #${data.id}`}
      icon={<Home size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Home size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ho_ten_chu_ho}
          badge={
            data.trang_thai?.trim() ? (
              <EnumBadge
                value={data.trang_thai.trim()}
                config={nddkTrangThaiBadge}
                shape="pill"
                truncate
              />
            ) : undefined
          }
          subtitle={
            <div className="flex flex-wrap items-center gap-2">
              {data.loai_hinh_ho_tro?.trim() ? (
                <EnumBadge
                  value={data.loai_hinh_ho_tro.trim()}
                  config={nddkLoaiHinhBadge}
                  shape="pill"
                  truncate
                />
              ) : null}
              {data.doi_tuong?.trim() ? (
                <EnumBadge
                  value={data.doi_tuong.trim()}
                  config={nddkDoiTuongBadge}
                  shape="pill"
                  truncate
                />
              ) : null}
              {data.nguon?.trim() ? (
                <EnumBadge value={data.nguon.trim()} config={nddkNguonBadge} shape="pill" truncate />
              ) : null}
            </div>
          }
        />

        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionHoDan')}
          icon={<Users size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('nhaDaiDoanKet.store.chuHoCol')}
              icon={<Users size={12} />}
              value={trimmedNddkDisplay(data.ho_ten_chu_ho) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.doiTuongCol')}
              icon={<Users size={12} />}
              value={
                data.doi_tuong?.trim() ? (
                  <EnumBadge
                    value={data.doi_tuong.trim()}
                    config={nddkDoiTuongBadge}
                    shape="pill"
                    truncate
                  />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.xaPhuongCol')}
              icon={<MapPin size={12} />}
              value={trimmedNddkDisplay(data.ten_xa_phuong) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.khoiXomCol')}
              icon={<MapPin size={12} />}
              value={trimmedNddkDisplay(data.khoi_xom) ?? undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionHoTro')}
          icon={<FileText size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.store.noiDungCol')}
              icon={<FileText size={12} />}
              value={
                trimmedNddkDisplay(data.noi_dung_ho_tro) ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm font-semibold tracking-tight text-foreground">
                    {data.noi_dung_ho_tro}
                  </p>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.namCol')}
              icon={<CalendarRange size={12} />}
              value={<span className="tabular-nums text-body-sm text-foreground">{data.nam}</span>}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.loaiHinhCol')}
              icon={<Hammer size={12} />}
              value={
                data.loai_hinh_ho_tro?.trim() ? (
                  <EnumBadge
                    value={data.loai_hinh_ho_tro.trim()}
                    config={nddkLoaiHinhBadge}
                    shape="pill"
                    truncate
                  />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.nguonCol')}
              icon={<Coins size={12} />}
              value={
                data.nguon?.trim() ? (
                  <EnumBadge
                    value={data.nguon.trim()}
                    config={nddkNguonBadge}
                    shape="pill"
                    truncate
                  />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.nguonHoTroCol')}
              icon={<Coins size={12} />}
              value={trimmedNddkDisplay(data.nguon_ho_tro) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.soTienCol')}
              icon={<Coins size={12} />}
              value={
                soTienLabel ? (
                  <span className="tabular-nums font-semibold text-body-sm text-foreground">
                    {soTienLabel}
                  </span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionTrangThai')}
          icon={<ListChecks size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('nhaDaiDoanKet.store.trangThaiCol')}
              icon={<ListChecks size={12} />}
              value={
                data.trang_thai?.trim() ? (
                  <EnumBadge
                    value={data.trang_thai.trim()}
                    config={nddkTrangThaiBadge}
                    shape="pill"
                    truncate
                  />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.ngayTrangThaiCol')}
              icon={<CalendarClock size={12} />}
              value={
                formatNddkNgayDisplay(data.ngay_cap_nhat_trang_thai) ? (
                  <span className="tabular-nums">
                    {formatNddkNgayDisplay(data.ngay_cap_nhat_trang_thai)}
                  </span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.store.ghiChuCol')}
              icon={<StickyNote size={12} />}
              value={
                trimmedNddkDisplay(data.ghi_chu) ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">
                    {data.ghi_chu}
                  </p>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('nhaDaiDoanKet.detail.systemInfo')}
          icon={<Clock size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('nhaDaiDoanKet.store.nguoiTaoCol')}
              icon={<User size={12} />}
              value={formatNddkNguoiTaoDisplay(data) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.store.tgCapNhatCol')}
              icon={<CalendarClock size={12} />}
              value={
                formatNddkDateTimeDisplay(data.tg_cap_nhat) ? (
                  <span className="tabular-nums">{formatNddkDateTimeDisplay(data.tg_cap_nhat)}</span>
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default NddkDetail;
