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
import { txt } from '../../../lib/text';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useStore';
import { useCan } from '../../../hooks/use-can';
import { matchesSearchTerm } from '../../../lib/searchUtils';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { getDepartments } from '../phong-ban/services/phong-ban-service';
import { getJobLevels } from '../cap-bac/services/cap-bac-service';

import PositionToolbar from './components/chuc-vu-toolbar';
import PositionTable from './components/chuc-vu-table';
import ExportDialog from '../../../components/shared/ExportDialog';
import ImportDialog from '../../../components/shared/ImportDialog';

import {
  usePositions,
  useDeletePosition,
  useUpdateStatusPosition,
  useImportPositions,
} from './hooks/use-chuc-vu';
import { usePositionFilterCounts } from './hooks/use-position-filter-counts';
import { usePositionStore } from './store/usePositionStore';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_YES, CONFIRM_DELETE_ALL } from '../../../lib/button-labels';
import { useListWithFilter } from '../../../lib/hooks';
import { useExportData } from '../../../lib/useExportData';
import type { Position } from './core/types';
import { POSITION_SEARCHABLE_KEYS } from './utils/search-keys';
import { positionMatchesColumnSearch } from './utils/column-search';

const PositionForm = lazy(() => import('./components/chuc-vu-form'));
const PositionDetail = lazy(() => import('./components/chuc-vu-detail'));

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

const PositionPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'positions');
  const navigate = useNavigate();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('position.noViewPermission'));
    navigate('/he-thong', { replace: true });
  }, [user, canView, navigate]);

  const confirm = useConfirmStore((s) => s.confirm);

  const [showForm, setShowForm] = useState(false);
  const [editingPos, setEditingPos] = useState<Position | null>(null);
  const [viewingPos, setViewingPos] = useState<Position | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const queryClient = useQueryClient();
  const {
    searchTerm,
    filters,
    resetState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
  } = usePositionStore();

  const { data: positions = [], isLoading } = usePositions({ enabled: canView });
  const deleteMutation = useDeletePosition();
  const statusMutation = useUpdateStatusPosition();
  const importMutation = useImportPositions(() => setShowImport(false));

  const { deptCounts, statusCounts } = usePositionFilterCounts(positions, searchTerm, filters);

  /** Prefetch master data cho form — mở drawer không chờ request lạnh */
  useEffect(() => {
    if (!canView) return;
    const opts = masterDataQueryOptions;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.departments.all,
      queryFn: getDepartments,
      ...opts,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.jobLevels.all,
      queryFn: getJobLevels,
      ...opts,
    });
  }, [queryClient, canView]);

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_chuc_vu', label: txt('position.form.name'), required: true },
      { key: 'cap_bac', label: `${txt('position.form.level')} (id/số)`, required: true },
      { key: 'ma_cap_bac', label: `${txt('position.form.level')} (mã)` },
      { key: 'ten_phong_ban', label: `${txt('position.form.department')} (tên)`, required: true },
      { key: 'mo_ta', label: txt('position.form.description') },
      { key: 'thu_tu', label: txt('position.store.orderCol') },
      { key: 'trang_thai', label: txt('common.status') },
    ],
    []
  );

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      await importMutation.mutateAsync(data);
    },
    [importMutation]
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  useEffect(() => {
    if (!viewingPos) return;
    const fresh = positions.find((p) => p.id === viewingPos.id);
    if (fresh && fresh !== viewingPos) queueMicrotask(() => setViewingPos(fresh));
  }, [positions, viewingPos]);

  const filterFn = useCallback(
    (item: Position, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        POSITION_SEARCHABLE_KEYS
      );
      const statusKey = item.trang_thai === 'Đang hoạt động' ? 'Active' : 'Inactive';
      const matchesStatus = f.status.length === 0 || f.status.includes(statusKey);
      const matchesDept =
        f.phong_ban_id.length === 0 ||
        (item.phong_ban_id != null && f.phong_ban_id.includes(item.phong_ban_id));
      const matchesCol = positionMatchesColumnSearch(item, f.columnSearch);
      return matchesSearch && matchesStatus && matchesDept && matchesCol;
    },
    []
  );

  const filteredPositions = useListWithFilter(positions, searchTerm, filters, filterFn);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_chuc_vu', label: txt('position.exportName') },
      { key: 'mo_ta', label: txt('position.exportDesc') },
      { key: 'trang_thai_text', label: txt('position.exportStatus') },
    ],
    []
  );

  const exportMapFn = useCallback(
    (item: Position) => ({
      ten_chuc_vu: item.ten_chuc_vu,
      mo_ta: item.mo_ta ?? '',
      trang_thai_text: item.trang_thai,
    }),
    []
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } =
    useExportData({
      data: filteredPositions,
      isOpen: showExport,
      mapFn: exportMapFn,
      pagination,
      selectedIds,
      keyExtractor: (p) => p.id,
    });

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible).map((c) => c.id),
    [columns]
  );

  const handleEdit = (item: Position) => {
    startTransition(() => {
      setFormOrigin(viewingPos ? 'detail' : 'list');
      setEditingPos(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('position.deleteTitle'),
      message: txt('position.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate([id], {
          onSuccess: () => {
            if (viewingPos && viewingPos.id === id) setViewingPos(null);
          },
        });
      },
    });
  };

  const handleStatusChange = (item: Position) => {
    const newStatus = item.trang_thai === 'Đang hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động';
    confirm({
      title: txt('position.statusChangeTitle'),
      message: `${txt('position.statusChangeMessage', { count: 1 })} ${newStatus}?`,
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        statusMutation.mutate(
          { ids: [item.id], status: newStatus },
          {
            onSuccess: (updated) => {
              if (updated && viewingPos?.id === updated.id) setViewingPos(updated);
            },
          }
        );
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('position.bulkDeleteTitle'),
      message: txt('position.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMutation.mutate(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewingPos && ids.includes(viewingPos.id)) setViewingPos(null);
          },
        });
      },
    });
  };

  const handleStatusChangeMany = (ids: string[], status: TrangThaiHoatDong) => {
    confirm({
      title: txt('position.statusChangeTitle'),
      message: `${txt('position.statusChangeMessage', { count: ids.length })} ${status}?`,
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        statusMutation.mutate({ ids, status }, { onSuccess: () => clearSelection() });
      },
    });
  };

  const handleExport = () => {
    if (filteredPositions.length === 0) {
      toast.warning(txt('position.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editingPos;
    const origin = formOrigin;
    setShowForm(false);
    setEditingPos(null);
    if (origin === 'detail' && viewingPos && wasEditing && viewingPos.id === wasEditing.id) {
      const fresh = positions.find((p) => p.id === viewingPos.id);
      if (fresh) setViewingPos(fresh);
    }
    setFormOrigin('list');
  };

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('position.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <PositionToolbar
          deptCounts={deptCounts}
          statusCounts={statusCounts}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setEditingPos(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onImport={() => setShowImport(true)}
          onDeleteMany={handleDeleteMany}
          onStatusChangeMany={handleStatusChangeMany}
        />

        <div className="flex-1 min-h-0">
          <PositionTable
            data={filteredPositions}
            isLoading={isLoading}
            deptCounts={deptCounts}
            statusCounts={statusCounts}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onView={setViewingPos}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <PositionForm initialData={editingPos} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingPos && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <PositionDetail
              data={viewingPos}
              onClose={() => setViewingPos(null)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
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
            fileName="Danh_Sach_Chuc_Vu"
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportDialog
            open={showImport}
            onClose={() => setShowImport(false)}
            columns={IMPORT_COLUMNS}
            onImport={handleImportData}
            templateFileName={txt('position.importTemplateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PositionPage;
