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
import { defaultServerQueryOptions } from '@/lib/supabase/query-config';
import { txt } from '@/lib/text';
import { getErrorMessage, getLanguage } from '@/lib/utils';
import { matchesSearchTerm } from '@/lib/searchUtils';
import { useListWithFilter } from '@/lib/hooks';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { CONFIRM_DELETE, CONFIRM_DELETE_ALL } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import TabGroup from '@/components/ui/TabGroup';
import ExportDialog from '@/components/shared/ExportDialog';
import {
  useMttqKhenThuongList,
  useMttqKhenThuongChiTietFlatList,
  useDeleteMttqKhenThuongMany,
  useMttqKhenThuongDetail,
  useUpdateMttqKhenThuong,
} from './hooks/use-mttq-khen-thuong';
import { canViewKhenThuongRow, useMttqKhenThuongViewer } from './hooks/use-mttq-khen-thuong-viewer';
import { useMttqKhenThuongStore } from './store/useMttqKhenThuongStore';
import { useMttqKhenThuongChiTietListStore } from './store/useMttqKhenThuongChiTietListStore';
import type { MttqKhenThuong, MttqKhenThuongChiTietFlatRow, MttqKhenThuongListRow } from './core/types';
import type { MttqKhenThuongFormValues } from './core/schema';
import { MTTQ_KHEN_THUONG_CHI_TIET_FLAT_SEARCHABLE_KEYS, MTTQ_KHEN_THUONG_SEARCHABLE_KEYS } from './utils/search-keys';
import {
  mttqKhenThuongChiTietFlatMatchesColumnSearch,
  mttqKhenThuongMatchesColumnSearch,
} from './utils/column-search';
import { getMttqKhenThuongById } from './services/mttq-khen-thuong-service';
import MttqKhenThuongToolbar from './components/mttq-khen-thuong-toolbar';
import MttqKhenThuongChiTietToolbar from './components/mttq-khen-thuong-chi-tiet-toolbar';
import MttqKhenThuongTable from './components/mttq-khen-thuong-table';
import MttqKhenThuongChiTietTable from './components/mttq-khen-thuong-chi-tiet-table';
import MttqKhenThuongThongKePanel from './components/mttq-khen-thuong-thong-ke-panel';
import { yearFromNgayKhenThuong } from './utils/aggregate-mttq-khen-thuong-stats';

const DON_VI_NONE = '__none__';

type KhenThuongMainTab = 'danh_sach' | 'chi_tiet' | 'thong_ke';

function khenThuongToFormValues(d: MttqKhenThuong): MttqKhenThuongFormValues {
  return {
    so_qd: d.so_qd,
    ngay_khen_thuong: d.ngay_khen_thuong,
    don_vi_de_xuat: d.don_vi_de_xuat ?? undefined,
    ghi_chu: d.ghi_chu ?? undefined,
    trang_thai: d.trang_thai,
    chi_tiet: d.chi_tiet.map((c) => ({
      id: c.id,
      can_bo_id: c.can_bo_id,
      hinh_thuc_khen: c.hinh_thuc_khen,
      danh_hieu: c.danh_hieu,
      noi_dung_khen: c.noi_dung_khen ?? undefined,
      ho_so_khen: c.ho_so_khen ?? undefined,
    })),
  };
}

const MttqKhenThuongForm = lazy(() => import('./components/mttq-khen-thuong-form'));
const MttqKhenThuongDetail = lazy(() => import('./components/mttq-khen-thuong-detail'));

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

const DanhSachKhenThuongPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranRewardList');
  const didRedirect = useRef(false);
  const { data: departments = [] } = useDepartments({ enabled: canView });

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranKhenThuong.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [mainTab, setMainTab] = useState<KhenThuongMainTab>('danh_sach');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqKhenThuong | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const { data: chiTietFlatRows = [], isLoading: isLoadingChiTietFlat } = useMttqKhenThuongChiTietFlatList({
    enabled: canView && mainTab === 'chi_tiet',
  });

  const {
    searchTerm,
    setSearchTerm,
    filters,
    sort,
    resetState: resetKhenListState,
    clearSelection,
    selectedIds,
    pagination,
    columns,
  } = useMttqKhenThuongStore();

  const {
    searchTerm: chiSearchTerm,
    filters: chiFilters,
    sort: chiSort,
    resetState: resetChiTietListState,
  } = useMttqKhenThuongChiTietListStore();

  const { data: rows = [], isLoading } = useMttqKhenThuongList({ enabled: canView });
  const { data: viewingData } = useMttqKhenThuongDetail(viewingId);
  const deleteMutation = useDeleteMttqKhenThuongMany();
  const updateMutation = useUpdateMttqKhenThuong();

  const viewer = useMttqKhenThuongViewer();

  /** Lọc theo viewer trước khi mọi tính toán hiển thị (chip / search / export / sort). */
  const viewableRows = useMemo(
    () => rows.filter((r) => canViewKhenThuongRow(viewer, r)),
    [rows, viewer],
  );

  const viewableChiTietFlatRows = useMemo(
    () => chiTietFlatRows.filter((r) => canViewKhenThuongRow(viewer, r)),
    [chiTietFlatRows, viewer],
  );

  useEffect(() => {
    if (mainTab === 'danh_sach') resetChiTietListState();
    else if (mainTab === 'chi_tiet') resetKhenListState();
    else if (mainTab === 'thong_ke') resetChiTietListState();
  }, [mainTab, resetKhenListState, resetChiTietListState]);

  useEffect(() => {
    return () => {
      resetKhenListState();
      resetChiTietListState();
    };
  }, [resetKhenListState, resetChiTietListState]);

  useEffect(() => {
    if (mainTab !== 'thong_ke') return;
    clearSelection();
    setSearchTerm('');
    setViewingId(null);
    setShowExport(false);
    setShowForm(false);
    setEditing(null);
  }, [mainTab, clearSelection, setSearchTerm]);

  /** Mở drawer chi tiết khi đi từ liên kết `?open=<id_khen_thuong>` (vd. từ detail cán bộ). */
  useEffect(() => {
    if (mainTab !== 'danh_sach') return;
    const raw = searchParams.get('open')?.trim();
    if (!raw) return;
    if (viewableRows.length === 0) return;
    const exists = viewableRows.some((r) => r.id === raw);
    if (exists) setViewingId(raw);
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    setSearchParams(next, { replace: true });
  }, [mainTab, viewableRows, searchParams, setSearchParams]);

  /** Drawer chi tiết: nếu data về mà viewer không đủ quyền (vd. đoán id), tự đóng + báo. */
  useEffect(() => {
    if (!viewingId || !viewingData) return;
    if (!canViewKhenThuongRow(viewer, viewingData)) {
      toast.error(txt('matTranKhenThuong.noViewPermission'));
      setViewingId(null);
    }
  }, [viewingId, viewingData, viewer]);

  const filterFn = useCallback(
    (item: MttqKhenThuongListRow, term: string, f: typeof filters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_KHEN_THUONG_SEARCHABLE_KEYS,
      );
      if (f.trang_thai?.length && !f.trang_thai.includes(item.trang_thai)) return false;
      if (f.nam_khen_thuong?.length) {
        const y = yearFromNgayKhenThuong(item.ngay_khen_thuong);
        if (!y || !f.nam_khen_thuong.includes(y)) return false;
      }
      if (f.don_vi_de_xuat?.length) {
        const dv = (item.don_vi_de_xuat ?? '').trim() || DON_VI_NONE;
        if (!f.don_vi_de_xuat.includes(dv)) return false;
      }
      if (f.hinh_thuc_khen?.length) {
        const sel = f.hinh_thuc_khen;
        if (!item.hinh_thuc_trong_qd.some((x) => sel.includes(x))) return false;
      }
      if (f.danh_hieu?.length) {
        const sel = f.danh_hieu;
        if (!item.danh_hieu_trong_qd.some((x) => sel.includes(x))) return false;
      }
      if (f.id_phong_ban_nguoi_tao?.length) {
        const pb = (item.id_phong_ban_nguoi_tao ?? '').trim() || DON_VI_NONE;
        if (!f.id_phong_ban_nguoi_tao.includes(pb)) return false;
      }
      if (!mttqKhenThuongMatchesColumnSearch(item, f.columnSearch, f)) return false;
      return matchesSearch;
    },
    [],
  );

  const filterFnChiTietFlat = useCallback(
    (item: MttqKhenThuongChiTietFlatRow, term: string, f: typeof chiFilters) => {
      const matchesSearch = matchesSearchTerm(
        item as unknown as Record<string, unknown>,
        term,
        MTTQ_KHEN_THUONG_CHI_TIET_FLAT_SEARCHABLE_KEYS,
      );
      if (f.trang_thai?.length && !f.trang_thai.includes(item.trang_thai)) return false;
      if (f.nam_khen_thuong?.length) {
        const y = yearFromNgayKhenThuong(item.ngay_khen_thuong);
        if (!y || !f.nam_khen_thuong.includes(y)) return false;
      }
      if (f.don_vi_de_xuat?.length) {
        const dv = (item.don_vi_de_xuat ?? '').trim() || DON_VI_NONE;
        if (!f.don_vi_de_xuat.includes(dv)) return false;
      }
      if (f.hinh_thuc_khen?.length && !f.hinh_thuc_khen.includes(item.hinh_thuc_khen)) return false;
      if (f.danh_hieu?.length && !f.danh_hieu.includes(item.danh_hieu)) return false;
      if (f.id_phong_ban_nguoi_tao?.length) {
        const pb = (item.id_phong_ban_nguoi_tao ?? '').trim() || DON_VI_NONE;
        if (!f.id_phong_ban_nguoi_tao.includes(pb)) return false;
      }
      if (!mttqKhenThuongChiTietFlatMatchesColumnSearch(item, f.columnSearch, f)) return false;
      return matchesSearch;
    },
    [],
  );

  const filtered = useListWithFilter(viewableRows, searchTerm, filters, filterFn);
  const filteredChiTietFlat = useListWithFilter(
    viewableChiTietFlatRows,
    chiSearchTerm,
    chiFilters,
    filterFnChiTietFlat,
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqKhenThuongListRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => (b.ngay_khen_thuong || '').localeCompare(a.ngay_khen_thuong || '', getLanguage()));
    }
    return list;
  }, [filtered, sort]);

  const sortedChiTietFlat = useMemo(() => {
    const list = [...filteredChiTietFlat];
    if (chiSort.column && chiSort.direction) {
      list.sort((a, b) => {
        const key = chiSort.column as keyof MttqKhenThuongChiTietFlatRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return chiSort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => {
        const cmpNgay = (b.ngay_khen_thuong || '').localeCompare(a.ngay_khen_thuong || '', getLanguage());
        if (cmpNgay !== 0) return cmpNgay;
        return (b.so_qd || '').localeCompare(a.so_qd || '', getLanguage());
      });
    }
    return list;
  }, [filteredChiTietFlat, chiSort]);

  const trangThaiChipOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableRows) {
      const value = r.trang_thai;
      const label = value || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableRows]);

  const namKhenThuongChipOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of viewableRows) {
      const y = yearFromNgayKhenThuong(r.ngay_khen_thuong);
      if (!y) continue;
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.value.localeCompare(a.value, getLanguage()));
  }, [viewableRows]);

  const donViDeXuatChipOptions = useMemo(() => {
    const counts = new Map<string, number>();
    let empty = 0;
    for (const r of viewableRows) {
      const raw = (r.don_vi_de_xuat ?? '').trim();
      if (!raw) {
        empty += 1;
        continue;
      }
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    const opts = [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    if (empty > 0) {
      opts.unshift({
        value: DON_VI_NONE,
        label: txt('matTranKhenThuong.filter.donViNone'),
        count: empty,
      });
    }
    return opts;
  }, [viewableRows]);

  const trangThaiChipOptionsChiTiet = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const r of viewableChiTietFlatRows) {
      const value = r.trang_thai;
      const label = value || txt('common.emptyCell');
      const cur = map.get(value);
      if (cur) cur.count += 1;
      else map.set(value, { label, count: 1 });
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableChiTietFlatRows]);

  const namKhenThuongChipOptionsChiTiet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of viewableChiTietFlatRows) {
      const y = yearFromNgayKhenThuong(r.ngay_khen_thuong);
      if (!y) continue;
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.value.localeCompare(a.value, getLanguage()));
  }, [viewableChiTietFlatRows]);

  const donViDeXuatChipOptionsChiTiet = useMemo(() => {
    const counts = new Map<string, number>();
    let empty = 0;
    for (const r of viewableChiTietFlatRows) {
      const raw = (r.don_vi_de_xuat ?? '').trim();
      if (!raw) {
        empty += 1;
        continue;
      }
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    const opts = [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    if (empty > 0) {
      opts.unshift({
        value: DON_VI_NONE,
        label: txt('matTranKhenThuong.filter.donViNone'),
        count: empty,
      });
    }
    return opts;
  }, [viewableChiTietFlatRows]);

  const hinhThucChipOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of viewableRows) {
      for (const v of r.hinh_thuc_trong_qd) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableRows]);

  const danhHieuChipOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of viewableRows) {
      for (const v of r.danh_hieu_trong_qd) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableRows]);

  const phongBanNguoiTaoChipOptions = useMemo(() => {
    const byId = new Map(departments.map((d) => [d.id, d.ten_phong_ban]));
    const counts = new Map<string, number>();
    let empty = 0;
    for (const r of viewableRows) {
      const raw = (r.id_phong_ban_nguoi_tao ?? '').trim();
      if (!raw) empty += 1;
      else counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    const opts = [...counts.entries()]
      .map(([value, count]) => ({ value, label: byId.get(value) ?? value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    if (empty > 0) {
      opts.unshift({
        value: DON_VI_NONE,
        label: txt('matTranKhenThuong.filter.phongBanNone'),
        count: empty,
      });
    }
    return opts;
  }, [viewableRows, departments]);

  const hinhThucChipOptionsChiTiet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of viewableChiTietFlatRows) {
      const v = r.hinh_thuc_khen;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableChiTietFlatRows]);

  const danhHieuChipOptionsChiTiet = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of viewableChiTietFlatRows) {
      const v = r.danh_hieu;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [viewableChiTietFlatRows]);

  const phongBanNguoiTaoChipOptionsChiTiet = useMemo(() => {
    const byId = new Map(departments.map((d) => [d.id, d.ten_phong_ban]));
    const counts = new Map<string, number>();
    let empty = 0;
    for (const r of viewableChiTietFlatRows) {
      const raw = (r.id_phong_ban_nguoi_tao ?? '').trim();
      if (!raw) empty += 1;
      else counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    const opts = [...counts.entries()]
      .map(([value, count]) => ({ value, label: byId.get(value) ?? value, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    if (empty > 0) {
      opts.unshift({
        value: DON_VI_NONE,
        label: txt('matTranKhenThuong.filter.phongBanNone'),
        count: empty,
      });
    }
    return opts;
  }, [viewableChiTietFlatRows, departments]);

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'so_qd', label: txt('matTranKhenThuong.store.soQdCol') },
      { key: 'ngay_khen_thuong', label: txt('matTranKhenThuong.store.ngayCol') },
      { key: 'don_vi_de_xuat', label: txt('matTranKhenThuong.store.donViCol') },
      { key: 'trang_thai', label: txt('matTranKhenThuong.store.trangThaiCol') },
      { key: 'so_dong', label: txt('matTranKhenThuong.store.soDongCol') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('matTranKhenThuong.store.nguoiTaoCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqKhenThuongListRow) => ({
      so_qd: item.so_qd,
      ngay_khen_thuong: item.ngay_khen_thuong ?? '',
      don_vi_de_xuat: item.don_vi_de_xuat ?? '',
      trang_thai: item.trang_thai,
      so_dong: String(item.so_dong),
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? '',
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

  const visibleColumnKeys = useMemo(() => columns.filter((c) => c.visible).map((c) => c.id), [columns]);

  const handleEditFromList = async (item: MttqKhenThuongListRow) => {
    try {
      const full = await queryClient.fetchQuery({
        queryKey: queryKeys.mttqKhenThuong.detail(item.id),
        queryFn: () => getMttqKhenThuongById(item.id),
        ...defaultServerQueryOptions,
      });
      if (!full) {
        toast.error(txt('matTranKhenThuong.service.notFound'));
        return;
      }
      if (!canViewKhenThuongRow(viewer, full)) {
        toast.error(txt('matTranKhenThuong.noViewPermission'));
        return;
      }
      startTransition(() => {
        setEditing(full);
        setShowForm(true);
      });
    } catch {
      toast.error(txt('matTranKhenThuong.service.notFound'));
    }
  };

  const handleEditFromDetail = (d: MttqKhenThuong) => {
    startTransition(() => {
      setEditing(d);
      setShowForm(true);
    });
  };

  const handleEditFromChiTietFlatRow = (row: MttqKhenThuongChiTietFlatRow) => {
    void handleEditFromList({ id: row.id_khen_thuong } as MttqKhenThuongListRow);
  };

  const handleDeleteChiTietLine = (row: MttqKhenThuongChiTietFlatRow) => {
    confirm({
      title: txt('matTranKhenThuong.chiTietDrawer.deleteLineTitle'),
      message: txt('matTranKhenThuong.chiTietDrawer.deleteLineMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        try {
          const full = await queryClient.fetchQuery({
            queryKey: queryKeys.mttqKhenThuong.detail(row.id_khen_thuong),
            queryFn: () => getMttqKhenThuongById(row.id_khen_thuong),
            ...defaultServerQueryOptions,
          });
          if (!full) {
            toast.error(txt('matTranKhenThuong.service.notFound'));
            return;
          }
          if (!canViewKhenThuongRow(viewer, full)) {
            toast.error(txt('matTranKhenThuong.noViewPermission'));
            return;
          }
          if (full.chi_tiet.length <= 1) {
            toast.warning(txt('matTranKhenThuong.chiTietDrawer.cannotDeleteLast'));
            return;
          }
          const nextChi = full.chi_tiet.filter((c) => c.id !== row.id);
          await updateMutation.mutateAsync({
            id: row.id_khen_thuong,
            data: khenThuongToFormValues({ ...full, chi_tiet: nextChi }),
          });
        } catch (e: unknown) {
          toast.error(getErrorMessage(e));
        }
      },
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranKhenThuong.deleteTitle'),
      message: txt('matTranKhenThuong.deleteMessage'),
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
    confirm({
      title: txt('matTranKhenThuong.bulkDeleteTitle'),
      message: txt('matTranKhenThuong.bulkDeleteMessage', { count: ids.length }),
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
    if (filtered.length === 0) {
      toast.warning(txt('matTranKhenThuong.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const tabsSlot = useMemo(
    () => (
      <TabGroup
        tabs={[
          { id: 'danh_sach', label: txt('matTranKhenThuong.tabs.danhSach') },
          { id: 'chi_tiet', label: txt('matTranKhenThuong.tabs.chiTietList') },
          { id: 'thong_ke', label: txt('matTranKhenThuong.tabs.thongKe') },
        ]}
        activeTab={mainTab}
        onChange={(id) => setMainTab(id as KhenThuongMainTab)}
        className="shrink-0"
      />
    ),
    [mainTab],
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

  const showNoEmployeeBanner = !nhanVienId;

  return (
    <div className="flex flex-col h-page relative">
      {showNoEmployeeBanner ? (
        <div
          role="status"
          className="mb-2 rounded-lg border border-amber-200 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90"
        >
          {txt('matTranKhenThuong.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        {mainTab === 'danh_sach' ? (
          <>
            <MttqKhenThuongToolbar
              desktopStartSlot={tabsSlot}
              onPageBack={() => navigate('/mat-tran-to-quoc')}
              trangThaiOptions={trangThaiChipOptions}
              namKhenThuongOptions={namKhenThuongChipOptions}
              donViDeXuatOptions={donViDeXuatChipOptions}
              hinhThucOptions={hinhThucChipOptions}
              danhHieuOptions={danhHieuChipOptions}
              phongBanNguoiTaoOptions={phongBanNguoiTaoChipOptions}
              onAdd={() => {
                startTransition(() => {
                  setEditing(null);
                  setShowForm(true);
                });
              }}
              onExport={handleExport}
              onDeleteMany={handleDeleteMany}
            />
            <div className="flex-1 min-h-0">
              <MttqKhenThuongTable
                data={sorted}
                isLoading={isLoading}
                trangThaiHeaderOptions={trangThaiChipOptions}
                onEdit={handleEditFromList}
                onDelete={handleDelete}
                onView={(item) => setViewingId(item.id)}
              />
            </div>
          </>
        ) : mainTab === 'chi_tiet' ? (
          <>
            <MttqKhenThuongChiTietToolbar
              desktopStartSlot={tabsSlot}
              onPageBack={() => navigate('/mat-tran-to-quoc')}
              trangThaiOptions={trangThaiChipOptionsChiTiet}
              namKhenThuongOptions={namKhenThuongChipOptionsChiTiet}
              donViDeXuatOptions={donViDeXuatChipOptionsChiTiet}
              hinhThucOptions={hinhThucChipOptionsChiTiet}
              danhHieuOptions={danhHieuChipOptionsChiTiet}
              phongBanNguoiTaoOptions={phongBanNguoiTaoChipOptionsChiTiet}
            />
            <div className="flex-1 min-h-0">
              <MttqKhenThuongChiTietTable
                data={sortedChiTietFlat}
                isLoading={isLoadingChiTietFlat}
                trangThaiHeaderOptions={trangThaiChipOptionsChiTiet}
                namKhenThuongHeaderOptions={namKhenThuongChipOptionsChiTiet}
                donViDeXuatHeaderOptions={donViDeXuatChipOptionsChiTiet}
                hinhThucHeaderOptions={hinhThucChipOptionsChiTiet}
                danhHieuHeaderOptions={danhHieuChipOptionsChiTiet}
                onViewQd={(id) => setViewingId(id)}
                onEdit={handleEditFromChiTietFlatRow}
                onDelete={handleDeleteChiTietLine}
              />
            </div>
          </>
        ) : (
          <>
            <MttqKhenThuongToolbar
              desktopStartSlot={tabsSlot}
              hideListControls
              onPageBack={() => navigate('/mat-tran-to-quoc')}
              trangThaiOptions={trangThaiChipOptions}
              namKhenThuongOptions={namKhenThuongChipOptions}
              donViDeXuatOptions={donViDeXuatChipOptions}
              hinhThucOptions={hinhThucChipOptions}
              danhHieuOptions={danhHieuChipOptions}
              phongBanNguoiTaoOptions={phongBanNguoiTaoChipOptions}
              onAdd={() => {
                startTransition(() => {
                  setEditing(null);
                  setShowForm(true);
                });
              }}
              onExport={handleExport}
              onDeleteMany={handleDeleteMany}
            />
            <div className="flex-1 min-h-0">
              <MttqKhenThuongThongKePanel rows={filtered} isLoading={isLoading} />
            </div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKhenThuongForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingId && viewingData && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqKhenThuongDetail
              data={viewingData}
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
            fileName={txt('matTranKhenThuong.exportFileName')}
            visibleColumnKeys={visibleColumnKeys}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DanhSachKhenThuongPage;
