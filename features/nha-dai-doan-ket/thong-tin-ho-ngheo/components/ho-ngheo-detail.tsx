import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Edit,
  Trash2,
  Users,
  IdCard,
  Clock,
  CalendarClock,
  ListChecks,
  MapPin,
  Home,
  Phone,
  Globe2,
  Church,
  Landmark,
  CreditCard,
  StickyNote,
  User,
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
import EnumBadge from '@/components/ui/EnumBadge';
import type { HoNgheo } from '../core/types';
import type { HoNgheoStatusChangeValues } from '../core/schema';
import { hnghDoiTuongBadge, hnghTonGiaoBadge, hnghTrangThaiBadge } from '../core/display-badges';
import { useUpdateHoNgheoTrangThai } from '../hooks/use-ho-ngheo';
import HoNgheoChuyenTrangThaiDialog from './ho-ngheo-chuyen-trang-thai-dialog';
import HoNgheoHoTroSection from './ho-ngheo-ho-tro-section';
import HoNgheoNhaSection from './ho-ngheo-nha-section';
import {
  formatHnghDateTimeDisplay,
  formatHnghDienThoaiDisplay,
  formatHnghNgayDisplay,
  formatHnghNguoiTaoDisplay,
  trimmedHnghDisplay,
} from '../utils/display-format';

interface Props {
  data: HoNgheo;
  onClose: () => void;
  onEdit: (item: HoNgheo) => void;
  onDelete: (id: string) => void;
}

const HoNgheoDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('hoNgheoList');
  const emptyCell = txt('common.emptyCell');

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const statusMutation = useUpdateHoNgheoTrangThai();

  /** Hành động nghiệp vụ nằm trên toolbar; Đóng / Sửa / Xóa vẫn ở footer. */
  const toolbarActions: DetailToolbarAction[] = useMemo(() => {
    if (!canEdit) return [];
    return [
      {
        label: txt('hoNgheo.detail.actionChangeStatus'),
        icon: <ArrowRightLeft size={16} />,
        variant: 'info' as const,
        onClick: () => setStatusModalOpen(true),
      },
    ];
  }, [canEdit]);

  const statusInitial: HoNgheoStatusChangeValues = useMemo(
    () => ({ trang_thai: data.trang_thai, ghi_chu: data.ghi_chu ?? undefined }),
    [data.trang_thai, data.ghi_chu],
  );

  const handleStatusSave = async (values: HoNgheoStatusChangeValues) => {
    await statusMutation.mutateAsync({ id: data.id, data: values });
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
      title={txt('hoNgheo.detailTitle')}
      subtitle={`${trimmedHnghDisplay(data.ten_xa_phuong) ?? ''} · #${data.id}`}
      icon={<Users size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <Users size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ho_ten_dai_dien}
          badge={
            data.trang_thai?.trim() ? (
              <EnumBadge value={data.trang_thai.trim()} config={hnghTrangThaiBadge} shape="pill" truncate />
            ) : undefined
          }
          subtitle={
            [trimmedHnghDisplay(data.so_cccd), trimmedHnghDisplay(data.khoi_xom)]
              .filter(Boolean)
              .join(' · ') || undefined
          }
        />

        {toolbarActions.length > 0 ? <DetailToolbar actions={toolbarActions} /> : null}

        <DetailSection title={txt('hoNgheo.detail.sectionHoDan')} icon={<Users size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('hoNgheo.store.hoTenCol')} icon={<Users size={12} />} value={data.ho_ten_dai_dien} />
            <DetailField
              label={txt('hoNgheo.store.soCccdCol')}
              icon={<IdCard size={12} />}
              value={trimmedHnghDisplay(data.so_cccd) ?? emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.xaPhuongCol')}
              icon={<MapPin size={12} />}
              value={trimmedHnghDisplay(data.ten_xa_phuong) ?? emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.khoiXomCol')}
              icon={<Home size={12} />}
              value={trimmedHnghDisplay(data.khoi_xom) ?? emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.doiTuongCol')}
              icon={<ListChecks size={12} />}
              value={
                data.doi_tuong ? (
                  <EnumBadge value={data.doi_tuong} config={hnghDoiTuongBadge} shape="pill" truncate />
                ) : (
                  emptyCell
                )
              }
            />
            <DetailField
              label={txt('hoNgheo.store.danTocCol')}
              icon={<Globe2 size={12} />}
              value={trimmedHnghDisplay(data.ten_dan_toc) ?? emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.tonGiaoCol')}
              icon={<Church size={12} />}
              value={<EnumBadge value={data.ton_giao} config={hnghTonGiaoBadge} shape="pill" truncate />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('hoNgheo.detail.sectionLienHe')} icon={<Phone size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('hoNgheo.store.dienThoaiCol')}
              icon={<Phone size={12} />}
              value={formatHnghDienThoaiDisplay(data.dien_thoai) || emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.soTaiKhoanCol')}
              icon={<CreditCard size={12} />}
              value={trimmedHnghDisplay(data.so_tai_khoan) ?? emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.nganHangCol')}
              icon={<Landmark size={12} />}
              value={trimmedHnghDisplay(data.ngan_hang) ?? emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('hoNgheo.store.ghiChuCol')}
              icon={<StickyNote size={12} />}
              value={trimmedHnghDisplay(data.ghi_chu) ?? emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <HoNgheoHoTroSection hoNgheo={data} />

        <HoNgheoNhaSection hoNgheo={data} />

        <DetailSection title={txt('hoNgheo.detail.systemInfo')} icon={<Clock size={14} />}>
          <DetailFieldGrid>
            <DetailField
              label={txt('hoNgheo.store.ngayTrangThaiCol')}
              icon={<CalendarClock size={12} />}
              value={formatHnghNgayDisplay(data.ngay_cap_nhat_trang_thai) || emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.nguoiTaoCol')}
              icon={<User size={12} />}
              value={formatHnghNguoiTaoDisplay(data) || emptyCell}
            />
            <DetailField
              label={txt('hoNgheo.store.tgCapNhatCol')}
              icon={<Clock size={12} />}
              value={formatHnghDateTimeDisplay(data.tg_cap_nhat) || emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>

      <HoNgheoChuyenTrangThaiDialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        initial={statusInitial}
        isSubmitting={statusMutation.isPending}
        onSave={handleStatusSave}
      />
    </GenericDrawer>
  );
};

export default HoNgheoDetail;
