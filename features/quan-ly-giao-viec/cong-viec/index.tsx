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
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import TabGroup from '@/components/ui/TabGroup';
import ExportDialog from '@/components/shared/ExportDialog';
import { useEmployees } from '@/features/he-thong/nhan-vien/hooks/use-nhan-vien';
import { useCongViecDanhSachPage, useDeleteCongViecDanhSachMany } from './hooks/use-cong-viec-danh-sach';
import type { CongViecListScopeRpc } from './services/cong-viec-danh-sach-service';
import { useCongViecDanhSachStore } from './store/useCongViecDanhSachStore';
import type { CongViecDanhSachRow, CongViecListScope } from './core/types';
import { CONG_VIEC_MUC_DO, CONG_VIEC_TRANG_THAI } from './core/constants';
import { congViecMatchesColumnSearch } from './utils/column-search';
import { deadlineProgressSortKey, formatCongViecTienDoTheoHan } from './utils/deadline-progress';
import CongViecToolbar from './components/cong-viec-toolbar';
import CongViecTable from './components/cong-viec-table';

const CongViecForm = lazy(() => import('./components/cong-viec-form'));
const CongViecDetail = lazy(() => import('./components/cong-viec-detail'));

const TAB_DO: CongViecListScope = 'mine_do';
const TAB_RELATED: CongViecListScope = 'mine_related';
const TAB_ASSIGN: CongViecListScope = 'mine_assign';

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

const CongViecPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'tasks');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('taskList.noViewPermission'));
    navigate('/quan-ly-giao-viec', { replace: true });
  }, [user, canView, navigate]);

  const [listScope, setListScope] = useState<CongViecListScope>(TAB_DO);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CongViecDanhSachRow | null>(null);
  const [viewing, setViewing] = useState<CongViecDanhSachRow | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
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
    setPage,
  } = useCongViecDanhSachStore();

  const listScopeRpc: CongViecListScopeRpc =
    listScope === TAB_DO ? 'mine_do' : listScope === TAB_RELATED ? 'mine_related' : 'mine_assign';

  const pageQuery = useMemo(
    () => ({
      page: pagination.page,
      pageSize: pagination.pageSize,
      search: searchTerm,
      listScope: listScopeRpc,
      viewerNhanVienId: nhanVienId || null,
      trangThai: filters.trang_thai ?? [],
      mucDo: filters.muc_do ?? [],
    }),
    [
      pagination.page,
      pagination.pageSize,
      searchTerm,
      listScopeRpc,
      nhanVienId,
      filters.trang_thai,
      filters.muc_do,
    ],
  );

  const { data: pageData, isLoading } = useCongViecDanhSachPage({
    ...pageQuery,
    enabled: canView && Boolean(nhanVienId),
  });

  const rows = pageData?.rows ?? [];
  const serverHasNextPage = pageData?.hasNextPage ?? false;
  const serverTotalRecords = pageData?.totalRecords ?? null;
  const { data: employees = [] } = useEmployees({ enabled: canView });
  const deleteMutation = useDeleteCongViecDanhSachMany();

  const employeeMap = useMemo(() => new Map(employees.map((e) => [String(e.id), e])), [employees]);

  const rowsEnriched = useMemo<CongViecDanhSachRow[]>(
    () =>
      rows.map((r) => ({
        ...r,
        ho_tro_display: r.ids_ho_tro.map((id) => employeeMap.get(String(id))?.ho_va_ten ?? id).join(', '),
      })),
    [rows, employeeMap],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  useEffect(() => {
    clearSelection();
  }, [listScope, clearSelection]);

  useEffect(() => {
    setPage(1);
  }, [listScope, setPage]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rowsEnriched.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rowsEnriched, viewing]);

  const filterFn = useCallback((item: CongViecDanhSachRow, _term: string, f: typeof filters) => {
    return congViecMatchesColumnSearch(item, f);
  }, []);

  const filtered = useListWithFilter(rowsEnriched, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        if (sort.column === 'tien_do') {
          const cmp = deadlineProgressSortKey(a) - deadlineProgressSortKey(b);
          return sort.direction === 'desc' ? -cmp : cmp;
        }
        const key = sort.column as keyof CongViecDanhSachRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => {
        const da = a.thoi_han ?? '';
        const db = b.thoi_han ?? '';
        const c = db.localeCompare(da) || a.ten_cong_viec.localeCompare(b.ten_cong_viec, getLanguage());
        return c;
      });
    }
    return list;
  }, [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_cong_viec', label: txt('taskList.store.tenCol') },
      { key: 'muc_do', label: txt('taskList.store.mucDoCol') },
      { key: 'thoi_han', label: txt('taskList.store.thoiHanCol') },
      { key: 'tien_do', label: txt('taskList.store.tienDoCol') },
      { key: 'trang_thai', label: txt('taskList.store.trangThaiCol') },
      { key: 'ho_va_ten_trach_nhiem', label: txt('taskList.store.trachNhiemCol') },
      { key: 'ho_tro_display', label: txt('taskList.store.hoTroCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('taskList.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: CongViecDanhSachRow) => ({
      ten_cong_viec: item.ten_cong_viec,
      muc_do: item.muc_do,
      thoi_han: item.thoi_han ?? '',
      tien_do: formatCongViecTienDoTheoHan(item.thoi_han, item.trang_thai),
      trang_thai: item.trang_thai,
      ho_va_ten_trach_nhiem: item.ho_va_ten_trach_nhiem ?? item.ten_tai_khoan_trach_nhiem ?? '',
      ho_tro_display: item.ho_tro_display,
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? '',
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

  const handleEdit = (item: CongViecDanhSachRow) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('taskList.deleteTitle'),
      message: txt('taskList.deleteMessage'),
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
      title: txt('taskList.bulkDeleteTitle'),
      message: txt('taskList.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('taskList.noExportData'));
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

  const tabs = useMemo(
    () => [
      { id: TAB_DO, label: txt('taskList.tabMineDo') },
      { id: TAB_RELATED, label: txt('taskList.tabMineRelated') },
      { id: TAB_ASSIGN, label: txt('taskList.tabMineAssign') },
    ],
    [],
  );

  const tabsSlot = useMemo(
    () => (
      <TabGroup
        tabs={tabs}
        activeTab={listScope}
        onChange={(id) => setListScope(id as CongViecListScope)}
        className="shrink-0"
      />
    ),
    [tabs, listScope],
  );

  const trangThaiChipOptions = useMemo(
    () => CONG_VIEC_TRANG_THAI.map((v) => ({ label: v, value: v })),
    [],
  );

  const mucDoChipOptions = useMemo(() => CONG_VIEC_MUC_DO.map((v) => ({ label: v, value: v })), []);

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
          {txt('taskList.noEmployeeForTabs')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <CongViecToolbar
          onPageBack={() => navigate('/quan-ly-giao-viec')}
          tabsSlot={tabsSlot}
          trangThaiOptions={trangThaiChipOptions}
          mucDoOptions={mucDoChipOptions}
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
          <CongViecTable
            data={sorted}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={setViewing}
            serverSidePagination={Boolean(nhanVienId)}
            serverTotalRecords={serverTotalRecords}
            serverHasNextPage={serverHasNextPage}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <CongViecForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <CongViecDetail
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
            fileName={txt('taskList.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default CongViecPage;
