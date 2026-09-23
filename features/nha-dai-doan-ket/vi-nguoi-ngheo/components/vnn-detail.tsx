import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Edit,
  Trash2,
  HandHeart,
  Clock,
  FileText,
  CalendarRange,
  CalendarClock,
  Coins,
  Gift,
  Layers,
  Link2,
  ListChecks,
  MapPin,
  StickyNote,
  User,
  Users,
  Building2,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import type { ViNguoiNgheo } from '../core/types';
import {
  vnnDoiTuongBadge,
  vnnHinhThucBadge,
  vnnLinhVucBadge,
  vnnNguonBadge,
  vnnTrangThaiBadge,
} from '../core/display-badges';
import { useUpdateViNguoiNgheoTrangThai } from '../hooks/use-vi-nguoi-ngheo';
import VnnChuyenTrangThaiDialog from './vnn-chuyen-trang-thai-dialog';
import type { ViNguoiNgheoStatusChangeValues } from '../core/schema';
import {
  formatVnnDateTimeDisplay,
  formatVnnNgayDisplay,
  formatVnnNguoiTaoDisplay,
  formatVnnSoTienDisplay,
  trimmedVnnDisplay,
} from '../utils/display-format';

interface Props {
  data: ViNguoiNgheo;
  onClose: () => void;
  onEdit: (item: ViNguoiNgheo) => void;
  onDelete: (id: string) => void;
}

function badge(value: string | null | undefined, config: BadgeConfig) {
  const v = value?.trim();
  return v ? <EnumBadge value={v} config={config} shape="pill" truncate /> : undefined;
}

function text(value: string | null | undefined) {
  return trimmedVnnDisplay(value) ?? undefined;
}

const VnnDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('viNguoiNgheoList');
  const emptyCell = txt('common.emptyCell');
  const soTienLabel = formatVnnSoTienDisplay(data.so_tien);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const statusMutation = useUpdateViNguoiNgheoTrangThai();

  const toolbarActions: DetailToolbarAction[] = useMemo(() => {
    if (!canEdit) return [];
    return [
      {
        label: txt('viNguoiNgheo.detail.actionChangeStatus'),
        icon: <ArrowRightLeft size={16} />,
        variant: 'info' as const,
        onClick: () => setStatusModalOpen(true),
      },
    ];
  }, [canEdit]);

  const statusInitial: ViNguoiNgheoStatusChangeValues = useMemo(
    () => ({ trang_thai: data.trang_thai, ghi_chu: data.ghi_chu ?? undefined }),
    [data.trang_thai, data.ghi_chu],
  );

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
      title={txt('viNguoiNgheo.detailTitle')}
      subtitle={`${data.linh_vuc_ho_tro} · ${data.nam} · #${data.id}`}
      icon={<HandHeart size={18} />}
      onClose={onClose}
      footer={footer}
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
          title={data.ho_ten_nguoi_nhan}
          badge={badge(data.trang_thai, vnnTrangThaiBadge)}
          subtitle={
            <div className="flex flex-wrap items-center gap-2">
              {badge(data.linh_vuc_ho_tro, vnnLinhVucBadge)}
              {badge(data.hinh_thuc_ho_tro, vnnHinhThucBadge)}
              {badge(data.doi_tuong, vnnDoiTuongBadge)}
            </div>
          }
        />

        {toolbarActions.length > 0 ? (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        ) : null}

        <DetailSection
          title={txt('viNguoiNgheo.form.sectionNguoiNhan')}
          icon={<Users size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('viNguoiNgheo.store.nguoiNhanCol')}
              icon={<Users size={12} />}
              value={text(data.ho_ten_nguoi_nhan)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.detail.lienKetHoNgheo')}
              icon={<Link2 size={12} />}
              value={
                data.ho_ngheo_id
                  ? `${txt('viNguoiNgheo.detail.daLienKet')} · #${data.ho_ngheo_id}`
                  : txt('viNguoiNgheo.detail.chuaLienKet')
              }
            />
            <DetailField
              label={txt('viNguoiNgheo.store.xaPhuongCol')}
              icon={<MapPin size={12} />}
              value={text(data.ten_xa_phuong)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.khoiXomCol')}
              icon={<MapPin size={12} />}
              value={text(data.khoi_xom)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.doiTuongCol')}
              icon={<Users size={12} />}
              value={badge(data.doi_tuong, vnnDoiTuongBadge)}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('viNguoiNgheo.form.sectionHoTro')}
          icon={<FileText size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('viNguoiNgheo.store.noiDungCol')}
              icon={<FileText size={12} />}
              value={
                text(data.noi_dung_ho_tro) ? (
                  <p className="whitespace-pre-wrap break-words text-body-sm font-semibold tracking-tight text-foreground">
                    {data.noi_dung_ho_tro}
                  </p>
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.namCol')}
              icon={<CalendarRange size={12} />}
              value={<span className="tabular-nums text-body-sm text-foreground">{data.nam}</span>}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.linhVucCol')}
              icon={<Layers size={12} />}
              value={badge(data.linh_vuc_ho_tro, vnnLinhVucBadge)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.nguonCol')}
              icon={<Coins size={12} />}
              value={badge(data.nguon, vnnNguonBadge)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.nguonHoTroCol')}
              icon={<Coins size={12} />}
              value={text(data.nguon_ho_tro)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.hinhThucCol')}
              icon={<Gift size={12} />}
              value={badge(data.hinh_thuc_ho_tro, vnnHinhThucBadge)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.soTienCol')}
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
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('viNguoiNgheo.store.donViHoTroCol')}
              icon={<Building2 size={12} />}
              value={text(data.ten_don_vi_ho_tro)}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('viNguoiNgheo.form.sectionTrangThai')}
          icon={<ListChecks size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('viNguoiNgheo.store.trangThaiCol')}
              icon={<ListChecks size={12} />}
              value={badge(data.trang_thai, vnnTrangThaiBadge)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.ngayTrangThaiCol')}
              icon={<CalendarClock size={12} />}
              value={formatVnnNgayDisplay(data.ngay_cap_nhat_trang_thai) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('viNguoiNgheo.store.ghiChuCol')}
              icon={<StickyNote size={12} />}
              value={
                text(data.ghi_chu) ? (
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
          title={txt('viNguoiNgheo.detail.systemInfo')}
          icon={<Clock size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('viNguoiNgheo.store.nguoiTaoCol')}
              icon={<User size={12} />}
              value={formatVnnNguoiTaoDisplay(data) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('viNguoiNgheo.store.tgCapNhatCol')}
              icon={<CalendarClock size={12} />}
              value={formatVnnDateTimeDisplay(data.tg_cap_nhat) || undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>

      <VnnChuyenTrangThaiDialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        initial={statusInitial}
        isSubmitting={statusMutation.isPending}
        onSave={async (values) => {
          await statusMutation.mutateAsync({ id: data.id, data: values });
        }}
      />
    </GenericDrawer>
  );
};

export default VnnDetail;
