import React, { useState, useCallback, useEffect, useMemo, lazy, Suspense, startTransition } from 'react';
import { txt } from '../../../lib/text';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import PhongBanToolbar from './components/phong-ban-toolbar';
import DepartmentList from './components/phong-ban-list';
import ExportDialog from '../../../components/shared/ExportDialog';
import ImportDialog from '../../../components/shared/ImportDialog';
import { useDepartments, useDeleteDepartment, useUpdateStatusDepartment, useImportDepartments } from './hooks/use-phong-ban';
import { useDepartmentStore } from './store/useDepartmentStore';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL, CONFIRM_YES } from '../../../lib/button-labels';
import { useListWithFilter } from '../../../lib/hooks';
import { useExportData } from '../../../lib/useExportData';
import { DRAWER_WIDTH_DETAIL_SMALL, DRAWER_Z_CONTENT_BASE } from '../../../lib/dialog-sizes';
import { Department } from './core/types';
import type { DepartmentFormValues } from './core/schema';
import { parseTrangThaiHoatDongImport } from '../../../lib/constants/trang-thai';
import { departmentMatchesColumnSearch } from './utils/column-search';
import { compareDepartments } from './utils/department-sort';
import { matchesSearchTerm } from '../../../lib/searchUtils';
import { DEPARTMENT_SEARCHABLE_KEYS } from './utils/search-keys';

const DepartmentForm = lazy(() => import('./components/phong-ban-form'));
const DepartmentDetail = lazy(() => import('./components/phong-ban-detail'));

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

