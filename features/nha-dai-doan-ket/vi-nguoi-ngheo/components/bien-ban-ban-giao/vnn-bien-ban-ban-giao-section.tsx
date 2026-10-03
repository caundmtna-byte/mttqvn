import React from 'react';
import {
  get,
  useController,
  useFieldArray,
  useFormState,
  useWatch,
  type Control,
  type Path,
} from 'react-hook-form';
import { Coins, HandCoins, Plus, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import { soVN } from '@/lib/bien-ban/bien-ban-model';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import DatePicker from '@/components/ui/DatePicker';
import CurrencyInput from '@/components/ui/CurrencyInput';
import Button from '@/components/ui/Button';
import FormSection from '@/components/shared/FormSection';
import FormGrid, { FORM_GRID_SPAN_FULL } from '@/components/shared/FormGrid';
import type { VnnLinhVuc } from '../../core/constants';
import type { ViNguoiNgheoFormInput, ViNguoiNgheoFormValues } from '../../core/schema';
import {
  BBBG_HIEN_VAT_MAX,
  BBBG_LINH_VUC_NHA,
  BBBG_LINH_VUC_SINH_KE,
  bbbgHienVatSchema,
  dongHienVatTrong,
  thanhTienHienVat,
  type BbbgHienVatInput,
} from '../../core/bien-ban-ban-giao';

type Ctl = Control<ViNguoiNgheoFormInput, unknown, ViNguoiNgheoFormValues>;
type Kieu = 'text' | 'textarea' | 'date' | 'tien' | 'thapPhan' | 'so';

function path(name: string): Path<ViNguoiNgheoFormInput> {
  return `bien_ban_ban_giao.${name}` as Path<ViNguoiNgheoFormInput>;
}

function nhan(key: string): string {
  return txt(`viNguoiNgheo.bienBanBanGiao.nhan.${key}`);
}

/** Một ô nhập. `name` là đường dẫn trong `bien_ban_ban_giao`; `nhanKey` mặc định là `name`. */
const ONhap: React.FC<{
  control: Ctl;
  name: string;
  kind?: Kieu;
  nhanKey?: string;
  placeholder?: string;
}> = ({ control, name, kind = 'text', nhanKey, placeholder }) => {
  const { field } = useController({ control, name: path(name) });
  const { errors } = useFormState({ control, name: path(name) });
  const error = (get(errors, path(name)) as { message?: string } | undefined)?.message;
  const label = nhan(nhanKey ?? name);
  const value = typeof field.value === 'string' ? field.value : '';
  const soChange = (n: number | string | null) => field.onChange(n == null ? '' : String(n));

  switch (kind) {
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
          onChange={soChange}
          onBlur={field.onBlur}
          min={0}
          error={error}
        />
      );
    case 'thapPhan':
      return (
        <CurrencyInput
          label={label}
          suffix=""
          decimalScale={2}
          value={value === '' ? null : value}
          onChange={soChange}
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

function NhomTieuDe({ text }: { text: string }) {
  return (
    <p className={`${FORM_GRID_SPAN_FULL} pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
      {text}
    </p>
  );
}

/** Thành tiền đọc bằng đúng schema lưu — ô gõ dở / sai thì không hiện số. */
function thanhTien(d: BbbgHienVatInput | undefined): number | null {
  const r = bbbgHienVatSchema.safeParse(d ?? {});
  return r.success ? thanhTienHienVat(r.data) : null;
}

const HienVat: React.FC<{ control: Ctl }> = ({ control }) => {
  const { fields, append, remove } = useFieldArray({ control, name: 'bien_ban_ban_giao.hien_vat' });
  const dong = useWatch({ control, name: 'bien_ban_ban_giao.hien_vat' }) as BbbgHienVatInput[] | undefined;
  const tung = (dong ?? []).map(thanhTien);
  const tong = tung.reduce<number | null>((s, n) => (n == null ? s : (s ?? 0) + n), null);

  return (
    <>
      <p className={`${FORM_GRID_SPAN_FULL} text-xs text-muted-foreground`}>
        {txt('viNguoiNgheo.bienBanBanGiao.hienVatHint')}
      </p>
      {fields.map((f, i) => (
        <div key={f.id} className={`${FORM_GRID_SPAN_FULL} rounded-lg border border-border p-3`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {txt('viNguoiNgheo.bienBanBanGiao.hienVatDongN', { n: String(i + 1) })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(i)}
              aria-label={txt('viNguoiNgheo.bienBanBanGiao.xoaDong')}
              className="h-7 w-7 shrink-0 text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <FormGrid cols={2}>
            <ONhap control={control} name={`hien_vat.${i}.ten`} nhanKey="ten" />
            <ONhap control={control} name={`hien_vat.${i}.dvt`} nhanKey="dvt" />
            <ONhap control={control} name={`hien_vat.${i}.so_luong`} nhanKey="so_luong" kind="thapPhan" />
            <ONhap control={control} name={`hien_vat.${i}.don_gia`} nhanKey="don_gia" kind="tien" />
            <div className={FORM_GRID_SPAN_FULL}>
              <ONhap control={control} name={`hien_vat.${i}.ghi_chu`} nhanKey="ghi_chu" />
            </div>
          </FormGrid>
          {tung[i] != null ? (
            <p className="mt-2 text-right text-xs text-muted-foreground">
              {txt('viNguoiNgheo.bienBanBanGiao.thanhTien', { soTien: soVN(tung[i]) ?? '' })}
            </p>
          ) : null}
        </div>
      ))}
      <div className={`${FORM_GRID_SPAN_FULL} flex items-center justify-between gap-2`}>
        {fields.length < BBBG_HIEN_VAT_MAX ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(dongHienVatTrong())}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            {txt('viNguoiNgheo.bienBanBanGiao.themHienVat')}
          </Button>
        ) : (
          <span />
        )}
        {tong != null ? (
          <span className="text-sm font-semibold text-foreground">
            {txt('viNguoiNgheo.bienBanBanGiao.tongHienVat', { soTien: soVN(tong) ?? '' })}
          </span>
        ) : null}
      </div>
    </>
  );
};

interface Props {
  control: Ctl;
  linhVuc: string;
  /** Form sửa đang chờ bản đầy đủ — chưa có dữ liệu biên bản để hiện. */
  dangTai: boolean;
}

/** Section "Biên bản bàn giao" của form khoản hỗ trợ — chỉ các ô biên bản cần mà dòng chưa có. */
const VnnBienBanBanGiaoSection: React.FC<Props> = ({ control, linhVuc, dangTai }) => {
  const lv = linhVuc as VnnLinhVuc;
  return (
    <FormSection title={txt('viNguoiNgheo.bienBanBanGiao.section')} icon={<HandCoins size={14} />}>
      <p className="mb-3 text-xs text-muted-foreground">{txt('viNguoiNgheo.bienBanBanGiao.hint')}</p>
      {dangTai ? (
        <p className="text-sm text-muted-foreground">{txt('viNguoiNgheo.bienBanBanGiao.dangTai')}</p>
      ) : (
        <FormGrid cols={2}>
          <ONhap control={control} name="ngay_ban_giao" kind="date" />
          <ONhap control={control} name="dia_diem" />

          <NhomTieuDe text={txt('viNguoiNgheo.bienBanBanGiao.nhomBenGiao')} />
          <div className={FORM_GRID_SPAN_FULL}>
            <ONhap
              control={control}
              name="don_vi_ben_giao"
              placeholder={nhan('don_vi_ben_giao_placeholder')}
            />
          </div>
          <ONhap control={control} name="dai_dien_ho_ten" />
          <ONhap control={control} name="dai_dien_chuc_vu" />

          <NhomTieuDe text={txt('viNguoiNgheo.bienBanBanGiao.nhomLamChung')} />
          <ONhap control={control} name="lam_chung_1_ho_ten" />
          <ONhap control={control} name="lam_chung_1_chuc_vu" />
          <ONhap control={control} name="lam_chung_2_ho_ten" />
          <ONhap control={control} name="lam_chung_2_chuc_vu" />

          <NhomTieuDe text={txt('viNguoiNgheo.bienBanBanGiao.nhomCanCu')} />
          <ONhap control={control} name="so_quyet_dinh" placeholder={nhan('so_quyet_dinh_placeholder')} />
          <ONhap control={control} name="ngay_quyet_dinh" kind="date" />
          <ONhap control={control} name="co_quan_quyet_dinh" />
          <ONhap control={control} name="ve_viec" />

          <NhomTieuDe text={txt('viNguoiNgheo.bienBanBanGiao.nhomHienVat')} />
          <HienVat control={control} />

          <NhomTieuDe text={txt('viNguoiNgheo.bienBanBanGiao.nhomKhac')} />
          <div className={FORM_GRID_SPAN_FULL}>
            <ONhap control={control} name="muc_dich" kind="textarea" />
          </div>
          {BBBG_LINH_VUC_SINH_KE.includes(lv) ? (
            <ONhap control={control} name="so_thang_duy_tri" kind="so" />
          ) : null}
          {BBBG_LINH_VUC_NHA.includes(lv) ? (
            <ONhap control={control} name="han_hoan_thanh_nha" kind="date" />
          ) : null}
        </FormGrid>
      )}
    </FormSection>
  );
};

export default VnnBienBanBanGiaoSection;
