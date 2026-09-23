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
import { BarChart3, List } from 'lucide-react';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import TabGroup from '@/components/ui/TabGroup';
import PageTabRow from '@/components/shared/PageTabRow';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import ExportDialog from '@/components/shared/ExportDialog';
import ErrorState from '@/components/shared/ErrorState';
import {
  useKhenThuongNhaTaiTroDetail,
  useDeleteKhenThuongNhaTaiTroMany,
} from './hooks/use-khen-thuong-nha-tai-tro';
import { canViewKtntRow, useKtntViewer, ktntViewerRpcScope } from './hooks/use-ktnt-viewer';
import {
  getKhenThuongNhaTaiTroAll,
  getKhenThuongNhaTaiTroPage,
} from './services/khen-thuong-nha-tai-tro-service';
import { useKhenThuongNhaTaiTroStore } from './store/useKhenThuongNhaTaiTroStore';
import type { KhenThuongNhaTaiTro } from './core/types';
import { countNddkColumnSearchActive } from '../danh-sach/utils/column-search';
import { getKtntColumnDisplayValue } from './utils/column-display';
import KtntToolbar from './components/ktnt-toolbar';
import KtntThongKePanel from './components/ktnt-thong-ke-panel';
import { KTNT_MAIN_TABS } from './core/constants';
import KtntTable from './components/ktnt-table';

const KtntForm = lazy(() => import('./components/ktnt-form'));
const KtntDetail = lazy(() => import('./components/ktnt-detail'));

/** [cột, khoá nhãn trong `khenThuongNhaTaiTro.store`] — đúng thứ tự mẫu nhập liệu. */
const EXPORT_KEYS: readonly (readonly [string, string])[] = [
  ['ngay_khen', 'ngayKhenCol'],
  ['noi_dung_khen', 'noiDungCol'],
  ['so_quyet_dinh', 'soQuyetDinhCol'],
  ['cap_khen', 'capKhenCol'],
  ['don_vi_khen', 'donViKhenCol'],
  ['ten_xa_phuong', 'xaPhuongCol'],
  ['ten_nha_tai_tro', 'nhaTaiTroCol'],
  ['loai_nha_tai_tro', 'loaiNhaTaiTroCol'],
  ['so_khoan_ho_tro', 'soKhoanCol'],
  ['so_nguoi_duoc_ho_tro', 'soNguoiCol'],
  ['tong_tien_ho_tro', 'tongTienHoTroCol'],
  ['gia_tri_dong_gop_khac', 'giaTriKhacCol'],
  ['tong_gia_tri', 'tongGiaTriCol'],
  ['trang_thai', 'trangThaiCol'],
  ['ngay_cap_nhat_trang_thai', 'ngayTrangThaiCol'],
  ['ho_va_ten_nguoi_duyet', 'nguoiDuyetCol'],
  ['ghi_chu', 'ghiChuCol'],
  ['ho_va_ten_nguoi_tao', 'nguoiTaoCol'],
  ['tg_cap_nhat', 'tgCapNhatCol'],
];

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

const KhenThuongNhaTaiTroPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'khenThuongNhaTaiTroList');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const { canExport } = useResourcePermissions('khenThuongNhaTaiTroList');
  const [mainTab, setMainTab] = useTabSearchParam(KTNT_MAIN_TABS, 'danh_sach');

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
    toast.error(txt('khenThuongNhaTaiTro.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KhenThuongNhaTaiTro | null>(null);
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
  } = useKhenThuongNhaTaiTroStore();

  const viewer = useKtntViewer();

  // Phạm vi xem đi xuống RPC: cấp Xã phường chỉ thấy hồ sơ thuộc xã mình, và
  // người chưa được gán đơn vị thấy rỗng (RPC không nới lỏng khi id là NULL).
  const pageExtraParams = useMemo(
    () => ({
      ...ktntViewerRpcScope(viewer),
      nam: filters.nam_filter,
      capKhen: filters.cap_khen_filter,
      trangThai: filters.trang_thai_filter,
      xaPhuongIds: filters.xa_phuong_filter,
      nhaTaiTroIds: filters.nha_tai_tro_filter,
      loaiNhaTaiTro: filters.loai_nha_tai_tro_filter,
      columnSearch: filters.columnSearch ?? null,
    }),
    [viewer, filters],
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
    queryKey: queryKeys.khenThuongNhaTaiTro.page,
    fetchFn: getKhenThuongNhaTaiTroPage,
    enabled: listQueryEnabled,
  });

  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useKhenThuongNhaTaiTroDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteKhenThuongNhaTaiTroMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const EXPORT_COLUMNS = useMemo(
    () =>
      EXPORT_KEYS.map(([key, labelKey]) => ({ key, label: txt(`khenThuongNhaTaiTro.store.${labelKey}`) })),
    [],
  );

  const exportMapFn = useCallback(
    (item: KhenThuongNhaTaiTro) =>
      Object.fromEntries(EXPORT_KEYS.map(([key]) => [key, getKtntColumnDisplayValue(item, key)])),
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
    const all = await getKhenThuongNhaTaiTroAll(listPageQuery);
    return all.map(exportMapFn);
  }, [listPageQuery, exportMapFn]);

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [columns],
  );

  const hasListFilters = useMemo(() => {
    const { columnSearch, ...chips } = filters;
    return (
      Boolean(searchTerm?.trim()) ||
      countNddkColumnSearchActive(columnSearch ?? {}) > 0 ||
      Object.values(chips).some((v) => v.length > 0)
    );
  }, [searchTerm, filters]);

  // Phân trang phía máy chủ: không còn biết tổng số dòng chưa lọc, nên phân
  // biệt "rỗng thật" / "không khớp lọc" theo việc có bộ lọc đang bật hay không.
  const emptyTitleResolved =
    listTotal === 0 && hasListFilters ? txt('common.noResults') : txt('khenThuongNhaTaiTro.empty');

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (fresh) queryClient.setQueryData(queryKeys.khenThuongNhaTaiTro.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleView = useCallback(
    (item: KhenThuongNhaTaiTro) => {
      if (!canViewKtntRow(viewer, item)) {
        toast.error(txt('khenThuongNhaTaiTro.noViewRowPermission'));
        return;
      }
      queryClient.setQueryData(queryKeys.khenThuongNhaTaiTro.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient, viewer],
  );

  const handleEditFromList = (item: KhenThuongNhaTaiTro) => {
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: KhenThuongNhaTaiTro) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('khenThuongNhaTaiTro.deleteTitle'),
      message: txt('khenThuongNhaTaiTro.deleteMessage'),
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
      title: txt('khenThuongNhaTaiTro.bulkDeleteTitle'),
      message: txt('khenThuongNhaTaiTro.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('page.articleSettings.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handlePageBack = () => navigate('/an-sinh-xa-hoi');

  const tabsSlot = (
    <TabGroup
      tabs={[
        { id: 'danh_sach', label: txt('khenThuongNhaTaiTro.tabs.danhSach'), icon: List },
        { id: 'thong_ke', label: txt('khenThuongNhaTaiTro.tabs.thongKe'), icon: BarChart3 },
      ]}
      activeTab={mainTab}
      onChange={setMainTab}
      className="shrink-0"
    />
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
      <PageTabRow>{tabsSlot}</PageTabRow>
      {mainTab === 'thong_ke' ? (
        <KtntThongKePanel
          onPageBack={handlePageBack}
          canExport={canExport}
          queryEnabled={listQueryEnabled}
        />
      ) : (
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <KtntToolbar
          onPageBack={handlePageBack}
          onAdd={() => {
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('khenThuongNhaTaiTro.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <KtntTable
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
      )}

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KtntForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KtntDetail
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
            fileName={txt('khenThuongNhaTaiTro.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
            serverTotalRecords={listTotal}
            fetchAllData={fetchAllForExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KhenThuongNhaTaiTroPage;
