import React, { useMemo, useState } from 'react';
import {
  Ban,
  Calendar,
  CalendarClock,
  CalendarRange,
  ClipboardList,
  Edit,
  ExternalLink,
  FileText,
  Link2,
  ListOrdered,
  ListTodo,
  Percent,
  Tag,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import type { CongViecDanhSachRow } from '../core/types';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSummaryCard, { DetailSummaryIconTile } from '@/components/shared/DetailSummaryCard';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailToolbar, { type DetailToolbarAction } from '@/components/shared/DetailToolbar';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE, CONFIRM_YES } from '@/lib/button-labels';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useEmployees } from '@/features/he-thong/nhan-vien/hooks/use-nhan-vien';
import { useConfirmStore } from '@/store/useConfirmStore';
import { congViecRowToFormValues } from '../core/schema';
import { useUpdateCongViecDanhSach } from '../hooks/use-cong-viec-danh-sach';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatCongViecTienDoTheoHan } from '../utils/deadline-progress';
import {
  CONG_VIEC_MUC_DO_BADGE_CONFIG,
  CONG_VIEC_TRANG_THAI_BADGE_CONFIG,
  congViecDeadlineChipClass,
  congViecThoiHanChipTone,
  congViecTienDoChipTone,
} from '../core/display-badges';
import CongViecBaoCaoDialog from './cong-viec-bao-cao-dialog';

interface Props {
  data: CongViecDanhSachRow;
  onClose: () => void;
  onEdit: (item: CongViecDanhSachRow) => void;
  onDelete: (id: string) => void;
  stackLevel?: number;
}

const CongViecDetail: React.FC<Props> = ({ data, onClose, onEdit, onDelete, stackLevel = 0 }) => {
  const { canEdit, canDelete } = useResourcePermissions('tasks');
  const confirm = useConfirmStore((s) => s.confirm);
  const { data: employees = [] } = useEmployees();
  const empMap = useMemo(() => new Map(employees.map((e) => [String(e.id), e])), [employees]);

  const [baoCaoOpen, setBaoCaoOpen] = useState(false);
  const cancelTaskMutation = useUpdateCongViecDanhSach();

  const tienDoLabel = formatCongViecTienDoTheoHan(data.thoi_han, data.trang_thai);
  const tienDoTone = congViecTienDoChipTone(data.thoi_han, data.trang_thai);

  const toolbarActions: DetailToolbarAction[] = [];
  if (canEdit) {
    toolbarActions.push({
      label: txt('taskList.detail.actionReport'),
      icon: <ClipboardList />,
      onClick: () => setBaoCaoOpen(true),
      variant: 'info',
      disabled: data.trang_thai === 'Hủy',
    });
    toolbarActions.push({
      label: txt('taskList.detail.actionCancelTask'),
      icon: <Ban />,
      onClick: () => {
        if (data.trang_thai === 'Hủy') return;
        confirm({
          title: txt('taskList.cancelTask.title'),
          message: txt('taskList.cancelTask.message'),
          variant: 'danger',
          confirmText: CONFIRM_YES(),
          onConfirm: async () => {
            const payload = congViecRowToFormValues({ ...data, trang_thai: 'Hủy' });
            await cancelTaskMutation.mutateAsync({ id: data.id, data: payload });
          },
        });
      },
      variant: 'danger',
      disabled: data.trang_thai === 'Hủy',
    });
  }

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
              onClick={() => {
                onDelete(data.id);
                onClose();
              }}
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

  const linkField = (href: string | null | undefined) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-primary hover:underline break-all"
      >
        <ExternalLink size={12} className="shrink-0" />
        {href}
      </a>
    ) : undefined;

  return (
    <>
      <GenericDrawer
        title={txt('taskList.detail.title')}
        subtitle={txt('taskList.detail.subtitle')}
        icon={<ListTodo size={18} />}
        onClose={onClose}
        footer={footer}
        maxWidthClass={DRAWER_WIDTH_DETAIL}
        stackLevel={stackLevel}
        footerCompact
      >
        <div className="space-y-5">
          <DetailSummaryCard
            leading={
              <DetailSummaryIconTile>
                <ListTodo size={26} className="text-white" aria-hidden />
              </DetailSummaryIconTile>
            }
            title={data.ten_cong_viec}
            badge={<EnumBadge value={data.trang_thai} config={CONG_VIEC_TRANG_THAI_BADGE_CONFIG} truncate />}
            subtitle={
              <p className="m-0 min-w-0 truncate">
                {data.ten_chuong_trinh?.trim() || txt('taskList.detail.chuongTrinhEmpty')}
              </p>
            }
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <EnumBadge value={data.muc_do} config={CONG_VIEC_MUC_DO_BADGE_CONFIG} shape="rounded" truncate />
              {data.thoi_han ? (
                <span className="tabular-nums text-foreground">{formatDateShort(data.thoi_han)}</span>
              ) : (
                <span>{txt('common.emptyCell')}</span>
              )}
            </div>
          </DetailSummaryCard>

          {toolbarActions.length > 0 ? (
            <DetailToolbar actions={toolbarActions} className="bg-card rounded-xl border border-border" />
          ) : null}

          <DetailSection title={txt('taskList.detail.sectionInfo')} icon={<ListTodo size={14} />} variant="primary">
            <DetailFieldGrid cols={2} className="gap-y-3 gap-x-4">
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('taskList.store.chuongTrinhCol')}
                icon={<CalendarRange size={12} />}
                value={data.ten_chuong_trinh?.trim() ? data.ten_chuong_trinh : undefined}
                emptyText={txt('taskList.detail.chuongTrinhEmpty')}
              />
              <DetailField
                label={txt('taskList.store.mucDoCol')}
                icon={<ListOrdered size={12} />}
                value={<EnumBadge value={data.muc_do} config={CONG_VIEC_MUC_DO_BADGE_CONFIG} shape="rounded" truncate />}
              />
              <DetailField
                label={txt('taskList.store.trangThaiCol')}
                icon={<Tag size={12} />}
                value={<EnumBadge value={data.trang_thai} config={CONG_VIEC_TRANG_THAI_BADGE_CONFIG} truncate />}
              />
              <DetailField
                label={txt('taskList.store.thoiHanCol')}
                icon={<Calendar size={12} />}
                value={
                  data.thoi_han ? (
                    <span className={congViecDeadlineChipClass(congViecThoiHanChipTone(data.thoi_han, data.trang_thai))}>
                      {formatDateShort(data.thoi_han)}
                    </span>
                  ) : undefined
                }
              />
              <DetailField
                label={txt('taskList.store.tienDoCol')}
                icon={<Percent size={12} />}
                value={
                  <span className={congViecDeadlineChipClass(tienDoTone)} title={tienDoLabel}>
                    {tienDoLabel}
                  </span>
                }
              />
              <DetailField
                label={txt('taskList.store.trachNhiemCol')}
                icon={<User size={12} />}
                value={data.ho_va_ten_trach_nhiem ?? data.ten_tai_khoan_trach_nhiem}
              />
              <DetailField
                label={txt('taskList.store.nguoiTaoCol')}
                icon={<User size={12} />}
                value={data.ho_va_ten_nguoi_tao ?? data.ten_tai_khoan_nguoi_tao}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('taskList.store.hoTroCol')}
                icon={<Users size={12} />}
                value={
                  data.ids_ho_tro.length === 0
                    ? undefined
                    : data.ids_ho_tro
                        .map((id) => empMap.get(String(id))?.ho_va_ten ?? id)
                        .join(', ')
                }
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('taskList.store.ghiChuCol')}
                icon={<FileText size={12} />}
                value={data.ghi_chu ?? undefined}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('taskList.form.linkTaiLieu')}
                icon={<Link2 size={12} />}
                value={linkField(data.link_tai_lieu)}
              />
            </DetailFieldGrid>
          </DetailSection>

          <DetailSection title={txt('taskList.detail.sectionResult')} icon={<ExternalLink size={14} />} variant="muted">
            <DetailFieldGrid cols={2} className="gap-y-3 gap-x-4">
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('taskList.form.ketQua')}
                icon={<FileText size={12} />}
                value={data.ket_qua ?? undefined}
              />
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('taskList.form.linkKq')}
                icon={<Link2 size={12} />}
                value={linkField(data.link_kq)}
              />
              <DetailField
                label={txt('taskList.form.ngayHoanThanh')}
                icon={<Calendar size={12} />}
                value={
                  data.ngay_hoan_thanh ? (
                    <span className={congViecDeadlineChipClass('emerald')}>{formatDateShort(data.ngay_hoan_thanh)}</span>
                  ) : undefined
                }
              />
              <DetailField
                label={txt('taskList.store.tgCapNhatCol')}
                icon={<CalendarClock size={12} />}
                value={formatDateTimeShort(data.tg_cap_nhat)}
              />
            </DetailFieldGrid>
          </DetailSection>
        </div>
      </GenericDrawer>

      {baoCaoOpen ? <CongViecBaoCaoDialog open={baoCaoOpen} row={data} onClose={() => setBaoCaoOpen(false)} /> : null}
    </>
  );
};

export default CongViecDetail;
