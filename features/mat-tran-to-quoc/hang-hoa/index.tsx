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
import { isPermissionMatrixEnabled } from '@/lib/permission-matrix-env';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import ExportDialog from '@/components/shared/ExportDialog';
import TabGroup from '@/components/ui/TabGroup';
import {
  useKhoDanhMucHangHoaList,
  useKhoDanhMucHangHoaDetail,
  useDeleteKhoDanhMucHangHoaMany,
} from './hooks/use-kho-danh-muc-hang-hoa';
import {
  useKhoDanhSachHangHoaList,
  useKhoDanhSachHangHoaDetail,
  useDeleteKhoDanhSachHangHoaMany,
} from './hooks/use-kho-danh-sach-hang-hoa';
import { useKhoDanhMucHangHoaStore } from './store/useKhoDanhMucHangHoaStore';
import { useKhoDanhSachHangHoaStore } from './store/useKhoDanhSachHangHoaStore';
import type { KhoDanhMucHangHoaListRow, KhoDanhSachHangHoaListRow } from './core/types';
import { KHO_DANH_MUC_HANG_HOA_SEARCHABLE_KEYS, KHO_DANH_SACH_HANG_HOA_SEARCHABLE_KEYS } from './utils/search-keys';
import { danhMucMatchesColumnSearch, hangHoaMatchesColumnSearch } from './utils/column-search';
import { sortDanhMucHangHoaList, sortHangHoaList } from './utils/sort';
import KhoDanhMucHangHoaToolbar from './components/kho-danh-muc-hang-hoa-toolbar';
import KhoDanhMucHangHoaTable from './components/kho-danh-muc-hang-hoa-table';
import KhoDanhSachHangHoaToolbar from './components/kho-danh-sach-hang-hoa-toolbar';
import KhoDanhSachHangHoaTable from './components/kho-danh-sach-hang-hoa-table';

const KhoDanhMucHangHoaForm = lazy(() => import('./components/kho-danh-muc-hang-hoa-form'));
const KhoDanhMucHangHoaDetail = lazy(() => import('./components/kho-danh-muc-hang-hoa-detail'));
const KhoDanhSachHangHoaForm = lazy(() => import('./components/kho-danh-sach-hang-hoa-form'));
const KhoDanhSachHangHoaDetail = lazy(() => import('./components/kho-danh-sach-hang-hoa-detail'));

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

const TAB_DM = 'danh_muc';
const TAB_HH = 'hang_hoa';

const HANG_HOA_MAIN_TABS = [TAB_DM, TAB_HH] as const;

type FormOrigin = 'list' | 'detail';

const HangHoaPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefGoods');
  const matrixEnabled = isPermissionMatrixEnabled();
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user &&
      (user.role === 'admin' || !matrixEnabled || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    matrixEnabled &&
    user != null &&
    user.role !== 'admin' &&
    chucVuKey.trim() !== '' &&
    !matrixActive;

  const [activeTab, setActiveTab] = useTabSearchParam(HANG_HOA_MAIN_TABS, TAB_DM);

  const dmStore = useKhoDanhMucHangHoaStore();
  const hhStore = useKhoDanhSachHangHoaStore();

  useEffect(() => {
    useKhoDanhMucHangHoaStore.getState().resetState();
    useKhoDanhSachHangHoaStore.getState().resetState();
  }, [activeTab]);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranHangHoa.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [dmShowForm, setDmShowForm] = useState(false);
  const [dmEditing, setDmEditing] = useState<KhoDanhMucHangHoaListRow | null>(null);
  const [dmViewingId, setDmViewingId] = useState<string | null>(null);
  const [dmFormOrigin, setDmFormOrigin] = useState<FormOrigin>('list');
  const [dmShowExport, setDmShowExport] = useState(false);

  const [hhShowForm, setHhShowForm] = useState(false);
  const [hhEditing, setHhEditing] = useState<KhoDanhSachHangHoaListRow | null>(null);
  const [hhViewingId, setHhViewingId] = useState<string | null>(null);
  const [hhFormOrigin, setHhFormOrigin] = useState<FormOrigin>('list');
  const [hhShowExport, setHhShowExport] = useState(false);
  /** Gán `id_danh_muc` khi thêm hàng từ chi tiết danh mục */
  const [hhCreatePresetDanhMucId, setHhCreatePresetDanhMucId] = useState<string | null>(null);

  const {
    searchTerm: dmSearch,
    filters: dmFilters,
    sort: dmSort,
    resetState: dmReset,
    clearSelection: dmClearSel,
    selectedIds: dmSel,
    pagination: dmPag,
    columns: dmCols,
  } = dmStore;

  const {
    searchTerm: hhSearch,
    filters: hhFilters,
    sort: hhSort,
    resetState: hhReset,
    clearSelection: hhClearSel,
    selectedIds: hhSel,
    pagination: hhPag,
    columns: hhCols,
  } = hhStore;

  const { data: dmRows = [], isLoading: dmLoading } = useKhoDanhMucHangHoaList({ enabled: listQueryEnabled });
  const dmDetailEnabled = listQueryEnabled && Boolean(dmViewingId?.trim()) && activeTab === TAB_DM;
  const { data: dmViewing } = useKhoDanhMucHangHoaDetail(dmViewingId, {
    enabled: dmDetailEnabled,
  });

  const { data: hhRows = [], isLoading: hhLoading } = useKhoDanhSachHangHoaList({ enabled: listQueryEnabled });
  const hhDetailEnabled = listQueryEnabled && Boolean(hhViewingId?.trim()) && activeTab === TAB_HH;
  const { data: hhViewing } = useKhoDanhSachHangHoaDetail(hhViewingId, { enabled: hhDetailEnabled });
  const dmListLoading = dmLoading || waitingMatrixHydrate;
  const hhListLoading = hhLoading || waitingMatrixHydrate;

  const deleteDm = useDeleteKhoDanhMucHangHoaMany();
  const deleteHh = useDeleteKhoDanhSachHangHoaMany();

  useEffect(() => {
    return () => {
      dmReset();
      hhReset();
    };
  }, [dmReset, hhReset]);

  const filterDm = useCallback(
    (item: KhoDanhMucHangHoaListRow, term: string, f: typeof dmFilters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...KHO_DANH_MUC_HANG_HOA_SEARCHABLE_KEYS],
      );
      const mo = (item.mo_ta ?? '').trim();
      if (f.mo_ta_bucket === 'has' && !mo) return false;
      if (f.mo_ta_bucket === 'empty' && mo) return false;
      if (f.trang_thai && item.trang_thai !== f.trang_thai) return false;
      if (!danhMucMatchesColumnSearch(item, f.columnSearch, f.mo_ta_bucket)) return false;
      return matchesSearch;
    },
    [],
  );

  const filterHh = useCallback(
    (item: KhoDanhSachHangHoaListRow, term: string, f: typeof hhFilters) => {
      if (f.id_danh_muc && item.id_danh_muc !== f.id_danh_muc) return false;
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...KHO_DANH_SACH_HANG_HOA_SEARCHABLE_KEYS],
      );
      const mo = (item.mo_ta ?? '').trim();
      if (f.mo_ta_bucket === 'has' && !mo) return false;
      if (f.mo_ta_bucket === 'empty' && mo) return false;
      if (f.trang_thai && item.trang_thai !== f.trang_thai) return false;
      if (!hangHoaMatchesColumnSearch(item, f.columnSearch, f.mo_ta_bucket)) return false;
      return matchesSearch;
    },
    [],
  );

  const dmFiltered = useListWithFilter(dmRows, dmSearch, dmFilters, filterDm);
  const hhFiltered = useListWithFilter(hhRows, hhSearch, hhFilters, filterHh);

  const dmSorted = useMemo(() => {
    const s = sortDanhMucHangHoaList(dmFiltered, dmSort);
    if (dmSort.column && dmSort.direction) return s;
    return [...s].sort((a, b) => a.thu_tu - b.thu_tu || a.ten_danh_muc.localeCompare(b.ten_danh_muc, 'vi'));
  }, [dmFiltered, dmSort]);

  const hhSorted = useMemo(() => {
    const s = sortHangHoaList(hhFiltered, hhSort);
    if (hhSort.column && hhSort.direction) return s;
    return [...s].sort((a, b) => {
      const g = a.ten_danh_muc_nhom.localeCompare(b.ten_danh_muc_nhom, 'vi');
      if (g !== 0) return g;
      const o = a.thu_tu - b.thu_tu;
      if (o !== 0) return o;
      return a.ten_hang_hoa.localeCompare(b.ten_hang_hoa, 'vi');
    });
  }, [hhFiltered, hhSort]);

  const dmExportCols = useMemo(
    () => [
      { key: 'ten_danh_muc', label: txt('matTranHangHoa.store.tenDanhMuc') },
      { key: 'mo_ta', label: txt('matTranHangHoa.store.moTa') },
      { key: 'thu_tu', label: txt('matTranHangHoa.store.thuTu') },
      { key: 'trang_thai', label: txt('matTranHangHoa.store.trangThai') },
      { key: 'tg_tao', label: txt('matTranHangHoa.store.tgTao') },
      { key: 'tg_cap_nhat', label: txt('matTranHangHoa.store.tgCapNhat') },
    ],
    [],
  );

  const hhExportCols = useMemo(
    () => [
      { key: 'ten_danh_muc_nhom', label: txt('matTranHangHoa.store.tenNhom') },
      { key: 'ten_hang_hoa', label: txt('matTranHangHoa.store.tenHangHoa') },
      { key: 'don_vi_tinh', label: txt('matTranHangHoa.store.donViTinh') },
      { key: 'quy_cach', label: txt('matTranHangHoa.store.quyCach') },
      { key: 'mo_ta', label: txt('matTranHangHoa.store.moTa') },
      { key: 'thu_tu', label: txt('matTranHangHoa.store.thuTu') },
      { key: 'trang_thai', label: txt('matTranHangHoa.store.trangThai') },
      { key: 'tg_cap_nhat', label: txt('matTranHangHoa.store.tgCapNhat') },
    ],
    [],
  );

  const dmExportMap = useCallback(
    (item: KhoDanhMucHangHoaListRow) => ({
      ten_danh_muc: item.ten_danh_muc,
      mo_ta: item.mo_ta ?? '',
      thu_tu: item.thu_tu,
      trang_thai: item.trang_thai,
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
  );

  const hhExportMap = useCallback(
    (item: KhoDanhSachHangHoaListRow) => ({
      ten_danh_muc_nhom: item.ten_danh_muc_nhom,
      ten_hang_hoa: item.ten_hang_hoa,
      don_vi_tinh: item.don_vi_tinh,
      quy_cach: item.quy_cach ?? '',
      mo_ta: item.mo_ta ?? '',
      thu_tu: item.thu_tu,
      trang_thai: item.trang_thai,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
  );

  const dmExport = useExportData({
    data: dmSorted,
    isOpen: dmShowExport,
    mapFn: dmExportMap,
    pagination: dmPag,
    selectedIds: dmSel,
    keyExtractor: (r) => r.id,
  });

  const hhExport = useExportData({
    data: hhSorted,
    isOpen: hhShowExport,
    mapFn: hhExportMap,
    pagination: hhPag,
    selectedIds: hhSel,
    keyExtractor: (r) => r.id,
  });

  const dmVisibleKeys = useMemo(() => dmCols.filter((c) => c.visible).map((c) => c.id), [dmCols]);
  const hhVisibleKeys = useMemo(() => hhCols.filter((c) => c.visible).map((c) => c.id), [hhCols]);

  const tabs = useMemo(
    () => [
      { id: TAB_DM, label: txt('matTranHangHoa.tabDanhMuc') },
      { id: TAB_HH, label: txt('matTranHangHoa.tabHangHoa') },
    ],
    [],
  );

  const tabSlot = useMemo(
    () => <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />,
    [activeTab, tabs],
  );

  const goBack = () => navigate('/mat-tran-to-quoc');

  const handleDeleteDm = (id: string) => {
    confirm({
      title: txt('matTranHangHoa.deleteTitle'),
      message: txt('matTranHangHoa.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteDm.mutate([id], {
          onSuccess: () => {
            if (dmViewingId === id) setDmViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteDmMany = (ids: string[]) => {
    confirm({
      title: txt('matTranHangHoa.bulkDeleteTitle'),
      message: txt('matTranHangHoa.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteDm.mutate(ids, {
          onSuccess: () => {
            dmClearSel();
            if (dmViewingId && ids.includes(dmViewingId)) setDmViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteHh = (id: string) => {
    confirm({
      title: txt('matTranHangHoa.deleteHangTitle'),
      message: txt('matTranHangHoa.deleteHangMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteHh.mutate([id], {
          onSuccess: () => {
            if (hhViewingId === id) setHhViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteHhMany = (ids: string[]) => {
    confirm({
      title: txt('matTranHangHoa.bulkDeleteHangTitle'),
      message: txt('matTranHangHoa.bulkDeleteHangMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteHh.mutate(ids, {
          onSuccess: () => {
            hhClearSel();
            if (hhViewingId && ids.includes(hhViewingId)) setHhViewingId(null);
          },
        });
      },
    });
  };

  const closeDmForm = () => {
    const vid = dmViewingId;
    const was = dmEditing;
    const origin = dmFormOrigin;
    setDmShowForm(false);
    setDmEditing(null);
    if (origin === 'detail' && vid && was && was.id === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoDanhMucHangHoa.detail(vid) });
    }
    setDmFormOrigin('list');
  };

  const closeHhForm = () => {
    const vid = hhViewingId;
    const was = hhEditing;
    const origin = hhFormOrigin;
    setHhShowForm(false);
    setHhEditing(null);
    setHhCreatePresetDanhMucId(null);
    if (origin === 'detail' && vid && was && was.id === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoDanhSachHangHoa.detail(vid) });
    }
    setHhFormOrigin('list');
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
        {activeTab === TAB_DM ? (
          <>
            <KhoDanhMucHangHoaToolbar
              tabSlot={tabSlot}
              onPageBack={goBack}
              onAdd={() => {
                startTransition(() => {
                  setDmFormOrigin('list');
                  setDmEditing(null);
                  setDmShowForm(true);
                });
              }}
              onExport={() => {
                if (dmSorted.length === 0) {
                  toast.warning(txt('matTranHangHoa.noExportData'));
                  return;
                }
                setDmShowExport(true);
              }}
              onDeleteMany={handleDeleteDmMany}
              items={dmRows}
            />
            <div className="flex-1 min-h-0">
              <KhoDanhMucHangHoaTable
                data={dmSorted}
                isLoading={dmListLoading}
                onEdit={(item) => {
                  startTransition(() => {
                    setDmFormOrigin('list');
                    setDmEditing(item);
                    setDmShowForm(true);
                  });
                }}
                onDelete={handleDeleteDm}
                onView={(item) => {
                  queryClient.setQueryData(queryKeys.khoDanhMucHangHoa.detail(item.id), item);
                  setDmViewingId(item.id);
                }}
              />
            </div>
          </>
        ) : (
          <>
            <KhoDanhSachHangHoaToolbar
              tabSlot={tabSlot}
              onPageBack={goBack}
              onAdd={() => {
                if (dmRows.length === 0) {
                  toast.warning(txt('matTranHangHoa.addHangNeedDanhMuc'));
                  return;
                }
                setHhCreatePresetDanhMucId(null);
                setDmViewingId(null);
                startTransition(() => {
                  setHhFormOrigin('list');
                  setHhEditing(null);
                  setHhShowForm(true);
                });
              }}
              onExport={() => {
                if (hhSorted.length === 0) {
                  toast.warning(txt('matTranHangHoa.noExportData'));
                  return;
                }
                setHhShowExport(true);
              }}
              onDeleteMany={handleDeleteHhMany}
              danhMucList={dmRows}
              items={hhRows}
            />
            <div className="flex-1 min-h-0">
              <KhoDanhSachHangHoaTable
                data={hhSorted}
                isLoading={hhListLoading}
                onEdit={(item) => {
                  setHhCreatePresetDanhMucId(null);
                  setDmViewingId(null);
                  startTransition(() => {
                    setHhFormOrigin('list');
                    setHhEditing(item);
                    setHhShowForm(true);
                  });
                }}
                onDelete={handleDeleteHh}
                onView={(item) => {
                  queryClient.setQueryData(queryKeys.khoDanhSachHangHoa.detail(item.id), item);
                  setHhViewingId(item.id);
                }}
              />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {dmShowForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDanhMucHangHoaForm initialData={dmEditing} allDanhMucRows={dmRows} onClose={closeDmForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === TAB_DM && dmViewingId && dmViewing && !dmShowForm && !hhShowForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDanhMucHangHoaDetail
              data={dmViewing}
              hangHoaRows={hhRows}
              hangHoaLoading={hhLoading}
              onClose={() => setDmViewingId(null)}
              onEdit={(d) => {
                setDmFormOrigin('detail');
                setDmEditing(d);
                setDmShowForm(true);
              }}
              onDelete={handleDeleteDm}
              onAddHangHoa={(dm) => {
                setHhCreatePresetDanhMucId(dm.id);
                startTransition(() => {
                  setHhFormOrigin('list');
                  setHhEditing(null);
                  setHhShowForm(true);
                });
              }}
              onEditHangHoa={(row) => {
                setHhCreatePresetDanhMucId(null);
                startTransition(() => {
                  setHhFormOrigin('detail');
                  setHhEditing(row);
                  setHhShowForm(true);
                });
              }}
              onDeleteHangHoa={handleDeleteHh}
              onViewHangHoa={(row) => {
                setActiveTab(TAB_HH);
                setHhViewingId(row.id);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hhShowForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDanhSachHangHoaForm
              initialData={hhEditing}
              danhMucList={dmRows}
              hangHoaListForSuggestions={hhRows}
              presetDanhMucId={hhCreatePresetDanhMucId}
              onClose={closeHhForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab === TAB_HH && hhViewingId && hhViewing && !hhShowForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoDanhSachHangHoaDetail
              data={hhViewing}
              onClose={() => setHhViewingId(null)}
              onEdit={(d) => {
                setHhCreatePresetDanhMucId(null);
                setHhFormOrigin('detail');
                setHhEditing(d);
                setHhShowForm(true);
              }}
              onDelete={handleDeleteHh}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dmShowExport && (
          <ExportDialog
            open={dmShowExport}
            onClose={() => setDmShowExport(false)}
            columns={dmExportCols}
            data={dmExport.exportData}
            paginatedData={dmExport.paginatedData}
            selectedData={dmExport.selectedData}
            fileName={txt('matTranHangHoa.exportFileNameDanhMuc')}
            visibleColumnKeys={dmVisibleKeys}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hhShowExport && (
          <ExportDialog
            open={hhShowExport}
            onClose={() => setHhShowExport(false)}
            columns={hhExportCols}
            data={hhExport.exportData}
            paginatedData={hhExport.paginatedData}
            selectedData={hhExport.selectedData}
            fileName={txt('matTranHangHoa.exportFileNameHangHoa')}
            visibleColumnKeys={hhVisibleKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default HangHoaPage;
