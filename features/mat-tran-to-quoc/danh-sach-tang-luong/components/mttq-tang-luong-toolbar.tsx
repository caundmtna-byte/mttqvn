import React, { useMemo } from 'react';
import { TrendingUp, Plus, BarChart3, Building2, MapPin, Landmark, Calendar, Download, Briefcase } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericToolbar from '@/components/shared/GenericToolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { BTN_ADD } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useMttqTangLuongStore } from '../store/useMttqTangLuongStore';
import { countTangLuongColumnSearchActive } from '../utils/column-search';
import { useTangLuongChipOptions } from '../hooks/use-tang-luong-chip-options';
import type { MttqTangLuongKeHoachGroupMode, MttqTangLuongListRow } from '../core/types';
import type { TangLuongMainTab } from '../core/constants';

const noopSearch = () => {};

interface Props {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  mainTab: TangLuongMainTab;
  hideListControls?: boolean;
  onAdd?: () => void;
  onDeleteMany?: () => void;
  onExportThongKe?: () => void;
  statsYear?: number;
  onStatsYearChange?: (y: number) => void;
  keHoachYear?: number;
  onKeHoachYearChange?: (y: number) => void;
  keHoachGroupMode?: MttqTangLuongKeHoachGroupMode;
  onKeHoachGroupModeChange?: (m: MttqTangLuongKeHoachGroupMode) => void;
  items?: MttqTangLuongListRow[] | null;
}

