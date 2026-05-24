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
import ErrorState from '@/components/shared/ErrorState';
import {
  useKhoDonViCuuTroList,
  useKhoDonViCuuTroDetail,
  useDeleteKhoDonViCuuTroMany,
} from './hooks/use-kho-don-vi-cuu-tro';
import { useKhoDonViCuuTroStore } from './store/useKhoDonViCuuTroStore';
import type { KhoDonViCuuTroListRow } from './core/types';
import { KHO_DON_VI_CUU_TRO_SEARCHABLE_KEYS } from './utils/search-keys';
import { countKhoDonViCuuTroColumnSearchActive, khoDonViCuuTroMatchesColumnSearch } from './utils/column-search';
import { sortKhoDonViCuuTroList } from './utils/sort';
import KhoDonViCuuTroToolbar from './components/kho-don-vi-cuu-tro-toolbar';
import KhoDonViCuuTroTable from './components/kho-don-vi-cuu-tro-table';

const KhoDonViCuuTroForm = lazy(() => import('./components/kho-don-vi-cuu-tro-form'));
const KhoDonViCuuTroDetail = lazy(() => import('./components/kho-don-vi-cuu-tro-detail'));

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

const KhoDonViCuuTroPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefSupportUnits');
  const matrixEnabled = isPermissionMatrixEnabled();
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  /** Tránh bật query khi `matrixActive` còn false rồi tắt ngay khi hydrate (legacy `canView` → ma trận): request có thể bị hủy và danh sách trống dù RLS/DB có dữ liệu. */
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
    toast.error(txt('matTranDonViCuuTro.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KhoDonViCuuTroListRow | null>(null);
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
  } = useKhoDonViCuuTroStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useKhoDonViCuuTroList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useKhoDonViCuuTroDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteKhoDonViCuuTroMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback(
    (item: KhoDonViCuuTroListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...KHO_DON_VI_CUU_TRO_SEARCHABLE_KEYS],
      );
      if (!khoDonViCuuTroMatchesColumnSearch(item, f.columnSearch)) return false;
      if (f.loai_filter.length > 0 && !f.loai_filter.includes(item.loai)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => sortKhoDonViCuuTroList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'tt', label: txt('matTranDonViCuuTro.store.ttCol') },
      { key: 'loai_label', label: txt('matTranDonViCuuTro.store.loaiCol') },
      { key: 'ten', label: txt('matTranDonViCuuTro.store.tenCol') },
      { key: 'dia_chi', label: txt('matTranDonViCuuTro.store.diaChiCol') },
      { key: 'dien_thoai', label: txt('matTranDonViCuuTro.store.dienThoaiCol') },
      { key: 'email', label: txt('matTranDonViCuuTro.store.emailCol') },
      { key: 'ghi_chu', label: txt('matTranDonViCuuTro.store.ghiChuCol') },
      { key: 'tg_tao', label: txt('matTranDonViCuuTro.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('matTranDonViCuuTro.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: KhoDonViCuuTroListRow) => ({
      tt: item.tt,
      loai_label: item.loai_label,
      ten: item.ten,
      dia_chi: item.dia_chi ?? '',
      dien_thoai: item.dien_thoai ?? '',
      email: item.email ?? '',
      ghi_chu: item.ghi_chu ?? '',
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
    return Boolean(searchTerm?.trim()) || countKhoDonViCuuTroColumnSearchActive(cs) > 0 || filters.loai_filter.length > 0 || Boolean(sort.column);
  }, [searchTerm, filters.columnSearch, filters.loai_filter, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('matTranDonViCuuTro.emptyTitle'),
    [sorted.length, rows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('matTranDonViCuuTro.emptyFilteredHint')
        : txt('matTranDonViCuuTro.emptyHint'),
    [sorted.length, rows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.khoDonViCuuTro.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleEditFromList = (item: KhoDonViCuuTroListRow) => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: KhoDonViCuuTroListRow) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranDonViCuuTro.deleteTitle'),
      message: txt('matTranDonViCuuTro.deleteMessage'),
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
      title: txt('matTranDonViCuuTro.bulkDeleteTitle'),
      message: txt('matTranDonViCuuTro.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('matTranDonViCuuTro.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormOrigin('list');
  };

  const handleView = useCallback(
    (item: KhoDonViCuuTroListRow) => {
      queryClient.setQueryData(queryKeys.khoDonViCuuTro.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient],
  );

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
        <KhoDonViCuuTroToolbar
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

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('matTranDonViCuuTro.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <KhoDonViCuuTroTable
              data={sorted}
              isLoading={isListLoading || (listQueryEnabled && isListFetching && rows.length === 0)}
              onEdit={handleEditFromList}
              onDelete={handleDelete}
              onView={handleView}
              emptyTitle={emptyTitleResolved}
              emptyDescription={emptyDescriptionResolved}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDonViCuuTroForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDonViCuuTroDetail
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
            fileName={txt('matTranDonViCuuTro.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KhoDonViCuuTroPage;
