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
import { useQuery } from '@tanstack/react-query';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useModuleAccess } from '@/hooks/use-module-access';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import { resolveStandardDateRange } from '@/lib/date-range-presets';
import { formatCurrency, formatDate } from '@/lib/utils';
import ExportDialog from '@/components/shared/ExportDialog';
import { QUY_FILE_SUFFIX, QUY_LOAI_PHIEU_LABEL, type QuyKey } from '../core/constants';
import { useQuyKhoanOptions } from '../danh-muc-khoan/hooks/use-quy-danh-muc-khoan';
import {
  useQuySoDuTheoTaiKhoan,
  useQuyTaiKhoanOptions,
} from '../danh-muc-tai-khoan/hooks/use-quy-danh-muc-tai-khoan';
import { useQuySoThuChiStore } from './store/useQuySoThuChiStore';
import type { QuySoThuChiListRow } from './core/types';
import {
  getQuySoThuChiAllForExport,
  getQuySoThuChiPage,
  type QuySoThuChiPageQuery,
} from './services/quy-so-thu-chi-service';
import { useDeleteQuySoThuChiMany, useQuySoThuChiDetail } from './hooks/use-quy-so-thu-chi';
import {
  countQuySoThuChiColumnSearchActive,
  resolveLoaiParam,
} from './utils/column-search';
import QuySoThuChiToolbar from './components/quy-so-thu-chi-toolbar';
import QuySoThuChiTable from './components/quy-so-thu-chi-table';
import QuySoThuChiSummary from './components/quy-so-thu-chi-summary';

const QuySoThuChiForm = lazy(() => import('./components/quy-so-thu-chi-form'));
const QuySoThuChiDetailDrawer = lazy(() => import('./components/quy-so-thu-chi-detail'));

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

const TONG_RONG = { tongThu: 0, tongChi: 0, soDu: 0 } as const;

export interface QuySoThuChiPageProps {
  quy: QuyKey;
}

/**
 * Sổ thu chi của quỹ.
 *
 * **Phân trang phía máy chủ** qua RPC `get_quy_so_thu_chi_page` — `quy_so_thu_chi`
 * là bảng GIAO DỊCH, tăng liên tục và không có trần (xem CLAUDE.md "Chọn kiểu
 * phân trang"). Mọi bộ lọc, ô tìm theo cột và sắp xếp đều đẩy xuống máy chủ; lọc
 * hay sắp ở client chỉ tác động lên trang đang xem, với sổ tiền là số liệu sai.
 */
