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
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog from '@/components/shared/ImportDialog';
import ErrorState from '@/components/shared/ErrorState';
import {
  useThongTinToChucQuanTrongList,
  useThongTinToChucQuanTrongDetail,
  useDeleteThongTinToChucQuanTrongMany,
  useUpdateThongTinToChucQuanTrongStatus,
  useImportThongTinToChucQuanTrong,
} from './hooks/use-thong-tin-to-chuc-quan-trong';
import { useThongTinToChucQuanTrongStore } from './store/useThongTinToChucQuanTrongStore';
import type { ThongTinToChucQuanTrong } from './core/types';
import { THONG_TIN_TO_CHUC_QUAN_TRONG_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  countThongTinToChucQuanTrongColumnSearchActive,
  thongTinToChucQuanTrongMatchesColumnSearch,
} from './utils/column-search';
import { sortThongTinToChucQuanTrongList } from './utils/sort';
import {
  canMutateDttgRowByDonVi,
  dttgRowVisibleByDonVi,
  useDttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import ThongTinToChucQuanTrongToolbar from './components/thong-tin-to-chuc-quan-trong-toolbar';
import ThongTinToChucQuanTrongTable from './components/thong-tin-to-chuc-quan-trong-table';

const ThongTinToChucQuanTrongForm = lazy(() => import('./components/thong-tin-to-chuc-quan-trong-form'));
const ThongTinToChucQuanTrongDetail = lazy(() => import('./components/thong-tin-to-chuc-quan-trong-detail'));

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

const ThongTinToChucQuanTrongPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocToChucQuanTrong');
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
    toast.error(txt('danTocToChucQuanTrong.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ThongTinToChucQuanTrong | null>(null);
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
  } = useThongTinToChucQuanTrongStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useThongTinToChucQuanTrongList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThongTinToChucQuanTrongDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThongTinToChucQuanTrongMany();
  const statusMutation = useUpdateThongTinToChucQuanTrongStatus();
  const importMutation = useImportThongTinToChucQuanTrong(() => setShowImport(false));
  const viewer = useDttgViewer('danTocToChucQuanTrong');

  const viewableRows = useMemo(
    () => rows.filter((r) => dttgRowVisibleByDonVi(viewer, [r.don_vi_id])),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback((item: ThongTinToChucQuanTrong, term: string, f: typeof filters) => {
    const matchesSearch = matchesSearchTerm(
      item as unknown as Record<string, unknown>,
      term,
      [...THONG_TIN_TO_CHUC_QUAN_TRONG_SEARCHABLE_KEYS],
    );
    if (!thongTinToChucQuanTrongMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.loai_hinh_filter.length > 0 && !f.loai_hinh_filter.includes(item.loai_hinh)) return false;
    if (f.trang_thai_filter.length > 0 && !f.trang_thai_filter.includes(item.trang_thai)) return false;
    if (f.don_vi_filter.length > 0) {
      const dv = item.don_vi_id?.trim();
      if (!dv || !f.don_vi_filter.includes(dv)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortThongTinToChucQuanTrongList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'loai_hinh', label: txt('danTocToChucQuanTrong.store.loaiHinhCol') },
      { key: 'ten_co_so', label: txt('danTocToChucQuanTrong.store.tenCoSoCol') },
      { key: 'chu_tri', label: txt('danTocToChucQuanTrong.store.chuTriCol') },
      { key: 'lich_su_hinh_thanh', label: txt('danTocToChucQuanTrong.form.lichSuHinhThanh') },
      { key: 'cong_tac_an_sinh', label: txt('danTocToChucQuanTrong.form.congTacAnSinh') },
      { key: 'ten_don_vi', label: txt('danTocToChucQuanTrong.store.donViCol') },
      { key: 'dia_chi', label: txt('danTocToChucQuanTrong.store.diaChiCol') },
      { key: 'so_dien_thoai', label: txt('danTocToChucQuanTrong.store.soDienThoaiCol') },
      { key: 'trang_thai', label: txt('danTocToChucQuanTrong.store.trangThaiCol') },
      { key: 'tg_cap_nhat', label: txt('danTocToChucQuanTrong.store.tgCapNhatCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'loai_hinh', label: txt('danTocToChucQuanTrong.form.loaiHinh'), required: true },
      { key: 'ten_co_so', label: txt('danTocToChucQuanTrong.form.tenCoSo'), required: true },
      { key: 'chu_tri', label: txt('danTocToChucQuanTrong.form.chuTri') },
      { key: 'lich_su_hinh_thanh', label: txt('danTocToChucQuanTrong.form.lichSuHinhThanh') },
      { key: 'cong_tac_an_sinh', label: txt('danTocToChucQuanTrong.form.congTacAnSinh') },
      { key: 'ten_don_vi', label: txt('danTocToChucQuanTrong.form.donVi') },
      { key: 'dia_chi', label: txt('danTocToChucQuanTrong.form.diaChi') },
      { key: 'so_dien_thoai', label: txt('danTocToChucQuanTrong.form.soDienThoai') },
      { key: 'trang_thai', label: txt('danTocToChucQuanTrong.form.trangThai') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ThongTinToChucQuanTrong) => ({
      loai_hinh: item.loai_hinh,
      ten_co_so: item.ten_co_so,
      chu_tri: item.chu_tri ?? '',
      lich_su_hinh_thanh: item.lich_su_hinh_thanh ?? '',
      cong_tac_an_sinh: item.cong_tac_an_sinh ?? '',
      ten_don_vi: item.ten_don_vi ?? '',
      dia_chi: item.dia_chi ?? '',
      so_dien_thoai: item.so_dien_thoai ?? '',
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
      countThongTinToChucQuanTrongColumnSearchActive(cs) > 0 ||
      filters.loai_hinh_filter.length > 0 ||
      filters.trang_thai_filter.length > 0 ||
      filters.don_vi_filter.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('danTocToChucQuanTrong.emptyTitle'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('danTocToChucQuanTrong.emptyFilteredHint')
        : txt('danTocToChucQuanTrong.emptyHint'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = viewableRows.find((r) => r.id === viewingId);
    if (!fresh) {
      const row = rows.find((r) => r.id === viewingId);
      if (row && !dttgRowVisibleByDonVi(viewer, [row.don_vi_id])) {
        toast.error(txt('danTocToChucQuanTrong.noViewRowPermission'));
      }
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(viewingId), fresh);
  }, [rows, viewableRows, viewingId, queryClient, viewer]);

  const handleView = useCallback(
    (item: ThongTinToChucQuanTrong) => {
      queryClient.setQueryData(queryKeys.danTocToChucQuanTrong.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient],
  );

  const handleEditFromList = (item: ThongTinToChucQuanTrong) => {
    if (!canMutateDttgRowByDonVi(viewer, [item.don_vi_id])) {
      toast.error(txt('danTocToChucQuanTrong.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: ThongTinToChucQuanTrong) => {
    if (!canMutateDttgRowByDonVi(viewer, [d.don_vi_id])) {
      toast.error(txt('danTocToChucQuanTrong.noEditOtherDonVi'));
      return;
    }
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!canMutateDttgRowByDonVi(viewer, [row?.don_vi_id])) {
      toast.error(txt('danTocToChucQuanTrong.noDeleteOtherDonVi'));
      return;
    }
    confirm({
      title: txt('danTocToChucQuanTrong.deleteTitle'),
      message: txt('danTocToChucQuanTrong.deleteMessage'),
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
      return row && canMutateDttgRowByDonVi(viewer, [row.don_vi_id]);
    });
    if (allowedIds.length === 0) {
      toast.error(txt('danTocToChucQuanTrong.noDeleteOtherDonVi'));
      return;
    }
    if (allowedIds.length < ids.length) {
      toast.error(txt('danTocToChucQuanTrong.noDeleteOtherDonVi'));
    }
    confirm({
      title: txt('danTocToChucQuanTrong.bulkDeleteTitle'),
      message: txt('danTocToChucQuanTrong.bulkDeleteMessage', { count: allowedIds.length }),
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

  const handleStatusChange = (item: ThongTinToChucQuanTrong) => {
    const newStatus = item.trang_thai === 'Đang hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động';
    const statusLabel = newStatus === 'Đang hoạt động' ? txt('position.active') : txt('position.inactive');
    confirm({
      title: txt('danTocToChucQuanTrong.statusChangeTitle'),
      message: txt('danTocToChucQuanTrong.statusChangeMessage', { name: item.ten_co_so, status: statusLabel }),
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        statusMutation.mutate({ id: item.id, status: newStatus });
      },
    });
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.warning(txt('danTocToChucQuanTrong.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (!nhanVienId) {
        toast.error(txt('danTocToChucQuanTrong.service.noEmployeeProfile'));
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
        <ThongTinToChucQuanTrongToolbar
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
                message={txt('danTocToChucQuanTrong.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <ThongTinToChucQuanTrongTable
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
            <ThongTinToChucQuanTrongForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThongTinToChucQuanTrongDetail
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
            fileName={txt('danTocToChucQuanTrong.exportFileName')}
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
            templateFileName={txt('danTocToChucQuanTrong.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThongTinToChucQuanTrongPage;
