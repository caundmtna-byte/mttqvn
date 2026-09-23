import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/use-can';
import { nddkLoaiHinhBadge, nddkTrangThaiBadge } from '../../danh-sach/core/display-badges';
import { formatHnghSoTienDisplay, trimmedHnghDisplay } from '../utils/display-format';
import type { NhaCuaHo } from '../services/nha-cua-ho-service';
import { useNhaDaiDoanKetCuaHo } from '../hooks/use-ho-ngheo';

const NDDK_LIST_PATH = '/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach';

interface Props {
  hoNgheoId: string;
}

/**
 * Nhà đại đoàn kết đã gắn cho hộ — CHỈ ĐỌC.
 *
 * Dữ liệu thuộc module Nhà đại đoàn kết. Sửa ở đây sẽ là nguồn sự thật thứ hai,
 * nên chỉ hiển thị và cho bấm sang module gốc.
 */
const HoNgheoNhaSection: React.FC<Props> = ({ hoNgheoId }) => {
  const navigate = useNavigate();
  const canViewNddk = useCan('view', 'nhaDaiDoanKetList');
  const { data: rows = [], isLoading } = useNhaDaiDoanKetCuaHo(hoNgheoId, { enabled: canViewNddk });

  const openNddk = useCallback(
    (id: string) => {
      navigate(`${NDDK_LIST_PATH}?open=${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      {
        id: 'nam',
        header: txt('hoNgheo.nhaStore.namCol'),
        renderCell: (row: NhaCuaHo) => <span className="tabular-nums">{row.nam || txt('common.emptyCell')}</span>,
      },
      {
        id: 'loai_hinh',
        header: txt('hoNgheo.nhaStore.loaiHinhCol'),
        renderCell: (row: NhaCuaHo) =>
          row.loai_hinh_ho_tro ? (
            <EnumBadge value={row.loai_hinh_ho_tro} config={nddkLoaiHinhBadge} shape="pill" truncate />
          ) : (
            <span className="text-muted-foreground">{txt('common.emptyCell')}</span>
          ),
      },
      {
        id: 'so_tien',
        header: txt('hoNgheo.nhaStore.soTienCol'),
        renderCell: (row: NhaCuaHo) => (
          <span className="tabular-nums font-medium whitespace-nowrap">
            {formatHnghSoTienDisplay(row.so_tien) || txt('common.emptyCell')}
          </span>
        ),
      },
      {
        id: 'trang_thai',
        header: txt('hoNgheo.nhaStore.trangThaiCol'),
        renderCell: (row: NhaCuaHo) =>
          row.trang_thai ? (
            <EnumBadge value={row.trang_thai} config={nddkTrangThaiBadge} shape="pill" truncate />
          ) : (
            <span className="text-muted-foreground">{txt('common.emptyCell')}</span>
          ),
      },
    ],
    [],
  );

  // Không có quyền xem module gốc thì khối này không hiện — tránh lộ dữ liệu
  // của module khác qua đường vòng.
  if (!canViewNddk) return null;

  const countLabel = isLoading ? '…' : String(rows.length);

  return (
    <DetailSection
      title={txt('hoNgheo.detail.sectionNhaDaiDoanKet')}
      icon={<Home size={14} aria-hidden />}
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {countLabel} {txt('hoNgheo.detail.nhaRecordsSuffix')}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={() => navigate(NDDK_LIST_PATH)}
          >
            <ExternalLink size={14} />
            {txt('hoNgheo.detail.nhaOpenModule')}
          </Button>
        </div>
      }
    >
      {rows.length === 0 && !isLoading ? (
        <EmptyState title={txt('hoNgheo.detail.nhaEmpty')} />
      ) : (
        <>
          <EmbeddedChildDataGrid<NhaCuaHo>
            rows={rows}
            getRowKey={(row) => row.id}
            onRowClick={(row) => openNddk(row.id)}
            labelColumn={{
              header: txt('hoNgheo.nhaStore.noiDungCol'),
              renderCell: (row) => (
                <span className="truncate" title={row.noi_dung_ho_tro}>
                  {trimmedHnghDisplay(row.noi_dung_ho_tro) ?? txt('common.emptyCell')}
                </span>
              ),
            }}
            columns={columns}
            actionsColumn={{
              header: '',
              renderCell: (row) => (
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => openNddk(row.id)}
                  >
                    <ExternalLink size={13} />
                  </Button>
                </div>
              ),
            }}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {txt('hoNgheo.detail.nhaReadOnlyHint')}
          </p>
        </>
      )}
    </DetailSection>
  );
};

export default HoNgheoNhaSection;
