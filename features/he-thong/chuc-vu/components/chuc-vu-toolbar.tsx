import React, { useMemo } from 'react';
import { txt } from '../../../../lib/text';
import { Plus, Download, Upload, Tag, Building2 } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import Tooltip from '../../../../components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { TrangThaiHoatDong } from '../../../../lib/constants/trang-thai';
import { usePositionStore } from '../store/usePositionStore';
import GenericToolbar from '../../../../components/shared/GenericToolbar';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { countColumnSearchActive } from '../utils/column-search';

interface Props {
  /** Count phòng ban (exclude-self) — từ `usePositionFilterCounts`. */
  deptCounts: Record<string, number>;
  /** Count Active / Inactive — từ `usePositionFilterCounts`. */
  statusCounts: { Active: number; Inactive: number };
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  onStatusChangeMany: (ids: string[], status: TrangThaiHoatDong) => void;
}

const PositionToolbar: React.FC<Props> = ({
  deptCounts,
  statusCounts,
  onAdd, onExport, onImport, onDeleteMany, onStatusChangeMany
}) => {
  const { canCreate, canImport, canExport, canDelete, canEdit } = useResourcePermissions('positions');

  const {
    searchTerm, setSearchTerm,
    filters, setFilter,
    columns, toggleColumn, reorderColumns, resetColumns,
    selectedIds, clearSelection
  } = usePositionStore();

  const { data: departments = [] } = useDepartments();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    const columnSearchN = countColumnSearchActive(filters.columnSearch);
    return (searchTerm ? 1 : 0)
      + columnSearchN
      + (filters.phong_ban_id.length > 0 ? 1 : 0)
      + (filters.status.length > 0 ? 1 : 0);
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('status', []);
    setFilter('phong_ban_id', []);
  };

  const statusOptions = useMemo(
    () => [
      { label: txt('common.activeStatus'), value: 'Active', count: statusCounts.Active },
      { label: txt('common.inactiveStatus'), value: 'Inactive', count: statusCounts.Inactive },
    ],
    [statusCounts]
  );

  const departmentOptions = useMemo(
    () => departments.map((d) => ({
      label: d.ten_phong_ban,
      value: d.id,
      count: deptCounts[d.id] || 0,
    })),
    [departments, deptCounts]
  );

  /** Mobile: sheet lọc — desktop dùng header cột bảng (cùng state), không chip trên toolbar. */
  const filterGroups = useMemo(
    () => [
      {
        key: 'phong_ban_id',
        label: txt('employee.toolbar.department'),
        icon: Building2,
        options: departmentOptions,
        value: filters.phong_ban_id,
        onChange: (val: string[]) => setFilter('phong_ban_id', val),
      },
      {
        key: 'status',
        label: txt('common.status'),
        icon: Tag,
        options: statusOptions,
        value: filters.status,
        onChange: (val: string[]) => setFilter('status', val),
      },
    ],
    [filters.phong_ban_id, filters.status, setFilter, departmentOptions, statusOptions]
  );

  const mobileActions = useMemo(
    () => [
      ...(canImport ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }] : []),
      ...(canExport ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }] : []),
    ],
    [onImport, onExport, canImport, canExport]
  );

  const renderActions = (
    <>
      <div className="hidden sm:flex items-center gap-2">
        {canImport && (
        <Tooltip content={txt('common.import')} placement="bottom">
          <Button variant="outline" size="sm" onClick={onImport} className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50">
            <Upload className="w-4 h-4" />
          </Button>
        </Tooltip>
        )}
        {canExport && (
        <Tooltip content={txt('common.export')} placement="bottom">
          <Button variant="outline" size="sm" onClick={onExport} className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50">
            <Download className="w-4 h-4" />
          </Button>
        </Tooltip>
        )}
      </div>
      {canCreate && (
      <Button onClick={onAdd} size="sm" className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4">
        <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
        <span className="hidden sm:inline">{txt('common.addNew')}</span>
      </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
        selectedCount={selectedCount}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSelection={clearSelection}
        actions={renderActions}
        filterGroups={filterGroups}
        mobileActions={mobileActions}
        onAdd={canCreate ? onAdd : undefined}
        searchPlaceholder={txt('common.searchPlaceholder')}
        activeFilterCount={activeFilterCount}
        onClearAllFilters={handleClearAllFilters}
        onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
        onStatusChangeMany={canEdit ? (status) => onStatusChangeMany(Array.from(selectedIds), status) : undefined}
        columns={columns}
        onToggleColumn={toggleColumn}
        onReorderColumns={reorderColumns}
        onResetColumns={resetColumns}
        showBack
    />
  );
};

export default PositionToolbar;
