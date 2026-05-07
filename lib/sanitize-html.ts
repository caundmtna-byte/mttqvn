import DOMPurify from 'dompurify';
import type { Config } from 'dompurify';

const BASE = { USE_PROFILES: { html: true } } as const satisfies Config;

/**
 * Sanitize untrusted HTML before `dangerouslySetInnerHTML`.
 * Keeps common rich-text tags from editors; strips scripts and event handlers.
 */
export function sanitizeHtml(dirty: string, extra?: Config): string {
  if (!dirty?.trim()) return '';
  return String(DOMPurify.sanitize(dirty, { ...BASE, ...extra }));
}
