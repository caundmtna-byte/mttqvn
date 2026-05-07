import React, { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { txt } from '../../../../lib/text';
import { Briefcase, Building2, CornerDownRight, Folder, UserCircle } from 'lucide-react';
import type { Position } from '../core/types';
import type { Department } from '../../phong-ban/core/types';
import { usePositionStore } from '../store/usePositionStore';
import type { ColumnConfig } from '../../../../store/createGenericStore';
import { getColumnCellStyle } from '../../../../store/createGenericStore';
import { formatDateShort } from '../../../../lib/utils';
import { cn } from '../../../../lib/utils';
import { PositionTableRowActions } from './position-table-row-actions';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import HierarchyTable from '../../../../components/shared/HierarchyTable';
import TablePaginationFooter from '../../../../components/shared/TablePaginationFooter';
import ListPageSkeleton from '../../../../components/shared/ListPageSkeleton';
import EmptyState from '../../../../components/shared/EmptyState';
import {
  buildFlatGroupedRows,
  getGroupedPositionRowId,
  getGroupedPositionRowLevel,
  type GroupedPositionRow,
} from '../utils/group-positions-by-department';

interface Props {
  data: Position[];
  isLoading: boolean;
  /** Count phòng ban (exclude-self) — đồng bộ toolbar. */
  deptCounts: Record<string, number>;
  statusCounts: { Active: number; Inactive: number };
  onEdit: (item: Position) => void;
  onDelete: (id: string) => void;
  onStatusChange: (item: Position) => void;
  onView?: (item: Position) => void;
}

const PositionTable = memo(function PositionTable({
  data,
  isLoading,
  deptCounts,
  statusCounts,
  onEdit,
  onDelete,
  onStatusChange,
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
    filters,
    setFilter,
  } = usePositionStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const { data: departments = [] } = useDepartments();

  const deptGroupLabels = useMemo(
    () => ({
      unassigned: txt('position.list.deptHeaderUnassigned'),
      unknownDept: txt('position.list.deptHeaderUnknown'),
    }),
    []
  );

  const flatRows = useMemo(
    () => buildFlatGroupedRows(data, departments, sort, deptGroupLabels),
    [data, departments, sort, deptGroupLabels]
  );

  const totalRecords = flatRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pagination.pageSize));

  useEffect(() => {
    if (pagination.page > totalPages) setPage(totalPages);
  }, [pagination.page, totalPages, setPage]);

  const paginatedFlatRows = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return flatRows.slice(start, start + pagination.pageSize);
  }, [flatRows, pagination.page, pagination.pageSize]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  const deptColumnVisible = useMemo(
    () => columns.some((c) => c.id === 'ten_phong_ban' && c.visible),
    [columns]
  );

  const deptById = useMemo(() => {
    const m = new Map<string, Department>();
    departments.forEach((d) => m.set(d.id, d));
    return m;
  }, [departments]);

  const primaryHeaderColumnId = useMemo(() => {
    const ids = visibleColumns.map((c) => c.id);
    if (ids.includes('ten_chuc_vu')) return 'ten_chuc_vu';
    if (ids.includes('ten_phong_ban')) return 'ten_phong_ban';
    return ids[0] ?? 'ten_chuc_vu';
  }, [visibleColumns]);

  const departmentOptions = useMemo(
    () =>
      departments.map((d) => ({
        label: d.ten_phong_ban,
        value: d.id,
        count: deptCounts[d.id] || 0,
      })),
    [departments, deptCounts]
  );

  const statusOptions = useMemo(
    () => [
      { label: txt('common.activeStatus'), value: 'Active', count: statusCounts.Active },
      { label: txt('common.inactiveStatus'), value: 'Inactive', count: statusCounts.Inactive },
    ],
    [statusCounts]
  );

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
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
        case 'ten_phong_ban':
          if (!deptColumnVisible) return null;
          return (
            <ColumnHeaderFilter
              options={departmentOptions}
              value={filters.phong_ban_id}
              onChange={(v) => setFilter('phong_ban_id', v)}
              ariaLabel={txt('employee.toolbar.department')}
              sortColumnId="ten_phong_ban"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_chuc_vu':
          if (deptColumnVisible) {
            return (
              <ColumnHeaderSortMenu
                ariaLabel={col.label}
                sortColumnId="ten_chuc_vu"
                sort={sort}
                setSort={setSort}
                columnSearch={columnSearchEl}
                columnSearchActive={colSearchActive}
              />
            );
          }
          return (
            <div className="flex min-w-0 shrink-0 items-center gap-0.5">
              <ColumnHeaderFilter
                options={departmentOptions}
                value={filters.phong_ban_id}
                onChange={(v) => setFilter('phong_ban_id', v)}
                ariaLabel={txt('employee.toolbar.department')}
                sortColumnId="ten_phong_ban"
                sort={sort}
                setSort={setSort}
              />
              <ColumnHeaderSortMenu
                ariaLabel={col.label}
                sortColumnId="ten_chuc_vu"
                sort={sort}
                setSort={setSort}
                columnSearch={columnSearchEl}
                columnSearchActive={colSearchActive}
              />
            </div>
          );
        case 'trang_thai':
          return (
            <ColumnHeaderFilter
              options={statusOptions}
              value={filters.status}
              onChange={(v) => setFilter('status', v)}
              ariaLabel={txt('employee.toolbar.status')}
              sortColumnId="trang_thai"
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
    [departmentOptions, statusOptions, filters, setFilter, sort, setSort, deptColumnVisible]
  );

  const renderStatusBadge = (status: string) => {
    return status === 'Đang hoạt động' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
        {txt('position.active')}
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
        {txt('position.inactive')}
      </span>
    );
  };

  const renderPositionDataInner = useCallback(
    (colId: string, item: Position) => {
      switch (colId) {
        case 'thu_tu':
          return <span className="text-sm font-medium text-muted-foreground">{item.thu_tu}</span>;
        case 'ten_chuc_vu': {
          const dept = item.phong_ban_id ? deptById.get(item.phong_ban_id) : undefined;
          const depthExtra = dept && dept.cap_do > 1 ? (dept.cap_do - 1) * 10 : 0;
          const treePad = 32 + depthExtra;
          return (
            <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${treePad}px` }}>
              <div className="mr-1 shrink-0 flex h-6 w-6 items-center justify-center">
                <div className="relative flex h-full w-full items-center justify-center">
                  <div className="absolute -left-[18px] top-1/2 w-[18px] h-px bg-border" />
                  <CornerDownRight size={14} className="text-muted-foreground" />
                </div>
              </div>
              <Briefcase size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate text-sm font-semibold text-foreground">{item.ten_chuc_vu}</span>
            </div>
          );
        }
        case 'ten_cap_bac': {
          const code =
            item.cap_bac != null && String(item.cap_bac).trim() !== '' ? String(item.cap_bac).trim() : null;
          return code ? (
            <span className="text-body-sm font-semibold tabular-nums text-foreground">{code}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        }
        case 'ten_phong_ban':
          return <span className="text-xs text-muted-foreground">—</span>; // cột thường ẩn; giữ nhánh an toàn
        case 'mo_ta':
          return (
            <div
              className="truncate max-w-[200px] text-body-sm text-muted-foreground italic"
              title={item.mo_ta || ''}
            >
              {item.mo_ta || <span className="text-muted-foreground">{txt('position.noDescFull')}</span>}
            </div>
          );
        case 'trang_thai':
          return renderStatusBadge(item.trang_thai);
        case 'tg_cap_nhat':
          return <span className="text-xs text-muted-foreground">{formatDateShort(item.tg_cap_nhat)}</span>;
        default:
          return <span className="text-xs text-muted-foreground">—</span>;
      }
    },
    [deptById]
  );

  const renderHierarchyCell = useCallback(
    (row: GroupedPositionRow, col: ColumnConfig) => {
      const style = getColumnCellStyle(col);
      const cellPad = 'px-6 py-1.5';

      if (row.kind !== 'position') {
        const title = row.kind === 'dept' ? row.department.ten_phong_ban : row.ten_phong_ban;
        const isPrimary = col.id === primaryHeaderColumnId;
        if (isPrimary) {
          const isReal = row.kind === 'dept';
          const capDo = isReal ? row.department.cap_do : 1;
          const treePad = isReal ? Math.max(0, capDo - 1) * 20 : 0;
          const isRootGroup = !isReal || capDo <= 1;
          return (
            <td key={col.id} className={cn(cellPad, 'relative')} style={style}>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: treePad }}>
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border shadow-sm',
                    isRootGroup
                      ? 'border-primary/20 bg-primary/15 text-primary'
                      : 'border-border bg-muted/80 text-muted-foreground'
                  )}
                >
                  <Building2 size={isRootGroup ? 16 : 14} aria-hidden />
                </div>
                <span
                  className={cn(
                    'min-w-0 truncate',
                    isRootGroup
                      ? 'text-sm font-bold text-foreground'
                      : 'text-sm font-semibold text-foreground/80'
                  )}
                >
                  {title}
                </span>
              </div>
            </td>
          );
        }
        return (
          <td key={col.id} className={cellPad} style={style}>
            <span className="text-xs text-muted-foreground">—</span>
          </td>
        );
      }

      return (
        <td key={col.id} className={cellPad} style={style}>
          <div className="min-w-0 max-w-full overflow-hidden">{renderPositionDataInner(col.id, row.position)}</div>
        </td>
      );
    },
    [primaryHeaderColumnId, renderPositionDataInner]
  );

  const handlePositionOpen = useCallback(
    (item: Position) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit]
  );

  const renderMobileCard = useCallback(
    (item: Position, isSelected: boolean, groupedView: boolean) => (
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          handlePositionOpen(item);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handlePositionOpen(item);
          }
        }}
        className={`bg-card rounded-xl border p-4 shadow-sm transition-all ${isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'}`}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Briefcase size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-1">
              <div className="min-w-0 flex-1">
                {!groupedView && item.ten_phong_ban ? (
                  <p className="text-xs text-muted-foreground mb-1 truncate">{item.ten_phong_ban}</p>
                ) : null}
                <h4 className="font-semibold text-foreground truncate">{item.ten_chuc_vu}</h4>
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 shrink-0 rounded border-border text-primary accent-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-2 bg-muted rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-0.5">
                  {groupedView ? txt('position.store.levelCol') : txt('position.form.department')}
                </p>
                <p className="text-body-sm font-medium text-foreground truncate tabular-nums">
                  {groupedView
                    ? item.cap_bac != null && String(item.cap_bac).trim() !== ''
                      ? String(item.cap_bac).trim()
                      : '—'
                    : (item.ten_phong_ban ?? '—')}
                </p>
              </div>
              <div className="p-2 bg-muted rounded-xl border border-border">
                <p className="text-xs text-muted-foreground mb-0.5">{txt('common.status')}</p>
                <div className="scale-90 origin-left">{renderStatusBadge(item.trang_thai)}</div>
              </div>
            </div>

            <div
              className={cn(
                'flex items-center border-t border-border pt-3',
                groupedView ? 'justify-end' : 'justify-between'
              )}
            >
              {!groupedView && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
                  <UserCircle size={12} />
                  <span className="tabular-nums">
                    {item.cap_bac != null && String(item.cap_bac).trim() !== '' ? String(item.cap_bac).trim() : '—'}
                  </span>
                </div>
              )}
              <PositionTableRowActions
                compact
                item={item}
                menuOpenId={rowMenuOpenId}
                onMenuOpenChange={setRowMenuOpenId}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [handlePositionOpen, onEdit, onDelete, onStatusChange, rowMenuOpenId, toggleSelection]
  );

  if (isLoading) {
    return (
      <ListPageSkeleton
        loadingText={txt('position.loading')}
        tableColumns={visibleColumns.length}
        tableRowCount={5}
        tableColumnWithSubline={0}
        cardCount={3}
      />
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-4">
        <EmptyState
          title={txt('common.noResults')}
          description={txt('common.noData')}
          icon={<Folder className="h-10 w-10 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (flatRows.length === 0) {
    return (
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center p-4">
        <EmptyState
          title={txt('common.noResults')}
          description={txt('common.noData')}
          icon={<Folder className="h-10 w-10 text-muted-foreground" />}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
          <HierarchyTable<GroupedPositionRow>
            data={paginatedFlatRows}
            columns={visibleColumns}
            selectedIds={selectedIds}
            getId={getGroupedPositionRowId}
            getLevel={getGroupedPositionRowLevel}
            renderCell={renderHierarchyCell}
            onToggleSelection={toggleSelection}
            onToggleAllSelection={toggleAllSelection}
            isRowSelectable={(row) => row.kind === 'position'}
            isRowClickable={(row) => row.kind === 'position'}
            onView={(row) => {
              if (row.kind === 'position') handlePositionOpen(row.position);
            }}
            renderActions={(row) =>
              row.kind === 'position' ? (
                <PositionTableRowActions
                  item={row.position}
                  menuOpenId={rowMenuOpenId}
                  onMenuOpenChange={setRowMenuOpenId}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              ) : null
            }
            renderColumnHeaderAccessory={renderColumnHeaderAccessory}
          />
        </div>

        <div className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3 pt-1 md:hidden">
          <div className="space-y-3">
            {paginatedFlatRows.map((row) => {
              const rid = getGroupedPositionRowId(row);
              if (row.kind !== 'position') {
                const title = row.kind === 'dept' ? row.department.ten_phong_ban : row.ten_phong_ban;
                const isReal = row.kind === 'dept';
                const capDo = isReal ? row.department.cap_do : 1;
                const pad = isReal ? Math.max(0, capDo - 1) * 12 : 0;
                const isRoot = !isReal || capDo <= 1;
                return (
                  <div
                    key={rid}
                    style={{ paddingLeft: 8 + pad }}
                    className={cn(
                      'sticky top-0 z-[1] -mx-1 flex items-center gap-2 border-b border-border bg-muted/95 py-2 pr-3 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/80',
                      isRoot ? 'font-bold text-foreground' : 'font-semibold text-foreground/80'
                    )}
                  >
                    <Building2
                      className={cn('h-4 w-4 shrink-0', isRoot ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{title}</span>
                  </div>
                );
              }
              return (
                <div key={rid} className="transition-[transform,opacity] duration-150 active:scale-[0.98]">
                  {renderMobileCard(row.position, selectedIds.has(row.position.id), true)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-muted/30">
        <TablePaginationFooter
          totalRecords={totalRecords}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          selectedCount={selectedIds.size}
          recordsLabel={txt('position.footerRecords')}
        />
      </div>
    </div>
  );
});

export default PositionTable;
