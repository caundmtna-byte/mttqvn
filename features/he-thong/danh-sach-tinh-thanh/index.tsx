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
import { Map as MapIcon, MapPin } from 'lucide-react';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { DRAWER_Z_CONTENT_BASE, DRAWER_WIDTH_DETAIL_SMALL } from '@/lib/dialog-sizes';
import TabGroup, { type Tab } from '@/components/ui/TabGroup';
import type { Option } from '@/components/ui/Combobox';
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog, { type ImportTemplateSheet } from '@/components/shared/ImportDialog';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import {
  useTinhThanhList,
  useXaPhuongForTab,
  useDeleteTinhThanh,
  useDeleteXaPhuong,
  useImportTinhThanhRows,
  useImportXaPhuongRows,
} from './hooks/use-dia-ban';
import { useTinhThanhStore, type TinhThanhListFilters } from './store/useTinhThanhStore';
import { useXaPhuongStore, type XaPhuongListFilters } from './store/useXaPhuongStore';
import { TINH_THANH_SEARCHABLE_KEYS, XA_PHUONG_SEARCHABLE_KEYS } from './utils/search-keys';
import { tinhMatchesColumnSearch, xaMatchesColumnSearch } from './utils/column-search';
import type { TinhThanh } from './core/types';
import type { XaPhuong } from './core/types';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import TinhThanhToolbar from './components/tinh-thanh-toolbar';
import XaPhuongToolbar from './components/xa-phuong-toolbar';
import TinhThanhTable from './components/tinh-thanh-table';
import XaPhuongTable from './components/xa-phuong-table';

const TinhThanhForm = lazy(() => import('./components/tinh-thanh-form'));
const TinhThanhDetail = lazy(() => import('./components/tinh-thanh-detail'));
const XaPhuongForm = lazy(() => import('./components/xa-phuong-form'));
const XaPhuongDetail = lazy(() => import('./components/xa-phuong-detail'));

const TAB_TINH = 'tinh';
const TAB_XA = 'xa';

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

const DanhSachTinhThanhPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'provinces');
  const navigate = useNavigate();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('diaBan.noViewPermission'));
    navigate('/he-thong', { replace: true });
  }, [user, canView, navigate]);

  const confirm = useConfirmStore((s) => s.confirm);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === TAB_XA ? TAB_XA : TAB_TINH;
  const tinhIdFromUrl = searchParams.get('tinhId') ?? '';

  const { canExport, canImport } = useResourcePermissions('provinces');

  const tinhStore = useTinhThanhStore();
  const xaStore = useXaPhuongStore();
  const { resetState: resetTinhStore, clearSelection: clearTinhSelection } = tinhStore;
  const { resetState: resetXaStore, clearSelection: clearXaSelection } = xaStore;

  const { data: tinhList = [], isLoading: loadingTinh } = useTinhThanhList({ enabled: canView });

  const [selectedTinhId, setSelectedTinhId] = useState(tinhIdFromUrl);

  const [showTinhForm, setShowTinhForm] = useState(false);
  const [editingTinh, setEditingTinh] = useState<TinhThanh | null>(null);
  const [viewingTinh, setViewingTinh] = useState<TinhThanh | null>(null);
  /** Chi tiết xã mở từ drawer tỉnh — chồng drawer, không đổi tab / URL */
  const [nestedViewingXa, setNestedViewingXa] = useState<XaPhuong | null>(null);

  const [showXaForm, setShowXaForm] = useState(false);
  const [editingXa, setEditingXa] = useState<XaPhuong | null>(null);
  const [viewingXa, setViewingXa] = useState<XaPhuong | null>(null);
  const [xaFormLockTinhId, setXaFormLockTinhId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedTinhId(tinhIdFromUrl);
  }, [tinhIdFromUrl]);

  const { data: xaList = [], isLoading: loadingXa } = useXaPhuongForTab(tab === TAB_XA, selectedTinhId, {
    enabled: canView,
  });

  const nestedSyncTinhId = viewingTinh?.id ?? '';
  const { data: xaListForNestedSync = [] } = useXaPhuongForTab(
    Boolean(nestedViewingXa && nestedSyncTinhId),
    nestedSyncTinhId,
    { enabled: canView },
  );

  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const deleteTinhMutation = useDeleteTinhThanh();
  const deleteXaMutation = useDeleteXaPhuong();
  const importTinhMutation = useImportTinhThanhRows(() => setShowImport(false));
  const importXaMutation = useImportXaPhuongRows(() => setShowImport(false));

  useEffect(() => {
    return () => {
      resetTinhStore();
      resetXaStore();
    };
  }, [resetTinhStore, resetXaStore]);

  useEffect(() => {
    clearXaSelection();
  }, [selectedTinhId, clearXaSelection]);

  useEffect(() => {
    if (tab === TAB_TINH) {
      clearXaSelection();
    } else {
      clearTinhSelection();
    }
  }, [tab, clearTinhSelection, clearXaSelection]);

  useEffect(() => {
    if (!selectedTinhId || tinhList.length === 0) return;
    if (!tinhList.some((t) => t.id === selectedTinhId)) {
      setSelectedTinhId('');
      const sp = new URLSearchParams(searchParams);
      sp.delete('tinhId');
      setSearchParams(sp, { replace: true });
    }
  }, [tinhList, selectedTinhId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!viewingTinh) return;
    const fresh = tinhList.find((t) => t.id === viewingTinh.id);
    if (fresh && fresh !== viewingTinh) queueMicrotask(() => setViewingTinh(fresh));
  }, [tinhList, viewingTinh]);

  useEffect(() => {
    if (!viewingXa) return;
    const fresh = xaList.find((x) => x.id === viewingXa.id);
    if (fresh && fresh !== viewingXa) queueMicrotask(() => setViewingXa(fresh));
  }, [xaList, viewingXa]);

  useEffect(() => {
    if (!nestedViewingXa) return;
    const nid = nestedViewingXa.id;
    const fresh = xaListForNestedSync.find((x) => x.id === nid);
    if (fresh && fresh !== nestedViewingXa) queueMicrotask(() => setNestedViewingXa(fresh));
  }, [xaListForNestedSync, nestedViewingXa]);

  useEffect(() => {
    if (tab !== TAB_TINH) setNestedViewingXa(null);
  }, [tab]);

  const tinhOptions: Option[] = useMemo(
    () => tinhList.map((t) => ({ label: t.ten, value: t.id })),
    [tinhList],
  );

  const tabs: Tab[] = useMemo(
    () => [
      { id: TAB_TINH, label: txt('diaBan.tabTinh'), icon: MapPin },
      { id: TAB_XA, label: txt('diaBan.tabXa'), icon: MapIcon },
    ],
    [],
  );

  const setTab = useCallback(
    (id: string) => {
      const next = new URLSearchParams(searchParams);
      next.set('tab', id);
      if (id === TAB_TINH) {
        next.delete('tinhId');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const onTinhFilterChange = useCallback(
    (id: string) => {
      setSelectedTinhId(id);
      const next = new URLSearchParams(searchParams);
      next.set('tab', TAB_XA);
      if (id) next.set('tinhId', id);
      else next.delete('tinhId');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const tabGroup = useMemo(
    () => <TabGroup tabs={tabs} activeTab={tab} onChange={setTab} className="shrink-0" />,
    [tabs, tab, setTab],
  );

  const tinhFilterFn = useCallback((item: TinhThanh, term: string, f: TinhThanhListFilters) => {
    const matchesSearch = matchesSearchTerm(
      item as unknown as Record<string, unknown>,
      term,
      [...TINH_THANH_SEARCHABLE_KEYS],
    );
    const matchesCol = tinhMatchesColumnSearch(item, f.columnSearch);
    const n = item.so_xa_phuong ?? 0;
    const matchesSoXa =
      f.so_xa_bucket === 'has' ? n > 0 : f.so_xa_bucket === 'none' ? n <= 0 : true;
    return matchesSearch && matchesCol && matchesSoXa;
  }, []);

  const tinhSoXaCounts = useMemo(() => {
    let has = 0;
    let none = 0;
    for (const t of tinhList) {
      const n = t.so_xa_phuong ?? 0;
      if (n > 0) has += 1;
      else none += 1;
    }
    return { has, none };
  }, [tinhList]);

  const filteredTinh = useListWithFilter(tinhList, tinhStore.searchTerm, tinhStore.filters, tinhFilterFn);

  const sortedTinh = useMemo(() => {
    const list = [...filteredTinh];
    const { column, direction } = tinhStore.sort;
    if (column && direction) {
      const mul = direction === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = a[column as keyof TinhThanh];
        const bv = b[column as keyof TinhThanh];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av ?? '').localeCompare(String(bv ?? ''), getLanguage());
        return mul * cmp;
      });
    } else {
      list.sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, getLanguage()));
    }
    return list;
  }, [filteredTinh, tinhStore.sort]);

  const tinhMap = useMemo(() => new Map(tinhList.map((t) => [t.id, t.ten])), [tinhList]);

  const tinhRefSheet = useMemo<ImportTemplateSheet>(
    () => ({
      name: txt('diaBan.import.refSheetName'),
      headers: [txt('diaBan.import.refSheetColTen'), txt('diaBan.import.refSheetColId')],
      rows: [...tinhList]
        .sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, getLanguage()))
        .map((t) => [t.ten, t.id]),
    }),
    [tinhList],
  );

  const xaFilterFn = useCallback(
    (item: XaPhuong, term: string, f: XaPhuongListFilters) => {
      const tenTinh = tinhMap.get(item.id_tinh_thanh) ?? '';
      const extended = {
        ...(item as unknown as Record<string, unknown>),
        ten_tinh: tenTinh,
      };
      const matchesSearch = matchesSearchTerm(extended, term, [...XA_PHUONG_SEARCHABLE_KEYS]);
      const matchesCol = xaMatchesColumnSearch(item, f.columnSearch);
      return matchesSearch && matchesCol;
    },
    [tinhMap],
  );

  const filteredXa = useListWithFilter(xaList, xaStore.searchTerm, xaStore.filters, xaFilterFn);

  const sortedXa = useMemo(() => {
    const list = [...filteredXa];
    const { column, direction } = xaStore.sort;
    if (column && direction) {
      const mul = direction === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = a[column as keyof XaPhuong];
        const bv = b[column as keyof XaPhuong];
        const cmp =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av ?? '').localeCompare(String(bv ?? ''), getLanguage());
        return mul * cmp;
      });
    } else {
      list.sort((a, b) => a.thu_tu - b.thu_tu || a.ten.localeCompare(b.ten, getLanguage()));
    }
    return list;
  }, [filteredXa, xaStore.sort]);

  const EXPORT_TINH_COLUMNS = useMemo(
    () => [
      { key: 'ten', label: txt('diaBan.colTen'), required: true },
      { key: 'thu_tu', label: txt('diaBan.colThuTu') },
    ],
    [],
  );

  const EXPORT_XA_COLUMNS = useMemo(
    () => [
      { key: 'ten', label: txt('diaBan.colTen'), required: true },
      { key: 'thu_tu', label: txt('diaBan.colThuTu') },
      { key: 'id_tinh_thanh', label: txt('diaBan.colIdTinhThanh') },
    ],
    [],
  );

  const IMPORT_TINH_COLUMNS = useMemo(
    () => [
      { key: 'ten', label: txt('diaBan.import.colTenTinh'), required: true },
      { key: 'thu_tu', label: txt('diaBan.import.colThuTuTinh') },
    ],
    [],
  );

  const IMPORT_XA_COLUMNS = useMemo(
    () => [
      { key: 'ten', label: txt('diaBan.import.colTenXa'), required: true },
      { key: 'thu_tu', label: txt('diaBan.import.colThuTuXa') },
      { key: 'id_tinh_thanh', label: txt('diaBan.colIdTinhThanh') },
      { key: 'ten_tinh', label: txt('diaBan.import.colTinhXa') },
    ],
    [],
  );

  const exportMapTinh = useCallback(
    (item: TinhThanh) => ({
      ten: item.ten,
      thu_tu: item.thu_tu,
    }),
    [],
  );

  const exportMapXa = useCallback(
    (item: XaPhuong) => ({
      ten: item.ten,
      thu_tu: item.thu_tu,
      id_tinh_thanh: item.id_tinh_thanh,
    }),
    [],
  );

  const exportPagination = useMemo(
    () => ({
      page: 1,
      pageSize: Math.max(tab === TAB_TINH ? sortedTinh.length : sortedXa.length, 1),
    }),
    [tab, sortedTinh.length, sortedXa.length],
  );

  const tinhExport = useExportData({
    data: sortedTinh,
    isOpen: showExport && tab === TAB_TINH,
    mapFn: exportMapTinh,
    pagination: exportPagination,
    selectedIds: tinhStore.selectedIds,
    keyExtractor: (item) => item.id,
  });

  const xaExport = useExportData({
    data: sortedXa,
    isOpen: showExport && tab === TAB_XA,
    mapFn: exportMapXa,
    pagination: exportPagination,
    selectedIds: xaStore.selectedIds,
    keyExtractor: (item) => item.id,
  });

  const visibleExportKeys = useMemo(
    () => (tab === TAB_TINH ? EXPORT_TINH_COLUMNS : EXPORT_XA_COLUMNS).map((c) => c.key),
    [tab, EXPORT_TINH_COLUMNS, EXPORT_XA_COLUMNS],
  );

  const openImport = useCallback(() => {
    if (tab === TAB_XA && tinhList.length === 0) {
      toast.warning(txt('diaBan.import.needTinhCatalog'));
      return;
    }
    setShowImport(true);
  }, [tab, tinhList]);

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (tab === TAB_TINH) {
        await importTinhMutation.mutateAsync(data);
      } else {
        await importXaMutation.mutateAsync({ rows: data, tinhList });
      }
    },
    [tab, tinhList, importTinhMutation, importXaMutation],
  );

  const handleExportOpen = () => {
    if (tab === TAB_TINH) {
      if (sortedTinh.length === 0) {
        toast.warning(txt('diaBan.noExportData'));
        return;
      }
    } else if (sortedXa.length === 0) {
      toast.warning(txt('diaBan.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleDeleteTinh = (id: string) => {
    confirm({
      title: txt('diaBan.deleteTinhTitle'),
      message: txt('diaBan.deleteTinhMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteTinhMutation.mutate([id], {
          onSuccess: () => {
            setViewingTinh((v) => (v?.id === id ? null : v));
            setNestedViewingXa((n) => (n?.id_tinh_thanh === id ? null : n));
          },
        });
      },
    });
  };

  const handleDeleteTinhMany = (ids: string[]) => {
    confirm({
      title: txt('diaBan.bulkDeleteTinhTitle'),
      message: txt('diaBan.bulkDeleteTinhMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteTinhMutation.mutate(ids, {
          onSuccess: () => {
            tinhStore.clearSelection();
            setViewingTinh((v) => (v && ids.includes(v.id) ? null : v));
            setNestedViewingXa((n) => (n && ids.includes(n.id_tinh_thanh) ? null : n));
          },
        });
      },
    });
  };

  const handleDeleteXa = (id: string) => {
    if (!xaList.some((x) => x.id === id)) return;
    confirm({
      title: txt('diaBan.deleteXaTitle'),
      message: txt('diaBan.deleteXaMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteXaMutation.mutate(
          { ids: [id] },
          {
            onSuccess: () => {
              setViewingXa((v) => (v?.id === id ? null : v));
              setNestedViewingXa((n) => (n?.id === id ? null : n));
            },
          },
        );
      },
    });
  };

  const handleDeleteXaMany = (ids: string[]) => {
    if (ids.length === 0) return;
    confirm({
      title: txt('diaBan.bulkDeleteXaTitle'),
      message: txt('diaBan.bulkDeleteXaMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteXaMutation.mutate(
          { ids },
          {
            onSuccess: () => {
              xaStore.clearSelection();
              setViewingXa((v) => (v && ids.includes(v.id) ? null : v));
              setNestedViewingXa((n) => (n && ids.includes(n.id) ? null : n));
            },
          },
        );
      },
    });
  };

  const closeTinhForm = () => {
    setShowTinhForm(false);
    setEditingTinh(null);
  };

  const closeXaForm = () => {
    setShowXaForm(false);
    setEditingXa(null);
    setXaFormLockTinhId(undefined);
  };

  const openAddTinh = () => {
    setEditingTinh(null);
    startTransition(() => setShowTinhForm(true));
  };

  const openEditTinh = (item: TinhThanh) => {
    setEditingTinh(item);
    startTransition(() => setShowTinhForm(true));
  };

  const openAddXaFromTab = () => {
    setEditingXa(null);
    setXaFormLockTinhId(selectedTinhId.trim() || undefined);
    startTransition(() => setShowXaForm(true));
  };

  const openAddXaFromDetail = () => {
    if (!viewingTinh) return;
    setNestedViewingXa(null);
    setEditingXa(null);
    setXaFormLockTinhId(viewingTinh.id);
    startTransition(() => setShowXaForm(true));
  };

  const openEditXa = (item: XaPhuong) => {
    setNestedViewingXa(null);
    setEditingXa(item);
    setXaFormLockTinhId(undefined);
    startTransition(() => setShowXaForm(true));
  };

  const openEditXaFromDetail = (item: XaPhuong) => {
    setNestedViewingXa(null);
    setEditingXa(item);
    setXaFormLockTinhId(undefined);
    startTransition(() => setShowXaForm(true));
  };

  const xaFormStackLevel = viewingTinh && showXaForm ? 1 : 0;

  const handleViewXaFromTinhDetail = useCallback((x: XaPhuong) => {
    setNestedViewingXa(x);
  }, []);

  const closeTinhDetail = useCallback(() => {
    setViewingTinh(null);
    setNestedViewingXa(null);
  }, []);

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
        {tab === TAB_TINH ? (
          <>
            <TinhThanhToolbar
              desktopStartSlot={tabGroup}
              soXaCounts={tinhSoXaCounts}
              onAdd={openAddTinh}
              onExport={canExport ? handleExportOpen : undefined}
              onImport={canImport ? openImport : undefined}
              onDeleteMany={handleDeleteTinhMany}
            />
            <div className="flex-1 min-h-0">
              <TinhThanhTable
                data={sortedTinh}
                isLoading={loadingTinh}
                onEdit={openEditTinh}
                onDelete={handleDeleteTinh}
                onView={(t) => {
                  setNestedViewingXa(null);
                  setViewingTinh(t);
                }}
              />
            </div>
          </>
        ) : (
          <>
            <XaPhuongToolbar
              desktopStartSlot={tabGroup}
              tinhOptions={tinhOptions}
              selectedTinhId={selectedTinhId}
              onTinhChange={onTinhFilterChange}
              onAdd={openAddXaFromTab}
              onExport={canExport ? handleExportOpen : undefined}
              onImport={canImport ? openImport : undefined}
              onDeleteMany={handleDeleteXaMany}
            />
            <div className="flex-1 min-h-0">
              <XaPhuongTable
                data={sortedXa}
                isLoading={loadingXa}
                onEdit={openEditXa}
                onDelete={handleDeleteXa}
                onView={(x) => {
                  setNestedViewingXa(null);
                  setViewingXa(x);
                }}
              />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showTinhForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <TinhThanhForm initialData={editingTinh} onClose={closeTinhForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingTinh && !showTinhForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <>
              <TinhThanhDetail
                data={viewingTinh}
                onClose={closeTinhDetail}
                onEdit={openEditTinh}
                onDelete={handleDeleteTinh}
                onAddXa={openAddXaFromDetail}
                onEditXa={openEditXaFromDetail}
                onDeleteXa={handleDeleteXa}
                onViewXa={handleViewXaFromTinhDetail}
              />
              {nestedViewingXa && !showXaForm ? (
                <XaPhuongDetail
                  key={nestedViewingXa.id}
                  data={nestedViewingXa}
                  tinhList={tinhList}
                  onClose={() => setNestedViewingXa(null)}
                  onEdit={openEditXa}
                  onDelete={handleDeleteXa}
                  stackLevel={1}
                  maxWidthClass={DRAWER_WIDTH_DETAIL_SMALL}
                />
              ) : null}
            </>
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showXaForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <XaPhuongForm
              initialData={editingXa}
              lockTinhId={xaFormLockTinhId}
              tinhOptions={tinhOptions}
              stackLevel={xaFormStackLevel}
              onClose={closeXaForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingXa && !showXaForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <XaPhuongDetail
              data={viewingXa}
              tinhList={tinhList}
              onClose={() => setViewingXa(null)}
              onEdit={openEditXa}
              onDelete={handleDeleteXa}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExport && (
          <ExportDialog
            open={showExport}
            onClose={() => setShowExport(false)}
            columns={tab === TAB_TINH ? EXPORT_TINH_COLUMNS : EXPORT_XA_COLUMNS}
            data={tab === TAB_TINH ? tinhExport.exportData : xaExport.exportData}
            paginatedData={tab === TAB_TINH ? tinhExport.paginatedData : xaExport.paginatedData}
            selectedData={tab === TAB_TINH ? tinhExport.selectedData : xaExport.selectedData}
            fileName={tab === TAB_TINH ? 'Danh_muc_tinh_thanh' : 'Danh_muc_xa_phuong'}
            visibleColumnKeys={visibleExportKeys}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportDialog
            key={tab}
            open={showImport}
            onClose={() => setShowImport(false)}
            columns={tab === TAB_TINH ? IMPORT_TINH_COLUMNS : IMPORT_XA_COLUMNS}
            onImport={handleImportData}
            templateFileName={
              tab === TAB_TINH ? txt('diaBan.import.templateTinh') : txt('diaBan.import.templateXa')
            }
            templateSheets={tab === TAB_XA ? [tinhRefSheet] : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DanhSachTinhThanhPage;
