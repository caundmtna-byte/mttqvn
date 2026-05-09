import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDateShort } from '@/lib/utils';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/use-can';
import type { MttqKhenThuongLineForCanBo } from '@/features/mat-tran-to-quoc/danh-sach-khen-thuong/core/types';
import { useMttqKhenThuongLinesForCanBo } from '@/features/mat-tran-to-quoc/danh-sach-khen-thuong/hooks/use-mttq-khen-thuong';
import {
  getKhenThuongDanhHieuBadgeConfig,
  getKhenThuongHinhThucBadgeConfig,
  getKhenThuongTrangThaiBadgeConfig,
} from '@/features/mat-tran-to-quoc/danh-sach-khen-thuong/utils/display-format';

const KHEN_THUONG_LIST_PATH = '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong';

interface Props {
  canBoId: string;
}

const MttqCanBoKhenThuongSection: React.FC<Props> = ({ canBoId }) => {
  const navigate = useNavigate();
  const canViewRewards = useCan('view', 'matTranRewardList');
  const { data: rows = [], isLoading } = useMttqKhenThuongLinesForCanBo(canBoId, { enabled: canViewRewards });

  const trangThaiCfg = useMemo(() => getKhenThuongTrangThaiBadgeConfig(), []);
  const hinhThucCfg = useMemo(() => getKhenThuongHinhThucBadgeConfig(), []);
  const danhHieuCfg = useMemo(() => getKhenThuongDanhHieuBadgeConfig(), []);

  const openKhenThuong = useCallback(
    (idKhenThuong: string) => {
      navigate(`${KHEN_THUONG_LIST_PATH}?open=${encodeURIComponent(idKhenThuong)}`);
    },
    [navigate],
  );

  if (!canViewRewards) return null;

  const countLabel = isLoading ? '…' : String(rows.length);

  return (
    <DetailSection
      title={txt('matTranCanBo.detail.sectionKhenThuong')}
      icon={<Award size={14} aria-hidden />}
      variant="primary"
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {countLabel} {txt('matTranCanBo.detail.khenThuongChildRecordsSuffix')}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={() => navigate(KHEN_THUONG_LIST_PATH)}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {txt('matTranCanBo.detail.khenThuongOpenModule')}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={txt('matTranCanBo.detail.khenThuongEmpty')}
          description={txt('matTranCanBo.detail.khenThuongHint')}
          icon={<Award className="h-10 w-10 text-muted-foreground" aria-hidden />}
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(KHEN_THUONG_LIST_PATH)}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {txt('matTranCanBo.detail.khenThuongOpenModule')}
            </Button>
          }
        />
      ) : (
        <EmbeddedChildDataGrid<MttqKhenThuongLineForCanBo>
          rows={rows}
          getRowKey={(r) => r.id_ct}
          onRowClick={(r) => openKhenThuong(r.id_khen_thuong)}
          maxVisibleBodyRows={6}
          containerClassName="border-0 shadow-none"
          labelColumn={{
            header: txt('matTranKhenThuong.store.soQdCol'),
            minWidthClass: 'min-w-[140px]',
            renderCell: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground text-sm">{r.so_qd}</p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {formatDateShort(r.ngay_khen_thuong)}
                </p>
              </div>
            ),
          }}
          columns={[
            {
              id: 'tt',
              header: txt('matTranKhenThuong.store.trangThaiCol'),
              renderCell: (r) => <EnumBadge value={r.trang_thai} config={trangThaiCfg} truncate />,
            },
            {
              id: 'ht',
              header: txt('matTranKhenThuong.form.hinhThuc'),
              renderCell: (r) => <EnumBadge value={r.hinh_thuc_khen} config={hinhThucCfg} truncate />,
            },
            {
              id: 'dh',
              header: txt('matTranKhenThuong.form.danhHieu'),
              renderCell: (r) => <EnumBadge value={r.danh_hieu} config={danhHieuCfg} truncate />,
            },
            {
              id: 'nd',
              header: txt('matTranKhenThuong.form.noiDung'),
              renderCell: (r) => (
                <span className="line-clamp-2 text-xs text-muted-foreground">{r.noi_dung_khen ?? '—'}</span>
              ),
            },
          ]}
          actionsColumn={{
            header: txt('matTranCanBo.detail.khenThuongActionsCol'),
            widthClass: 'w-[7.5rem] min-w-[7.5rem]',
            renderCell: (r) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openKhenThuong(r.id_khen_thuong);
                }}
              >
                {txt('matTranCanBo.detail.khenThuongOpenRow')}
              </Button>
            ),
          }}
        />
      )}
    </DetailSection>
  );
};

export default MttqCanBoKhenThuongSection;
