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
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog, { type ImportRunOptions } from '@/components/shared/ImportDialog';
import ErrorState from '@/components/shared/ErrorState';
import {
  dryRunThamHoiCaNhanImport,
  type ThamHoiCaNhanImportContext,
} from './services/tham-hoi-ca-nhan-import';
import {
  useThamHoiCaNhanDetail,
  useDeleteThamHoiCaNhanMany,
  useImportThamHoiCaNhan,
} from './hooks/use-tham-hoi-ca-nhan';
import {
  getThamHoiCaNhanAllForExport,
  getThamHoiCaNhanPage,
} from './services/tham-hoi-ca-nhan-service';
import { useThamHoiCaNhanStore } from './store/useThamHoiCaNhanStore';
import type { ThamHoiCaNhan } from './core/types';
import { countThamHoiCaNhanColumnSearchActive } from './utils/column-search';
import { formatDonViThamHoiDisplay } from './core/display-don-vi';
import {
  canMutateDttgRowByDonVi,
  dttgRowVisibleByDonVi,
  isDttgViewUnrestricted,
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
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user && (user.role === 'admin' || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  // Dùng `matrixLoading` thay cho `!matrixActive`: nếu truy vấn quyền THẤT BẠI thì
  // `matrixActive` ở lại false vĩnh viễn và trang sẽ quay vòng chờ mãi.
  const waitingMatrixHydrate =
    user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && matrixLoading;

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

  const viewer = useDttgViewer('danTocThamHoiCaNhan');

  // Phạm vi xem đi xuống RPC: cấp Xã phường chỉ thấy dòng thuộc đơn vị mình.
  const pageExtraParams = useMemo(
    () => ({
      // Chỉ cấp Xã phường bị bó theo đơn vị; người chưa được gán đơn vị thấy rỗng.
      viewAll: isDttgViewUnrestricted(viewer) || viewer.chucVuCapQuanLy !== 'Xã phường',
      viewerDonViId: viewer.chucVuCapQuanLy === 'Xã phường' ? viewer.viewerDonViId : null,
      trangThai: filters.trang_thai_filter,
      caNhanIds: filters.ca_nhan_filter,
      phongBanIds: filters.phong_ban_filter,
      xaPhuongIds: filters.xa_phuong_filter,
      dipIds: filters.dip_tham_hoi_filter,
      donViThamHoiIds: filters.don_vi_tham_hoi_filter,
      columnSearch: filters.columnSearch ?? null,
    }),
    [
      viewer,
      filters.trang_thai_filter,
      filters.ca_nhan_filter,
      filters.phong_ban_filter,
      filters.xa_phuong_filter,
      filters.dip_tham_hoi_filter,
      filters.don_vi_tham_hoi_filter,
      filters.columnSearch,
    ],
  );

  const {
    rows,
    totalRecords: listTotal,
    hasNextPage: listHasNext,
    isLoading,
    isError: isListError,
    refetch: refetchList,
    params: listPageQuery,
  } = useServerPagedList({
    pagination,
    searchTerm,
    sort,
    extraParams: pageExtraParams,
    queryKey: queryKeys.danTocThamHoiCaNhan.page,
    fetchFn: getThamHoiCaNhanPage,
    enabled: listQueryEnabled,
  });

  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThamHoiCaNhanDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThamHoiCaNhanMany();
  const importMutation = useImportThamHoiCaNhan();
  const canEdit = useCan('edit', 'danTocThamHoiCaNhan');
  const importCtx = useMemo<ThamHoiCaNhanImportContext>(
    () => ({ idNguoiTao: nhanVienId, viewer }),
    [nhanVienId, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

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
      { key: 'id', label: txt('shared.import.colMaHeThong') },
    ],
    [],
  );

  const importMatchColumns = useMemo(
    () => [{ key: 'id', label: txt('shared.import.colMaHeThong') }],
    [],
  );

  /** Không có quyền sửa thì không bày chế độ ghi đè — bấm vào cũng không ghi được. */
  const importWriteModes = useMemo(
    () => (canEdit ? (['insert', 'upsert', 'update'] as const) : (['insert'] as const)),
    [canEdit],
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
    data: rows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  // Phạm vi "Tất cả" phải ra đủ số dòng khớp bộ lọc, không phải trang đang xem.
  const fetchAllForExport = useCallback(async () => {
    const all = await getThamHoiCaNhanAllForExport(listPageQuery);
    return all.map(exportMapFn);
  }, [listPageQuery, exportMapFn]);

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
      filters.dip_tham_hoi_filter.length > 0
    );
  }, [searchTerm, filters]);

  // Phân trang phía máy chủ: không còn biết tổng số dòng chưa lọc, nên phân
  // biệt "rỗng thật" / "không khớp lọc" theo việc có bộ lọc đang bật hay không.
  const isFilteredEmpty = listTotal === 0 && hasListFilters;

  const emptyTitleResolved = isFilteredEmpty
    ? txt('common.noResults')
    : txt('danTocThamHoiCaNhan.emptyTitle');

  const emptyDescriptionResolved = isFilteredEmpty
    ? txt('danTocThamHoiCaNhan.emptyFilteredHint')
    : txt('danTocThamHoiCaNhan.emptyHint');

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (fresh) queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  // Dòng mở qua `?open=` không chắc nằm trong trang đang xem, nên phạm vi xem
  // được kiểm ngay trên bản ghi chi tiết vừa tải về.
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!dttgRowVisibleByDonVi(viewer, [viewingData.don_vi_tham_hoi_id, viewingData.xa_phuong_id])) {
      toast.error(txt('danTocThamHoiCaNhan.noViewRowPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  const handleView = useCallback(
    (item: ThamHoiCaNhan) => {
      queryClient.setQueryData(queryKeys.danTocThamHoiCaNhan.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient],
  );

  useEffect(() => {
    if (!listQueryEnabled) return;

    const openId = searchParams.get('open')?.trim();
    if (openId) {
      setViewingId(openId);
      const next = new URLSearchParams(searchParams);
      next.delete('open');
      setSearchParams(next, { replace: true });
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
  }, [listQueryEnabled, searchParams, setSearchParams, setFilter]);

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
    const row = rows.find((r) => r.id === id) ?? (viewingData?.id === id ? viewingData : null);
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
    if (listTotal === 0) {
      toast.warning(txt('danTocThamHoiCaNhan.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleImportDryRun = useCallback(
    (data: Record<string, unknown>[], options: ImportRunOptions) =>
      dryRunThamHoiCaNhanImport(data, options, importCtx),
    [importCtx],
  );

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[], options: ImportRunOptions) => {
      if (!nhanVienId) {
        toast.error(txt('danTocThamHoiCaNhan.service.noEmployeeProfile'));
        return { created: 0, errors: [], errorRows: [] };
      }
      return importMutation.mutateAsync({ rows: data, options, ctx: importCtx });
    },
    [importMutation, nhanVienId, importCtx],
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
              data={rows}
              isLoading={isListLoading}
              isError={isListError}
              onRetry={refetchList}
              onEdit={handleEditFromList}
              onDelete={handleDelete}
              onView={handleView}
              emptyTitle={emptyTitleResolved}
              emptyDescription={emptyDescriptionResolved}
              serverSidePagination
              serverTotalRecords={listTotal}
              serverHasNextPage={listHasNext}
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
            serverTotalRecords={listTotal}
            fetchAllData={fetchAllForExport}
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
            onDryRun={handleImportDryRun}
            writeModes={importWriteModes}
            matchColumns={importMatchColumns}
            defaultMatchKeys={['id']}
            templateFileName={txt('danTocThamHoiCaNhan.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThamHoiCaNhanPage;
