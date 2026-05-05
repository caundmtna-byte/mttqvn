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
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { List, BarChart3 } from 'lucide-react';
import TabGroup, { Tab } from '../../../components/ui/TabGroup';
import Combobox from '../../../components/ui/Combobox';
import { queryKeys } from '@/lib/query-keys';
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
import { getDepartments } from '../phong-ban/services/phong-ban-service';
import { getPositions } from '../chuc-vu/services/chuc-vu-service';
import { getJobLevels } from '../cap-bac/services/cap-bac-service';
import { getBranches } from '../chi-nhanh/services/chi-nhanh-service';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import EmployeeToolbar from './components/nhan-vien-toolbar';
import EmployeeTable from './components/nhan-vien-table';
import EmployeeStats from './components/nhan-vien-stats';
import BulkEditSheet from './components/nhan-vien-bulk-edit';
import ImportDialog from '../../../components/shared/ImportDialog';
import ExportDialog from '../../../components/shared/ExportDialog';

import { useEmployees, useDeleteWithUndo, useUpdateStatusEmployee } from './hooks/use-nhan-vien';
import { useEmployeeStore } from './store/useEmployeeStore';
import { Employee } from './core/types';
import { STATUS_OPTIONS, type TrangThaiNhanVien } from './core/constants';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL, CONFIRM_YES } from '../../../lib/button-labels';
import { formatDate, getLanguage } from '../../../lib/utils';
import { useListWithFilter } from '../../../lib/hooks';
import { matchesSearchTerm } from '../../../lib/searchUtils';
import { employeeMatchesColumnSearch } from './utils/column-search';
import { useExportData } from '../../../lib/useExportData';

const EmployeeForm = lazy(() => import('./components/nhan-vien-form'));
const EmployeeDetail = lazy(() => import('./components/nhan-vien-detail'));

/** Spinner khi lazy-load chunk form/detail — cùng tầng z với drawer */
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

/** Tất cả cột + trường enriched để tìm kiếm. */
const NHAN_VIEN_SEARCHABLE_KEYS: string[] = [
  'ma_nhan_vien',
  'ho_ten',
  'ten_chuc_vu',
  'email',
  'so_dien_thoai',
  'ngay_vao_lam',
  'gioi_tinh',
  'trang_thai',
  'ngay_sinh',
  'ten_phong_ban',
  'ten_cap_bac',
  'loai_hop_dong',
  'ten_chi_nhanh',
  'noi_lam_viec',
  'tinh_thanh',
  'trinh_do_hoc_van',
  'cmnd_cccd',
  'created_at',
  'trang_thai_text',
  'ngay_vao_lam_text',
];

const VALID_TABS = ['list', 'stats'] as const;
type TabId = (typeof VALID_TABS)[number];

