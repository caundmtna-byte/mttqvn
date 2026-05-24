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
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { txt } from '@/lib/text';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import ExportDialog from '@/components/shared/ExportDialog';
import ErrorState from '@/components/shared/ErrorState';
import LuongNgachToolbar from './luong-ngach-toolbar';
import LuongNgachTable from './luong-ngach-table';
import { useLuongThietLapNgachStore } from '../store/useLuongThietLapNgachStore';
import {
  useLuongThietLapNgachList,
  useLuongThietLapNgachDetail,
  useDeleteLuongThietLapNgachMany,
} from '../hooks/use-luong-thiet-lap-ngach';
import type { LuongThietLapBacRow, LuongThietLapNgachListRow } from '../core/types';
import type { LuongThietLapBacMaCode } from '../core/schema';
import { LUONG_THIET_LAP_NGACH_SEARCHABLE_KEYS } from '../utils/search-keys';
import { useLuongThietLapBacByNgach, useDeleteLuongThietLapBac } from '../hooks/use-luong-thiet-lap-bac';
import { useLuongThietLapCauHinh } from '../hooks/use-luong-thiet-lap-cau-hinh';
import { listMissingMaBacForNgach } from '../services/luong-thiet-lap-bac-service';
import { countLuongThietLapNgachColumnSearchActive, luongThietLapNgachMatchesColumnSearch } from '../utils/column-search';
import { sortLuongThietLapNgachList } from '../utils/sort';

const LuongNgachForm = lazy(() => import('./luong-ngach-form'));
const LuongNgachDetail = lazy(() => import('./luong-ngach-detail'));
const LuongBacForm = lazy(() => import('./luong-bac-form'));
const LuongBacDetail = lazy(() => import('./luong-bac-detail'));

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
  </div>
);

type FormOrigin = 'list' | 'detail';

interface LuongNgachTabPanelProps {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  listQueryEnabled: boolean;
  waitingMatrixHydrate: boolean;
}

