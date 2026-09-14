/**
 * Chuỗi UI của module Thiết lập bài viết.
 *
 * Trước đây module không có `text.ts` nên namespace `articleSettings` không hề
 * tồn tại trong bảng chuỗi — `txt()` trả về chính cái key, người dùng thấy toast
 * `articleSettings.toast.theLoaiCreate` sau mỗi lần thêm thể loại.
 */
export const articleSettings = {
  toast: {
    theLoaiCreate: 'Đã thêm thể loại',
    theLoaiUpdate: 'Đã cập nhật thể loại',
    theLoaiDelete: 'Đã xóa {{count}} thể loại',
    khacCreate: 'Đã thêm thiết lập',
    khacUpdate: 'Đã cập nhật thiết lập',
    khacDelete: 'Đã xóa {{count}} thiết lập',
  },
  validation: {
    tenTheLoaiRequired: 'Vui lòng nhập tên thể loại',
    tenRequired: 'Vui lòng nhập tên',
    donGiaKhongDoc: 'Đơn giá chưa đọc được. Chỉ nhập số, ví dụ 500.000',
  },
} as const;
