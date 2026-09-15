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
import { txt } from '@/lib/text';
import { formatDate, getLanguage } from '@/lib/utils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import ExportDialog from '@/components/shared/ExportDialog';
import { useTheLoais } from '../thiet-lap-bai-viet/hooks/use-the-loai';
import { useThietLapKhacAll } from '../thiet-lap-bai-viet/hooks/use-thiet-lap-khac';
import {
  canLoadArticleList,
  resolveBaiVietListRpcScope,
  useArticleListViewer,
  rowVisibleOnArticleList,
} from '../hooks/use-article-all-tab-viewer';
import { useDeleteBaiVietDanhSachMany } from './hooks/use-bai-viet-danh-sach';
import { useBaiVietNguoiTaoFilterOptions } from './hooks/use-bai-viet-nguoi-tao-filter-options';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import { queryKeys } from '@/lib/query-keys';
import {
  getBaiVietDanhSachAllForExport,
  getBaiVietDanhSachPage,
} from './services/bai-viet-danh-sach-service';
import { useBaiVietDanhSachStore } from './store/useBaiVietDanhSachStore';
import type { BaiVietDanhSach } from './core/types';
import { baiVietMatchesColumnSearch } from './utils/column-search';
import ImportDialog, {
  type ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { useCanEditBaiVietDonGia } from './hooks/use-can-edit-bai-viet-don-gia';
import { useImportBaiViet } from './hooks/use-bai-viet-danh-sach';
import { dryRunBaiVietImport, type BaiVietImportContext } from './services/bai-viet-import';
import { BAI_VIET_IMPORT_MAX_ROWS } from './utils/bai-viet-import-row';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import BaiVietToolbar from './components/bai-viet-toolbar';
import BaiVietTable from './components/bai-viet-table';

const BaiVietForm = lazy(() => import('./components/bai-viet-form'));
const BaiVietDetail = lazy(() => import('./components/bai-viet-detail'));

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
  const canView = useCan('view', 'articles');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('articleList.noViewPermission'));
    navigate('/quan-ly-viet-bai', { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BaiVietDanhSach | null>(null);
  const [viewing, setViewing] = useState<BaiVietDanhSach | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const {
    searchTerm,
    filters,
    sort,
    resetState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
    setPage,
  } = useBaiVietDanhSachStore();

  const listViewer = useArticleListViewer();
  const { data: theLoais = [] } = useTheLoais({ enabled: canView });
  const { data: khacRows = [] } = useThietLapKhacAll({ enabled: canView });

  const rpcScope = resolveBaiVietListRpcScope(listViewer);
  const pageQueryEnabled = canView && canLoadArticleList(listViewer);

  const pageExtraParams = useMemo(
    () => ({
      scope: rpcScope,
      viewerNhanVienId: rpcScope === 'mine' ? listViewer.viewerNhanVienId : null,
      viewerDonViId: null,
      theLoaiIds: filters.id_the_loai,
      nguonDangIds: filters.id_nguon_dang,
      trangDangIds: filters.id_trang_dang,
      nguoiTaoIds: filters.id_nguoi_tao,
    }),
    [
      rpcScope,
      listViewer.viewerNhanVienId,
      filters.id_the_loai,
      filters.id_nguon_dang,
      filters.id_trang_dang,
      filters.id_nguoi_tao,
    ],
  );

  const {
    rows,
    totalRecords: serverTotalRecords,
    hasNextPage: serverHasNextPage,
    isLoading,
    isError,
    refetch,
    params: pageQuery,
  } = useServerPagedList({
    pagination,
    searchTerm,
    sort,
    extraParams: pageExtraParams,
    queryKey: queryKeys.baiVietDanhSach.page,
    fetchFn: getBaiVietDanhSachPage,
    enabled: pageQueryEnabled,
  });

  const { data: nguoiTaoFilterRows = [] } = useBaiVietNguoiTaoFilterOptions({
    scope: 'all',
    viewerDonViId: null,
    enabled: pageQueryEnabled && rpcScope !== 'mine',
  });

  const deleteMutation = useDeleteBaiVietDanhSachMany();

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    filters.id_the_loai.join(','),
    filters.id_nguon_dang.join(','),
    filters.id_trang_dang.join(','),
    filters.id_nguoi_tao.join(','),
    setPage,
  ]);

  useEffect(() => {
    if (!viewing) return;
    if (!rowVisibleOnArticleList(listViewer, viewing)) {
      toast.error(txt('articleList.noViewRowPermission'));
      setViewing(null);
      return;
    }
    const fresh = rows.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rows, viewing, listViewer]);

  const handleView = useCallback(
    (item: BaiVietDanhSach) => {
      if (!rowVisibleOnArticleList(listViewer, item)) {
        toast.error(txt('articleList.noViewRowPermission'));
        return;
      }
      setViewing(item);
    },
    [listViewer],
  );

  const filterFn = useCallback(
    (item: BaiVietDanhSach, _term: string, f: typeof filters) => {
      if (!rowVisibleOnArticleList(listViewer, item)) return false;
      if (f.id_the_loai?.length && !f.id_the_loai.includes(String(item.id_the_loai))) return false;
      if (f.id_nguon_dang?.length && !f.id_nguon_dang.includes(String(item.id_nguon_dang))) return false;
      if (f.id_trang_dang?.length && !f.id_trang_dang.includes(String(item.id_trang_dang))) return false;
      if (f.id_nguoi_tao?.length && !f.id_nguoi_tao.includes(String(item.id_nguoi_tao))) return false;
      return baiVietMatchesColumnSearch(item, f);
    },
    [listViewer],
  );

  const filtered = useListWithFilter(rows, searchTerm, filters, filterFn);

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
      ngay_dang: formatDate(item.ngay_dang),
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

  // Phạm vi "Tất cả" phải ra đủ số bài khớp bộ lọc, không phải 20 dòng đang xem.
  const fetchAllForExport = useCallback(async () => {
    const all = await getBaiVietDanhSachAllForExport(pageQuery);
    return all.map(exportMapFn);
  }, [pageQuery, exportMapFn]);

  const visibleColumnKeys = useMemo(() => columns.filter((c) => c.visible).map((c) => c.id), [columns]);

  /* ---------------- Nhập file ---------------- */

  const { canCreate: canCreateArticle, canEdit: canEditArticle, canImport } = useResourcePermissions('articles');
  const canEditDonGia = useCanEditBaiVietDonGia();
  const importMutation = useImportBaiViet();

  const importCtx = useMemo<BaiVietImportContext>(
    () => ({
      idNhanVienHienTai: listViewer.viewerNhanVienId ?? '',
      // Cùng điều kiện với quyền sửa đơn giá: chỉ cấp lãnh đạo / quản trị module.
      // Ai cũng gán bài cho người khác được là mở đường mạo danh.
      choGanNguoiKhac: canEditDonGia,
      choSuaDonGia: canEditDonGia,
    }),
    [listViewer.viewerNhanVienId, canEditDonGia],
  );

  const importColumns = useMemo(
    () => [
      { key: 'ten_bai', label: txt('articleList.import.colTenBai'), required: true },
      { key: 'id_the_loai', label: txt('articleList.import.colTheLoai'), required: true },
      { key: 'ngay_dang', label: txt('articleList.import.colNgayDang'), required: true },
      { key: 'don_gia', label: txt('articleList.import.colDonGia') },
      { key: 'id_nguon_dang', label: txt('articleList.import.colNguonDang'), required: true },
      { key: 'id_trang_dang', label: txt('articleList.import.colTrangDang'), required: true },
      { key: 'link', label: txt('articleList.import.colLink'), required: true },
      { key: 'id_nguoi_tao', label: txt('articleList.import.colNguoiTao') },
    ],
    [],
  );

  const importMatchColumns = useMemo(
    () => [
      { key: 'link', label: txt('articleList.import.colLink') },
      { key: 'ten_bai', label: txt('articleList.import.colTenBai') },
    ],
    [],
  );

  /** Không có quyền sửa thì không bày chế độ ghi đè — bấm vào cũng bị DB chặn. */
  const importWriteModes = useMemo(
    () => (canEditArticle ? (['insert', 'upsert', 'update'] as const) : (['insert'] as const)),
    [canEditArticle],
  );

  const importTemplateSheets = useMemo(
    () => [
      {
        name: txt('articleList.import.sheetHuongDan'),
        headers: [txt('articleList.import.sheetHuongDanCot')],
        rows: [
          [txt('articleList.import.huongDan1')],
          [txt('articleList.import.huongDan2')],
          [txt('articleList.import.huongDan3')],
          [txt('articleList.import.huongDan4')],
          [txt('articleList.import.huongDan5')],
          [txt('articleList.import.huongDan6', { max: BAI_VIET_IMPORT_MAX_ROWS })],
        ] as (string | number | null)[][],
      },
      {
        name: txt('articleList.import.sheetTheLoai'),
        headers: [
          txt('articleList.import.sheetColId'),
          txt('articleList.import.sheetColTen'),
          txt('articleList.import.sheetColDonGia'),
        ],
        rows: theLoais.map((t) => [t.id, t.ten_the_loai, t.don_gia] as (string | number | null)[]),
      },
      {
        name: txt('articleList.import.sheetNguonDang'),
        headers: [txt('articleList.import.sheetColId'), txt('articleList.import.sheetColTen')],
        rows: khacRows
          .filter((k) => k.loai === 'nguon_dang')
          .map((k) => [k.id, k.ten] as (string | number | null)[]),
      },
      {
        name: txt('articleList.import.sheetTrangDang'),
        headers: [txt('articleList.import.sheetColId'), txt('articleList.import.sheetColTen')],
        rows: khacRows
          .filter((k) => k.loai === 'trang_dang')
          .map((k) => [k.id, k.ten] as (string | number | null)[]),
      },
    ],
    [theLoais, khacRows],
  );

  const handleImportDryRun = useCallback(
    (rowsToImport: Record<string, unknown>[], options: ImportRunOptions) =>
      dryRunBaiVietImport(rowsToImport, options, importCtx),
    [importCtx],
  );

  const handleImport = useCallback(
    (rowsToImport: Record<string, unknown>[], options: ImportRunOptions) =>
      importMutation.mutateAsync({ rows: rowsToImport, options, ctx: importCtx }),
    [importMutation, importCtx],
  );

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
        await deleteMutation.mutateAsync([id], {
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
        await deleteMutation.mutateAsync(ids, {
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

  const theLoaiChipOptions = useMemo(
    () =>
      [...theLoais]
        .map((t) => ({ value: String(t.id), label: t.ten_the_loai }))
        .sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    [theLoais],
  );

  const nguonDangChipOptions = useMemo(() => {
    const masters = [...khacRows]
      .filter((r) => r.loai === 'nguon_dang')
      .sort((a, b) => a.ten.localeCompare(b.ten, getLanguage()));
    const counts = new Map<string, number>();
    for (const r of rows) {
      const id = String(r.id_nguon_dang);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return masters.map((m) => ({
      value: String(m.id),
      label: m.ten,
      count: counts.get(String(m.id)) ?? 0,
    }));
  }, [khacRows, rows]);

  const trangDangChipOptions = useMemo(() => {
    const masters = [...khacRows]
      .filter((r) => r.loai === 'trang_dang')
      .sort((a, b) => a.ten.localeCompare(b.ten, getLanguage()));
    const counts = new Map<string, number>();
    for (const r of rows) {
      const id = String(r.id_trang_dang);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return masters.map((m) => ({
      value: String(m.id),
      label: m.ten,
      count: counts.get(String(m.id)) ?? 0,
    }));
  }, [khacRows, rows]);

  const nguoiTaoChipOptions = useMemo(
    () =>
      nguoiTaoFilterRows.map((o) => ({
        value: o.id,
        label: o.label,
        count: o.count,
      })),
    [nguoiTaoFilterRows],
  );

  if (!canView) {
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
        <BaiVietToolbar
          onPageBack={() => navigate('/quan-ly-viet-bai')}
          theLoaiOptions={theLoaiChipOptions}
          nguonDangOptions={nguonDangChipOptions}
          trangDangOptions={trangDangChipOptions}
          nguoiTaoOptions={nguoiTaoChipOptions}
          onImport={canCreateArticle && canImport ? () => setShowImport(true) : undefined}
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
            data={filtered}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
            serverSidePagination
            serverTotalRecords={serverTotalRecords}
            serverHasNextPage={serverHasNextPage}
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
        {showImport && (
          <ImportDialog
            open={showImport}
            onClose={() => setShowImport(false)}
            columns={importColumns}
            onImport={handleImport}
            onDryRun={handleImportDryRun}
            writeModes={importWriteModes}
            matchColumns={importMatchColumns}
            defaultMatchKeys={['link', 'ten_bai']}
            templateFileName={txt('articleList.import.templateFileName')}
            templateSheets={importTemplateSheets}
          />
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
            serverTotalRecords={serverTotalRecords}
            fetchAllData={fetchAllForExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default BaiVietDanhSachPage;
