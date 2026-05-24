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
import { useCan } from '@/hooks/use-can';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { formatCurrency } from '@/lib/utils';
import ExportDialog from '@/components/shared/ExportDialog';
import TabGroup from '@/components/ui/TabGroup';
import {
  useNhapXuatKhoList,
  useNhapXuatKhoDetail,
  useNhapXuatKhoCtFlatList,
  useDeleteNhapXuatKhoMany,
} from './hooks/use-kho-nhap-xuat-kho';
import { getNhapXuatKhoById } from './services/kho-nhap-xuat-kho-service';
import { useNhapXuatKhoStore } from './store/useNhapXuatKhoStore';
import { useNhapXuatKhoCtFlatStore } from './store/useNhapXuatKhoCtFlatStore';
import type {
  NhapXuatKhoCtFlatRow,
  NhapXuatKhoDetail,
  NhapXuatKhoListRow,
} from './core/types';
import {
  NHAP_XUAT_KHO_SEARCHABLE_KEYS,
  NHAP_XUAT_KHO_CT_FLAT_SEARCHABLE_KEYS,
} from './utils/search-keys';
import {
  countColumnSearchActive,
  nhapXuatKhoCtMatchesColumnSearch,
  nhapXuatKhoMatchesColumnSearch,
} from './utils/column-search';
import { sortNhapXuatKhoCtFlat, sortNhapXuatKhoList } from './utils/sort';
import NhapXuatKhoToolbar from './components/kho-nhap-xuat-kho-toolbar';
import NhapXuatKhoTable from './components/kho-nhap-xuat-kho-table';
import NhapXuatKhoCtFlatToolbar from './components/kho-nhap-xuat-kho-ct-flat-toolbar';
import NhapXuatKhoCtFlatTable from './components/kho-nhap-xuat-kho-ct-flat-table';

const NhapXuatKhoForm = lazy(() => import('./components/kho-nhap-xuat-kho-form'));
const NhapXuatKhoDetailDrawer = lazy(() => import('./components/kho-nhap-xuat-kho-detail'));

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

const TAB_LIST = 'danh_sach';
const TAB_CT = 'chi_tiet';
const NHAP_XUAT_KHO_TABS = [TAB_LIST, TAB_CT] as const;

type FormOrigin = 'list' | 'detail';

const NhapXuatKhoPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefStockTransactions');
  const didRedirect = useRef(false);

  const [activeTab, setActiveTab] = useTabSearchParam(NHAP_XUAT_KHO_TABS, TAB_LIST);

  const listStore = useNhapXuatKhoStore();
  const ctStore = useNhapXuatKhoCtFlatStore();

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranNhapXuatKho.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NhapXuatKhoDetail | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExportList, setShowExportList] = useState(false);
  const [showExportCt, setShowExportCt] = useState(false);

  const {
    searchTerm: listSearch,
    filters: listFilters,
    sort: listSort,
    resetState: listReset,
    clearSelection: listClearSel,
    selectedIds: listSel,
    pagination: listPag,
    columns: listCols,
  } = listStore;

  const {
    searchTerm: ctSearch,
    filters: ctFilters,
    sort: ctSort,
    resetState: ctReset,
    pagination: ctPag,
    selectedIds: ctSel,
    columns: ctCols,
  } = ctStore;

  const { data: rows = [], isLoading: listLoading } = useNhapXuatKhoList({ enabled: canView });
  const { data: ctRows = [], isLoading: ctLoading } = useNhapXuatKhoCtFlatList({ enabled: canView });
  const detailEnabled = canView && Boolean(viewingId?.trim());
  const { data: viewingData } = useNhapXuatKhoDetail(viewingId, { enabled: detailEnabled });
  const deleteMany = useDeleteNhapXuatKhoMany();

  useEffect(() => {
    return () => {
      listReset();
      ctReset();
    };
  }, [listReset, ctReset]);

  const filterList = useCallback(
    (item: NhapXuatKhoListRow, term: string, f: typeof listFilters) => {
      if (f.loai_phieu && item.loai_phieu !== f.loai_phieu) return false;
      if (f.kho_id && item.kho_xuat_id !== f.kho_id && item.kho_nhap_id !== f.kho_id) return false;
      if (f.don_vi_cuu_tro_id && item.don_vi_cuu_tro_id !== f.don_vi_cuu_tro_id) return false;
      if (f.dot_cuu_tro_id && item.dot_cuu_tro_id !== f.dot_cuu_tro_id) return false;
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...NHAP_XUAT_KHO_SEARCHABLE_KEYS],
      );
      if (!nhapXuatKhoMatchesColumnSearch(item, f.columnSearch)) return false;
      return matchesSearch;
    },
    [],
  );

  const filterCt = useCallback(
    (item: NhapXuatKhoCtFlatRow, term: string, f: typeof ctFilters) => {
      if (f.loai_phieu && item.loai_phieu !== f.loai_phieu) return false;
      if (f.hang_hoa_id && item.hang_hoa_id !== f.hang_hoa_id) return false;
      if (f.kho_id) {
        if (item.kho_xuat_id !== f.kho_id && item.kho_nhap_id !== f.kho_id) return false;
      }
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...NHAP_XUAT_KHO_CT_FLAT_SEARCHABLE_KEYS],
      );
      if (!nhapXuatKhoCtMatchesColumnSearch(item, f.columnSearch)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(rows, listSearch, listFilters, filterList);
  const filteredCt = useListWithFilter(ctRows, ctSearch, ctFilters, filterCt);

  const sorted = useMemo(() => sortNhapXuatKhoList(filtered, listSort), [filtered, listSort]);
  const sortedCt = useMemo(() => sortNhapXuatKhoCtFlat(filteredCt, ctSort), [filteredCt, ctSort]);

  const listExportCols = useMemo(
    () => [
      { key: 'tt', label: txt('matTranNhapXuatKho.store.ttCol') },
      { key: 'so_phieu', label: txt('matTranNhapXuatKho.store.soPhieuCol') },
      { key: 'loai_phieu', label: txt('matTranNhapXuatKho.store.loaiPhieuCol') },
      { key: 'ngay_phieu', label: txt('matTranNhapXuatKho.store.ngayPhieuCol') },
      { key: 'ten_kho_xuat', label: txt('matTranNhapXuatKho.store.khoXuatCol') },
      { key: 'ten_kho_nhap', label: txt('matTranNhapXuatKho.store.khoNhapCol') },
      { key: 'ten_don_vi_cuu_tro', label: txt('matTranNhapXuatKho.store.donViCuuTroCol') },
      { key: 'ten_dot_cuu_tro', label: txt('matTranNhapXuatKho.store.dotCuuTroCol') },
      { key: 'so_dong', label: txt('matTranNhapXuatKho.store.soDongCol') },
      { key: 'tg_tao', label: txt('matTranNhapXuatKho.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('matTranNhapXuatKho.store.tgCapNhatCol') },
    ],
    [],
  );

  const listExportMap = useCallback(
    (item: NhapXuatKhoListRow) => ({
      tt: item.tt,
      so_phieu: item.so_phieu,
      loai_phieu: txt(`matTranNhapXuatKho.loaiPhieu.${item.loai_phieu}`),
      ngay_phieu: item.ngay_phieu ?? '',
      ten_kho_xuat: item.ten_kho_xuat ?? '',
      ten_kho_nhap: item.ten_kho_nhap ?? '',
      ten_don_vi_cuu_tro: item.ten_don_vi_cuu_tro ?? '',
      ten_dot_cuu_tro: item.ten_dot_cuu_tro ?? '',
      so_dong: item.so_dong,
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
  );

  const ctExportCols = useMemo(
    () => [
      { key: 'so_phieu', label: txt('matTranNhapXuatKho.store.soPhieuCol') },
      { key: 'loai_phieu', label: txt('matTranNhapXuatKho.store.loaiPhieuCol') },
      { key: 'ngay_phieu', label: txt('matTranNhapXuatKho.store.ngayPhieuCol') },
      { key: 'ten_hang_hoa', label: txt('matTranNhapXuatKho.store.hangHoaCol') },
      { key: 'don_vi_tinh', label: txt('matTranNhapXuatKho.store.donViTinhCol') },
      { key: 'so_luong', label: txt('matTranNhapXuatKho.store.soLuongCol') },
      { key: 'don_gia', label: txt('matTranNhapXuatKho.store.donGiaCol') },
      { key: 'thanh_tien', label: txt('matTranNhapXuatKho.store.thanhTienCol') },
      { key: 'ten_kho_xuat', label: txt('matTranNhapXuatKho.store.khoXuatCol') },
      { key: 'ten_kho_nhap', label: txt('matTranNhapXuatKho.store.khoNhapCol') },
      { key: 'ghi_chu', label: txt('matTranNhapXuatKho.store.ghiChuCol') },
    ],
    [],
  );

  const ctExportMap = useCallback(
    (item: NhapXuatKhoCtFlatRow) => ({
      so_phieu: item.so_phieu,
      loai_phieu: txt(`matTranNhapXuatKho.loaiPhieu.${item.loai_phieu}`),
      ngay_phieu: item.ngay_phieu ?? '',
      ten_hang_hoa: item.ten_hang_hoa ?? '',
      don_vi_tinh: item.don_vi_tinh,
      so_luong: item.so_luong,
      don_gia: item.don_gia > 0 ? item.don_gia : '',
      thanh_tien: item.thanh_tien > 0 ? formatCurrency(item.thanh_tien) : '',
      ten_kho_xuat: item.ten_kho_xuat ?? '',
      ten_kho_nhap: item.ten_kho_nhap ?? '',
      ghi_chu: item.ghi_chu ?? '',
    }),
    [],
  );

  const listExport = useExportData({
    data: sorted,
    isOpen: showExportList,
    mapFn: listExportMap,
    pagination: listPag,
    selectedIds: listSel,
    keyExtractor: (r) => r.id,
  });

  const ctExport = useExportData({
    data: sortedCt,
    isOpen: showExportCt,
    mapFn: ctExportMap,
    pagination: ctPag,
    selectedIds: ctSel,
    keyExtractor: (r) => r.id,
  });

  const listVisibleKeys = useMemo(
    () => listCols.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [listCols],
  );
  const ctVisibleKeys = useMemo(() => ctCols.filter((c) => c.visible).map((c) => c.id), [ctCols]);

  const hasListFilters = useMemo(() => {
    const cs = listFilters.columnSearch ?? {};
    return (
      Boolean(listSearch?.trim()) ||
      Boolean(listFilters.loai_phieu) ||
      Boolean(listFilters.kho_id) ||
      Boolean(listFilters.don_vi_cuu_tro_id) ||
      Boolean(listFilters.dot_cuu_tro_id) ||
      countColumnSearchActive(cs) > 0 ||
      Boolean(listSort.column)
    );
  }, [
    listSearch,
    listFilters.columnSearch,
    listFilters.loai_phieu,
    listFilters.kho_id,
    listFilters.don_vi_cuu_tro_id,
    listFilters.dot_cuu_tro_id,
    listSort.column,
  ]);

  const hasCtFilters = useMemo(() => {
    const cs = ctFilters.columnSearch ?? {};
    return (
      Boolean(ctSearch?.trim()) ||
      Boolean(ctFilters.loai_phieu) ||
      Boolean(ctFilters.kho_id) ||
      Boolean(ctFilters.hang_hoa_id) ||
      countColumnSearchActive(cs) > 0 ||
      Boolean(ctSort.column)
    );
  }, [
    ctSearch,
    ctFilters.columnSearch,
    ctFilters.loai_phieu,
    ctFilters.kho_id,
    ctFilters.hang_hoa_id,
    ctSort.column,
  ]);

  const listEmptyTitle = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('common.noResults')
        : txt('matTranNhapXuatKho.emptyTitleList'),
    [sorted.length, rows.length, hasListFilters],
  );

  const listEmptyDescription = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('matTranNhapXuatKho.emptyFilteredHint')
        : txt('matTranNhapXuatKho.emptyHintList'),
    [sorted.length, rows.length, hasListFilters],
  );

  const ctEmptyTitle = useMemo(
    () =>
      sortedCt.length === 0 && ctRows.length > 0 && hasCtFilters
        ? txt('common.noResults')
        : txt('matTranNhapXuatKho.emptyTitleCt'),
    [sortedCt.length, ctRows.length, hasCtFilters],
  );

  const ctEmptyDescription = useMemo(
    () =>
      sortedCt.length === 0 && ctRows.length > 0 && hasCtFilters
        ? txt('matTranNhapXuatKho.emptyFilteredHint')
        : txt('matTranNhapXuatKho.emptyHintCt'),
    [sortedCt.length, ctRows.length, hasCtFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    if (!rows.some((r) => r.id === viewingId)) {
      setViewingId(null);
    }
  }, [rows, viewingId]);

  const tabs = useMemo(
    () => [
      { id: TAB_LIST, label: txt('matTranNhapXuatKho.tabDanhSach') },
      { id: TAB_CT, label: txt('matTranNhapXuatKho.tabChiTiet') },
    ],
    [],
  );

  const tabSlot = useMemo(
    () => <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />,
    [activeTab, tabs, setActiveTab],
  );

  const handleEditFromList = useCallback(
    (item: NhapXuatKhoListRow) => {
      void queryClient
        .fetchQuery({
          queryKey: queryKeys.khoNhapXuatKho.detail(item.id),
          queryFn: () => getNhapXuatKhoById(item.id),
          ...transactionalCrudListQueryOptions,
        })
        .then((full) => {
          if (!full) {
            toast.error(txt('matTranNhapXuatKho.service.notFound'));
            return;
          }
          startTransition(() => {
            setFormOrigin('list');
            setEditing(full);
            setShowForm(true);
          });
        })
        .catch(() => {
          toast.error(txt('matTranNhapXuatKho.service.notFound'));
        });
    },
    [queryClient],
  );

  const handleEditFromDetail = (d: NhapXuatKhoDetail) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranNhapXuatKho.deleteTitle'),
      message: txt('matTranNhapXuatKho.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMany.mutate([id], {
          onSuccess: () => {
            if (viewingId === id) setViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('matTranNhapXuatKho.bulkDeleteTitle'),
      message: txt('matTranNhapXuatKho.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMany.mutate(ids, {
          onSuccess: () => {
            listClearSel();
            if (viewingId && ids.includes(viewingId)) setViewingId(null);
          },
        });
      },
    });
  };

  const handleExportList = () => {
    if (sorted.length === 0) {
      toast.warning(txt('matTranNhapXuatKho.noExportData'));
      return;
    }
    setShowExportList(true);
  };

  const handleExportCt = () => {
    if (sortedCt.length === 0) {
      toast.warning(txt('matTranNhapXuatKho.noExportData'));
      return;
    }
    setShowExportCt(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    const vid = viewingId;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && vid && wasEditing && wasEditing.id === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoNhapXuatKho.detail(vid) });
    }
    setFormOrigin('list');
  };

  const handleViewFromCtFlat = useCallback(
    (item: NhapXuatKhoCtFlatRow) => {
      setActiveTab(TAB_LIST);
      setViewingId(item.phieu_id);
    },
    [setActiveTab],
  );

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
        {activeTab === TAB_LIST ? (
          <>
            <NhapXuatKhoToolbar
              desktopStartSlot={tabSlot}
              onPageBack={() => navigate('/mat-tran-to-quoc')}
              onAdd={() => {
                startTransition(() => {
                  setFormOrigin('list');
                  setEditing(null);
                  setShowForm(true);
                });
              }}
              onExport={handleExportList}
              onDeleteMany={handleDeleteMany}
              items={rows}
            />
            <div className="flex-1 min-h-0">
              <NhapXuatKhoTable
                data={sorted}
                isLoading={listLoading}
                onEdit={handleEditFromList}
                onDelete={handleDelete}
                onView={(item) => setViewingId(item.id)}
                emptyTitle={listEmptyTitle}
                emptyDescription={listEmptyDescription}
              />
            </div>
          </>
        ) : (
          <>
            <NhapXuatKhoCtFlatToolbar
              desktopStartSlot={tabSlot}
              onPageBack={() => navigate('/mat-tran-to-quoc')}
              onExport={handleExportCt}
              items={ctRows}
            />
            <div className="flex-1 min-h-0">
              <NhapXuatKhoCtFlatTable
                data={sortedCt}
                isLoading={ctLoading}
                onView={handleViewFromCtFlat}
                emptyTitle={ctEmptyTitle}
                emptyDescription={ctEmptyDescription}
              />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <NhapXuatKhoForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <NhapXuatKhoDetailDrawer
              data={viewingData}
              onClose={() => setViewingId(null)}
              onEdit={handleEditFromDetail}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportList && (
          <ExportDialog
            open={showExportList}
            onClose={() => setShowExportList(false)}
            columns={listExportCols}
            data={listExport.exportData}
            paginatedData={listExport.paginatedData}
            selectedData={listExport.selectedData}
            fileName={txt('matTranNhapXuatKho.exportFileName')}
            visibleColumnKeys={listVisibleKeys}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportCt && (
          <ExportDialog
            open={showExportCt}
            onClose={() => setShowExportCt(false)}
            columns={ctExportCols}
            data={ctExport.exportData}
            paginatedData={ctExport.paginatedData}
            selectedData={ctExport.selectedData}
            fileName={txt('matTranNhapXuatKho.exportFileNameCt')}
            visibleColumnKeys={ctVisibleKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NhapXuatKhoPage;
