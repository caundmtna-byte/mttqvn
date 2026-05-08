import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_COMPANY_INFO } from '../store/useStore';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useUIStore } from '../store/useStore';
import { isSupabase } from './data/config';
import { queryKeys } from './query-keys';
import { masterDataQueryOptions } from './supabase/query-config';
import { getThongTinToChuc } from '../features/he-thong/thong-tin-to-chuc/services/thong-tin-to-chuc-service';
import { PRIMARY_COLOR_MAP } from './theme-utils';
import {
  GOOGLE_FONT_CSS2_MAP,
  buildSansStackCss,
  type AppFontFamily,
} from './theme/fonts';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';

export function loadFont(fontFamily: string): void {
  const fontParam = GOOGLE_FONT_CSS2_MAP[fontFamily as AppFontFamily];
  if (fontParam === undefined || fontParam === '') return;
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
  document.head.appendChild(link);
}

export const ThemeSynchronizer: React.FC = () => {
  const { primaryColor, fontFamily, fontSize, colorScheme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    const hslValue = PRIMARY_COLOR_MAP[primaryColor];
    root.style.setProperty('--primary', hslValue);
    root.style.setProperty('--ring', hslValue);
    root.style.setProperty('--secondary-foreground', hslValue);
    root.style.setProperty('--accent-foreground', hslValue);
    root.style.setProperty('--color-primary', `hsl(${hslValue})`);
    root.style.setProperty('--color-ring', `hsl(${hslValue} / 0.5)`);

    loadFont(fontFamily);
    root.style.setProperty('--font-sans', buildSansStackCss(fontFamily));
    root.dataset.textSize = fontSize;
  }, [primaryColor, fontFamily, fontSize]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    const root = document.documentElement;
    const getResolvedTheme = (): 'dark' | 'light' => {
      if (colorScheme === 'dark') return 'dark';
      if (colorScheme === 'light') return 'light';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    let transitionTimer: ReturnType<typeof setTimeout> | undefined;
    if (!isFirstRender.current) {
      root.setAttribute('data-theme-transition', '');
      transitionTimer = setTimeout(() => root.removeAttribute('data-theme-transition'), 350);
    }
    isFirstRender.current = false;

    const apply = () => {
      const resolved = getResolvedTheme();
      if (resolved === 'dark') root.classList.add('dark');
      else root.classList.remove('dark');
    };
    apply();
    if (colorScheme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => {
        mq.removeEventListener('change', apply);
        if (transitionTimer) clearTimeout(transitionTimer);
      };
    }
    return () => {
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [colorScheme]);
  return null;
};

/** Khi Supabase + đã đăng nhập: tải `var_thong_tin_to_chuc` vào Zustand (sidebar, PWA, in). */
export const ThongTinToChucSynchronizer: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setCompanyInfo = useUIStore((s) => s.setCompanyInfo);
  const { data } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    enabled: isSupabase() && !!user,
    ...masterDataQueryOptions,
  });
  useEffect(() => {
    if (data) setCompanyInfo(data);
  }, [data, setCompanyInfo]);
  return null;
};

function staticManifestHref(): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}manifest.webmanifest`;
}

function guessImageMime(url: string): string | undefined {
  const u = url.split('?')[0]?.toLowerCase() ?? '';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.svg')) return 'image/svg+xml';
  return undefined;
}

function setOrCreateMetaProperty(property: string, content: string): void {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}

export const MetadataSynchronizer: React.FC = () => {
  const companyInfo = useUIStore((s) => s.companyInfo);
  const manifestBlobRef = useRef<string | null>(null);

  useEffect(() => {
    const titlePart = companyInfo.appDescription
      ? `${companyInfo.appName} - ${companyInfo.appDescription}`
      : companyInfo.appName;
    document.title = titlePart;

    const head = document.head;
    const logo = companyInfo.appLogo?.trim() || null;
    const assetBase = import.meta.env.BASE_URL.endsWith('/')
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    const fallbackFavicon = DEFAULT_COMPANY_INFO.appLogo?.trim() || `${assetBase}favicon.svg`;

    const setFaviconHref = (href: string) => {
      document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach((link) => {
        link.href = href;
      });
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        head.appendChild(link);
        link.href = href;
      }
    };

    const setAppleTouchIcon = (href: string | null) => {
      let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
      if (!href) {
        apple?.remove();
        return;
      }
      if (!apple) {
        apple = document.createElement('link');
        apple.rel = 'apple-touch-icon';
        head.appendChild(apple);
      }
      apple.href = href;
    };

    const setManifestHref = (href: string) => {
      let m = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
      if (!m) {
        m = document.createElement('link');
        m.rel = 'manifest';
        head.appendChild(m);
      }
      m.href = href;
    };

    if (manifestBlobRef.current) {
      URL.revokeObjectURL(manifestBlobRef.current);
      manifestBlobRef.current = null;
    }

    if (logo) {
      setFaviconHref(logo);
      setAppleTouchIcon(logo);
      setOrCreateMetaProperty('og:image', logo);

      const mime = guessImageMime(logo);
      const icon192: Record<string, unknown> = {
        src: logo,
        sizes: '192x192',
        purpose: 'any',
      };
      const icon512: Record<string, unknown> = {
        src: logo,
        sizes: '512x512',
        purpose: 'any maskable',
      };
      if (mime) {
        icon192.type = mime;
        icon512.type = mime;
      }

      // Manifest được gán qua blob: — Chrome bỏ qua start_url/scope tương đối.
      // Dùng URL tuyệt đối cùng origin để PWA vẫn hợp lệ.
      const appOrigin = window.location.origin;
      const scopeUrl = new URL(assetBase, `${appOrigin}/`).href;

      const manifestBody = {
        name: companyInfo.appName,
        short_name: companyInfo.appName.slice(0, 12),
        description: companyInfo.appDescription?.trim() || companyInfo.appName,
        start_url: scopeUrl,
        scope: scopeUrl,
        display: 'standalone' as const,
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [icon192, icon512],
      };

      const blob = new Blob([JSON.stringify(manifestBody)], { type: 'application/manifest+json' });
      const url = URL.createObjectURL(blob);
      manifestBlobRef.current = url;
      setManifestHref(url);
    } else {
      setFaviconHref(fallbackFavicon);
      setAppleTouchIcon(null);
      setManifestHref(staticManifestHref());
      setOrCreateMetaProperty('og:image', fallbackFavicon);
    }

    return () => {
      if (manifestBlobRef.current) {
        URL.revokeObjectURL(manifestBlobRef.current);
        manifestBlobRef.current = null;
      }
    };
  }, [companyInfo]);

  return null;
};

/** Đồng bộ dayjs và lang=document — ứng dụng chỉ dùng tiếng Việt */
export const LanguageSynchronizer: React.FC = () => {
  useEffect(() => {
    dayjs.locale('vi');
    document.documentElement.lang = 'vi';
  }, []);
  return null;
};

export function useResolvedTheme(): 'dark' | 'light' {
  const colorScheme = useUIStore((s) => s.colorScheme);

  const systemPrefersDark = useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', onStoreChange);
      return () => mq.removeEventListener('change', onStoreChange);
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  );

  if (colorScheme === 'dark') return 'dark';
  if (colorScheme === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}
