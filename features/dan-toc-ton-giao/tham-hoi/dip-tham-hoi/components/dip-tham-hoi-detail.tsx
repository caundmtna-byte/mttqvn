import React, { useState } from 'react';
import {
  ArrowRightLeft,
  Building2,
  Calendar,
  CalendarRange,
  Edit,
  ExternalLink,
  Plus,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { trangThaiDipThamHoiBadge } from '../core/display-badges';
import { formatDonViToChucDisplay } from '../core/display-don-vi';
import type { DipThamHoi } from '../core/types';
import DipThamHoiChangeStatusDialog from './dip-tham-hoi-change-status-dialog';
import { useThamHoiToChucByDipId } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/hooks/use-tham-hoi-to-chuc';
import { useThamHoiCaNhanByDipId } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/hooks/use-tham-hoi-ca-nhan';
import { tienDoThamHoiBadge } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/core/display-badges';
import { trangThaiThamHoiBadge } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/core/display-badges';
import { formatDonViThamHoiDisplay as formatDonViToChucThamHoi } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/core/display-don-vi';
import { formatDonViThamHoiDisplay as formatDonViCaNhanThamHoi } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/core/display-don-vi';

interface Props {
  data: DipThamHoi;
  onClose: () => void;
  onEdit: (item: DipThamHoi) => void;
  onDelete: (id: string) => void;
}

const DipThamHoiDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useResourcePermissions('danTocDipThamHoi');
  const toChucPerms = useResourcePermissions('danTocThamHoiToChuc');
  const caNhanPerms = useResourcePermissions('danTocThamHoiCaNhan');
  const canViewToChuc = toChucPerms.canView;
  const canViewCaNhan = caNhanPerms.canView;
  const canCreateToChuc = toChucPerms.canCreate;
  const canCreateCaNhan = caNhanPerms.canCreate;
  const [changeStatusOpen, setChangeStatusOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'to_chuc' | 'ca_nhan'>('to_chuc');
  const emptyCell = txt('common.emptyCell');

  const { data: toChucRows = [] } = useThamHoiToChucByDipId(data.id, { enabled: canViewToChuc });
  const { data: caNhanRows = [] } = useThamHoiCaNhanByDipId(data.id, { enabled: canViewCaNhan });

  const toolbarActions: DetailToolbarAction[] = [];
  if (canEdit) {
    toolbarActions.push({
      label: txt('danTocDipThamHoi.detail.actionChangeStatus'),
      icon: <ArrowRightLeft size={16} />,
      variant: 'info',
      onClick: () => setChangeStatusOpen(true),
    });
  }

  const tabClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
    }`;

  const toChucBasePath = '/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc';
  const caNhanBasePath = '/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan';

  const handleOpenToChucRow = (rowId: string) => {
    navigate(`${toChucBasePath}?open=${encodeURIComponent(rowId)}`);
  };

  const handleOpenCaNhanRow = (rowId: string) => {
    navigate(`${caNhanBasePath}?open=${encodeURIComponent(rowId)}`);
  };

  const handleAddToChuc = () => {
    navigate(`${toChucBasePath}?create=1&dipId=${encodeURIComponent(data.id)}`);
  };

  const handleAddCaNhan = () => {
    navigate(`${caNhanBasePath}?create=1&dipId=${encodeURIComponent(data.id)}`);
  };

  const handleViewAllToChuc = () => {
    navigate(`${toChucBasePath}?dipId=${encodeURIComponent(data.id)}`);
  };

  const handleViewAllCaNhan = () => {
    navigate(`${caNhanBasePath}?dipId=${encodeURIComponent(data.id)}`);
  };

  const sectionListActions = (
    <div className="flex flex-wrap items-center gap-2 justify-end">
      {canViewToChuc ? (
        <button type="button" className={tabClass(detailTab === 'to_chuc')} onClick={() => setDetailTab('to_chuc')}>
          {txt('danTocDipThamHoi.detail.tabToChuc')} ({toChucRows.length})
        </button>
      ) : null}
      {canViewCaNhan ? (
        <button type="button" className={tabClass(detailTab === 'ca_nhan')} onClick={() => setDetailTab('ca_nhan')}>
          {txt('danTocDipThamHoi.detail.tabCaNhan')} ({caNhanRows.length})
        </button>
      ) : null}
      {detailTab === 'to_chuc' && canCreateToChuc ? (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleAddToChuc}>
          <Plus size={14} className="mr-1" />
          {txt('danTocDipThamHoi.detail.addToChuc')}
        </Button>
      ) : null}
      {detailTab === 'ca_nhan' && canCreateCaNhan ? (
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={handleAddCaNhan}>
          <Plus size={14} className="mr-1" />
          {txt('danTocDipThamHoi.detail.addCaNhan')}
        </Button>
      ) : null}
    </div>
  );

  const footer = (
    <div className="flex items-center justify-between w-full gap-2">
      <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-3 text-xs border border-border">
        {BTN_CLOSE()}
      </Button>
      {canEdit || canDelete ? (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button size="sm" onClick={() => { onEdit(data); onClose(); }} className="h-8 px-3 text-xs bg-primary text-white">
              <Edit className="w-3.5 h-3.5 mr-1.5" />
              {BTN_EDIT()}
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="sm" onClick={() => { onDelete(data.id); onClose(); }} className="h-8 px-3 text-xs text-rose-600 border border-rose-200">
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              {BTN_DELETE()}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <GenericDrawer
      title={txt('danTocDipThamHoi.detail.title')}
      subtitle={data.ten_dip}
      icon={<CalendarRange size={18} />}
      onClose={onClose}
      footer={footer}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <CalendarRange size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_dip}
          subtitle={data.thoi_gian_du_kien ?? undefined}
          badge={
            data.trang_thai?.trim() ? (
              <EnumBadge value={data.trang_thai.trim()} config={trangThaiDipThamHoiBadge} shape="pill" truncate />
            ) : undefined
          }
        />

        {toolbarActions.length > 0 ? (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        ) : null}

        <DetailSection title={txt('danTocDipThamHoi.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField className={DETAIL_FIELD_SPAN_FULL} label={txt('danTocDipThamHoi.form.moTa')} value={data.mo_ta} emptyText={emptyCell} />
            <DetailField label={txt('danTocDipThamHoi.form.thoiGianDuKien')} icon={<Calendar size={12} />} value={data.thoi_gian_du_kien} emptyText={emptyCell} />
            <DetailField label={txt('danTocDipThamHoi.form.thoiGianThucTe')} icon={<Calendar size={12} />} value={data.thoi_gian_thuc_te} emptyText={emptyCell} />
            <DetailField label={txt('danTocDipThamHoi.form.donViToChuc')} icon={<Building2 size={12} />} value={formatDonViToChucDisplay(data)} />
            <DetailField label={txt('danTocDipThamHoi.form.phongBanThamMuu')} icon={<Users size={12} />} value={data.ten_phong_ban} emptyText={emptyCell} />
            <DetailField label={txt('danTocDipThamHoi.form.ghiChu')} value={data.ghi_chu} emptyText={emptyCell} className={DETAIL_FIELD_SPAN_FULL} />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocDipThamHoi.detail.sectionStats')}>
          <DetailFieldGrid>
            <DetailField label={txt('danTocDipThamHoi.store.soDuKienToChucCol')} value={String(data.so_luong_to_chuc_du_kien)} />
            <DetailField label={txt('danTocDipThamHoi.store.soDuKienCaNhanCol')} value={String(data.so_luong_ca_nhan_du_kien)} />
            <DetailField label={txt('danTocDipThamHoi.store.soDuKienTongCol')} value={String(data.so_luong_du_kien_tong)} />
            <DetailField label={txt('danTocDipThamHoi.store.soThucTeTongCol')} value={String(data.so_luong_thuc_te_tong)} />
            <DetailField label={txt('danTocDipThamHoi.store.soThucHienToChucCol')} value={String(data.so_thuc_hien_to_chuc)} />
            <DetailField label={txt('danTocDipThamHoi.store.soThucHienCaNhanCol')} value={String(data.so_thuc_hien_ca_nhan)} />
          </DetailFieldGrid>
        </DetailSection>

        {(canViewToChuc || canViewCaNhan) && (
          <DetailSection
            title={txt('danTocDipThamHoi.detail.sectionDetailList')}
            headerRight={sectionListActions}
          >
            {detailTab === 'to_chuc' && canViewToChuc ? (
              toChucRows.length === 0 ? (
                <div className="space-y-3">
                  <EmptyState title={txt('danTocDipThamHoi.detail.noChildToChuc')} icon={<Building2 className="h-10 w-10 text-muted-foreground" />} />
                  {canCreateToChuc ? (
                    <div className="flex justify-center">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddToChuc}>
                        <Plus size={14} className="mr-1.5" />
                        {txt('danTocDipThamHoi.detail.addToChuc')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                <EmbeddedChildDataGrid
                  rows={toChucRows}
                  getRowKey={(row) => row.id}
                  maxVisibleBodyRows={6}
                  onRowClick={(row) => handleOpenToChucRow(row.id)}
                  labelColumn={{
                    header: txt('danTocThamHoiToChuc.store.tenCoSoCol'),
                    renderCell: (row) => <span className="font-medium text-sm truncate">{row.ten_co_so ?? '—'}</span>,
                  }}
                  columns={[
                    {
                      id: 'tien_do',
                      header: txt('danTocThamHoiToChuc.store.tienDoCol'),
                      renderCell: (row) =>
                        row.tien_do?.trim() ? (
                          <EnumBadge value={row.tien_do.trim()} config={tienDoThamHoiBadge} shape="pill" truncate />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      id: 'don_vi',
                      header: txt('danTocThamHoiToChuc.store.donViThamHoiCol'),
                      renderCell: (row) => formatDonViToChucThamHoi(row),
                    },
                  ]}
                  actionsColumn={{ header: txt('common.actions'), widthClass: 'w-16', renderCell: () => null }}
                />
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={handleViewAllToChuc}
                  >
                    {txt('danTocDipThamHoi.detail.viewAllToChuc')}
                    <ExternalLink size={12} />
                  </button>
                </div>
                </>
              )
            ) : null}
            {detailTab === 'ca_nhan' && canViewCaNhan ? (
              caNhanRows.length === 0 ? (
                <div className="space-y-3">
                  <EmptyState title={txt('danTocDipThamHoi.detail.noChildCaNhan')} icon={<User className="h-10 w-10 text-muted-foreground" />} />
                  {canCreateCaNhan ? (
                    <div className="flex justify-center">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleAddCaNhan}>
                        <Plus size={14} className="mr-1.5" />
                        {txt('danTocDipThamHoi.detail.addCaNhan')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                <EmbeddedChildDataGrid
                  rows={caNhanRows}
                  getRowKey={(row) => row.id}
                  maxVisibleBodyRows={6}
                  onRowClick={(row) => handleOpenCaNhanRow(row.id)}
                  labelColumn={{
                    header: txt('danTocThamHoiCaNhan.store.hoVaTenCol'),
                    renderCell: (row) => <span className="font-medium text-sm truncate">{row.ho_va_ten ?? '—'}</span>,
                  }}
                  columns={[
                    {
                      id: 'trang_thai',
                      header: txt('danTocThamHoiCaNhan.store.trangThaiCol'),
                      renderCell: (row) =>
                        row.trang_thai?.trim() ? (
                          <EnumBadge value={row.trang_thai.trim()} config={trangThaiThamHoiBadge} shape="pill" truncate />
                        ) : (
                          '—'
                        ),
                    },
                    {
                      id: 'don_vi',
                      header: txt('danTocThamHoiCaNhan.store.donViThamHoiCol'),
                      renderCell: (row) => formatDonViCaNhanThamHoi(row),
                    },
                  ]}
                  actionsColumn={{ header: txt('common.actions'), widthClass: 'w-16', renderCell: () => null }}
                />
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={handleViewAllCaNhan}
                  >
                    {txt('danTocDipThamHoi.detail.viewAllCaNhan')}
                    <ExternalLink size={12} />
                  </button>
                </div>
                </>
              )
            ) : null}
          </DetailSection>
        )}

        <DetailSection title={txt('danTocDipThamHoi.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField label={txt('danTocDipThamHoi.detail.nguoiTao')} value={data.ho_va_ten_nguoi_tao} emptyText={emptyCell} />
            <DetailField label={txt('danTocDipThamHoi.detail.tgTao')} value={formatDateTimeShort(data.tg_tao)} />
            <DetailField label={txt('danTocDipThamHoi.detail.tgCapNhat')} value={formatDateTimeShort(data.tg_cap_nhat)} />
          </DetailFieldGrid>
        </DetailSection>
      </div>

      {changeStatusOpen ? (
        <DipThamHoiChangeStatusDialog open={changeStatusOpen} item={data} onClose={() => setChangeStatusOpen(false)} />
      ) : null}
    </GenericDrawer>
  );
};

export default DipThamHoiDetail;
