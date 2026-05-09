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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
import { txt } from '@/lib/text';
import { getErrorMessage, getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import TabGroup from '@/components/ui/TabGroup';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import { ListFilter, Building2 } from 'lucide-react';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import ExportDialog from '@/components/shared/ExportDialog';
import {
  useMttqLopTapHuanList,
  useMttqLopTapHuanChiTietFlatList,
  useDeleteMttqLopTapHuanMany,
  useMttqLopTapHuanDetail,
  useUpdateMttqLopTapHuan,
} from './hooks/use-mttq-tap-huan';
import type { MttqTapHuanFormValues } from './core/schema';
import { useMttqLopTapHuanStore } from './store/useMttqLopTapHuanStore';
import { useMttqTapHuanChiTietListStore } from './store/useMttqTapHuanChiTietListStore';
import type { MttqLopTapHuan, MttqLopTapHuanListRow, MttqTapHuanChiTietFlatRow } from './core/types';
import { MTTQ_TAP_HUAN_THUOC_DIEN } from './core/constants';
import { MTTQ_TAP_HUAN_SEARCHABLE_KEYS, MTTQ_TAP_HUAN_CHI_TIET_FLAT_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  mttqTapHuanMatchesColumnSearch,
  mttqTapHuanChiTietFlatMatchesColumnSearch,
} from './utils/column-search';
import { getMttqLopTapHuanById } from './services/mttq-tap-huan-service';
import { canViewLopTapHuanRow, useMttqLopTapHuanViewer } from './hooks/use-mttq-tap-huan-viewer';
import MttqLopTapHuanToolbar from './components/mttq-tap-huan-toolbar';
import MttqLopTapHuanTable from './components/mttq-tap-huan-table';
import MttqTapHuanChiTietToolbar from './components/mttq-tap-huan-chi-tiet-toolbar';
import MttqTapHuanChiTietTable from './components/mttq-tap-huan-chi-tiet-table';
import MttqTapHuanThongKePanel from './components/mttq-tap-huan-thong-ke-panel';

const MttqLopTapHuanForm = lazy(() => import('./components/mttq-tap-huan-form'));
const MttqLopTapHuanDetail = lazy(() => import('./components/mttq-tap-huan-detail'));

type TapHuanMainTab = 'lop' | 'chi_tiet' | 'thong_ke';

function lopTapHuanToFormValues(d: MttqLopTapHuan): MttqTapHuanFormValues {
  return {
    ten_lop_tap_huan: d.ten_lop_tap_huan,
    nam_tap_huan: d.nam_tap_huan,
    cap_tap_huan: d.cap_tap_huan,
    don_vi_id: d.don_vi_id != null && String(d.don_vi_id).trim() !== '' ? String(d.don_vi_id) : '',
    ghi_chu: d.ghi_chu ?? undefined,
    chi_tiet: d.chi_tiet.map((c) => ({
      id: c.id,
      can_bo_id: c.can_bo_id,
      thuoc_dien: c.thuoc_dien,
    })),
  };
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranTrainingList');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranTapHuan.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [mainTab, setMainTab] = useState<TapHuanMainTab>('lop');
  const [thongKeThuocDien, setThongKeThuocDien] = useState<string[]>([]);
  const [thongKeDonViLop, setThongKeDonViLop] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqLopTapHuan | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    filters,
    sort,
    resetState: resetLopListState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
  } = useMttqLopTapHuanStore();

  const {
    searchTerm: chiSearchTerm,
    filters: chiFilters,
    sort: chiSort,
    resetState: resetChiTietListState,
  } = useMttqTapHuanChiTietListStore();

  const { data: rows = [], isLoading } = useMttqLopTapHuanList({ enabled: canView });
  const { data: chiTietFlatRows = [], isLoading: isLoadingChiTietFlat } = useMttqLopTapHuanChiTietFlatList({
    enabled: canView && (mainTab === 'chi_tiet' || mainTab === 'thong_ke'),
  });
  const { data: viewingData } = useMttqLopTapHuanDetail(viewingId);
  const deleteMutation = useDeleteMttqLopTapHuanMany();
  const updateMutation = useUpdateMttqLopTapHuan();

  const viewer = useMttqLopTapHuanViewer();

  /** Lọc theo viewer trước khi mọi tính toán hiển thị (chip / search / export / sort). */
  const viewableRows = useMemo(
    () => rows.filter((r) => canViewLopTapHuanRow(viewer, r)),
    [rows, viewer],
  );

  const viewableChiTietFlatRows = useMemo(
    () => chiTietFlatRows.filter((r) => canViewLopTapHuanRow(viewer, r)),
    [chiTietFlatRows, viewer],
  );

  useEffect(() => {
    if (mainTab === 'lop') resetChiTietListState();
    else if (mainTab === 'chi_tiet') resetLopListState();
    else if (mainTab === 'thong_ke') resetChiTietListState();
  }, [mainTab, resetLopListState, resetChiTietListState]);

  useEffect(() => {
    if (mainTab !== 'thong_ke') return;
    clearSelection();
    setSearchTerm('');
    setViewingId(null);
    setShowExport(false);
    setShowForm(false);
    setEditing(null);
  }, [mainTab, clearSelection, setSearchTerm]);

  useEffect(() => {
    if (mainTab === 'thong_ke') return;
    setThongKeThuocDien([]);
    setThongKeDonViLop([]);
  }, [mainTab]);

  useEffect(() => {
    return () => {
      resetLopListState();
      resetChiTietListState();
    };
  }, [resetLopListState, resetChiTietListState]);

  /** Drawer chi tiết: nếu data về mà viewer không đủ quyền (vd. đoán id), tự đóng + báo. */
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!canViewLopTapHuanRow(viewer, viewingData)) {
      toast.error(txt('matTranTapHuan.noViewPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  /** Mở drawer chi tiết khi đi từ liên kết `?open=<id_lop_tap_huan>` (vd. từ detail cán bộ). */
  useEffect(() => {
    if (!canView || mainTab !== 'lop') return;
    const raw = searchParams.get('open')?.trim();
    if (!raw) return;
    startTransition(() => setViewingId(raw));
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [canView, mainTab, searchParams, setSearchParams]);

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

  const filterFnChiTietFlat = useCallback(
    (item: MttqTapHuanChiTietFlatRow, term: string, f: typeof chiFilters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_TAP_HUAN_CHI_TIET_FLAT_SEARCHABLE_KEYS,
      );
      if (f.cap_tap_huan?.length && !f.cap_tap_huan.includes(item.cap_tap_huan)) return false;
      if (f.nam_tap_huan?.length && !f.nam_tap_huan.includes(String(item.nam_tap_huan))) return false;
      if (!mttqTapHuanChiTietFlatMatchesColumnSearch(item, f.columnSearch)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const filteredChiTietFlat = useListWithFilter(
    viewableChiTietFlatRows,
    chiSearchTerm,
    chiFilters,
    filterFnChiTietFlat,
  );

  const filteredLopIdSet = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);

  const flatUnderFilteredLop = useMemo(
    () => viewableChiTietFlatRows.filter((f) => filteredLopIdSet.has(f.id_lop_tap_huan)),
    [viewableChiTietFlatRows, filteredLopIdSet],
  );

  const flatAfterThongKeChips = useMemo(() => {
    return flatUnderFilteredLop.filter((f) => {
      if (thongKeThuocDien.length > 0 && !thongKeThuocDien.includes(f.thuoc_dien)) return false;
      if (thongKeDonViLop.length > 0) {
        const key = (f.ten_don_vi_lop ?? '').trim() || '__empty__';
        if (!thongKeDonViLop.includes(key)) return false;
      }
      return true;
    });
  }, [flatUnderFilteredLop, thongKeThuocDien, thongKeDonViLop]);

  const hasThongKeChipFilter = thongKeThuocDien.length > 0 || thongKeDonViLop.length > 0;

  const rowsForStats = useMemo(() => {
    if (!hasThongKeChipFilter) return filtered;
    const ids = new Set(flatAfterThongKeChips.map((f) => f.id_lop_tap_huan));
    return filtered.filter((r) => ids.has(r.id));
  }, [filtered, flatAfterThongKeChips, hasThongKeChipFilter]);

  const flatForStatsPanel = useMemo(() => {
    if (!hasThongKeChipFilter) return flatUnderFilteredLop;
    return flatAfterThongKeChips;
  }, [hasThongKeChipFilter, flatUnderFilteredLop, flatAfterThongKeChips]);

  const thongKeThuocDienChipOptions = useMemo(
    () =>
      MTTQ_TAP_HUAN_THUOC_DIEN.map((td) => ({
        value: td,
        label: td,
        count: flatUnderFilteredLop.filter((f) => f.thuoc_dien === td).length,
      })),
    [flatUnderFilteredLop],
  );

  const thongKeDonViLopChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const f of flatUnderFilteredLop) {
      const raw = (f.ten_don_vi_lop ?? '').trim();
      const value = raw || '__empty__';
      const label = raw || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [flatUnderFilteredLop]);

  const thongKeExtraFiltersSlot = useMemo(
    () => (
      <>
        <FilterChipMultiSelect
          options={thongKeThuocDienChipOptions}
          value={thongKeThuocDien}
          onChange={setThongKeThuocDien}
          placeholder={txt('matTranTapHuan.stats.thuocDienChip')}
          icon={ListFilter}
          className="shrink-0 w-full min-w-0 sm:w-[min(200px,30vw)] sm:max-w-[260px]"
        />
        <FilterChipMultiSelect
          options={thongKeDonViLopChipOptions}
          value={thongKeDonViLop}
          onChange={setThongKeDonViLop}
          placeholder={txt('matTranTapHuan.stats.donViLopChip')}
          icon={Building2}
          className="shrink-0 w-full min-w-0 sm:w-[min(220px,32vw)] sm:max-w-[280px]"
        />
      </>
    ),
    [thongKeThuocDien, thongKeDonViLop, thongKeThuocDienChipOptions, thongKeDonViLopChipOptions],
  );

  const exportSourceRows = mainTab === 'thong_ke' ? rowsForStats : filtered;

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

  const sortedChiTietFlat = useMemo(() => {
    const list = [...filteredChiTietFlat];
    if (chiSort.column && chiSort.direction) {
      list.sort((a, b) => {
        const key = chiSort.column as keyof MttqTapHuanChiTietFlatRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return chiSort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => {
        if (a.nam_tap_huan !== b.nam_tap_huan) return b.nam_tap_huan - a.nam_tap_huan;
        return (b.tg_cap_nhat_lop || '').localeCompare(a.tg_cap_nhat_lop || '', getLanguage());
      });
    }
    return list;
  }, [filteredChiTietFlat, chiSort]);

  const capChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const value = r.cap_tap_huan;
      const label = value || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableRows]);

  const capChipOptionsChiTiet = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableChiTietFlatRows) {
      const value = r.cap_tap_huan;
      const label = value || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableChiTietFlatRows]);

  const namChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const value = String(r.nam_tap_huan);
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label: value, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [viewableRows]);

  const namChipOptionsChiTiet = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableChiTietFlatRows) {
      const value = String(r.nam_tap_huan);
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label: value, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [viewableChiTietFlatRows]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_lop_tap_huan', label: txt('matTranTapHuan.store.tenLopCol') },
      { key: 'nam_tap_huan', label: txt('matTranTapHuan.store.namCol') },
      { key: 'cap_tap_huan', label: txt('matTranTapHuan.store.capCol') },
      { key: 'ten_don_vi', label: txt('matTranTapHuan.store.donViCol') },
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
      ten_don_vi: item.cap_tap_huan === 'Cấp xã' ? (item.ten_don_vi ?? '') : '',
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
    data: exportSourceRows,
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
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.mttqLopTapHuan.detail(item.id),
        queryFn: () => getMttqLopTapHuanById(item.id),
        ...defaultServerQueryOptions,
      });
      if (!full) {
        toast.error(txt('matTranTapHuan.service.notFound'));
        return;
      }
      if (!canViewLopTapHuanRow(viewer, full)) {
        toast.error(txt('matTranTapHuan.noViewPermission'));
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

  const handleEditFromChiTietFlatRow = (row: MttqTapHuanChiTietFlatRow) => {
    void handleEditFromList({ id: row.id_lop_tap_huan } as MttqLopTapHuanListRow);
  };

  const handleDeleteChiTietLine = (row: MttqTapHuanChiTietFlatRow) => {
    confirm({
      title: txt('matTranTapHuan.chiTietDrawer.deleteLineTitle'),
      message: txt('matTranTapHuan.chiTietDrawer.deleteLineMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        try {
          const full = await queryClient.fetchQuery({
            queryKey: queryKeys.mttqLopTapHuan.detail(row.id_lop_tap_huan),
            queryFn: () => getMttqLopTapHuanById(row.id_lop_tap_huan),
            ...defaultServerQueryOptions,
          });
          if (!full) {
            toast.error(txt('matTranTapHuan.service.notFound'));
            return;
          }
          if (full.chi_tiet.length <= 1) {
            toast.warning(txt('matTranTapHuan.chiTietDrawer.cannotDeleteLast'));
            return;
          }
          const nextChi = full.chi_tiet.filter((c) => c.id !== row.id);
          await updateMutation.mutateAsync({
            id: row.id_lop_tap_huan,
            data: lopTapHuanToFormValues({ ...full, chi_tiet: nextChi }),
          });
        } catch (e: unknown) {
          toast.error(getErrorMessage(e));
        }
      },
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
    if (exportSourceRows.length === 0) {
      toast.warning(txt('matTranTapHuan.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const tabsSlot = useMemo(
    () => (
      <TabGroup
        tabs={[
          { id: 'lop', label: txt('matTranTapHuan.tabs.lop') },
          { id: 'chi_tiet', label: txt('matTranTapHuan.tabs.chiTietList') },
          { id: 'thong_ke', label: txt('matTranTapHuan.tabs.thongKe') },
        ]}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as TapHuanMainTab)}
        className="shrink-0"
      />
    ),
    [mainTab],
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
        {mainTab === 'lop' ? (
          <>
            <MttqLopTapHuanToolbar
              desktopStartSlot={tabsSlot}
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
          </>
        ) : mainTab === 'chi_tiet' ? (
          <>
            <MttqTapHuanChiTietToolbar
              desktopStartSlot={tabsSlot}
              onPageBack={() => navigate('/mat-tran-to-quoc')}
              capOptions={capChipOptionsChiTiet}
              namOptions={namChipOptionsChiTiet}
            />
            <div className="flex-1 min-h-0">
              <MttqTapHuanChiTietTable
                data={sortedChiTietFlat}
                isLoading={isLoadingChiTietFlat}
                capHeaderOptions={capChipOptionsChiTiet}
                namHeaderOptions={namChipOptionsChiTiet}
                onViewLop={(idLop) => setViewingId(idLop)}
                onEdit={handleEditFromChiTietFlatRow}
                onDelete={handleDeleteChiTietLine}
              />
            </div>
          </>
        ) : (
          <>
            <MttqLopTapHuanToolbar
              desktopStartSlot={tabsSlot}
              hideListControls
              showExportWhenListHidden
              extraFiltersSlot={thongKeExtraFiltersSlot}
              extraActiveFilterCount={(thongKeThuocDien.length ? 1 : 0) + (thongKeDonViLop.length ? 1 : 0)}
              onClearExtraFilters={() => {
                setThongKeThuocDien([]);
                setThongKeDonViLop([]);
              }}
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
            <div className="flex-1 min-h-0 flex flex-col">
              <MttqTapHuanThongKePanel
                rows={rowsForStats}
                flatRows={flatForStatsPanel}
                viewer={viewer}
                isLoading={isLoading}
                isLoadingFlat={isLoadingChiTietFlat}
              />
            </div>
          </>
        )}
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
