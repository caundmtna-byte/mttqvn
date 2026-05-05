import React, { useMemo } from 'react';
import { txt } from '../../../../lib/text';
import { Plus, Building2, Briefcase, Tag, Check, Power } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useEmployeeStore } from '../store/useEmployeeStore';
import GenericToolbar from '../../../../components/shared/GenericToolbar';
import { BTN_ADD } from '../../../../lib/button-labels';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { usePositions } from '../../chuc-vu/hooks/use-chuc-vu';
import { STATUS_OPTIONS, type TrangThaiNhanVien } from '../core/constants';
import { useFilterCounts } from '../hooks/use-filter-counts';
import type { Employee } from '../core/types';
import { countColumnSearchActive } from '../utils/column-search';

interface Props {
  /** Danh sách nhân viên người dùng được phép xem (sau phân quyền). */
  employees: Employee[];
  onAdd: () => void;
  onDeleteMany: (ids: string[]) => void;
  onStatusChangeMany: (ids: string[], status: TrangThaiNhanVien) => void;
}

const EmployeeToolbar: React.FC<Props> = ({ employees, onAdd, onDeleteMany, onStatusChangeMany }) => {
  const { canCreate, canEdit, canDelete } = useResourcePermissions('employees');

  const {
    searchTerm, setSearchTerm,
    filters, setFilter,
    columns, toggleColumn, reorderColumns, resetColumns,
    selectedIds, clearSelection,
  } = useEmployeeStore();

  const { data: departments = [] } = useDepartments();
  const { data: positions = [] } = usePositions();

  const { deptCounts, posCounts, statusCounts } = useFilterCounts(employees, searchTerm, filters);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ label: d.ten_phong_ban, value: d.id, count: deptCounts[d.id] || 0 })),
    [departments, deptCounts],
  );
  const positionOptions = useMemo(
    () => positions.map((p) => ({ label: p.ten_chuc_vu, value: p.id, count: posCounts[p.id] || 0 })),
    [positions, posCounts],
  );
  const statusOptions = useMemo(
    () =>
      STATUS_OPTIONS.map((s) => ({
        label: s.label,
        value: String(s.value),
        count: statusCounts[String(s.value)] || 0,
      })),
    [statusCounts],
  );

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countColumnSearchActive(filters.columnSearch);
    return (
      (searchTerm ? 1 : 0) +
      columnSearchN +
      (filters.id_phong_ban.length > 0 ? 1 : 0) +
      (filters.id_chuc_vu.length > 0 ? 1 : 0) +
      (filters.trang_thai.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('id_phong_ban', []);
    setFilter('id_chuc_vu', []);
    setFilter('trang_thai', []);
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'id_phong_ban',
        label: txt('employee.toolbar.department'),
        icon: Building2,
        options: departmentOptions,
        value: filters.id_phong_ban,
        onChange: (val: string[]) => setFilter('id_phong_ban', val),
      },
      {
        key: 'id_chuc_vu',
        label: txt('employee.toolbar.position'),
        icon: Briefcase,
        options: positionOptions,
        value: filters.id_chuc_vu,
        onChange: (val: string[]) => setFilter('id_chuc_vu', val),
      },
      {
        key: 'trang_thai',
        label: txt('employee.toolbar.status'),
        icon: Tag,
        options: statusOptions,
        value: filters.trang_thai,
        onChange: (val: string[]) => setFilter('trang_thai', val),
      },
    ],
    [departmentOptions, positionOptions, statusOptions, filters, setFilter],
  );

  const renderActions = (
    <>
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-sm h-8 px-3"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span className="text-xs">{BTN_ADD()}</span>
        </Button>
      )}
    </>
  );

  const bulkStatusActions = canEdit ? (
    <>
      <button
        type="button"
        onClick={() => onStatusChangeMany(Array.from(selectedIds), 'Hoạt động')}
        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-8 w-8 sm:w-auto sm:px-3 flex items-center justify-center sm:gap-1.5 text-primary bg-primary/10 rounded-lg border border-primary/20 active:scale-95 sm:hover:bg-primary/15 sm:transition-all"
        aria-label={txt('employee.statusActive')}
      >
        <Check size={14} className="stroke-[2.5px] shrink-0" />
        <span className="hidden sm:inline text-xs font-medium">{txt('employee.statusActive')}</span>
      </button>
      <button
        type="button"
        onClick={() => onStatusChangeMany(Array.from(selectedIds), 'Khóa')}
        className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-8 w-8 sm:w-auto sm:px-3 flex items-center justify-center sm:gap-1.5 text-muted-foreground bg-muted/50 rounded-lg border border-border active:scale-95 sm:hover:bg-muted sm:transition-all"
        aria-label={txt('employee.statusLocked')}
      >
        <Power size={14} className="stroke-[2.5px] shrink-0" />
        <span className="hidden sm:inline text-xs font-medium">{txt('employee.statusLocked')}</span>
      </button>
    </>
  ) : null;

  return (
    <GenericToolbar
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filterGroups={filterGroups}
      onAdd={canCreate ? onAdd : undefined}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      bulkActions={bulkStatusActions ?? undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      searchPlaceholder={txt('employee.searchPlaceholder')}
    />
  );
};

export default EmployeeToolbar;
