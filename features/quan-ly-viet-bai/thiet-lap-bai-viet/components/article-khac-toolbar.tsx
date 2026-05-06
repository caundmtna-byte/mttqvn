import React, { useMemo } from 'react';
import { Plus, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { txt } from '@/lib/text';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import GenericToolbar from '@/components/shared/GenericToolbar';
import { BTN_ADD } from '@/lib/button-labels';
import type { GenericState } from '@/store/createGenericStore';
import type { ArticleKhacFilters } from '../core/types';
import { countKhacColumnSearchActive } from '../utils/column-search-khac';

interface Props {
  store: GenericState<ArticleKhacFilters>;
  /** Tiêu đề nhóm (vd. Trang đăng / Nguồn đăng) — hiển thị trong cùng hàng toolbar với tìm kiếm. */
  sectionTitle: string;
  onAdd: () => void;
  onExport: () => void;
  onDeleteMany: (ids: string[]) => void;
}

const sectionTitleSlot = (title: string) => (
  <div className="flex min-w-0 max-w-[34vw] sm:max-w-[min(13rem,38%)] md:max-w-none items-center border-l border-border/70 pl-2 sm:pl-3 -ml-0.5 sm:-ml-1">
    <span
      className="truncate text-xs font-semibold leading-tight text-primary sm:text-sm"
      title={title}
    >
      {title}
    </span>
  </div>
);

const ArticleKhacToolbar: React.FC<Props> = ({ store, sectionTitle, onAdd, onExport, onDeleteMany }) => {
  const { canCreate, canExport, canDelete } = useResourcePermissions('articleSettings');

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
  } = store;

  const activeFilterCount = useMemo(() => {
    const colN = countKhacColumnSearchActive(filters.columnSearch);
    return (searchTerm ? 1 : 0) + colN;
  }, [searchTerm, filters.columnSearch]);

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setFilter('columnSearch', {});
  };

  const mobileActions = useMemo(
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
          <span className="hidden sm:inline">{BTN_ADD()}</span>
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
      desktopStartSlot={sectionTitleSlot(sectionTitle)}
      searchPlaceholder={txt('common.searchPlaceholder')}
      activeFilterCount={activeFilterCount}
      onClearAllFilters={handleClearAllFilters}
      onDeleteMany={canDelete ? () => onDeleteMany(Array.from(selectedIds)) : undefined}
      columns={columns}
      onToggleColumn={toggleColumn}
      onReorderColumns={reorderColumns}
      onResetColumns={resetColumns}
      showBack={false}
    />
  );
};

export default ArticleKhacToolbar;
