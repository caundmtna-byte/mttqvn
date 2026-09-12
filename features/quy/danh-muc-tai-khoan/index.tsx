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
import { useModuleAccess } from '@/hooks/use-module-access';
import { formatCurrency } from '@/lib/utils';
import ExportDialog from '@/components/shared/ExportDialog';
import { QUY_FILE_SUFFIX, type QuyKey } from '../core/constants';
import {
  useQuyDanhMucTaiKhoanList,
  useQuyDanhMucTaiKhoanDetail,
  useDeleteQuyDanhMucTaiKhoanMany,
  useQuySoDuTheoTaiKhoan,
} from './hooks/use-quy-danh-muc-tai-khoan';
import { useQuyDanhMucTaiKhoanStore } from './store/useQuyDanhMucTaiKhoanStore';
import type { QuyDanhMucTaiKhoanListRow } from './core/types';
import { QUY_TAI_KHOAN_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  countQuyTaiKhoanColumnSearchActive,
  hinhThucTaiKhoan,
  quyTaiKhoanMatchesColumnSearch,
} from './utils/column-search';
import { sortQuyTaiKhoanList } from './utils/sort';
import QuyDanhMucTaiKhoanToolbar from './components/quy-danh-muc-tai-khoan-toolbar';
import QuyDanhMucTaiKhoanTable from './components/quy-danh-muc-tai-khoan-table';

const QuyDanhMucTaiKhoanForm = lazy(() => import('./components/quy-danh-muc-tai-khoan-form'));
const QuyDanhMucTaiKhoanDetailDrawer = lazy(
  () => import('./components/quy-danh-muc-tai-khoan-detail'),
);

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

export interface QuyDanhMucTaiKhoanPageProps {
  /** Quỹ đang xem — do route truyền vào, không lấy từ dữ liệu. */
  quy: QuyKey;
}

/**
 * Danh mục tài khoản / nguồn tiền của quỹ.
 *
 * **Phân trang phía client** — đúng lằn ranh trong CLAUDE.md: đây là bảng DANH
 * MỤC, có trần tự nhiên (mỗi quỹ vài tài khoản ngân hàng cộng một quỹ tiền
 * mặt). Phân trang server cho bảng cỡ này là phức tạp hoá vĩnh viễn.
 */
