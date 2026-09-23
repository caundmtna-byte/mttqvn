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
  useNhaDaiDoanKetDetail,
  useDeleteNhaDaiDoanKetMany,
} from './hooks/use-nha-dai-doan-ket';
import { canViewNddkRow, isNddkViewUnrestricted, useNddkViewer } from './hooks/use-nddk-viewer';
import {
  getNhaDaiDoanKetAllForExport,
  getNhaDaiDoanKetPage,
} from './services/nha-dai-doan-ket-service';
import { useNhaDaiDoanKetStore } from './store/useNhaDaiDoanKetStore';
import type { NhaDaiDoanKet } from './core/types';
import { countNddkColumnSearchActive } from './utils/column-search';
import { getNddkColumnDisplayValue } from './utils/column-display';
import NddkToolbar from './components/nddk-toolbar';
import NddkThongKePanel from './components/nddk-thong-ke-panel';
import { NDDK_MAIN_TABS } from './core/constants';
import NddkTable from './components/nddk-table';

const NddkForm = lazy(() => import('./components/nddk-form'));
const NddkDetail = lazy(() => import('./components/nddk-detail'));

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

const NhaDaiDoanKetPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'nhaDaiDoanKetList');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const { canExport } = useResourcePermissions('nhaDaiDoanKetList');
  const [mainTab, setMainTab] = useTabSearchParam(NDDK_MAIN_TABS, 'danh_sach');

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
    toast.error(txt('nhaDaiDoanKet.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NhaDaiDoanKet | null>(null);
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
  } = useNhaDaiDoanKetStore();

  const viewer = useNddkViewer();

  // Phạm vi xem đi xuống RPC: cấp Xã phường chỉ thấy hồ sơ thuộc xã mình, và
  // người chưa được gán đơn vị thấy rỗng (RPC không nới lỏng khi id là NULL).
  const pageExtraParams = useMemo(
    () => ({
      viewAll: isNddkViewUnrestricted(viewer) || viewer.chucVuCapQuanLy !== 'Xã phường',
      viewerXaPhuongId: viewer.chucVuCapQuanLy === 'Xã phường' ? viewer.viewerDonViId : null,
      nam: filters.nam_filter,
      nguon: filters.nguon_filter,
      nguonHoTro: filters.nguon_ho_tro_filter,
      doiTuong: filters.doi_tuong_filter,
      loaiHinh: filters.loai_hinh_filter,
      trangThai: filters.trang_thai_filter,
      xaPhuongIds: filters.xa_phuong_filter,
      columnSearch: filters.columnSearch ?? null,
    }),
    [
      viewer,
      filters.nam_filter,
      filters.nguon_filter,
      filters.nguon_ho_tro_filter,
      filters.doi_tuong_filter,
      filters.loai_hinh_filter,
      filters.trang_thai_filter,
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
    queryKey: queryKeys.nhaDaiDoanKet.page,
    fetchFn: getNhaDaiDoanKetPage,
    enabled: listQueryEnabled,
  });

  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useNhaDaiDoanKetDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteNhaDaiDoanKetMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'noi_dung_ho_tro', label: txt('nhaDaiDoanKet.store.noiDungCol') },
      { key: 'nam', label: txt('nhaDaiDoanKet.store.namCol') },
      { key: 'nguon', label: txt('nhaDaiDoanKet.store.nguonCol') },
      { key: 'nguon_ho_tro', label: txt('nhaDaiDoanKet.store.nguonHoTroCol') },
      { key: 'ho_ten_chu_ho', label: txt('nhaDaiDoanKet.store.chuHoCol') },
      { key: 'ten_xa_phuong', label: txt('nhaDaiDoanKet.store.xaPhuongCol') },
      { key: 'khoi_xom', label: txt('nhaDaiDoanKet.store.khoiXomCol') },
      { key: 'doi_tuong', label: txt('nhaDaiDoanKet.store.doiTuongCol') },
      { key: 'loai_hinh_ho_tro', label: txt('nhaDaiDoanKet.store.loaiHinhCol') },
      { key: 'so_tien', label: txt('nhaDaiDoanKet.store.soTienCol') },
      { key: 'trang_thai', label: txt('nhaDaiDoanKet.store.trangThaiCol') },
      { key: 'ngay_cap_nhat_trang_thai', label: txt('nhaDaiDoanKet.store.ngayTrangThaiCol') },
      { key: 'ghi_chu', label: txt('nhaDaiDoanKet.store.ghiChuCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('nhaDaiDoanKet.store.nguoiTaoCol') },
      { key: 'tg_cap_nhat', label: txt('nhaDaiDoanKet.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: NhaDaiDoanKet) => ({
      noi_dung_ho_tro: item.noi_dung_ho_tro,
      nam: item.nam,
      nguon: item.nguon,
      nguon_ho_tro: item.nguon_ho_tro,
      ho_ten_chu_ho: item.ho_ten_chu_ho,
      ten_xa_phuong: getNddkColumnDisplayValue(item, 'ten_xa_phuong'),
      khoi_xom: getNddkColumnDisplayValue(item, 'khoi_xom'),
      doi_tuong: getNddkColumnDisplayValue(item, 'doi_tuong'),
      loai_hinh_ho_tro: item.loai_hinh_ho_tro,
      so_tien: getNddkColumnDisplayValue(item, 'so_tien'),
      trang_thai: item.trang_thai,
      ngay_cap_nhat_trang_thai: getNddkColumnDisplayValue(item, 'ngay_cap_nhat_trang_thai'),
      ghi_chu: getNddkColumnDisplayValue(item, 'ghi_chu'),
      ho_va_ten_nguoi_tao: getNddkColumnDisplayValue(item, 'ho_va_ten_nguoi_tao'),
      tg_cap_nhat: getNddkColumnDisplayValue(item, 'tg_cap_nhat'),
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
    const all = await getNhaDaiDoanKetAllForExport(listPageQuery);
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
      countNddkColumnSearchActive(cs) > 0 ||
      filters.nam_filter.length > 0 ||
      filters.nguon_filter.length > 0 ||
      filters.nguon_ho_tro_filter.length > 0 ||
      filters.doi_tuong_filter.length > 0 ||
      filters.loai_hinh_filter.length > 0 ||
      filters.trang_thai_filter.length > 0 ||
      filters.xa_phuong_filter.length > 0
    );
  }, [searchTerm, filters]);

  // Phân trang phía máy chủ: không còn biết tổng số dòng chưa lọc, nên phân
  // biệt "rỗng thật" / "không khớp lọc" theo việc có bộ lọc đang bật hay không.
  const emptyTitleResolved =
    listTotal === 0 && hasListFilters ? txt('common.noResults') : txt('nhaDaiDoanKet.empty');

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (fresh) queryClient.setQueryData(queryKeys.nhaDaiDoanKet.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleView = useCallback(
    (item: NhaDaiDoanKet) => {
      if (!canViewNddkRow(viewer, item)) {
        toast.error(txt('nhaDaiDoanKet.noViewRowPermission'));
        return;
      }
      queryClient.setQueryData(queryKeys.nhaDaiDoanKet.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient, viewer],
  );

  const handleEditFromList = (item: NhaDaiDoanKet) => {
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: NhaDaiDoanKet) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('nhaDaiDoanKet.deleteTitle'),
      message: txt('nhaDaiDoanKet.deleteMessage'),
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
      title: txt('nhaDaiDoanKet.bulkDeleteTitle'),
      message: txt('nhaDaiDoanKet.bulkDeleteMessage', { count: ids.length }),
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
        { id: 'danh_sach', label: txt('nhaDaiDoanKet.tabs.danhSach'), icon: List },
        { id: 'thong_ke', label: txt('nhaDaiDoanKet.tabs.thongKe'), icon: BarChart3 },
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
        <NddkThongKePanel
          onPageBack={handlePageBack}
          canExport={canExport}
          queryEnabled={listQueryEnabled}
        />
      ) : (
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <NddkToolbar
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
                message={txt('nhaDaiDoanKet.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <NddkTable
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
            <NddkForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <NddkDetail
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
            fileName={txt('nhaDaiDoanKet.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
            serverTotalRecords={listTotal}
            fetchAllData={fetchAllForExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NhaDaiDoanKetPage;
