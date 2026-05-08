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

import ToggleSwitch from '../../../components/ui/ToggleSwitch';
import { queryKeys } from '@/lib/query-keys';
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
import { getDepartments } from '../phong-ban/services/phong-ban-service';
import { getPositions } from '../chuc-vu/services/chuc-vu-service';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import EmployeeToolbar from './components/nhan-vien-toolbar';
import EmployeeTable from './components/nhan-vien-table';

import { useEmployees, useDeleteWithUndo, useUpdateStatusEmployee } from './hooks/use-nhan-vien';
import { getEmployeeById } from './services/nhan-vien-service';
import { useEmployeeStore } from './store/useEmployeeStore';
import { Employee } from './core/types';
import { STATUS_OPTIONS, type TrangThaiNhanVien } from './core/constants';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL, CONFIRM_YES } from '../../../lib/button-labels';
import { getLanguage } from '../../../lib/utils';
import { useListWithFilter } from '../../../lib/hooks';
import { matchesSearchTerm } from '../../../lib/searchUtils';
import { employeeMatchesColumnSearch } from './utils/column-search';

const EmployeeForm = lazy(() => import('./components/nhan-vien-form'));
const EmployeeDetail = lazy(() => import('./components/nhan-vien-detail'));

/** Chọn trạng thái Hoạt động / Khóa trong dialog xác nhận (có state để switch hiển thị đúng). */
const EmployeeStatusSwitchPicker: React.FC<{
  initial: TrangThaiNhanVien;
  onSelectionChange: (s: TrangThaiNhanVien) => void;
}> = ({ initial, onSelectionChange }) => {
  const [st, setSt] = useState<TrangThaiNhanVien>(initial);
  return (
    <ToggleSwitch
      checked={st === 'Hoạt động'}
      onChange={(checked) => {
        const next: TrangThaiNhanVien = checked ? 'Hoạt động' : 'Khóa';
        setSt(next);
        onSelectionChange(next);
      }}
      label={txt('common.status')}
      description={
        st === 'Hoạt động'
          ? txt('employee.form.statusSwitchActiveHint')
          : txt('employee.form.statusSwitchLockedHint')
      }
    />
  );
};

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

const NHAN_VIEN_SEARCHABLE_KEYS: string[] = [
  'ten_tai_khoan',
  'ho_va_ten',
  'ten_phong_ban',
  'ten_bo_phan',
  'ten_chuc_vu',
  'trang_thai',
];

const EmployeePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'employees');
  const navigate = useNavigate();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('employee.noViewPermission'));
    navigate('/he-thong', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');

  const viewingEmpRef = useRef<Employee | null>(null);
  const editingEmpRef = useRef<Employee | null>(null);
  const formOriginRef = useRef<FormOrigin>('list');
  const employeesRef = useRef<Employee[]>([]);

  const {
    searchTerm, filters, sort,
    resetState, clearSelection,
  } = useEmployeeStore();

  const queryClient = useQueryClient();
  const { data: employees = [], isLoading } = useEmployees({ enabled: canView });

  useEffect(() => { viewingEmpRef.current = viewingEmp; }, [viewingEmp]);
  useEffect(() => { editingEmpRef.current = editingEmp; }, [editingEmp]);
  useEffect(() => { formOriginRef.current = formOrigin; }, [formOrigin]);
  useEffect(() => { employeesRef.current = employees; }, [employees]);

  /** Prefetch master data cho form. */
  useEffect(() => {
    if (!canView) return;
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
  }, [queryClient, canView]);

  const { deleteWithUndo } = useDeleteWithUndo();
  const statusMutation = useUpdateStatusEmployee();
  const confirm = useConfirmStore((s) => s.confirm);

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  // Đồng bộ viewing với list sau refetch (action từ detail hoặc nơi khác)
  useEffect(() => {
    if (!viewingEmp) return;
    const fresh = employees.find((e) => e.id === viewingEmp.id);
    if (fresh && fresh !== viewingEmp) queueMicrotask(() => setViewingEmp(fresh));
  }, [employees, viewingEmp]);

  const filterFn = useCallback(
    (emp: Employee, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        emp as unknown as Record<string, unknown>,
        term,
        NHAN_VIEN_SEARCHABLE_KEYS,
      );
      const matchesStatus = f.trang_thai.length === 0 || f.trang_thai.includes(emp.trang_thai);
      const matchesDept =
        f.id_phong_ban.length === 0 ||
        (emp.id_phong_ban != null && f.id_phong_ban.includes(emp.id_phong_ban));
      const matchesPos =
        f.id_chuc_vu.length === 0 ||
        (emp.id_chuc_vu != null && f.id_chuc_vu.includes(emp.id_chuc_vu));
      const matchesColumnText = employeeMatchesColumnSearch(emp, f.columnSearch);
      return matchesSearch && matchesStatus && matchesDept && matchesPos && matchesColumnText;
    },
    [],
  );

  const filteredEmployees = useListWithFilter(employees, searchTerm, filters, filterFn);

  const sortedEmployees = useMemo(() => {
    if (!sort.column || !sort.direction) return filteredEmployees;
    const sorted = [...filteredEmployees];
    sorted.sort((a, b) => {
      const key = sort.column as keyof Employee;
      const aVal = a[key] ?? '';
      const bVal = b[key] ?? '';
      const cmp =
        typeof aVal === 'number' && typeof bVal === 'number'
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal), getLanguage());
      return sort.direction === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredEmployees, sort]);

  /**
   * Mở form sửa: list không còn ship `hinh_anh` (P1.1) nên cần fetch full row qua
   * cache TanStack Query trước khi gán `editingEmp` để form pre-fill avatar đúng.
   */
  const handleEdit = useCallback(
    (item: Employee) => {
      const origin: FormOrigin = viewingEmpRef.current ? 'detail' : 'list';
      void (async () => {
        try {
          const full = await queryClient.fetchQuery({
            queryKey: queryKeys.employees.detail(item.id),
            queryFn: () => getEmployeeById(item.id),
            ...defaultServerQueryOptions,
          });
          startTransition(() => {
            setFormOrigin(origin);
            setEditingEmp((full ?? item) as Employee);
            setShowForm(true);
          });
        } catch {
          startTransition(() => {
            setFormOrigin(origin);
            setEditingEmp(item);
            setShowForm(true);
          });
        }
      })();
    },
    [queryClient],
  );

  /** Detail drawer: prefetch full row (có `hinh_anh`) qua cache để tránh ship lặp lại trong list. */
  const handleView = useCallback(
    (item: Employee) => {
      void (async () => {
        try {
          const full = await queryClient.fetchQuery({
            queryKey: queryKeys.employees.detail(item.id),
            queryFn: () => getEmployeeById(item.id),
            ...defaultServerQueryOptions,
          });
          startTransition(() => setViewingEmp((full ?? item) as Employee));
        } catch {
          startTransition(() => setViewingEmp(item));
        }
      })();
    },
    [queryClient],
  );

  const closeDetail = useCallback(() => setViewingEmp(null), []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    const ed = editingEmpRef.current;
    if (formOriginRef.current === 'detail' && ed) {
      const fresh = employeesRef.current.find((e) => e.id === ed.id);
      setViewingEmp(fresh ?? null);
    }
    setEditingEmp(null);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      const emp = employeesRef.current.find((e) => e.id === id);
      if (!emp) return;
      confirm({
        title: txt('employee.deleteConfirmTitle'),
        message: `${txt('employee.deleteConfirmMessage')} "${emp.ho_va_ten}"? ${txt('employee.deleteConfirmNote')}`,
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
    [confirm, deleteWithUndo],
  );

  const handleStatusChange = useCallback(
    (item: Employee) => {
      let selectedStatus: TrangThaiNhanVien = item.trang_thai;
      confirm({
        title: txt('employee.statusChangeTitle'),
        message: (
          <div className="space-y-4 text-left py-2">
            <p className="text-sm">
              {txt('employee.statusChangeMessage')} <strong>{item.ho_va_ten}</strong>:
            </p>
            <EmployeeStatusSwitchPicker
              initial={item.trang_thai}
              onSelectionChange={(s) => {
                selectedStatus = s;
              }}
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
    [confirm, statusMutation],
  );

  const handleDeleteMany = (ids: string[]) => {
    const emps = employees.filter((e) => ids.includes(e.id));
    confirm({
      title: txt('employee.bulkDeleteTitle'),
      message: txt('employee.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        await deleteWithUndo(emps, { onDone: clearSelection });
      },
    });
  };

  const handleStatusChangeMany = (ids: string[], status: TrangThaiNhanVien) => {
    const label = STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
    confirm({
      title: txt('employee.bulkStatusTitle'),
      message: `${txt('employee.bulkStatusMessage', { count: ids.length })} "${label}"?`,
      variant: 'warning',
      confirmText: CONFIRM_YES(),
      onConfirm: async () => {
        await statusMutation.mutateAsync({ ids, status });
        clearSelection();
      },
    });
  };

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('employee.title')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <EmployeeToolbar
          employees={employees}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setShowForm(true);
            });
          }}
          onDeleteMany={handleDeleteMany}
          onStatusChangeMany={handleStatusChangeMany}
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
              onStatusChange={handleStatusChange}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployeePage;
