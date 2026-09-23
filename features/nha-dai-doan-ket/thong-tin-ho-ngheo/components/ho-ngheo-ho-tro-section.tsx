import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { HandCoins, Plus, Edit, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import {
  vnnLinhVucBadge,
  vnnTrangThaiBadge,
} from '../../vi-nguoi-ngheo/core/display-badges';
import type { ViNguoiNgheo } from '../../vi-nguoi-ngheo/core/types';
import type { ViNguoiNgheoFormInput } from '../../vi-nguoi-ngheo/core/schema';
import {
  useDeleteViNguoiNgheoMany,
  useViNguoiNgheoByHoNgheo,
} from '../../vi-nguoi-ngheo/hooks/use-vi-nguoi-ngheo';
import { formatHnghSoTienDisplay, trimmedHnghDisplay } from '../utils/display-format';
import type { HoNgheo } from '../core/types';

const VnnForm = lazy(() => import('../../vi-nguoi-ngheo/components/vnn-form'));

interface Props {
  hoNgheo: HoNgheo;
}

/**
 * Các khoản hỗ trợ của hộ — dữ liệu của module **Chương trình vì người nghèo**
 * (`vnn_chuong_trinh.ho_ngheo_id`), không còn bảng con riêng ở đây.
 *
 * Thêm/sửa/xoá tại chỗ dùng đúng form và quyền của module đó: hai màn cùng ghi
 * vào một bảng, quyền lệch nhau là mở cửa sau.
 */
const HoNgheoHoTroSection: React.FC<Props> = ({ hoNgheo }) => {
  const { canView, canCreate, canEdit, canDelete } = useResourcePermissions('viNguoiNgheoList');
  const confirm = useConfirmStore((s) => s.confirm);
  const { data: rows = [], isLoading } = useViNguoiNgheoByHoNgheo(hoNgheo.id, { enabled: canView });
  const deleteMutation = useDeleteViNguoiNgheoMany();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ViNguoiNgheo | null>(null);

  /** Mở form tạo mới với hộ đang xem đã được chọn sẵn. */
  const prefill = useMemo<Partial<ViNguoiNgheoFormInput>>(
    () => ({
      ho_ngheo_id: hoNgheo.id,
      ho_ten_nguoi_nhan: hoNgheo.ho_ten_dai_dien,
      xa_phuong_id: hoNgheo.xa_phuong_id ?? '',
      khoi_xom: hoNgheo.khoi_xom ?? '',
      doi_tuong: hoNgheo.doi_tuong ?? '',
    }),
    [hoNgheo.id, hoNgheo.ho_ten_dai_dien, hoNgheo.xa_phuong_id, hoNgheo.khoi_xom, hoNgheo.doi_tuong],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    (row: ViNguoiNgheo) => {
      confirm({
        title: txt('viNguoiNgheo.deleteTitle'),
        message: txt('viNguoiNgheo.deleteMessage'),
        variant: 'danger',
        onConfirm: () => deleteMutation.mutate([row.id]),
      });
    },
    [confirm, deleteMutation],
  );

  const columns = useMemo(
    () => [
      {
        id: 'nam',
        header: txt('hoNgheo.hoTroStore.namCol'),
        renderCell: (row: ViNguoiNgheo) => (
          <span className="tabular-nums">{row.nam || txt('common.emptyCell')}</span>
        ),
      },
      {
        id: 'noi_dung',
        header: txt('hoNgheo.hoTroStore.noiDungCol'),
        renderCell: (row: ViNguoiNgheo) => (
          <span className="truncate" title={row.noi_dung_ho_tro}>
            {trimmedHnghDisplay(row.noi_dung_ho_tro) ?? txt('common.emptyCell')}
          </span>
        ),
      },
      {
        id: 'so_tien',
        header: txt('hoNgheo.hoTroStore.soTienCol'),
        renderCell: (row: ViNguoiNgheo) => (
          <span className="tabular-nums font-medium whitespace-nowrap">
            {formatHnghSoTienDisplay(row.so_tien) || row.hinh_thuc_ho_tro}
          </span>
        ),
      },
      {
        id: 'trang_thai',
        header: txt('hoNgheo.hoTroStore.trangThaiCol'),
        renderCell: (row: ViNguoiNgheo) => (
          <EnumBadge value={row.trang_thai} config={vnnTrangThaiBadge} shape="pill" truncate />
        ),
      },
    ],
    [],
  );

  if (!canView) return null;

  const countLabel = isLoading ? '…' : String(rows.length);

  return (
    <DetailSection
      title={txt('hoNgheo.detail.sectionHoTro')}
      icon={<HandCoins size={14} aria-hidden />}
      variant="primary"
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {countLabel} {txt('hoNgheo.detail.hoTroRecordsSuffix')}
          </span>
          {canCreate ? (
            <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 text-xs" onClick={openCreate}>
              <Plus size={14} />
              {txt('hoNgheo.detail.hoTroAdd')}
            </Button>
          ) : null}
        </div>
      }
    >
      {rows.length === 0 && !isLoading ? (
        <EmptyState title={txt('hoNgheo.detail.hoTroEmpty')} />
      ) : (
        <EmbeddedChildDataGrid<ViNguoiNgheo>
          rows={rows}
          getRowKey={(row) => row.id}
          labelColumn={{
            header: txt('hoNgheo.hoTroStore.linhVucCol'),
            renderCell: (row) => (
              <EnumBadge value={row.linh_vuc_ho_tro} config={vnnLinhVucBadge} shape="pill" truncate />
            ),
          }}
          columns={columns}
          actionsColumn={{
            header: txt('common.actions'),
            renderCell: (row) => (
              <div className="flex items-center justify-end gap-1">
                {canEdit ? (
                  <TableRowIconButton
                    icon={Edit}
                    label={txt('common.edit')}
                    size="compact"
                    variant="primary"
                    onClick={() => {
                      setEditing(row);
                      setShowForm(true);
                    }}
                  />
                ) : null}
                {canDelete ? (
                  <TableRowIconButton
                    icon={Trash2}
                    label={txt('common.delete')}
                    size="compact"
                    variant="danger"
                    onClick={() => handleDelete(row)}
                  />
                ) : null}
              </div>
            ),
          }}
        />
      )}

      {showForm ? (
        <Suspense fallback={null}>
          <VnnForm
            initialData={editing}
            prefill={editing ? undefined : prefill}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </Suspense>
      ) : null}
    </DetailSection>
  );
};

export default HoNgheoHoTroSection;
