import React from 'react';
import { Calendar, Edit, FileText, Hash, Layers, ListOrdered, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import DetailField from '@/components/shared/DetailField';
import { formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import type { LuongThietLapBacRow, LuongThietLapNgachListRow } from '../core/types';
import type { LuongThietLapBacMaCode } from '../core/schema';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import LuongNgachBacSection from './luong-ngach-bac-section';

interface Props {
  data: LuongThietLapNgachListRow;
  bacRows: LuongThietLapBacRow[];
  bacLoading?: boolean;
  mucLuongCoSo: number;
  missingCodesForCreate: LuongThietLapBacMaCode[];
  onClose: () => void;
  onEdit: (row: LuongThietLapNgachListRow) => void;
  onDelete: (id: string) => void;
  onAddBac: (ngach: LuongThietLapNgachListRow) => void;
  onEditBac: (row: LuongThietLapBacRow) => void;
  onDeleteBac: (row: LuongThietLapBacRow) => void;
  onViewBac?: (row: LuongThietLapBacRow) => void;
}

const LuongNgachDetail: React.FC<Props> = ({
  data,
  bacRows,
  bacLoading = false,
  mucLuongCoSo,
  missingCodesForCreate,
  onClose,
  onEdit,
  onDelete,
  onAddBac,
  onEditBac,
  onDeleteBac,
  onViewBac,
}) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranSalarySetup');

  const renderFooter = (
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

  return (
    <GenericDrawer
      onClose={onClose}
      title={txt('matTranThietLapLuong.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<Layers size={18} />}
      subtitle={data.ten}
      footer={renderFooter}
      footerCompact
    >
      <div className="space-y-5">
        <DetailSection title={txt('matTranThietLapLuong.form.sectionMain')} icon={<Layers size={14} />}>
          <DetailFieldGrid cols={2}>
            <DetailField label={txt('matTranThietLapLuong.form.ma')} value={data.ma ?? txt('common.emptyCell')} icon={<Hash size={12} />} />
            <DetailField label={txt('matTranThietLapLuong.form.ten')} value={data.ten} icon={<Layers size={12} />} />
            <DetailField
              label={txt('matTranThietLapLuong.form.thuTu')}
              value={String(data.thu_tu)}
              icon={<ListOrdered size={12} />}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('matTranThietLapLuong.form.moTa')}
              value={data.mo_ta ?? txt('common.emptyCell')}
              icon={<FileText size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <LuongNgachBacSection
          ngach={data}
          bacRows={bacRows}
          bacLoading={bacLoading}
          mucLuongCoSo={mucLuongCoSo}
          missingCodesForCreate={missingCodesForCreate}
          onAddBac={onAddBac}
          onEditBac={onEditBac}
          onDeleteBac={onDeleteBac}
          onViewBac={onViewBac}
        />

        <DetailSection title={txt('matTranThietLapLuong.detail.systemInfo')} icon={<Calendar size={14} />} variant="muted">
          <DetailFieldGrid cols={2}>
            <DetailField
              label={txt('matTranThietLapLuong.store.tgTaoCol')}
              value={data.tg_tao ? formatDateTimeShort(data.tg_tao) : txt('common.emptyCell')}
              icon={<Calendar size={12} />}
            />
            <DetailField
              label={txt('matTranThietLapLuong.store.tgCapNhatCol')}
              value={data.tg_cap_nhat ? formatDateTimeShort(data.tg_cap_nhat) : txt('common.emptyCell')}
              icon={<Calendar size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>
      </div>
    </GenericDrawer>
  );
};

export default LuongNgachDetail;
