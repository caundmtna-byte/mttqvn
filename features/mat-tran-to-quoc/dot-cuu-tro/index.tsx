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
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import ExportDialog from '@/components/shared/ExportDialog';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import {
  useKhoDotCuuTroList,
  useKhoDotCuuTroDetail,
  useDeleteKhoDotCuuTroMany,
} from './hooks/use-kho-dot-cuu-tro';
import { getKhoDotCuuTroById } from './services/kho-dot-cuu-tro-service';
import { useKhoDotCuuTroStore } from './store/useKhoDotCuuTroStore';
import type { KhoDotCuuTroDetail, KhoDotCuuTroListRow } from './core/types';
import { KHO_DOT_CUU_TRO_SEARCHABLE_KEYS } from './utils/search-keys';
import { countKhoDotCuuTroColumnSearchActive, khoDotCuuTroMatchesColumnSearch } from './utils/column-search';
import { sortKhoDotCuuTroList } from './utils/sort';
import KhoDotCuuTroToolbar from './components/kho-dot-cuu-tro-toolbar';
import KhoDotCuuTroTable from './components/kho-dot-cuu-tro-table';

const KhoDotCuuTroForm = lazy(() => import('./components/kho-dot-cuu-tro-form'));
const KhoDotCuuTroDetail = lazy(() => import('./components/kho-dot-cuu-tro-detail'));

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

const KhoDotCuuTroPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefCampaign');
  const matrixEnabled = isPermissionMatrixEnabled();
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  /** Tránh bật query khi ma trận chưa hydrate rồi hủy request — danh sách trống / cache lệch. */
  const listQueryEnabled = Boolean(
    user &&
      (user.role === 'admin' || !matrixEnabled || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    matrixEnabled &&
    user != null &&
    user.role !== 'admin' &&
    chucVuKey.trim() !== '' &&
    !matrixActive;

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranDotCuuTro.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KhoDotCuuTroDetail | null>(null);
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
  } = useKhoDotCuuTroStore();

  const { data: rows = [], isLoading } = useKhoDotCuuTroList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useKhoDotCuuTroDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteKhoDotCuuTroMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback(
    (item: KhoDotCuuTroListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...KHO_DOT_CUU_TRO_SEARCHABLE_KEYS],
      );
      if (!khoDotCuuTroMatchesColumnSearch(item, f.columnSearch)) return false;
      const link = (item.link ?? '').trim();
      if (f.link_bucket === 'has' && !link) return false;
      if (f.link_bucket === 'empty' && link) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => sortKhoDotCuuTroList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'tt', label: txt('matTranDotCuuTro.store.ttCol') },
      { key: 'ten', label: txt('matTranDotCuuTro.store.tenCol') },
      { key: 'link', label: txt('matTranDotCuuTro.store.linkCol') },
      { key: 'tg_tao', label: txt('matTranDotCuuTro.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('matTranDotCuuTro.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: KhoDotCuuTroListRow) => ({
      tt: item.tt,
      ten: item.ten,
      link: item.link ?? '',
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
      countKhoDotCuuTroColumnSearchActive(cs) > 0 ||
      filters.link_bucket === 'has' ||
      filters.link_bucket === 'empty' ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters.columnSearch, filters.link_bucket, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('matTranDotCuuTro.emptyTitle'),
    [sorted.length, rows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('matTranDotCuuTro.emptyFilteredHint')
        : txt('matTranDotCuuTro.emptyHint'),
    [sorted.length, rows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    if (!rows.some((r) => r.id === viewingId)) {
      setViewingId(null);
    }
  }, [rows, viewingId]);

  const handleEditFromList = useCallback(
    (item: KhoDotCuuTroListRow) => {
      void queryClient
        .fetchQuery({
          queryKey: queryKeys.khoDotCuuTro.detail(item.id),
          queryFn: () => getKhoDotCuuTroById(item.id),
          ...transactionalCrudListQueryOptions,
        })
        .then((full) => {
          startTransition(() => {
            setFormOrigin('list');
            setEditing(full ?? { ...item, mo_ta: null });
            setShowForm(true);
          });
        })
        .catch(() => {
          toast.error(txt('matTranDotCuuTro.service.notFound'));
        });
    },
    [queryClient],
  );

  const handleEditFromDetail = (d: KhoDotCuuTroDetail) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranDotCuuTro.deleteTitle'),
      message: txt('matTranDotCuuTro.deleteMessage'),
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
      title: txt('matTranDotCuuTro.bulkDeleteTitle'),
      message: txt('matTranDotCuuTro.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('matTranDotCuuTro.noExportData'));
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoDotCuuTro.detail(vid) });
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
        <KhoDotCuuTroToolbar
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
          <KhoDotCuuTroTable
            data={sorted}
            isLoading={isListLoading}
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
            <KhoDotCuuTroForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDotCuuTroDetail
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
            fileName={txt('matTranDotCuuTro.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KhoDotCuuTroPage;
