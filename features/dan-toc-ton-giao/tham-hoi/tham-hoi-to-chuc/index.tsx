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
  dryRunThamHoiToChucImport,
  type ThamHoiToChucImportContext,
} from './services/tham-hoi-to-chuc-import';
import {
  useThamHoiToChucDetail,
  useDeleteThamHoiToChucMany,
  useImportThamHoiToChuc,
} from './hooks/use-tham-hoi-to-chuc';
import {
  getThamHoiToChucAllForExport,
  getThamHoiToChucPage,
} from './services/tham-hoi-to-chuc-service';
import { useThamHoiToChucStore } from './store/useThamHoiToChucStore';
import type { ThamHoiToChuc } from './core/types';
import { formatDonViThamHoiDisplay } from './core/display-don-vi';
import {
  canMutateDttgRowByDonVi,
  dttgRowVisibleByDonVi,
  isDttgViewUnrestricted,
  useDttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import { countThamHoiToChucColumnSearchActive } from './utils/column-search';
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

  const viewer = useDttgViewer('danTocThamHoiToChuc');

  // Phạm vi xem đi xuống RPC: cấp Xã phường chỉ thấy dòng thuộc đơn vị mình.
  const pageExtraParams = useMemo(
    () => ({
      // Chỉ cấp Xã phường bị bó theo đơn vị; người chưa được gán đơn vị thấy rỗng.
      viewAll: isDttgViewUnrestricted(viewer) || viewer.chucVuCapQuanLy !== 'Xã phường',
      viewerDonViId: viewer.chucVuCapQuanLy === 'Xã phường' ? viewer.viewerDonViId : null,
      tienDo: filters.tien_do_filter,
      toChucIds: filters.to_chuc_filter,
      dipIds: filters.dip_tham_hoi_filter,
      donViIds: filters.don_vi_tham_hoi_filter,
      phongBanIds: filters.phong_ban_filter,
      columnSearch: filters.columnSearch ?? null,
    }),
    [
      viewer,
      filters.tien_do_filter,
      filters.to_chuc_filter,
      filters.dip_tham_hoi_filter,
      filters.don_vi_tham_hoi_filter,
      filters.phong_ban_filter,
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
    queryKey: queryKeys.danTocThamHoiToChuc.page,
    fetchFn: getThamHoiToChucPage,
    enabled: listQueryEnabled,
  });

  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThamHoiToChucDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThamHoiToChucMany();
  const importMutation = useImportThamHoiToChuc();
  const canEdit = useCan('edit', 'danTocThamHoiToChuc');
  const importCtx = useMemo<ThamHoiToChucImportContext>(
    () => ({ idNguoiTao: nhanVienId, viewer }),
    [nhanVienId, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

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
    data: rows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  // Phạm vi "Tất cả" phải ra đủ số dòng khớp bộ lọc, không phải trang đang xem.
  const fetchAllForExport = useCallback(async () => {
    const all = await getThamHoiToChucAllForExport(listPageQuery);
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
      countThamHoiToChucColumnSearchActive(cs) > 0 ||
      filters.tien_do_filter.length > 0 ||
      filters.to_chuc_filter.length > 0 ||
      filters.dip_tham_hoi_filter.length > 0 ||
      filters.don_vi_tham_hoi_filter.length > 0 ||
      filters.phong_ban_filter.length > 0
    );
  }, [searchTerm, filters]);

  // Phân trang phía máy chủ: không còn biết tổng số dòng chưa lọc, nên phân
  // biệt "rỗng thật" / "không khớp lọc" theo việc có bộ lọc đang bật hay không.
  const isFilteredEmpty = listTotal === 0 && hasListFilters;

  const emptyTitleResolved = isFilteredEmpty
    ? txt('common.noResults')
    : txt('danTocThamHoiToChuc.emptyTitle');

  const emptyDescriptionResolved = isFilteredEmpty
    ? txt('danTocThamHoiToChuc.emptyFilteredHint')
    : txt('danTocThamHoiToChuc.emptyHint');

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (fresh) queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  // Dòng mở qua `?open=` không chắc nằm trong trang đang xem, nên phạm vi xem
  // được kiểm ngay trên bản ghi chi tiết vừa tải về.
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!dttgRowVisibleByDonVi(viewer, [viewingData.don_vi_tham_hoi_id])) {
      toast.error(txt('danTocThamHoiToChuc.noViewRowPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  const handleView = useCallback(
    (item: ThamHoiToChuc) => {
      queryClient.setQueryData(queryKeys.danTocThamHoiToChuc.detail(item.id), item);
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
    const row = rows.find((r) => r.id === id) ?? (viewingData?.id === id ? viewingData : null);
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
    if (listTotal === 0) {
      toast.warning(txt('danTocThamHoiToChuc.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleImportDryRun = useCallback(
    (data: Record<string, unknown>[], options: ImportRunOptions) =>
      dryRunThamHoiToChucImport(data, options, importCtx),
    [importCtx],
  );

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[], options: ImportRunOptions) => {
      if (!nhanVienId) {
        toast.error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));
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
            templateFileName={txt('danTocThamHoiToChuc.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThamHoiToChucPage;