const LuongNgachTabPanel: React.FC<LuongNgachTabPanelProps> = ({
  onPageBack,
  tabsSlot,
  listQueryEnabled,
  waitingMatrixHydrate,
}) => {
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const { canCreate, canEdit, canDelete } = useResourcePermissions('matTranSalarySetup');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LuongThietLapNgachListRow | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);
  const [bacShowForm, setBacShowForm] = useState(false);
  const [bacEditing, setBacEditing] = useState<LuongThietLapBacRow | null>(null);
  const [bacViewingRow, setBacViewingRow] = useState<LuongThietLapBacRow | null>(null);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useLuongThietLapNgachStore();

  const {
    data: rows = [],
    isLoading,
    isError: isListError,
    isFetching: isListFetching,
    refetch: refetchList,
  } = useLuongThietLapNgachList({ enabled: listQueryEnabled });
  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useLuongThietLapNgachDetail(viewingId, { enabled: detailEnabled });
  const { data: bacRowsForNgach = [], isLoading: bacForNgachLoading } = useLuongThietLapBacByNgach(viewingId, {
    enabled: detailEnabled,
  });
  const { data: cauHinh } = useLuongThietLapCauHinh({ enabled: listQueryEnabled });
  const mlcsNum = Number(cauHinh?.muc_luong_co_so ?? 0);
  const deleteBacMutation = useDeleteLuongThietLapBac();
  const isListLoading = isLoading || waitingMatrixHydrate;
  const deleteMutation = useDeleteLuongThietLapNgachMany();

  const missingBacCodesForNgachDetail = useMemo(
    () => listMissingMaBacForNgach(bacRowsForNgach) as LuongThietLapBacMaCode[],
    [bacRowsForNgach],
  );

  const ngachLabelForBac = useMemo(() => {
    if (!viewingData) return undefined;
    return viewingData.ma ? `${viewingData.ten} (${viewingData.ma})` : viewingData.ten;
  }, [viewingData]);

  useEffect(() => () => resetState(), [resetState]);

  const filterFn = useCallback(
    (item: LuongThietLapNgachListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...LUONG_THIET_LAP_NGACH_SEARCHABLE_KEYS],
      );
      if (!luongThietLapNgachMatchesColumnSearch(item, f.columnSearch)) return false;
      const mo = (item.mo_ta ?? '').trim();
      if (f.mo_ta_bucket === 'has' && !mo) return false;
      if (f.mo_ta_bucket === 'empty' && mo) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortLuongThietLapNgachList(filtered, sort), [filtered, sort]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'thu_tu', label: txt('matTranThietLapLuong.store.thuTuCol') },
      { key: 'ma', label: txt('matTranThietLapLuong.store.maCol') },
      { key: 'ten', label: txt('matTranThietLapLuong.store.tenCol') },
      { key: 'mo_ta', label: txt('matTranThietLapLuong.store.moTaCol') },
      { key: 'tg_tao', label: txt('matTranThietLapLuong.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('matTranThietLapLuong.store.tgCapNhatCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: LuongThietLapNgachListRow) => ({
      thu_tu: item.thu_tu,
      ma: item.ma ?? '',
      ten: item.ten,
      mo_ta: item.mo_ta ?? '',
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
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

  const hasListFilters = useMemo(() => {
    const cs = filters.columnSearch ?? {};
    return (
      Boolean(searchTerm?.trim()) ||
      countLuongThietLapNgachColumnSearchActive(cs) > 0 ||
      filters.mo_ta_bucket === 'has' ||
      filters.mo_ta_bucket === 'empty' ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters.columnSearch, filters.mo_ta_bucket, sort.column]);

  const emptyTitleResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters ? txt('common.noResults') : txt('matTranThietLapLuong.emptyTitle'),
    [sorted.length, rows.length, hasListFilters],
  );

  const emptyDescriptionResolved = useMemo(
    () =>
      sorted.length === 0 && rows.length > 0 && hasListFilters
        ? txt('matTranThietLapLuong.emptyFilteredHint')
        : txt('matTranThietLapLuong.emptyHint'),
    [sorted.length, rows.length, hasListFilters],
  );

  useEffect(() => {
    if (!viewingId) return;
    const fresh = rows.find((r) => r.id === viewingId);
    if (!fresh) {
      setViewingId(null);
      return;
    }
    queryClient.setQueryData(queryKeys.luongThietLapNgach.detail(viewingId), fresh);
  }, [rows, viewingId, queryClient]);

  const handleEditFromList = (item: LuongThietLapNgachListRow) => {
    if (!canEdit) {
      toast.error(txt('matTranThietLapLuong.noEditPermission'));
      return;
    }
    startTransition(() => {
      setFormOrigin('list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: LuongThietLapNgachListRow) => {
    if (!canEdit) {
      toast.error(txt('matTranThietLapLuong.noEditPermission'));
      return;
    }
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast.error(txt('matTranThietLapLuong.noDeletePermission'));
      return;
    }
    confirm({
      title: txt('matTranThietLapLuong.deleteTitle'),
      message: txt('matTranThietLapLuong.deleteMessage'),
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
    if (!canDelete) {
      toast.error(txt('matTranThietLapLuong.noDeletePermission'));
      return;
    }
    confirm({
      title: txt('matTranThietLapLuong.bulkDeleteTitle'),
      message: txt('matTranThietLapLuong.bulkDeleteMessage', { count: ids.length }),
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
    if (sorted.length === 0) {
      toast.warning(txt('matTranThietLapLuong.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormOrigin('list');
  };

  const handleView = useCallback(
    (item: LuongThietLapNgachListRow) => {
      queryClient.setQueryData(queryKeys.luongThietLapNgach.detail(item.id), item);
      setViewingId(item.id);
      setBacViewingRow(null);
    },
    [queryClient],
  );

  const handleCloseBacForm = () => {
    setBacShowForm(false);
    setBacEditing(null);
  };

  const handleAddBacFromNgach = useCallback(
    (ngach: LuongThietLapNgachListRow) => {
      if (!canCreate) {
        toast.error(txt('matTranThietLapLuong.noCreatePermission'));
        return;
      }
      if (missingBacCodesForNgachDetail.length === 0) {
        toast.warning(txt('matTranThietLapLuong.bac.allSlotsFull'));
        return;
      }
      startTransition(() => {
        setBacEditing(null);
        setBacShowForm(true);
        setBacViewingRow(null);
        if (viewingId !== ngach.id) {
          queryClient.setQueryData(queryKeys.luongThietLapNgach.detail(ngach.id), ngach);
          setViewingId(ngach.id);
        }
      });
    },
    [canCreate, missingBacCodesForNgachDetail.length, queryClient, viewingId],
  );

  const handleEditBacFromNgach = useCallback(
    (row: LuongThietLapBacRow) => {
      if (!canEdit) {
        toast.error(txt('matTranThietLapLuong.noEditPermission'));
        return;
      }
      startTransition(() => {
      setBacEditing(row);
      setBacShowForm(true);
        setBacViewingRow(null);
      });
    },
    [canEdit],
  );

  const handleViewBacFromNgach = useCallback((row: LuongThietLapBacRow) => {
    setBacViewingRow(row);
    setBacShowForm(false);
    setBacEditing(null);
  }, []);

  const handleDeleteBacFromNgach = useCallback(
    (row: LuongThietLapBacRow) => {
      if (!canDelete) {
        toast.error(txt('matTranThietLapLuong.noDeletePermission'));
        return;
      }
      if (!viewingId) return;
      confirm({
        title: txt('matTranThietLapLuong.bac.deleteTitle'),
        message: txt('matTranThietLapLuong.bac.deleteMessage', { ma: row.ma_bac }),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: async () => {
          deleteBacMutation.mutate(
            { id: row.id, ngachId: viewingId },
            {
              onSuccess: () => {
                setBacViewingRow((v) => (v?.id === row.id ? null : v));
              },
            },
          );
        },
      });
    },
    [canDelete, confirm, deleteBacMutation, viewingId],
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-0">
        <LuongNgachToolbar
          onPageBack={onPageBack}
          tabsSlot={tabsSlot}
          onAdd={() => {
            if (!canCreate) {
              toast.error(txt('matTranThietLapLuong.noCreatePermission'));
              return;
            }
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

        <div className="flex-1 min-h-0 flex flex-col min-w-0">
          {listQueryEnabled && isListError ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <ErrorState
                className="w-full max-w-md border-destructive/20"
                message={txt('matTranThietLapLuong.listLoadErrorHint')}
                onRetry={() => void refetchList()}
                primaryButtons
              />
            </div>
          ) : (
            <LuongNgachTable
              data={sorted}
              isLoading={isListLoading || (listQueryEnabled && isListFetching && rows.length === 0)}
              onEdit={handleEditFromList}
              onDelete={handleDelete}
              onView={handleView}
              emptyTitle={emptyTitleResolved}
              emptyDescription={emptyDescriptionResolved}
            />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <LuongNgachForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && !bacShowForm && !bacViewingRow && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <LuongNgachDetail
              data={viewingData}
              bacRows={bacRowsForNgach}
              bacLoading={bacForNgachLoading}
              mucLuongCoSo={mlcsNum}
              missingCodesForCreate={missingBacCodesForNgachDetail}
              onClose={() => {
                setViewingId(null);
                setBacViewingRow(null);
                setBacShowForm(false);
                setBacEditing(null);
              }}
              onEdit={handleEditFromDetail}
              onDelete={handleDelete}
              onAddBac={handleAddBacFromNgach}
              onEditBac={handleEditBacFromNgach}
              onDeleteBac={handleDeleteBacFromNgach}
              onViewBac={handleViewBacFromNgach}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bacShowForm && viewingId && viewingData && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <LuongBacForm
              ngachId={viewingId}
              ngachLabel={ngachLabelForBac}
              initialData={bacEditing}
              missingCodesForCreate={missingBacCodesForNgachDetail}
              onClose={handleCloseBacForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bacViewingRow && viewingData && !bacShowForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <LuongBacDetail
              data={bacViewingRow}
              ngachLabel={ngachLabelForBac}
              mucLuongCoSoPreview={mlcsNum}
              onClose={() => setBacViewingRow(null)}
              onEdit={(row) => {
                setBacViewingRow(null);
                handleEditBacFromNgach(row);
              }}
              onDelete={handleDeleteBacFromNgach}
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
            fileName={txt('matTranThietLapLuong.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LuongNgachTabPanel;
