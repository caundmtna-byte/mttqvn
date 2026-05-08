import React, { memo, useMemo, useCallback, useState } from 'react';
import { txt } from '../../../../lib/text';
import { Briefcase, Building2, Layers } from 'lucide-react';
import { Employee } from '../core/types';
import { useEmployeeStore } from '../store/useEmployeeStore';
import type { ColumnConfig } from '../../../../store/createGenericStore';
import { cn } from '../../../../lib/utils';
import { EmployeeAvatarImg } from './employee-avatar-img';
import GenericTable from '../../../../components/shared/GenericTable';
import { MobileListCard } from '../../../../components/shared/MobileListCard';
import EnumBadge from '../../../../components/ui/EnumBadge';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { usePositions } from '../../chuc-vu/hooks/use-chuc-vu';
import { useFilterCounts } from '../hooks/use-filter-counts';
import { STATUS_BADGE_CONFIG, STATUS_OPTIONS } from '../core/constants';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { EmployeeTableRowActions } from './employee-table-row-actions';

interface Props {
  data: Employee[];
  isLoading: boolean;
  /** Danh sách gốc (sau phân quyền) để đếm filter — giống toolbar. */
  employeesForFilterCounts: Employee[];
  onEdit: (item: Employee) => void;
  onDelete: (id: string) => void;
  onStatusChange: (item: Employee) => void;
  onView: (item: Employee) => void;
}

const EmployeeTable = memo(function EmployeeTable({
  data,
  isLoading,
  employeesForFilterCounts,
  onEdit,
  onDelete,
  onStatusChange,
  onView,
}: Props) {
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);
  const {
    columns, pagination, setPage, setPageSize,
    selectedIds, toggleSelection, toggleAllSelection,
    sort, setSort, resizeColumn,
    searchTerm, filters, setFilter,
  } = useEmployeeStore();

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();
  const { deptCounts, unitCounts, posCounts, statusCounts } = useFilterCounts(
    employeesForFilterCounts,
    searchTerm,
    filters,
  );

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.ten_phong_ban, value: d.id, count: deptCounts[d.id] || 0 })),
    [departments, deptCounts],
  );
  const unitOptions = useMemo(
    () => departments.map((d) => ({ label: d.ten_phong_ban, value: d.id, count: unitCounts[d.id] || 0 })),
    [departments, unitCounts],
  );
  const positionOptions = useMemo(
    () => positions.map((p) => ({ label: p.ten_chuc_vu, value: p.id, count: posCounts[p.id] || 0 })),
    [positions, posCounts],
  );
  const statusOptions = useMemo(
    () => STATUS_OPTIONS.map((s) => ({
      label: s.label,
      value: String(s.value),
      count: statusCounts[String(s.value)] || 0,
    })),
    [statusCounts],
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
          return (
            <ColumnHeaderFilter
              options={departmentOptions}
              value={filters.id_phong_ban}
              onChange={(v) => setFilter('id_phong_ban', v)}
              ariaLabel={txt('employee.toolbar.department')}
              sortColumnId="ten_phong_ban"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_bo_phan':
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
        case 'ten_chuc_vu':
          return (
            <ColumnHeaderFilter
              options={positionOptions}
              value={filters.id_chuc_vu}
              onChange={(v) => setFilter('id_chuc_vu', v)}
              ariaLabel={txt('employee.toolbar.position')}
              sortColumnId="ten_chuc_vu"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'trang_thai':
          return (
            <ColumnHeaderFilter
              options={statusOptions}
              value={filters.trang_thai}
              onChange={(v) => setFilter('trang_thai', v)}
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
    [departmentOptions, positionOptions, statusOptions, filters, setFilter, sort, setSort],
  );

  void unitOptions;

  const renderCell = useCallback((colId: string, item: Employee) => {
    switch (colId) {
      case 'ten_tai_khoan':
        return (
          <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            {item.ten_tai_khoan}
          </span>
        );
      case 'ho_va_ten':
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <EmployeeAvatarImg
              hinh_anh={item.hinh_anh}
              ho_va_ten={item.ho_va_ten}
              className="w-8 h-8 rounded-full border border-border shadow-sm object-cover shrink-0"
              alt={item.ho_va_ten}
            />
            <span className="font-semibold text-foreground text-sm truncate">{item.ho_va_ten}</span>
          </div>
        );
      case 'ten_phong_ban':
        return (
          <div className="flex items-center gap-1.5 text-body-sm text-foreground">
            <Building2 size={12} className="text-primary/60 shrink-0" />
            <span className="truncate">{item.ten_phong_ban || txt('common.emptyCell')}</span>
          </div>
        );
      case 'ten_bo_phan':
        return item.ten_bo_phan ? (
          <div className="flex items-center gap-1.5 text-body-sm text-foreground">
            <Layers size={12} className="text-primary/60 shrink-0" />
            <span className="truncate">{item.ten_bo_phan}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground italic">{txt('common.emptyCell')}</span>
        );
      case 'ten_chuc_vu':
        return (
          <div className="flex items-center gap-1.5 text-body-sm text-foreground min-w-0">
            <Briefcase size={12} className="text-primary/60 shrink-0" />
            <span className="truncate font-medium">
              {item.ten_chuc_vu || txt('employee.unassigned')}
            </span>
          </div>
        );
      case 'trang_thai':
        return <EnumBadge value={item.trang_thai} config={STATUS_BADGE_CONFIG} truncate />;
      case 'actions':
        return (
          <EmployeeTableRowActions
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

  const renderMobileCard = useCallback((item: Employee, isSelected: boolean) => (
    <MobileListCard
      selected={isSelected}
      onBodyClick={() => onView(item)}
      onBodyKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView(item);
        }
      }}
      leading={(
        <div className="relative shrink-0">
          <EmployeeAvatarImg
            hinh_anh={item.hinh_anh}
            ho_va_ten={item.ho_va_ten ?? ''}
            className="h-12 w-12 rounded-xl border border-border object-cover shadow-sm"
            alt={item.ho_va_ten}
          />
          <div
            className={cn(
              'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
              item.trang_thai === 'Hoạt động' ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            )}
            aria-hidden
          />
        </div>
      )}
      titleRow={(
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h4 className="truncate text-sm font-semibold text-foreground">{item.ho_va_ten}</h4>
          <div className="shrink-0">
            <EnumBadge value={item.trang_thai} config={STATUS_BADGE_CONFIG} />
          </div>
        </div>
      )}
      subheader={(
        <p className="truncate text-xs text-muted-foreground">
          @{item.ten_tai_khoan}
          {item.ten_chuc_vu ? ` · ${item.ten_chuc_vu}` : ''}
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
        <EmployeeTableRowActions
          compact
          item={item}
          menuOpenId={rowMenuOpenId}
          onMenuOpenChange={setRowMenuOpenId}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={onStatusChange}
        />
      )}
    />
  ), [onEdit, onDelete, onStatusChange, onView, rowMenuOpenId, toggleSelection]);

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
      onRowClick={onView}
      keyExtractor={(item) => item.id}
      onResizeColumn={resizeColumn}
      stickyLeftCount={2}
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default EmployeeTable;