const QuyDanhMucTaiKhoanPage: React.FC<QuyDanhMucTaiKhoanPageProps> = ({ quy }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const { canView, waiting, ready } = useModuleAccess('quyDanhMucTaiKhoan');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (waiting || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('quy.danhMucTaiKhoan.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [waiting, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuyDanhMucTaiKhoanListRow | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
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
  } = useQuyDanhMucTaiKhoanStore();

  const { data: rows = [], isLoading, isError, refetch } = useQuyDanhMucTaiKhoanList(quy, {
    enabled: ready,
  });
  const { data: soDuRows = [] } = useQuySoDuTheoTaiKhoan(quy, { enabled: ready });
  const { data: viewingData } = useQuyDanhMucTaiKhoanDetail(quy, viewingId, {
    enabled: ready && Boolean(viewingId?.trim()),
  });
  const deleteMutation = useDeleteQuyDanhMucTaiKhoanMany(quy);

  const soDuMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of soDuRows) m.set(r.tai_khoan_id, r.so_du);
    return m;
  }, [soDuRows]);

  // Bộ lọc/phân trang là state dùng chung cho cả hai quỹ ⇒ dọn khi rời trang.
  // Việc chuyển giữa hai quỹ do `key={quy}` ở App.tsx lo (gắn lại trang từ đầu).
  useEffect(() => () => resetState(), [resetState]);

  const filterFn = useCallback(
    (item: QuyDanhMucTaiKhoanListRow, term: string, f: typeof filters) => {
      if (!quyTaiKhoanMatchesColumnSearch(item, f.columnSearch)) return false;
      if (f.trang_thai.length > 0 && !f.trang_thai.includes(item.trang_thai)) return false;
      if (f.hinh_thuc.length > 0 && !f.hinh_thuc.includes(hinhThucTaiKhoan(item))) return false;
      return matchesSearchTerm(item as unknown as Record<string, unknown>, term, [
        ...QUY_TAI_KHOAN_SEARCHABLE_KEYS,
      ]);
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortQuyTaiKhoanList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'thu_tu', label: txt('quy.danhMucTaiKhoan.store.thuTuCol') },
      { key: 'ten', label: txt('quy.danhMucTaiKhoan.store.tenCol') },
      { key: 'so_tai_khoan', label: txt('quy.danhMucTaiKhoan.store.soTaiKhoanCol') },
      { key: 'ngan_hang', label: txt('quy.danhMucTaiKhoan.store.nganHangCol') },
      { key: 'so_du', label: txt('quy.danhMucTaiKhoan.store.soDuCol') },
      { key: 'trang_thai', label: txt('quy.danhMucTaiKhoan.store.trangThaiCol') },
      { key: 'mo_ta', label: txt('quy.danhMucTaiKhoan.store.moTaCol') },
      { key: 'tg_tao', label: txt('quy.danhMucTaiKhoan.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('quy.danhMucTaiKhoan.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: QuyDanhMucTaiKhoanListRow) => ({
      thu_tu: item.thu_tu,
      ten: item.ten,
      so_tai_khoan: item.so_tai_khoan ?? '',
      ngan_hang: item.ngan_hang ?? '',
      so_du: formatCurrency(soDuMap.get(item.id) ?? 0),
      trang_thai: item.trang_thai,
      mo_ta: item.mo_ta ?? '',
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [soDuMap],
  );

  const {
    exportData,
    paginatedData: paginatedExportData,
    selectedData: selectedExportData,
  } = useExportData({
    data: sorted,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [columns],
  );

  const hasListFilters = useMemo(
    () =>
      Boolean(searchTerm?.trim()) ||
      countQuyTaiKhoanColumnSearchActive(filters.columnSearch ?? {}) > 0 ||
      filters.trang_thai.length > 0 ||
      filters.hinh_thuc.length > 0,
    [searchTerm, filters.columnSearch, filters.trang_thai, filters.hinh_thuc],
  );

  // Phân biệt "chưa có dữ liệu" với "không khớp bộ lọc" — hai tình huống khác
  // hẳn nhau với cán bộ: một cái cần thêm mới, một cái cần bỏ bộ lọc.
  const khongKhopBoLoc = sorted.length === 0 && rows.length > 0 && hasListFilters;
  const emptyTitleResolved = khongKhopBoLoc
    ? txt('common.noResults')
    : txt('quy.danhMucTaiKhoan.emptyTitle');
  const emptyDescriptionResolved = khongKhopBoLoc
    ? txt('quy.danhMucTaiKhoan.emptyFilteredHint')
    : txt('quy.danhMucTaiKhoan.emptyHint');

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.quyDanhMucTaiKhoan.detail(quy, viewingId), fresh);
  }, [rows, viewingId, queryClient, quy]);

  const handleEditFromList = (item: QuyDanhMucTaiKhoanListRow) => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: QuyDanhMucTaiKhoanListRow) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('quy.danhMucTaiKhoan.deleteTitle'),
      message: txt('quy.danhMucTaiKhoan.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync([id], {
          onSuccess: () => {
            if (viewingId === id) setViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('quy.danhMucTaiKhoan.bulkDeleteTitle'),
      message: txt('quy.danhMucTaiKhoan.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewingId && ids.includes(viewingId)) setViewingId(null);
          },
        });
      },
    });
  };

  const handleExport = () => {
    if (sorted.length === 0) {
      toast.warning(txt('quy.danhMucTaiKhoan.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    const vid = viewingId;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && vid && wasEditing && wasEditing.id === vid) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quyDanhMucTaiKhoan.detail(quy, vid),
      });
    }
    setFormOrigin('list');
  };

  if (waiting || !canView) {
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
        <QuyDanhMucTaiKhoanToolbar
          onPageBack={() => navigate('/an-sinh-xa-hoi')}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          items={rows}
        />

        <div className="flex-1 min-h-0">
          <QuyDanhMucTaiKhoanTable
            data={sorted}
            soDuMap={soDuMap}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => {
              queryClient.setQueryData(
                queryKeys.quyDanhMucTaiKhoan.detail(quy, item.id),
                item,
              );
              setViewingId(item.id);
            }}
            emptyTitle={emptyTitleResolved}
            emptyDescription={emptyDescriptionResolved}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <QuyDanhMucTaiKhoanForm quy={quy} initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <QuyDanhMucTaiKhoanDetailDrawer
              data={viewingData}
              soDu={soDuMap.get(viewingData.id) ?? 0}
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
            fileName={`${txt('quy.danhMucTaiKhoan.exportFileName')}-${QUY_FILE_SUFFIX[quy]}`}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuyDanhMucTaiKhoanPage;
