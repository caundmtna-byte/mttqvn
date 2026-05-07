import React, { useState, useEffect, useMemo } from 'react';
import { CalendarClock, CalendarDays, Edit, Hash, Info, StickyNote, Trash2, Type, User, Users } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import { formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_DELETE } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useConfirmStore } from '@/store/useConfirmStore';
import TabGroup, { type Tab } from '@/components/ui/TabGroup';
import type { MttqNhiemKy } from '../core/types';
import MttqNhiemKyDetailKyHopTab from './mttq-nhiem-ky-detail-ky-hop-tab';
import MttqNhiemKyDetailUyVienTab from './mttq-nhiem-ky-detail-uy-vien-tab';

const TAB_INFO = 'info';
const TAB_KY_HOP = 'kyHop';
const TAB_UY_VIEN = 'uyVien';

interface Props {
  data: MttqNhiemKy;
  onClose: () => void;
  onEdit: (item: MttqNhiemKy) => void;
  onDelete: (id: string) => void;
}

const MttqNhiemKyDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranTerm');
  const confirm = useConfirmStore((s) => s.confirm);
  const [detailTab, setDetailTab] = useState<string>(TAB_INFO);

  useEffect(() => {
    setDetailTab(TAB_INFO);
  }, [data.id]);

  const tabs = useMemo<Tab[]>(
    () => [
      { id: TAB_INFO, label: txt('matTranNhiemKy.detail.tabInfo'), icon: Info },
      { id: TAB_KY_HOP, label: txt('matTranNhiemKy.detail.tabKyHop'), icon: CalendarDays },
      { id: TAB_UY_VIEN, label: txt('matTranNhiemKy.detail.tabUyVien'), icon: Users },
    ],
    [],
  );

  const handleDelete = () => {
    confirm({
      title: txt('matTranNhiemKy.deleteTitle'),
      message: txt('matTranNhiemKy.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: () => onDelete(data.id),
    });
  };

  const footer = (
    <div className="flex items-center justify-between w-full gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground border border-border"
      >
        {BTN_CLOSE()}
      </Button>
      {canEdit || canDelete ? (
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              size="sm"
              onClick={() => {
                onEdit(data);
                onClose();
              }}
              className="h-8 px-3 text-xs bg-primary text-white shadow-sm hover:bg-primary/90"
            >
              <Edit className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_EDIT()}
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="h-8 px-3 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50 dark:text-rose-400 border border-rose-200 hover:border-rose-300 dark:border-rose-800 dark:hover:border-rose-700"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              {BTN_DELETE()}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <GenericDrawer
      onClose={onClose}
      title={txt('matTranNhiemKy.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<CalendarClock size={18} />}
      subtitle={data.ten_nhiem_ky}
      footer={footer}
      footerCompact
    >
      <div className="space-y-5">
        <div className="bg-card p-4 rounded-xl border border-border/50 shadow-sm flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-primary/20 shadow-lg shrink-0">
            <CalendarClock size={24} className="text-white" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <h2 className="text-base font-bold text-foreground leading-tight truncate tracking-tight">{data.ten_nhiem_ky}</h2>
            <p className="text-body-sm text-muted-foreground tabular-nums">
              {data.tu_nam != null || data.den_nam != null
                ? `${data.tu_nam ?? '—'} → ${data.den_nam ?? '—'}`
                : txt('common.emptyCell')}
            </p>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          <TabGroup tabs={tabs} activeTab={detailTab} onChange={setDetailTab} />
        </div>

        {detailTab === TAB_INFO ? (
          <>
            <DetailSection title={txt('matTranNhiemKy.detail.sectionMain')} icon={<Type size={14} />} variant="primary">
              <DetailFieldGrid>
                <DetailField
                  label={txt('matTranNhiemKy.form.tenNhiemKy')}
                  value={<span className="font-semibold tracking-tight">{data.ten_nhiem_ky}</span>}
                  icon={<Type size={12} />}
                />
                <DetailField
                  label={txt('matTranNhiemKy.form.tuNam')}
                  value={data.tu_nam != null ? String(data.tu_nam) : undefined}
                  icon={<Hash size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  label={txt('matTranNhiemKy.form.denNam')}
                  value={data.den_nam != null ? String(data.den_nam) : undefined}
                  icon={<Hash size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  className={DETAIL_FIELD_SPAN_FULL}
                  label={txt('matTranNhiemKy.form.thongTin')}
                  value={
                    data.thong_tin?.trim() ? (
                      <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.thong_tin}</p>
                    ) : undefined
                  }
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  className={DETAIL_FIELD_SPAN_FULL}
                  label={txt('matTranNhiemKy.form.ghiChu')}
                  value={
                    data.ghi_chu?.trim() ? (
                      <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{data.ghi_chu}</p>
                    ) : undefined
                  }
                  icon={<StickyNote size={12} />}
                  emptyText={txt('common.emptyCell')}
                />
              </DetailFieldGrid>
            </DetailSection>

            <DetailSection title={txt('matTranNhiemKy.detail.sectionCounts')} icon={<Hash size={14} />}>
              <DetailFieldGrid>
                <DetailField label={txt('matTranNhiemKy.form.slDauNhiemKy')} value={String(data.sl_dau_nhiem_ky)} />
                <DetailField label={txt('matTranNhiemKy.form.slDangThamGia')} value={String(data.sl_dang_tham_gia)} />
                <DetailField label={txt('matTranNhiemKy.form.slThoiThamGia')} value={String(data.sl_thoi_tham_gia)} />
                <DetailField label={txt('matTranNhiemKy.form.slCanBoSung')} value={String(data.sl_can_bo_sung)} />
                <DetailField label={txt('matTranNhiemKy.form.slThieu')} value={String(data.sl_thieu)} />
              </DetailFieldGrid>
            </DetailSection>

            <DetailSection title={txt('matTranNhiemKy.detail.systemInfo')} icon={<User size={14} />}>
              <DetailFieldGrid>
                <DetailField
                  label={txt('matTranNhiemKy.store.nguoiTaoCol')}
                  value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao ?? undefined}
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  label={txt('matTranNhiemKy.detail.tgTao')}
                  value={data.tg_tao ? formatDateTimeShort(data.tg_tao) : undefined}
                  emptyText={txt('common.emptyCell')}
                />
                <DetailField
                  label={txt('matTranNhiemKy.detail.tgCapNhat')}
                  value={data.tg_cap_nhat ? formatDateTimeShort(data.tg_cap_nhat) : undefined}
                  emptyText={txt('common.emptyCell')}
                />
              </DetailFieldGrid>
            </DetailSection>
          </>
        ) : null}

        {detailTab === TAB_KY_HOP ? <MttqNhiemKyDetailKyHopTab nhiemKyId={data.id} /> : null}
        {detailTab === TAB_UY_VIEN ? <MttqNhiemKyDetailUyVienTab nhiemKyId={data.id} /> : null}
      </div>
    </GenericDrawer>
  );
};

export default MttqNhiemKyDetail;
