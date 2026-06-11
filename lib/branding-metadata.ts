import {
  DEFAULT_BRANDING_APP_DESCRIPTION,
  DEFAULT_BRANDING_APP_NAME,
  DEFAULT_BRANDING_LOGO,
} from './branding-defaults';
import { cloudinaryPwaIconUrl, isCloudinaryUrl } from './cloudinary/pwa-icon-url';
import type { CompanyInfo } from '../store/useStore';

export type BrandingSnapshot = Pick<
  CompanyInfo,
  'appName' | 'appDescription' | 'appLogo'
>;

const UI_STORAGE_KEY = 'ui-storage';

export function guessImageMime(url: string): string | undefined {
  const u = url.split('?')[0]?.toLowerCase() ?? '';
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.svg')) return 'image/svg+xml';
  if (url.startsWith('data:image/png')) return 'image/png';
  if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'image/jpeg';
  if (url.startsWith('data:image/webp')) return 'image/webp';
  if (url.startsWith('data:image/svg+xml')) return 'image/svg+xml';
  return undefined;
}

export function readBrandingFromUiStorage(): BrandingSnapshot | null {
  try {
    const raw = localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { state?: { companyInfo?: Partial<CompanyInfo> } };
    const ci = data?.state?.companyInfo;
    if (!ci || typeof ci !== 'object') return null;
    return {
      appName: typeof ci.appName === 'string' && ci.appName.trim() ? ci.appName.trim() : DEFAULT_BRANDING_APP_NAME,
      appDescription:
        typeof ci.appDescription === 'string' ? ci.appDescription.trim() : DEFAULT_BRANDING_APP_DESCRIPTION,
      appLogo:
        ci.appLogo == null || ci.appLogo === ''
          ? null
          : String(ci.appLogo).trim() || null,
    };
  } catch {
    return null;
  }
}

export function buildDocumentTitle(branding: BrandingSnapshot): string {
  const name = branding.appName?.trim() || DEFAULT_BRANDING_APP_NAME;
  const desc = branding.appDescription?.trim();
  return desc ? `${name} - ${desc}` : name;
}

export function resolveBrandingIconHref(
  branding: BrandingSnapshot,
  assetBase: string,
): string {
  const logo = branding.appLogo?.trim();
  if (logo) return logo;
  return DEFAULT_BRANDING_LOGO || `${assetBase}favicon.svg`;
}

export function buildWebManifestBody(
  branding: BrandingSnapshot,
  options: { appOrigin: string; scopeUrl: string; themeColor?: string },
): Record<string, unknown> {
  const logo = resolveBrandingIconHref(branding, '/');
  const icon192Src = isCloudinaryUrl(logo) ? cloudinaryPwaIconUrl(logo, 192) : logo;
  const icon512Src = isCloudinaryUrl(logo) ? cloudinaryPwaIconUrl(logo, 512) : logo;
  const mime192 = guessImageMime(icon192Src);
  const mime512 = guessImageMime(icon512Src);
  const name = branding.appName?.trim() || DEFAULT_BRANDING_APP_NAME;
  const icon192: Record<string, unknown> = { src: icon192Src, sizes: '192x192', purpose: 'any' };
  const icon512: Record<string, unknown> = { src: icon512Src, sizes: '512x512', purpose: 'any maskable' };
  if (mime192) icon192.type = mime192;
  if (mime512) icon512.type = mime512;
  return {
    name,
    short_name: name.slice(0, 12),
    description: branding.appDescription?.trim() || name,
    start_url: options.scopeUrl,
    scope: options.scopeUrl,
    display: 'standalone',
    theme_color: options.themeColor ?? '#ffffff',
    background_color: '#ffffff',
    icons: [icon192, icon512],
  };
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

function setOrCreateMetaName(name: string, content: string): void {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export type ApplyBrandingOptions = {
  assetBase: string;
  staticManifestHref: string;
  manifestBlobRef?: { current: string | null };
};

/** Cập nhật title, favicon, apple-touch-icon, og:* và manifest (blob hoặc static). */
export function applyBrandingToDocument(
  branding: BrandingSnapshot,
  options: ApplyBrandingOptions,
): void {
  const head = document.head;
  const title = buildDocumentTitle(branding);
  document.title = title;

  const iconHref = resolveBrandingIconHref(branding, options.assetBase);
  const mime = guessImageMime(iconHref);

  document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']").forEach((link) => {
    link.href = iconHref;
    if (mime) link.type = mime;
    else link.removeAttribute('type');
  });
  let iconLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    head.appendChild(iconLink);
  }
  iconLink.href = iconHref;
  if (mime) iconLink.type = mime;

  let apple = document.querySelector("link[rel='apple-touch-icon']") as HTMLLinkElement | null;
  if (!apple) {
    apple = document.createElement('link');
    apple.rel = 'apple-touch-icon';
    head.appendChild(apple);
  }
  apple.href = iconHref;

  setOrCreateMetaProperty('og:title', title);
  setOrCreateMetaProperty('og:description', branding.appDescription?.trim() || branding.appName);
  setOrCreateMetaProperty('og:image', iconHref);
  setOrCreateMetaName('description', branding.appDescription?.trim() || branding.appName);

  if (options.manifestBlobRef?.current) {
    URL.revokeObjectURL(options.manifestBlobRef.current);
    options.manifestBlobRef.current = null;
  }

  let manifestLink = document.querySelector("link[rel='manifest']") as HTMLLinkElement | null;
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    head.appendChild(manifestLink);
  }

  const appOrigin = window.location.origin;
  const scopeUrl = new URL(options.assetBase, `${appOrigin}/`).href;
  const manifestBody = buildWebManifestBody(branding, { appOrigin, scopeUrl });
  const blob = new Blob([JSON.stringify(manifestBody)], { type: 'application/manifest+json' });
  const blobUrl = URL.createObjectURL(blob);
  if (options.manifestBlobRef) options.manifestBlobRef.current = blobUrl;
  manifestLink.href = blobUrl;
}

/** Gọi từ index.html trước React — đọc ui-storage, tránh nháy favicon/PWA sai. */
export function applyBrandingBootstrapFromStorage(assetBase = '/'): void {
  const branding = readBrandingFromUiStorage() ?? {
    appName: DEFAULT_BRANDING_APP_NAME,
    appDescription: DEFAULT_BRANDING_APP_DESCRIPTION,
    appLogo: DEFAULT_BRANDING_LOGO,
  };
  applyBrandingToDocument(branding, {
    assetBase,
    staticManifestHref: `${assetBase.replace(/\/?$/, '/') }manifest.webmanifest`,
  });
}
