/**
 * createFeatureModule – Factory tạo trang quản lý CRUD chuẩn.
 *
 * Gom pattern chung của các module (list + stats tabs, toolbar, table,
 * form drawer, detail drawer, import/export dialogs) thành config declarative.
 *
 * Usage:
 * ```tsx
 * const EmployeePage = createFeatureModule<Employee, EmployeeFilters>({
 *   name: 'Nhân viên',
 *   useData: useEmployees,
 *   useStore: useEmployeeStore,
 *   ...
 * });
 * ```
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTabSearchParam } from '../hooks/use-tab-search-param';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { List, BarChart3 } from 'lucide-react';
import TabGroup, { Tab } from '../components/ui/TabGroup';
import ImportDialog from '../components/shared/ImportDialog';
import ExportDialog from '../components/shared/ExportDialog';
import { getLanguage } from './utils';
import { useListWithFilter } from './hooks';
import { useExportData } from './useExportData';
import type { GenericState } from '../store/createGenericStore';

/* ──────────────────────────────────────────────────── */
/*  Types                                               */
/* ──────────────────────────────────────────────────── */

interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
}

interface ExportColumn {
  key: string;
  label: string;
}

interface FeatureModuleConfig<T, TFilters> {
  /** Tên module hiển thị (VD: 'Nhân viên') */
  name: string;

  /** Hook lấy danh sách data */
  useData: () => { data?: T[]; isLoading: boolean };

  /** Zustand store (từ createGenericStore) */
  useStore: () => GenericState<TFilters>;

  /** Hàm lấy id từ item */
  keyExtractor: (item: T) => string;

  /** Hàm filter client-side */
  filterFn: (item: T, searchTerm: string, filters: TFilters) => boolean;

  /** Component bảng dữ liệu */
  TableComponent: React.ComponentType<{
    data: T[];
    isLoading: boolean;
    onEdit: (item: T) => void;
    onView: (item: T) => void;
    onDelete: (id: string) => void;
    onStatusChange?: (item: T) => void;
  }>;

  /** Component toolbar */
  ToolbarComponent: React.ComponentType<{
    onAdd: () => void;
    onExport: () => void;
    onImport: () => void;
    onDeleteMany: (ids: string[]) => void;
    onStatusChangeMany?: (ids: string[], status: import('@/lib/constants/trang-thai').TrangThaiHoatDong) => void;
    onBulkEdit?: () => void;
  }>;

  /** Component form (drawer) */
  FormComponent: React.ComponentType<{
    initialData?: T | null;
    onClose: () => void;
  }>;

  /** Component detail (drawer) */
  DetailComponent: React.ComponentType<{
    data: T;
    onClose: () => void;
    onEdit: (item: T) => void;
    onDelete: (id: string) => void;
  }>;

  /** Component thống kê (optional) */
  StatsComponent?: React.ComponentType<{
    data: T[];
    isLoading: boolean;
  }>;

  /** Import/Export config */
  importColumns: ImportColumn[];
  exportColumns: ExportColumn[];
  exportMapFn: (item: T) => Record<string, unknown>;
  exportFileName: string;
  importFileName: string;

  /** Hooks cho mutation */
  useDeleteMutation: () => { mutateAsync: (ids: string[]) => Promise<unknown> };

  /** Hàm import data */
  onImportData?: (data: Record<string, unknown>[]) => Promise<void>;
}

/* ──────────────────────────────────────────────────── */
/*  Factory                                             */
/* ──────────────────────────────────────────────────── */

