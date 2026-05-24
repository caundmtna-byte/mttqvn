import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { queryKeys } from '@/lib/query-keys';
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog from '@/components/shared/ImportDialog';
import Button from '@/components/ui/Button';
import {
  useMttqKyHopList,
  useDeleteMttqKyHopMany,
  useMttqKyHopDetail,
  useImportMttqKyHop,
} from './hooks/use-mttq-ky-hop';
import { canViewKyHopRow, useMttqKyHopViewer } from './hooks/use-mttq-ky-hop-viewer';
import { useMttqKyHopStore } from './store/useMttqKyHopStore';
import type { MttqKyHop, MttqKyHopListRow } from './core/types';
import { MTTQ_KY_HOP_SEARCHABLE_KEYS } from './utils/search-keys';
import { mttqKyHopMatchesColumnSearch, donViDisplayLabel, yearFromNgayHop } from './utils/column-search';
import { getMttqKyHopById } from './services/mttq-ky-hop-service';
import MttqKyHopToolbar from './components/mttq-ky-hop-toolbar';
import MttqKyHopTable from './components/mttq-ky-hop-table';

const MttqKyHopForm = lazy(() => import('./components/mttq-ky-hop-form'));
const MttqKyHopDetail = lazy(() => import('./components/mttq-ky-hop-detail'));

const DON_VI_FILTER_TINH = '__TINH__';

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

type FormOrigin = 'list' | 'detail';

const KyHopPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranSession');
  const { canCreate } = useResourcePermissions('matTranSession');
  const tinhCapLabel = txt('matTranKyHop.tinhCap');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranKyHop.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqKyHop | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    filters,
    sort,
    setFilter,
    setSort,
    resetState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
  } = useMttqKyHopStore();

  const { data: rows = [], isLoading } = useMttqKyHopList({ enabled: canView });
  const { data: viewingData } = useMttqKyHopDetail(viewingId);
  const deleteMutation = useDeleteMttqKyHopMany();
  const importMutation = useImportMttqKyHop(() => setShowImport(false));

  const viewer = useMttqKyHopViewer();

  /** Lọc theo viewer trước khi mọi tính toán hiển thị (chip / search / export / sort). */
  const viewableRows = useMemo(
    () => rows.filter((r) => canViewKyHopRow(viewer, r)),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  /** Drawer chi tiết: nếu data về mà viewer không đủ quyền (vd. đoán id), tự đóng + báo. */
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!canViewKyHopRow(viewer, viewingData)) {
      toast.error(txt('matTranKyHop.noViewPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  const clearListFilters = useCallback(() => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('nhiem_ky_filter', []);
    setFilter('don_vi_filter', []);
    setFilter('nam_filter', []);
    setSort(null, null);
  }, [setSearchTerm, setFilter, setSort]);

  const filterFn = useCallback(
    (item: MttqKyHopListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_KY_HOP_SEARCHABLE_KEYS,
      );
      if (!mttqKyHopMatchesColumnSearch(item, f.columnSearch)) return false;
      if (f.nhiem_ky_filter.length > 0 && !f.nhiem_ky_filter.includes(item.nhiem_ky_id)) return false;
      if (f.don_vi_filter.length > 0) {
        const dv = item.don_vi_id ?? DON_VI_FILTER_TINH;
        if (!f.don_vi_filter.includes(dv)) return false;
      }
      if (f.nam_filter.length > 0) {
        const y = yearFromNgayHop(item);
        if (!y || !f.nam_filter.includes(y)) return false;
      }
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqKyHopListRow;
        if (key === 'ngay_hop') {
          const da = a.ngay_hop ?? '';
          const db = b.ngay_hop ?? '';
          const cmp = da.localeCompare(db);
          return sort.direction === 'desc' ? -cmp : cmp;
        }
        if (key === 'ten_don_vi') {
          const la = donViDisplayLabel(a, tinhCapLabel);
          const lb = donViDisplayLabel(b, tinhCapLabel);
          const cmp = la.localeCompare(lb, getLanguage());
          return sort.direction === 'desc' ? -cmp : cmp;
        }
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => {
        const da = a.ngay_hop ?? '';
        const db = b.ngay_hop ?? '';
        if (db !== da) return db.localeCompare(da);
        return String(a.ky_thu).localeCompare(String(b.ky_thu), getLanguage());
      });
    }
    return list;
  }, [filtered, sort, tinhCapLabel]);

  const nhiemKyChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const value = r.nhiem_ky_id;
      const label = r.ten_nhiem_ky || value;
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [viewableRows]);

  const donViChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const value = r.don_vi_id ?? DON_VI_FILTER_TINH;
      const label = donViDisplayLabel(r, tinhCapLabel);
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [viewableRows, tinhCapLabel]);

  const namChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const y = yearFromNgayHop(r);
      if (!y) continue;
      const cur = map.get(y);
      if (cur) cur.count += 1;
      else map.set(y, { label: y, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [viewableRows]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'nhiem_ky_id', label: txt('matTranKyHop.export.nhiemKyIdCol') },
      { key: 'don_vi_id', label: txt('matTranKyHop.export.donViIdCol') },
      { key: 'ten_nhiem_ky', label: txt('matTranKyHop.store.tenNhiemKyCol') },
      { key: 'ten_don_vi', label: txt('matTranKyHop.store.donViCol') },
      { key: 'ky_thu', label: txt('matTranKyHop.store.kyThuCol') },
      { key: 'ngay_hop', label: txt('matTranKyHop.store.ngayHopCol') },
      { key: 'noi_dung_ky_hop', label: txt('matTranKyHop.store.noiDungCol') },
      { key: 'diem_danh_co_mat', label: txt('matTranKyHop.store.diemDanhCoMatCol') },
      { key: 'diem_danh_vang_mat', label: txt('matTranKyHop.store.diemDanhVangMatCol') },
      { key: 'diem_danh_chua', label: txt('matTranKyHop.store.diemDanhChuaCol') },
      { key: 'tai_lieu_hop', label: txt('matTranKyHop.form.taiLieuHop') },
      { key: 'ghi_chu', label: txt('matTranKyHop.form.ghiChu') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('matTranKyHop.store.nguoiTaoCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'nhiem_ky_id', label: txt('matTranKyHop.import.nhiemKyIdCol') },
      { key: 'don_vi_id', label: txt('matTranKyHop.import.donViIdCol') },
      { key: 'ten_nhiem_ky', label: txt('matTranKyHop.store.tenNhiemKyCol') },
      { key: 'ten_don_vi', label: txt('matTranKyHop.store.donViCol') },
      { key: 'ky_thu', label: txt('matTranKyHop.store.kyThuCol'), required: true },
      { key: 'ngay_hop', label: txt('matTranKyHop.store.ngayHopCol') },
      { key: 'noi_dung_ky_hop', label: txt('matTranKyHop.store.noiDungCol') },
      { key: 'tai_lieu_hop', label: txt('matTranKyHop.form.taiLieuHop') },
      { key: 'ghi_chu', label: txt('matTranKyHop.form.ghiChu') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqKyHopListRow) => ({
      nhiem_ky_id: item.nhiem_ky_id,
      don_vi_id: item.don_vi_id ?? '',
      ten_nhiem_ky: item.ten_nhiem_ky,
      ten_don_vi: donViDisplayLabel(item, tinhCapLabel),
      ky_thu: item.ky_thu,
      ngay_hop: item.ngay_hop ?? '',
      noi_dung_ky_hop: item.noi_dung_ky_hop ?? '',
      diem_danh_co_mat: item.diem_danh_co_mat,
      diem_danh_vang_mat: item.diem_danh_vang_mat,
      diem_danh_chua: item.diem_danh_chua,
      tai_lieu_hop: item.tai_lieu_hop ?? '',
      ghi_chu: item.ghi_chu ?? '',
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? '',
    }),
    [tinhCapLabel],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: filtered,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  const visibleColumnKeys = useMemo(() => columns.filter((c) => c.visible).map((c) => c.id), [columns]);

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (!nhanVienId) {
        toast.error(txt('matTranKyHop.service.noEmployeeProfile'));
        return;
      }
      await importMutation.mutateAsync({ rows: data, idNguoiTao: nhanVienId });
    },
    [importMutation, nhanVienId],
  );

  const handleEditFromList = async (item: MttqKyHopListRow) => {
    try {
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.mttqKyHop.detail(item.id),
        queryFn: () => getMttqKyHopById(item.id),
        ...defaultServerQueryOptions,
      });
      if (!full) {
        toast.error(txt('matTranKyHop.service.notFound'));
        return;
      }
      startTransition(() => {
        setFormOrigin('list');
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('matTranKyHop.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: MttqKyHop) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranKyHop.deleteTitle'),
      message: txt('matTranKyHop.deleteMessage'),
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
      title: txt('matTranKyHop.bulkDeleteTitle'),
      message: txt('matTranKyHop.bulkDeleteMessage', { count: ids.length }),
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
    if (filtered.length === 0) {
      toast.warning(txt('matTranKyHop.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    const origin = formOrigin;
    const vid = viewingId;
    const editedId = editing?.id ?? null;
    setShowForm(false);
    setEditing(null);
    setFormOrigin('list');
    if (origin === 'detail' && vid && editedId === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqKyHop.detail(vid) });
    }
  };

  const openCreateForm = () => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(null);
      setShowForm(true);
    });
  };

  const hasRows = viewableRows.length > 0;
  const hasFilteredRows = sorted.length > 0;
  const showFilteredEmpty = hasRows && !hasFilteredRows && !isLoading;

  const tableEmptyTitle = showFilteredEmpty ? txt('common.noResults') : undefined;
  const tableEmptyDescription = showFilteredEmpty ? txt('matTranKyHop.emptyFilteredHint') : undefined;
  const tableEmptyAction = showFilteredEmpty ? (
    <Button type="button" variant="outline" size="sm" onClick={clearListFilters}>
      {txt('shared.mobileFilter.clear')}
    </Button>
  ) : !hasRows && !isLoading && canCreate ? (
    <Button type="button" size="sm" onClick={openCreateForm} className="gap-1.5">
      <Plus className="w-4 h-4" />
      {txt('common.addNew')}
    </Button>
  ) : undefined;

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

  const showNoEmployeeBanner = !nhanVienId;

  return (
    <div className="flex flex-col h-page relative">
      {showNoEmployeeBanner ? (
        <div
          role="status"
          className="mb-2 rounded-lg border border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90"
        >
          {txt('matTranKyHop.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqKyHopToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          onAdd={openCreateForm}
          onExport={handleExport}
          onImport={() => setShowImport(true)}
          onDeleteMany={handleDeleteMany}
          nhiemKyOptions={nhiemKyChipOptions}
          donViOptions={donViChipOptions}
          namOptions={namChipOptions}
        />

        <div className="flex-1 min-h-0">
          <MttqKyHopTable
            data={sorted}
            isLoading={isLoading}
            nhiemKyHeaderOptions={nhiemKyChipOptions}
            donViHeaderOptions={donViChipOptions}
            namHeaderOptions={namChipOptions}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => setViewingId(item.id)}
            emptyTitle={tableEmptyTitle}
            emptyDescription={tableEmptyDescription}
            emptyAction={tableEmptyAction}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKyHopForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKyHopDetail
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
            fileName={txt('matTranKyHop.exportFileName')}
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
            templateFileName={txt('matTranKyHop.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default KyHopPage;
