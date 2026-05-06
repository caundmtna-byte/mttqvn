import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import TabGroup from '@/components/ui/TabGroup';
import ExportDialog from '@/components/shared/ExportDialog';
import { useBaiVietDanhSachList, useDeleteBaiVietDanhSachMany } from './hooks/use-bai-viet-danh-sach';
import { useBaiVietDanhSachStore } from './store/useBaiVietDanhSachStore';
import type { BaiVietDanhSach, BaiVietListScope } from './core/types';
import { BAI_VIET_DANH_SACH_SEARCHABLE_KEYS } from './utils/search-keys';
import { baiVietMatchesColumnSearch } from './utils/column-search';
import { countBaiVietColumnSearchActive } from './utils/column-search-count';
import BaiVietToolbar from './components/bai-viet-toolbar';
import BaiVietTable from './components/bai-viet-table';

const BaiVietForm = lazy(() => import('./components/bai-viet-form'));
const BaiVietDetail = lazy(() => import('./components/bai-viet-detail'));

const TAB_ALL: BaiVietListScope = 'all';
const TAB_MINE: BaiVietListScope = 'mine';

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

const BaiVietDanhSachPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();

  const [listScope, setListScope] = useState<BaiVietListScope>(TAB_ALL);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BaiVietDanhSach | null>(null);
  const [viewing, setViewing] = useState<BaiVietDanhSach | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useBaiVietDanhSachStore();

  const { data: rows = [], isLoading } = useBaiVietDanhSachList();
  const deleteMutation = useDeleteBaiVietDanhSachMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  useEffect(() => {
    clearSelection();
  }, [listScope, clearSelection]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rows.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rows, viewing]);

  const filterFn = useCallback(
    (item: BaiVietDanhSach, term: string, f: typeof filters) => {
      if (listScope === TAB_MINE && String(item.id_nguoi_tao) !== nhanVienId) return false;
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        BAI_VIET_DANH_SACH_SEARCHABLE_KEYS,
      );
      const matchesCol = baiVietMatchesColumnSearch(item, f.columnSearch);
      return matchesSearch && matchesCol;
    },
    [listScope, nhanVienId],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof BaiVietDanhSach;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number'
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => b.ngay_dang.localeCompare(a.ngay_dang) || a.ten_bai.localeCompare(b.ten_bai, getLanguage()));
    }
    return list;
  }, [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_bai', label: txt('articleList.store.nameCol') },
      { key: 'ten_the_loai', label: txt('articleList.store.theLoaiCol') },
      { key: 'don_gia_num', label: txt('articleList.store.donGiaCol') },
      { key: 'ngay_dang', label: txt('articleList.store.ngayDangCol') },
      { key: 'ten_nguon_dang', label: txt('articleList.store.nguonDangCol') },
      { key: 'ten_trang_dang', label: txt('articleList.store.trangDangCol') },
      { key: 'link', label: txt('articleList.store.linkCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('articleList.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: BaiVietDanhSach) => ({
      ten_bai: item.ten_bai,
      ten_the_loai: item.ten_the_loai ?? '',
      don_gia_num: item.don_gia,
      ngay_dang: item.ngay_dang,
      ten_nguon_dang: item.ten_nguon_dang ?? '',
      ten_trang_dang: item.ten_trang_dang ?? '',
      link: item.link,
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

  const handleEdit = (item: BaiVietDanhSach) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('articleList.deleteTitle'),
      message: txt('articleList.deleteMessage'),
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
      title: txt('articleList.bulkDeleteTitle'),
      message: txt('articleList.bulkDeleteMessage', { count: ids.length }),
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
      toast.warning(txt('articleList.noExportData'));
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
      const fresh = rows.find((r) => r.id === viewing.id);
      if (fresh) setViewing(fresh);
    }
    setFormOrigin('list');
  };

  const tabs = useMemo(
    () => [
      { id: TAB_ALL, label: txt('articleList.tabAll') },
      { id: TAB_MINE, label: txt('articleList.tabMine') },
    ],
    [],
  );

  const tabsSlot = useMemo(
    () => (
      <TabGroup
        tabs={tabs}
        activeTab={listScope}
        onChange={(id) => setListScope(id as BaiVietListScope)}
        className="shrink-0"
      />
    ),
    [tabs, listScope],
  );

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <BaiVietToolbar
          onPageBack={() => navigate('/quan-ly-viet-bai')}
          tabsSlot={tabsSlot}
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
          <BaiVietTable
            data={sorted}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={setViewing}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <BaiVietForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <BaiVietDetail
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
            fileName={txt('articleList.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BaiVietDanhSachPage;
