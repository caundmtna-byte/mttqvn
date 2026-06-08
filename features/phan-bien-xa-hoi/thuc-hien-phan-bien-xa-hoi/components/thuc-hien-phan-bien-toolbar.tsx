import React, { useMemo } from 'react';
import { Plus, Download, Megaphone, ListChecks } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useThucHienPhanBienStore } from '../store/useThucHienPhanBienStore';
import { countThucHienColumnSearchActive } from '../utils/column-search';
import { CAP_THUC_HIEN_VALUES, LOAI_HINH_VALUES, TINH_TRANG_VALUES } from '../core/constants';
import type { ThucHienPhanBien } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: ThucHienPhanBien[] | null;
}

const ThucHienPhanBienToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('phanBienThucHien');
  const itemRows = Array.isArray(items) ? items : [];

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
  } = useThucHienPhanBienStore();

  const capOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.cap_thuc_hien?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of CAP_THUC_HIEN_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()].map(([value, count]) => ({ value, label: value, count }));
  }, [itemRows]);

  const loaiHinhOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.loai_hinh?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of LOAI_HINH_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()].map(([value, count]) => ({ value, label: value, count }));
  }, [itemRows]);

  const tinhTrangOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.tinh_trang?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of TINH_TRANG_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()].map(([value, count]) => ({ value, label: value, count }));
  }, [itemRows]);

  const donViChuTriOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      if (!r.don_vi_chu_tri_id) continue;
      const label = r.ten_don_vi_chu_tri?.trim() || r.don_vi_chu_tri_id;
      const cur = map.get(r.don_vi_chu_tri_id);
      if (cur) cur.count += 1;
      else map.set(r.don_vi_chu_tri_id, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const activeFilterCount = useMemo(() => {
    const colN = countThucHienColumnSearchActive(filters.columnSearch);
    const chipN =
      (filters.cap_thuc_hien_filter.length > 0 ? 1 : 0) +
      (filters.loai_hinh_filter.length > 0 ? 1 : 0) +
      (filters.tinh_trang_filter.length > 0 ? 1 : 0) +
      (filters.don_vi_chu_tri_filter.length > 0 ? 1 : 0);
    return (searchTerm ? 1 : 0) + colN + chipN;
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('cap_thuc_hien_filter', []);
    setFilter('loai_hinh_filter', []);
    setFilter('tinh_trang_filter', []);
    setFilter('don_vi_chu_tri_filter', []);
  };

  const filterGroups = useMemo(
    () => [
      {
        key: 'cap_thuc_hien_filter',
        label: txt('pbxhThucHien.store.capThucHienCol'),
        icon: Megaphone,
        options: capOptions,
        value: filters.cap_thuc_hien_filter,
        onChange: (vals: string[]) => setFilter('cap_thuc_hien_filter', vals),
      },
      {
        key: 'loai_hinh_filter',
        label: txt('pbxhThucHien.store.loaiHinhCol'),
        icon: ListChecks,
        options: loaiHinhOptions,
        value: filters.loai_hinh_filter,
        onChange: (vals: string[]) => setFilter('loai_hinh_filter', vals),
      },
      {
        key: 'tinh_trang_filter',
        label: txt('pbxhThucHien.store.tinhTrangCol'),
        icon: ListChecks,
        options: tinhTrangOptions,
        value: filters.tinh_trang_filter,
        onChange: (vals: string[]) => setFilter('tinh_trang_filter', vals),
      },
      {
        key: 'don_vi_chu_tri_filter',
        label: txt('pbxhThucHien.store.donViChuTriCol'),
        icon: Megaphone,
        options: donViChuTriOptions,
        value: filters.don_vi_chu_tri_filter,
        onChange: (vals: string[]) => setFilter('don_vi_chu_tri_filter', vals),
      },
    ],
    [capOptions, loaiHinhOptions, tinhTrangOptions, donViChuTriOptions, filters, setFilter],
  );

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={capOptions}
          value={filters.cap_thuc_hien_filter}
          onChange={(vals) => setFilter('cap_thuc_hien_filter', vals)}
          placeholder={txt('pbxhThucHien.store.capThucHienCol')}
          icon={Megaphone}
          className="shrink-0"
        />
        <FilterChipMultiSelect
          options={loaiHinhOptions}
          value={filters.loai_hinh_filter}
          onChange={(vals) => setFilter('loai_hinh_filter', vals)}
          placeholder={txt('pbxhThucHien.store.loaiHinhCol')}
          icon={ListChecks}
          className="shrink-0"
        />
        <FilterChipMultiSelect
          options={tinhTrangOptions}
          value={filters.tinh_trang_filter}
          onChange={(vals) => setFilter('tinh_trang_filter', vals)}
          placeholder={txt('pbxhThucHien.store.tinhTrangCol')}
          icon={ListChecks}
          className="shrink-0"
        />
      </div>
    ),
    [capOptions, loaiHinhOptions, tinhTrangOptions, filters, setFilter],
  );

  const mobileActions: ActionItem[] = useMemo(
    () =>
      canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : [],
    [canExport, onExport],
  );

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
      searchPlaceholder={txt('pbxhThucHien.searchPlaceholder')}
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

export default ThucHienPhanBienToolbar;
