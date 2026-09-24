import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ExternalLink, Plus } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { nddkLoaiHinhBadge, nddkTrangThaiBadge } from '../../danh-sach/core/display-badges';
import { formatHnghSoTienDisplay, trimmedHnghDisplay } from '../utils/display-format';
import type { NhaCuaHo } from '../services/nha-cua-ho-service';
import { useNhaDaiDoanKetCuaHo } from '../hooks/use-ho-ngheo';
import type { HoNgheo } from '../core/types';
import type { NhaDaiDoanKetFormInput } from '../../danh-sach/core/schema';

const NddkForm = lazy(() => import('../../danh-sach/components/nddk-form'));

const NDDK_LIST_PATH = '/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach';

interface Props {
  hoNgheo: HoNgheo;
}

/**
 * Nhà đại đoàn kết đã gắn cho hộ.
 *
 * Dữ liệu thuộc module Nhà đại đoàn kết: thêm mới tại chỗ dùng đúng form và
 * quyền của module đó (hộ đang xem được chọn sẵn); xem/sửa thì bấm sang module
 * gốc — hai màn cùng ghi một bảng mà quyền lệch nhau là mở cửa sau.
 */
const HoNgheoNhaSection: React.FC<Props> = ({ hoNgheo }) => {
  const navigate = useNavigate();
  const { canView: canViewNddk, canCreate } = useResourcePermissions('nhaDaiDoanKetList');
  const { data: rows = [], isLoading } = useNhaDaiDoanKetCuaHo(hoNgheo.id, { enabled: canViewNddk });
  const [showForm, setShowForm] = useState(false);

  const prefill = useMemo<Partial<NhaDaiDoanKetFormInput>>(
    () => ({
      ho_ngheo_id: hoNgheo.id,
      ho_ten_chu_ho: hoNgheo.ho_ten_dai_dien,
      xa_phuong_id: hoNgheo.xa_phuong_id ?? '',
      khoi_xom: hoNgheo.khoi_xom ?? '',
      doi_tuong: hoNgheo.doi_tuong ?? '',
    }),
    [hoNgheo.id, hoNgheo.ho_ten_dai_dien, hoNgheo.xa_phuong_id, hoNgheo.khoi_xom, hoNgheo.doi_tuong],
  );

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
          {canCreate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              onClick={() => setShowForm(true)}
            >
              <Plus size={14} />
              {txt('hoNgheo.detail.nhaAdd')}
            </Button>
          ) : null}
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

      {showForm ? (
        <Suspense fallback={null}>
          <NddkForm prefill={prefill} onClose={() => setShowForm(false)} />
        </Suspense>
      ) : null}
    </DetailSection>
  );
};

export default HoNgheoNhaSection;
