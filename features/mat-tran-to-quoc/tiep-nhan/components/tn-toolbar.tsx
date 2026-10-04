import React, { useMemo } from 'react';
import { Activity, Building2, CreditCard, Download, HandHeart, Plus, type LucideIcon } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useKhoDotCuuTroList } from '../../dot-cuu-tro/hooks/use-kho-dot-cuu-tro';
import { useKhoDonViCuuTroList } from '../../don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { useTiepNhanStore } from '../store/useTiepNhanStore';
import type { TiepNhanFilters } from '../core/types';
import { TN_HINH_THUC_VALUES, TN_TRANG_THAI_VALUES } from '../core/constants';

type ChipKey = Exclude<keyof TiepNhanFilters, 'columnSearch'>;

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

const TnToolbar: React.FC<Props> = ({ onPageBack, onAdd, onExport, onDeleteMany }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('matTranTiepNhan');
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
  } = useTiepNhanStore();

  // Danh mục (client-side, có trần) — không suy từ trang đang xem vì danh sách phân trang server.
  const { data: chuongTrinh = [] } = useKhoDotCuuTroList();
  const { data: nhaTaiTro = [] } = useKhoDonViCuuTroList();

  const specs = useMemo(
    (): { key: ChipKey; label: string; icon: LucideIcon; options: { value: string; label: string }[] }[] => [
      { key: 'trang_thai_filter', label: txt('matTranTiepNhan.store.trangThaiCol'), icon: Activity, options: toOptions(TN_TRANG_THAI_VALUES) },
      { key: 'hinh_thuc_filter', label: txt('matTranTiepNhan.store.hinhThucCol'), icon: CreditCard, options: toOptions(TN_HINH_THUC_VALUES) },
      {
        key: 'chuong_trinh_filter',
        label: txt('matTranTiepNhan.store.chuongTrinhCol'),
        icon: HandHeart,
        options: chuongTrinh.map((c) => ({ value: c.id, label: c.ten })),
      },
      {
        key: 'nha_tai_tro_filter',
        label: txt('matTranTiepNhan.store.nhaTaiTroCol'),
        icon: Building2,
        options: [...nhaTaiTro].sort((a, b) => a.ten.localeCompare(b.ten, 'vi')).map((d) => ({ value: d.id, label: d.ten })),
      },
    ],
    [chuongTrinh, nhaTaiTro],
  );

  const activeFilterCount =
    (searchTerm ? 1 : 0) + specs.filter((s) => filters[s.key].length > 0).length;

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    for (const s of specs) setFilter(s.key, []);
  };

  const filterGroups = specs.map((s) => ({
    key: s.key,
    label: s.label,
    icon: s.icon,
    options: s.options,
    value: filters[s.key],
    onChange: (vals: string[]) => setFilter(s.key, vals),
  }));

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {specs.map((s) => (
        <FilterChipMultiSelect
          key={s.key}
          options={s.options}
          value={filters[s.key]}
          onChange={(vals) => setFilter(s.key, vals)}
          placeholder={s.label}
          icon={s.icon}
          className="shrink-0"
        />
      ))}
    </div>
  );

  const mobileActions: ActionItem[] = canExport
    ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
    : [];

  const renderActions = (
    <>
      {canExport && (
        <div className="hidden sm:flex items-center gap-2">
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
        </div>
      )}
      {canCreate && (
        <Button
          onClick={onAdd}
          size="sm"
          className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
        >
          <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
          <span className="hidden sm:inline">{txt('common.add')}</span>
        </Button>
      )}
    </>
  );

  return (
    <GenericToolbar
      selectedCount={selectedIds.size}
      searchTerm={searchTerm}
      onSearchChange={setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      mobileActions={mobileActions}
      onAdd={canCreate ? onAdd : undefined}
      filters={filtersSlot}
      filterGroups={filterGroups}
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

export default TnToolbar;
