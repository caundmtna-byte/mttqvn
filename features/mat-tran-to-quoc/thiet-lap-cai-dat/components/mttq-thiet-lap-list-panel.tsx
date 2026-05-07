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
import MttqThietLapToolbar from './mttq-thiet-lap-toolbar';
import MttqThietLapTable from './mttq-thiet-lap-table';
import type { GenericState } from '@/store/createGenericStore';
import { useDeleteMttqThietLap } from '../hooks/use-mttq-thiet-lap';
import type { MttqThietLap, MttqThietLapFilters, MttqThietLapLoai } from '../core/types';
import { mttqMatchesColumnSearch } from '../utils/column-search';
import { MTTQ_THIET_LAP_SEARCH_KEYS } from '../utils/search-keys';

const MttqThietLapForm = lazy(() => import('./mttq-thiet-lap-form'));
const MttqThietLapDetail = lazy(() => import('./mttq-thiet-lap-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

type FormOrigin = 'list' | 'detail';

export interface MttqThietLapListPanelProps {
  loai: MttqThietLapLoai;
  items: MttqThietLap[];
  isLoading: boolean;
  store: GenericState<MttqThietLapFilters>;
  tabGroup: React.ReactNode;
  onPageBack: () => void;
}

export function MttqThietLapListPanel({ loai, items, isLoading, store, tabGroup, onPageBack }: MttqThietLapListPanelProps) {
  const confirm = useConfirmStore((s) => s.confirm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqThietLap | null>(null);
  const [viewing, setViewing] = useState<MttqThietLap | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } = store;

  const deleteMut = useDeleteMttqThietLap();

  useEffect(() => () => resetState(), [resetState]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = items.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [items, viewing]);

  const filterFn = useCallback(
    (item: MttqThietLap, term: string, f: MttqThietLapFilters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...MTTQ_THIET_LAP_SEARCH_KEYS],
      );
      const mo = (item.mo_ta ?? '').trim();
      if (f.mo_ta_bucket === 'has' && !mo) return false;
      if (f.mo_ta_bucket === 'empty' && mo) return false;
      const matchesCol = mttqMatchesColumnSearch(item, f.columnSearch, f.mo_ta_bucket);
      return matchesSearch && matchesCol;
    },
    [],
  );

  const filteredRows = useListWithFilter(items, searchTerm, filters, filterFn);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    if (sort.column && sort.direction) {
      const key = sort.column as keyof MttqThietLap;
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
    (item: MttqThietLap) => ({
      ten: item.ten,
      mo_ta: item.mo_ta ?? '',
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

  const handleEdit = (item: MttqThietLap) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('page.matTranThietLap.deleteTitle'),
      message: txt('page.matTranThietLap.deleteMessage'),
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
      title: txt('page.matTranThietLap.bulkDeleteTitle'),
      message: txt('page.matTranThietLap.bulkDeleteMessage', { count: ids.length }),
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

  const exportFileName = `MTTQ_ThietLap_${loai}`;

  return (
    <div className="flex flex-1 min-h-0 flex-col w-full min-w-0">
      <MttqThietLapToolbar
        store={store}
        items={items}
        desktopStartSlot={
          <div className="min-w-0 max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-px">
            {tabGroup}
          </div>
        }
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
        <MttqThietLapTable
          store={store}
          data={sortedRows}
          isLoading={isLoading}
          onRowClick={setViewing}
          onEdit={handleEdit}
          onDelete={handleDelete}
          emptyTitle={txt('page.matTranThietLap.empty')}
        />
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqThietLapForm loai={loai} initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqThietLapDetail data={viewing} onClose={() => setViewing(null)} onEdit={handleEdit} onDelete={handleDelete} />
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
