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
import { NDDK_LIST_PATH } from '../core/constants';
import type { NhaDaiDoanKet } from '../core/types';
import { useNhaDaiDoanKetList } from '../hooks/use-nha-dai-doan-ket';
import { canViewNddkRow, useNddkViewer } from '../hooks/use-nddk-viewer';
import { NDDK_THONG_KE_INITIAL_DIMS, filterRowsForNddkThongKe } from '../utils/aggregate-nddk-stats';
import {
  TIEU_DE_DANH_SACH_NHAN_HO_TRO,
  buildDanhSachNhanHoTro,
  type DongNhanHoTro,
} from '../utils/danh-sach-nhan-ho-tro/build-danh-sach-nhan-ho-tro';

/** Khớp mặc định «Tất cả» của tab Thống kê. */
const INITIAL_DATE_RANGE: DateRangeValue = { preset: 'all', customStart: '', customEnd: '' };
const TEN_TAI_LIEU = 'Danh sách nhận hỗ trợ nhà đại đoàn kết';

function toDong(r: NhaDaiDoanKet, cccd: Record<string, string> | undefined): DongNhanHoTro {
  return {
    hoTen: r.ho_ten_chu_ho,
    soCccd: (r.ho_ngheo_id && cccd?.[r.ho_ngheo_id]) || null,
    noiDung: r.noi_dung_ho_tro,
    xaPhuongId: r.xa_phuong_id,
    tenXaPhuong: r.ten_xa_phuong,
    khoiXom: r.khoi_xom,
    doiTuong: r.doi_tuong,
    loaiHinh: r.loai_hinh_ho_tro,
    nguonHoTro: r.nguon_ho_tro,
    soTien: r.so_tien,
  };
}

/**
 * Xem trước danh sách ký nhận — đúng tập dòng tab Thống kê đang lọc (bộ lọc
 * đi qua query string). Phạm vi xem áp lại ở đây, không tin URL.
 */
const NddkInDanhSachPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'nhaDaiDoanKetList');
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const viewer = useNddkViewer();

  const { data: allRows = [], isLoading } = useNhaDaiDoanKetList({ enabled: Boolean(user) && canView });

  const { dims, dateRange } = useMemo(
    () => decodeStatsFilters(searchParams, NDDK_THONG_KE_INITIAL_DIMS, INITIAL_DATE_RANGE),
    [searchParams],
  );
  const resolvedRange = useMemo(
    () => resolveStandardDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );
  const rows = useMemo(
    () =>
      filterRowsForNddkThongKe(
        allRows.filter((r) => canViewNddkRow(viewer, r)),
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
        nhom: [
          {
            tieuDe: `${TIEU_DE_DANH_SACH_NHAN_HO_TRO} NHÀ ĐẠI ĐOÀN KẾT`,
            dong: rows.map((r) => toDong(r, cccd)),
          },
        ],
      }),
    [rows, cccd],
  );

  const backPath = `${NDDK_LIST_PATH}?tab=thong_ke`;
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
    redirect(txt('nhaDaiDoanKet.noViewPermission'));
  }, [user, permissionsLoading, canView, redirect]);

  const loading = !canView || permissionsLoading || isLoading || cccdLoading;

  useEffect(() => {
    if (loading || rows.length > 0) return;
    redirect(txt('nhaDaiDoanKetThongKe.inDanhSachTrong'), 'warning');
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

export default NddkInDanhSachPage;
