import { Position } from '../core/types';
import { PositionFormValues, positionSchema } from '../core/schema';
import { parseTrangThaiHoatDongImport, type TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { getJobLevels } from '../../cap-bac/services/cap-bac-service';
import { getDepartments } from '../../phong-ban/services/phong-ban-service';
import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import {
  POSITION_RETURNING_FULL,
  POSITION_RETURNING_STATUS_ONLY,
  POSITION_SELECT_FULL,
} from '../core/supabase-select';
import { txt } from '../../../../lib/text';

const ts = () => new Date().toISOString();

// --- Mock Data: Chức vụ liên kết Phòng ban + Cấp bậc ---
const MOCK_POSITIONS: Position[] = [
  // Phòng Ban Giám đốc (dep-0)
  { id: "pos-1", ten_chuc_vu: "Tổng Giám Đốc", cap_bac: "1", ten_cap_bac: "Giám đốc", phong_ban_id: "dep-0", ten_phong_ban: "Phòng Ban Giám đốc", mo_ta: "Điều hành toàn bộ hoạt động công ty", thu_tu: 1, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-2", ten_chuc_vu: "Phó Tổng Giám Đốc", cap_bac: "2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-0", ten_phong_ban: "Phòng Ban Giám đốc", mo_ta: "Hỗ trợ Tổng Giám đốc điều hành", thu_tu: 2, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-3", ten_chuc_vu: "Trưởng Nhóm Điều hành", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-0-1", ten_phong_ban: "Nhóm điều hành", mo_ta: "Điều phối công việc điều hành", thu_tu: 3, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-4", ten_chuc_vu: "Trưởng Nhóm Trợ lý", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-0-2", ten_phong_ban: "Nhóm trợ lý", mo_ta: "Quản lý đội trợ lý Giám đốc", thu_tu: 4, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-5", ten_chuc_vu: "Trợ lý Giám đốc", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-0-2", ten_phong_ban: "Nhóm trợ lý", mo_ta: "Hỗ trợ hành chính, lịch làm việc", thu_tu: 5, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-6", ten_chuc_vu: "Chuyên viên Điều hành", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-0-1", ten_phong_ban: "Nhóm điều hành", mo_ta: "Theo dõi tiến độ, báo cáo", thu_tu: 6, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Kỹ thuật (dep-1)
  { id: "pos-10", ten_chuc_vu: "Trưởng Phòng Kỹ thuật", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-1", ten_phong_ban: "Phòng Kỹ thuật", mo_ta: "Quản lý toàn bộ mảng kỹ thuật", thu_tu: 10, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-11", ten_chuc_vu: "Phó Phòng Kỹ thuật", cap_bac: "2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-1", ten_phong_ban: "Phòng Kỹ thuật", mo_ta: "Hỗ trợ trưởng phòng kỹ thuật", thu_tu: 11, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-12", ten_chuc_vu: "Trưởng Nhóm Phát triển", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Lead team dev, review code", thu_tu: 12, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-13", ten_chuc_vu: "Trưởng Nhóm Hạ tầng", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-1-2", ten_phong_ban: "Nhóm Hạ tầng IT", mo_ta: "Quản lý hệ thống, DevOps", thu_tu: 13, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-14", ten_chuc_vu: "Lập trình viên Senior", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Phát triển phần mềm cốt lõi", thu_tu: 14, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-15", ten_chuc_vu: "Lập trình viên Junior", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: null, thu_tu: 15, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-16", ten_chuc_vu: "Quản trị hệ thống", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-2", ten_phong_ban: "Nhóm Hạ tầng IT", mo_ta: "Vận hành server, mạng", thu_tu: 16, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Nhân sự (dep-2)
  { id: "pos-20", ten_chuc_vu: "Trưởng Phòng Nhân sự", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: "Quản lý tuyển dụng, đào tạo, chính sách", thu_tu: 20, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-21", ten_chuc_vu: "Phó Phòng Nhân sự", cap_bac: "2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: null, thu_tu: 21, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-22", ten_chuc_vu: "Chuyên viên Tuyển dụng", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2-1", ten_phong_ban: "Nhóm Tuyển dụng", mo_ta: "Tuyển dụng, phỏng vấn", thu_tu: 22, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-23", ten_chuc_vu: "Chuyên viên Đào tạo", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2-2", ten_phong_ban: "Nhóm Đào tạo", mo_ta: "Xây dựng và triển khai đào tạo", thu_tu: 23, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Tài chính - Kế toán (dep-3)
  { id: "pos-30", ten_chuc_vu: "Trưởng Phòng Tài chính", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-3", ten_phong_ban: "Phòng Tài chính - Kế toán", mo_ta: "Quản lý tài chính, kế toán", thu_tu: 30, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-31", ten_chuc_vu: "Kế toán trưởng", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-3-1", ten_phong_ban: "Nhóm Kế toán", mo_ta: "Điều hành công tác kế toán", thu_tu: 31, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-32", ten_chuc_vu: "Kế toán viên", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3-1", ten_phong_ban: "Nhóm Kế toán", mo_ta: null, thu_tu: 32, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-33", ten_chuc_vu: "Chuyên viên Tài chính", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3-2", ten_phong_ban: "Nhóm Tài chính", mo_ta: "Phân tích, dự báo tài chính", thu_tu: 33, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Kinh doanh (dep-4)
  { id: "pos-40", ten_chuc_vu: "Trưởng Phòng Kinh doanh", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-4", ten_phong_ban: "Phòng Kinh doanh", mo_ta: "Chỉ đạo hoạt động kinh doanh", thu_tu: 40, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-41", ten_chuc_vu: "Trưởng Nhóm Kinh doanh B2B", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-4-1", ten_phong_ban: "Nhóm Kinh doanh B2B", mo_ta: null, thu_tu: 41, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-42", ten_chuc_vu: "Trưởng Nhóm Kinh doanh B2C", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-4-2", ten_phong_ban: "Nhóm Kinh doanh B2C", mo_ta: null, thu_tu: 42, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-43", ten_chuc_vu: "Nhân viên Kinh doanh", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-4-1", ten_phong_ban: "Nhóm Kinh doanh B2B", mo_ta: "Chăm sóc khách hàng doanh nghiệp", thu_tu: 43, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-44", ten_chuc_vu: "Nhân viên B2C", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-4-2", ten_phong_ban: "Nhóm Kinh doanh B2C", mo_ta: null, thu_tu: 44, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Kho vận (dep-5)
  { id: "pos-50", ten_chuc_vu: "Trưởng Phòng Kho vận", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-5", ten_phong_ban: "Phòng Kho vận", mo_ta: "Quản lý kho, xuất nhập", thu_tu: 50, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-51", ten_chuc_vu: "Trưởng Nhóm Nhập kho", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-5-1", ten_phong_ban: "Nhóm Nhập kho", mo_ta: null, thu_tu: 51, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-52", ten_chuc_vu: "Trưởng Nhóm Xuất kho", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-5-2", ten_phong_ban: "Nhóm Xuất kho", mo_ta: null, thu_tu: 52, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-53", ten_chuc_vu: "Nhân viên Kho", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5-1", ten_phong_ban: "Nhóm Nhập kho", mo_ta: "Kiểm nhận, sắp xếp hàng", thu_tu: 53, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Marketing (dep-6)
  { id: "pos-60", ten_chuc_vu: "Trưởng Phòng Marketing", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-6", ten_phong_ban: "Phòng Marketing", mo_ta: "Chiến lược marketing, thương hiệu", thu_tu: 60, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-61", ten_chuc_vu: "Trưởng Nhóm Digital Marketing", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-6-1", ten_phong_ban: "Nhóm Digital Marketing", mo_ta: null, thu_tu: 61, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-62", ten_chuc_vu: "Trưởng Nhóm Thương hiệu", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-6-2", ten_phong_ban: "Nhóm Thương hiệu", mo_ta: null, thu_tu: 62, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-63", ten_chuc_vu: "Chuyên viên Marketing", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6-1", ten_phong_ban: "Nhóm Digital Marketing", mo_ta: "Content, quảng cáo online", thu_tu: 63, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // Phòng Hành chính (dep-7)
  { id: "pos-70", ten_chuc_vu: "Trưởng Phòng Hành chính", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-7", ten_phong_ban: "Phòng Hành chính", mo_ta: "Quản lý hành chính, văn phòng", thu_tu: 70, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-71", ten_chuc_vu: "Phó Phòng Hành chính", cap_bac: "2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-7", ten_phong_ban: "Phòng Hành chính", mo_ta: null, thu_tu: 71, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-72", ten_chuc_vu: "Trưởng Nhóm Văn phòng", cap_bac: "3", ten_cap_bac: "Trưởng phòng", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: "Văn thư, tài sản, hậu cần", thu_tu: 72, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-73", ten_chuc_vu: "Nhân viên Hành chính", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: null, thu_tu: 73, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-74", ten_chuc_vu: "Nhân viên Tổ chức sự kiện", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-2", ten_phong_ban: "Nhóm Tổ chức sự kiện", mo_ta: null, thu_tu: 74, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  // --- Thêm ~20 chức vụ mẫu ---
  { id: "pos-80", ten_chuc_vu: "Lập trình viên Frontend", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Phát triển giao diện người dùng", thu_tu: 80, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-81", ten_chuc_vu: "Lập trình viên Backend", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Phát triển API, xử lý nghiệp vụ", thu_tu: 81, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-82", ten_chuc_vu: "Chuyên viên Kiểm thử", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-1", ten_phong_ban: "Nhóm Phát triển phần mềm", mo_ta: "Kiểm thử chất lượng phần mềm", thu_tu: 82, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-83", ten_chuc_vu: "Chuyên viên Phân tích nghiệp vụ", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1", ten_phong_ban: "Phòng Kỹ thuật", mo_ta: "Phân tích yêu cầu, tài liệu", thu_tu: 83, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-84", ten_chuc_vu: "Chuyên viên Chính sách & Đãi ngộ", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: "Xây dựng chính sách lương, phúc lợi", thu_tu: 84, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-85", ten_chuc_vu: "Chuyên viên Nhân sự tổng hợp", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-2", ten_phong_ban: "Phòng Nhân sự", mo_ta: "Hành chính nhân sự, hồ sơ", thu_tu: 85, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-86", ten_chuc_vu: "Thủ quỹ", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3-2", ten_phong_ban: "Nhóm Tài chính", mo_ta: "Quản lý quỹ tiền mặt, đối chiếu", thu_tu: 86, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-87", ten_chuc_vu: "Chuyên viên Kiểm soát nội bộ", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-3", ten_phong_ban: "Phòng Tài chính - Kế toán", mo_ta: "Kiểm soát rủi ro, tuân thủ", thu_tu: 87, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-88", ten_chuc_vu: "Nhân viên Hỗ trợ Kinh doanh", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-4", ten_phong_ban: "Phòng Kinh doanh", mo_ta: "Chuẩn bị báo giá, hồ sơ thầu", thu_tu: 88, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-89", ten_chuc_vu: "Nhân viên Xuất kho", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5-2", ten_phong_ban: "Nhóm Xuất kho", mo_ta: "Đóng gói, xuất hàng, đối soát", thu_tu: 89, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-90", ten_chuc_vu: "Thủ kho", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5", ten_phong_ban: "Phòng Kho vận", mo_ta: "Quản lý tồn kho, sổ kho", thu_tu: 90, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-91", ten_chuc_vu: "Chuyên viên Thiết kế", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6-2", ten_phong_ban: "Nhóm Thương hiệu", mo_ta: "Thiết kế đồ họa, nhận diện thương hiệu", thu_tu: 91, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-92", ten_chuc_vu: "Copywriter", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6-1", ten_phong_ban: "Nhóm Digital Marketing", mo_ta: "Viết nội dung quảng cáo, SEO", thu_tu: 92, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-93", ten_chuc_vu: "Nhân viên Truyền thông", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-6", ten_phong_ban: "Phòng Marketing", mo_ta: "Quan hệ báo chí, truyền thông nội bộ", thu_tu: 93, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-94", ten_chuc_vu: "Lễ tân", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: "Đón tiếp khách, tổng đài", thu_tu: 94, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-95", ten_chuc_vu: "Chuyên viên Văn thư", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-7-1", ten_phong_ban: "Nhóm Văn phòng", mo_ta: "Soạn thảo, lưu trữ văn bản", thu_tu: 95, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-96", ten_chuc_vu: "Tài xế", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-5", ten_phong_ban: "Phòng Kho vận", mo_ta: "Vận chuyển hàng hóa", thu_tu: 96, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-97", ten_chuc_vu: "Thư ký văn phòng", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-0-2", ten_phong_ban: "Nhóm trợ lý", mo_ta: "Sắp xếp lịch, soạn thảo văn bản", thu_tu: 97, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-98", ten_chuc_vu: "Chuyên viên DevOps", cap_bac: "4", ten_cap_bac: "Nhân viên", phong_ban_id: "dep-1-2", ten_phong_ban: "Nhóm Hạ tầng IT", mo_ta: "CI/CD, triển khai, giám sát", thu_tu: 98, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
  { id: "pos-99", ten_chuc_vu: "Phó Phòng Tài chính", cap_bac: "2", ten_cap_bac: "Phó giám đốc", phong_ban_id: "dep-3", ten_phong_ban: "Phòng Tài chính - Kế toán", mo_ta: "Hỗ trợ trưởng phòng tài chính", thu_tu: 99, trang_thai: 'Đang hoạt động', tg_tao: ts(), tg_cap_nhat: ts() },
];

const repo = createRepository<Position>({
  tableName: 'var_chuc_vu',
  mockData: MOCK_POSITIONS,
  select: POSITION_SELECT_FULL,
  delay: 600,
});

function pickEmbedded<T>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function flattenSupabaseRow(row: Record<string, unknown>): Position {
  const phongBan = pickEmbedded<{ ten_phong_ban?: string }>(row.var_phong_ban);
  const rest = { ...row };
  delete rest.var_phong_ban;
  return {
    ...rest,
    ten_phong_ban: phongBan?.ten_phong_ban,
  } as Position;
}

function normalizePositionRow(raw: Position): Position {
  return {
    ...raw,
    id: String(raw.id),
    phong_ban_id: raw.phong_ban_id == null || raw.phong_ban_id === '' ? null : String(raw.phong_ban_id),
    cap_bac:
      raw.cap_bac == null || raw.cap_bac === ''
        ? null
        : String(typeof raw.cap_bac === 'number' ? raw.cap_bac : raw.cap_bac),
    thu_tu: typeof raw.thu_tu === 'number' ? raw.thu_tu : Number(raw.thu_tu),
  };
}

function normInt8Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^\d+$/.test(s)) return null;
  return Number(s);
}

function normInt16Fk(v: string | null | undefined): number | null {
  const s = v == null || v === '' ? '' : String(v).trim();
  if (!s || !/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < -32768 || n > 32767) return null;
  return n;
}

async function enrichPosition(raw: Position): Promise<Position> {
  const base = normalizePositionRow(raw);
  const levels = await getJobLevels();
  const ten_cap =
    base.cap_bac != null && base.cap_bac !== ''
      ? levels.find((l) => l.id === String(base.cap_bac))?.ten_cap_bac
      : undefined;
  if (!isSupabase()) {
    const depts = await getDepartments();
    return {
      ...base,
      ten_cap_bac: ten_cap ?? base.ten_cap_bac,
      ten_phong_ban: depts.find((d) => d.id === base.phong_ban_id)?.ten_phong_ban ?? base.ten_phong_ban,
    };
  }
  return {
    ...base,
    ten_cap_bac: ten_cap ?? base.ten_cap_bac,
  };
}

export const getPositions = async (): Promise<Position[]> => {
  const list = await repo.getAll({ orderBy: 'thu_tu', ascending: true });
  const flattened = isSupabase()
    ? (list as unknown as Record<string, unknown>[]).map((r) => flattenSupabaseRow(r))
    : list;
  return Promise.all((flattened as Position[]).map(enrichPosition));
};

export const createPosition = async (data: PositionFormValues): Promise<Position> => {
  const now = new Date().toISOString();
  const ten = data.ten_chuc_vu.trim();
  const moTa = data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;

  if (isSupabase()) {
    const inserted = await repo.insert(
      {
        ten_chuc_vu: ten,
        mo_ta: moTa,
        cap_bac: normInt16Fk(data.cap_bac ?? undefined),
        phong_ban_id: normInt8Fk(data.phong_ban_id ?? undefined),
        thu_tu: data.thu_tu ?? 0,
        trang_thai: data.trang_thai,
        tg_tao: now,
        tg_cap_nhat: now,
      } as unknown as Omit<Position, 'id'> & { id?: string },
      { returningSelect: POSITION_RETURNING_FULL },
    );
    const flat = flattenSupabaseRow(inserted as unknown as Record<string, unknown>);
    return enrichPosition(flat);
  }

  const id = `pos-${Date.now()}`;
  const inserted = await repo.insert(
    {
      id,
      ten_chuc_vu: ten,
      cap_bac: data.cap_bac && String(data.cap_bac).trim() !== '' ? String(data.cap_bac).trim() : null,
      phong_ban_id: data.phong_ban_id && String(data.phong_ban_id).trim() !== '' ? String(data.phong_ban_id).trim() : null,
      mo_ta: moTa,
      thu_tu: data.thu_tu ?? 0,
      trang_thai: data.trang_thai,
      tg_tao: now,
      tg_cap_nhat: now,
    } as Omit<Position, 'id'> & { id: string },
    { returningSelect: POSITION_RETURNING_FULL },
  );
  return enrichPosition(inserted as Position);
};

export const updatePosition = async (id: string, data: PositionFormValues): Promise<Position> => {
  const existingRaw = await repo.getById(id);
  if (!existingRaw) throw new Error(txt('position.service.notFound'));
  const existing = isSupabase()
    ? normalizePositionRow(flattenSupabaseRow(existingRaw as unknown as Record<string, unknown>))
    : (existingRaw as Position);

  const ten = data.ten_chuc_vu.trim();
  const moTa = data.mo_ta && String(data.mo_ta).trim() !== '' ? String(data.mo_ta).trim() : null;

  const payload = isSupabase()
    ? ({
        ten_chuc_vu: ten,
        mo_ta: moTa,
        cap_bac: normInt16Fk(data.cap_bac ?? undefined),
        phong_ban_id: normInt8Fk(data.phong_ban_id ?? undefined),
        thu_tu: data.thu_tu ?? existing.thu_tu,
        trang_thai: data.trang_thai,
        tg_cap_nhat: new Date().toISOString(),
      } as unknown as Partial<Position>)
    : ({
        ten_chuc_vu: ten,
        mo_ta: moTa,
        cap_bac: data.cap_bac && String(data.cap_bac).trim() !== '' ? String(data.cap_bac).trim() : null,
        phong_ban_id:
          data.phong_ban_id && String(data.phong_ban_id).trim() !== '' ? String(data.phong_ban_id).trim() : null,
        thu_tu: data.thu_tu ?? existing.thu_tu,
        trang_thai: data.trang_thai,
        tg_cap_nhat: new Date().toISOString(),
      } as Partial<Position>);

  const updated = await repo.update(id, payload, { returningSelect: POSITION_RETURNING_FULL });
  const flat = isSupabase() ? flattenSupabaseRow(updated as unknown as Record<string, unknown>) : updated;
  return enrichPosition(flat as Position);
};

export const updatePositionStatus = async (ids: string[], status: TrangThaiHoatDong): Promise<Position | undefined> => {
  let result: Position | undefined;
  const now = new Date().toISOString();
  for (const id of ids) {
    const u = await repo.update(
      id,
      { trang_thai: status, tg_cap_nhat: now },
      { returningSelect: POSITION_RETURNING_STATUS_ONLY },
    );
    if (ids.length === 1) result = u as Position;
  }
  if (result && isSupabase()) result = flattenSupabaseRow(result as unknown as Record<string, unknown>);
  return result ? enrichPosition(result) : undefined;
};

export const deletePositions = async (ids: string[]): Promise<void> => {
  await repo.remove(ids);
};

/** Import nhiều chức vụ (chỉ thêm mới). Cột: ten_chuc_vu; cấp bậc: cap_bac | ma_cap_bac | cap_bac_id (legacy); phòng ban: phong_ban_id | ten_phong_ban; mo_ta, thu_tu, trang_thai */
export const importPositions = async (
  rows: Record<string, unknown>[]
): Promise<{ created: number; errors: string[] }> => {
  const levels = await getJobLevels();
  const depts = await getDepartments();
  const errors: string[] = [];
  let created = 0;

  const resolveCapId = (raw: unknown): string | null => {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    const byId = levels.find((l) => l.id === s);
    if (byId) return byId.id;
    const up = s.toUpperCase();
    const byMa = levels.find((l) => l.ma_cap_bac?.toUpperCase() === up);
    return byMa?.id ?? null;
  };

  const resolveDeptId = (raw: unknown): string | null => {
    if (raw == null || String(raw).trim() === '') return null;
    const s = String(raw).trim();
    const byId = depts.find((d) => d.id === s);
    if (byId) return byId.id;
    const key = s.toLowerCase();
    const byTen = depts.find((d) => (d.ten_phong_ban ?? '').trim().toLowerCase() === key);
    return byTen?.id ?? null;
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ten_chuc_vu = String(row.ten_chuc_vu ?? '').trim();
    if (!ten_chuc_vu) {
      errors.push(`Dòng ${i + 2}: Thiếu tên chức vụ`);
      continue;
    }

    const capRaw = row.cap_bac ?? row['cap_bac_id'] ?? row.ma_cap_bac;
    const pbRaw = row.phong_ban_id ?? row.ten_phong_ban;
    const resolvedCapBac = resolveCapId(capRaw);
    const phong_ban_id = resolveDeptId(pbRaw);
    if (capRaw != null && String(capRaw).trim() !== '' && !resolvedCapBac) {
      errors.push(`Dòng ${i + 2}: Không tìm thấy cấp bậc (mã hoặc id)`);
      continue;
    }
    if (pbRaw != null && String(pbRaw).trim() !== '' && !phong_ban_id) {
      errors.push(`Dòng ${i + 2}: Không tìm thấy phòng ban (tên hoặc id)`);
      continue;
    }

    const parsed = positionSchema.safeParse({
      ten_chuc_vu,
      cap_bac: resolvedCapBac ?? '',
      phong_ban_id: phong_ban_id ?? '',
      mo_ta: row.mo_ta != null ? String(row.mo_ta) : '',
      thu_tu: row.thu_tu != null && String(row.thu_tu).trim() !== '' ? Number(row.thu_tu) : 0,
      trang_thai: parseTrangThaiHoatDongImport(row.trang_thai),
    });
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      errors.push(`Dòng ${i + 2}: ${msg}`);
      continue;
    }

    try {
      await createPosition({
        ...parsed.data,
        cap_bac: resolvedCapBac ?? null,
        phong_ban_id: phong_ban_id ?? null,
        mo_ta: parsed.data.mo_ta?.trim() || null,
      });
      created++;
    } catch (e: unknown) {
      errors.push(`Dòng ${i + 2}: ${e instanceof Error ? e.message : 'Lỗi'}`);
    }
  }

  return { created, errors };
};