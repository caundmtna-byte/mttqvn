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
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
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
import TabGroup from '@/components/ui/TabGroup';
import ExportDialog from '@/components/shared/ExportDialog';
import {
  useChuongTrinhNamList,
  useChuongTrinhNamDetail,
  useDeleteChuongTrinhNamMany,
} from './hooks/use-chuong-trinh-nam';
import {
  useChuongTrinhNamViewer,
  canViewChuongTrinhNamRow,
} from './hooks/use-chuong-trinh-nam-viewer';
import { getChuongTrinhNamById } from './services/chuong-trinh-nam-service';
import { useChuongTrinhNamStore } from './store/useChuongTrinhNamStore';
import type { ChuongTrinhNam, ChuongTrinhNamListRow } from './core/types';
import { CHUONG_TRINH_NAM_SEARCHABLE_KEYS } from './utils/search-keys';
import { chuongTrinhNamMatchesColumnSearch } from './utils/column-search';
import { CHUONG_TRINH_NAM_TRANG_THAI } from './core/constants';
import {
  CHUONG_TRINH_NAM_TIEN_DO_FILTER_IDS,
  formatChuongTrinhNamTienDo,
  getChuongTrinhNamTienDoFilterId,
  chuongTrinhNamTienDoSortKey,
} from './utils/ngay-ket-thuc-tien-do';
import ChuongTrinhNamToolbar from './components/chuong-trinh-nam-toolbar';
import ChuongTrinhNamTable from './components/chuong-trinh-nam-table';
import ChuongTrinhNamStatsPanel from './components/chuong-trinh-nam-stats-panel';

const PHONG_BAN_NONE = '__none__';

