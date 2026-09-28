import React from 'react';
import {
  Controller,
  type Control,
  type FieldPath,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form';
import { BadgeCheck, UserRound } from 'lucide-react';
import { txt } from '@/lib/text';
import Input from '@/components/ui/Input';
import Combobox, { type Option } from '@/components/ui/Combobox';
import type { NhaDaiDoanKetFormInput, NhaDaiDoanKetFormValues } from '../core/schema';

/** Tiền tố value của option cán bộ — phân biệt với tên gõ tự do. */
export const NDDK_CAN_BO_OPTION_PREFIX = 'cb:';

export interface NddkCanBoGoiY {
  ho_ten: string;
  chuc_vu: string;
}

type Name = FieldPath<NhaDaiDoanKetFormInput>;

interface Props {
  label: string;
  hoTenName: Name;
  chucVuName: Name;
  control: Control<NhaDaiDoanKetFormInput, unknown, NhaDaiDoanKetFormValues>;
  register: UseFormRegister<NhaDaiDoanKetFormInput>;
  setValue: UseFormSetValue<NhaDaiDoanKetFormInput>;
  /** value = `cb:<id>`; tra ngược bằng `canBoById`. */
  canBoOptions: Option[];
  canBoById: ReadonlyMap<string, NddkCanBoGoiY>;
}

/**
 * Một người trong biên bản: họ tên + chức vụ.
 *
 * Chọn một cán bộ MTTQ ⇒ điền cả họ tên lẫn chức vụ. Người ngoài danh sách
 * (xóm trưởng, cán bộ UBND…) thì gõ tên rồi chọn « Thêm ». Lưu dạng CHUỖI, không
 * phải khoá ngoại: biên bản phải giữ đúng tên người đã ký dù hồ sơ cán bộ đổi sau.
 */
const NddkNguoiThamGiaInput: React.FC<Props> = ({
  label,
  hoTenName,
  chucVuName,
  control,
  register,
  setValue,
  canBoOptions,
  canBoById,
}) => {
  const opts = { shouldDirty: true } as const;
  return (
    <>
      <Controller
        name={hoTenName}
        control={control}
        render={({ field }) => (
          <Combobox
            label={label}
            icon={UserRound}
            options={canBoOptions}
            value={typeof field.value === 'string' ? field.value : ''}
            onChange={(v) => {
              const raw = v == null ? '' : String(v);
              if (raw.startsWith(NDDK_CAN_BO_OPTION_PREFIX)) {
                const cb = canBoById.get(raw.slice(NDDK_CAN_BO_OPTION_PREFIX.length));
                if (!cb) return;
                setValue(hoTenName, cb.ho_ten, opts);
                setValue(chucVuName, cb.chuc_vu, opts);
                return;
              }
              field.onChange(raw);
            }}
            placeholder={txt('nhaDaiDoanKet.form.nguoiPlaceholder')}
            searchPlaceholder={txt('nhaDaiDoanKet.form.nguoiSearchPlaceholder')}
            creatable
            creatableActionLabel={(s) => txt('nhaDaiDoanKet.form.nguoiCreatable', { ten: s })}
            dropdownInPortal
          />
        )}
      />
      <Input
        label={txt('nhaDaiDoanKet.form.chucVuLabel')}
        icon={BadgeCheck}
        {...register(chucVuName)}
      />
    </>
  );
};

export default NddkNguoiThamGiaInput;
