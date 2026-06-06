import React, { useState, useCallback, useEffect, useMemo, useRef, lazy, Suspense, startTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { txt } from '@/lib/text';
import { formatDate, getLanguage } from '@/lib/utils';
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
  useMttqUyVienUyBanList,
  useDeleteMttqUyVienUyBanMany,
  useMttqUyVienUyBanDetail,
  useImportMttqUyVienUyBan,
} from './hooks/use-mttq-uy-vien-uy-ban';
import { useMttqUyVienUyBanStore } from './store/useMttqUyVienUyBanStore';
import type { MttqUyVienUyBan, MttqUyVienUyBanListRow } from './core/types';
import { MTTQ_UY_VIEN_UY_BAN_SEARCHABLE_KEYS } from './utils/search-keys';
import { mttqUyVienUyBanMatchesColumnSearch, donViDisplayLabel } from './utils/column-search';
import { formatUyVienMaUvDisplay } from './utils/display-format';
import { buildUyVienTrangThamGiaChipOptions } from './utils/trang-tham-gia-options';
import { isUyVienTrangThamGia } from './core/constants';
import { getMttqUyVienUyBanById } from './services/mttq-uy-vien-uy-ban-service';
import { canViewUyVienUyBanRow, useMttqUyVienUyBanViewer } from './hooks/use-mttq-uy-vien-uy-ban-viewer';
import { CHIP_TRANG_THAI_NULL } from '../danh-sach-can-bo/core/constants';
import MttqUyVienUyBanToolbar from './components/mttq-uy-vien-uy-ban-toolbar';
import MttqUyVienUyBanTable from './components/mttq-uy-vien-uy-ban-table';

const MttqUyVienUyBanForm = lazy(() => import('./components/mttq-uy-vien-uy-ban-form'));
const MttqUyVienUyBanDetail = lazy(() => import('./components/mttq-uy-vien-uy-ban-detail'));

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

const UyVienUyBanPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranCommitteeMembers');
  const { canCreate } = useResourcePermissions('matTranCommitteeMembers');
  const tinhCapLabel = txt('matTranUyVienUyBan.tinhCap');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranUyVienUyBan.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqUyVienUyBan | null>(null);
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
  } = useMttqUyVienUyBanStore();

  const { data: rows = [], isLoading } = useMttqUyVienUyBanList({ enabled: canView });
  const { data: viewingData } = useMttqUyVienUyBanDetail(viewingId);
  const deleteMutation = useDeleteMttqUyVienUyBanMany();
  const importMutation = useImportMttqUyVienUyBan(() => setShowImport(false));

  const viewer = useMttqUyVienUyBanViewer();

  /** Lọc theo viewer trước khi mọi tính toán hiển thị (chip / search / export / sort). */
  const viewableRows = useMemo(
    () => rows.filter((r) => canViewUyVienUyBanRow(viewer, r)),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  /** Drawer chi tiết: nếu data về mà viewer không đủ quyền (vd. đoán id), tự đóng + báo. */
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!canViewUyVienUyBanRow(viewer, viewingData)) {
      toast.error(txt('matTranUyVienUyBan.noViewPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  const clearListFilters = useCallback(() => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('nhiem_ky_filter', []);
    setFilter('don_vi_filter', []);
    setFilter('trang_thai_tham_gia_filter', []);
    setSort(null, null);
  }, [setSearchTerm, setFilter, setSort]);

  const filterFn = useCallback(
    (item: MttqUyVienUyBanListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_UY_VIEN_UY_BAN_SEARCHABLE_KEYS,
      );
      if (!mttqUyVienUyBanMatchesColumnSearch(item, f.columnSearch, tinhCapLabel)) return false;
      if (f.nhiem_ky_filter.length > 0 && !f.nhiem_ky_filter.includes(item.nhiem_ky_id)) return false;
      if (f.don_vi_filter.length > 0) {
        const dv = item.don_vi_id ?? DON_VI_FILTER_TINH;
        if (!f.don_vi_filter.includes(dv)) return false;
      }
      if (f.trang_thai_tham_gia_filter.length > 0) {
        const raw = item.trang_thai_tham_gia?.trim();
        const tt = raw && isUyVienTrangThamGia(raw) ? raw : CHIP_TRANG_THAI_NULL;
        if (!f.trang_thai_tham_gia_filter.includes(tt)) return false;
      }
      return matchesSearch;
    },
    [tinhCapLabel],
  );

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqUyVienUyBanListRow;
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
        const ca = a.tg_cap_nhat ?? '';
        const cb = b.tg_cap_nhat ?? '';
        if (cb !== ca) return cb.localeCompare(ca);
        return a.ho_va_ten.localeCompare(b.ho_va_ten, 'vi');
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

  const trangThaiChipOptions = useMemo(
    () => buildUyVienTrangThamGiaChipOptions(viewableRows),
    [viewableRows],
  );

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ma_uv', label: txt('matTranUyVienUyBan.store.maUvCol') },
      { key: 'ten_nhiem_ky', label: txt('matTranUyVienUyBan.store.tenNhiemKyCol') },
      { key: 'ten_don_vi', label: txt('matTranUyVienUyBan.store.donViCol') },
      { key: 'ho_va_ten', label: txt('matTranUyVienUyBan.store.hoVaTenCol') },
      { key: 'chuc_vu_don_vi', label: txt('matTranUyVienUyBan.store.chucVuDonViCol') },
      { key: 'ngay_sinh', label: txt('matTranUyVienUyBan.form.ngaySinh') },
      { key: 'gioi_tinh', label: txt('matTranUyVienUyBan.form.gioiTinh') },
      { key: 'trang_thai_tham_gia', label: txt('matTranUyVienUyBan.store.trangThamGiaCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('matTranUyVienUyBan.store.nguoiTaoCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_nhiem_ky', label: txt('matTranUyVienUyBan.store.tenNhiemKyCol'), required: true },
      { key: 'ten_don_vi', label: txt('matTranUyVienUyBan.store.donViCol') },
      { key: 'can_bo_id', label: txt('matTranUyVienUyBan.store.canBoIdCol') },
      { key: 'ho_va_ten', label: txt('matTranUyVienUyBan.store.importHoTenMapCol') },
      { key: 'ngay_sinh', label: txt('matTranUyVienUyBan.form.ngaySinh') },
      { key: 'ma_uv', label: txt('matTranUyVienUyBan.store.maUvCol') },
      { key: 'trang_thai_tham_gia', label: txt('matTranUyVienUyBan.store.trangThamGiaCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqUyVienUyBanListRow) => ({
      ma_uv: formatUyVienMaUvDisplay(item.ma_uv) || (item.ma_uv ?? ''),
      ten_nhiem_ky: item.ten_nhiem_ky,
      ten_don_vi: donViDisplayLabel(item, tinhCapLabel),
      ho_va_ten: item.ho_va_ten,
      chuc_vu_don_vi: item.chuc_vu_don_vi ?? '',
      ngay_sinh: item.ngay_sinh ? formatDate(item.ngay_sinh) : '',
      gioi_tinh: item.gioi_tinh ?? '',
      trang_thai_tham_gia: item.trang_thai_tham_gia ?? '',
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
        toast.error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));
        return;
      }
      await importMutation.mutateAsync({ rows: data, idNguoiTao: nhanVienId });
    },
    [importMutation, nhanVienId],
  );

  const handleEditFromList = async (item: MttqUyVienUyBanListRow) => {
    try {
      // Dùng cache TanStack Query (detail key) — nếu đã fetch lần trước (vd vừa
      // xem detail), bỏ qua round-trip Supabase. Cache hết hạn theo `staleTime`
      // mặc định (5 phút) → vẫn đảm bảo dữ liệu khi sửa lần đầu mở list.
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.mttqUyVienUyBan.detail(item.id),
        queryFn: () => getMttqUyVienUyBanById(item.id),
        ...defaultServerQueryOptions,
      });
      if (!full) {
        toast.error(txt('matTranUyVienUyBan.service.notFound'));
        return;
      }
      startTransition(() => {
        setFormOrigin('list');
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('matTranUyVienUyBan.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: MttqUyVienUyBan) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranUyVienUyBan.deleteTitle'),
      message: txt('matTranUyVienUyBan.deleteMessage'),
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
      title: txt('matTranUyVienUyBan.bulkDeleteTitle'),
      message: txt('matTranUyVienUyBan.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('matTranUyVienUyBan.noExportData'));
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqUyVienUyBan.detail(vid) });
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
  const tableEmptyDescription = showFilteredEmpty ? txt('matTranUyVienUyBan.emptyFilteredHint') : undefined;
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
          {txt('matTranUyVienUyBan.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqUyVienUyBanToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          onAdd={openCreateForm}
          onExport={handleExport}
          onImport={() => setShowImport(true)}
          onDeleteMany={handleDeleteMany}
          nhiemKyOptions={nhiemKyChipOptions}
          donViOptions={donViChipOptions}
          trangThaiOptions={trangThaiChipOptions}
        />

        <div className="flex-1 min-h-0">
          <MttqUyVienUyBanTable
            data={sorted}
            isLoading={isLoading}
            nhiemKyHeaderOptions={nhiemKyChipOptions}
            donViHeaderOptions={donViChipOptions}
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
            <MttqUyVienUyBanForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqUyVienUyBanDetail
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
            fileName={txt('matTranUyVienUyBan.exportFileName')}
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
            templateFileName={txt('matTranUyVienUyBan.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UyVienUyBanPage;
