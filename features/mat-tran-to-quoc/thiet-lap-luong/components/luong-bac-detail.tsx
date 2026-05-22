import React, { useMemo } from 'react';
import { Banknote, Calendar, Edit, Gauge, Hash, Layers, ListOrdered, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Button from '@/components/ui/Button';
import GenericDrawer, { DRAWER_WIDTH_DETAIL } from '@/components/shared/GenericDrawer';
import DetailSection from '@/components/shared/DetailSection';
import DetailFieldGrid from '@/components/shared/DetailFieldGrid';
import DetailField from '@/components/shared/DetailField';
import { formatCurrency, formatDateTimeShort } from '@/lib/utils';
import { BTN_CLOSE, BTN_EDIT, BTN_DELETE } from '@/lib/button-labels';
import type { LuongThietLapBacRow } from '../core/types';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';

interface Props {
  data: LuongThietLapBacRow;
  ngachLabel?: string;
  /** MLCS đang dùng trên toolbar (draft) để hiển thị lương ước tính. */
  mucLuongCoSoPreview: number;
  onClose: () => void;
  onEdit: (row: LuongThietLapBacRow) => void;
  onDelete: (row: LuongThietLapBacRow) => void;
}

const LuongBacDetail: React.FC<Props> = ({ data, ngachLabel, mucLuongCoSoPreview, onClose, onEdit, onDelete }) => {
  const { canEdit, canDelete } = useResourcePermissions('matTranSalarySetup');

  const luongUocTinh = useMemo(() => {
    const base = Number.isFinite(mucLuongCoSoPreview) && mucLuongCoSoPreview > 0 ? mucLuongCoSoPreview : 0;
    const he = Number(data.he_so);
    if (base <= 0 || !Number.isFinite(he) || he <= 0) return 0;
    return Math.round(base * he);
  }, [data.he_so, mucLuongCoSoPreview]);

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
                onClose();
                onDelete(data);
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
      title={txt('matTranThietLapLuong.bac.detail.title')}
      maxWidthClass={DRAWER_WIDTH_DETAIL}
      icon={<Hash size={18} />}
      subtitle={data.ma_bac}
      footer={renderFooter}
      footerCompact
    >
      <div className="space-y-5">
        <DetailSection title={txt('matTranThietLapLuong.bac.form.sectionMain')} icon={<Hash size={14} />}>
          <DetailFieldGrid cols={2}>
            <DetailField label={txt('matTranThietLapLuong.bac.form.maBac')} value={data.ma_bac} icon={<Hash size={12} />} />
            <DetailField
              label={txt('matTranThietLapLuong.bac.detail.ngach')}
              value={ngachLabel ?? txt('common.emptyCell')}
              icon={<Layers size={12} />}
            />
            <DetailField
              label={txt('matTranThietLapLuong.store.thuTuCol')}
              value={String(data.thu_tu)}
              icon={<ListOrdered size={12} />}
            />
            <DetailField
              label={txt('matTranThietLapLuong.bac.colHeSo')}
              value={String(data.he_so)}
              icon={<Gauge size={12} />}
            />
            <DetailField
              label={txt('matTranThietLapLuong.bac.colLuong')}
              value={formatCurrency(luongUocTinh)}
              icon={<Banknote size={12} />}
            />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection title={txt('matTranThietLapLuong.bac.detail.systemInfo')} icon={<Calendar size={14} />}>
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

export default LuongBacDetail;
