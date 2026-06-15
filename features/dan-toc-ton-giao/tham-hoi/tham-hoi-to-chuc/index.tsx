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
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog from '@/components/shared/ImportDialog';
import ErrorState from '@/components/shared/ErrorState';
import {
  useThamHoiToChucList,
  useThamHoiToChucDetail,
  useDeleteThamHoiToChucMany,
  useImportThamHoiToChuc,
} from './hooks/use-tham-hoi-to-chuc';
import { useThamHoiToChucStore } from './store/useThamHoiToChucStore';
import type { ThamHoiToChuc } from './core/types';
import { formatDonViThamHoiDisplay } from './core/display-don-vi';
import { DON_VI_THAM_HOI_TINH_VALUE } from './core/constants';
import { donViFilterKey } from '@/features/dan-toc-ton-giao/tham-hoi/shared/build-filter-options';
import {
  canMutateDttgRowByDonVi,
  dttgRowVisibleByDonVi,
  useDttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import { THAM_HOI_TO_CHUC_SEARCHABLE_KEYS, thamHoiToChucSearchRecord } from './utils/search-keys';
import {
  countThamHoiToChucColumnSearchActive,
  thamHoiToChucMatchesColumnSearch,
} from './utils/column-search';
import { sortThamHoiToChucList } from './utils/sort';
import ThamHoiToChucToolbar from './components/tham-hoi-to-chuc-toolbar';
import ThamHoiToChucTable from './components/tham-hoi-to-chuc-table';

const ThamHoiToChucForm = lazy(() => import('./components/tham-hoi-to-chuc-form'));
const ThamHoiToChucDetail = lazy(() => import('./components/tham-hoi-to-chuc-detail'));

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

interface FormPrefill {
  dipId?: string;
}

const ThamHoiToChucPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocThamHoiToChuc');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user && (user.role === 'admin' || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && !matrixActive;

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('danTocThamHoiToChuc.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ThamHoiToChuc | null>(null);
  const [formPrefill, setFormPrefill] = useState<FormPrefill>({});
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const {
    searchTerm,
    filters,
    sort,
    resetState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
    setFilter,
  } = useThamHoiToChucStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useThamHoiToChucList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThamHoiToChucDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThamHoiToChucMany();
  const importMutation = useImportThamHoiToChuc(() => setShowImport(false));
  const viewer = useDttgViewer('danTocThamHoiToChuc');

  const viewableRows = useMemo(
    () => rows.filter((r) => dttgRowVisibleByDonVi(viewer, [r.don_vi_tham_hoi_id])),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback((item: ThamHoiToChuc, term: string, f: typeof filters) => {
    const searchRecord = thamHoiToChucSearchRecord(item);
    const matchesSearch = matchesSearchTerm(searchRecord, term, [...THAM_HOI_TO_CHUC_SEARCHABLE_KEYS]);
    if (!thamHoiToChucMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.tien_do_filter.length > 0 && !f.tien_do_filter.includes(item.tien_do)) return false;
    if (f.to_chuc_filter.length > 0) {
      const tc = item.to_chuc_id?.trim();
      if (!tc || !f.to_chuc_filter.includes(tc)) return false;
    }
    if (f.dip_tham_hoi_filter.length > 0) {
      const dipId = item.dip_tham_hoi_id?.trim();
      if (!dipId || !f.dip_tham_hoi_filter.includes(dipId)) return false;
    }
    if (f.don_vi_tham_hoi_filter.length > 0) {
      const dvKey = donViFilterKey(item.don_vi_tham_hoi_id, DON_VI_THAM_HOI_TINH_VALUE);
      if (!f.don_vi_tham_hoi_filter.includes(dvKey)) return false;
    }
    if (f.phong_ban_filter.length > 0) {
      const pb = item.phong_ban_tham_muu_id?.trim();
      if (!pb || !f.phong_ban_filter.includes(pb)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortThamHoiToChucList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_co_so', label: txt('danTocThamHoiToChuc.store.tenCoSoCol') },
      { key: 'dip_tham_hoi', label: txt('danTocThamHoiToChuc.store.dipThamHoiCol') },
      { key: 'thoi_gian_du_kien', label: txt('danTocThamHoiToChuc.store.thoiGianDuKienCol') },
      { key: 'ten_don_vi_tham_hoi', label: txt('danTocThamHoiToChuc.store.donViThamHoiCol') },
      { key: 'noi_dung_tham_hoi', label: txt('danTocThamHoiToChuc.store.noiDungCol') },
      { key: 'thanh_phan_doan', label: txt('danTocThamHoiToChuc.store.thanhPhanDoanCol') },
      { key: 'qua_tang', label: txt('danTocThamHoiToChuc.store.quaTangCol') },
      { key: 'tien_do', label: txt('danTocThamHoiToChuc.store.tienDoCol') },
      { key: 'ket_qua_thuc_hien', label: txt('danTocThamHoiToChuc.store.ketQuaCol') },
      { key: 'link_ket_qua', label: txt('danTocThamHoiToChuc.store.linkKetQuaCol') },
      { key: 'tg_cap_nhat', label: txt('danTocThamHoiToChuc.store.tgCapNhatCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_co_so', label: txt('danTocThamHoiToChuc.store.tenCoSoCol'), required: true },
      { key: 'dip_tham_hoi', label: txt('danTocThamHoiToChuc.store.dipThamHoiCol'), required: true },
      { key: 'thoi_gian_du_kien', label: txt('danTocThamHoiToChuc.store.thoiGianDuKienCol') },
      { key: 'don_vi_tham_hoi', label: txt('danTocThamHoiToChuc.store.donViThamHoiCol') },
      { key: 'noi_dung_tham_hoi', label: txt('danTocThamHoiToChuc.store.noiDungCol') },
      { key: 'thanh_phan_doan', label: txt('danTocThamHoiToChuc.store.thanhPhanDoanCol') },
      { key: 'qua_tang', label: txt('danTocThamHoiToChuc.store.quaTangCol') },
      { key: 'tien_do', label: txt('danTocThamHoiToChuc.store.tienDoCol'), required: true },
      { key: 'ket_qua_thuc_hien', label: txt('danTocThamHoiToChuc.store.ketQuaCol') },
      { key: 'link_ket_qua', label: txt('danTocThamHoiToChuc.store.linkKetQuaCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ThamHoiToChuc) => ({
      ten_co_so: item.ten_co_so ?? '',
      dip_tham_hoi: item.dip_tham_hoi,
      thoi_gian_du_kien: item.thoi_gian_du_kien ?? '',
      ten_don_vi_tham_hoi: formatDonViThamHoiDisplay(item),
      noi_dung_tham_hoi: item.noi_dung_tham_hoi ?? '',
      thanh_phan_doan: item.thanh_phan_doan ?? '',
      qua_tang: item.qua_tang ?? '',
      tien_do: item.tien_do,
      ket_qua_thuc_hien: item.ket_qua_thuc_hien ?? '',
      link_ket_qua: item.link_ket_qua ?? '',
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
      countThamHoiToChucColumnSearchActive(cs) > 0 ||
      filters.tien_do_filter.length > 0 ||
      filters.to_chuc_filter.length > 0 ||
      filters.dip_tham_hoi_filter.length > 0 ||
      filters.don_vi_tham_hoi_filter.length > 0 ||
      filters.phong_ban_filter.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('danTocThamHoiToChuc.emptyTitle'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('danTocThamHoiToChuc.emptyFilteredHint')
        : txt('danTocThamHoiToChuc.emptyHint'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = viewableRows.find((r) => r.id === viewingId);
    if (!fresh) {
      const row = rows.find((r) => r.id === viewingId);
      if (row && !dttgRowVisibleByDonVi(viewer, [row.don_vi_tham_hoi_id])) {
        toast.error(txt('danTocThamHoiToChuc.noViewRowPermission'));
      }
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(viewingId), fresh);
  }, [rows, viewableRows, viewingId, queryClient, viewer]);

  const handleView = useCallback(
    (item: ThamHoiToChuc) => {
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient],
  );

  useEffect(() => {
    if (!listQueryEnabled || rows.length === 0) return;

    const openId = searchParams.get('open')?.trim();
    if (openId) {
      const row = viewableRows.find((r) => r.id === openId);
      if (row) {
        handleView(row);
        const next = new URLSearchParams(searchParams);
        next.delete('open');
        setSearchParams(next, { replace: true });
      } else if (rows.some((r) => r.id === openId)) {
        toast.error(txt('danTocThamHoiToChuc.noViewRowPermission'));
        const next = new URLSearchParams(searchParams);
        next.delete('open');
        setSearchParams(next, { replace: true });
      }
      return;
    }

    const create = searchParams.get('create')?.trim();
    const dipId = searchParams.get('dipId')?.trim();
    if (create === '1') {
      startTransition(() => {
        setEditing(null);
        setFormPrefill(dipId ? { dipId } : {});
        setShowForm(true);
      });
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      next.delete('dipId');
      setSearchParams(next, { replace: true });
      return;
    }

    if (dipId) {
      setFilter('dip_tham_hoi_filter', [dipId]);
      const next = new URLSearchParams(searchParams);
      next.delete('dipId');
      setSearchParams(next, { replace: true });
    }
  }, [rows, viewableRows, listQueryEnabled, searchParams, setSearchParams, handleView, setFilter]);

  const handleEditFromList = (item: ThamHoiToChuc) => {
    if (!canMutateDttgRowByDonVi(viewer, [item.don_vi_tham_hoi_id])) {
      toast.error(txt('danTocThamHoiToChuc.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: ThamHoiToChuc) => {
    if (!canMutateDttgRowByDonVi(viewer, [d.don_vi_tham_hoi_id])) {
      toast.error(txt('danTocThamHoiToChuc.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!canMutateDttgRowByDonVi(viewer, [row?.don_vi_tham_hoi_id])) {
      toast.error(txt('danTocThamHoiToChuc.noDeleteOtherDonVi'));
      return;
    }
    confirm({
      title: txt('danTocThamHoiToChuc.deleteTitle'),
      message: txt('danTocThamHoiToChuc.deleteMessage'),
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
      return row && canMutateDttgRowByDonVi(viewer, [row.don_vi_tham_hoi_id]);
    });
    if (allowedIds.length === 0) {
      toast.error(txt('danTocThamHoiToChuc.noDeleteOtherDonVi'));
      return;
    }
    if (allowedIds.length < ids.length) {
      toast.error(txt('danTocThamHoiToChuc.noDeleteOtherDonVi'));
    }
    confirm({
      title: txt('danTocThamHoiToChuc.bulkDeleteTitle'),
      message: txt('danTocThamHoiToChuc.bulkDeleteMessage', { count: allowedIds.length }),
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
      toast.warning(txt('danTocThamHoiToChuc.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (!nhanVienId) {
        toast.error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));
        return { created: 0, errors: [], errorRows: [] };
      }
      return importMutation.mutateAsync({ rows: data, idNguoiTao: nhanVienId });
    },
    [importMutation, nhanVienId],
  );

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormPrefill({});
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
        <ThamHoiToChucToolbar
          onPageBack={() => navigate('/dan-toc-ton-giao')}
          onAdd={() => {
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onImport={() => setShowImport(true)}
          onDeleteMany={handleDeleteMany}
          items={viewableRows}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('danTocThamHoiToChuc.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <ThamHoiToChucTable
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
            <ThamHoiToChucForm
              initialData={editing}
              defaultDipId={formPrefill.dipId}
              onClose={handleCloseForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThamHoiToChucDetail
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
            fileName={txt('danTocThamHoiToChuc.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportDialog
            open={showImport}
            onClose={() => setShowImport(false)}
            columns={IMPORT_COLUMNS}
            onImport={handleImportData}
            templateFileName={txt('danTocThamHoiToChuc.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThamHoiToChucPage;
