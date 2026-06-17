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
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import ExportDialog from '@/components/shared/ExportDialog';
import ErrorState from '@/components/shared/ErrorState';
import {
  useThucHienPhanBienList,
  useThucHienPhanBienDetail,
  useDeleteThucHienPhanBienMany,
} from './hooks/use-thuc-hien-phan-bien';
import {
  canViewPbxhThucHienRow,
  usePbxhThucHienViewer,
} from './hooks/use-pbxh-thuc-hien-viewer';
import { useThucHienPhanBienStore } from './store/useThucHienPhanBienStore';
import type { ThucHienPhanBien } from './core/types';
import { THUC_HIEN_PHAN_BIEN_SEARCH_KEYS } from './utils/search-keys';
import {
  countThucHienColumnSearchActive,
  thucHienMatchesColumnSearch,
} from './utils/column-search';
import { sortThucHienPhanBienList } from './utils/sort';
import { getThucHienColumnDisplayValue } from './utils/column-display';
import ThucHienPhanBienToolbar from './components/thuc-hien-phan-bien-toolbar';
import ThucHienPhanBienTable from './components/thuc-hien-phan-bien-table';

const ThucHienPhanBienForm = lazy(() => import('./components/thuc-hien-phan-bien-form'));
const ThucHienPhanBienDetail = lazy(() => import('./components/thuc-hien-phan-bien-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

const ThucHienPhanBienPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'phanBienThucHien');
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
    toast.error(txt('pbxhThucHien.noViewPermission'));
    navigate('/phan-bien-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ThucHienPhanBien | null>(null);
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
  } = useThucHienPhanBienStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useThucHienPhanBienList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useThucHienPhanBienDetail(viewingId, { enabled: detailEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteThucHienPhanBienMany();
  const viewer = usePbxhThucHienViewer('phanBienThucHien');

  const viewableRows = useMemo(
    () => rows.filter((r) => canViewPbxhThucHienRow(viewer, r)),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback((item: ThucHienPhanBien, term: string, f: typeof filters) => {
    const matchesSearch = matchesSearchTerm(
      {
        ...(item as unknown as Record<string, unknown>),
        ten_don_vi_thuc_hien: getThucHienColumnDisplayValue(item, 'don_vi_thuc_hien'),
      },
      term,
      [...THUC_HIEN_PHAN_BIEN_SEARCH_KEYS],
    );
    if (!thucHienMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.cap_thuc_hien_filter.length > 0 && !f.cap_thuc_hien_filter.includes(item.cap_thuc_hien)) return false;
    if (f.loai_hinh_filter.length > 0 && !f.loai_hinh_filter.includes(item.loai_hinh)) return false;
    if (f.tinh_trang_filter.length > 0 && !f.tinh_trang_filter.includes(item.tinh_trang)) return false;
    if (f.don_vi_chu_tri_filter.length > 0) {
      const id = item.don_vi_chu_tri_id?.trim();
      if (!id || !f.don_vi_chu_tri_filter.includes(id)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortThucHienPhanBienList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'cap_thuc_hien', label: txt('pbxhThucHien.store.capThucHienCol') },
      { key: 'loai_hinh', label: txt('pbxhThucHien.store.loaiHinhCol') },
      { key: 'don_vi_thuc_hien', label: txt('pbxhThucHien.store.donViThucHienCol') },
      { key: 'noi_dung', label: txt('pbxhThucHien.store.noiDungCol') },
      { key: 'ten_doi_tuong', label: txt('pbxhThucHien.store.doiTuongCol') },
      { key: 'ten_hinh_thuc', label: txt('pbxhThucHien.store.hinhThucCol') },
      { key: 'ngay_bat_dau', label: txt('pbxhThucHien.store.ngayBatDauCol') },
      { key: 'ngay_ket_thuc', label: txt('pbxhThucHien.store.ngayKetThucCol') },
      { key: 'mo_ta_thoi_gian', label: txt('pbxhThucHien.store.moTaThoiGianCol') },
      { key: 'tien_do', label: txt('pbxhThucHien.store.tienDoCol') },
      { key: 'tinh_trang', label: txt('pbxhThucHien.store.tinhTrangCol') },
      { key: 'ten_don_vi_chu_tri', label: txt('pbxhThucHien.store.donViChuTriCol') },
      { key: 'ten_phong_ban', label: txt('pbxhThucHien.store.phongBanCol') },
      { key: 'ket_qua_kien_nghi', label: txt('pbxhThucHien.store.ketQuaCol') },
      { key: 'so_lan_hoan_thanh', label: txt('pbxhThucHien.store.soLanHoanThanhCol') },
      { key: 'so_lan_khao_sat', label: txt('pbxhThucHien.store.soLanKhaoSatCol') },
      { key: 'phan_tram_hoan_thanh', label: txt('pbxhThucHien.store.phanTramCol') },
      { key: 'link_ket_qua', label: txt('pbxhThucHien.store.linkKetQuaCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('pbxhThucHien.store.nguoiTaoCol') },
      { key: 'tg_cap_nhat', label: txt('pbxhThucHien.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ThucHienPhanBien) => ({
      cap_thuc_hien: item.cap_thuc_hien,
      loai_hinh: item.loai_hinh,
      don_vi_thuc_hien: getThucHienColumnDisplayValue(item, 'don_vi_thuc_hien'),
      noi_dung: item.noi_dung,
      ten_doi_tuong: getThucHienColumnDisplayValue(item, 'ten_doi_tuong'),
      ten_hinh_thuc: getThucHienColumnDisplayValue(item, 'ten_hinh_thuc'),
      ngay_bat_dau: getThucHienColumnDisplayValue(item, 'ngay_bat_dau'),
      ngay_ket_thuc: getThucHienColumnDisplayValue(item, 'ngay_ket_thuc'),
      mo_ta_thoi_gian: getThucHienColumnDisplayValue(item, 'mo_ta_thoi_gian'),
      tien_do: getThucHienColumnDisplayValue(item, 'tien_do'),
      tinh_trang: item.tinh_trang,
      ten_don_vi_chu_tri: getThucHienColumnDisplayValue(item, 'ten_don_vi_chu_tri'),
      ten_phong_ban: getThucHienColumnDisplayValue(item, 'ten_phong_ban'),
      ket_qua_kien_nghi: getThucHienColumnDisplayValue(item, 'ket_qua_kien_nghi'),
      so_lan_hoan_thanh: item.so_lan_hoan_thanh,
      so_lan_khao_sat: item.so_lan_khao_sat,
      phan_tram_hoan_thanh: getThucHienColumnDisplayValue(item, 'phan_tram_hoan_thanh'),
      link_ket_qua: getThucHienColumnDisplayValue(item, 'link_ket_qua'),
      ho_va_ten_nguoi_tao: getThucHienColumnDisplayValue(item, 'ho_va_ten_nguoi_tao'),
      tg_cap_nhat: getThucHienColumnDisplayValue(item, 'tg_cap_nhat'),
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
      countThucHienColumnSearchActive(cs) > 0 ||
      filters.cap_thuc_hien_filter.length > 0 ||
      filters.loai_hinh_filter.length > 0 ||
      filters.tinh_trang_filter.length > 0 ||
      filters.don_vi_chu_tri_filter.length > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && viewableRows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('pbxhThucHien.empty'),
    [sorted.length, viewableRows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = viewableRows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.pbxhThucHien.detail(viewingId), fresh);
  }, [viewableRows, viewingId, queryClient]);

  const handleView = useCallback(
    (item: ThucHienPhanBien) => {
      if (!canViewPbxhThucHienRow(viewer, item)) {
        toast.error(txt('pbxhThucHien.noViewRowPermission'));
        return;
      }
      queryClient.setQueryData(queryKeys.pbxhThucHien.detail(item.id), item);
      setViewingId(item.id);
    },
    [queryClient, viewer],
  );

  const handleEditFromList = (item: ThucHienPhanBien) => {
    startTransition(() => {
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: ThucHienPhanBien) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('pbxhThucHien.deleteTitle'),
      message: txt('pbxhThucHien.deleteMessage'),
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
      title: txt('pbxhThucHien.bulkDeleteTitle'),
      message: txt('pbxhThucHien.bulkDeleteMessage', { count: ids.length }),
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
    if (sorted.length === 0) {
      toast.warning(txt('page.articleSettings.noExportData'));
      return;
    }
    setShowExport(true);
  };

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
        <ThucHienPhanBienToolbar
          onPageBack={() => navigate('/phan-bien-xa-hoi')}
          onAdd={() => {
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          items={viewableRows}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('pbxhThucHien.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <ThucHienPhanBienTable
              data={sorted}
              isLoading={isListLoading || (listQueryEnabled && isListFetching && rows.length === 0)}
              onEdit={handleEditFromList}
              onDelete={handleDelete}
              onView={handleView}
              emptyTitle={emptyTitleResolved}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThucHienPhanBienForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThucHienPhanBienDetail
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
            fileName="PBXH_Thuc_Hien"
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThucHienPhanBienPage;
