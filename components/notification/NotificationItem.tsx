import React from 'react';
import { txt } from '../../lib/text';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, BadgeCheck, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import type { ThongBao } from '../../features/thong-bao/core/types';
import {
  duongDanAnToan,
  moTaThoiGian,
} from '../../features/thong-bao/utils/thong-bao-view';

/** Biểu tượng theo loại nhắc — ánh xạ tĩnh, không có nhánh nghiệp vụ nào. */
const bieuTuongTheoLoai: Record<ThongBao['loai'], typeof Bell> = {
  cong_viec_qua_han: AlertTriangle,
  cong_viec_sap_den_han: Clock,
  tang_luong_sap_den_han: BadgeCheck,
};

const mauTheoMucDo: Record<ThongBao['muc_do'], string> = {
  canh_bao: 'text-rose-600 bg-rose-500/10 dark:text-rose-400',
  sap_toi: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
  tin: 'text-primary bg-primary/10',
};

interface NotificationItemProps {
  item: ThongBao;
  /** Bấm vào một dòng: đánh dấu đã đọc rồi đóng panel. */
  onOpen: (item: ThongBao) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ item, onOpen }) => {
  const Icon = bieuTuongTheoLoai[item.loai] ?? Bell;
  const mau = mauTheoMucDo[item.muc_do] ?? mauTheoMucDo.tin;
  // Không tin đường dẫn đọc từ máy chủ: chỉ nhận đường dẫn nội bộ.
  const duongDan = duongDanAnToan(item.duong_dan);
  const thoiGian = moTaThoiGian(item.tg_tao);

  const noiDungBenTrong = (
    <>
      <div className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', mau)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-xs leading-tight',
            item.da_doc ? 'font-medium text-foreground' : 'font-semibold text-primary',
          )}
        >
          {item.tieu_de}
        </p>
        <p
          className={cn(
            'text-xs mt-0.5 line-clamp-2',
            item.da_doc ? 'text-muted-foreground' : 'text-foreground/80',
          )}
        >
          {item.noi_dung}
        </p>
        {thoiGian ? (
          <p className="text-[11px] mt-1 text-muted-foreground">{thoiGian}</p>
        ) : null}
      </div>
      {!item.da_doc ? (
        <span
          className="shrink-0 mt-1 h-2 w-2 rounded-full bg-primary"
          title={txt('notification.unreadDot')}
          aria-label={txt('notification.unreadDot')}
        />
      ) : null}
    </>
  );

  const lopBaoNgoai = cn(
    'flex gap-3 p-3 rounded-xl transition-colors text-left w-full',
    item.da_doc
      ? 'hover:bg-muted/60'
      : 'bg-primary/10 hover:bg-primary/15 border-l-[3px] border-primary',
  );

  return (
    <motion.li layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
      {duongDan ? (
        <Link to={duongDan} className={lopBaoNgoai} onClick={() => onOpen(item)}>
          {noiDungBenTrong}
        </Link>
      ) : (
        <button type="button" className={lopBaoNgoai} onClick={() => onOpen(item)}>
          {noiDungBenTrong}
        </button>
      )}
    </motion.li>
  );
};

export default NotificationItem;