const QuySoThuChiPage: React.FC<QuySoThuChiPageProps> = ({ quy }) => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const { canView, waiting, ready } = useModuleAccess('quySoThuChi');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (waiting || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('quy.soThuChi.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [waiting, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<QuySoThuChiListRow | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);

  const {
    searchTerm,
    filters,
    sort,
    pagination,
    columns,
    selectedIds,
    clearSelection,
    resetState,
  } = useQuySoThuChiStore();

  useEffect(() => () => resetState(), [resetState]);

  const { data: khoanOptions = [] } = useQuyKhoanOptions(quy, { enabled: ready });
  const { data: taiKhoanOptions = [] } = useQuyTaiKhoanOptions(quy, { enabled: ready });
  const { data: soDuRows = [], isLoading: soDuLoading } = useQuySoDuTheoTaiKhoan(quy, {
    enabled: ready,
  });

  /**
   * Khoảng ngày gửi xuống máy chủ.
   *
   * Preset «Tất cả» trả `start`/`end` RỖNG — phải đổi thành `null` chứ không
   * truyền chuỗi rỗng, nếu không Postgres sẽ báo lỗi ép kiểu `date`.
   */
  const { tuNgay, denNgay } = useMemo(() => {
    const r = resolveStandardDateRange(
      filters.dateRange.preset,
      filters.dateRange.customStart,
      filters.dateRange.customEnd,
    );
    if (r.allTime || !r.start || !r.end) return { tuNgay: null, denNgay: null };
    return { tuNgay: r.start, denNgay: r.end };
  }, [filters.dateRange]);

  const extraParams = useMemo(
    () => ({
      quy,
      loai: resolveLoaiParam(filters.loai),
      khoanIds: filters.khoan_ids,
      taiKhoanIds: filters.tai_khoan_ids,
      tuNgay,
      denNgay,
      columnSearch: filters.columnSearch ?? null,
    }),
    [quy, filters.loai, filters.khoan_ids, filters.tai_khoan_ids, tuNgay, denNgay, filters.columnSearch],
  );

  const {
    rows,
    totalRecords,
    hasNextPage,
    isLoading,
    isError,
    refetch,
    params: pageQuery,
  } = useServerPagedList({
    pagination,
    searchTerm,
    sort,
    extraParams,
    queryKey: queryKeys.quySoThuChi.page,
    fetchFn: getQuySoThuChiPage,
    enabled: ready,
  });

  /**
   * Tổng thu / tổng chi của TOÀN BỘ tập đã lọc.
   *
   * RPC trả sẵn hai số này kèm mỗi trang, nhưng `useServerPagedList` chỉ đưa ra
   * `rows`. Đăng ký thêm một `useQuery` **trùng khóa và trùng hàm nạp** để lấy
   * phần còn lại: TanStack Query gộp hai lần đăng ký cùng khóa thành MỘT mục
   * cache và MỘT request, nên không tốn thêm lượt gọi máy chủ (egress free-tier
   * 5GB/tháng — xem `docs/supabase-egress.md`).
   */
  const tongQuery = useQuery({
    queryKey: queryKeys.quySoThuChi.page(pageQuery),
    queryFn: () => getQuySoThuChiPage(pageQuery as QuySoThuChiPageQuery),
    enabled: ready,
    ...listQueryOptions,
  });
  const tongDaLoc = tongQuery.data?.tong ?? TONG_RONG;

  const deleteMutation = useDeleteQuySoThuChiMany(quy);

  const { data: viewingData } = useQuySoThuChiDetail(quy, viewingId, {
    enabled: ready && Boolean(viewingId?.trim()),
  });

  const khoanNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const k of khoanOptions) m.set(k.id, k.ten);
    return m;
  }, [khoanOptions]);

  const taiKhoanNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of taiKhoanOptions) m.set(t.id, t.ten);
    return m;
  }, [taiKhoanOptions]);

  const hasListFilters = useMemo(
    () =>
      Boolean(searchTerm?.trim()) ||
      countQuySoThuChiColumnSearchActive(filters.columnSearch ?? {}) > 0 ||
      filters.loai.length > 0 ||
      filters.khoan_ids.length > 0 ||
      filters.tai_khoan_ids.length > 0 ||
      filters.dateRange.preset !== 'all',
    [searchTerm, filters],
  );

  /**
   * "Chưa có phiếu nào" khác hẳn "không khớp bộ lọc".
   *
   * Với phân trang máy chủ thì không biết bảng có rỗng thật hay không nếu chỉ
   * nhìn trang hiện tại — nên dựa vào việc CÓ bộ lọc hay không: không lọc mà
   * tổng bằng 0 thì sổ thật sự rỗng.
   */
  const khongKhopBoLoc = totalRecords === 0 && hasListFilters;
  const emptyTitleResolved = khongKhopBoLoc
    ? txt('common.noResults')
    : txt('quy.soThuChi.emptyTitle');
  const emptyDescriptionResolved = khongKhopBoLoc
    ? txt('quy.soThuChi.emptyFilteredHint')
    : txt('quy.soThuChi.emptyHint');

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'so_chung_tu', label: txt('quy.soThuChi.store.soChungTuCol') },
      { key: 'ngay_chung_tu', label: txt('quy.soThuChi.store.ngayChungTuCol') },
      { key: 'loai', label: txt('quy.soThuChi.store.loaiCol') },
      { key: 'ten_khoan', label: txt('quy.soThuChi.store.khoanCol') },
      { key: 'so_tien', label: txt('quy.soThuChi.store.soTienCol') },
      { key: 'noi_dung', label: txt('quy.soThuChi.store.noiDungCol') },
      { key: 'ten_tai_khoan', label: txt('quy.soThuChi.store.taiKhoanCol') },
      { key: 'nguoi_nop_nhan', label: txt('quy.soThuChi.store.nguoiNopNhanCol') },
      { key: 'ten_don_vi', label: txt('quy.soThuChi.store.donViCol') },
      { key: 'chung_tu_goc', label: txt('quy.soThuChi.store.chungTuGocCol') },
      { key: 'ghi_chu', label: txt('quy.soThuChi.store.ghiChuCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('quy.soThuChi.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: QuySoThuChiListRow) => ({
      so_chung_tu: item.so_chung_tu,
      ngay_chung_tu: item.ngay_chung_tu ? formatDate(item.ngay_chung_tu) : '',
      loai: QUY_LOAI_PHIEU_LABEL[item.loai],
      ten_khoan: item.ten_khoan ?? '',
      so_tien: formatCurrency(item.so_tien),
      noi_dung: item.noi_dung,
      ten_tai_khoan: item.ten_tai_khoan ?? '',
      nguoi_nop_nhan: item.nguoi_nop_nhan ?? '',
      ten_don_vi: item.ten_don_vi ?? '',
      chung_tu_goc: item.chung_tu_goc ?? '',
      ghi_chu: item.ghi_chu ?? '',
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? '',
    }),
    [],
  );

  const {
    exportData,
    paginatedData: paginatedExportData,
    selectedData: selectedExportData,
  } = useExportData({
    data: rows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });

  /** Phạm vi "Tất cả" phải kéo hết mọi trang, nếu không file xuất chỉ có trang đang xem. */
  const fetchAllForExport = useCallback(async () => {
    const all = await getQuySoThuChiAllForExport(pageQuery as QuySoThuChiPageQuery);
    return all.map(exportMapFn);
  }, [pageQuery, exportMapFn]);

  const visibleColumnKeys = useMemo(
    () => columns.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [columns],
  );

  const handleEditFromList = (item: QuySoThuChiListRow) => {
    startTransition(() => {
      setFormOrigin('list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleEditFromDetail = (d: QuySoThuChiListRow) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('quy.soThuChi.deleteTitle'),
      message: txt('quy.soThuChi.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync([id], {
          onSuccess: () => {
            if (viewingId === id) setViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('quy.soThuChi.bulkDeleteTitle'),
      message: txt('quy.soThuChi.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync(ids, {
          onSuccess: () => {
            clearSelection();
            if (viewingId && ids.includes(viewingId)) setViewingId(null);
          },
        });
      },
    });
  };

  const handleAdd = () => {
    // Không có khoản mục hoặc tài khoản thì không lập được phiếu — nói ngay,
    // thay vì để cán bộ mở form ra rồi thấy hai ô chọn trống trơn.
    if (khoanOptions.length === 0 || taiKhoanOptions.length === 0) {
      toast.warning(txt('quy.soThuChi.thieuDanhMuc'));
      return;
    }
    startTransition(() => {
      setFormOrigin('list');
      setEditing(null);
      setShowForm(true);
    });
  };

  const handleExport = () => {
    if (totalRecords === 0) {
      toast.warning(txt('quy.soThuChi.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormOrigin('list');
  };

  if (waiting || !canView) {
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
        <QuySoThuChiToolbar
          onPageBack={() => navigate('/an-sinh-xa-hoi')}
          onAdd={handleAdd}
          onExport={handleExport}
          onDeleteMany={handleDeleteMany}
          khoanOptions={khoanOptions}
          taiKhoanOptions={taiKhoanOptions}
        />

        <QuySoThuChiSummary
          soDuRows={soDuRows}
          tongDaLoc={tongDaLoc}
          dangLoc={hasListFilters}
          isLoading={soDuLoading}
        />

        <div className="flex-1 min-h-0">
          <QuySoThuChiTable
            data={rows}
            isLoading={isLoading}
            isError={isError}
            onRetry={refetch}
            onEdit={handleEditFromList}
            onDelete={handleDelete}
            onView={(item) => setViewingId(item.id)}
            emptyTitle={emptyTitleResolved}
            emptyDescription={emptyDescriptionResolved}
            serverTotalRecords={totalRecords}
            serverHasNextPage={hasNextPage}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <QuySoThuChiForm quy={quy} initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <QuySoThuChiDetailDrawer
              data={viewingData}
              tenKhoan={khoanNameById.get(viewingData.khoan_id) ?? null}
              tenTaiKhoan={taiKhoanNameById.get(viewingData.tai_khoan_id) ?? null}
              onClose={() => setViewingId(null)}
              onEdit={handleEditFromDetail}
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
            fileName={`${txt('quy.soThuChi.exportFileName')}-${QUY_FILE_SUFFIX[quy]}`}
            visibleColumnKeys={visibleColumnKeys}
            serverTotalRecords={totalRecords}
            fetchAllData={fetchAllForExport}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuySoThuChiPage;
