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
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import ExportDialog from '@/components/shared/ExportDialog';
import ErrorState from '@/components/shared/ErrorState';
import { useHoNgheoDetail, useDeleteHoNgheoMany } from './hooks/use-ho-ngheo';
import {
  canViewHoNgheoRow,
  isHoNgheoScopedToXaPhuong,
  isHoNgheoViewUnrestricted,
  useHoNgheoViewer,
} from './hooks/use-ho-ngheo-viewer';
import { getHoNgheoAllForExport, getHoNgheoPage } from './services/ho-ngheo-service';
import { useHoNgheoStore } from './store/useHoNgheoStore';
import type { HoNgheo } from './core/types';
import { countHnghColumnSearchActive } from './utils/column-search';
import { getHnghColumnDisplayValue } from './utils/column-display';
import HoNgheoToolbar from './components/ho-ngheo-toolbar';
import HoNgheoTable from './components/ho-ngheo-table';

const HoNgheoForm = lazy(() => import('./components/ho-ngheo-form'));
const HoNgheoDetail = lazy(() => import('./components/ho-ngheo-detail'));

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

const ThongTinHoNgheoPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'hoNgheoList');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(user && (user.role === 'admin' || (matrixActive && canView)));

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
    toast.error(txt('hoNgheo.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HoNgheo | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
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
  } = useHoNgheoStore();

  const viewer = useHoNgheoViewer();
  const scopedToXa = isHoNgheoScopedToXaPhuong(viewer);

  // Phạm vi xem đi xuống RPC: cấp Xã phường chỉ thấy hộ thuộc xã mình, và người
  // chưa được gán đơn vị thấy rỗng (RPC không nới lỏng khi id là NULL).
  const pageExtraParams = useMemo(
    () => ({
      viewAll: isHoNgheoViewUnrestricted(viewer) || viewer.chucVuCapQuanLy !== 'Xã phường',
      viewerXaPhuongId: viewer.chucVuCapQuanLy === 'Xã phường' ? viewer.viewerDonViId : null,
      doiTuong: filters.doi_tuong_filter,
      tonGiao: filters.ton_giao_filter,
      trangThai: filters.trang_thai_filter,
      danTocIds: filters.dan_toc_filter,
      xaPhuongIds: filters.xa_phuong_filter,
      columnSearch: filters.columnSearch ?? null,
    }),
    [
      viewer,
      filters.doi_tuong_filter,
      filters.ton_giao_filter,
      filters.trang_thai_filter,
      filters.dan_toc_filter,
      filters.xa_phuong_filter,
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
    queryKey: queryKeys.hoNgheo.page,
    fetchFn: getHoNgheoPage,
    enabled: listQueryEnabled,
  });

  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useHoNgheoDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteHoNgheoMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_ten_dai_dien', label: txt('hoNgheo.store.hoTenCol') },
      { key: 'so_cccd', label: txt('hoNgheo.store.soCccdCol') },
      { key: 'ten_xa_phuong', label: txt('hoNgheo.store.xaPhuongCol') },
      { key: 'khoi_xom', label: txt('hoNgheo.store.khoiXomCol') },
      { key: 'doi_tuong', label: txt('hoNgheo.store.doiTuongCol') },
      { key: 'dien_thoai', label: txt('hoNgheo.store.dienThoaiCol') },
      { key: 'ten_dan_toc', label: txt('hoNgheo.store.danTocCol') },
      { key: 'ton_giao', label: txt('hoNgheo.store.tonGiaoCol') },
      { key: 'so_tai_khoan', label: txt('hoNgheo.store.soTaiKhoanCol') },
      { key: 'ngan_hang', label: txt('hoNgheo.store.nganHangCol') },
      { key: 'trang_thai', label: txt('hoNgheo.store.trangThaiCol') },
      { key: 'ngay_cap_nhat_trang_thai', label: txt('hoNgheo.store.ngayTrangThaiCol') },
      { key: 'ghi_chu', label: txt('hoNgheo.store.ghiChuCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('hoNgheo.store.nguoiTaoCol') },
      { key: 'tg_cap_nhat', label: txt('hoNgheo.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: HoNgheo) => ({
      ho_ten_dai_dien: item.ho_ten_dai_dien,
      so_cccd: getHnghColumnDisplayValue(item, 'so_cccd'),
      ten_xa_phuong: getHnghColumnDisplayValue(item, 'ten_xa_phuong'),
      khoi_xom: getHnghColumnDisplayValue(item, 'khoi_xom'),
      doi_tuong: getHnghColumnDisplayValue(item, 'doi_tuong'),
      dien_thoai: getHnghColumnDisplayValue(item, 'dien_thoai'),
      ten_dan_toc: getHnghColumnDisplayValue(item, 'ten_dan_toc'),
      ton_giao: item.ton_giao,
      so_tai_khoan: getHnghColumnDisplayValue(item, 'so_tai_khoan'),
      ngan_hang: getHnghColumnDisplayValue(item, 'ngan_hang'),
      trang_thai: item.trang_thai,
      ngay_cap_nhat_trang_thai: getHnghColumnDisplayValue(item, 'ngay_cap_nhat_trang_thai'),
      ghi_chu: getHnghColumnDisplayValue(item, 'ghi_chu'),
      ho_va_ten_nguoi_tao: getHnghColumnDisplayValue(item, 'ho_va_ten_nguoi_tao'),
      tg_cap_nhat: getHnghColumnDisplayValue(item, 'tg_cap_nhat'),
    }),
    [],
  );

  const {
    exportData,
    paginatedData: paginatedExportData,
    selectedData: selectedExportData,
  } = useExportData({
    data: rows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  // Phạm vi "Tất cả" phải ra đủ số dòng khớp bộ lọc, không phải trang đang xem.
  const fetchAllForExport = useCallback(async () => {
    const all = await getHoNgheoAllForExport(listPageQuery);
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
      countHnghColumnSearchActive(cs) > 0 ||
      filters.doi_tuong_filter.length > 0 ||
      filters.ton_giao_filter.length > 0 ||
      filters.trang_thai_filter.length > 0 ||
      filters.dan_toc_filter.length > 0 ||
      filters.xa_phuong_filter.length > 0
    );
  }, [searchTerm, filters]);

  // Phân trang phía máy chủ: không còn biết tổng số dòng chưa lọc, nên phân
  // biệt "rỗng thật" / "không khớp lọc" theo việc có bộ lọc đang bật hay không.
  const emptyTitleResolved =
    listTotal === 0 && hasListFilters ? txt('hoNgheo.emptyFiltered') : txt('hoNgheo.empty');

  // Bản ghi đang mở được cập nhật khi danh sách refetch — tránh màn chi tiết
  // hiển thị dữ liệu cũ sau khi ai đó sửa ở nơi khác.
  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (fresh) queryClient.setQueryData(queryKeys.hoNgheo.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleView = useCallback(
    (item: HoNgheo) => {
      if (!canViewHoNgheoRow(viewer, item)) {
        toast.error(txt('hoNgheo.noViewRowPermission'));
        return;
      }
      queryClient.setQueryData(queryKeys.hoNgheo.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient, viewer],
  );

  const handleEditFromList = (item: HoNgheo) => {
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: HoNgheo) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('hoNgheo.deleteTitle'),
      message: txt('hoNgheo.deleteMessage'),
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
      title: txt('hoNgheo.bulkDeleteTitle'),
      message: txt('hoNgheo.bulkDeleteMessage', { count: ids.length }),
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
    if (listTotal === 0) {
      toast.warning(txt('hoNgheo.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handlePageBack = () => navigate('/an-sinh-xa-hoi');

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
        <HoNgheoToolbar
          onPageBack={handlePageBack}
          onAdd={() => {
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          scopedToXaPhuongId={scopedToXa ? viewer.viewerDonViId : null}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('hoNgheo.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <HoNgheoTable
              data={rows}
              isLoading={isListLoading}
              isError={isListError}
              onRetry={refetchList}
              onEdit={handleEditFromList}
              onDelete={handleDelete}
              onView={handleView}
              emptyTitle={emptyTitleResolved}
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
            <HoNgheoForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <HoNgheoDetail
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
            fileName={txt('hoNgheo.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
            serverTotalRecords={listTotal}
            fetchAllData={fetchAllForExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThongTinHoNgheoPage;
