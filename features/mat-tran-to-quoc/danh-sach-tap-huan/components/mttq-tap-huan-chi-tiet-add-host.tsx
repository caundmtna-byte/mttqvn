import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { getLanguage } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer from '@/components/shared/GenericDrawer';
import { DRAWER_WIDTH_DETAIL_SMALL } from '@/lib/dialog-sizes';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import { BTN_CREATE } from '@/lib/button-labels';
import { useCan } from '@/hooks/use-can';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import {
  createMttqTapHuanSchema,
  type MttqTapHuanChiTietLineFormValues,
  type MttqTapHuanFormValues,
} from '../core/schema';
import type { MttqLopTapHuan } from '../core/types';
import { MTTQ_TAP_HUAN_THUOC_DIEN } from '../core/constants';
import { useMttqLopTapHuanDetail, useUpdateMttqLopTapHuan } from '../hooks/use-mttq-tap-huan';
import { useMttqLopTapHuanViewer } from '../hooks/use-mttq-tap-huan-viewer';
import { buildTapHuanCanBoOptions } from '../utils/can-bo-options-for-lop';
import { tapHuanCanBoThreeColFromCanBo } from '../utils/snapshot-from-can-bo';
import MttqTapHuanChiTietLineDrawer, {
  MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE,
} from './mttq-tap-huan-chi-tiet-line-drawer';

export interface MttqTapHuanLopPickOption {
  value: string;
  label: string;
}

interface Props {
  /** Bật luồng thêm (picker hoặc drawer dòng). */
  open: boolean;
  onClose: () => void;
  /** Danh sách lớp có thể chọn (thường toàn bộ lớp hoặc theo chip lọc). */
  lopOptions: MttqTapHuanLopPickOption[];
  /** Khi chip lọc chỉ còn một lớp — bỏ qua bước chọn lớp. */
  presetLopId?: string | null;
}

function toFormFk(v: string | null | undefined): string {
  return v != null && String(v).trim() !== '' ? String(v) : '';
}

function chiTietToLineForm(c: MttqLopTapHuan['chi_tiet'][number]): MttqTapHuanChiTietLineFormValues {
  return {
    id: c.id,
    can_bo_id: c.can_bo_id,
    thuoc_dien: c.thuoc_dien,
  };
}

function parentToFormValues(
  d: MttqLopTapHuan,
  chiLines: MttqTapHuanChiTietLineFormValues[],
): MttqTapHuanFormValues {
  return {
    ten_lop_tap_huan: d.ten_lop_tap_huan,
    nam_tap_huan: d.nam_tap_huan,
    cap_tap_huan: d.cap_tap_huan,
    don_vi_id: toFormFk(d.don_vi_id),
    to_chuc_id: toFormFk(d.to_chuc_id),
    ghi_chu: d.ghi_chu ?? undefined,
    chi_tiet: chiLines,
  };
}

const PICK_LOP_FORM_ID = 'mttq-tap-huan-chi-tiet-pick-lop-form';

const MttqTapHuanChiTietAddHost: React.FC<Props> = ({
  open,
  onClose,
  lopOptions,
  presetLopId,
}) => {
  const [pickedLopId, setPickedLopId] = useState('');
  const [pickerLopId, setPickerLopId] = useState('');
  const updateMutation = useUpdateMttqLopTapHuan();
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });
  const viewer = useMttqLopTapHuanViewer();

  const activeLopId = (presetLopId?.trim() || pickedLopId.trim() || '') || null;
  const showPicker = open && !activeLopId;

  const { data: lopData, isLoading: isLoadingLop } = useMttqLopTapHuanDetail(activeLopId);

  useEffect(() => {
    if (!open) {
      setPickedLopId('');
      setPickerLopId('');
      return;
    }
    if (presetLopId?.trim()) {
      setPickedLopId(presetLopId.trim());
    }
  }, [open, presetLopId]);

  const sortedLopOptions = useMemo(
    () =>
      [...lopOptions].sort((a, b) => a.label.localeCompare(b.label, getLanguage())),
    [lopOptions],
  );

  const lineFormRows = useMemo(
    () => (lopData ? lopData.chi_tiet.map(chiTietToLineForm) : []),
    [lopData],
  );

  const canBoOptions = useMemo(() => {
    if (!lopData) return [];
    return buildTapHuanCanBoOptions({
      cap: lopData.cap_tap_huan,
      donViIdLop: toFormFk(lopData.don_vi_id),
      canBoList,
      viewer,
    });
  }, [lopData, canBoList, viewer]);

  const canBoMap = useMemo(() => {
    const m = new Map<string, (typeof canBoList)[number]>();
    for (const c of canBoList) m.set(String(c.id), c);
    return m;
  }, [canBoList]);

  const thuocDienOpts = useMemo(
    () => MTTQ_TAP_HUAN_THUOC_DIEN.map((v) => ({ label: v, value: v })),
    [],
  );

  const resolveFromCanBo = useCallback(
    (canBoId: string) => tapHuanCanBoThreeColFromCanBo(canBoMap.get(canBoId.trim())),
    [canBoMap],
  );

  const handleLineSave = useCallback(
    async (values: MttqTapHuanChiTietLineFormValues) => {
      if (!lopData) return;
      const dup = lineFormRows.some((r) => r.can_bo_id === values.can_bo_id);
      if (dup) {
        toast.warning(txt('matTranTapHuan.validation.canBoRequired'));
        throw new Error('duplicate_can_bo');
      }
      const nextLines = [...lineFormRows, values];
      const payload = parentToFormValues(lopData, nextLines);
      const parsed = createMttqTapHuanSchema(canBoList).safeParse(payload);
      if (!parsed.success) {
        const msg =
          parsed.error.issues.map((i) => i.message).filter(Boolean).join(' ') ||
          txt('matTranTapHuan.validation.canBoDonViMismatch');
        toast.error(msg);
        throw new Error('validation');
      }
      await updateMutation.mutateAsync({
        id: lopData.id,
        data: parsed.data,
      });
      onClose();
    },
    [lopData, lineFormRows, canBoList, updateMutation, onClose],
  );

  const handlePickLopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = pickerLopId.trim();
    if (!id) {
      toast.warning(txt('matTranTapHuan.chiTietList.pickLopRequired'));
      return;
    }
    setPickedLopId(id);
  };

  if (!open) return null;

  if (showPicker) {
    if (sortedLopOptions.length === 0) {
      return (
        <GenericDrawer
          maxWidthClass={DRAWER_WIDTH_DETAIL_SMALL}
          onClose={onClose}
          title={txt('matTranTapHuan.chiTietList.pickLopTitle')}
          icon={<GraduationCap size={18} />}
          subtitle={txt('matTranTapHuan.chiTietList.pickLopSubtitle')}
          footer={
            <div className="flex justify-end w-full">
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 px-3 text-xs">
                {txt('common.close')}
              </Button>
            </div>
          }
          footerCompact
        >
          <p className="text-sm text-muted-foreground m-0">{txt('matTranTapHuan.chiTietList.noLopToAdd')}</p>
        </GenericDrawer>
      );
    }

    return (
      <GenericDrawer
        maxWidthClass={DRAWER_WIDTH_DETAIL_SMALL}
        onClose={onClose}
        title={txt('matTranTapHuan.chiTietList.pickLopTitle')}
        icon={<GraduationCap size={18} />}
        subtitle={txt('matTranTapHuan.chiTietList.pickLopSubtitle')}
        footer={
          <FormDrawerFooter
            formId={PICK_LOP_FORM_ID}
            onCancel={onClose}
            isLoading={false}
            isEdit={false}
            compact
            createLabel={BTN_CREATE()}
          />
        }
        footerCompact
      >
        <form id={PICK_LOP_FORM_ID} onSubmit={handlePickLopSubmit} className="space-y-4">
          <Combobox
            label={txt('matTranTapHuan.store.tenLopCol')}
            options={sortedLopOptions}
            value={pickerLopId}
            onChange={(v) => setPickerLopId(String(v))}
            placeholder={txt('common.select')}
            icon={<GraduationCap size={12} />}
            required
            dropdownInPortal
          />
        </form>
      </GenericDrawer>
    );
  }

  if (isLoadingLop || !lopData) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-[60]"
        aria-busy="true"
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <MttqTapHuanChiTietLineDrawer
      open
      onClose={onClose}
      mode="add"
      initialLine={MTTQ_TAP_HUAN_CHI_TIET_EMPTY_LINE}
      canBoOptions={canBoOptions}
      thuocDienOpts={thuocDienOpts}
      resolveFromCanBo={resolveFromCanBo}
      onSave={handleLineSave}
      isSubmitting={updateMutation.isPending}
      stackLevel={0}
    />
  );
};

export default MttqTapHuanChiTietAddHost;
