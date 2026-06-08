import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Edit,
  FileText,
  MapPin,
  Phone,
  Power,
  Star,
  Trash2,
  User,
  UserRound,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import EmptyState from '@/components/shared/EmptyState';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import { formatDate, formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useCan } from '@/hooks/use-can';
import { trangThaiThamHoiBadge } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/core/display-badges';
import { formatThoiGianDuKienDisplay } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/utils/thoi-gian-du-kien';
import { useThamHoiCaNhanByCaNhanId } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/hooks/use-tham-hoi-ca-nhan';
import type { ThamHoiCaNhan } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/core/types';
import type { ThongTinCaNhanTieuBieu } from '../core/types';

interface Props {
  data: ThongTinCaNhanTieuBieu;
  onClose: () => void;
  onEdit: (item: ThongTinCaNhanTieuBieu) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: ThongTinCaNhanTieuBieu) => void;
}

const ThongTinCaNhanTieuBieuDetail: React.FC<Props> = ({
  data,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useResourcePermissions('danTocCaNhanTieuBieu');
  const canViewThamHoi = useCan('view', 'danTocThamHoiCaNhan');
  const { data: thamHoiRows = [] } = useThamHoiCaNhanByCaNhanId(data.id, { enabled: canViewThamHoi });
  const isActive = data.trang_thai === 'Đang hoạt động';
  const emptyCell = txt('common.emptyCell');

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

  const doiTuongBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Chức sắc': { label: 'Chức sắc', color: 'violet' },
      'Người uy tín': { label: 'Người uy tín', color: 'blue' },
      'Người có công': { label: 'Người có công', color: 'amber' },
    };
  }, []);

  const diaBanLine = useMemo(() => {
    const parts = [data.ten_don_vi, data.ten_tinh].filter(Boolean);
    return parts.length ? parts.join(' · ') : null;
  }, [data.ten_don_vi, data.ten_tinh]);

  const toolbarActions: DetailToolbarAction[] = [
    ...(onStatusChange && canEdit
      ? [
          {
            label: isActive
              ? txt('danTocCaNhanTieuBieu.detail.deactivate')
              : txt('danTocCaNhanTieuBieu.detail.activate'),
            icon: <Power size={16} />,
            onClick: () => onStatusChange(data),
            variant: 'info' as const,
          },
        ]
      : []),
  ];

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
      title={txt('danTocCaNhanTieuBieu.detail.title')}
      subtitle={data.ho_va_ten}
      icon={<UserRound size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        {toolbarActions.length > 0 && (
          <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
        )}

        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <UserRound size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ho_va_ten}
          subtitle={diaBanLine ? <p className="m-0 truncate text-muted-foreground">{diaBanLine}</p> : undefined}
          badge={
            data.trang_thai?.trim() ? (
              <EnumBadge value={data.trang_thai.trim()} config={trangThaiBadge} shape="pill" truncate />
            ) : undefined
          }
        />

        <DetailSection title={txt('danTocCaNhanTieuBieu.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.doiTuong')}
              icon={<Users size={12} />}
              value={
                data.doi_tuong?.trim() ? (
                  <EnumBadge value={data.doi_tuong.trim()} config={doiTuongBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.ngaySinh')}
              icon={<Calendar size={12} />}
              value={data.ngay_sinh ? formatDate(data.ngay_sinh) : undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.chucVuViTri')}
              icon={<Star size={12} />}
              value={data.chuc_vu_vi_tri}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.tonGiaoDanToc')}
              icon={<Users size={12} />}
              value={data.ton_giao_dan_toc}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.trangThai')}
              icon={<Power size={12} />}
              value={
                data.trang_thai?.trim() ? (
                  <EnumBadge value={data.trang_thai.trim()} config={trangThaiBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocCaNhanTieuBieu.detail.sectionContact')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocCaNhanTieuBieu.form.diaChi')}
              icon={<MapPin size={12} />}
              value={data.dia_chi}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.donVi')}
              icon={<MapPin size={12} />}
              value={data.ten_don_vi}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.form.soDienThoai')}
              icon={<Phone size={12} />}
              value={data.so_dien_thoai}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocCaNhanTieuBieu.detail.sectionContribution')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocCaNhanTieuBieu.form.dongGopNoiBat')}
              icon={<FileText size={12} />}
              value={data.dong_gop_noi_bat}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        {canViewThamHoi ? (
          <DetailSection
            title={txt('danTocCaNhanTieuBieu.detail.sectionThamHoi')}
            icon={<User size={14} />}
            headerRight={
              thamHoiRows.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan')}
                  className="gap-1"
                >
                  {txt('danTocCaNhanTieuBieu.detail.viewAllThamHoi')}
                </Button>
              ) : null
            }
          >
            {thamHoiRows.length === 0 ? (
              <EmptyState
                title={txt('danTocCaNhanTieuBieu.detail.noThamHoi')}
                description={txt('danTocCaNhanTieuBieu.detail.noThamHoiHint')}
                icon={<User className="h-10 w-10 text-muted-foreground" />}
              />
            ) : (
              <EmbeddedChildDataGrid<ThamHoiCaNhan>
                rows={thamHoiRows}
                getRowKey={(row) => row.id}
                maxVisibleBodyRows={6}
                onRowClick={() => navigate('/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan')}
                labelColumn={{
                  header: txt('danTocThamHoiCaNhan.store.dipThamHoiCol'),
                  minWidthClass: 'min-w-[140px]',
                  renderCell: (row) => (
                    <span className="font-medium text-foreground text-sm truncate">{row.dip_tham_hoi}</span>
                  ),
                }}
                columns={[
                  {
                    id: 'thoi_gian',
                    header: txt('danTocThamHoiCaNhan.store.thoiGianDuKienCol'),
                    headerClassName: 'max-w-[110px]',
                    cellClassName: 'max-w-[110px]',
                    renderCell: (row) => (
                      <span className="text-xs text-muted-foreground truncate tabular-nums">
                        {formatThoiGianDuKienDisplay(row.thoi_gian_du_kien) || '—'}
                      </span>
                    ),
                  },
                  {
                    id: 'trang_thai',
                    header: txt('danTocThamHoiCaNhan.store.trangThaiCol'),
                    renderCell: (row) =>
                      row.trang_thai?.trim() ? (
                        <EnumBadge value={row.trang_thai.trim()} config={trangThaiThamHoiBadge} shape="pill" truncate />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      ),
                  },
                ]}
                actionsColumn={{
                  header: txt('common.actions'),
                  widthClass: 'w-16 min-w-[4rem]',
                  renderCell: () => null,
                }}
              />
            )}
          </DetailSection>
        ) : null}

        <DetailSection title={txt('danTocCaNhanTieuBieu.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocCaNhanTieuBieu.detail.nguoiTao')}
              icon={<User size={12} />}
              value={data.ho_va_ten_nguoi_tao}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.detail.tgTao')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_tao)}
            />
            <DetailField
              label={txt('danTocCaNhanTieuBieu.detail.tgCapNhat')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_cap_nhat)}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default ThongTinCaNhanTieuBieuDetail;