export function createFeatureModule<T, TFilters>(
  config: FeatureModuleConfig<T, TFilters>
): React.FC {
  const {
    name,
    useData,
    useStore,
    keyExtractor,
    filterFn,
    TableComponent,
    ToolbarComponent,
    FormComponent,
    DetailComponent,
    StatsComponent,
    importColumns,
    exportColumns,
    exportMapFn,
    exportFileName,
    importFileName,
    useDeleteMutation,
    onImportData,
  } = config;

  const TABS: Tab[] = [
    { id: 'list', label: 'Danh sách', icon: List },
    ...(StatsComponent ? [{ id: 'stats', label: 'Thống kê', icon: BarChart3 }] : []),
  ];

  const FeaturePage: React.FC = () => {
    const tabIds = useMemo(
      () => (StatsComponent ? (['list', 'stats'] as const) : (['list'] as const)),
      [StatsComponent],
    );
    const [activeTab, setActiveTab] = useTabSearchParam(tabIds, 'list');
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<T | null>(null);
    const [viewingItem, setViewingItem] = useState<T | null>(null);
    const [showImport, setShowImport] = useState(false);
    const [showExport, setShowExport] = useState(false);

    const {
      searchTerm, filters, sort, resetState,
      clearSelection, selectedIds, pagination, columns,
    } = useStore();

    const { data: rawData = [], isLoading } = useData();
    const deleteMutation = useDeleteMutation();

    useEffect(() => {
      return () => resetState();
    }, [resetState]);

    // filterFn/exportMapFn come from factory closure — stable for this page instance
    const stableFilterFn = useCallback(
      (item: T, searchTerm: string, filters: TFilters) =>
        filterFn(item, searchTerm, filters),
      [],
    );
    const filteredData = useListWithFilter(rawData, searchTerm, filters, stableFilterFn);

    const sortedData = useMemo(() => {
      if (!sort.column || !sort.direction) return filteredData;
      const sorted = [...filteredData];
      sorted.sort((a: T, b: T) => {
        const key = sort.column as keyof T;
        const aVal = a[key] ?? '';
        const bVal = b[key] ?? '';
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal).localeCompare(String(bVal), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
      return sorted;
    }, [filteredData, sort]);

    // Export
    const stableExportMapFn = useCallback(
      (item: T) => exportMapFn(item),
      [],
    );
    const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
      data: filteredData,
      isOpen: showExport,
      mapFn: stableExportMapFn,
      pagination,
      selectedIds,
      keyExtractor,
    });

    const visibleColumnKeys = useMemo(() => columns.filter(c => c.visible).map(c => c.id), [columns]);

    const handleEdit = (item: T) => {
      setEditingItem(item);
      setShowForm(true);
    };

    const handleView = (item: T) => setViewingItem(item);

    const handleDelete = async (id: string) => {
      await deleteMutation.mutateAsync([id]);
      if (viewingItem && keyExtractor(viewingItem) === id) setViewingItem(null);
      if (editingItem && keyExtractor(editingItem) === id) setShowForm(false);
    };

    const handleDeleteMany = async (ids: string[]) => {
      await deleteMutation.mutateAsync(ids);
      clearSelection();
    };

    const handleImportData = async (data: Record<string, unknown>[]) => {
      if (onImportData) await onImportData(data);
      else toast.success(`Import ${data.length} ${name.toLowerCase()} thành công`);
    };

    return (
      <div className="flex flex-col h-page">
        {TABS.length > 1 && (
          <div className="shrink-0">
            <TabGroup tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
          </div>
        )}

        {activeTab === 'list' ? (
          <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <ToolbarComponent
              onAdd={() => setShowForm(true)}
              onExport={() => setShowExport(true)}
              onImport={() => setShowImport(true)}
              onDeleteMany={handleDeleteMany}
            />
            <div className="flex-1 min-h-0">
              <TableComponent
                data={sortedData}
                isLoading={isLoading}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleDelete}
              />
            </div>
          </div>
        ) : StatsComponent ? (
          <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <StatsComponent data={rawData} isLoading={isLoading} />
          </div>
        ) : null}

        <AnimatePresence>
          {showForm && (
            <FormComponent
              initialData={editingItem}
              onClose={() => { setShowForm(false); setEditingItem(null); }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {viewingItem && !showForm && (
            <DetailComponent
              data={viewingItem}
              onClose={() => setViewingItem(null)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showImport && (
            <ImportDialog
              open={showImport}
              onClose={() => setShowImport(false)}
              columns={importColumns}
              onImport={handleImportData}
              templateFileName={importFileName}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showExport && (
            <ExportDialog
              open={showExport}
              onClose={() => setShowExport(false)}
              columns={exportColumns}
              data={exportData}
              paginatedData={paginatedExportData}
              selectedData={selectedExportData}
              fileName={exportFileName}
              visibleColumnKeys={visibleColumnKeys}
            />
          )}
        </AnimatePresence>
      </div>
    );
  };

  FeaturePage.displayName = `${name}Page`;
  return FeaturePage;
}
