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
import { formatDate, getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import ExportDialog from '@/components/shared/ExportDialog';
import { useMttqCanBoList, useDeleteMttqCanBoMany } from './hooks/use-mttq-can-bo';
import { useMttqCanBoStore } from './store/useMttqCanBoStore';
import type { MttqCanBoRow } from './core/types';
import { MTTQ_CAN_BO_SEARCHABLE_KEYS } from './utils/search-keys';
import { mttqCanBoMatchesColumnSearch } from './utils/column-search';
import { computeAgeFromBirthDate } from './utils/age';
import { formatCanBoPhoneDisplay } from './utils/display-format';
import { CHIP_TRANG_THAI_NULL } from './core/constants';
import { useMttqCanBoFilterCounts } from './hooks/use-mttq-can-bo-filter-counts';
import MttqCanBoToolbar from './components/mttq-can-bo-toolbar';
import MttqCanBoTable from './components/mttq-can-bo-table';

const MttqCanBoForm = lazy(() => import('./components/mttq-can-bo-form'));
const MttqCanBoDetail = lazy(() => import('./components/mttq-can-bo-detail'));

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

const DanhSachCanBoPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranOfficerList');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqCanBoRow | null>(null);
  const [viewing, setViewing] = useState<MttqCanBoRow | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useMttqCanBoStore();

  const { data: rows = [], isLoading } = useMttqCanBoList({ enabled: canView });
  const deleteMutation = useDeleteMttqCanBoMany();

  const rowsEnriched = useMemo<MttqCanBoRow[]>(
    () =>
      rows.map((r) => ({
        ...r,
        tuoi: computeAgeFromBirthDate(r.ngay_sinh),
      })),
    [rows],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rowsEnriched.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rowsEnriched, viewing]);

  const filterFn = useCallback(
    (item: MttqCanBoRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_CAN_BO_SEARCHABLE_KEYS,
      );
      if (f.trang_thai_id?.length) {
        const key = item.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
        if (!f.trang_thai_id.includes(key)) return false;
      }
      if (f.gioi_tinh?.length && !f.gioi_tinh.includes(item.gioi_tinh)) return false;
      const matchesCol = mttqCanBoMatchesColumnSearch(item, f);
      return matchesSearch && matchesCol;
    },
    [],
  );

  const filtered = useListWithFilter(rowsEnriched, searchTerm, filters, filterFn);

  const { trangThaiCounts, gioiTinhCounts } = useMttqCanBoFilterCounts(rowsEnriched, searchTerm, filters);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqCanBoRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, getLanguage()));
    }
    return list;
  }, [filtered, sort]);

  const trangThaiChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
      const label = (r.ten_trang_thai ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: trangThaiCounts[value] ?? 0,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, trangThaiCounts]);

  const gioiTinhChipOptions = useMemo(() => {
    const set = new Set(rowsEnriched.map((r) => r.gioi_tinh).filter(Boolean));
    const values = [...set].sort((a, b) => a.localeCompare(b, getLanguage()));
    return values.map((value) => ({
      value,
      label: value,
      count: gioiTinhCounts[value] ?? 0,
    }));
  }, [rowsEnriched, gioiTinhCounts]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_ten', label: txt('matTranCanBo.store.hoTenCol') },
      { key: 'ngay_sinh', label: txt('matTranCanBo.store.ngaySinhCol') },
      { key: 'tuoi', label: txt('matTranCanBo.store.tuoiCol') },
      { key: 'gioi_tinh', label: txt('matTranCanBo.store.gioiTinhCol') },
      { key: 'ten_trang_thai', label: txt('matTranCanBo.store.trangThaiCol') },
      { key: 'ten_chuc_vu', label: txt('matTranCanBo.store.chucVuCol') },
      { key: 'ten_to_chuc', label: txt('matTranCanBo.store.toChucCol') },
      { key: 'dien_thoai', label: txt('matTranCanBo.store.dienThoaiCol') },
      { key: 'dang_vien', label: txt('matTranCanBo.store.dangVienCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqCanBoRow) => ({
      ho_ten: item.ho_ten,
      ngay_sinh: item.ngay_sinh ? formatDate(item.ngay_sinh) : '',
      tuoi: item.tuoi != null ? txt('matTranCanBo.display.ageYears', { years: String(item.tuoi) }) : '',
      gioi_tinh: item.gioi_tinh,
      ten_trang_thai: item.ten_trang_thai ?? '',
      ten_chuc_vu: item.ten_chuc_vu ?? '',
      ten_to_chuc: item.ten_to_chuc ?? '',
      dien_thoai: formatCanBoPhoneDisplay(item.dien_thoai) || (item.dien_thoai ?? ''),
      dang_vien: item.dang_vien ? txt('matTranCanBo.detail.dangVienYes') : txt('matTranCanBo.detail.dangVienNo'),
    }),
    [],
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

  const handleEdit = (item: MttqCanBoRow) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranCanBo.deleteTitle'),
      message: txt('matTranCanBo.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('matTranCanBo.bulkDeleteTitle'),
      message: txt('matTranCanBo.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMutation.mutate(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewing && ids.includes(viewing.id)) setViewing(null);
          },
        });
      },
    });
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.warning(txt('matTranCanBo.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && viewing && wasEditing && viewing.id === wasEditing.id) {
      const fresh = rowsEnriched.find((r) => r.id === viewing.id);
      if (fresh) setViewing(fresh);
    }
    setFormOrigin('list');
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] px-4 text-center text-muted-foreground">
        <p className="text-sm">{txt('matTranCanBo.noViewPermission')}</p>
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
          {txt('matTranCanBo.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqCanBoToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          trangThaiOptions={trangThaiChipOptions}
          gioiTinhOptions={gioiTinhChipOptions}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
        />

        <div className="flex-1 min-h-0">
          <MttqCanBoTable
            data={sorted}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={setViewing}
            trangThaiFilterOptions={trangThaiChipOptions}
            gioiTinhFilterOptions={gioiTinhChipOptions}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqCanBoForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqCanBoDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={handleEdit}
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
            fileName={txt('matTranCanBo.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DanhSachCanBoPage;
