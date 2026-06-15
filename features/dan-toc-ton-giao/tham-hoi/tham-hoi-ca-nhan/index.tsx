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
  useThamHoiCaNhanList,
  useThamHoiCaNhanDetail,
  useDeleteThamHoiCaNhanMany,
  useImportThamHoiCaNhan,
} from './hooks/use-tham-hoi-ca-nhan';
import { useThamHoiCaNhanStore } from './store/useThamHoiCaNhanStore';
import type { ThamHoiCaNhan } from './core/types';
import { THAM_HOI_CA_NHAN_SEARCHABLE_KEYS, thamHoiCaNhanSearchRecord } from './utils/search-keys';
import {
  countThamHoiCaNhanColumnSearchActive,
  thamHoiCaNhanMatchesColumnSearch,
} from './utils/column-search';
import { sortThamHoiCaNhanList } from './utils/sort';
import { formatDonViThamHoiDisplay } from './core/display-don-vi';
import { DON_VI_THAM_HOI_CQMTTQ_VALUE } from './core/constants';
import {
  canMutateDttgRowByDonVi,
  dttgRowVisibleByDonVi,
  useDttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import { formatThoiGianDuKienDisplay } from './utils/thoi-gian-du-kien';
import ThamHoiCaNhanToolbar from './components/tham-hoi-ca-nhan-toolbar';
import ThamHoiCaNhanTable from './components/tham-hoi-ca-nhan-table';

const ThamHoiCaNhanForm = lazy(() => import('./components/tham-hoi-ca-nhan-form'));
const ThamHoiCaNhanDetail = lazy(() => import('./components/tham-hoi-ca-nhan-detail'));

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

const ThamHoiCaNhanPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocThamHoiCaNhan');
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
    toast.error(txt('danTocThamHoiCaNhan.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ThamHoiCaNhan | null>(null);
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
  } = useThamHoiCaNhanStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useThamHoiCaNhanList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThamHoiCaNhanDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThamHoiCaNhanMany();
  const importMutation = useImportThamHoiCaNhan(() => setShowImport(false));
  const viewer = useDttgViewer('danTocThamHoiCaNhan');

  const viewableRows = useMemo(
    () =>
      rows.filter((r) =>
        dttgRowVisibleByDonVi(viewer, [r.don_vi_tham_hoi_id, r.xa_phuong_id]),
      ),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback((item: ThamHoiCaNhan, term: string, f: typeof filters) => {
    const searchRecord = thamHoiCaNhanSearchRecord(item);
    const matchesSearch = matchesSearchTerm(searchRecord, term, [...THAM_HOI_CA_NHAN_SEARCHABLE_KEYS]);
    if (!thamHoiCaNhanMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.trang_thai_filter.length > 0 && !f.trang_thai_filter.includes(item.trang_thai)) return false;
    if (f.ca_nhan_filter.length > 0) {
      const cn = item.ca_nhan_id?.trim();
      if (!cn || !f.ca_nhan_filter.includes(cn)) return false;
    }
    if (f.phong_ban_filter.length > 0) {
      const pb = item.phong_ban_tham_muu_id?.trim();
      if (!pb || !f.phong_ban_filter.includes(pb)) return false;
    }
    if (f.don_vi_tham_hoi_filter.length > 0) {
      const dvKey =
        item.don_vi_tham_hoi_id == null || item.don_vi_tham_hoi_id === ''
          ? DON_VI_THAM_HOI_CQMTTQ_VALUE
          : item.don_vi_tham_hoi_id;
      if (!f.don_vi_tham_hoi_filter.includes(dvKey)) return false;
    }
    if (f.xa_phuong_filter.length > 0) {
      const xp = item.xa_phuong_id?.trim();
      if (!xp || !f.xa_phuong_filter.includes(xp)) return false;
    }
    if (f.dip_tham_hoi_filter.length > 0) {
      const dipId = item.dip_tham_hoi_id?.trim();
      if (!dipId || !f.dip_tham_hoi_filter.includes(dipId)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortThamHoiCaNhanList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_va_ten', label: txt('danTocThamHoiCaNhan.store.hoVaTenCol') },
      { key: 'dip_tham_hoi', label: txt('danTocThamHoiCaNhan.store.dipThamHoiCol') },
      { key: 'thoi_gian_du_kien', label: txt('danTocThamHoiCaNhan.store.thoiGianDuKienCol') },
      { key: 'ten_don_vi_tham_hoi', label: txt('danTocThamHoiCaNhan.store.donViThamHoiCol') },
      { key: 'ten_phong_ban', label: txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol') },
      { key: 'qua_tang', label: txt('danTocThamHoiCaNhan.store.quaTangCol') },
      { key: 'ten_xa_phuong', label: txt('danTocThamHoiCaNhan.store.donViXaPhuongCol') },
      { key: 'trang_thai', label: txt('danTocThamHoiCaNhan.store.trangThaiCol') },
      { key: 'ket_qua_ghi_chu', label: txt('danTocThamHoiCaNhan.store.ketQuaCol') },
      { key: 'link_ket_qua', label: txt('danTocThamHoiCaNhan.store.linkKetQuaCol') },
      { key: 'tg_cap_nhat', label: txt('danTocThamHoiCaNhan.store.tgCapNhatCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_va_ten', label: txt('danTocThamHoiCaNhan.store.hoVaTenCol'), required: true },
      { key: 'ten_phong_ban', label: txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol') },
      { key: 'dip_tham_hoi', label: txt('danTocThamHoiCaNhan.store.dipThamHoiCol'), required: true },
      { key: 'thoi_gian_du_kien', label: txt('danTocThamHoiCaNhan.store.thoiGianDuKienCol') },
      { key: 'ten_don_vi_tham_hoi', label: txt('danTocThamHoiCaNhan.store.donViThamHoiCol') },
      { key: 'qua_tang', label: txt('danTocThamHoiCaNhan.store.quaTangCol') },
      { key: 'ten_xa_phuong', label: txt('danTocThamHoiCaNhan.store.donViXaPhuongCol') },
      { key: 'trang_thai', label: txt('danTocThamHoiCaNhan.store.trangThaiCol') },
      { key: 'ket_qua_ghi_chu', label: txt('danTocThamHoiCaNhan.store.ketQuaCol') },
      { key: 'link_ket_qua', label: txt('danTocThamHoiCaNhan.store.linkKetQuaCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ThamHoiCaNhan) => ({
      ho_va_ten: item.ho_va_ten ?? '',
      dip_tham_hoi: item.dip_tham_hoi,
      thoi_gian_du_kien: formatThoiGianDuKienDisplay(item.thoi_gian_du_kien),
      ten_don_vi_tham_hoi: formatDonViThamHoiDisplay(item),
      ten_phong_ban: item.ten_phong_ban ?? '',
      qua_tang: item.qua_tang ?? '',
      ten_xa_phuong: item.ten_xa_phuong ?? '',
      trang_thai: item.trang_thai,
      ket_qua_ghi_chu: item.ket_qua_ghi_chu ?? '',
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
      countThamHoiCaNhanColumnSearchActive(cs) > 0 ||
      filters.trang_thai_filter.length > 0 ||
      filters.ca_nhan_filter.length > 0 ||
      filters.phong_ban_filter.length > 0 ||
      filters.don_vi_tham_hoi_filter.length > 0 ||
      filters.xa_phuong_filter.length > 0 ||
      filters.dip_tham_hoi_filter.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('danTocThamHoiCaNhan.emptyTitle'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('danTocThamHoiCaNhan.emptyFilteredHint')
        : txt('danTocThamHoiCaNhan.emptyHint'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = viewableRows.find((r) => r.id === viewingId);
    if (!fresh) {
      const row = rows.find((r) => r.id === viewingId);
      if (
        row &&
        !dttgRowVisibleByDonVi(viewer, [row.don_vi_tham_hoi_id, row.xa_phuong_id])
      ) {
        toast.error(txt('danTocThamHoiCaNhan.noViewRowPermission'));
      }
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(viewingId), fresh);
  }, [rows, viewableRows, viewingId, queryClient, viewer]);

  const handleView = useCallback(
    (item: ThamHoiCaNhan) => {
      queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(item.id), item);
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
        toast.error(txt('danTocThamHoiCaNhan.noViewRowPermission'));
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

  const caNhanDonViIds = (item: ThamHoiCaNhan) => [item.don_vi_tham_hoi_id, item.xa_phuong_id];

  const handleEditFromList = (item: ThamHoiCaNhan) => {
    if (!canMutateDttgRowByDonVi(viewer, caNhanDonViIds(item))) {
      toast.error(txt('danTocThamHoiCaNhan.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: ThamHoiCaNhan) => {
    if (!canMutateDttgRowByDonVi(viewer, caNhanDonViIds(d))) {
      toast.error(txt('danTocThamHoiCaNhan.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!canMutateDttgRowByDonVi(viewer, row ? caNhanDonViIds(row) : [])) {
      toast.error(txt('danTocThamHoiCaNhan.noDeleteOtherDonVi'));
      return;
    }
    confirm({
      title: txt('danTocThamHoiCaNhan.deleteTitle'),
      message: txt('danTocThamHoiCaNhan.deleteMessage'),
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
      return row && canMutateDttgRowByDonVi(viewer, caNhanDonViIds(row));
    });
    if (allowedIds.length === 0) {
      toast.error(txt('danTocThamHoiCaNhan.noDeleteOtherDonVi'));
      return;
    }
    if (allowedIds.length < ids.length) {
      toast.error(txt('danTocThamHoiCaNhan.noDeleteOtherDonVi'));
    }
    confirm({
      title: txt('danTocThamHoiCaNhan.bulkDeleteTitle'),
      message: txt('danTocThamHoiCaNhan.bulkDeleteMessage', { count: allowedIds.length }),
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
      toast.warning(txt('danTocThamHoiCaNhan.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (!nhanVienId) {
        toast.error(txt('danTocThamHoiCaNhan.service.noEmployeeProfile'));
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
        <ThamHoiCaNhanToolbar
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
                message={txt('danTocThamHoiCaNhan.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <ThamHoiCaNhanTable
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
            <ThamHoiCaNhanForm
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
            <ThamHoiCaNhanDetail
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
            fileName={txt('danTocThamHoiCaNhan.exportFileName')}
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
            templateFileName={txt('danTocThamHoiCaNhan.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThamHoiCaNhanPage;
