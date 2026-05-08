import React, { useState, useCallback, memo } from 'react';
import { ListTodo } from 'lucide-react';
import { txt } from '@/lib/text';
import type { CongViecDanhSachRow } from '../core/types';
import { useCongViecDanhSachStore } from '../store/useCongViecDanhSachStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateShort } from '@/lib/utils';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatCongViecTienDoTheoHan } from '../utils/deadline-progress';
import {
  CONG_VIEC_MUC_DO_BADGE_CONFIG,
  CONG_VIEC_TRANG_THAI_BADGE_CONFIG,
  congViecDeadlineChipClass,
  congViecThoiHanChipTone,
  congViecTienDoChipTone,
} from '../core/display-badges';
import { CongViecTableRowActions } from './cong-viec-table-row-actions';

interface Props {
  data: CongViecDanhSachRow[];
  isLoading: boolean;
  onEdit: (item: CongViecDanhSachRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: CongViecDanhSachRow) => void;
  serverSidePagination?: boolean;
  serverTotalRecords?: number | null;
  serverHasNextPage?: boolean;
}

const CongViecTable = memo(function CongViecTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
  serverSidePagination,
  serverTotalRecords,
  serverHasNextPage,
}: Props) {
  const {
    columns,
    pagination,
    setPage,
    setPageSize,
    selectedIds,
    toggleSelection,
    toggleAllSelection,
    sort,
    setSort,
    resizeColumn,
  } = useCongViecDanhSachStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderCell = useCallback(
    (colId: string, item: CongViecDanhSachRow) => {
      switch (colId) {
        case 'ten_cong_viec':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <ListTodo size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ten_cong_viec}</span>
            </div>
          );
        case 'ten_chuong_trinh':
          return (
            <span className="text-body-sm text-muted-foreground truncate">
              {item.ten_chuong_trinh?.trim() ? item.ten_chuong_trinh : txt('common.emptyCell')}
            </span>
          );
        case 'muc_do':
          return (
            <EnumBadge
              value={item.muc_do}
              config={CONG_VIEC_MUC_DO_BADGE_CONFIG}
              shape="rounded"
              truncate
              className="text-[11px] leading-tight"
            />
          );
        case 'thoi_han':
          if (!item.thoi_han) {
            return <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>;
          }
          return (
            <span
              className={congViecDeadlineChipClass(congViecThoiHanChipTone(item.thoi_han, item.trang_thai))}
              title={formatDateShort(item.thoi_han)}
            >
              {formatDateShort(item.thoi_han)}
            </span>
          );
        case 'tien_do': {
          const label = formatCongViecTienDoTheoHan(item.thoi_han, item.trang_thai);
          const tone = congViecTienDoChipTone(item.thoi_han, item.trang_thai);
          return (
            <span className={congViecDeadlineChipClass(tone)} title={label}>
              <span className="truncate">{label}</span>
            </span>
          );
        }
        case 'trang_thai':
          return (
            <EnumBadge
              value={item.trang_thai}
              config={CONG_VIEC_TRANG_THAI_BADGE_CONFIG}
              truncate
              className="text-[11px] leading-tight"
            />
          );
        case 'ho_va_ten_trach_nhiem':
          return (
            <span className="text-body-sm text-muted-foreground truncate">
              {item.ho_va_ten_trach_nhiem ?? item.ten_tai_khoan_trach_nhiem ?? txt('common.emptyCell')}
            </span>
          );
        case 'ho_tro_display':
          return <span className="text-body-sm text-muted-foreground truncate">{item.ho_tro_display || txt('common.emptyCell')}</span>;
        case 'ho_va_ten_nguoi_tao':
          return (
            <span className="text-body-sm text-muted-foreground truncate">
              {item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? txt('common.emptyCell')}
            </span>
          );
        case 'tg_cap_nhat':
          return <span className="text-xs text-muted-foreground">{formatDateShort(item.tg_cap_nhat)}</span>;
        case 'actions':
          return (
            <CongViecTableRowActions
              item={item}
              menuOpenId={rowMenuOpenId}
              onMenuOpenChange={setRowMenuOpenId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        default:
          return null;
      }
    },
    [onEdit, onDelete, rowMenuOpenId],
  );

  const handleRowClick = useCallback(
    (item: CongViecDanhSachRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: CongViecDanhSachRow, isSelected: boolean) => (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          handleRowClick(item);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleRowClick(item);
          }
        }}
        className={`bg-card rounded-xl border p-4 shadow-sm transition-all ${
          isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <ListTodo size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_cong_viec}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <EnumBadge
                value={item.trang_thai}
                config={CONG_VIEC_TRANG_THAI_BADGE_CONFIG}
                truncate
                className="text-[10px] leading-tight"
              />
              <EnumBadge
                value={item.muc_do}
                config={CONG_VIEC_MUC_DO_BADGE_CONFIG}
                shape="rounded"
                truncate
                className="text-[10px] leading-tight"
              />
              {item.thoi_han ? (
                <span
                  className={congViecDeadlineChipClass(congViecThoiHanChipTone(item.thoi_han, item.trang_thai), 'text-[10px]')}
                >
                  {formatDateShort(item.thoi_han)}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs">
              <span className="text-muted-foreground shrink-0">{txt('taskList.store.tienDoCol')}:</span>
              <span className={congViecDeadlineChipClass(congViecTienDoChipTone(item.thoi_han, item.trang_thai), 'text-[10px]')}>
                {formatCongViecTienDoTheoHan(item.thoi_han, item.trang_thai)}
              </span>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <CongViecTableRowActions
                compact
                item={item}
                menuOpenId={rowMenuOpenId}
                onMenuOpenChange={setRowMenuOpenId}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('taskList.emptyTitle')}
      emptyDescription={txt('taskList.emptyHint')}
      selectedIds={selectedIds}
      onToggleSelection={toggleSelection}
      onToggleAll={toggleAllSelection}
      page={pagination.page}
      pageSize={pagination.pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      sort={sort}
      onSort={setSort}
      renderCell={renderCell}
      renderMobileCard={renderMobileCard}
      onRowClick={handleRowClick}
      keyExtractor={(item) => item.id}
      onResizeColumn={resizeColumn}
      stickyLeftCount={2}
      serverSidePagination={serverSidePagination}
      serverTotalRecords={serverTotalRecords ?? undefined}
      serverHasNextPage={serverHasNextPage}
    />
  );
});

export default CongViecTable;
