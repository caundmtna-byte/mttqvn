import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { DateRangeValue } from '@/components/ui/DateRangePicker';
import BienBanPreview from '@/components/shared/bien-ban/BienBanPreview';
import { fileSlug } from '@/lib/bien-ban/bien-ban-model';
import { resolveStandardDateRange } from '@/lib/date-range-presets';
import { decodeStatsFilters } from '@/lib/stats-filter-search-params';
import { useSoCccdTheoHoNgheo } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/hooks/use-ho-ngheo';
import {
  buildDanhSachNhanHoTro,
  tachTheoLinhVuc,
  tieuDeTheoLinhVuc,
  type DongNhanHoTro,
} from '@/features/nha-dai-doan-ket/danh-sach/utils/danh-sach-nhan-ho-tro/build-danh-sach-nhan-ho-tro';
import { VNN_LINH_VUC_VALUES, VNN_LIST_PATH } from '../core/constants';
import type { ViNguoiNgheo } from '../core/types';
import { useViNguoiNgheoList } from '../hooks/use-vi-nguoi-ngheo';
import { canViewVnnRow, useVnnViewer } from '../hooks/use-vnn-viewer';
import { VNN_THONG_KE_INITIAL_DIMS, filterRowsForVnnThongKe } from '../utils/aggregate-vnn-stats';

/** Khớp mặc định «Tất cả» của tab Thống kê. */
const INITIAL_DATE_RANGE: DateRangeValue = { preset: 'all', customStart: '', customEnd: '' };
const TEN_TAI_LIEU = 'Danh sách nhận chương trình hỗ trợ';

function toDong(r: ViNguoiNgheo, cccd: Record<string, string> | undefined): DongNhanHoTro {
  return {
    hoTen: r.ho_ten_nguoi_nhan,
    soCccd: (r.ho_ngheo_id && cccd?.[r.ho_ngheo_id]) || null,
    noiDung: r.noi_dung_ho_tro,
    xaPhuongId: r.xa_phuong_id,
    tenXaPhuong: r.ten_xa_phuong,
    khoiXom: r.khoi_xom,
    doiTuong: r.doi_tuong,
    loaiHinh: r.hinh_thuc_ho_tro,
    nguonHoTro: r.nguon_ho_tro,
    soTien: r.so_tien,
  };
}

/**
 * Xem trước danh sách ký nhận — đúng tập dòng tab Thống kê đang lọc (bộ lọc
 * đi qua query string). Phạm vi xem áp lại ở đây, không tin URL.
 * Mỗi lĩnh vực một bản riêng (tiêu đề, tổng, chữ ký), sang trang mới.
 */
const VnnInDanhSachPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'viNguoiNgheoList');
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const viewer = useVnnViewer();

  const { data: allRows = [], isLoading } = useViNguoiNgheoList({ enabled: Boolean(user) && canView });

  const { dims, dateRange } = useMemo(
    () => decodeStatsFilters(searchParams, VNN_THONG_KE_INITIAL_DIMS, INITIAL_DATE_RANGE),
    [searchParams],
  );
  const resolvedRange = useMemo(
    () => resolveStandardDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );
  const rows = useMemo(
    () =>
      filterRowsForVnnThongKe(
        allRows.filter((r) => canViewVnnRow(viewer, r)),
        dims,
        resolvedRange,
      ),
    [allRows, viewer, dims, resolvedRange],
  );

  const hoIds = useMemo(
    () => [...new Set(rows.map((r) => r.ho_ngheo_id).filter((id): id is string => Boolean(id)))].sort(),
    [rows],
  );
  const { data: cccd, isLoading: cccdLoading } = useSoCccdTheoHoNgheo(hoIds);

  const model = useMemo(
    () =>
      buildDanhSachNhanHoTro({
        tieuDe: TEN_TAI_LIEU,
        ngayIso: getTodayISODate(),
        nhom: tachTheoLinhVuc(rows, (r) => r.linh_vuc_ho_tro, VNN_LINH_VUC_VALUES).map((n) => ({
          tieuDe: tieuDeTheoLinhVuc(n.linhVuc),
          dong: n.rows.map((r) => toDong(r, cccd)),
        })),
      }),
    [rows, cccd],
  );

  const backPath = `${VNN_LIST_PATH}?tab=thong_ke`;
  const redirect = useCallback(
    (message: string, kind: 'error' | 'warning' = 'error') => {
      if (didRedirect.current) return;
      didRedirect.current = true;
      toast[kind](message);
      navigate(backPath, { replace: true });
    },
    [navigate, backPath],
  );

  useEffect(() => {
    if (!user || permissionsLoading || canView) return;
    redirect(txt('viNguoiNgheo.noViewPermission'));
  }, [user, permissionsLoading, canView, redirect]);

  const loading = !canView || permissionsLoading || isLoading || cccdLoading;

  useEffect(() => {
    if (loading || rows.length > 0) return;
    redirect(txt('viNguoiNgheoThongKe.inDanhSachTrong'), 'warning');
  }, [loading, rows.length, redirect]);

  const handleBack = useCallback(() => navigate(backPath), [navigate, backPath]);

  if (loading || rows.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <BienBanPreview model={model} fileBase={fileSlug(TEN_TAI_LIEU)} onBack={handleBack} />;
};

export default VnnInDanhSachPage;
