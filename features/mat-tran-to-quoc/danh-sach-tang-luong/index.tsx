import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { History, CalendarRange, BarChart3 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { txt } from '@/lib/text';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { formatCurrency } from '@/lib/utils';
import { useListWithFilter } from '@/lib/hooks';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import { useConfirmStore } from '@/store/useConfirmStore';
import { queryKeys } from '@/lib/query-keys';
import { useExportData } from '@/lib/useExportData';
import ExportDialog from '@/components/shared/ExportDialog';
import TabGroup from '@/components/ui/TabGroup';
import ErrorState from '@/components/shared/ErrorState';
import {
  useMttqTangLuongList,
  useDeleteMttqTangLuong,
  useDeleteMttqTangLuongMany,
} from './hooks/use-mttq-tang-luong';
import {
  canViewTangLuongRow,
  useMttqTangLuongViewer,
} from './hooks/use-mttq-tang-luong-viewer';
import { useMttqTangLuongStore } from './store/useMttqTangLuongStore';
import type { MttqTangLuongKeHoachRow, MttqTangLuongListRow } from './core/types';
import {
  TANG_LUONG_MAIN_TABS,
  type TangLuongMainTab,
} from './core/constants';
import { MTTQ_TANG_LUONG_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  countTangLuongColumnSearchActive,
  tangLuongMatchesColumnSearch,
} from './utils/column-search';
import { getTangLuongLoaiKyLabel } from './utils/display-format';
import { filterRowsForStats } from './utils/aggregate-tang-luong-stats';
import { CHIP_FILTER_NULL } from '../danh-sach-can-bo/core/constants';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import MttqTangLuongToolbar from './components/mttq-tang-luong-toolbar';
import MttqTangLuongTable from './components/mttq-tang-luong-table';
import MttqTangLuongKeHoachPanel from './components/mttq-tang-luong-ke-hoach-panel';
import MttqTangLuongThongKePanel from './components/mttq-tang-luong-thong-ke-panel';

const MttqTangLuongForm = lazy(() => import('./components/mttq-tang-luong-form'));
const MttqTangLuongDetail = lazy(() => import('./components/mttq-tang-luong-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

interface FormPrefill {
  canBoId?: string;
  ngachMoiId?: string;
  bacMoiId?: string;
}

const DanhSachTangLuongPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranSalaryIncreaseList');
  const { canCreate, canEdit, canDelete, canExport } = useResourcePermissions('matTranSalaryIncreaseList');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    user != null &&
    user.role !== 'admin' &&
    chucVuKey.trim() !== '' &&
    !matrixActive;

  const listQueryEnabled = Boolean(
    user && (user.role === 'admin' || (matrixActive && canView)),
  );

  const [mainTab, setMainTab] = useTabSearchParam(TANG_LUONG_MAIN_TABS, 'lich_su');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqTangLuongListRow | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formPrefill, setFormPrefill] = useState<FormPrefill>({});
  const [keHoachYear, setKeHoachYear] = useState(() => new Date().getFullYear());
  const [keHoachGroupMode, setKeHoachGroupMode] = useState<'quarter' | 'month'>('quarter');
  const [statsYear, setStatsYear] = useState(() => new Date().getFullYear());
  const [showExport, setShowExport] = useState(false);

  const {
    searchTerm,
    filters,
    sort,
    resetState,
    selectedIds,
    clearSelection,
  } = useMttqTangLuongStore();

  const { data: rows = [], isLoading, isError, refetch, isFetching } = useMttqTangLuongList({
    enabled: listQueryEnabled,
  });
  const isListLoading = isLoading || isFetching || waitingMatrixHydrate;
  const deleteOne = useDeleteMttqTangLuong();
  const deleteMany = useDeleteMttqTangLuongMany();
  const viewer = useMttqTangLuongViewer();

  const viewableRows = useMemo(
    () => rows.filter((r) => canViewTangLuongRow(viewer, r)),
    [rows, viewer],
  );

  useEffect(() => {
    if (!user || canView || didRedirect.current || waitingMatrixHydrate) return;
    didRedirect.current = true;
    toast.error(txt('matTranTangLuong.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate, waitingMatrixHydrate]);

  useEffect(() => () => resetState(), [resetState]);

  const enrichedRows = useMemo(
    () =>
      viewableRows.map((r) => ({
        ...r,
        loai_ky_label: getTangLuongLoaiKyLabel(r.loai_ky),
        luong_display: r.luong > 0 ? formatCurrency(r.luong) : '',
      })),
    [viewableRows],
  );

  const filterFn = useCallback(
    (item: MttqTangLuongListRow & { loai_ky_label?: string }, term: string, f: typeof filters) => {
      const canBoFilter = searchParams.get('canBoId')?.trim();
      if (canBoFilter && item.can_bo_id !== canBoFilter) return false;
      if (!matchesSearchTerm(item as unknown as Record<string, unknown>, term, [...MTTQ_TANG_LUONG_SEARCHABLE_KEYS])) {
        return false;
      }
      if (!tangLuongMatchesColumnSearch(item, f.columnSearch, f)) return false;
      if (f.loai_ky?.length && !f.loai_ky.includes(item.loai_ky)) return false;
      if (f.phong_ban_id?.length) {
        const pb = item.phong_ban_id ?? CHIP_FILTER_NULL;
        if (!f.phong_ban_id.includes(pb)) return false;
      }
      if (f.chuc_vu_id?.length) {
        const cv = item.chuc_vu_id ?? CHIP_FILTER_NULL;
        if (!f.chuc_vu_id.includes(cv)) return false;
      }
      if (f.don_vi_id?.length) {
        const dv = item.don_vi_id ?? CHIP_FILTER_NULL;
        if (!f.don_vi_id.includes(dv)) return false;
      }
      if (f.to_chuc_id?.length) {
        const tc = item.to_chuc_id ?? CHIP_FILTER_NULL;
        if (!f.to_chuc_id.includes(tc)) return false;
      }
      return true;
    },
    [searchParams],
  );

  const filtered = useListWithFilter(enrichedRows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      const dir = sort.direction === 'desc' ? -1 : 1;
      list.sort((a, b) => {
        const col = sort.column as keyof MttqTangLuongListRow;
        if (col === 'luong') {
          return (Number(a.luong) - Number(b.luong)) * dir;
        }
        const av = String(a[col] ?? '');
        const bv = String(b[col] ?? '');
        return av.localeCompare(bv, 'vi') * dir;
      });
    }
    return list;
  }, [filtered, sort.column, sort.direction]);

  const hasListFilters = useMemo(() => {
    const cs = filters.columnSearch ?? {};
    return (
      Boolean(searchTerm?.trim()) ||
      countTangLuongColumnSearchActive(cs) > 0 ||
      (filters.loai_ky?.length ?? 0) > 0 ||
      (filters.phong_ban_id?.length ?? 0) > 0 ||
      (filters.chuc_vu_id?.length ?? 0) > 0 ||
      (filters.don_vi_id?.length ?? 0) > 0 ||
      (filters.to_chuc_id?.length ?? 0) > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters.columnSearch, filters.loai_ky, filters.phong_ban_id, filters.chuc_vu_id, filters.don_vi_id, filters.to_chuc_id, sort.column]);

  const viewingRow = useMemo(
    () => (viewingId ? viewableRows.find((r) => r.id === viewingId) ?? null : null),
    [viewableRows, viewingId],
  );

  const scopedStatsRows = useMemo(
    () =>
      filterRowsForStats(viewableRows, {
        year: statsYear,
        loaiKy: filters.loai_ky,
        phongBanIds: filters.phong_ban_id,
      }),
    [viewableRows, statsYear, filters.loai_ky, filters.phong_ban_id],
  );

  const exportColumns = useMemo(
    () => [
      { key: 'ho_ten', label: txt('matTranTangLuong.store.canBoCol') },
      { key: 'ten_chuc_vu', label: txt('matTranTangLuong.store.chucVuCol') },
      { key: 'ten_don_vi', label: txt('matTranTangLuong.store.donViCol') },
      { key: 'ngay_nang_luong', label: txt('matTranTangLuong.store.ngayNangCol') },
      { key: 'loai_ky', label: txt('matTranTangLuong.store.loaiKyCol') },
      { key: 'ngach_bac_moi', label: txt('matTranTangLuong.store.ngachMoiCol') },
      { key: 'luong', label: txt('matTranTangLuong.store.luongCol') },
      { key: 'phong_ban', label: txt('matTranTangLuong.filterPhongBan') },
      { key: 'don_vi', label: txt('matTranTangLuong.filterDonVi') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqTangLuongListRow) => ({
      ho_ten: item.ho_ten_can_bo,
      ten_chuc_vu: item.ten_chuc_vu ?? '',
      ten_don_vi: formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi),
      ngay_nang_luong: item.ngay_nang_luong,
      loai_ky: getTangLuongLoaiKyLabel(item.loai_ky),
      ngach_bac_moi: [item.ten_ngach_moi, item.ma_bac_moi].filter(Boolean).join(' · '),
      luong: item.luong > 0 ? formatCurrency(item.luong) : '',
      phong_ban: item.ten_phong_ban ?? '',
      don_vi: formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi),
    }),
    [],
  );

  const { exportData, paginatedData: paginatedExportData } = useExportData({
    data: scopedStatsRows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination: { page: 1, pageSize: 100_000 },
    selectedIds: new Set(),
    keyExtractor: (r) => r.id,
  });

  const handleExportThongKe = useCallback(() => {
    if (scopedStatsRows.length === 0) {
      toast.warning(txt('matTranTangLuong.stats.noExportData'));
      return;
    }
    setShowExport(true);
  }, [scopedStatsRows.length]);

  useEffect(() => {
    if (!viewingId || !viewingRow) return;
    if (!canViewTangLuongRow(viewer, viewingRow)) {
      toast.error(txt('matTranTangLuong.noViewPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingRow, viewer]);

  const tabsSlot = useMemo(
    () => (
      <TabGroup
        tabs={[
          { id: 'lich_su', label: txt('matTranTangLuong.tabs.lichSu'), icon: History },
          { id: 'ke_hoach', label: txt('matTranTangLuong.tabs.keHoach'), icon: CalendarRange },
          { id: 'thong_ke', label: txt('matTranTangLuong.tabs.thongKe'), icon: BarChart3 },
        ]}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as TangLuongMainTab)}
      />
    ),
    [mainTab, setMainTab],
  );

  const handlePageBack = useCallback(() => navigate('/mat-tran-to-quoc'), [navigate]);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormPrefill({});
  };

  const handleAdd = useCallback(() => {
    if (!canCreate) {
      toast.error(txt('matTranTangLuong.noCreatePermission'));
      return;
    }
    setEditing(null);
    setFormPrefill({});
    setShowForm(true);
  }, [canCreate]);

  const handleEdit = useCallback(
    (row: MttqTangLuongListRow) => {
      if (!canEdit) {
        toast.error(txt('matTranTangLuong.noEditPermission'));
        return;
      }
      startTransition(() => {
        setEditing(row);
        setFormPrefill({});
        setShowForm(true);
        setViewingId(null);
      });
    },
    [canEdit],
  );

  const handleView = useCallback(
    (row: MttqTangLuongListRow) => {
      queryClient.setQueryData(queryKeys.mttqTangLuong.detail(row.id), row);
      setViewingId(row.id);
    },
    [queryClient],
  );

  const handleDelete = useCallback(
    (row: MttqTangLuongListRow) => {
      if (!canDelete) {
        toast.error(txt('matTranTangLuong.noDeletePermission'));
        return;
      }
      confirm({
        title: txt('matTranTangLuong.deleteTitle'),
        message: txt('matTranTangLuong.deleteMessage', { ngay: row.ngay_nang_luong }),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: () => {
          deleteOne.mutate(row.id, {
            onSuccess: () => setViewingId((v) => (v === row.id ? null : v)),
          });
        },
      });
    },
    [canDelete, confirm, deleteOne],
  );

  const handleDeleteMany = useCallback(() => {
    if (!canDelete) {
      toast.error(txt('matTranTangLuong.noDeletePermission'));
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    confirm({
      title: txt('matTranTangLuong.bulkDeleteTitle'),
      message: txt('matTranTangLuong.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: () => {
        deleteMany.mutate(ids, { onSuccess: () => clearSelection() });
      },
    });
  }, [canDelete, clearSelection, confirm, deleteMany, selectedIds]);

  const handleRecordFromKeHoach = useCallback(
    (row: MttqTangLuongKeHoachRow) => {
      if (!canCreate) {
        toast.error(txt('matTranTangLuong.noCreatePermission'));
        return;
      }
      setMainTab('lich_su');
    setEditing(null);
    setFormPrefill({
      canBoId: row.can_bo_id,
      ngachMoiId: row.ngach_luong_id_moi ?? undefined,
      bacMoiId: row.bac_luong_id_moi ?? undefined,
    });
      setShowForm(true);
    },
    [canCreate, setMainTab],
  );

  useEffect(() => {
    if (mainTab !== 'lich_su' || viewableRows.length === 0) return;
    const raw = searchParams.get('open')?.trim();
    if (!raw) return;
    const row = viewableRows.find((r) => r.id === raw);
    if (row) handleView(row);
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [handleView, mainTab, viewableRows, searchParams, setSearchParams]);

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy={waitingMatrixHydrate}
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError && listQueryEnabled) {
    return (
      <div className="flex flex-col h-full min-h-0 p-4">
        <ErrorState
          title={txt('common.loadError')}
          message={txt('matTranTangLuong.listLoadErrorHint')}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MttqTangLuongToolbar
          onPageBack={handlePageBack}
          tabsSlot={tabsSlot}
          mainTab={mainTab}
          hideListControls={mainTab !== 'lich_su'}
          onAdd={handleAdd}
          onDeleteMany={handleDeleteMany}
          onExportThongKe={canExport ? handleExportThongKe : undefined}
          statsYear={statsYear}
          onStatsYearChange={setStatsYear}
          keHoachYear={keHoachYear}
          onKeHoachYearChange={setKeHoachYear}
          keHoachGroupMode={keHoachGroupMode}
          onKeHoachGroupModeChange={setKeHoachGroupMode}
          items={enrichedRows}
        />

        {mainTab === 'lich_su' ? (
          <div className="flex-1 min-h-0 flex flex-col overflow-auto p-3 sm:p-4">
            <MttqTangLuongTable
              data={sorted}
              optionRows={enrichedRows}
              isLoading={isListLoading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              emptyTitle={
                viewableRows.length === 0
                  ? txt('matTranTangLuong.emptyTitle')
                  : sorted.length === 0 && hasListFilters
                    ? txt('common.noResults')
                    : undefined
              }
              emptyDescription={
                sorted.length === 0 && hasListFilters
                  ? txt('matTranTangLuong.emptyFilteredHint')
                  : undefined
              }
            />
          </div>
        ) : null}

        {mainTab === 'ke_hoach' ? (
          <MttqTangLuongKeHoachPanel
            allRows={viewableRows}
            year={keHoachYear}
            groupMode={keHoachGroupMode}
            onRecord={handleRecordFromKeHoach}
            isLoading={isListLoading}
          />
        ) : null}

        {mainTab === 'thong_ke' ? (
          <MttqTangLuongThongKePanel
            rows={viewableRows}
            statsYear={statsYear}
            loaiKy={filters.loai_ky}
            phongBanIds={filters.phong_ban_id}
            isLoading={isListLoading}
          />
        ) : null}
      </div>

      <AnimatePresence>
        {showForm ? (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqTangLuongForm
              initialData={editing}
              onClose={handleCloseForm}
              defaultCanBoId={formPrefill.canBoId}
              defaultNgachMoiId={formPrefill.ngachMoiId}
              defaultBacMoiId={formPrefill.bacMoiId}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {viewingRow && !showForm ? (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqTangLuongDetail
              data={viewingRow}
              onClose={() => setViewingId(null)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        columns={exportColumns}
        data={exportData}
        paginatedData={paginatedExportData}
        selectedData={[]}
        fileName={txt('matTranTangLuong.stats.exportFileName')}
        visibleColumnKeys={exportColumns.map((c) => c.key)}
      />
    </div>
  );
};

export default DanhSachTangLuongPage;
