import React, { useCallback, useMemo, useState, memo } from 'react';
import { Tags, Banknote } from 'lucide-react';
import { txt } from '@/lib/text';
import GenericTable from '@/components/shared/GenericTable';
import type { ColumnConfig } from '@/store/createGenericStore';
import { useArticleTheLoaiStore } from '../store/useArticleTheLoaiStore';
import type { BaiVietTheLoai } from '../core/types';
import { ArticleTheLoaiRowActions } from './article-the-loai-row-actions';
import { EmployeeColumnHeaderSortMenu } from '../../../he-thong/nhan-vien/components/EmployeeColumnHeaderSortMenu';
import { EmployeeColumnHeaderSearch } from '../../../he-thong/nhan-vien/components/EmployeeColumnHeaderSearch';
import { formatDateShort } from '@/lib/utils';

function formatVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface Props {
  data: BaiVietTheLoai[];
  isLoading: boolean;
  onRowClick: (item: BaiVietTheLoai) => void;
  onEdit: (item: BaiVietTheLoai) => void;
  onDelete: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ArticleTheLoaiTable = memo(function ArticleTheLoaiTable({
  data,
  isLoading,
  onRowClick,
  onEdit,
  onDelete,
  emptyTitle,
  emptyDescription,
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
    filters,
    setFilter,
  } = useArticleTheLoaiStore();

  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      const colSearchActive = Boolean(cs[col.id]?.trim());
      const columnSearchEl = (
        <EmployeeColumnHeaderSearch
          variant="inDropdown"
          value={cs[col.id] ?? ''}
          onChange={(v) =>
            setFilter('columnSearch', {
              ...cs,
              [col.id]: v,
            })
          }
          ariaLabel={`${col.label} — ${txt('common.search')}`}
        />
      );
      return (
        <EmployeeColumnHeaderSortMenu
          ariaLabel={col.label}
          sortColumnId={col.id}
          sort={sort}
          setSort={setSort}
          columnSearch={columnSearchEl}
          columnSearchActive={colSearchActive}
        />
      );
    },
    [filters.columnSearch, setFilter, sort, setSort],
  );

  const renderCell = useCallback(
    (colId: string, item: BaiVietTheLoai) => {
      switch (colId) {
        case 'ten_the_loai':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Tags size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ten_the_loai}</span>
            </div>
          );
        case 'mo_ta':
          return (
            <div className="truncate max-w-[240px] text-body-sm text-muted-foreground" title={item.mo_ta ?? ''}>
              {item.mo_ta ?? <span className="text-muted-foreground">—</span>}
            </div>
          );
        case 'don_gia':
          return (
            <span className="inline-flex items-center gap-1 text-sm font-medium tabular-nums">
              <Banknote size={12} className="text-muted-foreground shrink-0" aria-hidden />
              {formatVnd(item.don_gia)}
            </span>
          );
        case 'tg_tao':
          return <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(item.tg_tao)}</span>;
        case 'tg_cap_nhat':
          return <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(item.tg_cap_nhat)}</span>;
        case 'actions':
          return (
            <ArticleTheLoaiRowActions
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
    (item: BaiVietTheLoai) => {
      onRowClick(item);
    },
    [onRowClick],
  );

  const renderMobileCard = useCallback(
    (item: BaiVietTheLoai, isSelected: boolean) => (
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
        className={`bg-card rounded-xl border p-4 shadow-sm transition-all ${isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'}`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Tags size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h4 className="font-semibold text-foreground truncate">{item.ten_the_loai}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary shrink-0"
              />
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.mo_ta ?? '—'}</p>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm font-medium tabular-nums text-foreground">{formatVnd(item.don_gia)}</span>
              <ArticleTheLoaiRowActions
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
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
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
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default ArticleTheLoaiTable;
