import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
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
import type { MttqThietLapLoai } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/core/types';
import { useMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/hooks/use-mttq-thiet-lap';
import { mttqCanBoSchema, type MttqCanBoFormValues } from '../core/schema';
import { MTTQ_CAN_BO_GIOI_TINH } from '../core/constants';
import type { MttqCanBo } from '../core/types';
import { useCreateMttqCanBo, useUpdateMttqCanBo } from '../hooks/use-mttq-can-bo';

const DEFAULT_VALUES: MttqCanBoFormValues = {
  cap_quan_ly_id: undefined,
  to_chuc_id: undefined,
  ho_ten: '',
  ngay_sinh: undefined,
  gioi_tinh: 'Nam',
  dan_toc_id: undefined,
  ton_giao: undefined,
  dia_chi: undefined,
  dang_vien: false,
  trinh_do_id: undefined,
  ly_luan_chinh_tri_id: undefined,
  dien_thoai: undefined,
  chuc_vu_id: undefined,
  ngay_tham_gia_to_chuc: undefined,
  trang_thai_id: undefined,
  ngay_nhap_trang_thai: undefined,
};

function optionsByLoai(
  all: { id: string; loai: MttqThietLapLoai; ten: string }[],
  loai: MttqThietLapLoai,
): { label: string; value: string }[] {
  return all
    .filter((x) => x.loai === loai)
    .map((x) => ({ label: x.ten, value: String(x.id) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

interface Props {
  initialData?: MttqCanBo | null;
  onClose: () => void;
}

const MttqCanBoForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateMttqCanBo(onClose);
  const updateMutation = useUpdateMttqCanBo(onClose);

  const { data: thietLapAll = [] } = useMttqThietLapAll();

  const optCap = useMemo(() => optionsByLoai(thietLapAll, 'cap_quan_ly'), [thietLapAll]);
  const optToChuc = useMemo(() => optionsByLoai(thietLapAll, 'to_chuc'), [thietLapAll]);
  const optDanToc = useMemo(() => optionsByLoai(thietLapAll, 'dan_toc'), [thietLapAll]);
  const optTrinhDo = useMemo(() => optionsByLoai(thietLapAll, 'trinh_do'), [thietLapAll]);
  const optLyLuan = useMemo(() => optionsByLoai(thietLapAll, 'ly_luan_chinh_tri'), [thietLapAll]);
  const optChucVu = useMemo(() => optionsByLoai(thietLapAll, 'chuc_vu'), [thietLapAll]);
  const optTrangThai = useMemo(() => optionsByLoai(thietLapAll, 'trang_thai'), [thietLapAll]);

  const gioiTinhOptions = useMemo(
    () => MTTQ_CAN_BO_GIOI_TINH.map((g) => ({ label: g, value: g })),
    [],
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<MttqCanBoFormValues>({
    resolver: zodResolver(mttqCanBoSchema) as Resolver<MttqCanBoFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (initialData) {
      reset({
        cap_quan_ly_id: initialData.cap_quan_ly_id ?? undefined,
        to_chuc_id: initialData.to_chuc_id ?? undefined,
        ho_ten: initialData.ho_ten,
        ngay_sinh: initialData.ngay_sinh ?? undefined,
        gioi_tinh: initialData.gioi_tinh as MttqCanBoFormValues['gioi_tinh'],
        dan_toc_id: initialData.dan_toc_id ?? undefined,
        ton_giao: initialData.ton_giao ?? undefined,
        dia_chi: initialData.dia_chi ?? undefined,
        dang_vien: initialData.dang_vien,
        trinh_do_id: initialData.trinh_do_id ?? undefined,
        ly_luan_chinh_tri_id: initialData.ly_luan_chinh_tri_id ?? undefined,
        dien_thoai: initialData.dien_thoai ?? undefined,
        chuc_vu_id: initialData.chuc_vu_id ?? undefined,
        ngay_tham_gia_to_chuc: initialData.ngay_tham_gia_to_chuc ?? undefined,
        trang_thai_id: initialData.trang_thai_id ?? undefined,
        ngay_nhap_trang_thai: initialData.ngay_nhap_trang_thai ?? undefined,
      });
    } else {
      reset({ ...DEFAULT_VALUES });
    }
  }, [initialData, reset]);

  const onSubmit: SubmitHandler<MttqCanBoFormValues> = (data) => {
    if (!isEdit && !idNguoiTao) {
      toast.error(txt('matTranCanBo.service.noEmployeeProfile'));
      return;
    }
    if (isEdit && initialData) {
      updateMutation.mutate({ id: initialData.id, data });
    } else {
      createMutation.mutate({ data, idNguoiTao });
    }
  };

  const pending = createMutation.isPending || updateMutation.isPending;

  return (
    <GenericDrawer
      onClose={onClose}
      title={isEdit ? txt('common.edit') : txt('common.create')}
      maxWidthClass={DRAWER_WIDTH_FORM}
      icon={<Users size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('matTranCanBo.form.editSubtitle')} · ${initialData.ho_ten}`
          : txt('matTranCanBo.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId="mttq-can-bo-form"
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
        />
      }
    >
      <form id="mttq-can-bo-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <FormSection title={txt('matTranCanBo.form.sectionNhanThan')}>
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('matTranCanBo.form.hoTen')}
                {...register('ho_ten')}
                error={errors.ho_ten?.message}
                required
              />
            </div>
            <Input label={txt('matTranCanBo.form.ngaySinh')} type="date" {...register('ngay_sinh')} error={errors.ngay_sinh?.message} />
            <Controller
              name="gioi_tinh"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.gioiTinh')}
                  options={gioiTinhOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(String(v))}
                  error={errors.gioi_tinh?.message}
                  required
                  clearable={false}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="dan_toc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.danToc')}
                  options={optDanToc}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
            <Input label={txt('matTranCanBo.form.tonGiao')} {...register('ton_giao')} />
            <div className="flex items-center gap-2 pt-6">
              <Controller
                name="dang_vien"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border text-primary accent-primary"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                    />
                    {txt('matTranCanBo.form.dangVien')}
                  </label>
                )}
              />
            </div>
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionToChuc')}>
          <FormGrid>
            <Controller
              name="cap_quan_ly_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.capQuanLy')}
                  options={optCap}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="to_chuc_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.toChuc')}
                  options={optToChuc}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="chuc_vu_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.chucVu')}
                  options={optChucVu}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('matTranCanBo.form.ngayThamGiaToChuc')}
              type="date"
              {...register('ngay_tham_gia_to_chuc')}
              error={errors.ngay_tham_gia_to_chuc?.message}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionHocVan')}>
          <FormGrid>
            <Controller
              name="trinh_do_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.trinhDo')}
                  options={optTrinhDo}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
            <Controller
              name="ly_luan_chinh_tri_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.lyLuanChinhTri')}
                  options={optLyLuan}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionLienHe')}>
          <FormGrid>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea label={txt('matTranCanBo.form.diaChi')} {...register('dia_chi')} rows={2} />
            </div>
            <Input label={txt('matTranCanBo.form.dienThoai')} {...register('dien_thoai')} error={errors.dien_thoai?.message} />
          </FormGrid>
        </FormSection>

        <FormSection title={txt('matTranCanBo.form.sectionTrangThai')}>
          <FormGrid>
            <Controller
              name="trang_thai_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.trangThai')}
                  options={optTrangThai}
                  value={field.value ?? ''}
                  onChange={(v) => field.onChange(v === '' ? undefined : String(v))}
                  placeholder={txt('common.select')}
                  dropdownInPortal
                />
              )}
            />
            <Input
              label={txt('matTranCanBo.form.ngayNhapTrangThai')}
              type="date"
              {...register('ngay_nhap_trang_thai')}
              error={errors.ngay_nhap_trang_thai?.message}
            />
          </FormGrid>
        </FormSection>
      </form>
    </GenericDrawer>
  );
};

export default MttqCanBoForm;
