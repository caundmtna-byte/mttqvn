import React, { useMemo } from 'react';
import { txt } from '../lib/text';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MainCard from '../components/dashboard/MainCard';
import HomeMetrics from '../features/trang-chu/components/home-metrics';
import { useAuthStore } from '../store/useStore';
import { usePermissionGrantStore } from '../store/usePermissionGrantStore';
import { SIDEBAR_MENU } from '../lib/sidebar-menu';
import { isSidebarPathVisibleForUser } from '../lib/nav-module-visibility';
import 'dayjs/locale/vi';

function getGreetingKey(hour: number): string {
  if (hour >= 5 && hour < 12) return 'page.home.greetingMorning';
  if (hour >= 12 && hour < 18) return 'page.home.greetingAfternoon';
  return 'page.home.greetingEvening';
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  /**
   * Quyền chưa tải xong thì CHƯA được lọc danh sách module: `can()` nay là
   * deny-by-default, lọc lúc này sẽ cho ra gần như rỗng và người dùng phải F5
   * mới thấy đủ thẻ. Hiện khung chờ thay vì hiện thiếu.
   */
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const waitingPermissions = user != null && user.role !== 'admin' && permissionsLoading;
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const hour = new Date().getHours();
  const greetingKey = getGreetingKey(hour);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
    },
  };

  const modules = useMemo(
    () =>
      SIDEBAR_MENU.filter((m) => m.path !== '/' && isSidebarPathVisibleForUser(user, m.path)).map((m) => ({
        title: txt(m.nameKey),
        description: m.descriptionKey ? txt(m.descriptionKey) : '',
        icon: m.icon,
        path: m.path,
        gradient: m.gradient,
      })),
    [user, matrixActive, permissionsLoading, grantsByModule, chucVuCapBac],
  );

  return (
    <div className="pb-10 pt-2 shrink-0">
      <div className="mb-6">
        <h1 className="text-lg md:text-xl font-semibold text-foreground tracking-tight">
          {txt(greetingKey)},{' '}
          <span className="text-primary">{user?.full_name || txt('page.home.adminFallback')}</span> 👋
        </h1>
      </div>

      <div className="h-px bg-border w-full mb-6" />

      {/*
        Thẻ chỉ số: tự lo phần quyền + phạm vi xem + khung chờ bên trong, kể cả lúc
        ma trận quyền chưa về. Không render gì khi người dùng không có quyền nào.
      */}
      <HomeMetrics />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 h-full items-start content-start"
      >
        {waitingPermissions
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`skeleton-${i}`}
                aria-hidden
                className="h-[132px] rounded-xl border border-border/50 bg-card animate-pulse"
              />
            ))
          : modules.map((mod) => (
              <motion.div key={mod.path} variants={item}>
                <MainCard
                  title={mod.title}
                  description={mod.description}
                  icon={mod.icon}
                  gradient={mod.gradient}
                  onClick={() => navigate(mod.path)}
                />
              </motion.div>
            ))}
      </motion.div>
    </div>
  );
};

export default Home;