function yearFromNgayBatDau(d: string | null | undefined): string | null {
  if (!d?.trim()) return null;
  const y = d.trim().slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

const ChuongTrinhNamForm = lazy(() => import('./components/chuong-trinh-nam-form'));
const ChuongTrinhNamDetail = lazy(() => import('./components/chuong-trinh-nam-detail'));

type FormOrigin = 'list' | 'detail';

type MainTab = 'list' | 'stats';

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

const ChuongTrinhNamPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'annualPrograms');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('chuongTrinhNam.noViewPermission'));
    navigate('/quan-ly-giao-viec', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChuongTrinhNam | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('list');

  const {
    searchTerm,
    filters,
    sort,
    resetState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
  } = useChuongTrinhNamStore();

  const { data: rows = [], isLoading } = useChuongTrinhNamList({ enabled: canView });
  const { data: viewingData } = useChuongTrinhNamDetail(viewingId);
  const deleteMutation = useDeleteChuongTrinhNamMany();
  const chuongTrinhViewer = useChuongTrinhNamViewer();

  const scopeRows = useMemo(() => {
    if (chuongTrinhViewer.viewAll) return rows;
    return rows.filter((r) => canViewChuongTrinhNamRow(chuongTrinhViewer, r));
  }, [rows, chuongTrinhViewer]);

  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!canViewChuongTrinhNamRow(chuongTrinhViewer, viewingData)) {
      toast.error(txt('chuongTrinhNam.service.rowViewDenied'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, chuongTrinhViewer]);

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  /** State Zustand cũ (HMR / bản lưu) có thể thiếu `tien_do` sau khi thêm field. */
  useEffect(() => {
    const { filters: f, setFilter } = useChuongTrinhNamStore.getState();
    if (!Array.isArray(f.tien_do)) {
      setFilter('tien_do', []);
    }
  }, []);

  const filterFn = useCallback(
    (item: ChuongTrinhNamListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        CHUONG_TRINH_NAM_SEARCHABLE_KEYS,
      );
      if (f.trang_thai?.length && !f.trang_thai.includes(item.trang_thai)) return false;
      if (f.id_phong_ban?.length) {
        const pb = item.id_phong_ban?.trim() ? String(item.id_phong_ban) : PHONG_BAN_NONE;
        if (!f.id_phong_ban.includes(pb)) return false;
      }
      if (f.nam_bat_dau?.length) {
        const y = yearFromNgayBatDau(item.ngay_bat_dau);
        if (!y || !f.nam_bat_dau.includes(y)) return false;
      }
      if (f.tien_do?.length) {
        const td = getChuongTrinhNamTienDoFilterId(item);
        if (!f.tien_do.includes(td)) return false;
      }
      if (!chuongTrinhNamMatchesColumnSearch(item, f)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(scopeRows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      if (sort.column === 'tien_do') {
        const dir = sort.direction === 'desc' ? -1 : 1;
        list.sort((a, b) => (chuongTrinhNamTienDoSortKey(a) - chuongTrinhNamTienDoSortKey(b)) * dir);
      } else {
        list.sort((a, b) => {
          const key = sort.column as keyof ChuongTrinhNamListRow;
          const aVal = a[key];
          const bVal = b[key];
          const cmp =
            typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
              ? aVal - bVal
              : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
          return sort.direction === 'desc' ? -cmp : cmp;
        });
      }
    } else {
      list.sort((a, b) => {
        const da = a.ngay_bat_dau ?? '';
        const db = b.ngay_bat_dau ?? '';
        if (da !== db) return db.localeCompare(da, getLanguage());
        return (b.tg_cap_nhat || '').localeCompare(a.tg_cap_nhat || '', getLanguage());
      });
    }
    return list;
  }, [filtered, sort]);

  const trangThaiChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const v of CHUONG_TRINH_NAM_TRANG_THAI) {
      map.set(v, { label: v, count: 0 });
    }
    for (const r of scopeRows) {
      const cur = map.get(r.trang_thai);
      if (cur) cur.count += 1;
    }
    return CHUONG_TRINH_NAM_TRANG_THAI.map((value) => ({
      value,
      label: value,
      count: map.get(value)?.count ?? 0,
    }));
  }, [scopeRows]);

  const phongBanChipOptions = useMemo(() => {
    const byId = new Map<string, { label: string; count: number }>();
    let noneCount = 0;
    for (const r of scopeRows) {
      const id = r.id_phong_ban?.trim();
      if (!id) {
        noneCount += 1;
        continue;
      }
      const label = (r.ten_phong_ban ?? '').trim() || id;
      const cur = byId.get(id);
      if (cur) cur.count += 1;
      else byId.set(id, { label, count: 1 });
    }
    const opts = [...byId.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    if (noneCount > 0) {
      opts.unshift({
        value: PHONG_BAN_NONE,
        label: txt('chuongTrinhNam.filter.noPhongBan'),
        count: noneCount,
      });
    }
    return opts;
  }, [scopeRows]);

  const namBatDauChipOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of scopeRows) {
      const y = yearFromNgayBatDau(r.ngay_bat_dau);
      if (!y) continue;
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.value.localeCompare(a.value, getLanguage()));
  }, [scopeRows]);

  const tienDoChipOptions = useMemo(() => {
    const labelOf = (id: (typeof CHUONG_TRINH_NAM_TIEN_DO_FILTER_IDS)[number]) => {
      switch (id) {
        case 'qua_han':
          return txt('chuongTrinhNam.filter.tienDoQuaHan');
        case 'sap_den_han':
          return txt('chuongTrinhNam.filter.tienDoSapDenHan');
        case 'con_han':
          return txt('chuongTrinhNam.filter.tienDoConHan');
        case 'ket_thuc':
          return txt('chuongTrinhNam.filter.tienDoKetThuc');
        default:
          return id;
      }
    };
    const counts = new Map<string, number>();
    for (const id of CHUONG_TRINH_NAM_TIEN_DO_FILTER_IDS) {
      counts.set(id, 0);
    }
    for (const r of scopeRows) {
      const k = getChuongTrinhNamTienDoFilterId(r);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return CHUONG_TRINH_NAM_TIEN_DO_FILTER_IDS.map((value) => ({
      value,
      label: labelOf(value),
      count: counts.get(value) ?? 0,
    }));
  }, [scopeRows]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_chuong_trinh', label: txt('chuongTrinhNam.store.tenCol') },
      { key: 'ngay_bat_dau', label: txt('chuongTrinhNam.store.ngayBatDauCol') },
      { key: 'ngay_ket_thuc', label: txt('chuongTrinhNam.store.ngayKetThucCol') },
      { key: 'tien_do', label: txt('chuongTrinhNam.store.tienDoCol') },
      { key: 'trang_thai', label: txt('chuongTrinhNam.store.trangThaiCol') },
      { key: 'ten_phong_ban', label: txt('chuongTrinhNam.store.phongBanCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('chuongTrinhNam.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ChuongTrinhNamListRow) => ({
      ten_chuong_trinh: item.ten_chuong_trinh,
      ngay_bat_dau: item.ngay_bat_dau ?? '',
      ngay_ket_thuc: item.ngay_ket_thuc ?? '',
      tien_do: formatChuongTrinhNamTienDo(item),
      trang_thai: item.trang_thai,
      ten_phong_ban: item.ten_phong_ban ?? '',
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

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible).map((c) => c.id),
    [columns],
  );

  const handleEditFromList = async (item: ChuongTrinhNamListRow) => {
    try {
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.chuongTrinhNam.detail(item.id),
        queryFn: () => getChuongTrinhNamById(item.id),
        ...defaultServerQueryOptions,
      });
      if (!full) {
        toast.error(txt('chuongTrinhNam.service.notFound'));
        return;
      }
      if (!canViewChuongTrinhNamRow(chuongTrinhViewer, full)) {
        toast.error(txt('chuongTrinhNam.service.rowViewDenied'));
        return;
      }
      startTransition(() => {
        setFormOrigin('list');
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('chuongTrinhNam.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: ChuongTrinhNam) => {
    if (!canViewChuongTrinhNamRow(chuongTrinhViewer, d)) {
      toast.error(txt('chuongTrinhNam.service.rowViewDenied'));
      return;
    }
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('chuongTrinhNam.deleteTitle'),
      message: txt('chuongTrinhNam.deleteMessage'),
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
      title: txt('chuongTrinhNam.bulkDeleteTitle'),
      message: txt('chuongTrinhNam.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('chuongTrinhNam.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const tabs = useMemo(
    () => [
      { id: 'list' as const, label: txt('chuongTrinhNam.tabList') },
      { id: 'stats' as const, label: txt('chuongTrinhNam.tabStats') },
    ],
    [],
  );

  const tabsSlot = useMemo(
    () => (
      <TabGroup
        tabs={tabs}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as MainTab)}
        className="shrink-0"
      />
    ),
    [tabs, mainTab],
  );

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && viewingId && wasEditing && wasEditing.id === viewingId) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chuongTrinhNam.detail(viewingId) });
    }
    setFormOrigin('list');
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

  const showNoEmployeeBanner = !nhanVienId;

  return (
    <div className="flex flex-col h-page relative">
      {showNoEmployeeBanner ? (
        <div
          role="status"
          className="mb-2 rounded-lg border border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90"
        >
          {txt('chuongTrinhNam.noEmployeeBanner')}
        </div>
      ) : null}
      {mainTab === 'stats' ? (
        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          <ChuongTrinhNamStatsPanel
            tabsSlot={tabsSlot}
            rows={scopeRows}
            isLoading={isLoading}
            onOpenDetail={(id) => setViewingId(id)}
          />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
          <ChuongTrinhNamToolbar
            onPageBack={() => navigate('/quan-ly-giao-viec')}
            tabsSlot={tabsSlot}
            trangThaiOptions={trangThaiChipOptions}
            phongBanOptions={phongBanChipOptions}
            namBatDauOptions={namBatDauChipOptions}
            tienDoOptions={tienDoChipOptions}
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
            <ChuongTrinhNamTable
              data={sorted}
              isLoading={isLoading}
              onEdit={handleEditFromList}
              onDelete={handleDelete}
              onView={(item) => setViewingId(item.id)}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ChuongTrinhNamForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId &&
          viewingData &&
          !showForm &&
          canViewChuongTrinhNamRow(chuongTrinhViewer, viewingData) && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ChuongTrinhNamDetail
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
            fileName={txt('chuongTrinhNam.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChuongTrinhNamPage;
