import React, { useState, useCallback, useMemo, memo } from 'react';
import { GraduationCap, User } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqTapHuanChiTietFlatRow } from '../core/types';
import { useMttqTapHuanChiTietListStore } from '../store/useMttqTapHuanChiTietListStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateTimeShort } from '@/lib/utils';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import {
  formatLopTenDonViDisplay,
  getTapHuanCapBadgeConfig,
  getTapHuanThuocDienBadgeConfig,
} from '../utils/display-format';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqTapHuanChiTietTableRowActions } from './mttq-tap-huan-chi-tiet-table-row-actions';

export interface MttqTapHuanChiTietHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqTapHuanChiTietFlatRow[];
  isLoading: boolean;
  capHeaderOptions: MttqTapHuanChiTietHeaderOption[];
  namHeaderOptions: MttqTapHuanChiTietHeaderOption[];
  /** Click dòng / thẻ mobile: mở chi tiết lớp (giống tab lớp). */
  onViewLop: (idLop: string) => void;
  onEdit: (item: MttqTapHuanChiTietFlatRow) => void;
  onDelete: (item: MttqTapHuanChiTietFlatRow) => void;
}

const MttqTapHuanChiTietTable = memo(function MttqTapHuanChiTietTable({
  data,
  isLoading,
  capHeaderOptions,
  namHeaderOptions,
  onViewLop,
  onEdit,
  onDelete,
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
  } = useMttqTapHuanChiTietListStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const capBadgeConfig = useMemo(() => getTapHuanCapBadgeConfig(), []);
  const thuocDienBadgeConfig = useMemo(() => getTapHuanThuocDienBadgeConfig(), []);

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
    (colId: string, item: MttqTapHuanChiTietFlatRow) => {
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
        case 'ten_don_vi_lop': {
          const donViLopLabel = formatLopTenDonViDisplay(item.ten_don_vi_lop);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={donViLopLabel}>
              {donViLopLabel}
            </span>
          );
        }
        case 'ten_can_bo':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <User size={14} className="shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-body-sm text-foreground">{item.ten_can_bo ?? txt('common.emptyCell')}</span>
            </div>
          );
        case 'ten_to_chuc':
        case 'ten_phong_ban':
        case 'chuc_vu':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={String(item[colId] ?? '')}
            >
              {(item[colId] as string | null) ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_don_vi_can_bo': {
          const ec = txt('common.emptyCell');
          const d = formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi_can_bo);
          if (item.chuc_vu_cap_quan_ly === 'Tỉnh') {
            return (
              <span className="text-body-sm text-muted-foreground tabular-nums truncate" title={d}>
                {d}
              </span>
            );
          }
          if (d === ec) {
            return <span className="text-body-sm text-muted-foreground italic">{ec}</span>;
          }
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={d}>
              {d}
            </span>
          );
        }
        case 'thuoc_dien':
          return (
            <EnumBadge value={item.thuoc_dien} config={thuocDienBadgeConfig} truncate shape="pill" />
          );
        case 'tg_cap_nhat_lop':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat_lop ? formatDateTimeShort(item.tg_cap_nhat_lop) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <MttqTapHuanChiTietTableRowActions
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
    [rowMenuOpenId, capBadgeConfig, thuocDienBadgeConfig, onEdit, onDelete],
  );

  const handleRowClick = useCallback(
    (item: MttqTapHuanChiTietFlatRow) => {
      onViewLop(item.id_lop_tap_huan);
    },
    [onViewLop],
  );

  const renderMobileCard = useCallback(
    (item: MttqTapHuanChiTietFlatRow, isSelected: boolean) => (
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
            <User size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h4 className="font-semibold text-foreground truncate">{item.ten_can_bo ?? txt('common.emptyCell')}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary shrink-0"
              />
            </div>
            <p className="text-xs text-muted-foreground truncate mb-1" title={item.ten_lop_tap_huan}>
              {item.ten_lop_tap_huan}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-2">
              {item.nam_tap_huan ? (
                <span className="tabular-nums shrink-0">{item.nam_tap_huan}</span>
              ) : null}
              {item.cap_tap_huan ? (
                <EnumBadge value={item.cap_tap_huan} config={capBadgeConfig} shape="pill" truncate />
              ) : null}
              <span
                className="truncate max-w-[12rem]"
                title={formatLopTenDonViDisplay(item.ten_don_vi_lop)}
              >
                · {formatLopTenDonViDisplay(item.ten_don_vi_lop)}
              </span>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqTapHuanChiTietTableRowActions
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
    [handleRowClick, rowMenuOpenId, toggleSelection, capBadgeConfig, onEdit, onDelete],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('matTranTapHuan.chiTietList.emptyTitle')}
      emptyDescription={txt('matTranTapHuan.chiTietList.emptyHint')}
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

export default MttqTapHuanChiTietTable;