const MttqTangLuongToolbar: React.FC<Props> = ({
  onPageBack,
  tabsSlot,
  mainTab,
  hideListControls = false,
  onAdd,
  onDeleteMany,
  onExportThongKe,
  statsYear,
  onStatsYearChange,
  keHoachYear,
  onKeHoachYearChange,
  keHoachGroupMode,
  onKeHoachGroupModeChange,
  items,
}) => {
  const { canCreate, canDelete, canExport } = useResourcePermissions('matTranSalaryIncreaseList');
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
  } = useMttqTangLuongStore();

  const loaiKyCountsRaw = useTangLuongChipOptions(itemRows, searchTerm, filters);

  const loaiKyOptions = loaiKyCountsRaw.loaiKy;
  const phongBanOptions = loaiKyCountsRaw.phongBan;
  const chucVuOptions = loaiKyCountsRaw.chucVu;
  const donViOptions = loaiKyCountsRaw.donVi;
  const toChucOptions = loaiKyCountsRaw.toChuc;

  const statsYearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => cur - 2 + i).map((y) => ({
      label: String(y),
      value: String(y),
    }));
  }, []);

  const keHoachYearOptions = statsYearOptions;

  const groupModeOptions = useMemo(
    () => [
      { label: txt('matTranTangLuong.keHoach.groupQuarter'), value: 'quarter' },
      { label: txt('matTranTangLuong.keHoach.groupMonth'), value: 'month' },
    ],
    [],
  );

  const keHoachYearChip = useMemo(() => {
    if (keHoachYear == null || !onKeHoachYearChange) return null;
    return (
      <FilterChipSingleSelect
        options={keHoachYearOptions}
        value={String(keHoachYear)}
        onChange={(v) => v && onKeHoachYearChange(Number(v))}
        placeholder={txt('matTranTangLuong.keHoach.yearLabel')}
        icon={Calendar}
        className="shrink-0 w-full min-w-0 sm:w-[min(140px,22vw)] sm:max-w-[160px]"
      />
    );
  }, [keHoachYear, keHoachYearOptions, onKeHoachYearChange]);

  const groupModeChip = useMemo(() => {
    if (!keHoachGroupMode || !onKeHoachGroupModeChange) return null;
    return (
      <FilterChipSingleSelect
        options={groupModeOptions}
        value={keHoachGroupMode}
        onChange={(v) =>
          onKeHoachGroupModeChange(v === 'month' || v === 'quarter' ? v : 'quarter')
        }
        placeholder={txt('matTranTangLuong.keHoach.groupQuarter')}
        icon={Calendar}
        className="shrink-0 w-full min-w-0 sm:w-[min(180px,28vw)] sm:max-w-[220px]"
      />
    );
  }, [groupModeOptions, keHoachGroupMode, onKeHoachGroupModeChange]);

  const statsYearChip = useMemo(() => {
    if (statsYear == null || !onStatsYearChange) return null;
    return (
      <FilterChipSingleSelect
        options={statsYearOptions}
        value={String(statsYear)}
        onChange={(v) => v && onStatsYearChange(Number(v))}
        placeholder={txt('matTranTangLuong.stats.yearFilter')}
        icon={BarChart3}
        className="shrink-0 w-full min-w-0 sm:w-[min(140px,22vw)] sm:max-w-[160px]"
      />
    );
  }, [onStatsYearChange, statsYear, statsYearOptions]);

  const activeFilterCount = useMemo(() => {
    if (mainTab === 'thong_ke') {
      return (
        (statsYear != null ? 1 : 0) +
        (filters.loai_ky?.length ? 1 : 0) +
        (filters.phong_ban_id?.length ? 1 : 0)
      );
    }
    if (mainTab === 'ke_hoach') {
      return (keHoachYear != null ? 1 : 0) + (keHoachGroupMode ? 1 : 0);
    }
    if (hideListControls) return 0;
    return (
      (searchTerm ? 1 : 0) +
      countTangLuongColumnSearchActive(filters.columnSearch ?? {}) +
      (filters.loai_ky?.length ? 1 : 0) +
      (filters.phong_ban_id?.length ? 1 : 0) +
      (filters.chuc_vu_id?.length ? 1 : 0) +
      (filters.don_vi_id?.length ? 1 : 0) +
      (filters.to_chuc_id?.length ? 1 : 0)
    );
  }, [hideListControls, keHoachGroupMode, keHoachYear, mainTab, searchTerm, filters, statsYear]);

  const handleClearAllFilters = () => {
    if (mainTab === 'ke_hoach') {
      onKeHoachYearChange?.(new Date().getFullYear());
      onKeHoachGroupModeChange?.('quarter');
      return;
    }
    if (mainTab === 'thong_ke') {
      onStatsYearChange?.(new Date().getFullYear());
      setFilter('loai_ky', []);
      setFilter('phong_ban_id', []);
      return;
    }
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('loai_ky', []);
    setFilter('phong_ban_id', []);
    setFilter('chuc_vu_id', []);
    setFilter('don_vi_id', []);
    setFilter('to_chuc_id', []);
    setSort(null, null);
  };

  const listFilterGroups = useMemo(
    () => [
      {
        key: 'loai_ky',
        label: txt('matTranTangLuong.filterLoaiKy'),
        icon: TrendingUp,
        options: loaiKyOptions,
        value: filters.loai_ky ?? [],
        onChange: (vals: string[]) => setFilter('loai_ky', vals),
      },
      {
        key: 'phong_ban_id',
        label: txt('matTranTangLuong.filterPhongBan'),
        icon: Building2,
        options: phongBanOptions,
        value: filters.phong_ban_id ?? [],
        onChange: (vals: string[]) => setFilter('phong_ban_id', vals),
      },
      {
        key: 'chuc_vu_id',
        label: txt('matTranTangLuong.filterChucVu'),
        icon: Briefcase,
        options: chucVuOptions,
        value: filters.chuc_vu_id ?? [],
        onChange: (vals: string[]) => setFilter('chuc_vu_id', vals),
      },
      {
        key: 'don_vi_id',
        label: txt('matTranTangLuong.filterDonVi'),
        icon: MapPin,
        options: donViOptions,
        value: filters.don_vi_id ?? [],
        onChange: (vals: string[]) => setFilter('don_vi_id', vals),
      },
      {
        key: 'to_chuc_id',
        label: txt('matTranTangLuong.filterToChuc'),
        icon: Landmark,
        options: toChucOptions,
        value: filters.to_chuc_id ?? [],
        onChange: (vals: string[]) => setFilter('to_chuc_id', vals),
      },
    ],
    [
      loaiKyOptions,
      phongBanOptions,
      chucVuOptions,
      donViOptions,
      toChucOptions,
      filters.loai_ky,
      filters.phong_ban_id,
      filters.chuc_vu_id,
      filters.don_vi_id,
      filters.to_chuc_id,
      setFilter,
    ],
  );

  const statsFilterGroups = useMemo(
    () => [
      ...(statsYear == null || !onStatsYearChange
        ? []
        : [
            {
              key: 'stats_year',
              label: txt('matTranTangLuong.stats.yearFilter'),
              icon: BarChart3,
              options: statsYearOptions,
              value: [String(statsYear)],
              onChange: (vals: string[]) => {
                const pick = vals.length ? vals[vals.length - 1] : '';
                if (pick) onStatsYearChange(Number(pick));
              },
            },
          ]),
      {
        key: 'loai_ky',
        label: txt('matTranTangLuong.filterLoaiKy'),
        icon: TrendingUp,
        options: loaiKyOptions,
        value: filters.loai_ky ?? [],
        onChange: (vals: string[]) => setFilter('loai_ky', vals),
      },
      {
        key: 'phong_ban_id',
        label: txt('matTranTangLuong.filterPhongBan'),
        icon: Building2,
        options: phongBanOptions,
        value: filters.phong_ban_id ?? [],
        onChange: (vals: string[]) => setFilter('phong_ban_id', vals),
      },
    ],
    [
      loaiKyOptions,
      onStatsYearChange,
      phongBanOptions,
      filters.loai_ky,
      filters.phong_ban_id,
      setFilter,
      statsYear,
      statsYearOptions,
    ],
  );

  const keHoachFilterGroups = useMemo(
    () => [
      ...(keHoachYear == null || !onKeHoachYearChange
        ? []
        : [
            {
              key: 'ke_hoach_year',
              label: txt('matTranTangLuong.keHoach.yearLabel'),
              icon: Calendar,
              options: keHoachYearOptions,
              value: [String(keHoachYear)],
              onChange: (vals: string[]) => {
                const pick = vals.length ? vals[vals.length - 1] : '';
                if (pick) onKeHoachYearChange(Number(pick));
              },
            },
          ]),
      ...(keHoachGroupMode && onKeHoachGroupModeChange
        ? [
            {
              key: 'ke_hoach_group',
              label: txt('matTranTangLuong.keHoach.groupQuarter'),
              icon: Calendar,
              options: groupModeOptions,
              value: [keHoachGroupMode],
              onChange: (vals: string[]) => {
                const pick = vals.length ? vals[vals.length - 1] : '';
                if (pick === 'month' || pick === 'quarter') onKeHoachGroupModeChange(pick);
              },
            },
          ]
        : []),
    ],
    [
      groupModeOptions,
      keHoachGroupMode,
      keHoachYear,
      keHoachYearOptions,
      onKeHoachGroupModeChange,
      onKeHoachYearChange,
    ],
  );

  const filterGroups = useMemo(() => {
    if (mainTab === 'thong_ke') return statsFilterGroups;
    if (mainTab === 'ke_hoach') return keHoachFilterGroups;
    if (hideListControls) return [];
    return listFilterGroups;
  }, [hideListControls, keHoachFilterGroups, listFilterGroups, mainTab, statsFilterGroups]);

  const filtersSlot = useMemo(() => {
    if (mainTab === 'lich_su' && !hideListControls) {
      return (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <FilterChipMultiSelect
            options={loaiKyOptions}
            value={filters.loai_ky ?? []}
            onChange={(vals) => setFilter('loai_ky', vals)}
            placeholder={txt('matTranTangLuong.filterLoaiKy')}
            icon={TrendingUp}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[220px]"
          />
          <FilterChipMultiSelect
            options={phongBanOptions}
            value={filters.phong_ban_id ?? []}
            onChange={(vals) => setFilter('phong_ban_id', vals)}
            placeholder={txt('matTranTangLuong.filterPhongBan')}
            icon={Building2}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[240px]"
          />
          <FilterChipMultiSelect
            options={chucVuOptions}
            value={filters.chuc_vu_id ?? []}
            onChange={(vals) => setFilter('chuc_vu_id', vals)}
            placeholder={txt('matTranTangLuong.filterChucVu')}
            icon={Briefcase}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[240px]"
          />
          <FilterChipMultiSelect
            options={donViOptions}
            value={filters.don_vi_id ?? []}
            onChange={(vals) => setFilter('don_vi_id', vals)}
            placeholder={txt('matTranTangLuong.filterDonVi')}
            icon={MapPin}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[260px]"
          />
          <FilterChipMultiSelect
            options={toChucOptions}
            value={filters.to_chuc_id ?? []}
            onChange={(vals) => setFilter('to_chuc_id', vals)}
            placeholder={txt('matTranTangLuong.filterToChuc')}
            icon={Landmark}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[240px]"
          />
        </div>
      );
    }
    if (mainTab === 'thong_ke') {
      return (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {statsYearChip}
          <FilterChipMultiSelect
            options={loaiKyOptions}
            value={filters.loai_ky ?? []}
            onChange={(vals) => setFilter('loai_ky', vals)}
            placeholder={txt('matTranTangLuong.filterLoaiKy')}
            icon={TrendingUp}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[220px]"
          />
          <FilterChipMultiSelect
            options={phongBanOptions}
            value={filters.phong_ban_id ?? []}
            onChange={(vals) => setFilter('phong_ban_id', vals)}
            placeholder={txt('matTranTangLuong.filterPhongBan')}
            icon={Building2}
            className="shrink-0 w-full min-w-0 sm:w-[min(200px,28vw)] sm:max-w-[240px]"
          />
        </div>
      );
    }
    if (mainTab === 'ke_hoach') {
      return (
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {keHoachYearChip}
          {groupModeChip}
        </div>
      );
    }
    return null;
  }, [
    chucVuOptions,
    donViOptions,
    filters.chuc_vu_id,
    filters.don_vi_id,
    filters.loai_ky,
    filters.phong_ban_id,
    filters.to_chuc_id,
    groupModeChip,
    hideListControls,
    keHoachYearChip,
    loaiKyOptions,
    mainTab,
    phongBanOptions,
    setFilter,
    statsYearChip,
    toChucOptions,
  ]);

  const searchTrailing = useMemo(() => {
    if (mainTab === 'thong_ke' && statsYearChip) {
      return <div className="sm:hidden shrink-0">{statsYearChip}</div>;
    }
    if (mainTab === 'ke_hoach' && keHoachYearChip) {
      return <div className="sm:hidden shrink-0">{keHoachYearChip}</div>;
    }
    return undefined;
  }, [keHoachYearChip, mainTab, statsYearChip]);

  const renderActions = useMemo(
    () => (
      <>
        {canExport && onExportThongKe && mainTab === 'thong_ke' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExportThongKe}
            className="inline-flex h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
            title={txt('common.export')}
            aria-label={txt('common.export')}
          >
            <Download className="w-4 h-4" />
          </Button>
        ) : null}
        {canCreate && onAdd && mainTab === 'lich_su' ? (
          <Button
            type="button"
            onClick={onAdd}
            size="sm"
            className="bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 h-9 px-3 sm:px-4"
          >
            <Plus className="w-5 h-5 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">{BTN_ADD()}</span>
          </Button>
        ) : null}
      </>
    ),
    [canCreate, canExport, mainTab, onAdd, onExportThongKe],
  );

  return (
    <GenericToolbar
      selectedCount={selectedIds.size}
      searchTerm={hideListControls ? '' : searchTerm}
      onSearchChange={hideListControls ? noopSearch : setSearchTerm}
      onClearSelection={clearSelection}
      actions={renderActions}
      filters={filtersSlot}
      filterGroups={filterGroups}
      mobileActions={[]}
      searchPlaceholder={txt('matTranTangLuong.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      columns={hideListControls ? undefined : columns}
      onToggleColumn={hideListControls ? undefined : toggleColumn}
      onReorderColumns={hideListControls ? undefined : reorderColumns}
      onResetColumns={hideListControls ? undefined : resetColumns}
      showBack
      onBack={onPageBack}
      desktopStartSlot={tabsSlot}
      hideSearch={hideListControls}
      searchTrailing={searchTrailing}
      onAdd={canCreate && onAdd && mainTab === 'lich_su' ? onAdd : undefined}
      onDeleteMany={canDelete && mainTab === 'lich_su' ? onDeleteMany : undefined}
    />
  );
};

export default MttqTangLuongToolbar;
