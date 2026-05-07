import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ListTodo, Calendar, Link2 } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import MultiSelect from '@/components/ui/MultiSelect';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '@/components/shared/GenericDrawer';
import FormDrawerFooter from '@/components/shared/FormDrawerFooter';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useAuthStore } from '@/store/useStore';
import { useEmployees } from '@/features/he-thong/nhan-vien/hooks/use-nhan-vien';
import { CONG_VIEC_MUC_DO, CONG_VIEC_TRANG_THAI } from '../core/constants';
import { congViecDanhSachSchema, type CongViecDanhSachFormValues } from '../core/schema';
import type { CongViecDanhSach } from '../core/types';
import { useCreateCongViecDanhSach, useUpdateCongViecDanhSach } from '../hooks/use-cong-viec-danh-sach';

const DEFAULT_VALUES: CongViecDanhSachFormValues = {
  muc_do: CONG_VIEC_MUC_DO[0],
  ten_cong_viec: '',
  ghi_chu: undefined,
  link_tai_lieu: undefined,
  thoi_han: undefined,
  tien_do: 0,
  id_trach_nhiem: '',
  ids_ho_tro: [],
  trang_thai: CONG_VIEC_TRANG_THAI[0],
  ket_qua: undefined,
  link_kq: undefined,
  ngay_hoan_thanh: undefined,
};

interface Props {
  initialData?: CongViecDanhSach | null;
  onClose: () => void;
}

const CongViecForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = Boolean(initialData);
  const user = useAuthStore((s) => s.user);
  const idNguoiTao = String(user?.nhan_vien_id ?? '').trim();

  const createMutation = useCreateCongViecDanhSach(onClose);
  const updateMutation = useUpdateCongViecDanhSach(onClose);

  const { data: employees = [] } = useEmployees();
  const employeeOptions = useMemo(
    () =>
      employees
        .filter((e) => e.trang_thai === 'Hoạt động')
        .map((e) => ({ label: `${e.ho_va_ten} (${e.ten_tai_khoan})`, value: String(e.id) })),
    [employees],
  );

  const mucDoOptions = useMemo(
    () => CONG_VIEC_MUC_DO.map((m) => ({ label: m, value: m })),
    [],
  );

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors },
    reset,
  } = useForm<CongViecDanhSachFormValues>({
    resolver: zodResolver(congViecDanhSachSchema) as Resolver<CongViecDanhSachFormValues>,
    defaultValues: DEFAULT_VALUES,
  });

  const watchedIdTrach = useWatch({ control, name: 'id_trach_nhiem' });

  useEffect(() => {
    if (initialData) {
      reset({
        muc_do: initialData.muc_do,
        ten_cong_viec: initialData.ten_cong_viec,
        ghi_chu: initialData.ghi_chu ?? undefined,
        link_tai_lieu: initialData.link_tai_lieu ?? undefined,
        thoi_han: initialData.thoi_han ?? undefined,
        tien_do: initialData.tien_do,
        id_trach_nhiem: initialData.id_trach_nhiem,
        ids_ho_tro: [...initialData.ids_ho_tro],
        trang_thai: initialData.trang_thai,
        ket_qua: initialData.ket_qua ?? undefined,
        link_kq: initialData.link_kq ?? undefined,
        ngay_hoan_thanh: initialData.ngay_hoan_thanh ?? undefined,
      });
    } else {
      reset({
        ...DEFAULT_VALUES,
        id_trach_nhiem: idNguoiTao || '',
      });
    }
  }, [initialData, reset, idNguoiTao]);

  const hoTroOptions = useMemo(() => {
    const tr = watchedIdTrach?.trim();
    return employeeOptions.filter((o) => !tr || o.value !== tr);
  }, [employeeOptions, watchedIdTrach]);

  const onSubmit: SubmitHandler<CongViecDanhSachFormValues> = (data) => {
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
      icon={<ListTodo size={18} />}
      subtitle={
        isEdit && initialData
          ? `${txt('taskList.form.editSubtitle')} · ${initialData.ten_cong_viec}`
          : txt('taskList.form.createSubtitle')
      }
      footer={
        <FormDrawerFooter
          formId="cong-viec-danh-sach-form"
          onCancel={onClose}
          isLoading={pending}
          isEdit={isEdit}
          compact
          createIcon={<ListTodo className="w-3.5 h-3.5 mr-1.5 shrink-0" />}
        />
      }
      footerCompact
    >
      {!isEdit && !idNguoiTao ? (
        <p className="text-sm text-destructive mb-4">{txt('taskList.service.noEmployeeProfile')}</p>
      ) : null}
      <form id="cong-viec-danh-sach-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('trang_thai')} />
        <input type="hidden" {...register('tien_do', { valueAsNumber: true })} />
        <input type="hidden" {...register('ket_qua')} />
        <input type="hidden" {...register('link_kq')} />
        <input type="hidden" {...register('ngay_hoan_thanh')} />
        <FormSection title={txt('taskList.detail.sectionInfo')} icon={<ListTodo size={14} />} variant="primary">
          <FormGrid cols={2}>
            <Controller
              name="muc_do"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('taskList.form.mucDo')}
                  required
                  clearable={false}
                  options={mucDoOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.muc_do?.message}
                />
              )}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('taskList.form.tenCongViec')}
                required
                icon={<ListTodo size={12} />}
                {...register('ten_cong_viec')}
                error={errors.ten_cong_viec?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Textarea
                label={txt('taskList.form.ghiChu')}
                rows={3}
                {...register('ghi_chu')}
                error={errors.ghi_chu?.message}
              />
            </div>
            <Input
              label={txt('taskList.form.thoiHan')}
              type="date"
              icon={<Calendar size={12} />}
              {...register('thoi_han')}
              error={errors.thoi_han?.message}
            />
            <div className={FORM_GRID_SPAN_FULL}>
              <Input
                label={txt('taskList.form.linkTaiLieu')}
                type="url"
                placeholder="https://"
                icon={<Link2 size={12} />}
                {...register('link_tai_lieu')}
                error={errors.link_tai_lieu?.message}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="id_trach_nhiem"
                control={control}
                render={({ field }) => (
                  <Combobox
                    label={txt('taskList.form.trachNhiem')}
                    required
                    clearable={false}
                    options={employeeOptions}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v);
                      const hoTro = getValues('ids_ho_tro').filter((id) => id !== v);
                      setValue('ids_ho_tro', hoTro);
                    }}
                    error={errors.id_trach_nhiem?.message}
                  />
                )}
              />
            </div>
            <div className={FORM_GRID_SPAN_FULL}>
              <Controller
                name="ids_ho_tro"
                control={control}
                render={({ field }) => (
                  <MultiSelect
                    label={txt('taskList.form.hoTro')}
                    options={hoTroOptions}
                    value={field.value}
                    onChange={field.onChange}
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

export default CongViecForm;
