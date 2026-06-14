import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import ExportDialog from '@/components/shared/ExportDialog';
import PbxhThietLapToolbar from './pbxh-thiet-lap-toolbar';
import PbxhThietLapTable from './pbxh-thiet-lap-table';
import type { GenericState } from '@/store/createGenericStore';
import { useDeletePbxhThietLap } from '../hooks/use-pbxh-thiet-lap';
import type { PbxhThietLap, PbxhThietLapFilters, PbxhThietLapLoai } from '../core/types';
import { pbxhMatchesColumnSearch } from '../utils/column-search';
import { getPbxhThietLapColumnDisplayValue } from '../utils/column-display';
import { PBXH_THIET_LAP_SEARCH_KEYS } from '../utils/search-keys';

const PbxhThietLapForm = lazy(() => import('./pbxh-thiet-lap-form'));
const PbxhThietLapDetail = lazy(() => import('./pbxh-thiet-lap-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

type FormOrigin = 'list' | 'detail';

export interface PbxhThietLapListPanelProps {
  loai: PbxhThietLapLoai;
  items: PbxhThietLap[];
  isLoading: boolean;
  store: GenericState<PbxhThietLapFilters>;
  tabGroup: React.ReactNode;
  onPageBack: () => void;
}

export function PbxhThietLapListPanel({ loai, items, isLoading, store, tabGroup, onPageBack }: PbxhThietLapListPanelProps) {
  const confirm = useConfirmStore((s) => s.confirm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PbxhThietLap | null>(null);
  const [viewing, setViewing] = useState<PbxhThietLap | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } = store;

  const deleteMut = useDeletePbxhThietLap();

  useEffect(() => () => resetState(), [resetState]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = items.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [items, viewing]);

  const filterFn = useCallback(
    (item: PbxhThietLap, term: string, f: PbxhThietLapFilters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...PBXH_THIET_LAP_SEARCH_KEYS],
      );
      const mo = (item.mo_ta ?? '').trim();
      if (f.mo_ta_bucket === 'has' && !mo) return false;
      if (f.mo_ta_bucket === 'empty' && mo) return false;
      const matchesCol = pbxhMatchesColumnSearch(item, f.columnSearch, f.mo_ta_bucket);
      return matchesSearch && matchesCol;
    },
    [],
  );

  const filteredRows = useListWithFilter(items, searchTerm, filters, filterFn);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    if (sort.column && sort.direction) {
      const key = sort.column as keyof PbxhThietLap;
      sorted.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      sorted.sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, getLanguage()));
    }
    return sorted;
  }, [filteredRows, sort.column, sort.direction]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten', label: txt('page.articleSettings.colTen') },
      { key: 'mo_ta', label: txt('page.articleSettings.colMoTa') },
      { key: 'thu_tu', label: txt('page.articleSettings.colThuTu') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: PbxhThietLap) => ({
      ten: item.ten,
      mo_ta: getPbxhThietLapColumnDisplayValue(item, 'mo_ta'),
      thu_tu: item.thu_tu,
    }),
    [],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: filteredRows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  const visibleColumnKeys = useMemo(() => {
    type Col = (typeof columns)[number];
    return columns.filter((c: Col) => c.visible).map((c: Col) => c.id);
  }, [columns]);

  const handleEdit = (item: PbxhThietLap) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('page.pbxhThietLap.deleteTitle'),
      message: txt('page.pbxhThietLap.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMut.mutate([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('page.pbxhThietLap.bulkDeleteTitle'),
      message: txt('page.pbxhThietLap.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMut.mutate(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewing && ids.includes(viewing.id)) setViewing(null);
          },
        });
      },
    });
  };

  const handleExport = () => {
    if (filteredRows.length === 0) {
      toast.warning(txt('page.articleSettings.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && viewing && wasEditing && viewing.id === wasEditing.id) {
      const fresh = items.find((r) => r.id === viewing.id);
      if (fresh) setViewing(fresh);
    }
    setFormOrigin('list');
  };

  const exportFileName = `PBXH_ThietLap_${loai}`;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full min-w-0">
      <PbxhThietLapToolbar
        store={store}
        items={items}
        tabSlot={tabGroup}
        onPageBack={onPageBack}
        onExport={handleExport}
        onDeleteMany={handleDeleteMany}
        onAdd={() => {
          startTransition(() => {
            setFormOrigin('list');
            setEditing(null);
            setShowForm(true);
          });
        }}
      />
      <div className="flex-1 min-h-0">
        <PbxhThietLapTable
          store={store}
          data={sortedRows}
          isLoading={isLoading}
          onRowClick={setViewing}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyTitle={txt('page.pbxhThietLap.empty')}
        />
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <PbxhThietLapForm loai={loai} initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <PbxhThietLapDetail data={viewing} onClose={() => setViewing(null)} onEdit={handleEdit} onDelete={handleDelete} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExport && (
          <ExportDialog
            open={showExport}
            onClose={() => setShowExport(false)}
            columns={EXPORT_COLUMNS}
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
}
