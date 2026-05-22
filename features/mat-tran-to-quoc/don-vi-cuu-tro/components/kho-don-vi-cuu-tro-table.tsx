import React, { useState, useCallback, useMemo, memo } from 'react';
import { Building2, User } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { KhoDonViCuuTroListRow, KhoDonViCuuTroLoai } from '../core/types';
import { useKhoDonViCuuTroStore } from '../store/useKhoDonViCuuTroStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { KhoDonViCuuTroTableRowActions } from './kho-don-vi-cuu-tro-table-row-actions';

interface Props {
  data: KhoDonViCuuTroListRow[];
  isLoading: boolean;
  onEdit: (item: KhoDonViCuuTroListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: KhoDonViCuuTroListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const KhoDonViCuuTroTable = memo(function KhoDonViCuuTroTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
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
  } = useKhoDonViCuuTroStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const loaiBadge = useMemo((): BadgeConfig<KhoDonViCuuTroLoai> => {
    return {
      to_chuc: { label: txt('matTranDonViCuuTro.loai.toChuc'), color: 'indigo' },
      ca_nhan: { label: txt('matTranDonViCuuTro.loai.caNhan'), color: 'amber' },
    };
  }, []);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      const columnSearchEl = (
        <ColumnHeaderSearch
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

      if (col.id === 'actions') return null;
      return (
        <ColumnHeaderSortMenu
          ariaLabel={col.label}
          sortColumnId={col.id}
          sort={sort}
          setSort={setSort}
          columnSearch={columnSearchEl}
          columnSearchActive={Boolean(cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: KhoDonViCuuTroListRow) => {
      switch (colId) {
        case 'tt':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap" title={String(item.tt)}>
              {item.tt}
            </span>
          );
        case 'loai':
          return <EnumBadge value={item.loai} config={loaiBadge} shape="pill" truncate />;
        case 'ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              {item.loai === 'ca_nhan' ? (
                <User size={14} className="shrink-0 text-primary/70" aria-hidden />
              ) : (
                <Building2 size={14} className="shrink-0 text-primary/70" aria-hidden />
              )}
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ten}</span>
            </div>
          );
        case 'dia_chi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.dia_chi ?? undefined}>
              {item.dia_chi ?? txt('common.emptyCell')}
            </span>
          );
        case 'dien_thoai':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.dien_thoai ?? undefined}>
              {item.dien_thoai ?? txt('common.emptyCell')}
            </span>
          );
        case 'email':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.email ?? undefined}>
              {item.email ?? txt('common.emptyCell')}
            </span>
          );
        case 'ghi_chu':
          return (
            <span className="text-body-sm text-muted-foreground truncate max-w-[min(360px,50vw)]" title={item.ghi_chu ?? undefined}>
              {item.ghi_chu ?? txt('common.emptyCell')}
            </span>
          );
        case 'tg_tao':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_tao ? formatDateTimeShort(item.tg_tao) : txt('common.emptyCell')}
            </span>
          );
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat ? formatDateTimeShort(item.tg_cap_nhat) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <KhoDonViCuuTroTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, loaiBadge],
  );

  const handleRowClick = useCallback(
    (item: KhoDonViCuuTroListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: KhoDonViCuuTroListRow, isSelected: boolean) => (
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
            {item.loai === 'ca_nhan' ? <User size={20} /> : <Building2 size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h4 className="font-semibold text-foreground truncate">{item.ten}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary shrink-0"
              />
            </div>
            <div className="mb-1">
              <EnumBadge value={item.loai} config={loaiBadge} shape="pill" truncate />
            </div>
            <p className="text-xs text-muted-foreground m-0 truncate">
              {[item.dien_thoai, item.email].filter(Boolean).join(' · ') || txt('common.emptyCell')}
            </p>
            {item.dia_chi ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 m-0">{item.dia_chi}</p>
            ) : null}
            <div className="flex justify-end pt-2 border-t border-border">
              <KhoDonViCuuTroTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, loaiBadge],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranDonViCuuTro.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('matTranDonViCuuTro.emptyHint')}
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
      stickyLeftCount={3}
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default KhoDonViCuuTroTable;
