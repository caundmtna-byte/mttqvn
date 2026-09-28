import React, { useMemo } from 'react';
import {
  Controller,
  useFieldArray,
  type Control,
  type FieldErrors,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Coins,
  FileSignature,
  HandCoins,
  Home,
  MapPin,
  Plus,
  Ruler,
  StickyNote,
  Trash2,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Textarea from '@/components/ui/Textarea';
import Combobox from '@/components/ui/Combobox';
import Button from '@/components/ui/Button';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import { useCan } from '@/hooks/use-can';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import {
  NDDK_NGUON_KHAC_MAX,
  NDDK_NHU_CAU_HO_TRO_VALUES,
  NDDK_THON_KIEM_TRA_MAX,
} from '../core/constants';
import type { NhaDaiDoanKetFormInput, NhaDaiDoanKetFormValues } from '../core/schema';
import NddkNguoiThamGiaInput, {
  NDDK_CAN_BO_OPTION_PREFIX,
  type NddkCanBoGoiY,
} from './nddk-nguoi-tham-gia-input';

interface Props {
  control: Control<NhaDaiDoanKetFormInput, unknown, NhaDaiDoanKetFormValues>;
  register: UseFormRegister<NhaDaiDoanKetFormInput>;
  setValue: UseFormSetValue<NhaDaiDoanKetFormInput>;
  errors: FieldErrors<NhaDaiDoanKetFormInput>;
}

/**
 * Ba section dữ liệu của 3 biên bản in (khảo sát / kiểm tra hoàn thành / bàn
 * giao). Mọi ô đều không bắt buộc — ô trống thì biên bản in dòng chấm.
 */
const NddkBienBanFormSections: React.FC<Props> = ({ control, register, setValue, errors }) => {
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });

  const { canBoOptions, canBoById } = useMemo(() => {
    const byId = new Map<string, NddkCanBoGoiY>();
    const options = canBoList.map((c) => {
      byId.set(String(c.id), { ho_ten: c.ho_ten, chuc_vu: c.ten_chuc_vu?.trim() ?? '' });
      return {
        value: `${NDDK_CAN_BO_OPTION_PREFIX}${c.id}`,
        label: c.ho_ten,
        subLabel: [c.ten_chuc_vu, c.ten_don_vi].filter(Boolean).join(' · '),
      };
    });
    return { canBoOptions: options, canBoById: byId };
  }, [canBoList]);

  const nhuCauOptions = useMemo(
    () => NDDK_NHU_CAU_HO_TRO_VALUES.map((v) => ({ label: v, value: v })),
    [],
  );

  const thon = useFieldArray({ control, name: 'thanh_phan_kiem_tra.thon' });
  const nguonKhac = useFieldArray({ control, name: 'nguon_khac' });

  const nguoi = { control, register, setValue, canBoOptions, canBoById };

  return (
    <>
      <FormSection title={txt('nhaDaiDoanKet.form.sectionKhaoSat')} icon={<ClipboardList size={14} />}>
        <FormGrid cols={2}>
          <Input
            label={txt('nhaDaiDoanKet.bienBan.ngayKhaoSat')}
            type="date"
            icon={Calendar}
            {...register('ngay_khao_sat')}
            error={errors.ngay_khao_sat?.message}
          />
          <Controller
            name="nhu_cau_ho_tro"
            control={control}
            render={({ field }) => (
              <Combobox
                label={txt('nhaDaiDoanKet.bienBan.nhuCauHoTro')}
                icon={Home}
                options={nhuCauOptions}
                value={field.value ?? ''}
                onChange={(v) => field.onChange(v == null ? '' : String(v))}
                placeholder={txt('nhaDaiDoanKet.form.chonPlaceholder')}
                error={errors.nhu_cau_ho_tro?.message}
                dropdownInPortal
              />
            )}
          />
          <div className={FORM_GRID_SPAN_FULL}>
            <Textarea
              label={txt('nhaDaiDoanKet.bienBan.hienTrangNha')}
              icon={Home}
              rows={2}
              {...register('hien_trang_nha')}
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Textarea
              label={txt('nhaDaiDoanKet.bienBan.hoanCanhGiaDinh')}
              icon={Users}
              rows={2}
              {...register('hoan_canh_gia_dinh')}
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Textarea
              label={txt('nhaDaiDoanKet.bienBan.ghiChuKhaoSat')}
              icon={StickyNote}
              rows={2}
              {...register('ghi_chu_khao_sat')}
            />
          </div>
        </FormGrid>
      </FormSection>

      <FormSection
        title={txt('nhaDaiDoanKet.form.sectionHoanThanh')}
        icon={<ClipboardCheck size={14} />}
      >
        <FormGrid cols={2}>
          <Input
            label={txt('nhaDaiDoanKet.bienBan.ngayKiemTra')}
            type="date"
            icon={Calendar}
            {...register('ngay_kiem_tra_hoan_thanh')}
            error={errors.ngay_kiem_tra_hoan_thanh?.message}
          />
          <Input
            label={txt('nhaDaiDoanKet.bienBan.dienTichSan')}
            icon={Ruler}
            inputMode="decimal"
            placeholder="m²"
            {...register('dien_tich_san')}
            error={errors.dien_tich_san?.message}
          />

          <p className={`${FORM_GRID_SPAN_FULL} text-xs font-medium text-muted-foreground pt-1`}>
            {txt('nhaDaiDoanKet.bienBan.thanhPhanKiemTra')}
          </p>
          <NddkNguoiThamGiaInput
            label={txt('nhaDaiDoanKet.bienBan.daiDienBcd')}
            hoTenName="thanh_phan_kiem_tra.bcd.ho_ten"
            chucVuName="thanh_phan_kiem_tra.bcd.chuc_vu"
            {...nguoi}
          />
          <NddkNguoiThamGiaInput
            label={txt('nhaDaiDoanKet.bienBan.daiDienUbnd')}
            hoTenName="thanh_phan_kiem_tra.ubnd.ho_ten"
            chucVuName="thanh_phan_kiem_tra.ubnd.chuc_vu"
            {...nguoi}
          />
          <NddkNguoiThamGiaInput
            label={txt('nhaDaiDoanKet.bienBan.daiDienMttq')}
            hoTenName="thanh_phan_kiem_tra.mttq.ho_ten"
            chucVuName="thanh_phan_kiem_tra.mttq.chuc_vu"
            {...nguoi}
          />
          {thon.fields.map((f, i) => (
            <React.Fragment key={f.id}>
              <NddkNguoiThamGiaInput
                label={txt('nhaDaiDoanKet.bienBan.daiDienThonN', { n: String(i + 1) })}
                hoTenName={`thanh_phan_kiem_tra.thon.${i}.ho_ten`}
                chucVuName={`thanh_phan_kiem_tra.thon.${i}.chuc_vu`}
                {...nguoi}
              />
              <div className={`${FORM_GRID_SPAN_FULL} -mt-2 flex justify-end`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => thon.remove(i)}
                  className="h-7 gap-1 text-xs text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {txt('nhaDaiDoanKet.form.xoaDong')}
                </Button>
              </div>
            </React.Fragment>
          ))}
          {thon.fields.length < NDDK_THON_KIEM_TRA_MAX ? (
            <div className={FORM_GRID_SPAN_FULL}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => thon.append({ ho_ten: '', chuc_vu: '' })}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                {txt('nhaDaiDoanKet.form.themDaiDienThon')}
              </Button>
            </div>
          ) : null}

          <div className={FORM_GRID_SPAN_FULL}>
            <Input
              label={txt('nhaDaiDoanKet.bienBan.phanNen')}
              icon={Home}
              {...register('phan_nen')}
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Input
              label={txt('nhaDaiDoanKet.bienBan.phanMai')}
              icon={Home}
              {...register('phan_mai')}
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Input
              label={txt('nhaDaiDoanKet.bienBan.phanKhungTuong')}
              icon={Home}
              {...register('phan_khung_tuong')}
            />
          </div>
          <div className={FORM_GRID_SPAN_FULL}>
            <Controller
              name="tong_gia_tri"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  label={txt('nhaDaiDoanKet.bienBan.tongGiaTri')}
                  icon={Coins}
                  suffix="đ"
                  value={field.value === '' || field.value == null ? null : field.value}
                  onChange={(n) => field.onChange(n == null ? '' : String(n))}
                  onBlur={field.onBlur}
                  min={0}
                  error={errors.tong_gia_tri?.message}
                />
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {txt('nhaDaiDoanKet.form.tongGiaTriHint')}
            </p>
          </div>
          {nguonKhac.fields.map((f, i) => (
            <React.Fragment key={f.id}>
              <Input
                label={txt('nhaDaiDoanKet.bienBan.nguonKhacTenN', { n: String(i + 1) })}
                icon={HandCoins}
                {...register(`nguon_khac.${i}.ten`)}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Controller
                    name={`nguon_khac.${i}.so_tien`}
                    control={control}
                    render={({ field }) => (
                      <CurrencyInput
                        label={txt('nhaDaiDoanKet.store.soTienCol')}
                        icon={Coins}
                        suffix="đ"
                        value={field.value === '' || field.value == null ? null : field.value}
                        onChange={(n) => field.onChange(n == null ? '' : String(n))}
                        onBlur={field.onBlur}
                        min={0}
                        error={errors.nguon_khac?.[i]?.so_tien?.message}
                      />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => nguonKhac.remove(i)}
                  aria-label={txt('nhaDaiDoanKet.form.xoaDong')}
                  className="shrink-0 text-rose-600 hover:text-rose-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </React.Fragment>
          ))}
          {nguonKhac.fields.length < NDDK_NGUON_KHAC_MAX ? (
            <div className={FORM_GRID_SPAN_FULL}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => nguonKhac.append({ ten: '', so_tien: '' })}
                className="gap-1"
              >
                <Plus className="w-4 h-4" />
                {txt('nhaDaiDoanKet.form.themNguonKhac')}
              </Button>
            </div>
          ) : null}
        </FormGrid>
      </FormSection>

      <FormSection title={txt('nhaDaiDoanKet.form.sectionBanGiao')} icon={<HandCoins size={14} />}>
        <FormGrid cols={2}>
          <Input
            label={txt('nhaDaiDoanKet.bienBan.ngayBanGiao')}
            type="date"
            icon={Calendar}
            {...register('ngay_ban_giao')}
            error={errors.ngay_ban_giao?.message}
          />
          <Input
            label={txt('nhaDaiDoanKet.bienBan.diaDiemBanGiao')}
            icon={MapPin}
            {...register('dia_diem_ban_giao')}
          />
          <NddkNguoiThamGiaInput
            label={txt('nhaDaiDoanKet.bienBan.benGiaoTien')}
            hoTenName="ban_giao_ho_ten"
            chucVuName="ban_giao_chuc_vu"
            {...nguoi}
          />
          <NddkNguoiThamGiaInput
            label={txt('nhaDaiDoanKet.bienBan.benLamChung')}
            hoTenName="lam_chung_ho_ten"
            chucVuName="lam_chung_chuc_vu"
            {...nguoi}
          />
          <Input
            label={txt('nhaDaiDoanKet.bienBan.soQuyetDinh')}
            icon={FileSignature}
            placeholder={txt('nhaDaiDoanKet.form.soQuyetDinhPlaceholder')}
            {...register('so_quyet_dinh')}
          />
          <Input
            label={txt('nhaDaiDoanKet.bienBan.ngayQuyetDinh')}
            type="date"
            icon={Calendar}
            {...register('ngay_quyet_dinh')}
            error={errors.ngay_quyet_dinh?.message}
          />
        </FormGrid>
      </FormSection>
    </>
  );
};

export default NddkBienBanFormSections;
