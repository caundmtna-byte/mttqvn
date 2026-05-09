import React, { useMemo } from 'react';
import { Plus, Download, Upload, Tag, Users } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useMttqCanBoStore } from '../store/useMttqCanBoStore';
import { countMttqCanBoColumnSearchActive } from '../utils/column-search-count';

interface ChipOption {
  label: string;
  value: string;
  count?: number;
}

interface Props {
  onPageBack: () => void;
  trangThaiOptions: ChipOption[];
  gioiTinhOptions: ChipOption[];
  onAdd: () => void;
  onExport: () => void;
  onImport?: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const MttqCanBoToolbar: React.FC<Props> = ({
  onPageBack,
  trangThaiOptions,
  gioiTinhOptions,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('matTranOfficerList');

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    columns,
    toggleColumn,
    reorderColumns,
    resetColumns,
    selectedIds,
    clearSelection,
  } = useMttqCanBoStore();

  const selectedCount = selectedIds.size;

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countMttqCanBoColumnSearchActive(filters.columnSearch, filters.trang_thai_id, filters.gioi_tinh) +
      (filters.trang_thai_id.length > 0 ? 1 : 0) +
      (filters.gioi_tinh.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    const st = useMttqCanBoStore.getState();
    st.setFilter('columnSearch', {});
    st.setFilter('trang_thai_id', []);
    st.setFilter('gioi_tinh', []);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai_id}
          onChange={(val) => setFilter('trang_thai_id', val)}
          placeholder={txt('matTranCanBo.store.trangThaiCol')}
          icon={Tag}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={gioiTinhOptions}
          value={filters.gioi_tinh}
          onChange={(val) => setFilter('gioi_tinh', val)}
          placeholder={txt('matTranCanBo.store.gioiTinhCol')}
          icon={Users}
          className="shrink-0 w-full min-w-0 sm:w-[min(160px,22vw)] sm:max-w-[200px]"
        />
      </div>
    ),
    [trangThaiOptions, gioiTinhOptions, filters.trang_thai_id, filters.gioi_tinh, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai_id',
        label: txt('matTranCanBo.store.trangThaiCol'),
        icon: Tag,
        options: trangThaiOptions,
        value: filters.trang_thai_id,
        onChange: (val: string[]) => setFilter('trang_thai_id', val),
      },
      {
        key: 'gioi_tinh',
        label: txt('matTranCanBo.store.gioiTinhCol'),
        icon: Users,
        options: gioiTinhOptions,
        value: filters.gioi_tinh,
        onChange: (val: string[]) => setFilter('gioi_tinh', val),
      },
    ],
    [trangThaiOptions, gioiTinhOptions, filters.trang_thai_id, filters.gioi_tinh, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () => [
      ...(canImport && onImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, onImport, canExport, onExport],
  );

  const renderActions = (
    <>
      {(canImport && onImport) || canExport ? (
        <div className="hidden sm:flex items-center gap-2">
          {canImport && onImport ? (
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
          ) : null}
          {canExport ? (
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
          ) : null}
        </div>
      ) : null}
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
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      searchPlaceholder={txt('matTranCanBo.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack
      onBack={onPageBack}
    />
  );
};

export default MttqCanBoToolbar;
