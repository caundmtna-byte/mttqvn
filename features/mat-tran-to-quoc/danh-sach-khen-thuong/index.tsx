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
  useMttqKhenThuongList,
  useDeleteMttqKhenThuongMany,
  useMttqKhenThuongDetail,
} from './hooks/use-mttq-khen-thuong';
import { canViewKhenThuongRow, useMttqKhenThuongViewer } from './hooks/use-mttq-khen-thuong-viewer';
import { useMttqKhenThuongStore } from './store/useMttqKhenThuongStore';
import type { MttqKhenThuong, MttqKhenThuongListRow } from './core/types';
import { MTTQ_KHEN_THUONG_SEARCHABLE_KEYS } from './utils/search-keys';
import { mttqKhenThuongMatchesColumnSearch } from './utils/column-search';
import { getMttqKhenThuongById } from './services/mttq-khen-thuong-service';
import MttqKhenThuongToolbar from './components/mttq-khen-thuong-toolbar';
import MttqKhenThuongTable from './components/mttq-khen-thuong-table';

const MttqKhenThuongForm = lazy(() => import('./components/mttq-khen-thuong-form'));
const MttqKhenThuongDetail = lazy(() => import('./components/mttq-khen-thuong-detail'));

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

const DanhSachKhenThuongPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranRewardList');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranKhenThuong.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqKhenThuong | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useMttqKhenThuongStore();

  const { data: rows = [], isLoading } = useMttqKhenThuongList({ enabled: canView });
  const { data: viewingData } = useMttqKhenThuongDetail(viewingId);
  const deleteMutation = useDeleteMttqKhenThuongMany();

  const viewer = useMttqKhenThuongViewer();

  /** Lọc theo viewer trước khi mọi tính toán hiển thị (chip / search / export / sort). */
  const viewableRows = useMemo(
    () => rows.filter((r) => canViewKhenThuongRow(viewer, r)),
    [rows, viewer],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  /** Mở drawer chi tiết khi đi từ liên kết `?open=<id_khen_thuong>` (vd. từ detail cán bộ). */
  useEffect(() => {
    const raw = searchParams.get('open')?.trim();
    if (!raw) return;
    if (viewableRows.length === 0) return;
    const exists = viewableRows.some((r) => r.id === raw);
    if (exists) setViewingId(raw);
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [viewableRows, searchParams, setSearchParams]);

  /** Drawer chi tiết: nếu data về mà viewer không đủ quyền (vd. đoán id), tự đóng + báo. */
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!canViewKhenThuongRow(viewer, viewingData)) {
      toast.error(txt('matTranKhenThuong.noViewPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  const filterFn = useCallback(
    (item: MttqKhenThuongListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_KHEN_THUONG_SEARCHABLE_KEYS,
      );
      if (f.trang_thai?.length && !f.trang_thai.includes(item.trang_thai)) return false;
      if (!mttqKhenThuongMatchesColumnSearch(item, f.columnSearch)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqKhenThuongListRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => (b.ngay_khen_thuong || '').localeCompare(a.ngay_khen_thuong || '', getLanguage()));
    }
    return list;
  }, [filtered, sort]);

  const trangThaiChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const value = r.trang_thai;
      const label = value || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableRows]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'so_qd', label: txt('matTranKhenThuong.store.soQdCol') },
      { key: 'ngay_khen_thuong', label: txt('matTranKhenThuong.store.ngayCol') },
      { key: 'don_vi_de_xuat', label: txt('matTranKhenThuong.store.donViCol') },
      { key: 'trang_thai', label: txt('matTranKhenThuong.store.trangThaiCol') },
      { key: 'so_dong', label: txt('matTranKhenThuong.store.soDongCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('matTranKhenThuong.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqKhenThuongListRow) => ({
      so_qd: item.so_qd,
      ngay_khen_thuong: item.ngay_khen_thuong ?? '',
      don_vi_de_xuat: item.don_vi_de_xuat ?? '',
      trang_thai: item.trang_thai,
      so_dong: String(item.so_dong),
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? '',
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

  const handleEditFromList = async (item: MttqKhenThuongListRow) => {
    try {
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.mttqKhenThuong.detail(item.id),
        queryFn: () => getMttqKhenThuongById(item.id),
        ...defaultServerQueryOptions,
      });
      if (!full) {
        toast.error(txt('matTranKhenThuong.service.notFound'));
        return;
      }
      startTransition(() => {
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('matTranKhenThuong.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: MttqKhenThuong) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranKhenThuong.deleteTitle'),
      message: txt('matTranKhenThuong.deleteMessage'),
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
      title: txt('matTranKhenThuong.bulkDeleteTitle'),
      message: txt('matTranKhenThuong.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('matTranKhenThuong.noExportData'));
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
          {txt('matTranKhenThuong.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqKhenThuongToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          trangThaiOptions={trangThaiChipOptions}
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
          <MttqKhenThuongTable
            data={sorted}
            isLoading={isLoading}
            trangThaiHeaderOptions={trangThaiChipOptions}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => setViewingId(item.id)}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKhenThuongForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKhenThuongDetail
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
            fileName={txt('matTranKhenThuong.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DanhSachKhenThuongPage;
