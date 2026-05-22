import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
  startTransition,
} from 'react';
import { AnimatePresence } from 'framer-motion';
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';
import type { Option } from '@/components/ui/MultiSelect';
import { txt } from '@/lib/text';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { CONFIRM_DELETE } from '@/lib/button-labels';
import Button from '@/components/ui/Button';
import CurrencyInput from '@/components/ui/CurrencyInput';
import { formatCurrency } from '@/lib/utils';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useLuongThietLapNgachList } from '../hooks/use-luong-thiet-lap-ngach';
import { useLuongThietLapBacByNgach, useDeleteLuongThietLapBac } from '../hooks/use-luong-thiet-lap-bac';
import { useLuongThietLapCauHinh, useUpdateLuongThietLapCauHinh } from '../hooks/use-luong-thiet-lap-cau-hinh';
import type { LuongThietLapBacRow } from '../core/types';
import type { LuongThietLapBacMaCode } from '../core/schema';
import { useLuongBacTableStore } from '../store/useLuongBacTableStore';
import { luongBacMatchesColumnSearch, countLuongBacColumnSearchActive } from '../utils/bac-column-search';
import { sortLuongBacRows, type LuongBacTableRow } from '../utils/bac-sort';
import { LUONG_BAC_SEARCHABLE_KEYS } from '../utils/bac-search-keys';
import { listMissingMaBacForNgach } from '../services/luong-thiet-lap-bac-service';
import LuongBacToolbar from './luong-bac-toolbar';
import LuongBacTable from './luong-bac-table';

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

interface Props {
  onPageBack: () => void;
  tabsSlot: React.ReactNode;
  listQueryEnabled: boolean;
}

