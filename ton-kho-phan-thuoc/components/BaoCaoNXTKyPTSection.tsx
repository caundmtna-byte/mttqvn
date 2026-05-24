import React, { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useKhoList } from '../../../kho-van/danh-sach-kho/hooks/use-kho';
import { useFarmHangHoaList } from '../../hang-hoa-phan-thuoc/hooks/use-farm-hang-hoa';
import { useFarmDanhMucCap2WithParent } from '../../hang-hoa-phan-thuoc/hooks/use-farm-danh-muc';
import { useFarmNXTPT, isNXTDateRangeValid } from '../hooks/use-farm-ton-kho-pt';
import { useTonKhoPTStore } from '../store/useTonKhoPTStore';
import type { LoaiPhieuKhoPT } from '../../phieu-kho-phan-thuoc/core/types';
import type { NXTPTFilters } from '../core/types';
import { exportFarmNXTPTToExcel } from '../utils/export-ton-kho-pt';
import BaoCaoNXTPTToolbar from './BaoCaoNXTPTToolbar';
import TongHopNXTKyPTTab from './TongHopNXTKyPTTab';

const BaoCaoNXTKyPTSection: React.FC = () => {
  const { t } = useTranslation();
  const { data: khoList = [] } = useKhoList();
  const { data: hangHoaList = [] } = useFarmHangHoaList();
  const { data: danhMucCap2 = [] } = useFarmDanhMucCap2WithParent();
  const clearNxtFilters = useTonKhoPTStore((s) => s.clearNxtFilters);

  const nxtDateFrom = useTonKhoPTStore((s) => s.nxtDateFrom);
  const nxtDateTo = useTonKhoPTStore((s) => s.nxtDateTo);
  const nxtWarehouseIds = useTonKhoPTStore((s) => s.nxtWarehouseIds);
  const nxtLoaiPhieu = useTonKhoPTStore((s) => s.nxtLoaiPhieu);
  const nxtHangHoaIds = useTonKhoPTStore((s) => s.nxtHangHoaIds);
  const nxtCategoryIds = useTonKhoPTStore((s) => s.nxtCategoryIds);

  const filters: NXTPTFilters = useMemo(
    () => ({
      dateFrom: nxtDateFrom,
      dateTo: nxtDateTo,
      warehouseIds: nxtWarehouseIds,
      loaiPhieu: nxtLoaiPhieu as LoaiPhieuKhoPT[],
      hangHoaIds: nxtHangHoaIds,
      categoryIds: nxtCategoryIds,
    }),
    [nxtDateFrom, nxtDateTo, nxtWarehouseIds, nxtLoaiPhieu, nxtHangHoaIds, nxtCategoryIds]
  );

  const rangeOk = isNXTDateRangeValid(filters);
  const { data } = useFarmNXTPT(filters, true);

  const onExport = useCallback(async () => {
    if (!rangeOk) {
      toast.error(t('tonKhoPhanThuoc.nxt.dateInvalid'));
      return;
    }
    if (!data) {
      toast.error(t('tonKhoPhanThuoc.nxt.noData'));
      return;
    }
    try {
      await exportFarmNXTPTToExcel(data, t);
      toast.success(t('tonKhoPhanThuoc.export.success'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('tonKhoPhanThuoc.export.error'));
    }
  }, [rangeOk, data, t]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 mt-1.5">
      <div className="shrink-0 print:hidden">
        <BaoCaoNXTPTToolbar
          khoList={khoList}
          danhMucCap2={danhMucCap2}
          hangHoaList={hangHoaList}
          onExportExcel={onExport}
        />
      </div>
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <TongHopNXTKyPTTab onClearFilters={clearNxtFilters} />
      </div>
    </div>
  );
};

export default BaoCaoNXTKyPTSection;
