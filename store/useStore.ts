import { create } from 'zustand';
import { persist, type PersistStorage, type StorageValue } from 'zustand/middleware';
import type { AppFontFamily } from '../lib/theme/fonts';
import { AuthState, User } from '../types';
import { usePermissionGrantStore } from './usePermissionGrantStore';

const AUTH_REMEMBER_KEY = 'auth-remember';

/** Kiểm tra động xem người dùng có bật "Ghi nhớ đăng nhập" không. */
function isRemembered(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(AUTH_REMEMBER_KEY) !== 'false';
}

/**
 * Storage adapter động cho zustand persist.
 * Mỗi lần đọc/ghi đều kiểm tra auth-remember tại thời điểm đó,
 * đảm bảo lựa chọn "Ghi nhớ" có hiệu lực ngay trong cùng phiên đăng nhập.
 */
type AuthPersistSlice = Pick<AuthState, 'user' | 'isAuthenticated'>;

function createAuthPersistStorage(): PersistStorage<AuthPersistSlice> | undefined {
  if (typeof window === 'undefined') return undefined;
  return {
    getItem: (name: string): StorageValue<AuthPersistSlice> | null => {
      const storage = isRemembered() ? localStorage : sessionStorage;
      const raw = storage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<AuthPersistSlice>) : null;
    },
    setItem: (name: string, value: StorageValue<AuthPersistSlice>) => {
      const serialized = JSON.stringify(value);
      if (isRemembered()) {
        sessionStorage.removeItem(name);
        localStorage.setItem(name, serialized);
      } else {
        localStorage.removeItem(name);
        sessionStorage.setItem(name, serialized);
      }
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    },
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (user: User) => set({ user, isAuthenticated: true }),
      logout: () => {
        usePermissionGrantStore.getState().clearMatrix();
        set({ user: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      version: 2,
      storage: createAuthPersistStorage(),
      partialize: (state): Pick<AuthState, 'user' | 'isAuthenticated'> => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ _hasHydrated: true });
      },
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== 'object') return persisted as AuthState;
        const state = persisted as AuthState;
        if (version < 1) {
          if (state.user?.id === '123' || state.user?.email === 'demo@example.com') {
            state.user = {
              id: 'emp-000',
              email: 'admin@5fedu.com',
              full_name: 'Lê Minh Công',
              role: 'admin',
              created_at: new Date().toISOString(),
              id_phong_ban: 'dep-7',
            };
            state.isAuthenticated = true;
          }
        }
        if (version < 2 && state.user?.id === 'user-123') {
          state.user = {
            ...state.user,
            id: 'emp-000',
            id_phong_ban: 'dep-7',
            role: 'admin',
          };
        }
        return state;
      },
    }
  )
);

/** Thông tin tổ chức + thương hiệu (UI / Zustand; đồng bộ var_thong_tin_to_chuc khi Supabase). */
export interface CompanyInfo {
  appName: string;
  appDescription: string;
  appLogo: string | null;
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

/** Mặc định MTTQVN — đồng bộ với index.html / PWA; chỉnh trong Hệ thống → Thông tin tổ chức. */
export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  appName: 'MTTQVN',
  appDescription: 'Hệ thống nền tảng số',
  appLogo: 'https://datafiles.nghean.gov.vn/nan-ubnd/6556/Album/quochuy%20(1).png',
  companyName: 'Mặt trận Tổ quốc Việt Nam',
  address: 'Khối 7, đường Hùng Vương, TP. Vinh, tỉnh Nghệ An',
  phone: '',
  email: '',
  website: 'https://mttq.org.vn',
};

interface ThemeState {
  primaryColor: 'blue' | 'violet' | 'emerald' | 'rose' | 'amber' | 'orange' | 'cyan' | 'slate';
  fontFamily: AppFontFamily;
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'light' | 'dark' | 'system';
  timezone: string;
  setTheme: (settings: Partial<Omit<ThemeState, 'setTheme'>>) => void;
}

interface UIState extends ThemeState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  // Branding & Company Info
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: Partial<CompanyInfo>) => void;
  // User Preferences
  skipRedirectConfirmation: boolean;
  setSkipRedirectConfirmation: (skip: boolean) => void;
}

/** Allowed font families – used for migration from old settings. */
const ALLOWED_FONTS = new Set<AppFontFamily>([
  'Inter',
  'Be Vietnam Pro',
  'Lexend',
  'Nunito',
  'Source Sans 3',
  'Merriweather',
]);

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Default Theme Settings
      primaryColor: 'blue',
      fontFamily: 'Inter',
      fontSize: 'medium',
      colorScheme: 'light',
      timezone: 'Asia/Ho_Chi_Minh',
      setTheme: (settings) => {
        set((state) => ({ ...state, ...settings }));
      },

      // Thông tin tổ chức + thương hiệu (persist; đồng bộ Supabase khi `isSupabase()` — có URL + anon key)
      companyInfo: { ...DEFAULT_COMPANY_INFO },
      setCompanyInfo: (info) => set((state) => ({
        companyInfo: { ...state.companyInfo, ...info }
      })),

      // User Preferences
      skipRedirectConfirmation: false,
      setSkipRedirectConfirmation: (skip) => set({ skipRedirectConfirmation: skip }),
    }),
    {
      name: 'ui-storage', // Persist UI settings including branding
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== 'object') return persisted as UIState;
        const state = persisted as Record<string, unknown> & Partial<ThemeState>;
        // v0 → v1: fonts list reduced
        if (
          version === 0 &&
          state.fontFamily &&
          typeof state.fontFamily === 'string' &&
          !ALLOWED_FONTS.has(state.fontFamily as ThemeState['fontFamily'])
        ) {
          state.fontFamily = 'Inter';
        }
        // v1 → v2: chỉ còn tiếng Việt — bỏ language khỏi state đã lưu
        if (version < 2) {
          delete state.language;
        }
        // v2 → v3: nâng branding mặc định từ template 5F lên MTTQVN (chỉ khi chưa đổi tên mẫu)
        if (version < 3) {
          const ci = state.companyInfo as CompanyInfo | undefined;
          if (ci?.appName === '5F template' && ci?.companyName === '5F template') {
            state.companyInfo = { ...DEFAULT_COMPANY_INFO };
          }
        }
        // v3 → v4: bỏ taxId (module Thông tin tổ chức)
        if (version < 4 && state.companyInfo && typeof state.companyInfo === 'object') {
          const ci = { ...(state.companyInfo as Record<string, unknown>) };
          delete ci.taxId;
          state.companyInfo = { ...DEFAULT_COMPANY_INFO, ...ci } as CompanyInfo;
        }
        return persisted as UIState;
      },
    }
  )
);