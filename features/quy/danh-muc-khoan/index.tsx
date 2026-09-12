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
import ExportDialog from '@/components/shared/ExportDialog';
import { QUY_FILE_SUFFIX, QUY_LOAI_KHOAN_LABEL, type QuyKey } from '../core/constants';
import {
  useQuyDanhMucKhoanList,
  useQuyDanhMucKhoanDetail,
  useDeleteQuyDanhMucKhoanMany,
} from './hooks/use-quy-danh-muc-khoan';
import { useQuyDanhMucKhoanStore } from './store/useQuyDanhMucKhoanStore';
import type { QuyDanhMucKhoanListRow } from './core/types';
import { QUY_KHOAN_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  countQuyKhoanColumnSearchActive,
  quyKhoanMatchesColumnSearch,
} from './utils/column-search';
import { sortQuyKhoanList } from './utils/sort';
import QuyDanhMucKhoanToolbar from './components/quy-danh-muc-khoan-toolbar';
import QuyDanhMucKhoanTable from './components/quy-danh-muc-khoan-table';

const QuyDanhMucKhoanForm = lazy(() => import('./components/quy-danh-muc-khoan-form'));
const QuyDanhMucKhoanDetailDrawer = lazy(() => import('./components/quy-danh-muc-khoan-detail'));

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

export interface QuyDanhMucKhoanPageProps {
  quy: QuyKey;
}

/**
 * Danh mục khoản THU và khoản CHI của quỹ.
 *
 * Lưu ý về tên: mục menu gọi là “Danh mục chi phí”, nhưng bảng
 * `quy_danh_muc_khoan` chứa CẢ khoản thu lẫn khoản chi (cột `loai`) — phiếu thu
 * cũng phải chọn khoản mục. Nhãn menu do người quản trị quyết định nên giữ
 * nguyên; trong màn hình dùng chữ “khoản thu chi” cho đúng nghiệp vụ.
 *
 * Phân trang phía client: bảng DANH MỤC, có trần tự nhiên (xem CLAUDE.md).
 */
const QuyDanhMucKhoanPage: React.FC<QuyDanhMucKhoanPageProps> = ({ quy }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const { canView, waiting, ready } = useModuleAccess('quyDanhMucKhoan');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (waiting || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('quy.danhMucKhoan.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [waiting, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuyDanhMucKhoanListRow | null>(null);
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
  } = useQuyDanhMucKhoanStore();

  const { data: rows = [], isLoading, isError, refetch } = useQuyDanhMucKhoanList(quy, {
    enabled: ready,
  });
  const { data: viewingData } = useQuyDanhMucKhoanDetail(quy, viewingId, {
    enabled: ready && Boolean(viewingId?.trim()),
  });
  const deleteMutation = useDeleteQuyDanhMucKhoanMany(quy);

  // Bộ lọc/phân trang là state dùng chung cho cả hai quỹ ⇒ dọn khi rời trang.
  // Việc chuyển giữa hai quỹ do `key={quy}` ở App.tsx lo (gắn lại trang từ đầu).
  useEffect(() => () => resetState(), [resetState]);

  const filterFn = useCallback(
    (item: QuyDanhMucKhoanListRow, term: string, f: typeof filters) => {
      if (!quyKhoanMatchesColumnSearch(item, f.columnSearch)) return false;
      if (f.loai.length > 0 && !f.loai.includes(item.loai)) return false;
      if (f.trang_thai.length > 0 && !f.trang_thai.includes(item.trang_thai)) return false;
      return matchesSearchTerm(item as unknown as Record<string, unknown>, term, [
        ...QUY_KHOAN_SEARCHABLE_KEYS,
      ]);
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortQuyKhoanList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'thu_tu', label: txt('quy.danhMucKhoan.store.thuTuCol') },
      { key: 'loai', label: txt('quy.danhMucKhoan.store.loaiCol') },
      { key: 'ten', label: txt('quy.danhMucKhoan.store.tenCol') },
      { key: 'mo_ta', label: txt('quy.danhMucKhoan.store.moTaCol') },
      { key: 'trang_thai', label: txt('quy.danhMucKhoan.store.trangThaiCol') },
      { key: 'tg_tao', label: txt('quy.danhMucKhoan.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('quy.danhMucKhoan.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: QuyDanhMucKhoanListRow) => ({
      thu_tu: item.thu_tu,
      loai: QUY_LOAI_KHOAN_LABEL[item.loai],
      ten: item.ten,
      mo_ta: item.mo_ta ?? '',
      trang_thai: item.trang_thai,
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
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
      countQuyKhoanColumnSearchActive(filters.columnSearch ?? {}) > 0 ||
      filters.loai.length > 0 ||
      filters.trang_thai.length > 0,
    [searchTerm, filters.columnSearch, filters.loai, filters.trang_thai],
  );

  const khongKhopBoLoc = sorted.length === 0 && rows.length > 0 && hasListFilters;
  const emptyTitleResolved = khongKhopBoLoc
    ? txt('common.noResults')
    : txt('quy.danhMucKhoan.emptyTitle');
  const emptyDescriptionResolved = khongKhopBoLoc
    ? txt('quy.danhMucKhoan.emptyFilteredHint')
    : txt('quy.danhMucKhoan.emptyHint');

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.quyDanhMucKhoan.detail(quy, viewingId), fresh);
  }, [rows, viewingId, queryClient, quy]);

  const handleEditFromList = (item: QuyDanhMucKhoanListRow) => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: QuyDanhMucKhoanListRow) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('quy.danhMucKhoan.deleteTitle'),
      message: txt('quy.danhMucKhoan.deleteMessage'),
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
      title: txt('quy.danhMucKhoan.bulkDeleteTitle'),
      message: txt('quy.danhMucKhoan.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('quy.danhMucKhoan.noExportData'));
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
        queryKey: queryKeys.quyDanhMucKhoan.detail(quy, vid),
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
        <QuyDanhMucKhoanToolbar
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
          <QuyDanhMucKhoanTable
            data={sorted}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => {
              queryClient.setQueryData(queryKeys.quyDanhMucKhoan.detail(quy, item.id), item);
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
            <QuyDanhMucKhoanForm quy={quy} initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <QuyDanhMucKhoanDetailDrawer
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
            fileName={`${txt('quy.danhMucKhoan.exportFileName')}-${QUY_FILE_SUFFIX[quy]}`}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuyDanhMucKhoanPage;
