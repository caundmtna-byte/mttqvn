import React, { useState, useCallback, useMemo, memo } from 'react';
import { txt } from '../../../../lib/text';
import { Briefcase, Building2, UserCircle } from 'lucide-react';
import type { Position } from '../core/types';
import { usePositionStore } from '../store/usePositionStore';
import type { ColumnConfig } from '../../../../store/createGenericStore';
import GenericTable from '../../../../components/shared/GenericTable';
import { formatDateShort } from '../../../../lib/utils';
import { PositionTableRowActions } from './position-table-row-actions';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { EmployeeColumnHeaderFilter } from '../../nhan-vien/components/EmployeeColumnHeaderFilter';
import { EmployeeColumnHeaderSortMenu } from '../../nhan-vien/components/EmployeeColumnHeaderSortMenu';
import { EmployeeColumnHeaderSearch } from '../../nhan-vien/components/EmployeeColumnHeaderSearch';

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
    columns, pagination, setPage, setPageSize,
    selectedIds, toggleSelection, toggleAllSelection,
    sort, setSort, resizeColumn,
    filters, setFilter,
  } = usePositionStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const { data: departments = [] } = useDepartments();

  const departmentOptions = useMemo(
    () => departments.map((d) => ({
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

      switch (col.id) {
        case 'ten_phong_ban':
          return (
            <EmployeeColumnHeaderFilter
              options={departmentOptions}
              value={filters.phong_ban_id}
              onChange={(v) => setFilter('phong_ban_id', v)}
              ariaLabel={txt('employee.toolbar.department')}
              sortColumnId="ten_phong_ban"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'trang_thai':
          return (
            <EmployeeColumnHeaderFilter
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
            <EmployeeColumnHeaderSortMenu
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
    [departmentOptions, statusOptions, filters, setFilter, sort, setSort]
  );

  const renderStatusBadge = (status: string) => {
    return status === 'Đang hoạt động' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">{txt('position.active')}</span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">{txt('position.inactive')}</span>
    );
  };

  const renderCell = useCallback((colId: string, item: Position) => {
    switch (colId) {
      case 'thu_tu':
        return <span className="text-sm font-medium text-muted-foreground">{item.thu_tu}</span>;
      case 'ma_chuc_vu':
        return (
          <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border tabular-nums">
            {item.ma_chuc_vu}
          </span>
        );
      case 'ten_chuc_vu':
        return (
          <div className="flex min-w-0 items-center gap-2">
            <Briefcase size={14} className="shrink-0 text-primary/70" aria-hidden />
            <span className="truncate font-semibold text-foreground text-sm">{item.ten_chuc_vu}</span>
          </div>
        );
      case 'ten_cap_bac':
        return item.ten_cap_bac ? (
          <span className="text-body-sm font-medium text-foreground">{item.ten_cap_bac}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      case 'ten_phong_ban':
        return (
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{item.ten_phong_ban || '--'}</span>
          </div>
        );
      case 'mo_ta':
        return (
          <div className="truncate max-w-[200px] text-body-sm text-muted-foreground italic" title={item.mo_ta || ''}>
            {item.mo_ta || <span className="text-muted-foreground">{txt('position.noDescFull')}</span>}
          </div>
        );
      case 'trang_thai':
        return renderStatusBadge(item.trang_thai);
      case 'tg_cap_nhat':
        return (
          <span className="text-xs text-muted-foreground">{formatDateShort(item.tg_cap_nhat)}</span>
        );
      case 'actions':
        return (
          <PositionTableRowActions
            item={item}
            menuOpenId={rowMenuOpenId}
            onMenuOpenChange={setRowMenuOpenId}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        );
      default:
        return null;
    }
  }, [onEdit, onDelete, onStatusChange, rowMenuOpenId]);

  const handleRowClick = useCallback(
    (item: Position) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit]
  );

  const renderMobileCard = useCallback((item: Position, isSelected: boolean) => (
    <div
      key={item.id}
      role="button"
      tabIndex={0}
        onClick={(e) => { e.stopPropagation(); handleRowClick(item); }}
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
          <Briefcase size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-semibold text-foreground truncate">{item.ten_chuc_vu}</h4>
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(item.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={txt('common.select')}
              className="w-5 h-5 rounded border-border text-primary accent-primary"
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-3">{item.ma_chuc_vu}</p>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-2 bg-muted rounded-xl border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{txt('position.form.department')}</p>
              <p className="text-body-sm font-medium text-foreground truncate">{item.ten_phong_ban}</p>
            </div>
            <div className="p-2 bg-muted rounded-xl border border-border">
              <p className="text-xs text-muted-foreground mb-0.5">{txt('common.status')}</p>
              <div className="scale-90 origin-left">{renderStatusBadge(item.trang_thai)}</div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
              <UserCircle size={12} />
              {item.ten_cap_bac}
            </div>
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
  ), [handleRowClick, onEdit, onDelete, onStatusChange, rowMenuOpenId, toggleSelection]);

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
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

export default PositionTable;
