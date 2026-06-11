import React, { useMemo } from 'react';
import { Plus, Download, Upload, User, ListChecks, Users, Building2, MapPin } from 'lucide-react';
import type { ActionItem } from '@/components/ui/MobileActionsSheet';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { useThamHoiCaNhanStore } from '../store/useThamHoiCaNhanStore';
import { countThamHoiCaNhanColumnSearchActive } from '../utils/column-search';
import { TRANG_THAI_VALUES, DON_VI_THAM_HOI_CQMTTQ_VALUE, DON_VI_THAM_HOI_CQMTTQ_LABEL } from '../core/constants';
import type { ThamHoiCaNhan } from '../core/types';

interface Props {
  onPageBack: () => void;
  onAdd: () => void;
  onExport: () => void;
  onImport: () => void;
  onDeleteMany: (ids: string[]) => void;
  items?: ThamHoiCaNhan[] | null;
}

const ThamHoiCaNhanToolbar: React.FC<Props> = ({
  onPageBack,
  onAdd,
  onExport,
  onImport,
  onDeleteMany,
  items,
}) => {
  const { canCreate, canImport, canExport, canDelete } = useResourcePermissions('danTocThamHoiCaNhan');
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
    setSort,
  } = useThamHoiCaNhanStore();

  const selectedCount = selectedIds.size;

  const trangThaiOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of itemRows) {
      const key = r.trang_thai?.trim();
      if (!key) continue;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const v of TRANG_THAI_VALUES) {
      if (!map.has(v)) map.set(v, 0);
    }
    return [...map.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const caNhanOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      if (!r.ca_nhan_id) continue;
      const label = r.ho_va_ten?.trim() || r.ca_nhan_id;
      const cur = map.get(r.ca_nhan_id);
      if (cur) cur.count += 1;
      else map.set(r.ca_nhan_id, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const phongBanOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      if (!r.phong_ban_tham_muu_id) continue;
      const label = r.ten_phong_ban?.trim() || r.phong_ban_tham_muu_id;
      const cur = map.get(r.phong_ban_tham_muu_id);
      if (cur) cur.count += 1;
      else map.set(r.phong_ban_tham_muu_id, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const donViThamHoiOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    let cqmttqCount = 0;
    for (const r of itemRows) {
      if (r.don_vi_tham_hoi_id == null || r.don_vi_tham_hoi_id === '') {
        cqmttqCount += 1;
        continue;
      }
      const label = r.ten_don_vi_tham_hoi?.trim() || r.don_vi_tham_hoi_id;
      const cur = map.get(r.don_vi_tham_hoi_id);
      if (cur) cur.count += 1;
      else map.set(r.don_vi_tham_hoi_id, { label, count: 1 });
    }
    const options = [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    return [
      { value: DON_VI_THAM_HOI_CQMTTQ_VALUE, label: DON_VI_THAM_HOI_CQMTTQ_LABEL, count: cqmttqCount },
      ...options,
    ];
  }, [itemRows]);

  const xaPhuongOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of itemRows) {
      if (!r.xa_phuong_id) continue;
      const label = r.ten_xa_phuong?.trim() || r.xa_phuong_id;
      const cur = map.get(r.xa_phuong_id);
      if (cur) cur.count += 1;
      else map.set(r.xa_phuong_id, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [itemRows]);

  const activeFilterCount = useMemo(() => {
    return (
      (searchTerm ? 1 : 0) +
      countThamHoiCaNhanColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.trang_thai_filter.length > 0 ? 1 : 0) +
      (filters.ca_nhan_filter.length > 0 ? 1 : 0) +
      (filters.phong_ban_filter.length > 0 ? 1 : 0) +
      (filters.don_vi_tham_hoi_filter.length > 0 ? 1 : 0) +
      (filters.xa_phuong_filter.length > 0 ? 1 : 0) +
      (filters.dip_tham_hoi_filter.length > 0 ? 1 : 0)
    );
  }, [searchTerm, filters]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    useThamHoiCaNhanStore.getState().setFilter('columnSearch', {});
    setFilter('trang_thai_filter', []);
    setFilter('ca_nhan_filter', []);
    setFilter('phong_ban_filter', []);
    setFilter('don_vi_tham_hoi_filter', []);
    setFilter('xa_phuong_filter', []);
    setFilter('dip_tham_hoi_filter', []);
    setSort(null, null);
  };

  const filtersSlot = useMemo(
    () => (
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <FilterChipMultiSelect
          options={trangThaiOptions}
          value={filters.trang_thai_filter}
          onChange={(val) => setFilter('trang_thai_filter', val)}
          placeholder={txt('danTocThamHoiCaNhan.store.trangThaiCol')}
          icon={ListChecks}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,26vw)] sm:max-w-[240px]"
        />
        <FilterChipMultiSelect
          options={caNhanOptions}
          value={filters.ca_nhan_filter}
          onChange={(val) => setFilter('ca_nhan_filter', val)}
          placeholder={txt('danTocThamHoiCaNhan.store.hoVaTenCol')}
          icon={User}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={phongBanOptions}
          value={filters.phong_ban_filter}
          onChange={(val) => setFilter('phong_ban_filter', val)}
          placeholder={txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol')}
          icon={Users}
          className="shrink-0 w-full min-w-0 sm:w-[min(240px,30vw)] sm:max-w-[300px]"
        />
        <FilterChipMultiSelect
          options={donViThamHoiOptions}
          value={filters.don_vi_tham_hoi_filter}
          onChange={(val) => setFilter('don_vi_tham_hoi_filter', val)}
          placeholder={txt('danTocThamHoiCaNhan.store.donViThamHoiCol')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
        <FilterChipMultiSelect
          options={xaPhuongOptions}
          value={filters.xa_phuong_filter}
          onChange={(val) => setFilter('xa_phuong_filter', val)}
          placeholder={txt('danTocThamHoiCaNhan.store.donViXaPhuongCol')}
          icon={MapPin}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,28vw)] sm:max-w-[280px]"
        />
      </div>
    ),
    [trangThaiOptions, caNhanOptions, phongBanOptions, donViThamHoiOptions, xaPhuongOptions, filters, setFilter],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'trang_thai_filter',
        label: txt('danTocThamHoiCaNhan.store.trangThaiCol'),
        icon: ListChecks,
        options: trangThaiOptions,
        value: filters.trang_thai_filter,
        onChange: (val: string[]) => setFilter('trang_thai_filter', val),
      },
      {
        key: 'ca_nhan_filter',
        label: txt('danTocThamHoiCaNhan.store.hoVaTenCol'),
        icon: User,
        options: caNhanOptions,
        value: filters.ca_nhan_filter,
        onChange: (val: string[]) => setFilter('ca_nhan_filter', val),
      },
      {
        key: 'phong_ban_filter',
        label: txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol'),
        icon: Users,
        options: phongBanOptions,
        value: filters.phong_ban_filter,
        onChange: (val: string[]) => setFilter('phong_ban_filter', val),
      },
      {
        key: 'don_vi_tham_hoi_filter',
        label: txt('danTocThamHoiCaNhan.store.donViThamHoiCol'),
        icon: Building2,
        options: donViThamHoiOptions,
        value: filters.don_vi_tham_hoi_filter,
        onChange: (val: string[]) => setFilter('don_vi_tham_hoi_filter', val),
      },
      {
        key: 'xa_phuong_filter',
        label: txt('danTocThamHoiCaNhan.store.donViXaPhuongCol'),
        icon: MapPin,
        options: xaPhuongOptions,
        value: filters.xa_phuong_filter,
        onChange: (val: string[]) => setFilter('xa_phuong_filter', val),
      },
    ],
    [trangThaiOptions, caNhanOptions, phongBanOptions, donViThamHoiOptions, xaPhuongOptions, filters, setFilter],
  );

  const mobileActions = useMemo<ActionItem[]>(
    () => [
      ...(canImport
        ? [{ key: 'import', label: txt('common.import'), icon: Upload, onClick: onImport, description: '' }]
        : []),
      ...(canExport
        ? [{ key: 'export', label: txt('common.export'), icon: Download, onClick: onExport, description: '' }]
        : []),
    ],
    [canImport, canExport, onImport, onExport],
  );

  const renderActions = (
    <>
      <div className="hidden sm:flex items-center gap-2">
        {canImport ? (
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
      searchPlaceholder={txt('danTocThamHoiCaNhan.searchPlaceholder')}
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

export default ThamHoiCaNhanToolbar;
