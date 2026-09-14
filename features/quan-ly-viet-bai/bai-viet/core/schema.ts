import { z } from 'zod';
import { txt } from '@/lib/text';
import { parseSoInput } from '@/lib/number';

export const baiVietDanhSachSchema = z.object({
  ten_bai: z.string().trim().min(1, txt('articleList.validation.tenBaiRequired')),
  id_the_loai: z.string().trim().min(1, txt('articleList.validation.theLoaiRequired')),
  // Đọc không được thì phải BÁO LỖI. Trước đây rơi về 0: bài viết vẫn lưu, không
  // có thông báo nào, và đơn giá 0 đồng nằm im trong bảng nhuận bút.
  don_gia: z.preprocess(
    (v) => {
      if (v === '' || v === undefined || v === null) return 0;
      if (typeof v === 'number') return Number.isFinite(v) ? v : Number.NaN;
      return parseSoInput(String(v), { choThapPhan: true }) ?? Number.NaN;
    },
    z
      .number({ message: txt('articleList.validation.donGiaKhongDoc') })
      .min(0, txt('articleList.validation.donGiaMin')),
  ),
  ngay_dang: z.string().trim().min(1, txt('articleList.validation.ngayDangRequired')),
  id_nguon_dang: z.string().trim().min(1, txt('articleList.validation.nguonDangRequired')),
  id_trang_dang: z.string().trim().min(1, txt('articleList.validation.trangDangRequired')),
  link: z
    .string()
    .trim()
    .min(1, txt('articleList.validation.linkRequired'))
    .url(txt('articleList.validation.linkUrl')),
});

export type BaiVietDanhSachFormValues = z.infer<typeof baiVietDanhSachSchema>;
