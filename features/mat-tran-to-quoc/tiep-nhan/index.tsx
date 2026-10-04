import React, { Suspense, lazy, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BarChart3, List } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { txt } from '@/lib/text';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import TabGroup from '@/components/ui/TabGroup';
import PageTabRow from '@/components/shared/PageTabRow';
import ExportDialog from '@/components/shared/ExportDialog';
import ErrorState from '@/components/shared/ErrorState';
import { TN_LIST_PATH, TN_MAIN_TABS } from './core/constants';
import type { TiepNhan, TiepNhanFull } from './core/types';
import { useDeleteTiepNhanMany, useTiepNhanFull } from './hooks/use-tiep-nhan';
import { getTiepNhanAllForExport, getTiepNhanFull, getTiepNhanPage } from './services/tiep-nhan-service';
import { useTiepNhanStore } from './store/useTiepNhanStore';
import { getTnColumnDisplayValue } from './utils/column-display';
import TnToolbar from './components/tn-toolbar';
import TnTable from './components/tn-table';
import TnThongKePanel from './components/tn-thong-ke-panel';

const TnForm = lazy(() => import('./components/tn-form'));
const TnDetail = lazy(() => import('./components/tn-detail'));

/** [cột, khoá nhãn trong `matTranTiepNhan.store`]. */
const EXPORT_KEYS: readonly (readonly [string, string])[] = [
  ['so_phieu', 'soPhieuCol'],
  ['ngay_tiep_nhan', 'ngayCol'],
  ['ten_nha_tai_tro', 'nhaTaiTroCol'],
  ['ten_chuong_trinh', 'chuongTrinhCol'],
  ['ten_don_vi_tiep_nhan', 'donViTiepNhanCol'],
  ['hinh_thuc', 'hinhThucCol'],
  ['so_tien', 'soTienCol'],
  ['giay_to_co_gia_gia_tri', 'giayToCoGiaCol'],
  ['hien_vat_khac_gia_tri', 'hienVatKhacCol'],
  ['gia_tri_phieu_kho', 'phieuKhoCol'],
  ['tong_gia_tri', 'tongGiaTriCol'],
  ['trang_thai', 'trangThaiCol'],
  ['ghi_chu', 'ghiChuCol'],
  ['ho_va_ten_nguoi_tao', 'nguoiTaoCol'],
  ['tg_cap_nhat', 'tgCapNhatCol'],
];

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

const TiepNhanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranTiepNhan');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const { canExport } = useResourcePermissions('matTranTiepNhan');
  const [mainTab, setMainTab] = useTabSearchParam(TN_MAIN_TABS, 'danh_sach');

  const listQueryEnabled = Boolean(user && (user.role === 'admin' || (matrixActive && canView)));
  const chucVuKey = user ? (Array.isArray(user.id_chuc_vu) ? (user.id_chuc_vu[0] ?? '') : String(user.id_chuc_vu ?? '')) : '';
  // Dùng `matrixLoading` thay cho `!matrixActive`: truy vấn quyền thất bại thì trang không quay vòng mãi.
  const waitingMatrixHydrate = user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && matrixLoading;

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranTiepNhan.noViewPermission'));
    navigate('/nghia-tinh-dong-lam', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TiepNhanFull | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, setFilter, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useTiepNhanStore();

  useEffect(() => () => resetState(), [resetState]);

  // Link từ màn Nhà tài trợ: `?nha_tai_tro=<id>` ⇒ lọc sẵn theo nhà tài trợ đó.
  useEffect(() => {
    const ntt = searchParams.get('nha_tai_tro');
    if (!ntt) return;
    setFilter('nha_tai_tro_filter', [ntt]);
    const next = new URLSearchParams(searchParams);
    next.delete('nha_tai_tro');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, setFilter]);

  // Phạm vi xem do máy chủ tự tính (policy tn_tiep_nhan_xem) — client không gửi.
  const pageExtraParams = useMemo(
    () => ({
      nhaTaiTroIds: filters.nha_tai_tro_filter,
      chuongTrinhIds: filters.chuong_trinh_filter,
      hinhThuc: filters.hinh_thuc_filter,
      trangThai: filters.trang_thai_filter,
    }),
    [filters],
  );

  const {
    rows,
    totalRecords: listTotal,
    hasNextPage: listHasNext,
    isLoading,
    isError,
    refetch,
    params: listPageQuery,
  } = useServerPagedList({
    pagination,
    searchTerm,
    sort,
    extraParams: pageExtraParams,
    queryKey: queryKeys.tiepNhan.page,
    fetchFn: getTiepNhanPage,
    // Tab Thống kê có nguồn riêng — không kéo trang danh sách khi đang ở đó.
    enabled: listQueryEnabled && mainTab === 'danh_sach',
  });

  const { data: viewingData } = useTiepNhanFull(viewingId, { enabled: listQueryEnabled && Boolean(viewingId) });
  const deleteMutation = useDeleteTiepNhanMany();

  const EXPORT_COLUMNS = useMemo(
    () => EXPORT_KEYS.map(([key, labelKey]) => ({ key, label: txt(`matTranTiepNhan.store.${labelKey}`) })),
    [],
  );
  const exportMapFn = useCallback(
    (item: TiepNhan) => Object.fromEntries(EXPORT_KEYS.map(([key]) => [key, getTnColumnDisplayValue(item, key)])),
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
    const all = await getTiepNhanAllForExport(listPageQuery);
    return all.map(exportMapFn);
  }, [listPageQuery, exportMapFn]);

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [columns],
  );

  const hasListFilters =
    Boolean(searchTerm?.trim()) ||
    filters.trang_thai_filter.length > 0 ||
    filters.hinh_thuc_filter.length > 0 ||
    filters.chuong_trinh_filter.length > 0 ||
    filters.nha_tai_tro_filter.length > 0;

  /** Form sửa cần bản đầy đủ (mục đích, phụ lục, phiếu kho gắn). */
  const openEdit = useCallback(
    (id: string) => {
      void queryClient
        .fetchQuery({
          queryKey: queryKeys.tiepNhan.full(id),
          queryFn: () => getTiepNhanFull(id),
          ...transactionalCrudListQueryOptions,
        })
        .then((full) => {
          if (!full) {
            toast.error(txt('matTranTiepNhan.notFound'));
            return;
          }
          startTransition(() => {
            setEditing(full);
            setShowForm(true);
          });
        });
    },
    [queryClient],
  );

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranTiepNhan.deleteTitle'),
      message: txt('matTranTiepNhan.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync([id]);
        if (viewingId === id) setViewingId(null);
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('matTranTiepNhan.bulkDeleteTitle'),
      message: txt('matTranTiepNhan.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync(ids);
        clearSelection();
        if (viewingId && ids.includes(viewingId)) setViewingId(null);
      },
    });
  };

  const handleExport = () => {
    if (listTotal === 0) {
      toast.warning(txt('matTranTiepNhan.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handlePageBack = () => navigate('/nghia-tinh-dong-lam');

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4" aria-busy="true" aria-label={txt('common.loading')}>
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative">
      <PageTabRow>
        <TabGroup
          tabs={[
            { id: 'danh_sach', label: txt('matTranTiepNhan.tabs.danhSach'), icon: List },
            { id: 'thong_ke', label: txt('matTranTiepNhan.tabs.thongKe'), icon: BarChart3 },
          ]}
          activeTab={mainTab}
          onChange={setMainTab}
          className="shrink-0"
        />
      </PageTabRow>
      {mainTab === 'thong_ke' ? (
        <TnThongKePanel onPageBack={handlePageBack} canExport={canExport} queryEnabled={listQueryEnabled} />
      ) : (
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <TnToolbar
          onPageBack={handlePageBack}
          onAdd={() =>
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            })
          }
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
        />
        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('matTranTiepNhan.listLoadErrorHint')}
                onRetry={() => void refetch()}
                primaryButtons
              />
            </div>
          ) : (
            <TnTable
              data={rows}
              isLoading={isLoading || waitingMatrixHydrate}
              isError={isError}
              onRetry={refetch}
              onEdit={(item) => openEdit(item.id)}
              onDelete={handleDelete}
              onPrint={(item) => navigate(`${TN_LIST_PATH}/${item.id}/in/bien-ban-xac-nhan`)}
              onView={(item) => setViewingId(item.id)}
              emptyTitle={listTotal === 0 && hasListFilters ? txt('common.noResults') : txt('matTranTiepNhan.empty')}
              emptyDescription={hasListFilters ? undefined : txt('matTranTiepNhan.emptyHint')}
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
            <TnForm
              initialData={editing}
              onClose={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <TnDetail
              data={viewingData}
              onClose={() => setViewingId(null)}
              onEdit={(d) =>
                startTransition(() => {
                  setEditing(d);
                  setShowForm(true);
                })
              }
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
            fileName={txt('matTranTiepNhan.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
            serverTotalRecords={listTotal}
            fetchAllData={fetchAllForExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TiepNhanPage;
