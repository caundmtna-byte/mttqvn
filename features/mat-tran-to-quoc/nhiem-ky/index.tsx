import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense, startTransition } from 'react';
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
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog from '@/components/shared/ImportDialog';
import Button from '@/components/ui/Button';
import {
  useMttqNhiemKyList,
  useDeleteMttqNhiemKyMany,
  useMttqNhiemKyDetail,
  useImportMttqNhiemKy,
} from './hooks/use-mttq-nhiem-ky';
import { useMttqNhiemKyStore } from './store/useMttqNhiemKyStore';
import type { MttqNhiemKy, MttqNhiemKyListRow } from './core/types';
import { MTTQ_NHIEM_KY_SEARCHABLE_KEYS } from './utils/search-keys';
import { mttqNhiemKyMatchesColumnSearch } from './utils/column-search';
import { getMttqNhiemKyById } from './services/mttq-nhiem-ky-service';
import MttqNhiemKyToolbar from './components/mttq-nhiem-ky-toolbar';
import MttqNhiemKyTable from './components/mttq-nhiem-ky-table';

const MttqNhiemKyForm = lazy(() => import('./components/mttq-nhiem-ky-form'));
const MttqNhiemKyDetail = lazy(() => import('./components/mttq-nhiem-ky-detail'));

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

const NhiemKyPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranTerm');
  const { canCreate } = useResourcePermissions('matTranTerm');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqNhiemKy | null>(null);
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
  } = useMttqNhiemKyStore();

  const { data: rows = [], isLoading } = useMttqNhiemKyList({ enabled: canView });
  const { data: viewingData } = useMttqNhiemKyDetail(viewingId);
  const deleteMutation = useDeleteMttqNhiemKyMany();
  const importMutation = useImportMttqNhiemKy(() => setShowImport(false));

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const clearListFilters = useCallback(() => {
    setSearchTerm('');
    setFilter('columnSearch', {});
    setFilter('tu_nam_filter', []);
    setFilter('den_nam_filter', []);
    setSort(null, null);
  }, [setSearchTerm, setFilter, setSort]);

  const filterFn = useCallback((item: MttqNhiemKyListRow, term: string, f: typeof filters) => {
    const matchesSearch = matchesSearchTerm(
      item as unknown as Record<string, unknown>,
      term,
      MTTQ_NHIEM_KY_SEARCHABLE_KEYS,
    );
    if (!mttqNhiemKyMatchesColumnSearch(item, f.columnSearch)) return false;
    if (f.tu_nam_filter.length > 0) {
      const v = item.tu_nam != null ? String(item.tu_nam) : '';
      if (!f.tu_nam_filter.includes(v)) return false;
    }
    if (f.den_nam_filter.length > 0) {
      const v = item.den_nam != null ? String(item.den_nam) : '';
      if (!f.den_nam_filter.includes(v)) return false;
    }
    return matchesSearch;
  }, []);

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqNhiemKyListRow;
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
        const ta = a.tu_nam ?? 0;
        const tb = b.tu_nam ?? 0;
        if (tb !== ta) return tb - ta;
        return String(b.ten_nhiem_ky).localeCompare(String(a.ten_nhiem_ky), getLanguage());
      });
    }
    return list;
  }, [filtered, sort]);

  const tuNamChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of rows) {
      if (r.tu_nam == null) continue;
      const value = String(r.tu_nam);
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label: value, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [rows]);

  const denNamChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of rows) {
      if (r.den_nam == null) continue;
      const value = String(r.den_nam);
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label: value, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [rows]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_nhiem_ky', label: txt('matTranNhiemKy.store.tenCol') },
      { key: 'tu_nam', label: txt('matTranNhiemKy.store.tuNamCol') },
      { key: 'den_nam', label: txt('matTranNhiemKy.store.denNamCol') },
      { key: 'thong_tin', label: txt('matTranNhiemKy.form.thongTin') },
      { key: 'sl_dau_nhiem_ky', label: txt('matTranNhiemKy.form.slDauNhiemKy') },
      { key: 'sl_dang_tham_gia', label: txt('matTranNhiemKy.form.slDangThamGia') },
      { key: 'sl_thoi_tham_gia', label: txt('matTranNhiemKy.form.slThoiThamGia') },
      { key: 'sl_can_bo_sung', label: txt('matTranNhiemKy.form.slCanBoSung') },
      { key: 'sl_thieu', label: txt('matTranNhiemKy.form.slThieu') },
      { key: 'ghi_chu', label: txt('matTranNhiemKy.form.ghiChu') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('matTranNhiemKy.store.nguoiTaoCol') },
    ],
    [],
  );

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_nhiem_ky', label: txt('matTranNhiemKy.store.tenCol'), required: true },
      { key: 'tu_nam', label: txt('matTranNhiemKy.store.tuNamCol') },
      { key: 'den_nam', label: txt('matTranNhiemKy.store.denNamCol') },
      { key: 'thong_tin', label: txt('matTranNhiemKy.form.thongTin') },
      { key: 'sl_dau_nhiem_ky', label: txt('matTranNhiemKy.form.slDauNhiemKy') },
      { key: 'sl_dang_tham_gia', label: txt('matTranNhiemKy.form.slDangThamGia') },
      { key: 'sl_thoi_tham_gia', label: txt('matTranNhiemKy.form.slThoiThamGia') },
      { key: 'sl_can_bo_sung', label: txt('matTranNhiemKy.form.slCanBoSung') },
      { key: 'sl_thieu', label: txt('matTranNhiemKy.form.slThieu') },
      { key: 'ghi_chu', label: txt('matTranNhiemKy.form.ghiChu') },
    ],
    [],
  );

  const exportMapFn = useCallback((item: MttqNhiemKyListRow) => {
    return {
      ten_nhiem_ky: item.ten_nhiem_ky,
      tu_nam: item.tu_nam != null ? String(item.tu_nam) : '',
      den_nam: item.den_nam != null ? String(item.den_nam) : '',
      thong_tin: item.thong_tin ?? '',
      sl_dau_nhiem_ky: String(item.sl_dau_nhiem_ky),
      sl_dang_tham_gia: String(item.sl_dang_tham_gia),
      sl_thoi_tham_gia: String(item.sl_thoi_tham_gia),
      sl_can_bo_sung: String(item.sl_can_bo_sung),
      sl_thieu: String(item.sl_thieu),
      ghi_chu: item.ghi_chu ?? '',
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? '',
    };
  }, []);

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
        toast.error(txt('matTranNhiemKy.service.noEmployeeProfile'));
        return;
      }
      await importMutation.mutateAsync({ rows: data, idNguoiTao: nhanVienId });
    },
    [importMutation, nhanVienId],
  );

  const handleEditFromList = async (item: MttqNhiemKyListRow) => {
    try {
      const full = await getMttqNhiemKyById(item.id);
      if (!full) {
        toast.error(txt('matTranNhiemKy.service.notFound'));
        return;
      }
      startTransition(() => {
        setFormOrigin('list');
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('matTranNhiemKy.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: MttqNhiemKy) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranNhiemKy.deleteTitle'),
      message: txt('matTranNhiemKy.deleteMessage'),
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
      title: txt('matTranNhiemKy.bulkDeleteTitle'),
      message: txt('matTranNhiemKy.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('matTranNhiemKy.noExportData'));
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.mttqNhiemKy.detail(vid) });
    }
  };

  const openCreateForm = () => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(null);
      setShowForm(true);
    });
  };

  const hasRows = rows.length > 0;
  const hasFilteredRows = sorted.length > 0;
  const showFilteredEmpty = hasRows && !hasFilteredRows && !isLoading;

  const tableEmptyTitle = showFilteredEmpty ? txt('common.noResults') : undefined;
  const tableEmptyDescription = showFilteredEmpty ? txt('matTranNhiemKy.emptyFilteredHint') : undefined;
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
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center text-muted-foreground">
        <p className="text-sm">{txt('matTranNhiemKy.noViewPermission')}</p>
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
          {txt('matTranNhiemKy.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqNhiemKyToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          onAdd={openCreateForm}
          onExport={handleExport}
          onImport={() => setShowImport(true)}
          onDeleteMany={handleDeleteMany}
          tuNamOptions={tuNamChipOptions}
          denNamOptions={denNamChipOptions}
        />

        <div className="flex-1 min-h-0">
          <MttqNhiemKyTable
            data={sorted}
            isLoading={isLoading}
            tuNamHeaderOptions={tuNamChipOptions}
            denNamHeaderOptions={denNamChipOptions}
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
            <MttqNhiemKyForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqNhiemKyDetail
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
            fileName={txt('matTranNhiemKy.exportFileName')}
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
            templateFileName={txt('matTranNhiemKy.import.templateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NhiemKyPage;
