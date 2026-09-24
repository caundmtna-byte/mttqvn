import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
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
  ExternalLink,
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
import type { NhaDaiDoanKet } from '../core/types';
import {
  nddkDoiTuongBadge,
  nddkLoaiHinhBadge,
  nddkNguonBadge,
  nddkTrangThaiBadge,
} from '../core/display-badges';
import { useUpdateNhaDaiDoanKetTrangThai } from '../hooks/use-nha-dai-doan-ket';
import NddkChuyenTrangThaiDialog from './nddk-chuyen-trang-thai-dialog';
import type { NhaDaiDoanKetStatusChangeValues } from '../core/schema';
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
  const navigate = useNavigate();
  const { canEdit, canDelete, canApprove } = useResourcePermissions('nhaDaiDoanKetList');
  const emptyCell = txt('common.emptyCell');
  const soTienLabel = formatNddkSoTienDisplay(data.so_tien);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const statusMutation = useUpdateNhaDaiDoanKetTrangThai();

  /**
   * Hành động nghiệp vụ nằm trên toolbar; Đóng / Sửa / Xóa vẫn ở footer —
   * đúng quy ước các màn detail khác trong repo.
   *
   * Nút mở hộp thoại gác bằng `canEdit` chứ không phải `canApprove`: người nhập
   * liệu phải tự đẩy hồ sơ qua các bước khảo sát → thực hiện → bàn giao. Riêng
   * "Đã phê duyệt" bị lọc khỏi danh sách bên trong hộp thoại khi thiếu quyền
   * Duyệt, và DB chặn lần nữa bằng trigger `fn_nddk_kiem_quyen_phe_duyet`.
   */
  const toolbarActions: DetailToolbarAction[] = useMemo(() => {
    if (!canEdit) return [];
    return [
      {
        label: txt('nhaDaiDoanKet.detail.actionChangeStatus'),
        icon: <ArrowRightLeft size={16} />,
        variant: 'info' as const,
        onClick: () => setStatusModalOpen(true),
      },
    ];
  }, [canEdit]);

  const statusInitial: NhaDaiDoanKetStatusChangeValues = useMemo(
    () => ({ trang_thai: data.trang_thai, ghi_chu: data.ghi_chu ?? undefined }),
    [data.trang_thai, data.ghi_chu],
  );

  const handleStatusSave = async (values: NhaDaiDoanKetStatusChangeValues) => {
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

        {toolbarActions.length > 0 ? (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        ) : null}

        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionHoDan')}
          icon={<Users size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.form.hoNgheoLabel')}
              icon={<Users size={12} />}
              value={
                data.ho_ngheo_id ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    onClick={() =>
                      navigate(`/an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach?open=${encodeURIComponent(data.ho_ngheo_id!)}`)
                    }
                  >
                    {txt('nhaDaiDoanKet.detail.moHoNgheo')}
                    <ExternalLink size={12} />
                  </button>
                ) : (
                  <span className="text-muted-foreground">{txt('nhaDaiDoanKet.detail.chuaGanHo')}</span>
                )
              }
            />
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

      <NddkChuyenTrangThaiDialog
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        initial={statusInitial}
        canApprove={canApprove}
        isSubmitting={statusMutation.isPending}
        onSave={handleStatusSave}
      />
    </GenericDrawer>
  );
};

export default NddkDetail;
