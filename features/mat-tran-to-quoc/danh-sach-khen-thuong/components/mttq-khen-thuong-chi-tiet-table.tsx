import React, { useState, useCallback, useMemo, memo } from 'react';
import { Award, User } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqKhenThuongChiTietFlatRow } from '../core/types';
import { useMttqKhenThuongChiTietListStore } from '../store/useMttqKhenThuongChiTietListStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import {
  getKhenThuongDanhHieuBadgeConfig,
  getKhenThuongHinhThucBadgeConfig,
  getKhenThuongTrangThaiBadgeConfig,
} from '../utils/display-format';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqKhenThuongChiTietTableRowActions } from './mttq-khen-thuong-chi-tiet-table-row-actions';

export interface MttqKhenThuongChiTietHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqKhenThuongChiTietFlatRow[];
  isLoading: boolean;
  trangThaiHeaderOptions: MttqKhenThuongChiTietHeaderOption[];
  namKhenThuongHeaderOptions: MttqKhenThuongChiTietHeaderOption[];
  donViDeXuatHeaderOptions: MttqKhenThuongChiTietHeaderOption[];
  hinhThucHeaderOptions: MttqKhenThuongChiTietHeaderOption[];
  danhHieuHeaderOptions: MttqKhenThuongChiTietHeaderOption[];
  onViewQd: (idKhenThuong: string) => void;
  onEdit: (item: MttqKhenThuongChiTietFlatRow) => void;
  onDelete: (item: MttqKhenThuongChiTietFlatRow) => void;
}

const MttqKhenThuongChiTietTable = memo(function MttqKhenThuongChiTietTable({
  data,
  isLoading,
  trangThaiHeaderOptions,
  namKhenThuongHeaderOptions,
  donViDeXuatHeaderOptions,
  hinhThucHeaderOptions,
  danhHieuHeaderOptions,
  onViewQd,
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
  } = useMttqKhenThuongChiTietListStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const trangThaiBadgeConfig = useMemo(() => getKhenThuongTrangThaiBadgeConfig(), []);
  const hinhThucBadgeConfig = useMemo(() => getKhenThuongHinhThucBadgeConfig(), []);
  const danhHieuBadgeConfig = useMemo(() => getKhenThuongDanhHieuBadgeConfig(), []);

  const trangThaiMultiOptions: Option[] = useMemo(
    () =>
      trangThaiHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [trangThaiHeaderOptions],
  );

  const namMultiOptions: Option[] = useMemo(
    () =>
      namKhenThuongHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [namKhenThuongHeaderOptions],
  );

  const donViMultiOptions: Option[] = useMemo(
    () =>
      donViDeXuatHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [donViDeXuatHeaderOptions],
  );

  const hinhThucMultiOptions: Option[] = useMemo(
    () =>
      hinhThucHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [hinhThucHeaderOptions],
  );

  const danhHieuMultiOptions: Option[] = useMemo(
    () =>
      danhHieuHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [danhHieuHeaderOptions],
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
        case 'trang_thai':
          return (
            <ColumnHeaderFilter
              options={trangThaiMultiOptions}
              value={filters.trang_thai}
              onChange={(v) => setFilter('trang_thai', v)}
              ariaLabel={col.label}
              sortColumnId="trang_thai"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ngay_khen_thuong':
          return (
            <ColumnHeaderFilter
              options={namMultiOptions}
              value={filters.nam_khen_thuong}
              onChange={(v) => setFilter('nam_khen_thuong', v)}
              ariaLabel={col.label}
              sortColumnId="ngay_khen_thuong"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'don_vi_de_xuat':
          return (
            <ColumnHeaderFilter
              options={donViMultiOptions}
              value={filters.don_vi_de_xuat}
              onChange={(v) => setFilter('don_vi_de_xuat', v)}
              ariaLabel={col.label}
              sortColumnId="don_vi_de_xuat"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'hinh_thuc_khen':
          return (
            <ColumnHeaderFilter
              options={hinhThucMultiOptions}
              value={filters.hinh_thuc_khen}
              onChange={(v) => setFilter('hinh_thuc_khen', v)}
              ariaLabel={col.label}
              sortColumnId="hinh_thuc_khen"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'danh_hieu':
          return (
            <ColumnHeaderFilter
              options={danhHieuMultiOptions}
              value={filters.danh_hieu}
              onChange={(v) => setFilter('danh_hieu', v)}
              ariaLabel={col.label}
              sortColumnId="danh_hieu"
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
      filters.trang_thai,
      filters.nam_khen_thuong,
      filters.don_vi_de_xuat,
      filters.hinh_thuc_khen,
      filters.danh_hieu,
      setFilter,
      setSort,
      sort,
      trangThaiMultiOptions,
      namMultiOptions,
      donViMultiOptions,
      hinhThucMultiOptions,
      danhHieuMultiOptions,
    ],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqKhenThuongChiTietFlatRow) => {
      switch (colId) {
        case 'so_qd':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Award size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.so_qd}</span>
            </div>
          );
        case 'ngay_khen_thuong':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.ngay_khen_thuong ? formatDateShort(item.ngay_khen_thuong) : txt('common.emptyCell')}
            </span>
          );
        case 'don_vi_de_xuat':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.don_vi_de_xuat ?? undefined}>
              {item.don_vi_de_xuat ?? txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return <EnumBadge value={item.trang_thai} config={trangThaiBadgeConfig} truncate shape="pill" />;
        case 'ten_can_bo':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <User size={14} className="shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate text-body-sm text-foreground">{item.ten_can_bo ?? txt('common.emptyCell')}</span>
            </div>
          );
        case 'hinh_thuc_khen':
          return <EnumBadge value={item.hinh_thuc_khen} config={hinhThucBadgeConfig} truncate shape="pill" />;
        case 'danh_hieu':
          return <EnumBadge value={item.danh_hieu} config={danhHieuBadgeConfig} truncate shape="pill" />;
        case 'noi_dung_khen':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.noi_dung_khen ?? undefined}>
              {item.noi_dung_khen ?? txt('common.emptyCell')}
            </span>
          );
        case 'ho_so_khen':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ho_so_khen ?? undefined}>
              {item.ho_so_khen ?? txt('common.emptyCell')}
            </span>
          );
        case 'tg_cap_nhat_qd':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat_qd ? formatDateTimeShort(item.tg_cap_nhat_qd) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <MttqKhenThuongChiTietTableRowActions
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
    [rowMenuOpenId, trangThaiBadgeConfig, hinhThucBadgeConfig, danhHieuBadgeConfig, onEdit, onDelete],
  );

  const handleRowClick = useCallback(
    (item: MttqKhenThuongChiTietFlatRow) => {
      onViewQd(item.id_khen_thuong);
    },
    [onViewQd],
  );

  const renderMobileCard = useCallback(
    (item: MttqKhenThuongChiTietFlatRow, isSelected: boolean) => (
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
            <p className="text-xs text-muted-foreground truncate mb-1" title={item.so_qd}>
              {item.so_qd}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-2">
              <span className="tabular-nums shrink-0">
                {item.ngay_khen_thuong ? formatDateShort(item.ngay_khen_thuong) : txt('common.emptyCell')}
              </span>
              {item.trang_thai ? (
                <EnumBadge value={item.trang_thai} config={trangThaiBadgeConfig} shape="pill" truncate />
              ) : null}
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqKhenThuongChiTietTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, trangThaiBadgeConfig],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('matTranKhenThuong.chiTietList.emptyTitle')}
      emptyDescription={txt('matTranKhenThuong.chiTietList.emptyHint')}
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

export default MttqKhenThuongChiTietTable;
