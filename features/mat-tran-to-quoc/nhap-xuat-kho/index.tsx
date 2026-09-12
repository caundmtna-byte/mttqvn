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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { txt } from '@/lib/text';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';
import { transactionalCrudListQueryOptions } from '@/lib/supabase/query-config';
import { formatCurrency } from '@/lib/utils';
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog, { type ImportColumn, type ImportTemplateSheet } from '@/components/shared/ImportDialog';
import TabGroup from '@/components/ui/TabGroup';
import {
  useNhapXuatKhoDetail,
  useDeleteNhapXuatKhoMany,
  useImportNhapXuatKho,
} from './hooks/use-kho-nhap-xuat-kho';
import {
  useKhoNhapXuatKhoViewer,
  isNhapXuatKhoViewUnrestricted,
} from './hooks/use-kho-nhap-xuat-kho-viewer';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import { useKhoDanhSachKhoList } from '@/features/mat-tran-to-quoc/danh-sach-kho/hooks/use-kho-danh-sach-kho';
import { useKhoDanhSachHangHoaList } from '@/features/mat-tran-to-quoc/hang-hoa/hooks/use-kho-danh-sach-hang-hoa';
import { useKhoDonViCuuTroList } from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { useKhoDotCuuTroList } from '@/features/mat-tran-to-quoc/dot-cuu-tro/hooks/use-kho-dot-cuu-tro';
import {
  getNhapXuatKhoAllForExport,
  getNhapXuatKhoById,
  getNhapXuatKhoCtFlatAllForExport,
  getNhapXuatKhoCtFlatPage,
  getNhapXuatKhoPage,
} from './services/kho-nhap-xuat-kho-service';
import { useNhapXuatKhoStore } from './store/useNhapXuatKhoStore';
import { useNhapXuatKhoCtFlatStore } from './store/useNhapXuatKhoCtFlatStore';
import type {
  NhapXuatKhoCtFlatRow,
  NhapXuatKhoDetail,
  NhapXuatKhoListRow,
} from './core/types';
import { countColumnSearchActive } from './utils/column-search';
import NhapXuatKhoToolbar from './components/kho-nhap-xuat-kho-toolbar';
import NhapXuatKhoTable from './components/kho-nhap-xuat-kho-table';
import NhapXuatKhoCtFlatToolbar from './components/kho-nhap-xuat-kho-ct-flat-toolbar';
import NhapXuatKhoCtFlatTable from './components/kho-nhap-xuat-kho-ct-flat-table';

const NhapXuatKhoForm = lazy(() => import('./components/kho-nhap-xuat-kho-form'));
const NhapXuatKhoDetailDrawer = lazy(() => import('./components/kho-nhap-xuat-kho-detail'));

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

const TAB_LIST = 'danh_sach';
const TAB_CT = 'chi_tiet';
const NHAP_XUAT_KHO_TABS = [TAB_LIST, TAB_CT] as const;

type FormOrigin = 'list' | 'detail';

const NhapXuatKhoPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefStockTransactions');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user &&
      (user.role === 'admin' || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  // Dùng `matrixLoading` thay cho `!matrixActive`: nếu truy vấn quyền THẤT BẠI thì
  // `matrixActive` ở lại false vĩnh viễn và trang sẽ quay vòng chờ mãi.
  const waitingMatrixHydrate =
    user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && matrixLoading;

  const [activeTab, setActiveTab] = useTabSearchParam(NHAP_XUAT_KHO_TABS, TAB_LIST);

  const listStore = useNhapXuatKhoStore();
  const ctStore = useNhapXuatKhoCtFlatStore();

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranNhapXuatKho.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NhapXuatKhoDetail | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExportList, setShowExportList] = useState(false);
  const [showExportCt, setShowExportCt] = useState(false);
  const [showImport, setShowImport] = useState(false);

  /** Mở drawer chi tiết khi quay lại từ trang in phiếu (`?open=<phieuId>`). */
  useEffect(() => {
    if (!canView || activeTab !== TAB_LIST) return;
    const raw = searchParams.get('open')?.trim();
    if (!raw) return;
    startTransition(() => setViewingId(raw));
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [canView, activeTab, searchParams, setSearchParams]);

  const {
    searchTerm: listSearch,
    filters: listFilters,
    sort: listSort,
    resetState: listReset,
    clearSelection: listClearSel,
    selectedIds: listSel,
    pagination: listPag,
    columns: listCols,
  } = listStore;

  const {
    searchTerm: ctSearch,
    filters: ctFilters,
    sort: ctSort,
    resetState: ctReset,
    pagination: ctPag,
    selectedIds: ctSel,
    columns: ctCols,
  } = ctStore;

  const viewer = useKhoNhapXuatKhoViewer();

  // Phạm vi xem đi xuống RPC: cấp Tỉnh / quản trị xem hết, cấp Xã phường chỉ
  // thấy phiếu có kho xuất hoặc kho nhập thuộc đơn vị mình.
  const viewScope = useMemo(
    () => ({
      // Chỉ cấp Xã phường mới bị bó theo đơn vị; các cấp khác xem hết — đúng như
      // canViewNhapXuatKhoRow. Gửi viewAll=true ở đây để RPC không phải đoán,
      // nhờ đó cán bộ Xã phường CHƯA được gán đơn vị sẽ thấy rỗng thay vì thấy tất.
      viewAll:
        isNhapXuatKhoViewUnrestricted(viewer) || viewer.chucVuCapQuanLy !== 'Xã phường',
      viewerDonViId: viewer.chucVuCapQuanLy === 'Xã phường' ? viewer.viewerDonViId : null,
    }),
    [viewer],
  );

  const listExtraParams = useMemo(
    () => ({
      ...viewScope,
      loaiPhieu: listFilters.loai_phieu ?? null,
      khoId: listFilters.kho_id ?? null,
      donViCuuTroId: listFilters.don_vi_cuu_tro_id ?? null,
      dotCuuTroId: listFilters.dot_cuu_tro_id ?? null,
      columnSearch: listFilters.columnSearch ?? null,
    }),
    [
      viewScope,
      listFilters.loai_phieu,
      listFilters.kho_id,
      listFilters.don_vi_cuu_tro_id,
      listFilters.dot_cuu_tro_id,
      listFilters.columnSearch,
    ],
  );

  const ctExtraParams = useMemo(
    () => ({
      ...viewScope,
      loaiPhieu: ctFilters.loai_phieu ?? null,
      khoId: ctFilters.kho_id ?? null,
      hangHoaId: ctFilters.hang_hoa_id ?? null,
      columnSearch: ctFilters.columnSearch ?? null,
    }),
    [viewScope, ctFilters.loai_phieu, ctFilters.kho_id, ctFilters.hang_hoa_id, ctFilters.columnSearch],
  );

  const {
    rows,
    totalRecords: listTotal,
    hasNextPage: listHasNext,
    isLoading: listLoading,
    isError: listIsError,
    refetch: listRefetch,
    params: listPageQuery,
  } = useServerPagedList({
    pagination: listPag,
    searchTerm: listSearch,
    sort: listSort,
    extraParams: listExtraParams,
    queryKey: queryKeys.khoNhapXuatKho.page,
    fetchFn: getNhapXuatKhoPage,
    enabled: listQueryEnabled,
  });

  const {
    rows: ctRows,
    totalRecords: ctTotal,
    hasNextPage: ctHasNext,
    isLoading: ctLoading,
    isError: ctIsError,
    refetch: ctRefetch,
    params: ctPageQuery,
  } = useServerPagedList({
    pagination: ctPag,
    searchTerm: ctSearch,
    sort: ctSort,
    extraParams: ctExtraParams,
    queryKey: queryKeys.khoNhapXuatKho.chiTietFlatPage,
    fetchFn: getNhapXuatKhoCtFlatPage,
    enabled: listQueryEnabled,
  });

  const detailEnabled = listQueryEnabled && Boolean(viewingId?.trim());
  const { data: viewingData } = useNhapXuatKhoDetail(viewingId, { enabled: detailEnabled });
  const isListTabLoading = listLoading || waitingMatrixHydrate;
  const isCtTabLoading = ctLoading || waitingMatrixHydrate;
  const deleteMany = useDeleteNhapXuatKhoMany();

  useEffect(() => {
    return () => {
      listReset();
      ctReset();
    };
  }, [listReset, ctReset]);


  const listExportCols = useMemo(
    () => [
      { key: 'tt', label: txt('matTranNhapXuatKho.store.ttCol') },
      { key: 'so_phieu', label: txt('matTranNhapXuatKho.store.soPhieuCol') },
      { key: 'loai_phieu', label: txt('matTranNhapXuatKho.store.loaiPhieuCol') },
      { key: 'ngay_phieu', label: txt('matTranNhapXuatKho.store.ngayPhieuCol') },
      { key: 'ten_kho_xuat', label: txt('matTranNhapXuatKho.store.khoXuatCol') },
      { key: 'ten_kho_nhap', label: txt('matTranNhapXuatKho.store.khoNhapCol') },
      { key: 'ten_don_vi_cuu_tro', label: txt('matTranNhapXuatKho.store.donViCuuTroCol') },
      { key: 'ten_dot_cuu_tro', label: txt('matTranNhapXuatKho.store.dotCuuTroCol') },
      { key: 'so_dong', label: txt('matTranNhapXuatKho.store.soDongCol') },
      { key: 'tg_tao', label: txt('matTranNhapXuatKho.store.tgTaoCol') },
      { key: 'tg_cap_nhat', label: txt('matTranNhapXuatKho.store.tgCapNhatCol') },
    ],
    [],
  );

  const listExportMap = useCallback(
    (item: NhapXuatKhoListRow) => ({
      tt: item.tt,
      so_phieu: item.so_phieu,
      loai_phieu: txt(`matTranNhapXuatKho.loaiPhieu.${item.loai_phieu}`),
      ngay_phieu: item.ngay_phieu ?? '',
      ten_kho_xuat: item.ten_kho_xuat ?? '',
      ten_kho_nhap: item.ten_kho_nhap ?? '',
      ten_don_vi_cuu_tro: item.ten_don_vi_cuu_tro ?? '',
      ten_dot_cuu_tro: item.ten_dot_cuu_tro ?? '',
      so_dong: item.so_dong,
      tg_tao: item.tg_tao,
      tg_cap_nhat: item.tg_cap_nhat,
    }),
    [],
  );

  const ctExportCols = useMemo(
    () => [
      { key: 'so_phieu', label: txt('matTranNhapXuatKho.store.soPhieuCol') },
      { key: 'loai_phieu', label: txt('matTranNhapXuatKho.store.loaiPhieuCol') },
      { key: 'ngay_phieu', label: txt('matTranNhapXuatKho.store.ngayPhieuCol') },
      { key: 'ten_hang_hoa', label: txt('matTranNhapXuatKho.store.hangHoaCol') },
      { key: 'don_vi_tinh', label: txt('matTranNhapXuatKho.store.donViTinhCol') },
      { key: 'so_luong', label: txt('matTranNhapXuatKho.store.soLuongCol') },
      { key: 'don_gia', label: txt('matTranNhapXuatKho.store.donGiaCol') },
      { key: 'thanh_tien', label: txt('matTranNhapXuatKho.store.thanhTienCol') },
      { key: 'ten_kho_xuat', label: txt('matTranNhapXuatKho.store.khoXuatCol') },
      { key: 'ten_kho_nhap', label: txt('matTranNhapXuatKho.store.khoNhapCol') },
      { key: 'ghi_chu', label: txt('matTranNhapXuatKho.store.ghiChuCol') },
    ],
    [],
  );

  const ctExportMap = useCallback(
    (item: NhapXuatKhoCtFlatRow) => ({
      so_phieu: item.so_phieu,
      loai_phieu: txt(`matTranNhapXuatKho.loaiPhieu.${item.loai_phieu}`),
      ngay_phieu: item.ngay_phieu ?? '',
      ten_hang_hoa: item.ten_hang_hoa ?? '',
      don_vi_tinh: item.don_vi_tinh,
      so_luong: item.so_luong,
      don_gia: item.don_gia > 0 ? item.don_gia : '',
      thanh_tien: item.thanh_tien > 0 ? formatCurrency(item.thanh_tien) : '',
      ten_kho_xuat: item.ten_kho_xuat ?? '',
      ten_kho_nhap: item.ten_kho_nhap ?? '',
      ghi_chu: item.ghi_chu ?? '',
    }),
    [],
  );

  const listExport = useExportData({
    data: rows,
    isOpen: showExportList,
    mapFn: listExportMap,
    pagination: listPag,
    selectedIds: listSel,
    keyExtractor: (r) => r.id,
  });

  const ctExport = useExportData({
    data: ctRows,
    isOpen: showExportCt,
    mapFn: ctExportMap,
    pagination: ctPag,
    selectedIds: ctSel,
    keyExtractor: (r) => r.id,
  });

  const fetchAllListForExport = useCallback(async () => {
    const all = await getNhapXuatKhoAllForExport(listPageQuery);
    return all.map(listExportMap);
  }, [listPageQuery, listExportMap]);

  const fetchAllCtForExport = useCallback(async () => {
    const all = await getNhapXuatKhoCtFlatAllForExport(ctPageQuery);
    return all.map(ctExportMap);
  }, [ctPageQuery, ctExportMap]);

  const listVisibleKeys = useMemo(
    () => listCols.filter((c) => c.visible && c.id !== 'actions').map((c) => c.id),
    [listCols],
  );
  const ctVisibleKeys = useMemo(() => ctCols.filter((c) => c.visible).map((c) => c.id), [ctCols]);

  const hasListFilters = useMemo(() => {
    const cs = listFilters.columnSearch ?? {};
    return (
      Boolean(listSearch?.trim()) ||
      Boolean(listFilters.loai_phieu) ||
      Boolean(listFilters.kho_id) ||
      Boolean(listFilters.don_vi_cuu_tro_id) ||
      Boolean(listFilters.dot_cuu_tro_id) ||
      countColumnSearchActive(cs) > 0 ||
      Boolean(listSort.column)
    );
  }, [
    listSearch,
    listFilters.columnSearch,
    listFilters.loai_phieu,
    listFilters.kho_id,
    listFilters.don_vi_cuu_tro_id,
    listFilters.dot_cuu_tro_id,
    listSort.column,
  ]);

  const hasCtFilters = useMemo(() => {
    const cs = ctFilters.columnSearch ?? {};
    return (
      Boolean(ctSearch?.trim()) ||
      Boolean(ctFilters.loai_phieu) ||
      Boolean(ctFilters.kho_id) ||
      Boolean(ctFilters.hang_hoa_id) ||
      countColumnSearchActive(cs) > 0 ||
      Boolean(ctSort.column)
    );
  }, [
    ctSearch,
    ctFilters.columnSearch,
    ctFilters.loai_phieu,
    ctFilters.kho_id,
    ctFilters.hang_hoa_id,
    ctSort.column,
  ]);

  // Phân trang phía máy chủ: không còn biết tổng số dòng chưa lọc, nên phân
  // biệt "rỗng thật" / "không khớp lọc" theo việc có bộ lọc đang bật hay không.
  const listFilteredEmpty = listTotal === 0 && hasListFilters;
  const ctFilteredEmpty = ctTotal === 0 && hasCtFilters;

  const listEmptyTitle = listFilteredEmpty
    ? txt('common.noResults')
    : txt('matTranNhapXuatKho.emptyTitleList');
  const listEmptyDescription = listFilteredEmpty
    ? txt('matTranNhapXuatKho.emptyFilteredHint')
    : txt('matTranNhapXuatKho.emptyHintList');
  const ctEmptyTitle = ctFilteredEmpty
    ? txt('common.noResults')
    : txt('matTranNhapXuatKho.emptyTitleCt');
  const ctEmptyDescription = ctFilteredEmpty
    ? txt('matTranNhapXuatKho.emptyFilteredHint')
    : txt('matTranNhapXuatKho.emptyHintCt');

  const tabs = useMemo(
    () => [
      { id: TAB_LIST, label: txt('matTranNhapXuatKho.tabDanhSach') },
      { id: TAB_CT, label: txt('matTranNhapXuatKho.tabChiTiet') },
    ],
    [],
  );

  const tabSlot = useMemo(
    () => <TabGroup tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="shrink-0" />,
    [activeTab, tabs, setActiveTab],
  );

  const handleEditFromList = useCallback(
    (item: NhapXuatKhoListRow) => {
      void queryClient
        .fetchQuery({
          queryKey: queryKeys.khoNhapXuatKho.detail(item.id),
          queryFn: () => getNhapXuatKhoById(item.id),
          ...transactionalCrudListQueryOptions,
        })
        .then((full) => {
          if (!full) {
            toast.error(txt('matTranNhapXuatKho.service.notFound'));
            return;
          }
          startTransition(() => {
            setFormOrigin('list');
            setEditing(full);
            setShowForm(true);
          });
        })
        .catch(() => {
          toast.error(txt('matTranNhapXuatKho.service.notFound'));
        });
    },
    [queryClient],
  );

  const handleEditFromDetail = (d: NhapXuatKhoDetail) => {
    startTransition(() => {
      setFormOrigin('detail');
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranNhapXuatKho.deleteTitle'),
      message: txt('matTranNhapXuatKho.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMany.mutate([id], {
          onSuccess: () => {
            if (viewingId === id) setViewingId(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('matTranNhapXuatKho.bulkDeleteTitle'),
      message: txt('matTranNhapXuatKho.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMany.mutate(ids, {
          onSuccess: () => {
            listClearSel();
            if (viewingId && ids.includes(viewingId)) setViewingId(null);
          },
        });
      },
    });
  };

  const handleExportList = () => {
    if (listTotal === 0) {
      toast.warning(txt('matTranNhapXuatKho.noExportData'));
      return;
    }
    setShowExportList(true);
  };

  const handleExportCt = () => {
    if (ctTotal === 0) {
      toast.warning(txt('matTranNhapXuatKho.noExportData'));
      return;
    }
    setShowExportCt(true);
  };

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    const vid = viewingId;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && vid && wasEditing && wasEditing.id === vid) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.khoNhapXuatKho.detail(vid) });
    }
    setFormOrigin('list');
  };

  const handleViewFromCtFlat = useCallback(
    (item: NhapXuatKhoCtFlatRow) => {
      setActiveTab(TAB_LIST);
      setViewingId(item.phieu_id);
    },
    [setActiveTab],
  );

  // ---------------------------------------------------------------------
  // Nhập phiếu từ Excel
  //
  // HÌNH DẠNG FILE: một sheet phẳng, MỘT DÒNG = MỘT DÒNG HÀNG, các dòng của
  // cùng một phiếu mang cùng « Mã phiếu ». Lý do chọn (và vì sao không dùng hai
  // sheet) ghi ở đầu `utils/nhap-xuat-kho-import-rows.ts`.
  // Không có cột « Người lập phiếu »: máy chủ tự gán từ phiên đăng nhập.
  // ---------------------------------------------------------------------
  const importQueriesEnabled = canView && showImport;
  const { data: khoListForImport = [] } = useKhoDanhSachKhoList({ enabled: importQueriesEnabled });
  const { data: hangHoaForImport = [] } = useKhoDanhSachHangHoaList({ enabled: importQueriesEnabled });
  const { data: donViCuuTroForImport = [] } = useKhoDonViCuuTroList({ enabled: importQueriesEnabled });
  const { data: dotCuuTroForImport = [] } = useKhoDotCuuTroList({ enabled: importQueriesEnabled });
  const importMutation = useImportNhapXuatKho();

  const IMPORT_COLUMNS = useMemo<ImportColumn[]>(
    () => [
      { key: 'ma_phieu', label: txt('matTranNhapXuatKho.import.colMaPhieu'), required: true },
      { key: 'loai_phieu', label: txt('matTranNhapXuatKho.import.colLoaiPhieu'), required: true },
      { key: 'ngay_phieu', label: txt('matTranNhapXuatKho.import.colNgayPhieu'), required: true },
      { key: 'kho_xuat_id', label: txt('matTranNhapXuatKho.import.colKhoXuat') },
      { key: 'kho_nhap_id', label: txt('matTranNhapXuatKho.import.colKhoNhap') },
      { key: 'don_vi_cuu_tro_id', label: txt('matTranNhapXuatKho.import.colDonViCuuTro') },
      { key: 'dot_cuu_tro_id', label: txt('matTranNhapXuatKho.import.colDotCuuTro') },
      { key: 'hang_hoa_id', label: txt('matTranNhapXuatKho.import.colHangHoa'), required: true },
      { key: 'don_vi_tinh', label: txt('matTranNhapXuatKho.import.colDonViTinh') },
      { key: 'so_luong', label: txt('matTranNhapXuatKho.import.colSoLuong'), required: true },
      { key: 'don_gia', label: txt('matTranNhapXuatKho.import.colDonGia') },
      { key: 'ghi_chu_dong', label: txt('matTranNhapXuatKho.import.colGhiChuDong') },
      { key: 'nguoi_giao_nhan', label: txt('matTranNhapXuatKho.import.colNguoiGiaoNhan') },
      { key: 'bo_phan', label: txt('matTranNhapXuatKho.import.colBoPhan') },
      { key: 'chung_tu_goc', label: txt('matTranNhapXuatKho.import.colChungTuGoc') },
      { key: 'ghi_chu', label: txt('matTranNhapXuatKho.import.colGhiChu') },
    ],
    [],
  );

  const importTemplateSheets = useMemo<ImportTemplateSheet[]>(() => {
    if (!showImport) return [];
    const byName = (a: string, b: string) => a.localeCompare(b, 'vi');
    return [
      {
        name: txt('matTranNhapXuatKho.import.sheetHuongDan'),
        headers: [
          txt('matTranNhapXuatKho.import.huongDanColKey'),
          txt('matTranNhapXuatKho.import.huongDanColVal'),
        ],
        rows: [
          [txt('matTranNhapXuatKho.import.hd1k'), txt('matTranNhapXuatKho.import.hd1v')],
          [txt('matTranNhapXuatKho.import.hd2k'), txt('matTranNhapXuatKho.import.hd2v')],
          [txt('matTranNhapXuatKho.import.hd3k'), txt('matTranNhapXuatKho.import.hd3v')],
          [txt('matTranNhapXuatKho.import.hd4k'), txt('matTranNhapXuatKho.import.hd4v')],
          [txt('matTranNhapXuatKho.import.hd5k'), txt('matTranNhapXuatKho.import.hd5v')],
          [txt('matTranNhapXuatKho.import.hd6k'), txt('matTranNhapXuatKho.import.hd6v')],
          [txt('matTranNhapXuatKho.import.hd7k'), txt('matTranNhapXuatKho.import.hd7v')],
          [txt('matTranNhapXuatKho.import.hd8k'), txt('matTranNhapXuatKho.import.hd8v')],
        ],
      },
      {
        name: txt('matTranNhapXuatKho.import.sheetKho'),
        headers: [txt('matTranNhapXuatKho.import.refColId'), txt('matTranNhapXuatKho.import.refColTen')],
        rows: [...khoListForImport].sort((a, b) => byName(a.ten_kho, b.ten_kho)).map((k) => [k.id, k.ten_kho]),
      },
      {
        name: txt('matTranNhapXuatKho.import.sheetHangHoa'),
        headers: [
          txt('matTranNhapXuatKho.import.refColId'),
          txt('matTranNhapXuatKho.import.refColTen'),
          txt('matTranNhapXuatKho.import.refColDonViTinh'),
        ],
        rows: [...hangHoaForImport]
          .sort((a, b) => byName(a.ten_hang_hoa, b.ten_hang_hoa))
          .map((h) => [h.id, h.ten_hang_hoa, h.don_vi_tinh]),
      },
      {
        name: txt('matTranNhapXuatKho.import.sheetDonViCuuTro'),
        headers: [txt('matTranNhapXuatKho.import.refColId'), txt('matTranNhapXuatKho.import.refColTen')],
        rows: [...donViCuuTroForImport].sort((a, b) => byName(a.ten, b.ten)).map((d) => [d.id, d.ten]),
      },
      {
        name: txt('matTranNhapXuatKho.import.sheetDotCuuTro'),
        headers: [txt('matTranNhapXuatKho.import.refColId'), txt('matTranNhapXuatKho.import.refColTen')],
        rows: [...dotCuuTroForImport].sort((a, b) => byName(a.ten, b.ten)).map((d) => [d.id, d.ten]),
      },
    ];
  }, [showImport, khoListForImport, hangHoaForImport, donViCuuTroForImport, dotCuuTroForImport]);

  const handleImportData = useCallback(
    (data: Record<string, unknown>[]) =>
      importMutation.mutateAsync({
        rows: data,
        // Phạm vi GHI đi theo đúng phạm vi XEM của module: cán bộ xã chỉ lập được
        // phiếu cho kho thuộc đơn vị mình.
        viewer: {
          canViewAll: viewer.canViewAll,
          chucVuCapQuanLy: viewer.chucVuCapQuanLy,
          viewerDonViId: viewer.viewerDonViId,
        },
      }),
    [importMutation, viewer],
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
        {activeTab === TAB_LIST ? (
          <>
            <NhapXuatKhoToolbar
              tabSlot={tabSlot}
              onPageBack={() => navigate('/an-sinh-xa-hoi')}
              onAdd={() => {
                startTransition(() => {
                  setFormOrigin('list');
                  setEditing(null);
                  setShowForm(true);
                });
              }}
              onExport={handleExportList}
              onImport={() => setShowImport(true)}
              onDeleteMany={handleDeleteMany}
            />
            <div className="flex-1 min-h-0">
              <NhapXuatKhoTable
                data={rows}
                isLoading={isListTabLoading}
                isError={listIsError}
                onRetry={listRefetch}
                onEdit={handleEditFromList}
                onDelete={handleDelete}
                onView={(item) => setViewingId(item.id)}
                emptyTitle={listEmptyTitle}
                emptyDescription={listEmptyDescription}
                serverSidePagination
                serverTotalRecords={listTotal}
                serverHasNextPage={listHasNext}
              />
            </div>
          </>
        ) : (
          <>
            <NhapXuatKhoCtFlatToolbar
              tabSlot={tabSlot}
              onPageBack={() => navigate('/an-sinh-xa-hoi')}
              onExport={handleExportCt}
            />
            <div className="flex-1 min-h-0">
              <NhapXuatKhoCtFlatTable
                data={ctRows}
                isLoading={isCtTabLoading}
                isError={ctIsError}
                onRetry={ctRefetch}
                onView={handleViewFromCtFlat}
                emptyTitle={ctEmptyTitle}
                emptyDescription={ctEmptyDescription}
                serverSidePagination
                serverTotalRecords={ctTotal}
                serverHasNextPage={ctHasNext}
              />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <NhapXuatKhoForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <NhapXuatKhoDetailDrawer
              data={viewingData}
              onClose={() => setViewingId(null)}
              onEdit={handleEditFromDetail}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportList && (
          <ExportDialog
            open={showExportList}
            onClose={() => setShowExportList(false)}
            columns={listExportCols}
            data={listExport.exportData}
            paginatedData={listExport.paginatedData}
            selectedData={listExport.selectedData}
            fileName={txt('matTranNhapXuatKho.exportFileName')}
            visibleColumnKeys={listVisibleKeys}
            serverTotalRecords={listTotal}
            fetchAllData={fetchAllListForExport}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExportCt && (
          <ExportDialog
            open={showExportCt}
            onClose={() => setShowExportCt(false)}
            columns={ctExportCols}
            data={ctExport.exportData}
            paginatedData={ctExport.paginatedData}
            selectedData={ctExport.selectedData}
            fileName={txt('matTranNhapXuatKho.exportFileNameCt')}
            visibleColumnKeys={ctVisibleKeys}
            serverTotalRecords={ctTotal}
            fetchAllData={fetchAllCtForExport}
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
            templateFileName={txt('matTranNhapXuatKho.import.templateFileName')}
            templateSheets={importTemplateSheets}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default NhapXuatKhoPage;
