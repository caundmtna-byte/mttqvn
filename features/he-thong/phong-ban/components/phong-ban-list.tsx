import React, { useMemo, useCallback } from 'react';
import { txt } from '../../../../lib/text';
import { Folder, CornerDownRight, Building2 } from 'lucide-react';
import { formatDateShort } from '../../../../lib/utils';
import { Department } from '../core/types';
import EmptyState from '../../../../components/shared/EmptyState';
import ListPageSkeleton from '../../../../components/shared/ListPageSkeleton';
import HierarchyTable from '../../../../components/shared/HierarchyTable';
import TablePaginationFooter from '../../../../components/shared/TablePaginationFooter';
import { useTreeFlatten } from '../../../../lib/hooks';
import { getNameStyleDefault } from '../../../../lib/tree-utils';
import type { ColumnConfig } from '../../../../store/createGenericStore';
import { getColumnCellStyle } from '../../../../store/createGenericStore';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import EnumBadge from '../../../../components/ui/EnumBadge';
import { buildDepartmentLevelBadgeConfig, departmentTrangThaiBadgeConfig } from '../utils/department-badges';
import { useRowMenuOpenState } from '../../../../components/shared/row-actions';
import { DepartmentTableRowActions } from './department-table-row-actions';
import { MobileListCard } from '../../../../components/shared/MobileListCard';
import { useDepartmentStore } from '../store/useDepartmentStore';
import { useHierarchyRootFilter } from '../../../../lib/useHierarchyRootFilter';
import { EmployeeColumnHeaderFilter } from '../../nhan-vien/components/EmployeeColumnHeaderFilter';
import { EmployeeColumnHeaderSortMenu } from '../../nhan-vien/components/EmployeeColumnHeaderSortMenu';
import { EmployeeColumnHeaderSearch } from '../../nhan-vien/components/EmployeeColumnHeaderSearch';

interface Props {
  data: Department[];
  /** Danh sách đầy đủ (lọc phòng gốc / đếm) */
  allDepartments: Department[];
  columns: ColumnConfig[];
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleAllSelection: (ids: string[]) => void;
  isLoading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onEdit: (item: Department) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: Department) => void;
  onView?: (item: Department) => void;
}

const treeOptions = {
  getId: (d: Department) => d.id,
  getParentId: (d: Department) => d.cha_id,
  getOrder: (d: Department) => d.thu_tu,
  includeOrphans: true as const,
};

