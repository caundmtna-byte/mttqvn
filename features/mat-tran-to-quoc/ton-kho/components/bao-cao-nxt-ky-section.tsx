import React, { useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useKhoDanhSachKhoList } from '../../danh-sach-kho/hooks/use-kho-danh-sach-kho';
import { useKhoDanhSachHangHoaList } from '../../hang-hoa/hooks/use-kho-danh-sach-hang-hoa';
import { useKhoDanhMucHangHoaList } from '../../hang-hoa/hooks/use-kho-danh-muc-hang-hoa';
import { useNXTByPeriod, isNXTDateRangeValid } from '../hooks/use-kho-ton-kho';
import { useKhoTonKhoViewer, getViewerKhoIds } from '../hooks/use-kho-ton-kho-viewer';
import { useTonKhoNxtStore } from '../store/useTonKhoNxtStore';
import type { NXTFilters } from '../core/types';
import { exportNXTToExcel } from '../utils/export-ton-kho';
import BaoCaoNxtToolbar from './bao-cao-nxt-toolbar';
import TongHopNxtKyTab from './tong-hop-nxt-ky-tab';
import { txt } from '@/lib/text';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';

interface Props {
  onBack: () => void;
  listQueryEnabled: boolean;
}

const BaoCaoNxtKySection: React.FC<Props> = ({ onBack, listQueryEnabled }) => {
  const { canExport } = useResourcePermissions('matTranReliefInventory');
  const viewer = useKhoTonKhoViewer();
  const { data: khoList = [] } = useKhoDanhSachKhoList({ enabled: listQueryEnabled });
  const viewerKhoIds = useMemo(() => getViewerKhoIds(viewer, khoList), [viewer, khoList]);
  const { data: hangHoaList = [] } = useKhoDanhSachHangHoaList({ enabled: listQueryEnabled });
  const { data: danhMucList = [] } = useKhoDanhMucHangHoaList({ enabled: listQueryEnabled });
  const clearNxtFilters = useTonKhoNxtStore((s) => s.clearNxtFilters);

  const nxtDateFrom = useTonKhoNxtStore((s) => s.nxtDateFrom);
  const nxtDateTo = useTonKhoNxtStore((s) => s.nxtDateTo);
  const nxtWarehouseIds = useTonKhoNxtStore((s) => s.nxtWarehouseIds);
  const nxtLoaiPhieu = useTonKhoNxtStore((s) => s.nxtLoaiPhieu);
  const nxtHangHoaIds = useTonKhoNxtStore((s) => s.nxtHangHoaIds);
  const nxtCategoryIds = useTonKhoNxtStore((s) => s.nxtCategoryIds);

  const viewableKhoList = useMemo(
    () =>
      viewerKhoIds
        ? khoList.filter((k) => viewerKhoIds.includes(k.id))
        : khoList,
    [khoList, viewerKhoIds],
  );

  const effectiveWarehouseIds = useMemo(() => {
    if (!viewerKhoIds) return nxtWarehouseIds;
    if (nxtWarehouseIds.length > 0) {
      return nxtWarehouseIds.filter((id) => viewerKhoIds.includes(id));
    }
    return viewerKhoIds;
  }, [viewerKhoIds, nxtWarehouseIds]);

  const filters: NXTFilters = useMemo(
    () => ({
      dateFrom: nxtDateFrom,
      dateTo: nxtDateTo,
      warehouseIds: effectiveWarehouseIds,
      loaiPhieu: nxtLoaiPhieu,
      hangHoaIds: nxtHangHoaIds,
      categoryIds: nxtCategoryIds,
    }),
    [nxtDateFrom, nxtDateTo, effectiveWarehouseIds, nxtLoaiPhieu, nxtHangHoaIds, nxtCategoryIds]
  );

  const rangeOk = isNXTDateRangeValid(filters);
  const { data } = useNXTByPeriod(filters, listQueryEnabled);

  const onExport = useCallback(async () => {
    if (!rangeOk) {
      toast.error(txt('matTranTonKho.nxt.dateInvalid'));
      return;
    }
    if (!data) {
      toast.error(txt('matTranTonKho.nxt.noData'));
      return;
    }
    try {
      await exportNXTToExcel(data);
      toast.success(txt('matTranTonKho.export.success'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : txt('matTranTonKho.export.error'));
    }
  }, [rangeOk, data]);

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2 mt-1.5">
      <div className="shrink-0 print:hidden">
        <BaoCaoNxtToolbar
          khoList={viewableKhoList}
          danhMucList={danhMucList}
          hangHoaList={hangHoaList}
          onExportExcel={onExport}
          onBack={onBack}
          canExport={canExport}
        />
      </div>
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <TongHopNxtKyTab onClearFilters={clearNxtFilters} />
      </div>
    </div>
  );
};

export default BaoCaoNxtKySection;