const DepartmentPage = () => {
  const confirm = useConfirmStore((s) => s.confirm);
  const {
    searchTerm,
    filters,
    resetState,
    selectedIds,
    columns,
    sort,
    clearSelection,
    toggleSelection,
    toggleAllSelection,
  } = useDepartmentStore();

  const [showForm, setShowForm] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  /** Drawer chi tiết xếp chồng: [gốc từ danh sách, con, cháu, …]. Đóng tầng i → slice(0, i). */
  const [detailStack, setDetailStack] = useState<Department[]>([]);
  const [addChildOf, setAddChildOf] = useState<Department | null>(null);
  const [formOrigin, setFormOrigin] = useState<'list' | 'detail'>('list');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data: departments = [], isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();
  const statusMutation = useUpdateStatusDepartment();
  const importMutation = useImportDepartments(() => setShowImport(false));

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_phong_ban', label: txt('department.name'), required: true },
      { key: 'mo_ta', label: txt('department.store.descCol') },
      { key: 'cha_id', label: txt('department.detail.parent') },
      { key: 'thu_tu', label: txt('department.detail.order') },
      { key: 'trang_thai', label: txt('common.status') },
    ],
    []
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  // Đồng bộ từng phần tử stack với dữ liệu mới sau refetch
  useEffect(() => {
    queueMicrotask(() => {
      setDetailStack((stack) => {
        if (stack.length === 0) return stack;
        return stack
          .map((d) => departments.find((x) => x.id === d.id))
          .filter((x): x is Department => x != null);
      });
    });
  }, [departments]);

  const filterFn = useCallback(
    (item: Department, term: string, f: typeof filters) => {
      const parentName = item.cha_id
        ? departments.find((p) => p.id === item.cha_id)?.ten_phong_ban ?? ''
        : '';
      const matchesSearch = matchesSearchTerm(
        { ...(item as unknown as Record<string, unknown>), ten_phong_cha: parentName },
        term,
        DEPARTMENT_SEARCHABLE_KEYS
      );
      const matchesCol = departmentMatchesColumnSearch(item, f.columnSearch, parentName);
      const statusKey = item.trang_thai === 'Đang hoạt động' ? 'Active' : 'Inactive';
      const matchesStatus = f.status.length === 0 || f.status.includes(statusKey);
      const matchesPhong =
        f.id_phong_goc.length === 0 ||
        (() => {
          const visibleIds = new Set<string>();
          let current = new Set<string>(f.id_phong_goc);
          while (current.size > 0) {
            current.forEach((id) => visibleIds.add(id));
            const next = new Set<string>();
            departments.forEach((d) => {
              if (d.cha_id && current.has(d.cha_id)) next.add(d.id);
            });
            current = next;
          }
          return visibleIds.has(item.id);
        })();
      return matchesSearch && matchesCol && matchesStatus && matchesPhong;
    },
    [departments]
  );

  const filteredDepartments = useListWithFilter(
    departments,
    searchTerm,
    filters,
    filterFn
  );

  const sortedFilteredDepartments = useMemo(() => {
    const list = [...filteredDepartments];
    const { column, direction } = sort;
    if (!column || !direction) return list;
    const mul = direction === 'asc' ? 1 : -1;
    list.sort((a, b) => mul * compareDepartments(a, b, column, departments));
    return list;
  }, [filteredDepartments, sort, departments]);

  useEffect(() => {
    queueMicrotask(() => setPage(1));
  }, [sortedFilteredDepartments.length]);

  const maxPage = Math.max(1, Math.ceil(sortedFilteredDepartments.length / pageSize));
  useEffect(() => {
    queueMicrotask(() => setPage((p) => Math.min(p, maxPage)));
  }, [pageSize, maxPage]);

  const exportPagination = useMemo(
    () => ({ page: 1, pageSize: Math.max(sortedFilteredDepartments.length, 1) }),
    [sortedFilteredDepartments.length]
  );

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_phong_ban', label: txt('department.exportName') },
      { key: 'mo_ta', label: txt('department.store.descCol') },
      { key: 'cap_do', label: txt('department.exportLevel') },
      { key: 'thu_tu', label: txt('department.exportOrder') },
      { key: 'trang_thai_text', label: txt('department.exportStatus') },
    ],
    []
  );

  const exportMapFn = useCallback(
    (item: Department) => ({
      ten_phong_ban: item.ten_phong_ban,
      mo_ta: item.mo_ta ?? '',
      cap_do: item.cap_do,
      thu_tu: item.thu_tu,
      trang_thai_text:
        item.trang_thai === 'Đang hoạt động' ? txt('department.active') : txt('department.inactive'),
    }),
    []
  );

  const {
    exportData,
    paginatedData: paginatedExportData,
    selectedData: selectedExportData,
  } = useExportData({
    data: sortedFilteredDepartments,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination: exportPagination,
    selectedIds,
    keyExtractor: (item) => item.id,
  });

  const visibleColumnKeys = useMemo(
    () => EXPORT_COLUMNS.map((c) => c.key),
    [EXPORT_COLUMNS]
  );

  const handleEdit = (item: Department) => {
    setFormOrigin(detailStack.length > 0 ? 'detail' : 'list');
    setDetailStack((s) => (s.length ? [s[0]] : []));
    setEditingDept(item);
    startTransition(() => setShowForm(true));
  };

  const handleDelete = (id: string) => {
    if (detailStack.length > 1) setDetailStack((s) => (s.length ? [s[0]] : []));
    confirm({
      title: txt('department.deleteTitle'),
      message: txt('department.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate(id, {
          onSuccess: () => {
            setDetailStack((s) => {
              const idx = s.findIndex((d) => d.id === id);
              if (idx < 0) return s;
              return s.slice(0, idx);
            });
          },
        });
      },
    });
  };

  const handleStatusChange = (item: Department) => {
    const newStatus = item.trang_thai === 'Đang hoạt động' ? 'Ngừng hoạt động' : 'Đang hoạt động';
    const statusLabel = newStatus === 'Đang hoạt động' ? txt('department.active') : txt('department.inactive');
    confirm({
      title: txt('department.statusChangeTitle'),
      message: txt('department.statusChangeMessage', { name: item.ten_phong_ban, status: statusLabel }),
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        statusMutation.mutate(
          { id: item.id, status: newStatus },
          {
            onSuccess: (updated) => {
              setDetailStack((s) => s.map((d) => (d.id === updated.id ? updated : d)));
            },
          }
        );
      },
    });
  };

  const handleDeleteMany = () => {
    const ids = Array.from(selectedIds);
    confirm({
      title: txt('department.deleteTitle'),
      message: txt('common.deleteManyConfirm', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        for (const id of ids) {
          await deleteMutation.mutateAsync(id).catch(() => {});
        }
        clearSelection();
        setDetailStack((s) => s.filter((d) => !ids.includes(d.id)));
      },
    });
  };

  const handleStatusChangeMany = (status: import('@/lib/constants/trang-thai').TrangThaiHoatDong) => {
    const ids = Array.from(selectedIds);
    const statusLabel = status === 'Đang hoạt động' ? txt('department.active') : txt('department.inactive');
    confirm({
      title: txt('department.statusChangeTitle'),
      message: txt('common.statusChangeManyConfirm', { count: ids.length, status: statusLabel }),
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        for (const id of ids) {
          await statusMutation.mutateAsync({ id, status });
        }
        clearSelection();
      },
    });
  };

  const handleImportData = async (data: Record<string, unknown>[]) => {
    const rows: DepartmentFormValues[] = data.map((row) => ({
      ten_phong_ban: String(row.ten_phong_ban ?? '').trim(),
      mo_ta: row.mo_ta != null ? String(row.mo_ta).trim() : undefined,
      cha_id: row.cha_id != null && String(row.cha_id).trim() !== '' ? String(row.cha_id).trim() : '',
      thu_tu: Number(row.thu_tu) || 0,
      trang_thai: parseTrangThaiHoatDongImport(row.trang_thai),
    }));
    await importMutation.mutateAsync(rows);
  };

  const handleCloseForm = () => {
    const wasEditing = editingDept;
    setShowForm(false);
    setAddChildOf(null);
    if (formOrigin === 'detail' && wasEditing && detailStack[0]?.id === wasEditing.id) {
      const fresh = departments.find((d) => d.id === wasEditing.id);
      setDetailStack((s) => {
        if (s.length === 0) return s;
        if (!fresh) return [];
        return [fresh, ...s.slice(1)];
      });
    }
    setEditingDept(null);
    setFormOrigin('list');
  };

  const handleAddChild = (parent: Department) => {
    setDetailStack((s) => (s.length ? [s[0]] : []));
    setAddChildOf(parent);
    setEditingDept(null);
    setFormOrigin('detail');
    startTransition(() => setShowForm(true));
  };

  const handleExport = () => {
    if (sortedFilteredDepartments.length === 0) {
      toast.warning(txt('department.noExportData'));
      return;
    }
    setShowExport(true);
  };


  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <PhongBanToolbar
          departments={departments}
          selectedCount={selectedIds.size}
          onAdd={() => {
            setFormOrigin('list');
            startTransition(() => setShowForm(true));
          }}
          onExport={handleExport}
          onImport={() => setShowImport(true)}
          onDeleteMany={handleDeleteMany}
          onStatusChangeMany={handleStatusChangeMany}
        />

        <div className="flex-1 min-h-0 flex flex-col">
          <DepartmentList
            data={sortedFilteredDepartments}
            allDepartments={departments}
            columns={columns}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAllSelection={toggleAllSelection}
            isLoading={isLoading}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onView={(d) => startTransition(() => setDetailStack([d]))}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <DepartmentForm
              initialData={editingDept}
              allDepartments={departments}
              onClose={handleCloseForm}
              defaultParentId={addChildOf?.id}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailStack.length > 0 && !showForm ? (
          <Suspense fallback={<DrawerLazyFallback />}>
            <>
              {detailStack.map((dept, index) => (
                <DepartmentDetail
                  key={`${dept.id}-${index}`}
                  data={dept}
                  allDepartments={departments}
                  onClose={() => setDetailStack((s) => s.slice(0, index))}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onAddChild={handleAddChild}
                  onViewChild={(child) => {
                    setDetailStack((s) => {
                      const last = s[s.length - 1];
                      if (!last || child.cha_id !== last.id) return s;
                      return [...s, child];
                    });
                  }}
                  maxWidthClass={index > 0 ? DRAWER_WIDTH_DETAIL_SMALL : undefined}
                  stackLevel={index}
                />
              ))}
            </>
          </Suspense>
        ) : null}
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
            fileName="Danh_Sach_Phong_Ban"
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
            templateFileName={txt('department.importTemplateName')}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentPage;
