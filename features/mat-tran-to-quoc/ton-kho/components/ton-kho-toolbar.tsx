import React, { useMemo } from 'react';
import { Download } from 'lucide-react';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericToolbar from '@/components/shared/GenericToolbar';
import { txt } from '@/lib/text';

interface Props {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  searchPlaceholder?: string;
  columns: ColumnConfig[];
  onToggleColumn: (id: string) => void;
  onReorderColumns: (fromIndex: number, toIndex: number) => void;
  onResetColumns: () => void;
  filters?: React.ReactNode;
  activeFilterCount?: number;
  onClearAllFilters?: () => void;
  filterGroups?: FilterGroup[];
  onExport?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  desktopStartSlot?: React.ReactNode;
  canExport?: boolean;
}

const TonKhoToolbar: React.FC<Props> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  columns,
  onToggleColumn,
  onReorderColumns,
  onResetColumns,
  filters,
  activeFilterCount = 0,
  onClearAllFilters,
  filterGroups,
  onExport,
  showBack,
  onBack,
  desktopStartSlot,
  canExport = true,
}) => {
  const mobileActions = useMemo(
    () =>
      canExport && onExport
        ? [{ key: 'export', label: txt('matTranTonKho.toolbar.export'), icon: Download, onClick: onExport }]
        : undefined,
    [canExport, onExport]
  );

  const actions =
    canExport && onExport ? (
      <button
        type="button"
        onClick={onExport}
        className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
      >
        {txt('matTranTonKho.toolbar.export')}
      </button>
    ) : undefined;

  return (
    <GenericToolbar
      selectedCount={0}
      searchTerm={searchTerm}
      onSearchChange={onSearchChange}
      onClearSelection={() => {}}
      searchPlaceholder={searchPlaceholder}
      columns={columns}
      onToggleColumn={onToggleColumn}
      onReorderColumns={onReorderColumns}
      onResetColumns={onResetColumns}
      filters={filters}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={onClearAllFilters}
      filterGroups={filterGroups}
      actions={actions}
      mobileActions={mobileActions}
      showBack={showBack}
      onBack={onBack}
      desktopStartSlot={desktopStartSlot}
    />
  );
};

export default TonKhoToolbar;