const EmployeePage: React.FC = () => {
  const IMPORT_COLUMNS = useMemo(() => [
    { key: 'ho_ten', label: txt('employee.name'), required: true },
    { key: 'ma_nhan_vien', label: txt('employee.code'), required: true },
    { key: 'email', label: txt('employee.email'), required: true },
    { key: 'so_dien_thoai', label: txt('employee.phone') },
    { key: 'gioi_tinh', label: txt('employee.gender') },
    { key: 'ngay_vao_lam', label: txt('employee.hireDate') },
  ], []);

  const EXPORT_COLUMNS = useMemo(() => [
    { key: 'ma_nhan_vien', label: txt('employee.code') },
    { key: 'ho_ten', label: txt('employee.name') },
    { key: 'gioi_tinh', label: txt('employee.gender') },
    { key: 'email', label: txt('employee.email') },
    { key: 'so_dien_thoai', label: txt('employee.phone') },
    { key: 'ten_chuc_vu', label: txt('employee.position') },
    { key: 'ten_phong_ban', label: txt('employee.department') },
    { key: 'ten_chi_nhanh', label: txt('employee.detail.branch') },
    { key: 'trang_thai_text', label: txt('employee.status') },
    { key: 'ngay_vao_lam_text', label: txt('employee.hireDate') },
  ], []);

  const TABS: Tab[] = useMemo(() => [
    { id: 'list', label: txt('employee.tabList'), icon: List },
    { id: 'stats', label: txt('employee.tabStats'), icon: BarChart3 },
  ], []);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    (VALID_TABS as readonly string[]).includes(tabFromUrl ?? '') ? (tabFromUrl as TabId) : 'list'
  );

  useEffect(() => {
    if ((VALID_TABS as readonly string[]).includes(tabFromUrl ?? '')) {
      queueMicrotask(() => setActiveTab(tabFromUrl as TabId));
    }
  }, [tabFromUrl]);

  const handleTabChange = useCallback((id: string) => {
    if (!(VALID_TABS as readonly string[]).includes(id)) return;
    setActiveTab(id as TabId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', id);
      return next;
    });
  }, [setSearchParams]);
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const viewingEmpRef = useRef<Employee | null>(null);
  const editingEmpRef = useRef<Employee | null>(null);
  const formOriginRef = useRef<FormOrigin>('list');
  const employeesRef = useRef<Employee[]>([]);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns, setFilter } = useEmployeeStore();

  const queryClient = useQueryClient();
  const { data: employees = [], isLoading } = useEmployees();

  useEffect(() => {
    viewingEmpRef.current = viewingEmp;
  }, [viewingEmp]);
  useEffect(() => {
    editingEmpRef.current = editingEmp;
  }, [editingEmp]);
  useEffect(() => {
    formOriginRef.current = formOrigin;
  }, [formOrigin]);
  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  /** Prefetch master data cho form — mở drawer không chờ 4 request lạnh */
  useEffect(() => {
    const opts = defaultServerQueryOptions;
    void queryClient.prefetchQuery({
      queryKey: queryKeys.departments.all,
      queryFn: getDepartments,
      ...opts,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.positions.all,
      queryFn: getPositions,
      ...opts,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.jobLevels.all,
      queryFn: getJobLevels,
      ...opts,
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.branches.all,
      queryFn: getBranches,
      ...opts,
    });
  }, [queryClient]);
  const { deleteWithUndo } = useDeleteWithUndo();
  const statusMutation = useUpdateStatusEmployee();
  const confirm = useConfirmStore(state => state.confirm);

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  // Đồng bộ viewing với list sau refetch (action từ detail hoặc từ nơi khác)
  useEffect(() => {
    if (!viewingEmp) return;
    const fresh = employees.find((e) => e.id === viewingEmp.id);
    if (fresh && fresh !== viewingEmp) queueMicrotask(() => setViewingEmp(fresh));
  }, [employees, viewingEmp]);

  const filterFn = useCallback((emp: Employee, term: string, f: typeof filters) => {
    const matchesSearch = matchesSearchTerm(
      emp as Record<string, unknown>,
      term,
      NHAN_VIEN_SEARCHABLE_KEYS
    );
    const matchesStatus = f.trang_thai.length === 0 || f.trang_thai.includes(emp.trang_thai);
    const matchesDept = f.phong_ban_id.length === 0 || (emp.phong_ban_id && f.phong_ban_id.includes(emp.phong_ban_id));
    const matchesPosition = f.position.length === 0 || (emp.chuc_vu_id && f.position.includes(emp.chuc_vu_id));
    const matchesColumnText = employeeMatchesColumnSearch(emp, f.columnSearch);
    return matchesSearch && matchesStatus && matchesDept && matchesPosition && matchesColumnText;
  }, []);

  const filteredEmployees = useListWithFilter(employees, searchTerm, filters, filterFn);

  /** Map id cột UI → khóa sort trên Employee (cột cũ lien_he = so_dien_thoai). */
  const employeeSortKey = useCallback((columnId: string): keyof Employee => {
    if (columnId === 'lien_he' || columnId === 'so_dien_thoai') return 'so_dien_thoai';
    return columnId as keyof Employee;
  }, []);

  // Client-side sort
  const sortedEmployees = useMemo(() => {
    if (!sort.column || !sort.direction) return filteredEmployees;
    const sorted = [...filteredEmployees];
    sorted.sort((a: Employee, b: Employee) => {
      const key = employeeSortKey(sort.column!);
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), getLanguage());
      return sort.direction === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredEmployees, sort, employeeSortKey]);

  // Export data — hook tái sử dụng, lazy khi showExport
  const exportMapFn = useCallback((emp: Employee) => ({
    ma_nhan_vien: emp.ma_nhan_vien,
    ho_ten: emp.ho_ten,
    gioi_tinh: emp.gioi_tinh,
    email: emp.email,
    so_dien_thoai: emp.so_dien_thoai,
    ten_chuc_vu: emp.ten_chuc_vu,
    ten_phong_ban: emp.ten_phong_ban,
    ten_chi_nhanh: emp.ten_chi_nhanh,
    trang_thai_text: emp.trang_thai,
    ngay_vao_lam_text: formatDate(emp.ngay_vao_lam),
  }), []);

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: filteredEmployees,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (emp) => emp.id,
  });

  const visibleColumnKeys = useMemo(() => columns.filter(c => c.visible).map(c => c.id), [columns]);

  const handleEdit = useCallback((item: Employee) => {
    startTransition(() => {
      setFormOrigin(viewingEmpRef.current ? 'detail' : 'list');
      setEditingEmp(item);
      setShowForm(true);
    });
  }, []);

  const handleView = useCallback((item: Employee) => {
    startTransition(() => setViewingEmp(item));
  }, []);

  const closeDetail = useCallback(() => setViewingEmp(null), []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    const ed = editingEmpRef.current;
    if (formOriginRef.current === 'detail' && ed) {
      const freshData = employeesRef.current.find((e) => e.id === ed.id);
      setViewingEmp(freshData ?? null);
    }
    setEditingEmp(null);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const emp = employeesRef.current.find((e) => e.id === id);
      if (!emp) return;
      confirm({
        title: txt('employee.deleteConfirmTitle'),
        message: `${txt('employee.deleteConfirmMessage')} "${emp.ho_ten}"? ${txt('employee.deleteConfirmNote')}`,
        variant: 'danger',
        confirmText: CONFIRM_DELETE(),
        onConfirm: async () => {
          await deleteWithUndo([emp], {
            onDone: () => {
              if (viewingEmpRef.current?.id === id) setViewingEmp(null);
              if (editingEmpRef.current?.id === id) setShowForm(false);
            },
          });
        },
      });
    },
    [confirm, deleteWithUndo]
  );

  const handleStatusChange = useCallback(
    (item: Employee) => {
      let selectedStatus: Employee['trang_thai'] = item.trang_thai;

      confirm({
        title: txt('employee.statusChangeTitle'),
        message: (
          <div className="space-y-4 text-left py-2">
            <p className="text-sm">
              {txt('employee.statusChangeMessage')} <strong>{item.ho_ten}</strong>:
            </p>
            <Combobox
              value={item.trang_thai}
              options={STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
              onChange={(v) => {
                selectedStatus = v as Employee['trang_thai'];
              }}
              searchable={false}
              dropdownInPortal
            />
          </div>
        ),
        variant: 'info',
        confirmText: CONFIRM_YES(),
        onConfirm: async () => {
          await statusMutation.mutateAsync({ ids: [item.id], status: selectedStatus });
        },
      });
    },
    [confirm, statusMutation]
  );

  const handleDeleteMany = (ids: string[]) => {
      const emps = employees.filter(e => ids.includes(e.id));
      confirm({
          title: txt('employee.bulkDeleteTitle'),
          message: txt('employee.bulkDeleteMessage', { count: ids.length }),
          variant: "danger",
          confirmText: CONFIRM_DELETE_ALL(),
          onConfirm: async () => {
              await deleteWithUndo(emps, { onDone: clearSelection });
          }
      });
  };

  const handleStatusChangeMany = (ids: string[], status: TrangThaiNhanVien) => {
      confirm({
          title: txt('employee.bulkStatusTitle'),
          message: `${txt('employee.bulkStatusMessage', { count: ids.length })} "${status}"?`,
          variant: "warning",
          confirmText: CONFIRM_YES(),
          onConfirm: async () => {
              await statusMutation.mutateAsync({ ids, status });
              clearSelection();
          }
      });
  };

  const handleImportData = async (data: Record<string, unknown>[]) => {
    // In real app, call API to bulk create employees
    toast.success(txt('employee.importSuccess', { count: data.length }));
  };

  return (
    <div className="flex flex-col h-page relative">
      {/* Tab: chỉ mobile — desktop TabGroup trong toolbar (list + thống kê) */}
      <div className="shrink-0 relative z-0 sm:hidden">
        <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
      </div>

      {activeTab === 'list' ? (
        <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
          <EmployeeToolbar
            employees={employees}
            desktopStartSlot={
              <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
            }
            onAdd={() => {
              startTransition(() => {
                setFormOrigin('list');
                setShowForm(true);
              });
            }}
            onExport={() => setShowExport(true)}
            onImport={() => setShowImport(true)}
            onDeleteMany={handleDeleteMany}
            onStatusChangeMany={handleStatusChangeMany}
            onBulkEdit={() => setShowBulkEdit(true)}
          />

          <div className="flex-1 min-h-0">
            <EmployeeTable
              data={sortedEmployees}
              isLoading={isLoading}
              employeesForFilterCounts={employees}
              onEdit={handleEdit}
              onView={handleView}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
          <EmployeeStats
            employees={employees}
            isLoading={isLoading}
            desktopToolbarStart={
              <TabGroup tabs={TABS} activeTab={activeTab} onChange={handleTabChange} />
            }
            onDrillDownDept={(deptId) => {
              setFilter('phong_ban_id', [deptId]);
              handleTabChange('list');
            }}
            onDrillDownStatus={(status) => {
              setFilter('trang_thai', [status]);
              handleTabChange('list');
            }}
          />
          </div>
        </div>
      )}

      <AnimatePresence mode="sync">
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <EmployeeForm
              key={editingEmp?.id ?? 'new'}
              initialData={editingEmp}
              onClose={closeForm}
            />
          </Suspense>
        )}
        {viewingEmp && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <EmployeeDetail
              data={viewingEmp}
              onClose={closeDetail}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
        {showImport && (
          <ImportDialog
            open={showImport}
            onClose={() => setShowImport(false)}
            columns={IMPORT_COLUMNS}
            onImport={handleImportData}
            templateFileName={txt('employee.importTemplateName')}
          />
        )}
        {showExport && (
          <ExportDialog
            open={showExport}
            onClose={() => setShowExport(false)}
            columns={EXPORT_COLUMNS}
            data={exportData}
            paginatedData={paginatedExportData}
            selectedData={selectedExportData}
            fileName={txt('employee.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
        {showBulkEdit && selectedIds.size > 0 && (
          <BulkEditSheet
            selectedEmployees={employees.filter(e => selectedIds.has(e.id))}
            onClose={() => setShowBulkEdit(false)}
            onSuccess={clearSelection}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeePage;
