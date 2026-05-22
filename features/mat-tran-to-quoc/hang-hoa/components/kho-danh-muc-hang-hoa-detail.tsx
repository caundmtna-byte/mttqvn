import React, { useMemo, useState } from 'react';
import { Calendar, Edit, FileText, FolderOpen, ListOrdered, Package, Plus, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import EmptyState from '@/components/shared/EmptyState';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import type { KhoDanhMucHangHoaDetail, KhoDanhSachHangHoaListRow } from '../core/types';
import { KhoDanhSachHangHoaTableRowActions } from './kho-danh-sach-hang-hoa-table-row-actions';

interface Props {
  data: KhoDanhMucHangHoaDetail;
  hangHoaRows: KhoDanhSachHangHoaListRow[];
  hangHoaLoading?: boolean;
  onClose: () => void;
  onEdit: (item: KhoDanhMucHangHoaDetail) => void;
  onDelete: (id: string) => void;
  onAddHangHoa: (danhMuc: KhoDanhMucHangHoaDetail) => void;
  onEditHangHoa: (row: KhoDanhSachHangHoaListRow) => void;
  onDeleteHangHoa: (id: string) => void;
  onViewHangHoa?: (row: KhoDanhSachHangHoaListRow) => void;
}

const KhoDanhMucHangHoaDetailDrawer: React.FC<Props> = ({
  data,
  hangHoaRows,
  hangHoaLoading = false,
  onClose,
  onEdit,
  onDelete,
  onAddHangHoa,
  onEditHangHoa,
  onDeleteHangHoa,
  onViewHangHoa,
}) => {
  const { canEdit, canDelete, canCreate } = useResourcePermissions('matTranReliefGoods');
  const [childMenuOpenId, setChildMenuOpenId] = useState<string | null>(null);

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

  const hangHoaChildren = useMemo(
    () =>
      hangHoaRows
        .filter((r) => r.id_danh_muc === data.id)
        .sort((a, b) => a.thu_tu - b.thu_tu || a.ten_hang_hoa.localeCompare(b.ten_hang_hoa, 'vi')),
    [hangHoaRows, data.id],
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
      title={txt('matTranHangHoa.detailDanhMuc.title')}
      subtitle={`#${data.id}`}
      icon={<FolderOpen size={18} />}
      onClose={onClose}
      footer={renderFooter}
      footerCompact
      maxWidthClass={DRAWER_WIDTH_DETAIL}
    >
      <div className="space-y-5">
        <DetailSummaryCard
          leading={
            <DetailSummaryIconTile>
              <FolderOpen size={26} className="text-white" />
            </DetailSummaryIconTile>
          }
          title={data.ten_danh_muc}
          badge={<EnumBadge value={data.trang_thai} config={trangThaiBadge} shape="pill" truncate />}
        />

        <DetailSection title={txt('matTranHangHoa.detailDanhMuc.section')} icon={<FolderOpen size={14} />}>
          <DetailFieldGrid>
            <DetailField label={txt('matTranHangHoa.store.thuTu')} value={String(data.thu_tu)} icon={<ListOrdered size={12} />} />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranHangHoa.store.moTa')}
              value={data.mo_ta}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection
          title={txt('matTranHangHoa.detailDanhMuc.sectionHangHoa')}
          icon={<Package size={14} />}
          variant="primary"
          headerRight={
            canCreate ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onAddHangHoa(data)}
                className="h-8 shrink-0 bg-primary px-3 text-white shadow-sm hover:bg-primary/90"
              >
                <Plus size={14} className="mr-1.5" />
                {txt('common.create')}
              </Button>
            ) : null
          }
        >
          {hangHoaLoading ? (
            <div className="flex justify-center py-8 text-sm text-muted-foreground">{txt('common.loadingData')}</div>
          ) : hangHoaChildren.length === 0 ? (
            <EmptyState
              title={txt('matTranHangHoa.detailDanhMuc.noHangHoa')}
              description={txt('matTranHangHoa.detailDanhMuc.noHangHoaHint')}
              icon={<Package className="h-10 w-10 text-muted-foreground" />}
              action={
                canCreate ? (
                  <Button type="button" size="sm" onClick={() => onAddHangHoa(data)} className="bg-primary text-white hover:bg-primary/90">
                    <Plus size={14} className="mr-2" />
                    {txt('common.create')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmbeddedChildDataGrid<KhoDanhSachHangHoaListRow>
              containerClassName="border-0 shadow-none"
              rows={hangHoaChildren}
              getRowKey={(row) => row.id}
              onRowClick={onViewHangHoa}
              labelColumn={{
                header: txt('matTranHangHoa.store.tenHangHoa'),
                minWidthClass: 'min-w-[160px]',
                renderCell: (row) => (
                  <span className="font-medium text-foreground text-sm truncate">{row.ten_hang_hoa}</span>
                ),
              }}
              columns={[
                {
                  id: 'don_vi_tinh',
                  header: txt('matTranHangHoa.store.donViTinh'),
                  headerClassName: 'max-w-[100px]',
                  cellClassName: 'max-w-[100px]',
                  renderCell: (row) => <span className="text-xs tabular-nums text-muted-foreground">{row.don_vi_tinh}</span>,
                },
                {
                  id: 'quy_cach',
                  header: txt('matTranHangHoa.store.quyCach'),
                  headerClassName: 'max-w-[140px]',
                  cellClassName: 'max-w-[140px]',
                  renderCell: (row) => (
                    <span className="line-clamp-2 text-xs text-muted-foreground" title={row.quy_cach ?? undefined}>
                      {row.quy_cach ?? '—'}
                    </span>
                  ),
                },
                {
                  id: 'thu_tu',
                  header: txt('matTranHangHoa.store.thuTu'),
                  renderCell: (row) => (
                    <span className="text-xs tabular-nums text-muted-foreground flex items-center gap-1">
                      <ListOrdered size={12} aria-hidden />
                      {row.thu_tu}
                    </span>
                  ),
                },
                {
                  id: 'trang_thai',
                  header: txt('matTranHangHoa.store.trangThai'),
                  renderCell: (row) => <EnumBadge value={row.trang_thai} config={trangThaiBadge} shape="pill" truncate />,
                },
              ]}
              actionsColumn={{
                header: txt('common.actions'),
                widthClass: 'w-[92px] min-w-[92px]',
                renderCell: (row) => (
                  <KhoDanhSachHangHoaTableRowActions
                    compact
                    item={row}
                    menuOpenId={childMenuOpenId}
                    onMenuOpenChange={setChildMenuOpenId}
                    onEdit={onEditHangHoa}
                    onDelete={onDeleteHangHoa}
                  />
                ),
              }}
            />
          )}
        </DetailSection>

        <DetailSection title={txt('matTranHangHoa.detailDanhMuc.system')} icon={<FolderOpen size={14} />} variant="muted">
          <DetailFieldGrid>
            <DetailField label={txt('matTranHangHoa.store.tgTao')} value={formatDateTimeShort(data.tg_tao)} icon={<Calendar size={12} />} />
            <DetailField
              label={txt('matTranHangHoa.store.tgCapNhat')}
              value={formatDateTimeShort(data.tg_cap_nhat)}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default KhoDanhMucHangHoaDetailDrawer;
