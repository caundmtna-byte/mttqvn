import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BookOpen, ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import EnumBadge from '@/components/ui/EnumBadge';
import DetailSection from '@/components/shared/DetailSection';
import EmbeddedChildDataGrid from '@/components/shared/EmbeddedChildDataGrid';
import EmptyState from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/use-can';
import { isChucVuCapBacOne } from '@/lib/permissions';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { MttqTapHuanChiTietFlatRow } from '@/features/mat-tran-to-quoc/danh-sach-tap-huan/core/types';
import { useMttqTapHuanLinesForCanBo } from '@/features/mat-tran-to-quoc/danh-sach-tap-huan/hooks/use-mttq-tap-huan';
import {
  getTapHuanCapBadgeConfig,
  getTapHuanThuocDienBadgeConfig,
} from '@/features/mat-tran-to-quoc/danh-sach-tap-huan/utils/display-format';

const TAP_HUAN_LIST_PATH = '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan';

interface Props {
  canBoId: string;
}

const MttqCanBoTapHuanSection: React.FC<Props> = ({ canBoId }) => {
  const navigate = useNavigate();
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const capBac1Bypass = isChucVuCapBacOne(chucVuCapBac);
  /** Ma trận: `cap_bac=1` bypass toàn module (khớp `lib/permissions.ts`); thêm OR để UI cập nhật đồng bộ khi hydrate. */
  const canViewOfficer = useCan('view', 'matTranOfficerList');
  const showSection = canViewOfficer || capBac1Bypass;
  const canOpenTrainingModule = useCan('view', 'matTranTrainingList') || capBac1Bypass;
  const { data: rows = [], isLoading } = useMttqTapHuanLinesForCanBo(canBoId, { enabled: showSection });

  const capCfg = useMemo(() => getTapHuanCapBadgeConfig(), []);
  const thuocDienCfg = useMemo(() => getTapHuanThuocDienBadgeConfig(), []);

  const goTrainingList = useCallback(() => {
    if (!canOpenTrainingModule) {
      toast.error(txt('matTranTapHuan.noViewPermission'));
      return;
    }
    navigate(TAP_HUAN_LIST_PATH);
  }, [canOpenTrainingModule, navigate]);

  const openLop = useCallback(
    (idLop: string) => {
      if (!canOpenTrainingModule) {
        toast.error(txt('matTranTapHuan.noViewPermission'));
        return;
      }
      navigate(`${TAP_HUAN_LIST_PATH}?open=${encodeURIComponent(idLop)}`);
    },
    [canOpenTrainingModule, navigate],
  );

  if (!showSection) return null;

  const countLabel = isLoading ? '…' : String(rows.length);

  return (
    <DetailSection
      title={txt('matTranCanBo.detail.sectionTapHuan')}
      icon={<BookOpen size={14} aria-hidden />}
      variant="primary"
      headerRight={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium tabular-nums text-primary">
            {countLabel} {txt('matTranCanBo.detail.tapHuanChildRecordsSuffix')}
          </span>
          {canOpenTrainingModule ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 gap-1.5 text-xs"
              onClick={goTrainingList}
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {txt('matTranCanBo.detail.tapHuanOpenModule')}
            </Button>
          ) : null}
        </div>
      }
    >
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{txt('common.loadingData')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={txt('matTranCanBo.detail.tapHuanEmpty')}
          description={txt('matTranCanBo.detail.tapHuanHint')}
          icon={<BookOpen className="h-10 w-10 text-muted-foreground" aria-hidden />}
          action={
            canOpenTrainingModule ? (
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={goTrainingList}>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {txt('matTranCanBo.detail.tapHuanOpenModule')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <EmbeddedChildDataGrid<MttqTapHuanChiTietFlatRow>
          rows={rows}
          getRowKey={(r) => r.id}
          onRowClick={canOpenTrainingModule ? (r) => openLop(r.id_lop_tap_huan) : undefined}
          maxVisibleBodyRows={6}
          containerClassName="border-0 shadow-none"
          labelColumn={{
            header: txt('matTranTapHuan.store.tenLopCol'),
            minWidthClass: 'min-w-[140px]',
            renderCell: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground text-sm">{r.ten_lop_tap_huan}</p>
                <p className="truncate text-xs text-muted-foreground tabular-nums">{String(r.nam_tap_huan)}</p>
              </div>
            ),
          }}
          columns={[
            {
              id: 'cap',
              header: txt('matTranTapHuan.store.capCol'),
              renderCell: (r) => <EnumBadge value={r.cap_tap_huan} config={capCfg} truncate shape="pill" />,
            },
            {
              id: 'td',
              header: txt('matTranTapHuan.form.thuocDien'),
              renderCell: (r) => <EnumBadge value={r.thuoc_dien} config={thuocDienCfg} truncate shape="pill" />,
            },
            {
              id: 'dv',
              header: txt('matTranTapHuan.chiTietList.cols.donViLop'),
              renderCell: (r) => (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {r.ten_don_vi_lop?.trim() ? r.ten_don_vi_lop : '—'}
                </span>
              ),
            },
          ]}
          actionsColumn={{
            header: txt('matTranCanBo.detail.tapHuanActionsCol'),
            widthClass: canOpenTrainingModule ? 'w-[7.5rem] min-w-[7.5rem]' : 'w-10 min-w-[2.5rem]',
            renderCell: (r) =>
              canOpenTrainingModule ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLop(r.id_lop_tap_huan);
                  }}
                >
                  {txt('matTranCanBo.detail.tapHuanOpenRow')}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums" aria-hidden>
                  —
                </span>
              ),
          }}
        />
      )}
    </DetailSection>
  );
};

export default MttqCanBoTapHuanSection;
