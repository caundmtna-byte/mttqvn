import React, { useMemo } from 'react';
import { txt } from '../../../../lib/text';
import { Plus, Download, Upload, Tag, Building2 } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import Tooltip from '../../../../components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useDepartmentStore } from '../store/useDepartmentStore';
import GenericToolbar from '../../../../components/shared/GenericToolbar';
import FilterChipMultiSelect from '../../../../components/shared/FilterChipMultiSelect';
import { useHierarchyRootFilter } from '../../../../lib/useHierarchyRootFilter';
import type { Department } from '../core/types';
import { countDepartmentColumnSearchActive } from '../utils/column-search';

interface Props {
  departments: Department[];
  selectedCount: number;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: () => void;
  onStatusChangeMany: (status: import('@/lib/constants/trang-thai').TrangThaiHoatDong) => void;
}

const PhongBanToolbar: React.FC<Props> = ({
  departments,
  selectedCount,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  onStatusChangeMany,
}) => {
  const { canCreate, canImport, canExport, canDelete, canEdit } = useResourcePermissions('departments');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    setSort,
    clearSelection,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
  } = useDepartmentStore();

  const phongOptionsWithCount = useHierarchyRootFilter({
    items: departments,
    getId: (d) => d.id,
    getParentId: (d) => d.cha_id,
    getOrder: (d) => d.thu_tu,
    getRootLabel: (d) => d.ten_phong_ban,
  });

  const statusOptions = useMemo(
    () => [
      { label: txt('common.activeStatus'), value: 'Active', count: departments.filter((d) => d.trang_thai === 'Đang hoạt động').length },
      { label: txt('common.inactiveStatus'), value: 'Inactive', count: departments.filter((d) => d.trang_thai === 'Ngừng hoạt động').length },
    ],
    [departments]
  );

  const activeFilterCount = useMemo(() => {
    const colN = countDepartmentColumnSearchActive(filters.columnSearch);
    const statusOn = filters.status.length > 0 ? 1 : 0;
    const rootOn = filters.id_phong_goc.length > 0 ? 1 : 0;
    return colN + statusOn + rootOn + (searchTerm.trim() ? 1 : 0);
  }, [filters.columnSearch, filters.status.length, filters.id_phong_goc.length, searchTerm]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('status', []);
    setFilter('id_phong_goc', []);
    setSort(null, null);
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'id_phong_goc',
        label: txt('department.toolbar.department'),
        icon: Building2,
        options: phongOptionsWithCount,
        value: filters.id_phong_goc,
        onChange: (val: string[]) => setFilter('id_phong_goc', val),
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
    [filters.id_phong_goc, filters.status, setFilter, phongOptionsWithCount, statusOptions]
  );

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={phongOptionsWithCount}
          value={filters.id_phong_goc}
          onChange={(val) => setFilter('id_phong_goc', val)}
          placeholder={txt('department.toolbar.department')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,30vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={statusOptions}
          value={filters.status}
          onChange={(val) => setFilter('status', val)}
          placeholder={txt('common.status')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
        />
      </div>
    ),
    [phongOptionsWithCount, statusOptions, filters.id_phong_goc, filters.status, setFilter],
  );

  const mobileActions = useMemo(
    () => [
      ...(canImport
        ? [
            {
              key: 'import',
              label: txt('common.import'),
              icon: Upload,
              onClick: onImport,
              description: txt('department.importDeveloping'),
            },
          ]
        : []),
      ...(canExport
        ? [
            {
              key: 'export',
              label: txt('common.export'),
              icon: Download,
              onClick: onExport,
              description: '',
            },
          ]
        : []),
    ],
    [onImport, onExport, canImport, canExport]
  );

  const renderActions = (
    <>
      <div className="hidden sm:flex items-center gap-2">
        {canImport && (
          <Tooltip content={txt('common.import')} placement="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </Tooltip>
        )}
        {canExport && (
          <Tooltip content={txt('common.export')} placement="bottom">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
            >
              <Download className="w-4 h-4" />
            </Button>
          </Tooltip>
        )}
      </div>
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.addNew')}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      selectedCount={selectedCount}
      onDeleteMany={canDelete ? onDeleteMany : undefined}
      onStatusChangeMany={canEdit ? onStatusChangeMany : undefined}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      showBack
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
    />
  );
};

export default PhongBanToolbar;
