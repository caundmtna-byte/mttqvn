import React, { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/use-can';
import type { MttqTangLuongListRow } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/core/types';
import { useMttqTangLuongByCanBo } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/hooks/use-mttq-tang-luong';
import {
  formatNgachBacLabel,
  getTangLuongLoaiKyBadgeConfig,
} from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/utils/display-format';
import { getLatestRecordForCanBo } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/utils/tang-luong-cycle';

const TANG_LUONG_LIST_PATH = '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong';
const PREVIEW_LIMIT = 5;

interface Props {
  canBoId: string;
}

const MttqCanBoTangLuongSection: React.FC<Props> = ({ canBoId }) => {
  const navigate = useNavigate();
  const canViewSalary = useCan('view', 'matTranSalaryIncreaseList');
  const { data: rows = [], isLoading } = useMttqTangLuongByCanBo(canBoId, {
    enabled: canViewSalary,
    limit: PREVIEW_LIMIT,
  });

  const loaiKyCfg = useMemo(() => getTangLuongLoaiKyBadgeConfig(), []);
  const latest = useMemo(() => getLatestRecordForCanBo(rows, canBoId), [canBoId, rows]);

  const openModule = useCallback(() => {
    navigate(`${TANG_LUONG_LIST_PATH}?tab=lich_su&canBoId=${encodeURIComponent(canBoId)}`);
  }, [canBoId, navigate]);

  const openRow = useCallback(
    (id: string) => {
      navigate(`${TANG_LUONG_LIST_PATH}?tab=lich_su&open=${encodeURIComponent(id)}`);
    },
    [navigate],
  );

  if (!canViewSalary) return null;

  const countLabel = isLoading ? '…' : String(rows.length);

  return (
    <DetailSection
      title={txt('matTranCanBo.detail.sectionTangLuong')}
      icon={<TrendingUp size={14} aria-hidden />}
      variant="primary"
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {countLabel} {txt('matTranCanBo.detail.tangLuongChildRecordsSuffix')}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 text-xs"
            onClick={openModule}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {txt('matTranCanBo.detail.tangLuongOpenModule')}
          </Button>
        </div>
      }
    >
      {latest ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {txt('matTranCanBo.detail.tangLuongCurrentGrade')}:{' '}
          <span className="font-medium text-foreground">
            {formatNgachBacLabel(latest.ten_ngach_moi, latest.ma_bac_moi)}
          </span>
        </p>
      ) : null}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={txt('matTranCanBo.detail.tangLuongEmpty')}
          description={txt('matTranCanBo.detail.tangLuongHint')}
          icon={<TrendingUp className="h-10 w-10 text-muted-foreground" aria-hidden />}
          action={
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={openModule}>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {txt('matTranCanBo.detail.tangLuongOpenModule')}
            </Button>
          }
        />
      ) : (
        <EmbeddedChildDataGrid<MttqTangLuongListRow>
          rows={rows}
          getRowKey={(r) => r.id}
          onRowClick={(r) => openRow(r.id)}
          maxVisibleBodyRows={PREVIEW_LIMIT}
          containerClassName="border-0 shadow-none"
          labelColumn={{
            header: txt('matTranTangLuong.form.ngayNang'),
            minWidthClass: 'min-w-[120px]',
            renderCell: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground text-sm tabular-nums">
                  {formatDateShort(r.ngay_nang_luong)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatNgachBacLabel(r.ten_ngach_moi, r.ma_bac_moi)}
                </p>
              </div>
            ),
          }}
          columns={[
            {
              id: 'loai_ky',
              header: txt('matTranTangLuong.form.loaiKy'),
              renderCell: (r) => <EnumBadge value={r.loai_ky} config={loaiKyCfg} truncate />,
            },
            {
              id: 'luong',
              header: txt('matTranTangLuong.store.luongCol'),
              renderCell: (r) => (
                <span className="text-xs tabular-nums text-foreground whitespace-nowrap">
                  {r.luong > 0 ? formatCurrency(r.luong) : '—'}
                </span>
              ),
            },
            {
              id: 'ngach_cu',
              header: txt('matTranTangLuong.form.ngachCu'),
              renderCell: (r) => (
                <span className="text-xs text-muted-foreground truncate block">
                  {formatNgachBacLabel(r.ten_ngach_cu, r.ma_bac_cu)}
                </span>
              ),
            },
            {
              id: 'ghi_chu',
              header: txt('matTranTangLuong.form.ghiChu'),
              renderCell: (r) => (
                <span className="line-clamp-2 text-xs text-muted-foreground">{r.ghi_chu?.trim() || '—'}</span>
              ),
            },
          ]}
          actionsColumn={{
            header: txt('matTranCanBo.detail.tangLuongActionsCol'),
            widthClass: 'w-[7.5rem] min-w-[7.5rem]',
            renderCell: (r) => (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openRow(r.id);
                }}
              >
                {txt('matTranCanBo.detail.tangLuongOpenRow')}
              </Button>
            ),
          }}
        />
      )}
    </DetailSection>
  );
};

export default MttqCanBoTangLuongSection;