const DepartmentList: React.FC<Props> = ({
  data,
  allDepartments,
  columns,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection,
  isLoading,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onStatusChange,
  onView,
}) => {
  const { canEdit, canDelete } = useResourcePermissions('departments');
  const { menuOpenId, setMenuOpenId } = useRowMenuOpenState();
  const { filters, setFilter, sort, setSort } = useDepartmentStore();

  const phongOptionsWithCount = useHierarchyRootFilter({
    items: allDepartments,
    getId: (d) => d.id,
    getParentId: (d) => d.cha_id,
    getOrder: (d) => d.thu_tu,
    getRootLabel: (d) => d.ten_phong_ban,
  });

  const statusOptions = useMemo(
    () => [
      {
        label: txt('common.activeStatus'),
        value: 'Active',
        count: allDepartments.filter((d) => d.trang_thai === 'Đang hoạt động').length,
      },
      {
        label: txt('common.inactiveStatus'),
        value: 'Inactive',
        count: allDepartments.filter((d) => d.trang_thai === 'Ngừng hoạt động').length,
      },
    ],
    [allDepartments]
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
              options={phongOptionsWithCount}
              value={filters.id_phong_goc}
              onChange={(v) => setFilter('id_phong_goc', v)}
              ariaLabel={txt('department.toolbar.department')}
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
              ariaLabel={txt('common.status')}
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
    [filters, setFilter, sort, setSort, phongOptionsWithCount, statusOptions]
  );
  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  const levelBadgeConfig = useMemo(() => buildDepartmentLevelBadgeConfig(), []);
  const statusBadgeConfig = useMemo(() => departmentTrangThaiBadgeConfig(), []);

  const sortedTreeData = useTreeFlatten(data, treeOptions);

  const parentNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    allDepartments.forEach((d) => {
      m[d.id] = d.ten_phong_ban;
    });
    return m;
  }, [allDepartments]);

  const totalRecords = sortedTreeData.length;
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTreeData.slice(start, start + pageSize);
  }, [sortedTreeData, page, pageSize]);

  if (isLoading) {
    return (
      <ListPageSkeleton
        loadingText={txt('department.loading')}
        tableColumns={visibleColumns.length}
        tableRowCount={5}
        tableColumnWithSubline={0}
        cardCount={3}
      />
    );
  }

  if (allDepartments.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <EmptyState
          title={txt('department.empty')}
          description={txt('department.emptyHint')}
          icon={<Folder className="w-10 h-10 text-muted-foreground" />}
        />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        <EmptyState
          title={txt('common.noResults')}
          description={txt('common.noData')}
          icon={<Folder className="w-10 h-10 text-muted-foreground" />}
        />
      </div>
    );
  }

  const renderCell = (dept: Department, col: ColumnConfig) => {
    const isRoot = dept.cap_do === 1;
    const paddingLeft = (dept.cap_do - 1) * 32;
    switch (col.id) {
      case 'thu_tu':
        return (
          <td key={col.id} className="px-6 py-1.5" style={getColumnCellStyle(col)}>
            <span className="text-sm font-medium text-muted-foreground">{dept.thu_tu}</span>
          </td>
        );
      case 'ten_phong_ban':
        return (
          <td key={col.id} className="px-6 py-1.5 relative" style={getColumnCellStyle(col)}>
            {isRoot && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
            <div className="flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
              <div className="mr-3 shrink-0 flex items-center justify-center w-6 h-6">
                {isRoot ? (
                  <div className="bg-primary/15 p-1.5 rounded-lg text-primary shadow-sm border border-primary/20">
                    <Building2 size={16} />
                  </div>
                ) : (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <div className="absolute -left-[18px] top-1/2 w-[18px] h-px bg-border" />
                    <CornerDownRight size={14} className="text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className={`${getNameStyleDefault(dept.cap_do)} group-hover:text-primary transition-colors`}>
                  {dept.ten_phong_ban}
                </span>
              </div>
            </div>
          </td>
        );
      case 'ten_phong_cha':
        return (
          <td key={col.id} className="px-6 py-1.5" style={getColumnCellStyle(col)}>
            <span className="text-sm text-muted-foreground truncate block" title={parentNameMap[dept.cha_id ?? ''] ?? '—'}>
              {dept.cha_id ? (parentNameMap[dept.cha_id] ?? '—') : '—'}
            </span>
          </td>
        );
      case 'mo_ta':
        return (
          <td key={col.id} className="px-6 py-1.5 min-w-0" style={getColumnCellStyle(col)}>
            <span className="text-xs text-muted-foreground line-clamp-2">{dept.mo_ta ?? '—'}</span>
          </td>
        );
      case 'cap_do':
        return (
          <td key={col.id} className="px-6 py-1.5" style={getColumnCellStyle(col)}>
            <EnumBadge
              shape="rounded"
              value={dept.cap_do}
              config={levelBadgeConfig}
              fallbackLabel={txt('department.levelBadge', { level: dept.cap_do })}
            />
          </td>
        );
      case 'trang_thai':
        return (
          <td key={col.id} className="px-6 py-1.5" style={getColumnCellStyle(col)}>
            <EnumBadge shape="pill" value={dept.trang_thai} config={statusBadgeConfig} />
          </td>
        );
      case 'tg_cap_nhat':
        return (
          <td key={col.id} className="px-6 py-1.5" style={getColumnCellStyle(col)}>
            <span className="text-xs text-muted-foreground">{formatDateShort(dept.tg_cap_nhat)}</span>
          </td>
        );
      default:
        return <td key={col.id} className="px-6 py-1.5" style={getColumnCellStyle(col)} />;
    }
  };

  const renderMobileCard = (dept: Department, isSelected: boolean) => {
    const showRowActions = canEdit || canDelete;
    const hasExtra = Boolean(dept.mo_ta) || dept.cap_do != null;
    return (
      <MobileListCard
        selected={isSelected}
        onBodyClick={() => onView?.(dept)}
        onBodyKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onView?.(dept);
          }
        }}
        leading={(
          <div className="h-11 w-11 shrink-0 rounded-lg border border-primary/20 bg-primary/15 flex items-center justify-center text-primary">
            <Building2 size={22} />
          </div>
        )}
        titleRow={(
          <div className="flex min-w-0 items-center justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-foreground">{dept.ten_phong_ban}</h4>
            <div className="shrink-0">
              <EnumBadge shape="pill" value={dept.trang_thai} config={statusBadgeConfig} />
            </div>
          </div>
        )}
        metaLine={(
          <p className="text-xs text-muted-foreground">
            {txt('department.detail.level')} {dept.cap_do}
          </p>
        )}
        subheader={
          hasExtra ? (
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 px-3 py-2 text-body-sm">
              {dept.cap_do != null && (
                <div>
                  <p className="mb-0.5 text-muted-foreground">{txt('department.detail.level')}</p>
                  <EnumBadge
                    shape="rounded"
                    value={dept.cap_do}
                    config={levelBadgeConfig}
                    fallbackLabel={txt('department.levelBadge', { level: dept.cap_do })}
                  />
                </div>
              )}
              {dept.mo_ta ? (
                <div className={dept.cap_do != null ? '' : 'col-span-2'}>
                  <p className="mb-0.5 text-muted-foreground">{txt('department.detail.description')}</p>
                  <p className="line-clamp-2 font-medium text-foreground">{dept.mo_ta}</p>
                </div>
              ) : null}
            </div>
          ) : null
        }
        footerStart={(
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <label className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelection(dept.id)}
                onClick={(e) => e.stopPropagation()}
                className="h-3 w-3 cursor-pointer rounded border-border text-primary accent-primary"
                aria-label={txt('common.select')}
              />
            </label>
            <span className="text-xs text-muted-foreground">
              {txt('department.detail.order')}: {dept.thu_tu}
            </span>
          </div>
        )}
        footerEnd={
          showRowActions ? (
            <DepartmentTableRowActions
              item={dept}
              menuOpenId={menuOpenId}
              onMenuOpenChange={setMenuOpenId}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              canEdit={canEdit}
              canDelete={canDelete}
              compact
            />
          ) : null
        }
      />
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-card overflow-hidden">
      {/* Vùng scroll: bảng (desktop) hoặc card (mobile), không đè footer */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Desktop: hierarchy table */}
        <div className="hidden md:flex flex-1 min-h-0 flex-col overflow-hidden">
          <HierarchyTable<Department>
            data={paginatedData}
            columns={visibleColumns}
            selectedIds={selectedIds}
            getId={(d) => d.id}
            getLevel={(d) => d.cap_do}
            renderCell={renderCell}
            onToggleSelection={onToggleSelection}
            onToggleAllSelection={onToggleAllSelection}
            onView={onView}
            renderActions={
              canEdit || canDelete
                ? (dept) => (
                    <DepartmentTableRowActions
                      item={dept}
                      menuOpenId={menuOpenId}
                      onMenuOpenChange={setMenuOpenId}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onStatusChange={onStatusChange}
                      canEdit={canEdit}
                      canDelete={canDelete}
                    />
                  )
                : undefined
            }
            renderColumnHeaderAccessory={renderColumnHeaderAccessory}
          />
        </div>

        {/* Mobile: card list */}
        <div className="md:hidden flex-1 min-h-0 overflow-y-auto pb-3 px-3 pt-1 custom-scrollbar">
          <div className="space-y-3">
            {paginatedData.map((dept) => (
              <div key={dept.id} className="transition-all active:scale-[0.98]">
                {renderMobileCard(dept, selectedIds.has(dept.id))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-muted/30">
        <TablePaginationFooter
          totalRecords={totalRecords}
          page={page}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          selectedCount={selectedIds.size}
          recordsLabel={txt('department.footerRecords')}
        />
      </div>
    </div>
  );
};

export default DepartmentList;