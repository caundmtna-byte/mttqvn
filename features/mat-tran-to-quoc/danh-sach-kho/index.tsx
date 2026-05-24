import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { txt } from '@/lib/text';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import ExportDialog from '@/components/shared/ExportDialog';
import {
  useKhoDanhSachKhoList,
  useKhoDanhSachKhoDetail,
  useDeleteKhoDanhSachKhoMany,
} from './hooks/use-kho-danh-sach-kho';
import { useKhoDanhSachKhoStore } from './store/useKhoDanhSachKhoStore';
import type { KhoDanhSachKhoListRow } from './core/types';
import { KHO_DANH_SACH_KHO_SEARCHABLE_KEYS } from './utils/search-keys';
import { countKhoDanhSachKhoColumnSearchActive, khoDanhSachKhoMatchesColumnSearch } from './utils/column-search';
import { sortKhoDanhSachKhoList } from './utils/sort';
import KhoDanhSachKhoToolbar from './components/kho-danh-sach-kho-toolbar';
import KhoDanhSachKhoTable from './components/kho-danh-sach-kho-table';

const KhoDanhSachKhoForm = lazy(() => import('./components/kho-danh-sach-kho-form'));
const KhoDanhSachKhoDetail = lazy(() => import('./components/kho-danh-sach-kho-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div
      className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"
      aria-hidden
    />
  </div>
);

type FormOrigin = 'list' | 'detail';

const KhoDanhSachKhoPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefWarehouseList');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranKhoDanhSach.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KhoDanhSachKhoListRow | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const {
    searchTerm,
    filters,
    sort,
    resetState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
  } = useKhoDanhSachKhoStore();

  const { data: rows = [], isLoading } = useKhoDanhSachKhoList({ enabled: canView });
  const { data: viewingData } = useKhoDanhSachKhoDetail(viewingId, { enabled: canView });
  const deleteMutation = useDeleteKhoDanhSachKhoMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback(
    (item: KhoDanhSachKhoListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...KHO_DANH_SACH_KHO_SEARCHABLE_KEYS],
      );
      if (!khoDanhSachKhoMatchesColumnSearch(item, f.columnSearch)) return false;
      if (f.don_vi_id.length > 0) {
        const dv = item.don_vi_id?.trim();
        if (!dv || !f.don_vi_id.includes(dv)) return false;
      }
      if (f.ten_tinh.length > 0) {
        const tinh = (item.ten_tinh ?? '').trim();
        if (!tinh || !f.ten_tinh.includes(tinh)) return false;
      }
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => sortKhoDanhSachKhoList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'tt', label: txt('matTranKhoDanhSach.store.ttCol') },
      { key: 'ten_kho', label: txt('matTranKhoDanhSach.store.tenKhoCol') },
      { key: 'ten_don_vi', label: txt('matTranKhoDanhSach.store.donViCol') },
      { key: 'ten_tinh', label: txt('matTranKhoDanhSach.store.tinhCol') },
      { key: 'mo_ta', label: txt('matTranKhoDanhSach.store.moTaCol') },
      { key: 'tg_tao', label: txt('matTranKhoDanhSach.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('matTranKhoDanhSach.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: KhoDanhSachKhoListRow) => ({
      tt: item.tt,
      ten_kho: item.ten_kho,
      ten_don_vi: item.ten_don_vi ?? '',
      ten_tinh: item.ten_tinh ?? '',
      mo_ta: item.mo_ta ?? '',
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: sorted,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [columns],
  );

  const hasListFilters = useMemo(() => {
    const cs = filters.columnSearch ?? {};
    return (
      Boolean(searchTerm?.trim()) ||
      countKhoDanhSachKhoColumnSearchActive(cs) > 0 ||
      filters.don_vi_id.length > 0 ||
      filters.ten_tinh.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters.columnSearch, filters.don_vi_id, filters.ten_tinh, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('matTranKhoDanhSach.emptyTitle'),
    [sorted.length, rows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('matTranKhoDanhSach.emptyFilteredHint')
        : txt('matTranKhoDanhSach.emptyHint'),
    [sorted.length, rows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.khoDanhSachKho.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleEditFromList = (item: KhoDanhSachKhoListRow) => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: KhoDanhSachKhoListRow) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranKhoDanhSach.deleteTitle'),
      message: txt('matTranKhoDanhSach.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate([id], {
          onSuccess: () => {
            if (viewingId === id) setViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('matTranKhoDanhSach.bulkDeleteTitle'),
      message: txt('matTranKhoDanhSach.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMutation.mutate(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewingId && ids.includes(viewingId)) setViewingId(null);
          },
        });
      },
    });
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.warning(txt('matTranKhoDanhSach.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    const vid = viewingId;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && vid && wasEditing && wasEditing.id === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoDanhSachKho.detail(vid) });
    }
    setFormOrigin('list');
  };

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <KhoDanhSachKhoToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          items={rows}
        />

        <div className="flex-1 min-h-0">
          <KhoDanhSachKhoTable
            data={sorted}
            isLoading={isLoading}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => setViewingId(item.id)}
            emptyTitle={emptyTitleResolved}
            emptyDescription={emptyDescriptionResolved}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDanhSachKhoForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDanhSachKhoDetail
              data={viewingData}
              onClose={() => setViewingId(null)}
              onEdit={handleEditFromDetail}
              onDelete={handleDelete}
            />
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
            fileName={txt('matTranKhoDanhSach.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KhoDanhSachKhoPage;
