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
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useStore';
import { useCan } from '../../../hooks/use-can';

import { EMPLOYEES_LIST_QUERY_PARAMS, queryKeys } from '@/lib/query-keys';
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
import { getDepartments } from '../phong-ban/services/phong-ban-service';
import { getPositions } from '../chuc-vu/services/chuc-vu-service';
import { usePositions } from '../chuc-vu/hooks/use-chuc-vu';
import { useDepartments } from '../phong-ban/hooks/use-phong-ban';
import { useQuery } from '@tanstack/react-query';
import { getXaPhuongAll } from '../danh-sach-tinh-thanh/services/dia-ban-service';
import { geoDataQueryOptions } from '@/lib/supabase/query-config';
import { useMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/hooks/use-mttq-thiet-lap';
import ImportDialog, {
  type ImportColumn,
  type ImportRunOptions,
  type ImportTemplateSheet,
} from '@/components/shared/ImportDialog';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { dryRunEmployeeImport, type NhanVienImportContext } from './services/nhan-vien-import';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import EmployeeToolbar from './components/nhan-vien-toolbar';
import EmployeeTable from './components/nhan-vien-table';

import { useEmployees, useDeleteWithUndo, useUpdateStatusEmployee, useImportEmployees, useResetEmployeePassword } from './hooks/use-nhan-vien';
import { getEmployeeById } from './services/nhan-vien-service';
import { useEmployeeStore } from './store/useEmployeeStore';
import { Employee } from './core/types';
import { STATUS_OPTIONS, type TrangThaiNhanVien } from './core/constants';
import { useConfirmStore } from '../../../store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL, CONFIRM_YES } from '../../../lib/button-labels';
import { getLanguage } from '../../../lib/utils';
import { useListWithFilter } from '../../../lib/hooks';
import { matchesSearchTerm } from '../../../lib/searchUtils';
import { NHAN_VIEN_SEARCHABLE_KEYS } from './utils/search-keys';
import { employeeMatchesColumnSearch } from './utils/column-search';
import { mergeEmployeeChucVuFromPositions } from './utils/merge-employee-chuc-vu-from-positions';
import { useNhanVienViewer, nhanVienRowVisible } from './hooks/use-nhan-vien-viewer';
import ToggleSwitch from '@/components/ui/ToggleSwitch';

const EmployeeForm = lazy(() => import('./components/nhan-vien-form'));
const EmployeeDetail = lazy(() => import('./components/nhan-vien-detail'));
const EmployeeStatusChangeDialog = lazy(() => import('./components/nhan-vien-status-change-dialog'));
const EmployeeResetPasswordDialog = lazy(() => import('./components/nhan-vien-doi-mat-khau-dialog'));

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

const employeesListQueryKey = queryKeys.employees.list({
  limit: EMPLOYEES_LIST_QUERY_PARAMS.limit,
  offset: EMPLOYEES_LIST_QUERY_PARAMS.offset,
  orderBy: EMPLOYEES_LIST_QUERY_PARAMS.orderBy,
  ascending: EMPLOYEES_LIST_QUERY_PARAMS.ascending,
});

const EmployeePage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'employees');
  const navigate = useNavigate();
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('employee.noViewPermission'));
    navigate('/he-thong', { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<Employee | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<Employee | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');

  const viewingEmpRef = useRef<Employee | null>(null);
  const editingEmpRef = useRef<Employee | null>(null);
  const formOriginRef = useRef<FormOrigin>('list');
  const employeesRef = useRef<Employee[]>([]);

  const {
    searchTerm, filters, sort,
    pagination, selectedIds, columns,
    resetState, clearSelection,
  } = useEmployeeStore();

  const queryClient = useQueryClient();
  const { data: employees = [], isLoading, isError, refetch } = useEmployees({ enabled: canView });
  const { data: positions = [] } = usePositions({ enabled: canView });
  // Bảng tra cứu cho file mẫu — chỉ tải khi cán bộ thật sự mở hộp thoại Nhập
  // (quy tắc egress: không kéo danh mục về cho mọi lượt xem trang).
  const importQueriesEnabled = canView && showImport;
  const { data: departmentsForImport = [] } = useDepartments({ enabled: importQueriesEnabled });
  const { data: thietLapAll = [] } = useMttqThietLapAll({ enabled: importQueriesEnabled });
  const { data: xaListForImport = [] } = useQuery({
    queryKey: queryKeys.xaPhuong.listAll,
    queryFn: getXaPhuongAll,
    enabled: importQueriesEnabled,
    ...geoDataQueryOptions,
  });
  const importMutation = useImportEmployees();

  const employeesDisplay = useMemo(
    () => employees.map((e) => mergeEmployeeChucVuFromPositions(e, positions)),
    [employees, positions],
  );

  /**
   * Phạm vi xem theo dòng — Xã phường thấy đơn vị mình, Tỉnh/quản trị thấy tất cả,
   * còn lại thấy phòng ban mình (luôn kèm hồ sơ của chính mình). Mọi thứ phía dưới
   * (bảng, bộ lọc, đếm, thao tác hàng loạt và **dữ liệu xuất file**) đều đọc từ đây,
   * để không có đường nào lấy ra được hồ sơ ngoài phạm vi.
   */
  const nhanVienViewer = useNhanVienViewer();
  const scopedEmployees = useMemo(
    () => employeesDisplay.filter((e) => nhanVienRowVisible(nhanVienViewer, e)),
    [employeesDisplay, nhanVienViewer],
  );

  useEffect(() => { viewingEmpRef.current = viewingEmp; }, [viewingEmp]);
  useEffect(() => { editingEmpRef.current = editingEmp; }, [editingEmp]);
  useEffect(() => { formOriginRef.current = formOrigin; }, [formOrigin]);
  useEffect(() => { employeesRef.current = scopedEmployees; }, [scopedEmployees]);

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
  const resetPasswordMutation = useResetEmployeePassword(() => setResetPasswordTarget(null));
  const confirm = useConfirmStore((s) => s.confirm);

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  // Đồng bộ viewing với dữ liệu server khi list thay đổi; đóng drawer nếu bản ghi không còn.
  // viewingEmp KHÔNG trong deps — đọc qua ref để tránh infinite loop.
  // Merge { ...viewing, ...row } để giữ hinh_anh (chỉ có trong detail query, không có trong list).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const viewing = viewingEmpRef.current;
    if (!viewing) return;
    const row = employees.find((e) => e.id === viewing.id);
    if (!row || !nhanVienRowVisible(nhanVienViewer, row)) {
      queueMicrotask(() => setViewingEmp(null));
      return;
    }
    const patched = { ...viewing, ...row };
    const merged = mergeEmployeeChucVuFromPositions(patched, positions);
    if (merged !== viewing) queueMicrotask(() => setViewingEmp(merged));
  }, [employees, positions, nhanVienViewer]);

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

  const filteredEmployees = useListWithFilter(scopedEmployees, searchTerm, filters, filterFn);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ten_tai_khoan', label: txt('employee.store.usernameCol') },
      { key: 'ho_va_ten', label: txt('employee.store.nameCol') },
      { key: 'ten_phong_ban', label: txt('employee.store.departmentCol') },
      { key: 'ten_bo_phan', label: txt('employee.store.unitCol') },
      { key: 'ten_chuc_vu', label: txt('employee.store.positionCol') },
      { key: 'cap_quan_ly', label: txt('position.store.managementLevelCol') },
      { key: 'ten_don_vi', label: txt('employee.store.donViCol') },
      { key: 'ten_to_chuc_arr', label: txt('matTranCanBo.store.toChucCol') },
      { key: 'trang_thai', label: txt('employee.store.statusCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: Employee) => ({
      ten_tai_khoan: item.ten_tai_khoan,
      ho_va_ten: item.ho_va_ten,
      ten_phong_ban: item.ten_phong_ban ?? '',
      ten_bo_phan: item.ten_bo_phan ?? '',
      ten_chuc_vu: item.ten_chuc_vu ?? '',
      cap_quan_ly: item.cap_quan_ly?.join(', ') ?? '',
      ten_don_vi: item.ten_don_vi ?? '',
      ten_to_chuc_arr: item.ten_to_chuc_arr?.join(', ') ?? '',
      trang_thai: item.trang_thai,
    }),
    [],
  );

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
          if (full == null) {
            queryClient.removeQueries({ queryKey: queryKeys.employees.detail(item.id) });
            queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
              old?.filter((e) => e.id !== item.id),
            );
            toast.error(txt('employee.service.notFound'));
            return;
          }
          startTransition(() => {
            setFormOrigin(origin);
            setEditingEmp(mergeEmployeeChucVuFromPositions(full, positions));
            setShowForm(true);
          });
        } catch {
          startTransition(() => {
            setFormOrigin(origin);
            setEditingEmp(mergeEmployeeChucVuFromPositions(item, positions));
            setShowForm(true);
          });
        }
      })();
    },
    [queryClient, positions],
  );

  /** Detail drawer: luôn refetch full row (có `hinh_anh`) khi mở — invalidate trước để không dùng cache còn “fresh” nhưng đã lệch DB. */
  const handleView = useCallback(
    (item: Employee) => {
      void (async () => {
        try {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.employees.detail(item.id),
            exact: true,
            refetchType: 'none',
          });
          const full = await queryClient.fetchQuery({
            queryKey: queryKeys.employees.detail(item.id),
            queryFn: () => getEmployeeById(item.id),
            ...defaultServerQueryOptions,
          });
          if (full == null) {
            queryClient.removeQueries({ queryKey: queryKeys.employees.detail(item.id) });
            queryClient.setQueryData<Employee[]>(employeesListQueryKey, (old) =>
              old?.filter((e) => e.id !== item.id),
            );
            toast.error(txt('employee.service.notFound'));
            return;
          }
          startTransition(() =>
            setViewingEmp(mergeEmployeeChucVuFromPositions(full, positions)),
          );
        } catch {
          startTransition(() => setViewingEmp(mergeEmployeeChucVuFromPositions(item, positions)));
        }
      })();
    },
    [queryClient, positions],
  );

  /**
   * Dữ liệu xuất bám đúng những gì đang thấy: `sortedEmployees` đã đi qua phạm vi
   * xem (`scopedEmployees`) rồi mới tới bộ lọc và sắp xếp. Không có nhánh nào
   * tải lại toàn bộ bảng cho phạm vi "Tất cả".
   */
  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } =
    useExportData({
      data: sortedEmployees,
      isOpen: showExport,
      mapFn: exportMapFn,
      pagination,
      selectedIds,
      keyExtractor: (e) => e.id,
    });

  const visibleExportColumnKeys = useMemo(
    () => columns.filter((c) => c.visible).map((c) => c.id),
    [columns],
  );

  const handleExport = useCallback(() => {
    if (sortedEmployees.length === 0) {
      toast.warning(txt('employee.noExportData'));
      return;
    }
    setShowExport(true);
  }, [sortedEmployees.length]);

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

  const handleStatusChange = useCallback((item: Employee) => {
    setStatusChangeTarget(item);
  }, []);

  const handleResetPassword = useCallback((item: Employee) => {
    setResetPasswordTarget(item);
  }, []);

  const handleResetPasswordSave = useCallback(
    async (password: string) => {
      if (!resetPasswordTarget) return;
      await resetPasswordMutation.mutateAsync({ id: resetPasswordTarget.id, password });
    },
    [resetPasswordTarget, resetPasswordMutation],
  );

  const handleStatusSave = useCallback(
    async (status: TrangThaiNhanVien) => {
      if (!statusChangeTarget) return;
      const targetId = statusChangeTarget.id;
      await statusMutation.mutateAsync({ ids: [targetId], status });
      setViewingEmp((prev) => (prev?.id === targetId ? { ...prev, trang_thai: status } : prev));
      setStatusChangeTarget(null);
    },
    [statusChangeTarget, statusMutation],
  );

  const handleDeleteMany = (ids: string[]) => {
    const emps = scopedEmployees.filter((e) => ids.includes(e.id));
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

  // ---------------------------------------------------------------------
  // Nhập từ Excel
  //
  // Hình dạng file: MỘT SHEET PHẲNG, một dòng = một nhân viên. Các sheet sau
  // trong file mẫu chỉ để TRA CỨU tên phòng ban / chức vụ / tổ chức / xã phường,
  // vì FK nhận cả tên lẫn id và cán bộ chỉ nhớ tên.
  // Không có cột mật khẩu: mật khẩu do Edge Function sinh, không đi qua Excel.
  // ---------------------------------------------------------------------
  const IMPORT_COLUMNS = useMemo<ImportColumn[]>(
    () => [
      { key: 'ten_tai_khoan', label: txt('employee.import.colTenTaiKhoan'), required: true },
      { key: 'ho_va_ten', label: txt('employee.import.colHoVaTen'), required: true },
      { key: 'id_phong_ban', label: txt('employee.import.colPhongBan'), required: true },
      { key: 'id_chuc_vu', label: txt('employee.import.colChucVu'), required: true },
      { key: 'id_bo_phan', label: txt('employee.import.colBoPhan') },
      { key: 'cap_quan_ly', label: txt('employee.import.colCapQuanLy') },
      { key: 'to_chuc_ids', label: txt('employee.import.colToChuc') },
      { key: 'don_vi_id', label: txt('employee.import.colDonVi') },
      { key: 'trang_thai', label: txt('employee.import.colTrangThai') },
      { key: 'id', label: txt('shared.import.colMaHeThong') },
    ],
    [],
  );

  const { canEdit: canEditEmployees } = useResourcePermissions('employees');
  const importMatchColumns = useMemo(
    () => [
      { key: 'id', label: txt('shared.import.colMaHeThong') },
      { key: 'ten_tai_khoan', label: txt('employee.import.colTenTaiKhoan') },
    ],
    [],
  );
  /** Không có quyền sửa thì không bày chế độ ghi đè. */
  const importWriteModes = useMemo(
    () => (canEditEmployees ? (['insert', 'upsert', 'update'] as const) : (['insert'] as const)),
    [canEditEmployees],
  );
  const importCtx = useMemo<NhanVienImportContext>(() => ({ viewer: nhanVienViewer }), [nhanVienViewer]);

  const importTemplateSheets = useMemo<ImportTemplateSheet[]>(() => {
    if (!showImport) return [];
    const lang = getLanguage();
    const byName = (a: string, b: string) => a.localeCompare(b, lang);
    return [
      {
        name: txt('employee.import.sheetHuongDan'),
        headers: [txt('employee.import.huongDanColKey'), txt('employee.import.huongDanColVal')],
        rows: [
          [txt('employee.import.hd1k'), txt('employee.import.hd1v')],
          [txt('employee.import.hd2k'), txt('employee.import.hd2v')],
          [txt('employee.import.hd3k'), txt('employee.import.hd3v')],
          [txt('employee.import.hd4k'), txt('employee.import.hd4v')],
          [txt('employee.import.hd5k'), txt('employee.import.hd5v')],
          [txt('employee.import.hd6k'), txt('employee.import.hd6v')],
          [txt('employee.import.hd7k'), txt('employee.import.hd7v')],
          [txt('employee.import.hd8k'), txt('employee.import.hd8v')],
          [txt('employee.import.hd9k'), txt('employee.import.hd9v')],
        ],
      },
      {
        name: txt('employee.import.sheetPhongBan'),
        headers: [txt('employee.import.refColId'), txt('employee.import.refColTen')],
        rows: [...departmentsForImport]
          .sort((a, b) => byName(a.ten_phong_ban, b.ten_phong_ban))
          .map((d) => [d.id, d.ten_phong_ban]),
      },
      {
        name: txt('employee.import.sheetChucVu'),
        headers: [txt('employee.import.refColId'), txt('employee.import.refColTen')],
        rows: [...positions]
          .sort((a, b) => byName(a.ten_chuc_vu, b.ten_chuc_vu))
          .map((p) => [p.id, p.ten_chuc_vu]),
      },
      {
        name: txt('employee.import.sheetToChuc'),
        headers: [txt('employee.import.refColId'), txt('employee.import.refColTen')],
        rows: thietLapAll
          .filter((x) => x.loai === 'to_chuc')
          .sort((a, b) => byName(a.ten, b.ten))
          .map((x) => [x.id, x.ten]),
      },
      {
        name: txt('employee.import.sheetXaPhuong'),
        headers: [txt('employee.import.refColId'), txt('employee.import.refColTen')],
        rows: [...xaListForImport].sort((a, b) => byName(a.ten, b.ten)).map((x) => [x.id, x.ten]),
      },
    ];
  }, [showImport, departmentsForImport, positions, thietLapAll, xaListForImport]);

  const handleImportDryRun = useCallback(
    (rows: Record<string, unknown>[], options: ImportRunOptions) => dryRunEmployeeImport(rows, options, importCtx),
    [importCtx],
  );

  const handleImportData = useCallback(
    (rows: Record<string, unknown>[], options: ImportRunOptions) =>
      importMutation.mutateAsync({ rows, options, ctx: importCtx }),
    [importMutation, importCtx],
  );

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
          employees={scopedEmployees}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setShowForm(true);
            });
          }}
          onImport={() => setShowImport(true)}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          onStatusChangeMany={handleStatusChangeMany}
        />

        <div className="flex-1 min-h-0">
          <EmployeeTable
            data={sortedEmployees}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            employeesForFilterCounts={scopedEmployees}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            onResetPassword={handleResetPassword}
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
              onResetPassword={handleResetPassword}
            />
          </Suspense>
        )}
        {statusChangeTarget && (
          <Suspense fallback={null}>
            <EmployeeStatusChangeDialog
              open
              employee={statusChangeTarget}
              isSubmitting={statusMutation.isPending}
              onClose={() => setStatusChangeTarget(null)}
              onSave={handleStatusSave}
            />
          </Suspense>
        )}
        {resetPasswordTarget && (
          <Suspense fallback={null}>
            <EmployeeResetPasswordDialog
              employee={resetPasswordTarget}
              isSubmitting={resetPasswordMutation.isPending}
              onClose={() => setResetPasswordTarget(null)}
              onSave={handleResetPasswordSave}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImport && (
          <ImportDialog
            open={showImport}
            onClose={() => setShowImport(false)}
            columns={IMPORT_COLUMNS}
            onImport={handleImportData}
            onDryRun={handleImportDryRun}
            writeModes={importWriteModes}
            matchColumns={importMatchColumns}
            defaultMatchKeys={['ten_tai_khoan']}
            templateFileName={txt('employee.import.templateFileName')}
            templateSheets={importTemplateSheets}
          />
        )}
      </AnimatePresence>

      {showExport && (
        <ExportDialog
          open={showExport}
          onClose={() => setShowExport(false)}
          columns={EXPORT_COLUMNS}
          data={exportData}
          paginatedData={paginatedExportData}
          selectedData={selectedExportData}
          fileName={txt('employee.exportFileName')}
          visibleColumnKeys={visibleExportColumnKeys}
        />
      )}
    </div>
  );
};

export default EmployeePage;
