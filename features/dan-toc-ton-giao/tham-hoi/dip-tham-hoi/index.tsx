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
  useDipThamHoiList,
  useDipThamHoiDetail,
  useDeleteDipThamHoiMany,
} from './hooks/use-dip-tham-hoi';
import { useDipThamHoiStore } from './store/useDipThamHoiStore';
import type { DipThamHoi } from './core/types';
import { formatDonViToChucDisplay } from './core/display-don-vi';
import { DON_VI_TINH_VALUE } from './core/constants';
import { donViFilterKey } from '@/features/dan-toc-ton-giao/tham-hoi/shared/build-filter-options';
import {
  canMutateDttgRowByDonVi,
  dttgRowVisibleByDonVi,
  useDttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import { DIP_THAM_HOI_SEARCHABLE_KEYS, dipThamHoiSearchRecord } from './utils/search-keys';
import { countDipThamHoiColumnSearchActive, dipThamHoiMatchesColumnSearch } from './utils/column-search';
import { sortDipThamHoiList } from './utils/sort';
import DipThamHoiToolbar from './components/dip-tham-hoi-toolbar';
import DipThamHoiTable from './components/dip-tham-hoi-table';

const DipThamHoiForm = lazy(() => import('./components/dip-tham-hoi-form'));
const DipThamHoiDetail = lazy(() => import('./components/dip-tham-hoi-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none" style={{ zIndex: DRAWER_Z_CONTENT_BASE }}>
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

const DipThamHoiPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocDipThamHoi');
  const matrixEnabled = isPermissionMatrixEnabled();
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  /** Chạy list khi user có quyền xem (kể cả legacy trước hydrate); tránh list trống im lặng khi matrixActive chưa true. */
  const listQueryEnabled = Boolean(
    user && (user.role === 'admin' || !matrixEnabled || canView),
  );

  const prevMatrixActive = useRef(matrixActive);
  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    matrixEnabled && user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && !matrixActive;

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    if (matrixEnabled && !matrixActive) return;
    didRedirect.current = true;
    toast.error(txt('danTocDipThamHoi.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, matrixEnabled, matrixActive, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DipThamHoi | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useDipThamHoiStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useDipThamHoiList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useDipThamHoiDetail(viewingId, { enabled: detailEnabled });
  const deleteMutation = useDeleteDipThamHoiMany();
  const viewer = useDttgViewer('danTocDipThamHoi');

  const viewableRows = useMemo(
    () => rows.filter((r) => dttgRowVisibleByDonVi(viewer, [r.don_vi_to_chuc_id])),
    [rows, viewer],
  );

  useEffect(() => () => resetState(), [resetState]);

  /** Refetch sau khi ma trận phân quyền hydrate — tránh cache list rỗng từ lúc enabled vừa bật. */
  useEffect(() => {
    if (!prevMatrixActive.current && matrixActive && listQueryEnabled) {
      void refetchList();
    }
    prevMatrixActive.current = matrixActive;
  }, [matrixActive, listQueryEnabled, refetchList]);

  const filterFn = useCallback((item: DipThamHoi, term: string, f: typeof filters) => {
    const searchRecord = dipThamHoiSearchRecord(item);
    const matchesSearch = matchesSearchTerm(searchRecord, term, [...DIP_THAM_HOI_SEARCHABLE_KEYS]);
    if (!dipThamHoiMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.trang_thai_filter.length > 0 && !f.trang_thai_filter.includes(item.trang_thai)) return false;
    if (f.don_vi_to_chuc_filter.length > 0) {
      const dvKey = donViFilterKey(item.don_vi_to_chuc_id, DON_VI_TINH_VALUE);
      if (!f.don_vi_to_chuc_filter.includes(dvKey)) return false;
    }
    if (f.phong_ban_filter.length > 0) {
      const pb = item.phong_ban_tham_muu_id?.trim();
      if (!pb || !f.phong_ban_filter.includes(pb)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortDipThamHoiList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_dip', label: txt('danTocDipThamHoi.store.tenDipCol') },
      { key: 'thoi_gian_du_kien', label: txt('danTocDipThamHoi.store.thoiGianDuKienCol') },
      { key: 'thoi_gian_thuc_te', label: txt('danTocDipThamHoi.store.thoiGianThucTeCol') },
      { key: 'so_luong_du_kien_tong', label: txt('danTocDipThamHoi.store.soDuKienTongCol') },
      { key: 'so_luong_to_chuc_du_kien', label: txt('danTocDipThamHoi.store.soDuKienToChucCol') },
      { key: 'so_luong_ca_nhan_du_kien', label: txt('danTocDipThamHoi.store.soDuKienCaNhanCol') },
      { key: 'so_luong_thuc_te_tong', label: txt('danTocDipThamHoi.store.soThucTeTongCol') },
      { key: 'ten_don_vi_to_chuc', label: txt('danTocDipThamHoi.store.donViCol') },
      { key: 'ten_phong_ban', label: txt('danTocDipThamHoi.store.phongBanCol') },
      { key: 'trang_thai', label: txt('danTocDipThamHoi.store.trangThaiCol') },
      { key: 'tg_cap_nhat', label: txt('danTocDipThamHoi.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: DipThamHoi) => ({
      ten_dip: item.ten_dip,
      thoi_gian_du_kien: item.thoi_gian_du_kien ?? '',
      thoi_gian_thuc_te: item.thoi_gian_thuc_te ?? '',
      so_luong_du_kien_tong: item.so_luong_du_kien_tong,
      so_luong_to_chuc_du_kien: item.so_luong_to_chuc_du_kien,
      so_luong_ca_nhan_du_kien: item.so_luong_ca_nhan_du_kien,
      so_luong_thuc_te_tong: item.so_luong_thuc_te_tong,
      ten_don_vi_to_chuc: formatDonViToChucDisplay(item),
      ten_phong_ban: item.ten_phong_ban ?? '',
      trang_thai: item.trang_thai,
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
      countDipThamHoiColumnSearchActive(cs) > 0 ||
      filters.trang_thai_filter.length > 0 ||
      filters.don_vi_to_chuc_filter.length > 0 ||
      filters.phong_ban_filter.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('danTocDipThamHoi.emptyTitle'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('danTocDipThamHoi.emptyFilteredHint')
        : txt('danTocDipThamHoi.emptyHint'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = viewableRows.find((r) => r.id === viewingId);
    if (!fresh) {
      const row = rows.find((r) => r.id === viewingId);
      if (row && !dttgRowVisibleByDonVi(viewer, [row.don_vi_to_chuc_id])) {
        toast.error(txt('danTocDipThamHoi.noViewRowPermission'));
      }
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.danTocDipThamHoi.detail(viewingId), fresh);
  }, [rows, viewableRows, viewingId, queryClient, viewer]);

  const handleView = useCallback(
    (item: DipThamHoi) => {
      queryClient.setQueryData(queryKeys.danTocDipThamHoi.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient],
  );

  const handleEdit = (item: DipThamHoi) => {
    if (!canMutateDttgRowByDonVi(viewer, [item.don_vi_to_chuc_id])) {
      toast.error(txt('danTocDipThamHoi.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!canMutateDttgRowByDonVi(viewer, [row?.don_vi_to_chuc_id])) {
      toast.error(txt('danTocDipThamHoi.noDeleteOtherDonVi'));
      return;
    }
    confirm({
      title: txt('danTocDipThamHoi.deleteTitle'),
      message: txt('danTocDipThamHoi.deleteMessage'),
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
    const allowedIds = ids.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && canMutateDttgRowByDonVi(viewer, [row.don_vi_to_chuc_id]);
    });
    if (allowedIds.length === 0) {
      toast.error(txt('danTocDipThamHoi.noDeleteOtherDonVi'));
      return;
    }
    if (allowedIds.length < ids.length) {
      toast.error(txt('danTocDipThamHoi.noDeleteOtherDonVi'));
    }
    confirm({
      title: txt('danTocDipThamHoi.bulkDeleteTitle'),
      message: txt('danTocDipThamHoi.bulkDeleteMessage', { count: allowedIds.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMutation.mutate(allowedIds, {
          onSuccess: () => {
            clearSelection();
            if (viewingId && allowedIds.includes(viewingId)) setViewingId(null);
          },
        });
      },
    });
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.warning(txt('danTocDipThamHoi.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const isListLoading = isLoading || waitingMatrixHydrate;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <DipThamHoiToolbar
          onPageBack={() => navigate('/dan-toc-ton-giao')}
          onAdd={() => {
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          items={viewableRows}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('danTocDipThamHoi.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <DipThamHoiTable
              data={sorted}
              isLoading={isListLoading || (listQueryEnabled && isListFetching && rows.length === 0)}
              onEdit={handleEdit}
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
            <DipThamHoiForm
              initialData={editing}
              onClose={handleCloseForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <DipThamHoiDetail
              data={viewingData}
              onClose={() => setViewingId(null)}
              onEdit={handleEdit}
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
            fileName={txt('danTocDipThamHoi.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DipThamHoiPage;
