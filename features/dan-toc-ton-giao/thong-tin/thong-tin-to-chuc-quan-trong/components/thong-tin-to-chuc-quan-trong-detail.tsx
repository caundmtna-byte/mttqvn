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
  Tag,
  Trash2,
  User,
  Building2,
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
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useCan } from '@/hooks/use-can';
import { useThamHoiToChucByToChucId } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/hooks/use-tham-hoi-to-chuc';
import { tienDoThamHoiBadge } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/core/display-badges';
import { formatDonViThamHoiDisplay } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/core/display-don-vi';
import type { ThamHoiToChuc } from '@/features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/core/types';
import type { ThongTinToChucQuanTrong } from '../core/types';

interface Props {
  data: ThongTinToChucQuanTrong;
  onClose: () => void;
  onEdit: (item: ThongTinToChucQuanTrong) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: ThongTinToChucQuanTrong) => void;
}

const ThongTinToChucQuanTrongDetail: React.FC<Props> = ({
  data,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const navigate = useNavigate();
  const { canEdit, canDelete } = useResourcePermissions('danTocToChucQuanTrong');
  const canViewThamHoi = useCan('view', 'danTocThamHoiToChuc');
  const { data: thamHoiRows = [] } = useThamHoiToChucByToChucId(data.id, { enabled: canViewThamHoi });
  const isActive = data.trang_thai === 'Đang hoạt động';
  const emptyCell = txt('common.emptyCell');

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

  const loaiHinhBadge = useMemo((): BadgeConfig<string> => {
    return {
      Chùa: { label: 'Chùa', color: 'violet' },
      'Giáo xứ': { label: 'Giáo xứ', color: 'blue' },
      'Nghĩa trang': { label: 'Nghĩa trang', color: 'slate' },
      Khác: { label: 'Khác', color: 'amber' },
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
              ? txt('danTocToChucQuanTrong.detail.deactivate')
              : txt('danTocToChucQuanTrong.detail.activate'),
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
      title={txt('danTocToChucQuanTrong.detail.title')}
      subtitle={data.ten_co_so}
      icon={<Star size={18} />}
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
              <Star size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_co_so}
          subtitle={diaBanLine ? <p className="m-0 truncate text-muted-foreground">{diaBanLine}</p> : undefined}
          badge={
            data.trang_thai?.trim() ? (
              <EnumBadge value={data.trang_thai.trim()} config={trangThaiBadge} shape="pill" truncate />
            ) : undefined
          }
        />

        <DetailSection title={txt('danTocToChucQuanTrong.detail.sectionMain')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocToChucQuanTrong.form.loaiHinh')}
              icon={<Tag size={12} />}
              value={
                data.loai_hinh?.trim() ? (
                  <EnumBadge value={data.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
                ) : undefined
              }
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocToChucQuanTrong.form.chuTri')}
              icon={<User size={12} />}
              value={data.chu_tri}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocToChucQuanTrong.form.trangThai')}
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

        <DetailSection title={txt('danTocToChucQuanTrong.detail.sectionContact')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocToChucQuanTrong.form.donVi')}
              icon={<MapPin size={12} />}
              value={data.ten_don_vi}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocToChucQuanTrong.form.diaChi')}
              icon={<MapPin size={12} />}
              value={data.dia_chi}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocToChucQuanTrong.form.soDienThoai')}
              icon={<Phone size={12} />}
              value={data.so_dien_thoai}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('danTocToChucQuanTrong.detail.sectionHistory')}>
          <DetailFieldGrid>
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocToChucQuanTrong.form.lichSuHinhThanh')}
              icon={<FileText size={12} />}
              value={data.lich_su_hinh_thanh}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('danTocToChucQuanTrong.form.congTacAnSinh')}
              icon={<FileText size={12} />}
              value={data.cong_tac_an_sinh}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>

        {canViewThamHoi ? (
          <DetailSection
            title={txt('danTocToChucQuanTrong.detail.sectionThamHoi')}
            icon={<Building2 size={14} />}
            headerRight={
              thamHoiRows.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc')}
                  className="gap-1"
                >
                  {txt('danTocToChucQuanTrong.detail.viewAllThamHoi')}
                </Button>
              ) : null
            }
          >
            {thamHoiRows.length === 0 ? (
              <EmptyState
                title={txt('danTocToChucQuanTrong.detail.noThamHoi')}
                description={txt('danTocToChucQuanTrong.detail.noThamHoiHint')}
                icon={<Building2 className="h-10 w-10 text-muted-foreground" />}
              />
            ) : (
              <EmbeddedChildDataGrid<ThamHoiToChuc>
                rows={thamHoiRows}
                getRowKey={(row) => row.id}
                maxVisibleBodyRows={6}
                onRowClick={() => navigate('/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc')}
                labelColumn={{
                  header: txt('danTocThamHoiToChuc.store.dipThamHoiCol'),
                  minWidthClass: 'min-w-[140px]',
                  renderCell: (row) => (
                    <span className="font-medium text-foreground text-sm truncate">{row.dip_tham_hoi}</span>
                  ),
                }}
                columns={[
                  {
                    id: 'thoi_gian',
                    header: txt('danTocThamHoiToChuc.store.thoiGianDuKienCol'),
                    headerClassName: 'max-w-[110px]',
                    cellClassName: 'max-w-[110px]',
                    renderCell: (row) => (
                      <span className="text-xs text-muted-foreground truncate">{row.thoi_gian_du_kien ?? '—'}</span>
                    ),
                  },
                  {
                    id: 'tien_do',
                    header: txt('danTocThamHoiToChuc.store.tienDoCol'),
                    renderCell: (row) =>
                      row.tien_do?.trim() ? (
                        <EnumBadge value={row.tien_do.trim()} config={tienDoThamHoiBadge} shape="pill" truncate />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      ),
                  },
                  {
                    id: 'don_vi',
                    header: txt('danTocThamHoiToChuc.store.donViThamHoiCol'),
                    headerClassName: 'max-w-[140px]',
                    cellClassName: 'max-w-[140px]',
                    renderCell: (row) => {
                      const label = formatDonViThamHoiDisplay(row);
                      return (
                        <span className="line-clamp-2 text-xs text-muted-foreground" title={label}>
                          {label}
                        </span>
                      );
                    },
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

        <DetailSection title={txt('danTocToChucQuanTrong.detail.systemInfo')}>
          <DetailFieldGrid>
            <DetailField
              label={txt('danTocToChucQuanTrong.detail.nguoiTao')}
              icon={<User size={12} />}
              value={data.ho_va_ten_nguoi_tao}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('danTocToChucQuanTrong.detail.tgTao')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_tao)}
            />
            <DetailField
              label={txt('danTocToChucQuanTrong.detail.tgCapNhat')}
              icon={<Calendar size={12} />}
              value={formatDateTimeShort(data.tg_cap_nhat)}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default ThongTinToChucQuanTrongDetail;
