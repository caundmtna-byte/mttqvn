import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
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
import ExportDialog from '@/components/shared/ExportDialog';
import {
  useMttqLopTapHuanList,
  useDeleteMttqLopTapHuanMany,
  useMttqLopTapHuanDetail,
} from './hooks/use-mttq-tap-huan';
import { useMttqLopTapHuanStore } from './store/useMttqLopTapHuanStore';
import type { MttqLopTapHuan, MttqLopTapHuanListRow } from './core/types';
import { MTTQ_TAP_HUAN_SEARCHABLE_KEYS } from './utils/search-keys';
import { mttqTapHuanMatchesColumnSearch } from './utils/column-search';
import { getMttqLopTapHuanById } from './services/mttq-tap-huan-service';
import MttqLopTapHuanToolbar from './components/mttq-tap-huan-toolbar';
import MttqLopTapHuanTable from './components/mttq-tap-huan-table';

const MttqLopTapHuanForm = lazy(() => import('./components/mttq-tap-huan-form'));
const MttqLopTapHuanDetail = lazy(() => import('./components/mttq-tap-huan-detail'));

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

const DanhSachTapHuanPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranTrainingList');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqLopTapHuan | null>(null);
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
  } = useMttqLopTapHuanStore();

  const { data: rows = [], isLoading } = useMttqLopTapHuanList({ enabled: canView });
  const { data: viewingData } = useMttqLopTapHuanDetail(viewingId);
  const deleteMutation = useDeleteMttqLopTapHuanMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  const filterFn = useCallback(
    (item: MttqLopTapHuanListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_TAP_HUAN_SEARCHABLE_KEYS,
      );
      if (f.cap_tap_huan?.length && !f.cap_tap_huan.includes(item.cap_tap_huan)) return false;
      if (f.nam_tap_huan?.length && !f.nam_tap_huan.includes(String(item.nam_tap_huan))) return false;
      if (!mttqTapHuanMatchesColumnSearch(item, f.columnSearch)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqLopTapHuanListRow;
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
        if (a.nam_tap_huan !== b.nam_tap_huan) return b.nam_tap_huan - a.nam_tap_huan;
        return (b.tg_cap_nhat || '').localeCompare(a.tg_cap_nhat || '', getLanguage());
      });
    }
    return list;
  }, [filtered, sort]);

  const capChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of rows) {
      const value = r.cap_tap_huan;
      const label = value || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rows]);

  const namChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of rows) {
      const value = String(r.nam_tap_huan);
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
      { key: 'ten_lop_tap_huan', label: txt('matTranTapHuan.store.tenLopCol') },
      { key: 'nam_tap_huan', label: txt('matTranTapHuan.store.namCol') },
      { key: 'cap_tap_huan', label: txt('matTranTapHuan.store.capCol') },
      { key: 'so_dong', label: txt('matTranTapHuan.store.soDongCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('matTranTapHuan.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqLopTapHuanListRow) => ({
      ten_lop_tap_huan: item.ten_lop_tap_huan,
      nam_tap_huan: String(item.nam_tap_huan ?? ''),
      cap_tap_huan: item.cap_tap_huan,
      so_dong: String(item.so_dong),
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? '',
    }),
    [],
  );

  const {
    exportData,
    paginatedData: paginatedExportData,
    selectedData: selectedExportData,
  } = useExportData({
    data: filtered,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible).map((c) => c.id),
    [columns],
  );

  const handleEditFromList = async (item: MttqLopTapHuanListRow) => {
    try {
      const full = await getMttqLopTapHuanById(item.id);
      if (!full) {
        toast.error(txt('matTranTapHuan.service.notFound'));
        return;
      }
      startTransition(() => {
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('matTranTapHuan.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: MttqLopTapHuan) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranTapHuan.deleteTitle'),
      message: txt('matTranTapHuan.deleteMessage'),
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
      title: txt('matTranTapHuan.bulkDeleteTitle'),
      message: txt('matTranTapHuan.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('matTranTapHuan.noExportData'));
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
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center text-muted-foreground">
        <p className="text-sm">{txt('matTranTapHuan.noViewPermission')}</p>
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
          {txt('matTranTapHuan.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqLopTapHuanToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          capOptions={capChipOptions}
          namOptions={namChipOptions}
          onAdd={() => {
            startTransition(() => {
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
        />

        <div className="flex-1 min-h-0">
          <MttqLopTapHuanTable
            data={sorted}
            isLoading={isLoading}
            capHeaderOptions={capChipOptions}
            namHeaderOptions={namChipOptions}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => setViewingId(item.id)}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqLopTapHuanForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqLopTapHuanDetail
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
            fileName={txt('matTranTapHuan.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DanhSachTapHuanPage;
