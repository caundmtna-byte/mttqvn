import React, { useState, useCallback, useMemo, memo } from 'react';
import { GraduationCap } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqLopTapHuanListRow } from '../core/types';
import { useMttqLopTapHuanStore } from '../store/useMttqLopTapHuanStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateTimeShort } from '@/lib/utils';
import { getTapHuanCapBadgeConfig } from '../utils/display-format';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqLopTapHuanTableRowActions } from './mttq-tap-huan-table-row-actions';

export interface MttqLopTapHuanHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqLopTapHuanListRow[];
  isLoading: boolean;
  capHeaderOptions: MttqLopTapHuanHeaderOption[];
  namHeaderOptions: MttqLopTapHuanHeaderOption[];
  onEdit: (item: MttqLopTapHuanListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: MttqLopTapHuanListRow) => void;
}

const MttqLopTapHuanTable = memo(function MttqLopTapHuanTable({
  data,
  isLoading,
  capHeaderOptions,
  namHeaderOptions,
  onEdit,
  onDelete,
  onView,
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
  } = useMttqLopTapHuanStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const capBadgeConfig = useMemo(() => getTapHuanCapBadgeConfig(), []);

  const capMultiOptions: Option[] = useMemo(
    () =>
      capHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [capHeaderOptions],
  );

  const namMultiOptions: Option[] = useMemo(
    () =>
      namHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [namHeaderOptions],
  );

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

      switch (col.id) {
        case 'cap_tap_huan':
          return (
            <ColumnHeaderFilter
              options={capMultiOptions}
              value={filters.cap_tap_huan}
              onChange={(v) => setFilter('cap_tap_huan', v)}
              ariaLabel={col.label}
              sortColumnId="cap_tap_huan"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'nam_tap_huan':
          return (
            <ColumnHeaderFilter
              options={namMultiOptions}
              value={filters.nam_tap_huan}
              onChange={(v) => setFilter('nam_tap_huan', v)}
              ariaLabel={col.label}
              sortColumnId="nam_tap_huan"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'actions':
          return null;
        default:
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
      }
    },
    [
      filters.columnSearch,
      filters.cap_tap_huan,
      filters.nam_tap_huan,
      setFilter,
      setSort,
      sort,
      capMultiOptions,
      namMultiOptions,
    ],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqLopTapHuanListRow) => {
      switch (colId) {
        case 'ten_lop_tap_huan':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ten_lop_tap_huan}
              </span>
            </div>
          );
        case 'nam_tap_huan':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.nam_tap_huan ? String(item.nam_tap_huan) : txt('common.emptyCell')}
            </span>
          );
        case 'cap_tap_huan':
          return (
            <EnumBadge value={item.cap_tap_huan} config={capBadgeConfig} truncate shape="pill" />
          );
        case 'so_dong':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {String(item.so_dong)}
            </span>
          );
        case 'ho_va_ten_nguoi_tao':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.ho_va_ten_nguoi_tao ?? undefined}
            >
              {item.ho_va_ten_nguoi_tao ?? txt('common.emptyCell')}
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
            <MttqLopTapHuanTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, capBadgeConfig],
  );

  const handleRowClick = useCallback(
    (item: MttqLopTapHuanListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: MttqLopTapHuanListRow, isSelected: boolean) => (
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
            <GraduationCap size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_lop_tap_huan}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-2">
              {item.nam_tap_huan ? (
                <span className="tabular-nums shrink-0">{item.nam_tap_huan}</span>
              ) : null}
              {item.cap_tap_huan ? (
                <EnumBadge value={item.cap_tap_huan} config={capBadgeConfig} shape="pill" truncate />
              ) : null}
              {item.so_dong != null ? (
                <span className="tabular-nums shrink-0">· {item.so_dong} người</span>
              ) : null}
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqLopTapHuanTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, capBadgeConfig],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('matTranTapHuan.emptyTitle')}
      emptyDescription={txt('matTranTapHuan.emptyHint')}
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

export default MttqLopTapHuanTable;
