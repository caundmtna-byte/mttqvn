import React from 'react';
import { get, useController, useFormState, type Control, type Path } from 'react-hook-form';
import { ClipboardList, Coins } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import DatePicker from '@/components/ui/DatePicker';
import CurrencyInput from '@/components/ui/CurrencyInput';
import CheckboxGroup from '@/components/ui/CheckboxGroup';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import type { ViNguoiNgheoFormInput, ViNguoiNgheoFormValues } from '../../core/schema';
import type { VnnLoaiPhieu } from '../../core/phieu-khao-sat';
import {
  PKS_CHUNG_CUOI,
  PKS_CHUNG_DAU,
  PKS_MUC_II,
  PKS_Y_KIEN,
  laOTick,
  pksFieldVisible,
  pksNhan,
  type PksField,
  type PksONhap,
  type PksOTick,
} from './pks-field-specs';

type Ctl = Control<ViNguoiNgheoFormInput, unknown, ViNguoiNgheoFormValues>;

function path(name: string): Path<ViNguoiNgheoFormInput> {
  return `phieu_khao_sat.${name}` as Path<ViNguoiNgheoFormInput>;
}

function useLoi(control: Ctl, name: string): string | undefined {
  const { errors } = useFormState({ control, name: path(name) });
  return (get(errors, path(name)) as { message?: string } | undefined)?.message;
}

const ONhap: React.FC<{ control: Ctl; field: PksONhap }> = ({
  control,
  field: spec,
}) => {
  const { field } = useController({ control, name: path(spec.name) });
  const error = useLoi(control, spec.name);
  const label = txt(pksNhan(spec.name));
  const value = typeof field.value === 'string' ? field.value : '';
  const placeholder = spec.placeholderKey ? txt(spec.placeholderKey) : undefined;

  switch (spec.kind) {
    case 'textarea':
      return (
        <Textarea
          label={label}
          value={value}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          rows={2}
          error={error}
        />
      );
    case 'date':
      return <DatePicker label={label} value={value} onChange={field.onChange} error={error} />;
    case 'tien':
      return (
        <CurrencyInput
          label={label}
          icon={Coins}
          suffix="đ"
          value={value === '' ? null : value}
          onChange={(n) => field.onChange(n == null ? '' : String(n))}
          onBlur={field.onBlur}
          min={0}
          error={error}
        />
      );
    case 'thapPhan':
      // Dấu phẩy là dấu thập phân; tối đa 2 chữ số lẻ để "1,125" không bị hiểu thành 1125.
      return (
        <CurrencyInput
          label={label}
          suffix=""
          decimalScale={2}
          value={value === '' ? null : value}
          onChange={(n) => field.onChange(n == null ? '' : String(n))}
          onBlur={field.onBlur}
          min={0}
          error={error}
        />
      );
    case 'so':
      return (
        <Input
          label={label}
          inputMode="numeric"
          value={value}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          error={error}
        />
      );
    default:
      return (
        <Input
          label={label}
          value={value}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          placeholder={placeholder}
          error={error}
        />
      );
  }
};

const OTick: React.FC<{ control: Ctl; field: PksOTick }> = ({
  control,
  field: spec,
}) => {
  const { field } = useController({ control, name: path(spec.name) });
  // Ô "Khác" là một trường riêng; không có thì vẫn gọi hook với chính trường chính cho đúng luật hook.
  const { field: khacField } = useController({ control, name: path(spec.khac ?? spec.name) });
  const error = useLoi(control, spec.name);

  const raw = field.value as unknown;
  const value =
    spec.kind === 'mot'
      ? typeof raw === 'string' && raw !== ''
        ? [raw]
        : []
      : Array.isArray(raw)
        ? (raw as string[])
        : [];

  return (
    <CheckboxGroup
      label={txt(pksNhan(spec.name))}
      options={spec.options.map((v) => ({ value: v, label: v }))}
      value={value}
      single={spec.kind === 'mot'}
      cols={spec.cols ?? 2}
      onChange={(next) => field.onChange(spec.kind === 'mot' ? (next[0] ?? '') : next)}
      khac={
        spec.khac
          ? {
              value: typeof khacField.value === 'string' ? khacField.value : '',
              onChange: khacField.onChange,
              label: txt('viNguoiNgheo.phieuKhaoSat.khac'),
              placeholder: txt('viNguoiNgheo.phieuKhaoSat.khacPlaceholder'),
            }
          : undefined
      }
      error={error}
    />
  );
};

function renderFields(control: Ctl, fields: PksField[], linhVuc: string) {
  return fields
    .filter((f) => pksFieldVisible(f, linhVuc))
    .map((f, i) => {
      if (f.kind === 'nhom') {
        return (
          <p
            key={`nhom-${i}`}
            className={`${FORM_GRID_SPAN_FULL} pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}
          >
            {txt(f.titleKey)}
          </p>
        );
      }
      if (laOTick(f)) {
        return (
          <div key={f.name} className={FORM_GRID_SPAN_FULL}>
            <OTick control={control} field={f} />
          </div>
        );
      }
      return (
        <div key={f.name} className={f.full ? FORM_GRID_SPAN_FULL : undefined}>
          <ONhap control={control} field={f} />
        </div>
      );
    });
}

interface Props {
  control: Ctl;
  loai: VnnLoaiPhieu;
  linhVuc: string;
  daGanHo: boolean;
  /** Form sửa đang chờ bản đầy đủ — chưa có dữ liệu phiếu để hiện. */
  dangTai: boolean;
}

/** Section "Phiếu khảo sát" của form khoản hỗ trợ — các ô theo đúng phiếu của lĩnh vực. */
const VnnPhieuKhaoSatSection: React.FC<Props> = ({ control, loai, linhVuc, daGanHo, dangTai }) => (
  <FormSection
    title={txt(`viNguoiNgheo.phieuKhaoSat.tenPhieu.${loai}`)}
    icon={<ClipboardList size={14} />}
  >
    <p className="mb-3 text-xs text-muted-foreground">
      {txt(daGanHo ? 'viNguoiNgheo.phieuKhaoSat.hint' : 'viNguoiNgheo.phieuKhaoSat.hintChuaGanHo')}
    </p>
    {dangTai ? (
      <p className="text-sm text-muted-foreground">{txt('viNguoiNgheo.phieuKhaoSat.dangTai')}</p>
    ) : (
      <FormGrid cols={2}>
        <p className={`${FORM_GRID_SPAN_FULL} text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
          {txt('viNguoiNgheo.phieuKhaoSat.nhomChung')}
        </p>
        {renderFields(control, PKS_CHUNG_DAU, linhVuc)}
        <p className={`${FORM_GRID_SPAN_FULL} pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
          {txt('viNguoiNgheo.phieuKhaoSat.nhomMucII')}
        </p>
        {renderFields(control, PKS_MUC_II[loai], linhVuc)}
        {renderFields(control, PKS_CHUNG_CUOI, linhVuc)}
        <p className={`${FORM_GRID_SPAN_FULL} pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
          {txt('viNguoiNgheo.phieuKhaoSat.nhomYKien')}
        </p>
        {renderFields(control, PKS_Y_KIEN, linhVuc)}
      </FormGrid>
    )}
  </FormSection>
);

export default VnnPhieuKhaoSatSection;