const LuongBacTabPanel: React.FC<Props> = ({ onPageBack, tabsSlot, listQueryEnabled }) => {
  const confirm = useConfirmStore((s) => s.confirm);
  const { canEdit, canCreate } = useResourcePermissions('matTranSalarySetup');
  const { data: ngachRows = [] } = useLuongThietLapNgachList({ enabled: listQueryEnabled });
  const [selectedNgachId, setSelectedNgachId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LuongThietLapBacRow | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);

  useEffect(() => {
    if (ngachRows.length === 0) {
      setSelectedNgachId(null);
      return;
    }
    if (!selectedNgachId || !ngachRows.some((r) => r.id === selectedNgachId)) {
      setSelectedNgachId(ngachRows[0].id);
    }
  }, [ngachRows, selectedNgachId]);

  useEffect(() => {
    const s = useLuongBacTableStore.getState();
    s.setSearchTerm('');
    s.setFilter('columnSearch', {});
    s.setSort(null, null);
    s.clearSelection();
  }, [selectedNgachId]);

  useEffect(() => () => useLuongBacTableStore.getState().resetState(), []);

  const { searchTerm, filters, sort } = useLuongBacTableStore();

  const { data: bacRows = [], isLoading: bacLoading } = useLuongThietLapBacByNgach(selectedNgachId, {
    enabled: listQueryEnabled && Boolean(selectedNgachId),
  });
  const { data: cauHinh } = useLuongThietLapCauHinh({ enabled: listQueryEnabled });
  const updateMlcs = useUpdateLuongThietLapCauHinh();
  const deleteBac = useDeleteLuongThietLapBac();

  const mlcsNum = Number(cauHinh?.muc_luong_co_so ?? 0);
  const [mlcsDraft, setMlcsDraft] = useState<number>(mlcsNum);

  useEffect(() => {
    setMlcsDraft(mlcsNum);
  }, [mlcsNum]);

  const ngachOptions: Option[] = useMemo(
    () => ngachRows.map((r) => ({ value: r.id, label: r.ma ? `${r.ten} (${r.ma})` : r.ten })),
    [ngachRows],
  );

  const selectedNgachLabel = useMemo(() => {
    const r = ngachRows.find((x) => x.id === selectedNgachId);
    return r ? (r.ma ? `${r.ten} (${r.ma})` : r.ten) : undefined;
  }, [ngachRows, selectedNgachId]);

  const missingCodesForCreate = useMemo(
    () => listMissingMaBacForNgach(bacRows) as LuongThietLapBacMaCode[],
    [bacRows],
  );

  const tableRows: LuongBacTableRow[] = useMemo(() => {
    const base = Number.isFinite(mlcsDraft) && mlcsDraft > 0 ? mlcsDraft : 0;
    return bacRows.map((r) => {
      const heStr = String(r.he_so ?? '');
      const he = Number(r.he_so);
      const heFin = Number.isFinite(he) && he > 0 ? he : 0;
      const luong_preview = base > 0 && heFin > 0 ? Math.round(base * heFin) : 0;
      const luong_search = `${luong_preview} ${formatCurrency(luong_preview)}`;
      return {
        ...r,
        luong_preview,
        he_so_effective: heFin,
        he_so_display: heStr,
        luong_search,
      };
    });
  }, [bacRows, mlcsDraft]);

  const filterFn = useCallback(
    (item: LuongBacTableRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        [...LUONG_BAC_SEARCHABLE_KEYS],
      );
      if (!luongBacMatchesColumnSearch(item, f.columnSearch)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(tableRows, searchTerm, filters, filterFn);
  const sorted = useMemo(() => sortLuongBacRows(filtered, sort), [filtered, sort]);

  const hasListFilters = useMemo(() => {
    const cs = filters.columnSearch ?? {};
    return (
      Boolean(searchTerm?.trim()) ||
      countLuongBacColumnSearchActive(cs) > 0 ||
      Boolean(sort.column)
    );
  }, [searchTerm, filters.columnSearch, sort.column]);

  const emptyTitleResolved = useMemo(() => {
    if (ngachRows.length === 0) return txt('matTranThietLapLuong.bac.noNgach');
    if (sorted.length === 0 && tableRows.length > 0 && hasListFilters) return txt('common.noResults');
    return txt('matTranThietLapLuong.bac.emptyBac');
  }, [sorted.length, tableRows.length, hasListFilters, ngachRows.length]);

  const emptyDescriptionResolved = useMemo(() => {
    if (ngachRows.length === 0) return txt('matTranThietLapLuong.bac.pickNgachHint');
    if (sorted.length === 0 && tableRows.length > 0 && hasListFilters) return txt('matTranThietLapLuong.emptyFilteredHint');
    return txt('matTranThietLapLuong.bac.pickNgachHint');
  }, [sorted.length, tableRows.length, hasListFilters, ngachRows.length]);

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleAdd = () => {
    if (!selectedNgachId) {
      toast.warning(txt('matTranThietLapLuong.bac.addPickNgach'));
      return;
    }
    if (missingCodesForCreate.length === 0) {
      toast.warning(txt('matTranThietLapLuong.bac.allSlotsFull'));
      return;
    }
    startTransition(() => {
      setEditing(null);
      setShowForm(true);
    });
  };

  const handleView = useCallback((row: LuongThietLapBacRow) => {
    setViewingId(row.id);
  }, []);

  const handleEdit = useCallback((row: LuongThietLapBacRow) => {
    startTransition(() => {
      setEditing(row);
      setShowForm(true);
      setViewingId(null);
    });
  }, []);

  const handleEditFromDetail = useCallback((row: LuongThietLapBacRow) => {
    setViewingId(null);
    setEditing(row);
    setShowForm(true);
  }, []);

  const handleDeleteBac = useCallback(
    (row: LuongThietLapBacRow) => {
      if (!selectedNgachId) return;
      confirm({
        title: txt('matTranThietLapLuong.bac.deleteTitle'),
        message: txt('matTranThietLapLuong.bac.deleteMessage', { ma: row.ma_bac }),
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: async () => {
          deleteBac.mutate(
            { id: row.id, ngachId: selectedNgachId },
            {
              onSuccess: () => {
                setViewingId((v) => (v === row.id ? null : v));
              },
            },
          );
        },
      });
    },
    [confirm, deleteBac, selectedNgachId],
  );

  const handleSaveMlcs = () => {
    if (!canEdit) return;
    if (!Number.isFinite(mlcsDraft) || mlcsDraft <= 0) return;
    updateMlcs.mutate(mlcsDraft);
  };

  const mlcsDirty = Math.abs(mlcsDraft - mlcsNum) > 1e-6;

  const viewingRow = useMemo(
    () => (viewingId ? bacRows.find((r) => r.id === viewingId) ?? null : null),
    [bacRows, viewingId],
  );

  const mlcsToolbarSlot = (
    <div
      className="flex shrink-0 flex-nowrap items-center gap-2"
      title={txt('matTranThietLapLuong.bac.mlcsHint')}
    >
      <span className="hidden text-xs font-medium text-muted-foreground whitespace-nowrap lg:inline">
        {txt('matTranThietLapLuong.bac.mlcsToolbarLabel')}
      </span>
      <div className="w-[min(220px,52vw)] min-w-[168px] sm:min-w-[192px] sm:w-56 shrink-0 [&>div]:w-full">
        <CurrencyInput
          icon={Banknote}
          value={mlcsDraft}
          onChange={(n) => setMlcsDraft(n)}
          disabled={!canEdit}
          suffix="đ"
          className="h-9 py-1.5 text-sm"
        />
      </div>
      {canEdit ? (
        <Button
          type="button"
          size="sm"
          className="h-9 shrink-0 px-3 text-xs sm:text-sm"
          disabled={!mlcsDirty || updateMlcs.isPending}
          onClick={handleSaveMlcs}
        >
          {txt('matTranThietLapLuong.bac.saveMlcs')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative z-0">
        <LuongBacToolbar
          onPageBack={onPageBack}
          tabsSlot={tabsSlot}
          ngachOptions={ngachOptions}
          selectedNgachId={selectedNgachId}
          onNgachChange={setSelectedNgachId}
          mlcsToolbarSlot={mlcsToolbarSlot}
          onAdd={canCreate ? handleAdd : undefined}
          addDisabled={!selectedNgachId || missingCodesForCreate.length === 0 || deleteBac.isPending}
        />

        <div className="flex-1 min-h-0 flex flex-col min-w-0 overflow-auto overscroll-contain">
          <div className="flex-1 min-h-0 p-3 sm:p-4 min-w-0">
            <LuongBacTable
              data={sorted}
              isLoading={bacLoading}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDeleteBac}
              emptyTitle={emptyTitleResolved}
              emptyDescription={emptyDescriptionResolved}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && selectedNgachId && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <LuongBacForm
              ngachId={selectedNgachId}
              ngachLabel={selectedNgachLabel}
              initialData={editing}
              missingCodesForCreate={missingCodesForCreate}
              onClose={handleCloseForm}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingRow && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <LuongBacDetail
              data={viewingRow}
              ngachLabel={selectedNgachLabel}
              mucLuongCoSoPreview={mlcsDraft}
              onClose={() => setViewingId(null)}
              onEdit={handleEditFromDetail}
              onDelete={handleDeleteBac}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LuongBacTabPanel;
