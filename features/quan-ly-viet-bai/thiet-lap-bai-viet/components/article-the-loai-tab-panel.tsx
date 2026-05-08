import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import ExportDialog from '@/components/shared/ExportDialog';
import ArticleTheLoaiToolbar from './article-the-loai-toolbar';
import ArticleTheLoaiTable from './article-the-loai-table';
import { useArticleTheLoaiStore } from '../store/useArticleTheLoaiStore';
import { useTheLoais, useDeleteTheLoais } from '../hooks/use-the-loai';
import type { BaiVietTheLoai } from '../core/types';
import { theLoaiMatchesColumnSearch } from '../utils/column-search-the-loai';
import { ARTICLE_THE_LOAI_SEARCH_KEYS } from '../utils/search-keys';

const TheLoaiForm = lazy(() => import('./the-loai-form'));
const ArticleTheLoaiDetail = lazy(() => import('./article-the-loai-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

type FormOrigin = 'list' | 'detail';

interface ArticleTheLoaiTabPanelProps {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  /** Tắt query khi không có quyền xem module (Layer 2). */
  queriesEnabled?: boolean;
}

const ArticleTheLoaiTabPanel: React.FC<ArticleTheLoaiTabPanelProps> = ({
  onPageBack,
  tabsSlot,
  queriesEnabled = true,
}) => {
  const confirm = useConfirmStore((s) => s.confirm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BaiVietTheLoai | null>(null);
  const [viewing, setViewing] = useState<BaiVietTheLoai | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useArticleTheLoaiStore();

  const { data: rows = [], isLoading } = useTheLoais({ enabled: queriesEnabled });
  const deleteMut = useDeleteTheLoais();

  useEffect(() => () => resetState(), [resetState]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rows.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rows, viewing]);

  const filterFn = useCallback(
    (item: BaiVietTheLoai, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...ARTICLE_THE_LOAI_SEARCH_KEYS],
      );
      if (f.don_gia_bucket === 'free' && item.don_gia !== 0) return false;
      if (f.don_gia_bucket === 'paid' && !(item.don_gia > 0)) return false;
      const matchesCol = theLoaiMatchesColumnSearch(item, f.columnSearch, f.don_gia_bucket);
      return matchesSearch && matchesCol;
    },
    [],
  );

  const filteredRows = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    if (sort.column && sort.direction) {
      const key = sort.column as keyof BaiVietTheLoai;
      sorted.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      sorted.sort((a, b) => a.ten_the_loai.localeCompare(b.ten_the_loai, getLanguage()));
    }
    return sorted;
  }, [filteredRows, sort.column, sort.direction]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_the_loai', label: txt('page.articleSettings.colTenTheLoai') },
      { key: 'mo_ta', label: txt('page.articleSettings.colMoTa') },
      { key: 'don_gia', label: txt('page.articleSettings.colDonGia') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: BaiVietTheLoai) => ({
      ten_the_loai: item.ten_the_loai,
      mo_ta: item.mo_ta ?? '',
      don_gia: item.don_gia,
    }),
    [],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: filteredRows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  const visibleColumnKeys = useMemo(() => columns.filter((c) => c.visible).map((c) => c.id), [columns]);

  const handleEdit = (item: BaiVietTheLoai) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('page.articleSettings.deleteTheLoaiTitle'),
      message: txt('page.articleSettings.deleteTheLoaiMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMut.mutate([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('page.articleSettings.bulkDeleteTheLoaiTitle'),
      message: txt('page.articleSettings.bulkDeleteTheLoaiMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMut.mutate(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewing && ids.includes(viewing.id)) setViewing(null);
          },
        });
      },
    });
  };

  const handleExport = () => {
    if (filteredRows.length === 0) {
      toast.warning(txt('page.articleSettings.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const donGiaCounts = useMemo(
    () => ({
      free: rows.filter((r) => r.don_gia === 0).length,
      paid: rows.filter((r) => r.don_gia > 0).length,
    }),
    [rows],
  );

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && viewing && wasEditing && viewing.id === wasEditing.id) {
      const fresh = rows.find((r) => r.id === viewing.id);
      if (fresh) setViewing(fresh);
    }
    setFormOrigin('list');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-0">
        <ArticleTheLoaiToolbar
          onPageBack={onPageBack}
          tabsSlot={tabsSlot}
          donGiaCounts={donGiaCounts}
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
          <ArticleTheLoaiTable
            data={sortedRows}
            isLoading={isLoading}
            onRowClick={setViewing}
            onEdit={handleEdit}
            onDelete={handleDelete}
            emptyTitle={txt('page.articleSettings.emptyTheLoai')}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <TheLoaiForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ArticleTheLoaiDetail
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
            fileName="Danh_Sach_The_Loai_Bai_Viet"
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArticleTheLoaiTabPanel;
