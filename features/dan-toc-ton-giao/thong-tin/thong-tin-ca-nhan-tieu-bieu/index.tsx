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
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL, CONFIRM_YES } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import { formatDate } from '@/lib/utils';
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog from '@/components/shared/ImportDialog';
import ErrorState from '@/components/shared/ErrorState';
import {
  useThongTinCaNhanTieuBieuList,
  useThongTinCaNhanTieuBieuDetail,
  useDeleteThongTinCaNhanTieuBieuMany,
  useUpdateThongTinCaNhanTieuBieuStatus,
  useImportThongTinCaNhanTieuBieu,
} from './hooks/use-thong-tin-ca-nhan-tieu-bieu';
import { useThongTinCaNhanTieuBieuStore } from './store/useThongTinCaNhanTieuBieuStore';
import type { ThongTinCaNhanTieuBieu } from './core/types';
import { THONG_TIN_CA_NHAN_TIEU_BIEU_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  countThongTinCaNhanTieuBieuColumnSearchActive,
  thongTinCaNhanTieuBieuMatchesColumnSearch,
} from './utils/column-search';
import { sortThongTinCaNhanTieuBieuList } from './utils/sort';
import ThongTinCaNhanTieuBieuToolbar from './components/thong-tin-ca-nhan-tieu-bieu-toolbar';
import ThongTinCaNhanTieuBieuTable from './components/thong-tin-ca-nhan-tieu-bieu-table';

const ThongTinCaNhanTieuBieuForm = lazy(() => import('./components/thong-tin-ca-nhan-tieu-bieu-form'));
const ThongTinCaNhanTieuBieuDetail = lazy(() => import('./components/thong-tin-ca-nhan-tieu-bieu-detail'));

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

const ThongTinCaNhanTieuBieuPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocCaNhanTieuBieu');
  const matrixEnabled = isPermissionMatrixEnabled();
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user && (user.role === 'admin' || !matrixEnabled || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    matrixEnabled && user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && !matrixActive;

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('danTocCaNhanTieuBieu.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ThongTinCaNhanTieuBieu | null>(null);
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
  } = useThongTinCaNhanTieuBieuStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useThongTinCaNhanTieuBieuList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThongTinCaNhanTieuBieuDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThongTinCaNhanTieuBieuMany();
  const statusMutation = useUpdateThongTinCaNhanTieuBieuStatus();
  const importMutation = useImportThongTinCaNhanTieuBieu(() => setShowImport(false));

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback((item: ThongTinCaNhanTieuBieu, term: string, f: typeof filters) => {
    const matchesSearch = matchesSearchTerm(
      item as unknown as Record<string, unknown>,
      term,
      [...THONG_TIN_CA_NHAN_TIEU_BIEU_SEARCHABLE_KEYS],
    );
    if (!thongTinCaNhanTieuBieuMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.doi_tuong_filter.length > 0 && !f.doi_tuong_filter.includes(item.doi_tuong)) return false;
    if (f.trang_thai_filter.length > 0 && !f.trang_thai_filter.includes(item.trang_thai)) return false;
    if (f.don_vi_filter.length > 0) {
      const dv = item.don_vi_id?.trim();
      if (!dv || !f.don_vi_filter.includes(dv)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortThongTinCaNhanTieuBieuList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_va_ten', label: txt('danTocCaNhanTieuBieu.store.hoVaTenCol') },
      { key: 'ngay_sinh', label: txt('danTocCaNhanTieuBieu.form.ngaySinh') },
      { key: 'doi_tuong', label: txt('danTocCaNhanTieuBieu.store.doiTuongCol') },
      { key: 'chuc_vu_vi_tri', label: txt('danTocCaNhanTieuBieu.store.chucVuViTriCol') },
      { key: 'ton_giao_dan_toc', label: txt('danTocCaNhanTieuBieu.store.tonGiaoDanTocCol') },
      { key: 'dia_chi', label: txt('danTocCaNhanTieuBieu.form.diaChi') },
      { key: 'ten_don_vi', label: txt('danTocCaNhanTieuBieu.store.donViCol') },
      { key: 'so_dien_thoai', label: txt('danTocCaNhanTieuBieu.store.soDienThoaiCol') },
      { key: 'dong_gop_noi_bat', label: txt('danTocCaNhanTieuBieu.form.dongGopNoiBat') },
      { key: 'trang_thai', label: txt('danTocCaNhanTieuBieu.store.trangThaiCol') },
      { key: 'tg_cap_nhat', label: txt('danTocCaNhanTieuBieu.store.tgCapNhatCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_va_ten', label: txt('danTocCaNhanTieuBieu.form.hoVaTen'), required: true },
      { key: 'ngay_sinh', label: txt('danTocCaNhanTieuBieu.form.ngaySinh') },
      { key: 'doi_tuong', label: txt('danTocCaNhanTieuBieu.form.doiTuong'), required: true },
      { key: 'chuc_vu_vi_tri', label: txt('danTocCaNhanTieuBieu.form.chucVuViTri') },
      { key: 'ton_giao_dan_toc', label: txt('danTocCaNhanTieuBieu.form.tonGiaoDanToc') },
      { key: 'dia_chi', label: txt('danTocCaNhanTieuBieu.form.diaChi') },
      { key: 'ten_don_vi', label: txt('danTocCaNhanTieuBieu.form.donVi') },
      { key: 'so_dien_thoai', label: txt('danTocCaNhanTieuBieu.form.soDienThoai') },
      { key: 'dong_gop_noi_bat', label: txt('danTocCaNhanTieuBieu.form.dongGopNoiBat') },
      { key: 'trang_thai', label: txt('danTocCaNhanTieuBieu.form.trangThai') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ThongTinCaNhanTieuBieu) => ({
      ho_va_ten: item.ho_va_ten,
      ngay_sinh: item.ngay_sinh ? formatDate(item.ngay_sinh) : '',
      doi_tuong: item.doi_tuong,
      chuc_vu_vi_tri: item.chuc_vu_vi_tri ?? '',
      ton_giao_dan_toc: item.ton_giao_dan_toc ?? '',
      dia_chi: item.dia_chi ?? '',
      ten_don_vi: item.ten_don_vi ?? '',
      so_dien_thoai: item.so_dien_thoai ?? '',
      dong_gop_noi_bat: item.dong_gop_noi_bat ?? '',
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
      countThongTinCaNhanTieuBieuColumnSearchActive(cs) > 0 ||
      filters.doi_tuong_filter.length > 0 ||
      filters.trang_thai_filter.length > 0 ||
      filters.don_vi_filter.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('danTocCaNhanTieuBieu.emptyTitle'),
    [sorted.length, rows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('danTocCaNhanTieuBieu.emptyFilteredHint')
        : txt('danTocCaNhanTieuBieu.emptyHint'),
    [sorted.length, rows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleView = useCallback(
    (item: ThongTinCaNhanTieuBieu) => {
      queryClient.setQueryData(queryKeys.danTocCaNhanTieuBieu.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient],
  );

  const handleEditFromList = (item: ThongTinCaNhanTieuBieu) => {
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: ThongTinCaNhanTieuBieu) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('danTocCaNhanTieuBieu.deleteTitle'),
      message: txt('danTocCaNhanTieuBieu.deleteMessage'),
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
      title: txt('danTocCaNhanTieuBieu.bulkDeleteTitle'),
      message: txt('danTocCaNhanTieuBieu.bulkDeleteMessage', { count: ids.length }),
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

  const handleStatusChange = (item: ThongTinCaNhanTieuBieu) => {
    const newStatus = item.trang_thai === 'Đang hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động';
    const statusLabel = newStatus === 'Đang hoạt động' ? txt('position.active') : txt('position.inactive');
    confirm({
      title: txt('danTocCaNhanTieuBieu.statusChangeTitle'),
      message: txt('danTocCaNhanTieuBieu.statusChangeMessage', { name: item.ho_va_ten, status: statusLabel }),
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        statusMutation.mutate({ id: item.id, status: newStatus });
      },
    });
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.warning(txt('danTocCaNhanTieuBieu.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (!nhanVienId) {
        toast.error(txt('danTocCaNhanTieuBieu.service.noEmployeeProfile'));
        return { created: 0, errors: [], errorRows: [] };
      }
      return importMutation.mutateAsync({ rows: data, idNguoiTao: nhanVienId });
    },
    [importMutation, nhanVienId],
  );

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
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
        <ThongTinCaNhanTieuBieuToolbar
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
          items={rows}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('danTocCaNhanTieuBieu.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <ThongTinCaNhanTieuBieuTable
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
            <ThongTinCaNhanTieuBieuForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThongTinCaNhanTieuBieuDetail
              data={viewingData}
              onClose={() => setViewingId(null)}
              onEdit={handleEditFromDetail}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
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
            fileName={txt('danTocCaNhanTieuBieu.exportFileName')}
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
            templateFileName={txt('danTocCaNhanTieuBieu.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThongTinCaNhanTieuBieuPage;
