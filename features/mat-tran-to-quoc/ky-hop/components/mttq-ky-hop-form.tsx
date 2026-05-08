import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarDays, FileText, Hash, MapPin, StickyNote, Type } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useMttqNhiemKyList } from '@/features/mat-tran-to-quoc/nhiem-ky/hooks/use-mttq-nhiem-ky';
import { useTinhThanhList } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  mttqKyHopSchema,
  mttqKyHopToFormInput,
  type MttqKyHopFormInput,
  type MttqKyHopFormValues,
} from '../core/schema';
import type { MttqKyHop } from '../core/types';
import { useCreateMttqKyHop, useUpdateMttqKyHop } from '../hooks/use-mttq-ky-hop';

const FORM_ID = 'mttq-ky-hop-form';

const TINH_CAP_VALUE = '__tinh_cap__';

interface Props {
  initialData?: MttqKyHop | null;
  onClose: () => void;
  /** Khi tạo mới — gán sẵn nhiệm kỳ (vd. từ drawer chi tiết nhiệm kỳ). */
  defaultNhiemKyId?: string;
}

const MttqKyHopForm: React.FC<Props> = ({ initialData, onClose, defaultNhiemKyId }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();
  const canViewNhiemKy = useCan('view', 'matTranTerm');
  const { data: nhiemKyList = [] } = useMttqNhiemKyList({ enabled: canViewNhiemKy });
  const { data: tinhList = [] } = useTinhThanhList();
  const { data: xaList = [] } = useXaPhuongForTab(true, '');

  const createMutation = useCreateMttqKyHop(onClose);
  const updateMutation = useUpdateMttqKyHop(onClose);

  const tinhMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tinhList) m.set(t.id, t.ten);
    return m;
  }, [tinhList]);

  const nhiemKyOptions = useMemo(
    () =>
      [...nhiemKyList]
        .sort((a, b) => a.ten_nhiem_ky.localeCompare(b.ten_nhiem_ky, 'vi'))
        .map((n) => ({ label: n.ten_nhiem_ky, value: String(n.id) })),
    [nhiemKyList],
  );

  const xaOptions = useMemo(() => {
    const tinhCap = { label: `${txt('matTranKyHop.tinhCap')} (${txt('matTranKyHop.form.donViPlaceholder')})`, value: TINH_CAP_VALUE };
    const rest = [...xaList]
      .sort((a, b) => {
        const ta = tinhMap.get(a.id_tinh_thanh) ?? '';
        const tb = tinhMap.get(b.id_tinh_thanh) ?? '';
        if (ta !== tb) return ta.localeCompare(tb, 'vi');
        return a.ten.localeCompare(b.ten, 'vi');
      })
      .map((x) => ({
        label: x.ten,
        value: String(x.id),
        subLabel: tinhMap.get(x.id_tinh_thanh),
      }));
    return [tinhCap, ...rest];
  }, [xaList, tinhMap]);

  const defaultValues = useMemo(() => {
    const base = mttqKyHopToFormInput(initialData ?? null);
    if (!initialData && defaultNhiemKyId?.trim()) {
      return { ...base, nhiem_ky_id: defaultNhiemKyId.trim() };
    }
    return base;
  }, [initialData, defaultNhiemKyId]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MttqKyHopFormInput, unknown, MttqKyHopFormValues>({
    defaultValues,
    resolver: zodResolver(mttqKyHopSchema) as Resolver<MttqKyHopFormInput, unknown, MttqKyHopFormValues>,
  });

  useEffect(() => {
    const base = mttqKyHopToFormInput(initialData ?? null);
    if (!initialData && defaultNhiemKyId?.trim()) {
      reset({ ...base, nhiem_ky_id: defaultNhiemKyId.trim() });
    } else {
      reset(base);
    }
  }, [initialData, defaultNhiemKyId, reset]);

  const onSubmit: SubmitHandler<MttqKyHopFormValues> = (data) => {
    if (!isEdit) {
      if (!idNguoiTao) {
        toast.error(txt('matTranKyHop.service.noEmployeeProfile'));
        return;
      }
      createMutation.mutate({ data, idNguoiTao });
      return;
    }
    if (!initialData) return;
    updateMutation.mutate({ id: initialData.id, data });
  };

  const pending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<CalendarDays size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranKyHop.form.editSubtitle')} · ${initialData.ky_thu}`
          : txt('matTranKyHop.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId={FORM_ID}
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<CalendarDays className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranKyHop.form.sectionMain')} icon={<Type size={14} />}>
          <FormGrid>
            <Controller
              name="nhiem_ky_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={nhiemKyOptions}
                  value={field.value === '' ? null : field.value}
                  onChange={(v) => field.onChange(v === '' || v == null ? '' : String(v))}
                  label={txt('matTranKyHop.form.nhiemKy')}
                  placeholder={txt('matTranKyHop.form.nhiemKy')}
                  error={errors.nhiem_ky_id?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                  disabled={!canViewNhiemKy || nhiemKyOptions.length === 0}
                />
              )}
            />
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  options={xaOptions}
                  value={
                    field.value === '' || field.value === undefined
                      ? TINH_CAP_VALUE
                      : field.value === TINH_CAP_VALUE
                        ? TINH_CAP_VALUE
                        : field.value
                  }
                  onChange={(v) => {
                    if (v === '' || v == null || v === TINH_CAP_VALUE) field.onChange('');
                    else field.onChange(String(v));
                  }}
                  label={txt('matTranKyHop.form.donVi')}
                  placeholder={txt('matTranKyHop.form.donViPlaceholder')}
                  error={errors.don_vi_id?.message as string | undefined}
                  icon={<MapPin size={14} />}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="ky_thu"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  required
                  label={txt('matTranKyHop.form.kyThu')}
                  error={errors.ky_thu?.message}
                  icon={<Hash size={14} />}
                />
              )}
            />
            <Controller
              name="ngay_hop"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  value={field.value ?? ''}
                  type="date"
                  label={txt('matTranKyHop.form.ngayHop')}
                  error={errors.ngay_hop?.message as string | undefined}
                  icon={<CalendarDays size={14} />}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="noi_dung_ky_hop"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    label={txt('matTranKyHop.form.noiDungKyHop')}
                    rows={3}
                    error={errors.noi_dung_ky_hop?.message}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="tai_lieu_hop"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    label={txt('matTranKyHop.form.taiLieuHop')}
                    error={errors.tai_lieu_hop?.message}
                    icon={<FileText size={14} />}
                    placeholder="https://..."
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ghi_chu"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    value={field.value ?? ''}
                    label={txt('matTranKyHop.form.ghiChu')}
                    rows={2}
                    icon={<StickyNote size={14} />}
                    error={errors.ghi_chu?.message}
                  />
                )}
              />
            </div>
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqKyHopForm;
