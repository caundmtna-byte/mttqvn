import React, { useMemo } from 'react';
import {
  Activity,
  BookOpen,
  Briefcase,
  Binary,
  Building2,
  Calendar,
  CalendarClock,
  Flag,
  GraduationCap,
  Landmark,
  Layers,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import type { Control, FieldErrors, UseFormRegister, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { MTTQ_CAN_BO_GIOI_TINH, MTTQ_CAN_BO_TON_GIAO } from '../core/constants';
import type { MttqCanBoFormValues } from '../core/schema';

export interface MttqCanBoFormBodyProps {
  register: UseFormRegister<MttqCanBoFormValues>;
  control: Control<MttqCanBoFormValues>;
  errors: FieldErrors<MttqCanBoFormValues>;
  setValue: UseFormSetValue<MttqCanBoFormValues>;
  watch: UseFormWatch<MttqCanBoFormValues>;
  optToChuc: { label: string; value: string }[];
  optDanToc: { label: string; value: string }[];
  optTrinhDo: { label: string; value: string }[];
  optLyLuan: { label: string; value: string }[];
  optTrangThai: { label: string; value: string }[];
  departmentOptions: { label: string; value: string }[];
  optChucVu: { label: string; value: string }[];
  xaPhuongOptions: { label: string; value: string }[];
  /** Chức vụ (id + cấp quản lý) để hiển thị cấp khi chọn chức danh. */
  positionsForCap: { id: string; cap_quan_ly: string | null }[];
  /** Chức vụ cấp xã — bắt buộc chọn đơn vị xã/phường. */
  needsDonViXaPhuong: boolean;
}

/**
 * Các trường form cán bộ (không bọc `<form>`) — dùng trong `MttqCanBoForm` và editor nhúng.
 */
const MttqCanBoFormBody: React.FC<MttqCanBoFormBodyProps> = ({
  register,
  control,
  errors,
  setValue,
  watch,
  optToChuc,
  optDanToc,
  optTrinhDo,
  optLyLuan,
  optTrangThai,
  departmentOptions,
  optChucVu,
  xaPhuongOptions,
  positionsForCap,
  needsDonViXaPhuong,
}) => {
  const selectedPhongBan = watch('id_phong_ban');
  const chucVuIdWatch = watch('chuc_vu_id');

  const capQuanLyDisplay = useMemo(() => {
    const id = String(chucVuIdWatch ?? '').trim();
    if (!id) return '';
    const p = positionsForCap.find((x) => String(x.id) === id);
    const n = normalizeCapQuanLyInput(p?.cap_quan_ly);
    if (n) return n;
    const raw = (p?.cap_quan_ly ?? '').trim();
    return raw || txt('matTranCanBo.form.capQuanLyChuaGan');
  }, [chucVuIdWatch, positionsForCap]);

  const gioiTinhOptions = useMemo(
    () => MTTQ_CAN_BO_GIOI_TINH.map((g) => ({ label: g, value: g })),
    [],
  );

  const tonGiaoOptions = useMemo(
    () => MTTQ_CAN_BO_TON_GIAO.map((v) => ({ label: v, value: v })),
    [],
  );

  return (
    <>
      <FormSection title={txt('matTranCanBo.form.sectionNhanThan')} icon={<User size={14} />} variant="primary">
        <FormGrid>
          <div className={FORM_GRID_SPAN_FULL}>
            <Input
              label={txt('matTranCanBo.form.hoTen')}
              icon={<User size={12} />}
              {...register('ho_ten')}
              error={errors.ho_ten?.message}
              required
            />
          </div>
          <Input
            label={txt('matTranCanBo.form.ngaySinh')}
            type="date"
            icon={<Calendar size={12} />}
            {...register('ngay_sinh')}
            error={errors.ngay_sinh?.message}
            required
          />
          <Controller
            name="gioi_tinh"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('matTranCanBo.form.gioiTinh')}
                icon={<User size={12} />}
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
                icon={<Flag size={12} />}
                options={optDanToc}
                value={field.value}
                onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                placeholder={txt('common.select')}
                error={errors.dan_toc_id?.message}
                required
                clearable={false}
                dropdownInPortal
              />
            )}
          />
          <Controller
            name="ton_giao"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('matTranCanBo.form.tonGiao')}
                icon={<Landmark size={12} />}
                options={tonGiaoOptions}
                value={field.value}
                onChange={(v) => field.onChange(String(v))}
                error={errors.ton_giao?.message}
                required
                clearable={false}
                dropdownInPortal
              />
            )}
          />
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
          <Input
            label={txt('matTranCanBo.form.ngayVaoDang')}
            type="date"
            icon={<Calendar size={12} />}
            {...register('ngay_vao_dang')}
            error={errors.ngay_vao_dang?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title={txt('matTranCanBo.form.sectionToChuc')} icon={<Building2 size={14} />} variant="primary">
        <FormGrid>
          <Controller
            name="to_chuc_id"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('matTranCanBo.form.toChuc')}
                icon={<Building2 size={12} />}
                options={optToChuc}
                value={field.value}
                onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                placeholder={txt('common.select')}
                error={errors.to_chuc_id?.message}
                required
                clearable={false}
                dropdownInPortal
              />
            )}
          />
          <Controller
            name="id_phong_ban"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('matTranCanBo.form.phongBan')}
                icon={<Layers size={12} />}
                options={departmentOptions}
                value={field.value}
                onChange={(v) => {
                  const next = v === '' ? '' : String(v);
                  if (next !== field.value) {
                    setValue('chuc_vu_id', '');
                    setValue('don_vi_id', '');
                  }
                  field.onChange(next);
                }}
                placeholder={txt('employee.form.departmentPlaceholder')}
                error={errors.id_phong_ban?.message}
                required
                clearable={false}
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
                icon={<Briefcase size={12} />}
                options={optChucVu}
                value={field.value}
                onChange={(v) => {
                  field.onChange(v === '' ? '' : String(v));
                  setValue('don_vi_id', '');
                }}
                placeholder={txt('common.select')}
                error={errors.chuc_vu_id?.message}
                required
                disabled={!selectedPhongBan}
                clearable={false}
                dropdownInPortal
              />
            )}
          />
          <div className={FORM_GRID_SPAN_FULL}>
            <Input
              readOnly
              tabIndex={-1}
              label={txt('matTranCanBo.form.capQuanLy')}
              icon={<Binary size={12} />}
              value={capQuanLyDisplay.trim() ? capQuanLyDisplay : '—'}
              className="cursor-default"
            />
            <p className="m-0 mt-1 text-xs text-muted-foreground">{txt('matTranCanBo.form.capQuanLyHint')}</p>
          </div>
          {needsDonViXaPhuong ? (
            <Controller
              name="don_vi_id"
              control={control}
              render={({ field }) => (
                <Combobox
                  label={txt('matTranCanBo.form.donVi')}
                  icon={<MapPin size={12} />}
                  options={xaPhuongOptions}
                  value={field.value}
                  onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                  placeholder={txt('common.select')}
                  error={errors.don_vi_id?.message}
                  required
                  searchPlaceholder={txt('employee.form.donViXaPhuongSearch')}
                  dropdownInPortal
                />
              )}
            />
          ) : null}
          <Input
            label={txt('matTranCanBo.form.ngayThamGiaToChuc')}
            type="date"
            icon={<CalendarClock size={12} />}
            {...register('ngay_tham_gia_to_chuc')}
            error={errors.ngay_tham_gia_to_chuc?.message}
            required
          />
        </FormGrid>
      </FormSection>

      <FormSection title={txt('matTranCanBo.form.sectionHocVan')} icon={<GraduationCap size={14} />} variant="primary">
        <FormGrid>
          <Controller
            name="trinh_do_id"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('matTranCanBo.form.trinhDo')}
                icon={<GraduationCap size={12} />}
                options={optTrinhDo}
                value={field.value}
                onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                placeholder={txt('common.select')}
                error={errors.trinh_do_id?.message}
                required
                clearable={false}
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
                icon={<BookOpen size={12} />}
                options={optLyLuan}
                value={field.value}
                onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                placeholder={txt('common.select')}
                error={errors.ly_luan_chinh_tri_id?.message}
                required
                clearable={false}
                dropdownInPortal
              />
            )}
          />
          <Input
            label={txt('matTranCanBo.form.vanHoa')}
            icon={<BookOpen size={12} />}
            {...register('van_hoa')}
            error={errors.van_hoa?.message}
          />
        </FormGrid>
      </FormSection>

      <FormSection title={txt('matTranCanBo.form.sectionLienHe')} icon={<MapPin size={14} />} variant="primary">
        <FormGrid>
          <div className={FORM_GRID_SPAN_FULL}>
            <Textarea
              label={txt('matTranCanBo.form.diaChi')}
              icon={<MapPin size={12} />}
              {...register('dia_chi')}
              rows={2}
              error={errors.dia_chi?.message}
              required
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Textarea
              label={txt('matTranCanBo.form.queQuan')}
              icon={<MapPin size={12} />}
              {...register('que_quan')}
              rows={2}
              error={errors.que_quan?.message}
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Textarea
              label={txt('matTranCanBo.form.noiOHienNay')}
              icon={<MapPin size={12} />}
              {...register('noi_o_hien_nay')}
              rows={2}
              error={errors.noi_o_hien_nay?.message}
            />
          </div>
          <Input
            label={txt('matTranCanBo.form.dienThoai')}
            icon={<Phone size={12} />}
            {...register('dien_thoai')}
            error={errors.dien_thoai?.message}
            required
          />
        </FormGrid>
      </FormSection>

      <FormSection title={txt('matTranCanBo.form.sectionTrangThai')} icon={<Activity size={14} />} variant="primary">
        <FormGrid>
          <Controller
            name="trang_thai_id"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('matTranCanBo.form.trangThai')}
                icon={<Activity size={12} />}
                options={optTrangThai}
                value={field.value}
                onChange={(v) => field.onChange(v === '' ? '' : String(v))}
                placeholder={txt('common.select')}
                error={errors.trang_thai_id?.message}
                required
                clearable={false}
                dropdownInPortal
              />
            )}
          />
          <Input
            label={txt('matTranCanBo.form.ngayNhapTrangThai')}
            type="date"
            icon={<Calendar size={12} />}
            {...register('ngay_nhap_trang_thai')}
            error={errors.ngay_nhap_trang_thai?.message}
            required
          />
        </FormGrid>
      </FormSection>
    </>
  );
};

export default MttqCanBoFormBody;
