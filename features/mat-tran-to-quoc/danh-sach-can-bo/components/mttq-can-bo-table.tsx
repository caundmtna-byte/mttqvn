import React, { useState, useCallback, useMemo, memo } from 'react';
import { Users } from 'lucide-react';
import EnumBadge from '@/components/ui/EnumBadge';
import { capQuanLyBadgeConfig, normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { MttqCanBoRow } from '../core/types';
import { useMttqCanBoStore } from '../store/useMttqCanBoStore';
import GenericTable from '@/components/shared/GenericTable';
import { MobileListCard } from '@/components/shared/MobileListCard';
import { cn } from '@/lib/utils';
import {
  formatCanBoListDate,
  formatCanBoListDateTime,
  formatCanBoPhoneDisplay,
} from '../utils/display-format';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import { MttqCanBoTableRowActions } from './mttq-can-bo-table-row-actions';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import type { MttqCanBoToolbarChipOptions } from './mttq-can-bo-toolbar';
import { normalizeMttqCanBoFilters } from '../utils/mttq-can-bo-filters-normalize';

interface Props {
  data: MttqCanBoRow[];
  isLoading: boolean;
  onEdit: (item: MttqCanBoRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: MttqCanBoRow) => void;
  /** Đồng bộ chip toolbar + header cột. */
  chipOptions: MttqCanBoToolbarChipOptions;
}

const MttqCanBoTable = memo(function MttqCanBoTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
  chipOptions,
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
  } = useMttqCanBoStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const capQuanLyBadgeCfg = useMemo(
    () => capQuanLyBadgeConfig('Tỉnh', 'Xã phường'),
    [],
  );

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const f = normalizeMttqCanBoFilters(filters);
      const cs = f.columnSearch;
      const colSearchActive = Boolean(cs[col.id]?.trim());
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
        case 'ten_trang_thai':
          return (
            <ColumnHeaderFilter
              options={chipOptions.trangThai}
              value={f.trang_thai_id}
              onChange={(v) => setFilter('trang_thai_id', v)}
              ariaLabel={txt('matTranCanBo.store.trangThaiCol')}
              sortColumnId="ten_trang_thai"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'gioi_tinh':
          return (
            <ColumnHeaderFilter
              options={chipOptions.gioiTinh}
              value={f.gioi_tinh}
              onChange={(v) => setFilter('gioi_tinh', v)}
              ariaLabel={txt('matTranCanBo.store.gioiTinhCol')}
              sortColumnId="gioi_tinh"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_to_chuc':
          return (
            <ColumnHeaderFilter
              options={chipOptions.toChuc}
              value={f.to_chuc_id}
              onChange={(v) => setFilter('to_chuc_id', v)}
              ariaLabel={txt('matTranCanBo.store.toChucCol')}
              sortColumnId="ten_to_chuc"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_phong_ban':
          return (
            <ColumnHeaderFilter
              options={chipOptions.phongBan}
              value={f.phong_ban_id}
              onChange={(v) => setFilter('phong_ban_id', v)}
              ariaLabel={txt('matTranCanBo.store.phongBanCol')}
              sortColumnId="ten_phong_ban"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_chuc_vu':
          return (
            <ColumnHeaderFilter
              options={chipOptions.chucVu}
              value={f.chuc_vu_id}
              onChange={(v) => setFilter('chuc_vu_id', v)}
              ariaLabel={txt('matTranCanBo.store.chucVuCol')}
              sortColumnId="ten_chuc_vu"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'chuc_vu_cap_quan_ly':
          return (
            <ColumnHeaderFilter
              options={chipOptions.capQuanLy}
              value={f.chuc_vu_cap_quan_ly}
              onChange={(v) => setFilter('chuc_vu_cap_quan_ly', v)}
              ariaLabel={txt('matTranCanBo.store.capQuanLyCol')}
              sortColumnId="chuc_vu_cap_quan_ly"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_don_vi':
          return (
            <ColumnHeaderFilter
              options={chipOptions.donVi}
              value={f.don_vi_id}
              onChange={(v) => setFilter('don_vi_id', v)}
              ariaLabel={txt('matTranCanBo.store.donViCol')}
              sortColumnId="ten_don_vi"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_dan_toc':
          return (
            <ColumnHeaderFilter
              options={chipOptions.danToc}
              value={f.dan_toc_id}
              onChange={(v) => setFilter('dan_toc_id', v)}
              ariaLabel={txt('matTranCanBo.form.danToc')}
              sortColumnId="ten_dan_toc"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_trinh_do':
          return (
            <ColumnHeaderFilter
              options={chipOptions.trinhDo}
              value={f.trinh_do_id}
              onChange={(v) => setFilter('trinh_do_id', v)}
              ariaLabel={txt('matTranCanBo.form.trinhDo')}
              sortColumnId="ten_trinh_do"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_ly_luan_chinh_tri':
          return (
            <ColumnHeaderFilter
              options={chipOptions.lyLuan}
              value={f.ly_luan_chinh_tri_id}
              onChange={(v) => setFilter('ly_luan_chinh_tri_id', v)}
              ariaLabel={txt('matTranCanBo.form.lyLuanChinhTri')}
              sortColumnId="ten_ly_luan_chinh_tri"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'dang_vien':
          return (
            <ColumnHeaderFilter
              options={chipOptions.dangVien}
              value={f.dang_vien}
              onChange={(v) => setFilter('dang_vien', v)}
              ariaLabel={txt('matTranCanBo.store.dangVienCol')}
              sortColumnId="dang_vien"
              sort={sort}
              setSort={setSort}
            />
          );
        default:
          return (
            <ColumnHeaderSortMenu
              ariaLabel={col.label}
              sortColumnId={col.id}
              sort={sort}
              setSort={setSort}
              columnSearch={columnSearchEl}
              columnSearchActive={colSearchActive}
            />
          );
      }
    },
    [filters, setFilter, sort, setSort, chipOptions],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqCanBoRow) => {
      const ec = txt('common.emptyCell');
      const pill = 'inline-flex max-w-full min-w-0 items-center truncate rounded-md border px-2 py-0.5 text-xs font-medium';
      switch (colId) {
        case 'ho_ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Users size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ho_ten}</span>
            </div>
          );
        case 'ngay_sinh':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {formatCanBoListDate(item.ngay_sinh, ec)}
            </span>
          );
        case 'tuoi':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.tuoi != null ? txt('matTranCanBo.display.ageYears', { years: String(item.tuoi) }) : ec}
            </span>
          );
        case 'gioi_tinh':
          return (
            <span
              className={cn(
                pill,
                'border-border/80 bg-muted/40 text-foreground',
              )}
            >
              {item.gioi_tinh}
            </span>
          );
        case 'ten_trang_thai':
          return (
            <span
              className={cn(
                pill,
                'border-primary/25 bg-primary/10 text-primary',
              )}
              title={item.ten_trang_thai ?? undefined}
            >
              {(item.ten_trang_thai ?? '').trim() || ec}
            </span>
          );
        case 'ten_to_chuc':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_to_chuc ?? undefined}>
              {item.ten_to_chuc ?? ec}
            </span>
          );
        case 'ten_phong_ban': {
          const sub = (item.ten_bo_phan ?? '').trim();
          const parent = (item.ten_phong_ban ?? '').trim();
          const label = sub && parent ? `${parent} · ${sub}` : parent || sub || ec;
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'ten_dan_toc':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_dan_toc ?? undefined}>
              {(item.ten_dan_toc ?? '').trim() || ec}
            </span>
          );
        case 'ten_trinh_do':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_trinh_do ?? undefined}>
              {(item.ten_trinh_do ?? '').trim() || ec}
            </span>
          );
        case 'ten_ly_luan_chinh_tri':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.ten_ly_luan_chinh_tri ?? undefined}
            >
              {(item.ten_ly_luan_chinh_tri ?? '').trim() || ec}
            </span>
          );
        case 'ten_chuc_vu':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_chuc_vu ?? undefined}>
              {item.ten_chuc_vu ?? ec}
            </span>
          );
        case 'chuc_vu_cap_quan_ly': {
          const cap = normalizeCapQuanLyInput(item.chuc_vu_cap_quan_ly);
          if (!cap) {
            return (
              <span className="text-body-sm text-muted-foreground italic" title={item.chuc_vu_cap_quan_ly ?? undefined}>
                {ec}
              </span>
            );
          }
          return <EnumBadge value={cap} config={capQuanLyBadgeCfg} shape="pill" truncate />;
        }
        case 'dien_thoai': {
          const p = formatCanBoPhoneDisplay(item.dien_thoai);
          return (
            <span className="truncate font-mono text-body-sm tabular-nums text-muted-foreground" title={p || undefined}>
              {p || ec}
            </span>
          );
        }
        case 'dang_vien':
          return (
            <span
              className={cn(
                pill,
                item.dang_vien
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-border/80 bg-muted/30 text-muted-foreground',
              )}
            >
              {item.dang_vien ? txt('matTranCanBo.detail.dangVienYes') : txt('matTranCanBo.detail.dangVienNo')}
            </span>
          );
        case 'ten_don_vi': {
          const d = formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi);
          if (item.chuc_vu_cap_quan_ly === 'Tỉnh') {
            return (
              <span className="text-body-sm text-muted-foreground tabular-nums" title={d}>
                {d}
              </span>
            );
          }
          return d === ec ? (
            <span className="text-body-sm text-muted-foreground italic">{ec}</span>
          ) : (
            <span className="text-body-sm text-muted-foreground truncate" title={d}>
              {d}
            </span>
          );
        }
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatCanBoListDateTime(item.tg_cap_nhat, ec)}
            </span>
          );
        case 'actions':
          return (
            <MttqCanBoTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, capQuanLyBadgeCfg],
  );

  const handleRowClick = useCallback(
    (item: MttqCanBoRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: MttqCanBoRow, isSelected: boolean) => (
      <MobileListCard
        selected={isSelected}
        onBodyClick={() => handleRowClick(item)}
        onBodyKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick(item);
          }
        }}
        leading={(
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Users size={20} aria-hidden />
          </div>
        )}
        titleRow={<h4 className="truncate text-sm font-semibold text-foreground">{item.ho_ten}</h4>}
        subheader={(
          <p className="truncate text-xs text-muted-foreground">
            {item.gioi_tinh}
            {item.ten_chuc_vu ? ` · ${item.ten_chuc_vu}` : ''}
            {item.ngay_sinh ? ` · ${formatCanBoListDate(item.ngay_sinh, '')}` : ''}
          </p>
        )}
        footerStart={(
          <label className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(item.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={txt('common.select')}
              className="h-3 w-3 cursor-pointer rounded border-border text-primary accent-primary"
            />
          </label>
        )}
        footerEnd={(
          <MttqCanBoTableRowActions
            compact
            item={item}
            menuOpenId={rowMenuOpenId}
            onMenuOpenChange={setRowMenuOpenId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      />
    ),
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('matTranCanBo.emptyTitle')}
      emptyDescription={txt('matTranCanBo.emptyHint')}
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
      listBreakpoint="sm"
    />
  );
});

export default MttqCanBoTable;
