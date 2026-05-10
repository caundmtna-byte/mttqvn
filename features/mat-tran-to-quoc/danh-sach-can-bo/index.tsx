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
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import ExportDialog from '@/components/shared/ExportDialog';
import ImportDialog, { type ImportTemplateSheet } from '@/components/shared/ImportDialog';
import { useMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/hooks/use-mttq-thiet-lap';
import { usePositions } from '@/features/he-thong/chuc-vu/hooks/use-chuc-vu';
import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { useDepartments } from '@/features/he-thong/phong-ban/hooks/use-phong-ban';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { queryKeys } from '@/lib/query-keys';
import { geoDataQueryOptions } from '@/lib/supabase/query-config';
import { useMttqCanBoList, useDeleteMttqCanBoMany, useImportMttqCanBo } from './hooks/use-mttq-can-bo';
import { useMttqCanBoStore } from './store/useMttqCanBoStore';
import type { MttqCanBoRow } from './core/types';
import { mttqCanBoMatchesAllFilters } from './utils/mttq-can-bo-filter-match';
import { computeAgeFromBirthDate } from './utils/age';
import { formatCanBoPhoneDisplay } from './utils/display-format';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import {
  CHIP_DANG_VIEN_NO,
  CHIP_DANG_VIEN_YES,
  CHIP_FILTER_NULL,
  CHIP_TRANG_THAI_NULL,
} from './core/constants';
import { useMttqCanBoFilterCounts } from './hooks/use-mttq-can-bo-filter-counts';
import MttqCanBoToolbar from './components/mttq-can-bo-toolbar';
import MttqCanBoTable from './components/mttq-can-bo-table';

const MttqCanBoForm = lazy(() => import('./components/mttq-can-bo-form'));
const MttqCanBoDetail = lazy(() => import('./components/mttq-can-bo-detail'));

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

/** `useMttqCanBoFilterCounts` luôn trả map; phòng HMR / partial object. */
function mttqCanBoChipCount(map: Record<string, number> | undefined | null, key: string): number {
  return (map ?? {})[key] ?? 0;
}

type FormOrigin = 'list' | 'detail';

const DanhSachCanBoPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  const canView = useCan('view', 'matTranOfficerList');
  const canImport = useCan('import', 'matTranOfficerList');
  const canViewPositions = useCan('view', 'positions');
  const canCreateCanBo = useCan('create', 'matTranOfficerList');
  const canEditCanBo = useCan('edit', 'matTranOfficerList');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranCanBo.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MttqCanBoRow | null>(null);
  const [viewing, setViewing] = useState<MttqCanBoRow | null>(null);
  const [formOrigin, setFormOrigin] = useState<FormOrigin>('list');
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { searchTerm, filters, sort, resetState, clearSelection, selectedIds, pagination, columns } =
    useMttqCanBoStore();

  const { data: rows = [], isLoading } = useMttqCanBoList({ enabled: canView });
  const deleteMutation = useDeleteMttqCanBoMany();
  const importQueriesEnabled = canView && showImport && canImport;
  const { data: thietLapAll = [] } = useMttqThietLapAll({ enabled: importQueriesEnabled });
  const { data: positions = [] } = usePositions({
    enabled:
      importQueriesEnabled && (canViewPositions || canCreateCanBo || canEditCanBo || canImport),
  });
  const { data: departments = [] } = useDepartments({ enabled: importQueriesEnabled });
  const { data: tinhList = [] } = useTinhThanhList({ enabled: importQueriesEnabled });
  const { data: xaList = [] } = useQuery({
    queryKey: queryKeys.xaPhuong.listAll,
    queryFn: getXaPhuongAll,
    enabled: importQueriesEnabled,
    ...geoDataQueryOptions,
  });
  const importMutation = useImportMttqCanBo();

  const rowsEnriched = useMemo<MttqCanBoRow[]>(
    () =>
      rows.map((r) => ({
        ...r,
        tuoi: computeAgeFromBirthDate(r.ngay_sinh),
      })),
    [rows],
  );

  useEffect(() => {
    return () => resetState();
  }, [resetState]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rowsEnriched.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rowsEnriched, viewing]);

  const filterFn = useCallback((item: MttqCanBoRow, term: string, f: typeof filters) => {
    return mttqCanBoMatchesAllFilters(item, term, f);
  }, []);

  const filtered = useListWithFilter(rowsEnriched, searchTerm, filters, filterFn);

  const {
    trangThaiCounts,
    gioiTinhCounts,
    toChucCounts,
    phongBanCounts,
    chucVuCounts,
    capQuanLyCounts,
    donViCounts,
    danTocCounts,
    trinhDoCounts,
    lyLuanCounts,
    dangVienCounts,
  } = useMttqCanBoFilterCounts(rowsEnriched, searchTerm, filters);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sort.column && sort.direction) {
      list.sort((a, b) => {
        const key = sort.column as keyof MttqCanBoRow;
        const aVal = a[key];
        const bVal = b[key];
        const cmp =
          typeof aVal === 'number' && typeof bVal === 'number' && aVal != null && bVal != null
            ? aVal - bVal
            : String(aVal ?? '').localeCompare(String(bVal ?? ''), getLanguage());
        return sort.direction === 'desc' ? -cmp : cmp;
      });
    } else {
      list.sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, getLanguage()));
    }
    return list;
  }, [filtered, sort]);

  const trangThaiChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.trang_thai_id ?? CHIP_TRANG_THAI_NULL;
      const label = (r.ten_trang_thai ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(trangThaiCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, trangThaiCounts]);

  const gioiTinhChipOptions = useMemo(() => {
    const set = new Set(rowsEnriched.map((r) => r.gioi_tinh).filter(Boolean));
    const values = [...set].sort((a, b) => a.localeCompare(b, getLanguage()));
    return values.map((value) => ({
      value,
      label: value,
      count: mttqCanBoChipCount(gioiTinhCounts, value),
    }));
  }, [rowsEnriched, gioiTinhCounts]);

  const toChucChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.to_chuc_id ?? CHIP_FILTER_NULL;
      const label = (r.ten_to_chuc ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(toChucCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, toChucCounts]);

  const phongBanChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    const ec = txt('common.emptyCell');
    for (const r of rowsEnriched) {
      const value = r.phong_ban_id ?? CHIP_FILTER_NULL;
      const parent = (r.ten_phong_ban ?? '').trim();
      const sub = (r.ten_bo_phan ?? '').trim();
      const label = sub && parent ? `${parent} · ${sub}` : sub || parent || ec;
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(phongBanCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, phongBanCounts]);

  const chucVuChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.chuc_vu_id ?? CHIP_FILTER_NULL;
      const label = (r.ten_chuc_vu ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(chucVuCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, chucVuCounts]);

  const capQuanLyChipOptions = useMemo(
    () =>
      [CHIP_FILTER_NULL, 'Tỉnh', 'Xã phường'].map((value) => ({
        value,
        label:
          value === CHIP_FILTER_NULL
            ? txt('matTranOfficerStats.capQuanLyChuaGan')
            : (value as 'Tỉnh' | 'Xã phường'),
        count: mttqCanBoChipCount(capQuanLyCounts, value),
      })),
    [capQuanLyCounts],
  );

  const donViChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.don_vi_id ?? CHIP_FILTER_NULL;
      const label =
        formatTenDonViCongTacDisplay(r.chuc_vu_cap_quan_ly, r.ten_don_vi).trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(donViCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, donViCounts]);

  const danTocChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.dan_toc_id ?? CHIP_FILTER_NULL;
      const label = (r.ten_dan_toc ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(danTocCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, danTocCounts]);

  const trinhDoChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.trinh_do_id ?? CHIP_FILTER_NULL;
      const label = (r.ten_trinh_do ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(trinhDoCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, trinhDoCounts]);

  const lyLuanChipOptions = useMemo(() => {
    const labelByValue = new Map<string, string>();
    for (const r of rowsEnriched) {
      const value = r.ly_luan_chinh_tri_id ?? CHIP_FILTER_NULL;
      const label = (r.ten_ly_luan_chinh_tri ?? '').trim() || txt('common.emptyCell');
      if (!labelByValue.has(value)) labelByValue.set(value, label);
    }
    return [...labelByValue.entries()]
      .map(([value, label]) => ({
        value,
        label,
        count: mttqCanBoChipCount(lyLuanCounts, value),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  }, [rowsEnriched, lyLuanCounts]);

  const dangVienChipOptions = useMemo(
    () => [
      {
        value: CHIP_DANG_VIEN_YES,
        label: txt('matTranCanBo.detail.dangVienYes'),
        count: mttqCanBoChipCount(dangVienCounts, CHIP_DANG_VIEN_YES),
      },
      {
        value: CHIP_DANG_VIEN_NO,
        label: txt('matTranCanBo.detail.dangVienNo'),
        count: mttqCanBoChipCount(dangVienCounts, CHIP_DANG_VIEN_NO),
      },
    ],
    [dangVienCounts],
  );

  const toolbarChipOptions = useMemo(
    () => ({
      trangThai: trangThaiChipOptions,
      gioiTinh: gioiTinhChipOptions,
      toChuc: toChucChipOptions,
      phongBan: phongBanChipOptions,
      chucVu: chucVuChipOptions,
      capQuanLy: capQuanLyChipOptions,
      donVi: donViChipOptions,
      danToc: danTocChipOptions,
      trinhDo: trinhDoChipOptions,
      lyLuan: lyLuanChipOptions,
      dangVien: dangVienChipOptions,
    }),
    [
      trangThaiChipOptions,
      gioiTinhChipOptions,
      toChucChipOptions,
      phongBanChipOptions,
      chucVuChipOptions,
      capQuanLyChipOptions,
      donViChipOptions,
      danTocChipOptions,
      trinhDoChipOptions,
      lyLuanChipOptions,
      dangVienChipOptions,
    ],
  );

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'ho_ten', label: txt('matTranCanBo.store.hoTenCol') },
      { key: 'ngay_sinh', label: txt('matTranCanBo.store.ngaySinhCol') },
      { key: 'tuoi', label: txt('matTranCanBo.store.tuoiCol') },
      { key: 'gioi_tinh', label: txt('matTranCanBo.store.gioiTinhCol') },
      { key: 'ten_trang_thai', label: txt('matTranCanBo.store.trangThaiCol') },
      { key: 'ten_to_chuc', label: txt('matTranCanBo.store.toChucCol') },
      { key: 'ten_phong_ban', label: txt('matTranCanBo.store.phongBanCol') },
      { key: 'ten_chuc_vu', label: txt('matTranCanBo.store.chucVuCol') },
      { key: 'chuc_vu_cap_quan_ly', label: txt('matTranCanBo.store.capQuanLyCol') },
      { key: 'ten_don_vi', label: txt('matTranCanBo.store.donViCol') },
      { key: 'dien_thoai', label: txt('matTranCanBo.store.dienThoaiCol') },
      { key: 'dang_vien', label: txt('matTranCanBo.store.dangVienCol') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqCanBoRow) => ({
      ho_ten: item.ho_ten,
      ngay_sinh: item.ngay_sinh ? formatDate(item.ngay_sinh) : '',
      tuoi: item.tuoi != null ? txt('matTranCanBo.display.ageYears', { years: String(item.tuoi) }) : '',
      gioi_tinh: item.gioi_tinh,
      ten_trang_thai: item.ten_trang_thai ?? '',
      ten_to_chuc: item.ten_to_chuc ?? '',
      ten_phong_ban: item.ten_phong_ban ?? '',
      ten_chuc_vu: item.ten_chuc_vu ?? '',
      chuc_vu_cap_quan_ly: normalizeCapQuanLyInput(item.chuc_vu_cap_quan_ly) ?? '',
      ten_don_vi: formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi),
      dien_thoai: formatCanBoPhoneDisplay(item.dien_thoai) || (item.dien_thoai ?? ''),
      dang_vien: item.dang_vien ? txt('matTranCanBo.detail.dangVienYes') : txt('matTranCanBo.detail.dangVienNo'),
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

  const IMPORT_COLUMNS = useMemo(
    () => [
      { key: 'id_phong_ban', label: txt('matTranCanBo.import.colPhongBan'), required: true },
      { key: 'to_chuc_id', label: txt('matTranCanBo.import.colToChuc'), required: true },
      { key: 'ho_ten', label: txt('matTranCanBo.import.colHoTen'), required: true },
      { key: 'ngay_sinh', label: txt('matTranCanBo.import.colNgaySinh'), required: true },
      { key: 'gioi_tinh', label: txt('matTranCanBo.import.colGioiTinh'), required: true },
      { key: 'dan_toc_id', label: txt('matTranCanBo.import.colDanToc'), required: true },
      { key: 'ton_giao', label: txt('matTranCanBo.import.colTonGiao'), required: true },
      { key: 'dia_chi', label: txt('matTranCanBo.import.colDiaChi'), required: true },
      { key: 'dang_vien', label: txt('matTranCanBo.import.colDangVien'), required: true },
      { key: 'trinh_do_id', label: txt('matTranCanBo.import.colTrinhDo'), required: true },
      { key: 'ly_luan_chinh_tri_id', label: txt('matTranCanBo.import.colLyLuan'), required: true },
      { key: 'dien_thoai', label: txt('matTranCanBo.import.colDienThoai'), required: true },
      { key: 'chuc_vu_id', label: txt('matTranCanBo.import.colChucVu'), required: true },
      { key: 'don_vi_id', label: txt('matTranCanBo.import.colDonVi'), required: false },
      { key: 'ngay_tham_gia_to_chuc', label: txt('matTranCanBo.import.colNgayThamGia'), required: true },
      { key: 'trang_thai_id', label: txt('matTranCanBo.import.colTrangThai'), required: true },
      { key: 'ngay_nhap_trang_thai', label: txt('matTranCanBo.import.colNgayNhapTT'), required: true },
      { key: 'van_hoa', label: txt('matTranCanBo.import.colVanHoa'), required: false },
      { key: 'ngay_vao_dang', label: txt('matTranCanBo.import.colNgayVaoDang'), required: false },
      { key: 'que_quan', label: txt('matTranCanBo.import.colQueQuan'), required: false },
      { key: 'noi_o_hien_nay', label: txt('matTranCanBo.import.colNoiOHienNay'), required: false },
    ],
    [],
  );

  const templateSheets = useMemo((): ImportTemplateSheet[] => {
    if (!showImport) return [];
    const lang = getLanguage();
    const huongDan: ImportTemplateSheet = {
      name: txt('matTranCanBo.import.sheetHuongDan'),
      headers: [txt('matTranCanBo.import.huongDanColKey'), txt('matTranCanBo.import.huongDanColVal')],
      rows: [
        [txt('matTranCanBo.import.huongR1k'), txt('matTranCanBo.import.huongR1v')],
        [txt('matTranCanBo.import.huongR2k'), txt('matTranCanBo.import.huongR2v')],
        [txt('matTranCanBo.import.huongR3k'), txt('matTranCanBo.import.huongR3v')],
        [txt('matTranCanBo.import.huongR4k'), txt('matTranCanBo.import.huongR4v')],
        [txt('matTranCanBo.import.huongR5k'), txt('matTranCanBo.import.huongR5v')],
      ],
    };

    const refSheet = (name: string, loai: 'to_chuc' | 'dan_toc' | 'trinh_do' | 'ly_luan_chinh_tri' | 'trang_thai'): ImportTemplateSheet => ({
      name,
      headers: [txt('matTranCanBo.import.refColId'), txt('matTranCanBo.import.refColTen')],
      rows: [...thietLapAll.filter((x) => x.loai === loai)]
        .sort((a, b) => a.ten.localeCompare(b.ten, lang))
        .map((x) => [x.id, x.ten]),
    });

    const deptRows = [...departments].sort((a, b) =>
      a.ten_phong_ban.localeCompare(b.ten_phong_ban, lang),
    );
    const phongBan: ImportTemplateSheet = {
      name: txt('matTranCanBo.import.sheetPhongBan'),
      headers: [
        txt('matTranCanBo.import.refColId'),
        txt('matTranCanBo.import.refColTenPhongBan'),
        txt('matTranCanBo.import.refColChaId'),
        txt('matTranCanBo.import.refColTenPhongCha'),
        txt('matTranCanBo.import.refColTrangThai'),
      ],
      rows: deptRows.map((d) => {
        const chaTen =
          d.cha_id != null && String(d.cha_id) !== ''
            ? departments.find((p) => String(p.id) === String(d.cha_id))?.ten_phong_ban ?? ''
            : '';
        return [d.id, d.ten_phong_ban, d.cha_id ?? '', chaTen, d.trang_thai];
      }),
    };

    const posRows = [...positions].sort((a, b) => a.ten_chuc_vu.localeCompare(b.ten_chuc_vu, lang));
    const chucVu: ImportTemplateSheet = {
      name: txt('matTranCanBo.import.sheetChucVu'),
      headers: [
        txt('matTranCanBo.import.refColId'),
        txt('matTranCanBo.import.refColTen'),
        txt('matTranCanBo.import.refColCapQuanLy'),
        txt('matTranCanBo.import.refColPhongBanId'),
        txt('matTranCanBo.import.refColTenPhongBan'),
      ],
      rows: posRows.map((p) => [
        p.id,
        p.ten_chuc_vu,
        p.cap_quan_ly ?? '',
        p.phong_ban_id ?? '',
        p.ten_phong_ban ?? '',
      ]),
    };

    const tinhMap = new Map(tinhList.map((t) => [String(t.id), t.ten]));
    const xaRows = [...xaList].sort((a, b) => {
      const ta = tinhMap.get(String(a.id_tinh_thanh)) ?? '';
      const tb = tinhMap.get(String(b.id_tinh_thanh)) ?? '';
      const c = ta.localeCompare(tb, lang);
      return c !== 0 ? c : a.ten.localeCompare(b.ten, lang);
    });
    const xaPhuong: ImportTemplateSheet = {
      name: txt('matTranCanBo.import.sheetXaPhuong'),
      headers: [
        txt('matTranCanBo.import.refColId'),
        txt('matTranCanBo.import.refColTen'),
        txt('matTranCanBo.import.refColIdTinh'),
        txt('matTranCanBo.import.refColTenTinh'),
      ],
      rows: xaRows.map((x) => [x.id, x.ten, x.id_tinh_thanh, tinhMap.get(String(x.id_tinh_thanh)) ?? '']),
    };

    return [
      huongDan,
      refSheet(txt('matTranCanBo.import.sheetToChuc'), 'to_chuc'),
      refSheet(txt('matTranCanBo.import.sheetDanToc'), 'dan_toc'),
      refSheet(txt('matTranCanBo.import.sheetTrinhDo'), 'trinh_do'),
      refSheet(txt('matTranCanBo.import.sheetLyLuan'), 'ly_luan_chinh_tri'),
      refSheet(txt('matTranCanBo.import.sheetTrangThai'), 'trang_thai'),
      phongBan,
      chucVu,
      xaPhuong,
    ];
  }, [showImport, thietLapAll, positions, departments, tinhList, xaList]);

  const visibleColumnKeys = useMemo(() => columns.filter((c) => c.visible).map((c) => c.id), [columns]);

  const handleEdit = (item: MttqCanBoRow) => {
    startTransition(() => {
      setFormOrigin(viewing ? 'detail' : 'list');
      setEditing(item);
      setShowForm(true);
    });
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('matTranCanBo.deleteTitle'),
      message: txt('matTranCanBo.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  const handleDeleteMany = (ids: string[]) => {
    confirm({
      title: txt('matTranCanBo.bulkDeleteTitle'),
      message: txt('matTranCanBo.bulkDeleteMessage', { count: ids.length }),
      variant: 'danger',
      confirmText: CONFIRM_DELETE_ALL(),
      onConfirm: async () => {
        deleteMutation.mutate(ids, {
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
      toast.warning(txt('matTranCanBo.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const canImportWithProfile = canImport && Boolean(nhanVienId);

  const handleImportData = useCallback(
    async (data: Record<string, unknown>[]) => {
      if (!nhanVienId) {
        throw new Error(txt('matTranCanBo.service.noEmployeeProfile'));
      }
      await importMutation.mutateAsync({ rows: data, idNguoiTao: nhanVienId });
    },
    [importMutation, nhanVienId],
  );

  const handleCloseForm = () => {
    const wasEditing = editing;
    const origin = formOrigin;
    setShowForm(false);
    setEditing(null);
    if (origin === 'detail' && viewing && wasEditing && viewing.id === wasEditing.id) {
      const fresh = rowsEnriched.find((r) => r.id === viewing.id);
      if (fresh) setViewing(fresh);
    }
    setFormOrigin('list');
  };

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
          {txt('matTranCanBo.noEmployeeBanner')}
        </div>
      ) : null}
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <MttqCanBoToolbar
          onPageBack={() => navigate('/mat-tran-to-quoc')}
          chipOptions={toolbarChipOptions}
          onAdd={() => {
            startTransition(() => {
              setFormOrigin('list');
              setEditing(null);
              setShowForm(true);
            });
          }}
          onExport={handleExport}
          onImport={canImportWithProfile ? () => setShowImport(true) : undefined}
          onDeleteMany={handleDeleteMany}
        />

        <div className="flex-1 min-h-0">
          <MttqCanBoTable
            data={sorted}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={setViewing}
            chipOptions={toolbarChipOptions}
          />
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqCanBoForm initialData={editing} onClose={handleCloseForm} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewing && !showForm && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqCanBoDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={handleEdit}
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
            fileName={txt('matTranCanBo.exportFileName')}
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
            templateFileName={txt('matTranCanBo.import.templateFileName')}
            templateSheets={templateSheets}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default DanhSachCanBoPage;
