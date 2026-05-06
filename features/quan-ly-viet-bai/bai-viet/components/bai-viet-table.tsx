import React, { useState, useCallback, memo } from 'react';
import { FileText, Link2 } from 'lucide-react';
import { txt } from '@/lib/text';
import type { BaiVietDanhSach } from '../core/types';
import { useBaiVietDanhSachStore } from '../store/useBaiVietDanhSachStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatCurrency, formatDateShort } from '@/lib/utils';
import { BaiVietTableRowActions } from './bai-viet-table-row-actions';

interface Props {
  data: BaiVietDanhSach[];
  isLoading: boolean;
  onEdit: (item: BaiVietDanhSach) => void;
  onDelete: (id: string) => void;
  onView?: (item: BaiVietDanhSach) => void;
}

const BaiVietTable = memo(function BaiVietTable({ data, isLoading, onEdit, onDelete, onView }: Props) {
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
  } = useBaiVietDanhSachStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderCell = useCallback(
    (colId: string, item: BaiVietDanhSach) => {
      switch (colId) {
        case 'ten_bai':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <FileText size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ten_bai}</span>
            </div>
          );
        case 'ten_the_loai':
          return <span className="text-body-sm text-foreground">{item.ten_the_loai ?? txt('common.emptyCell')}</span>;
        case 'don_gia':
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground">{formatCurrency(item.don_gia)}</span>
          );
        case 'ngay_dang':
          return <span className="text-body-sm text-muted-foreground">{formatDateShort(item.ngay_dang)}</span>;
        case 'ten_nguon_dang':
          return <span className="text-body-sm truncate">{item.ten_nguon_dang ?? txt('common.emptyCell')}</span>;
        case 'ten_trang_dang':
          return <span className="text-body-sm truncate">{item.ten_trang_dang ?? txt('common.emptyCell')}</span>;
        case 'link':
          return (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[240px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Link2 size={12} className="shrink-0" aria-hidden />
              <span className="truncate">{item.link}</span>
            </a>
          );
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
            <BaiVietTableRowActions
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
    (item: BaiVietDanhSach) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: BaiVietDanhSach, isSelected: boolean) => (
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
            <FileText size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_bai}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground mb-2 truncate">
              {item.ten_the_loai} · {formatDateShort(item.ngay_dang)}
            </p>
            <p className="text-xs text-muted-foreground truncate mb-3">{item.link}</p>
            <div className="flex justify-end pt-2 border-t border-border">
              <BaiVietTableRowActions
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
      emptyTitle={txt('articleList.emptyTitle')}
      emptyDescription={txt('articleList.emptyHint')}
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
    />
  );
});

export default BaiVietTable;
